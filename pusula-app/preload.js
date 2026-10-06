/* Pusula — arayüze açılan güvenli köprü (window.pusula) */
const { contextBridge, ipcRenderer } = require('electron');

const closeHandlers = [];
ipcRenderer.on('app:before-close', async () => {
  try { await Promise.all(closeHandlers.map(f => f())); } catch (e) {}
  ipcRenderer.send('app:close-ok');
});

const updHandlers = {};
['available', 'progress', 'downloaded', 'error'].forEach(ch =>
  ipcRenderer.on('upd:' + ch, (e, v) => (updHandlers[ch] || []).forEach(f => f(v))));

contextBridge.exposeInMainWorld('pusula', {
  version: ipcRenderer.sendSync('app:version'),
  platform: process.platform,
  store: {
    get: k => ipcRenderer.sendSync('store:get', String(k)),
    set: (k, v) => {
      const r = ipcRenderer.sendSync('store:set', String(k), String(v));
      if (r !== true) { const e = new Error('Disk yazma hatası: ' + r); e.name = 'StoreWriteError'; throw e; }
    },
    del: k => { ipcRenderer.sendSync('store:del', String(k)); }
  },
  safe: {
    available: () => ipcRenderer.sendSync('safe:available'),
    encrypt: s => ipcRenderer.sendSync('safe:encrypt', s),
    decrypt: b => ipcRenderer.sendSync('safe:decrypt', b)
  },
  onBeforeClose: f => { if (typeof f === 'function') closeHandlers.push(f); },
  focus: () => ipcRenderer.send('app:focus'),
  updater: {
    on: (ch, f) => { (updHandlers[ch] = updHandlers[ch] || []).push(f); },
    install: () => ipcRenderer.send('upd:install')
  }
});
