# IP geolocation screenshots (Playwright)

Runs three low-volume captures you described:

1. **[MaxMind GeoIP demo](https://www.maxmind.com/en/geoip-web-services-demo)** — fills `#geoip-demo-form__textarea`, clicks **View results**, screenshots `.geoip-demo-form__table-wrapper`.
2. **[db-ip.com](https://db-ip.com/)** — opens `https://db-ip.com/<ip>`, screenshots `.title.head`.
3. **[IP2Location demo](https://www.ip2location.com/demo)** — fills `input[name="ipAddress"]`, clicks `#btn-click`, screenshots the **Geolocation Data** heading plus roughly the first six table rows (viewport clip).

## Setup

```bash
cd ip-geo-screenshots
npm install
npx playwright install chromium
```

## Run

```bash
node capture.mjs 159.146.21.214
```

PNG files are written under `shots/YYYY-MM-DD/` with filenames like `maxmind-159_146_21_214.png`.

## Word’a yapıştırmak

`compose-word.html` dosyasını tarayıcıda açın (çift tıklayarak `file://` olabilir; pano sorunu olursa basit bir yerel sunucu kullanın).

1. **Görselleri seç** ile `shots/…` içindeki PNG’leri seçin veya sayfaya sürükleyip bırakın.
2. Görseller aşağıda **Önizleme** kutusunda üst üste listelenir (dosya adına göre sıralı).
3. Sağ üst **Word için kopyala** ile panoya HTML + düz metin yazılır; Word’de **Yapıştır** (Ctrl+V) kullanın.

## Notes

- Sites change markup without notice; if a step fails, update selectors in `capture.mjs`.
- **Errors:** If one site fails, the script still runs the others. Exit code is `1` only when **all** three fail.
- Optional consent banners: run once with `headless: false` in `capture.mjs` to click through cookies, or add a short `page.click` for known dialogs.
- Respect each site’s terms; this is intended for occasional manual evidence (e.g. a few runs per day).

## GitHub’da “çalışır mı”?

- **Hayır — otomatik olarak GitHub sunucularında çalışmaz.** Repo sadece dosyaları saklar. Playwright script’i **kendi bilgisayarında** (veya senin tanımladığın bir CI workflow’unda, örn. GitHub Actions + Chromium kurulumu) çalıştırılır.
- **`compose-word.html`:** Statik bir sayfa; GitHub’a push edilir, istersen [GitHub Pages](https://pages.github.com/) ile yayınlanabilir — ama tarayıcı pano API’si için genelde **HTTPS** veya **localhost** gerekir; `file://` veya bazı ortamlarda “Word için kopyala” kısıtlanabilir. En sorunsuz kullanım: dosyayı yerelde açmak veya küçük bir statik sunucu.
