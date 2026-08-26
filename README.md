# IT Support Daily Activity Management System

Internal web application untuk mencatat, memonitor, dan melaporkan daily activity IT Support. Aplikasi ini menggunakan Google Spreadsheet sebagai source of truth dan siap dideploy ke Vercel.

## Architecture

```text
Browser
  -> Vercel static app
  -> Vercel Serverless API (/api)
  -> Google Apps Script Web App
  -> Google Spreadsheet
```

Public master-data endpoint tetap tersedia di Apps Script:

- `?action=status`
- `?action=staff`
- `?action=master`
- `?action=departments`

Activity read/write dari browser melewati Vercel API. Secret hanya disimpan di server-side environment variable Vercel dan Script Properties Apps Script.

## Operational Features

- Dashboard memakai data real dari spreadsheet.
- Pending/In Progress notification menampilkan pekerjaan terbuka milik staff. Admin melihat pekerjaan terbuka seluruh team.
- Target follow-up dan target selesai diinput dari form detail dan disimpan di kolom `Notes` dengan format terstruktur agar schema `Activities` tetap kompatibel.
- Activity dapat dishare langsung ke WhatsApp Haris PIC via tombol `WA`; pesan berisi ringkasan pekerjaan dan link activity. Link tetap membutuhkan login.
- Admin dapat mengelola user serta menambah/menghapus department dan area dropdown dari halaman Admin.

## Google Assets

Gunakan ID/URL berikut sesuai fungsinya:

- Drive folder: `10y9A9QDO0xk2JDiJapum6k8PEdpPZUXK`
- Spreadsheet database: `1ShfPRzqtuWLdW8_IZdTXLDhvoc7Tx5Pid4O6IkDd4Mo`
- Apps Script project/editor: `1-RKIuRX9ljokDrRH0cqLp0CjD2K0GKPOA9O3edB2JUMkViaRooGrnpKd`
- Apps Script Web App URL untuk `APPS_SCRIPT_URL`: `https://script.google.com/macros/s/AKfycbwQ5HEhd_JPr6HtGo0Knnf4thEHK2kOqME_aFQRygi7NtM1SR6wQzhAFIk5oIks_NjM7g/exec`

Folder Drive dan editor Apps Script bukan URL API aplikasi. Vercel harus memakai Web App URL dengan akhiran `/exec`.

## Local Development

Install Node.js 18+ lalu jalankan:

```bash
npm install
npm run start
```

Untuk preview static tanpa Vercel Functions, file `index.html` tetap dapat dibuka via web server static. Public master data akan fallback ke Apps Script existing, tetapi CRUD activity membutuhkan Vercel Functions dan environment variable.

### Local LAN Preview

Untuk dibuka dari komputer lain di jaringan kantor, jalankan server dengan bind LAN:

```bash
npm run start:lan
```

Server akan menampilkan URL LAN, misalnya `http://192.168.1.55:3000`. Komputer lain yang satu subnet dapat membuka URL tersebut dari browser.

Jika user berada di subnet berbeda, misalnya client `192.168.2.x` sedangkan server `192.168.1.x`, pastikan routing antar gateway/firewall mengizinkan akses ke IP server dan port `3000`. Gateway lokal yang terdeteksi saat development adalah `192.168.1.1`.

## Environment Variables

Buat `.env` lokal atau set di Vercel Project Settings:

```bash
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_API_SECRET=replace-with-a-long-random-secret
APP_SESSION_SECRET=replace-with-a-different-long-random-secret
DATABASE_URL=mysql://user:password@host:3306/database_name
```

Jangan gunakan prefix `VITE_` atau `NEXT_PUBLIC_` untuk secret.

`DATABASE_URL` bisa memakai MySQL atau MariaDB. `APP_SESSION_SECRET` dipakai untuk menandatangani session token browser.

Jika `DATABASE_URL` belum diset, production akan memakai fallback user store di Apps Script Script Properties. Fallback ini tetap server-side dan tidak mengekspos password ke frontend. Password disimpan sebagai salted hash. Jika nanti MariaDB production tersedia, isi `DATABASE_URL` dan aplikasi otomatis memakai MariaDB lagi.

## User Database

Schema user ada di `db/schema.sql`. User login disimpan di tabel `users`, password disimpan sebagai hash PBKDF2.

Seed user awal dilakukan lewat environment variable agar password plaintext tidak masuk repository:

