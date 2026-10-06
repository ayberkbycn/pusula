/* Pusula — Electron ana süreç
   • Pencereyi açar, uygulama arayüzü app/index.html'dir
   • Verileri kullanıcı klasöründe dosya olarak tutar (%APPDATA%/Pusula/data)
   • "Beni hatırla" için Windows'un güvenli depolamasını (safeStorage / DPAPI) kullanır
   • GitHub Releases üzerinden otomatik güncelleme yapar */
const { app, BrowserWindow, ipcMain, safeStorage, shell, Menu, session, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_ID = 'com.ayberksoftware.pusula';
app.setAppUserModelId(APP_ID);           // Windows bildirimleri için gerekli

// Tek kopya: ikinci kez açılırsa mevcut pencereyi öne getir
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

/* ---------------- Dosya tabanlı depolama ---------------- */
const DATA_DIR = path.join(app.getPath('userData'), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const fileOf = k => path.join(DATA_DIR, encodeURIComponent(k).replace(/\*/g, '%2A') + '.json');
const cache = new Map();

function storeGet(k) {
  if (cache.has(k)) return cache.get(k);
  let v = null;
  try { v = fs.readFileSync(fileOf(k), 'utf8'); } catch (e) { v = null; }
  cache.set(k, v); return v;
}
function storeSet(k, v) {
  const f = fileOf(k), tmp = f + '.tmp';
  fs.writeFileSync(tmp, String(v), 'utf8');   // önce geçici dosyaya yaz,
  fs.renameSync(tmp, f);                       // sonra tek hamlede değiştir (yarım kayıt olmaz)
  cache.set(k, String(v));
}
function storeDel(k) { try { fs.unlinkSync(fileOf(k)); } catch (e) {} cache.set(k, null); }

ipcMain.on('store:get', (e, k) => { e.returnValue = storeGet(k); });
ipcMain.on('store:set', (e, k, v) => { try { storeSet(k, v); e.returnValue = true; } catch (err) { e.returnValue = String(err && err.code || err); } });
ipcMain.on('store:del', (e, k) => { storeDel(k); e.returnValue = true; });

/* ---------------- Güvenli depolama (Beni hatırla) ---------------- */
ipcMain.on('safe:available', e => { e.returnValue = safeStorage.isEncryptionAvailable(); });
ipcMain.on('safe:encrypt', (e, s) => { e.returnValue = safeStorage.encryptString(String(s)).toString('base64'); });
ipcMain.on('safe:decrypt', (e, b) => { try { e.returnValue = safeStorage.decryptString(Buffer.from(String(b), 'base64')); } catch (err) { e.returnValue = null; } });

ipcMain.on('app:version', e => { e.returnValue = app.getVersion(); });
ipcMain.on('app:focus', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

/* ---------------- Windows bildirimleri ---------------- */
ipcMain.on('app:notify', (e, title, body) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: String(title || 'Pusula'), body: String(body || ''), icon: path.join(__dirname, 'build', 'icon.png') });
  n.on('click', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); win.webContents.send('app:notify-click'); } });
  n.show();
});

/* ---------------- Pencere konumu/boyutu ---------------- */
const WIN_FILE = path.join(app.getPath('userData'), 'window.json');
function loadBounds() { try { return JSON.parse(fs.readFileSync(WIN_FILE, 'utf8')); } catch (e) { return null; } }
function saveBounds() {
  if (!win) return;
  try { fs.writeFileSync(WIN_FILE, JSON.stringify({ ...win.getNormalBounds(), max: win.isMaximized() })); } catch (e) {}
}

/* ---------------- Ana pencere ---------------- */
let win = null, canClose = false;
function createWindow() {
  const b = loadBounds() || {};
  win = new BrowserWindow({
    width: b.width || 1280, height: b.height || 820, x: b.x, y: b.y,
    minWidth: 1000, minHeight: 680,
    show: false, backgroundColor: '#0d0f12', title: 'Pusula',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false
    }
  });
  Menu.setApplicationMenu(null);
  if (b.max) win.maximize();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Dış bağlantılar varsayılan tarayıcıda açılsın
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });

  // Kapatmadan önce arayüzün bekleyen kayıtları bitirmesini bekle
  win.on('close', e => {
    saveBounds();
    if (canClose) return;
    e.preventDefault();
    win.webContents.send('app:before-close');
    setTimeout(() => { canClose = true; if (win) win.close(); }, 3000);   // en fazla 3 sn bekle
  });
  win.on('closed', () => { win = null; });
}
ipcMain.on('app:close-ok', () => { canClose = true; if (win) win.close(); });

/* ---------------- Otomatik güncelleme ---------------- */
function setupUpdater() {
  if (!app.isPackaged) return;                 // geliştirme modunda kapalı
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { return; }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  const send = (ch, v) => { if (win) win.webContents.send('upd:' + ch, v); };
  autoUpdater.on('update-available', i => send('available', i.version));
  autoUpdater.on('download-progress', p => send('progress', p.percent));
  autoUpdater.on('update-downloaded', i => send('downloaded', i.version));
  autoUpdater.on('error', err => send('error', String(err && err.message || err)));
  ipcMain.on('upd:install', () => { canClose = true; autoUpdater.quitAndInstall(false, true); });
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 4000);                      // açılıştan kısa süre sonra
  setInterval(check, 6 * 60 * 60 * 1000);       // sonra 6 saatte bir
}

app.whenReady().then(() => {
  // Uygulama yalnızca kendi dosyalarını yükler; kamera/mikrofon vb. izinleri kapalı
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'notifications' || perm === 'clipboard-sanitized-write'));
  createWindow();
  setupUpdater();
});
app.on('window-all-closed', () => app.quit());
