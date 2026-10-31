# PhineWash: going live checklist

Tick every box before real customers use the site. (Batch 1 version: it grows as we finish more batches.)

## 1. The live `.env` (on the server only, never in git or a zip)
- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`  (true shows your passwords and code in error pages)
- [ ] `APP_URL=https://your-real-domain`  (https, not http)
- [ ] `APP_KEY` generated on the server: `php artisan key:generate`
- [ ] `LOG_LEVEL=warning`
- [ ] `SESSION_SECURE_COOKIE=true` and `SESSION_ENCRYPT=true`
- [ ] `MAIL_MAILER` set to a real provider (verification emails do not arrive with `log`)
- [ ] `PAYMENT_DRIVER` stays `demo` until a real gateway exists. Demo is automatically OFF on production,
      so customers can only pay cash. Do NOT set `PAYMENT_DEMO_CODE`.
- [ ] `STAFF_REQUIRE_2FA=true` if cashiers handle real money on the live site (admins always need 2FA there; staff only if you set this)
- [ ] `SHOP_LAT` / `SHOP_LNG` set to the exact shop pin
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` set, then change the password after the first login

## 2. Files that must NOT be on the server
- [ ] `public/hot` (makes the site load assets from your laptop)
- [ ] `public/fonts-manifest.dev.json`
- [ ] `database/database.sqlite` with test data (use a fresh database)
- [ ] `.env` from your laptop, `*.zip`, `checks.txt`, `.phpunit.result.cache`
- [ ] `node_modules` (build on your PC, upload only `public/build`)

## 3. Commands (run on the server after uploading)
```
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 4. Safety
- [ ] HTTPS works and http redirects to https
- [ ] Admin account has 2FA turned on
- [ ] Nightly backup of the database and of `storage/app` (order photos)
- [ ] `storage` and `bootstrap/cache` are writable, and the web root points to `public/` only
- [ ] Place one test order as a customer, then change its status as admin