```bash
SEED_USERS_JSON='[
  {"username":"jumali","displayName":"Jumali","password":"...","role":"staff"},
  {"username":"davi","displayName":"Davi","password":"...","role":"staff"},
  {"username":"naufal","displayName":"Naufal","password":"...","role":"staff"},
  {"username":"henri","displayName":"Henri","password":"...","role":"staff"},
  {"username":"haris","displayName":"Haris","password":"...","role":"staff"},
  {"username":"admin","displayName":"Admin IT","password":"...","role":"admin"}
]' npm run db:seed
```

Akun `admin` dipakai khusus untuk administrasi user. Haris tetap staff/PIC operasional. Admin bisa membuat user baru, mengubah role, menonaktifkan user, menghapus user, dan reset password staff dari halaman Admin. Untuk production tanpa `DATABASE_URL`, user awal dapat diseed ke Apps Script melalui endpoint server-side `seedUsers` yang dilindungi `APPS_SCRIPT_API_SECRET`.

## Apps Script Setup

Source Apps Script berada di `apps-script/`.

1. Buka project Apps Script existing yang terhubung dengan deployment saat ini.
2. Set Project Settings timezone ke `Asia/Jakarta`.
3. Pastikan `appsscript.json` berisi `"timeZone": "Asia/Jakarta"`.
4. Tambahkan Script Property:
   - key: `APPS_SCRIPT_API_SECRET`
   - value: secret panjang yang sama dengan `APPS_SCRIPT_API_SECRET` di Vercel
5. Push/copy source dari `apps-script/Code.js` dan `apps-script/appsscript.json` ke project Apps Script existing.
6. Jalankan function `setupSpreadsheetConfiguration()` satu kali.
7. Jalankan `verifyTimezoneDateWrite()` untuk memastikan input `2026-08-25` menghasilkan `25/08/2026`.
8. Deploy ulang Web App existing. Gunakan URL deployment existing jika memungkinkan.

Jika menggunakan clasp:

```bash
cp .clasp.json.example .clasp.json
# isi scriptId dengan Apps Script project ID existing
clasp login
clasp push
```

## Spreadsheet Schema

Sheet `Activities` harus menggunakan header berikut dan tidak diubah sembarangan:

1. ID
2. Date
3. IT Staff
4. Shift
5. Plant
6. Department
7. Area / Sub Department
8. User
9. Location
10. Asset Name
11. Device Type
12. Category
13. Activity Type
14. Problem
15. Action Taken
16. Support Mode
17. Production Impact
18. Priority
19. Report Time
20. Start Time
21. Finish Time
22. Response Time
23. Resolution Time
24. Root Cause Category
25. Root Cause Detail
26. Status
27. Notes
28. Created At
29. Updated At

## API Endpoints

Vercel API:

- `GET /api/status`
- `GET /api/auth`
- `POST /api/auth`
- `GET /api/users` admin only
- `POST /api/users` admin only
- `PUT /api/users` admin only
- `DELETE /api/users?id={id}` admin only
- `GET /api/staff`
- `GET /api/master`
- `GET /api/departments`
- `POST /api/reference` admin only
- `DELETE /api/reference?type={department|area}&value={value}&department={department}` admin only
- `GET /api/activities`
- `POST /api/activities`
- `PUT /api/activities`
- `DELETE /api/activities?id=ACT-YYYYMMDD-XXX`

Filter read activities:

- `date`
- `dateFrom`
- `dateTo`
- `itStaff`
- `shift`
- `plant`
- `department`
- `area`
- `supportMode`
- `category`
- `status`

## Vercel Deployment

1. Import repository ke Vercel.
2. Set environment variables:
   - `APPS_SCRIPT_URL`
   - `APPS_SCRIPT_API_SECRET`
   - `APP_SESSION_SECRET`
   - `DATABASE_URL` optional jika memakai fallback Apps Script user store
3. Deploy.
4. Test `/api/status`, `/api/staff`, `/api/master`, `/api/departments`, dan `/api/activities`.

## Security Notes

- Write endpoint Apps Script menolak request tanpa `APPS_SCRIPT_API_SECRET`.
- Vercel endpoint `/api/activities` menolak request tanpa login session token.
- Secret tidak ada di frontend bundle.
- `.env`, `.vercel`, `.clasp.json`, dan auth lokal di-ignore.
- Activity text dirender dengan `textContent`, bukan `innerHTML`.
- localStorage hanya dipakai untuk filter/dashboard preference, bukan database activity.
