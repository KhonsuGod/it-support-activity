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

## Local Development

Install Node.js 18+ lalu jalankan:

```bash
npm install
npm run start
```

Untuk preview static tanpa Vercel Functions, file `index.html` tetap dapat dibuka via web server static. Public master data akan fallback ke Apps Script existing, tetapi CRUD activity membutuhkan Vercel Functions dan environment variable.

## Environment Variables

Buat `.env` lokal atau set di Vercel Project Settings:

```bash
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_API_SECRET=replace-with-a-long-random-secret
```

Jangan gunakan prefix `VITE_` atau `NEXT_PUBLIC_` untuk secret.

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
- `GET /api/staff`
- `GET /api/master`
- `GET /api/departments`
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
3. Deploy.
4. Test `/api/status`, `/api/staff`, `/api/master`, `/api/departments`, dan `/api/activities`.

## Security Notes

- Write endpoint Apps Script menolak request tanpa `APPS_SCRIPT_API_SECRET`.
- Secret tidak ada di frontend bundle.
- `.env`, `.vercel`, `.clasp.json`, dan auth lokal di-ignore.
- Activity text dirender dengan `textContent`, bukan `innerHTML`.
- localStorage hanya dipakai untuk filter/dashboard preference, bukan database activity.
