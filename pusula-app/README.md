# Pusula

**Ayberk Software** tarafından geliştirilen kişisel yaşam takip uygulaması.
Fitness ve diyet takibi, önemli tarihler, sertifika hedefleri, notlar ve hatırlatmalar tek bir yerde.

- Her hesabın verisi **yalnızca kendi bilgisayarında**, şifrelenmiş olarak saklanır. Sunucu yoktur.
- Bir bilgisayarda birden fazla hesap açılabilir.
- Şifre unutulursa hesap oluştururken verilen **kurtarma kodu** ile sıfırlanır.
- Ayarlar > Hesap > **Yedek al** ile veriler tek dosyaya alınır, başka bilgisayarda giriş ekranından geri yüklenir.
- Türkçe / İngilizce, 5 renk teması.

## İndir

[Releases](../../releases/latest) sayfasından **Pusula-Setup-x.y.z.exe** dosyasını indirip çalıştır.
Kurulduktan sonra yeni sürümler otomatik indirilir; uygulama içinde "Yeniden başlat" demen yeterli.

> Uygulama henüz dijital olarak imzalı olmadığı için Windows ilk kurulumda
> "Windows kişisel bilgisayarınızı korudu" uyarısı gösterebilir.
> **Ek bilgi → Yine de çalıştır** ile devam edebilirsin.

Veriler `%APPDATA%\Pusula\data` klasöründe durur. Uygulamayı kaldırmak verileri silmez.

## Geliştirme

Gerekenler: [Node.js](https://nodejs.org) 22 veya üstü.

```bash
npm install
npm start          # uygulamayı geliştirme modunda açar
npm run dist       # Windows kurulum dosyasını dist/ klasörüne üretir (Windows'ta)
```

| Dosya | Görevi |
|---|---|
| `app/index.html` | Uygulamanın tüm arayüzü ve mantığı |
| `main.js` | Pencere, dosya tabanlı depolama, güncelleme |
| `preload.js` | Arayüze açılan güvenli köprü (`window.pusula`) |
| `build/` | Uygulama simgesi |
| `.github/workflows/release.yml` | Otomatik derleme ve yayınlama |

## Yeni sürüm yayınlama

1. `app/index.html` içinde `CHANGELOG` listesinin **en üstüne** yeni sürümün notlarını ekle, `APP_BUILD` tarihini güncelle.
2. `package.json` içindeki `"version"` değerini artır (ör. `1.0.1`).
3. Değişiklikleri GitHub'a gönder (GitHub Desktop: **Commit** → **Push origin**).
4. GitHub'da **Actions → Release → Run workflow** ("Yayınla" işaretli) → **Run workflow**.
5. ~5–10 dk sonra **Releases** sayfasında `Pusula-Setup-1.0.1.exe` yayınlanır ve kurulu uygulamalar kendini günceller.

Komut satırı tercih edenler için 2–4 yerine: `npm version 1.0.1 && git push --follow-tags`

Sürüm numarası: hata düzeltmesi → `1.0.1`, yeni özellik → `1.1.0`, büyük değişiklik → `2.0.0`.

---
© Ayberk Software
