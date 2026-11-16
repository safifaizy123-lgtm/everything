# Product Suite — hosted preview

This folder is prepared for deployment as a **single-owner hosted preview**.

## Deploy on Render

1. Upload the contents of this folder to a new GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository.
3. Render reads `render.yaml`. When prompted, set a strong, unique `APP_PASSWORD`.
4. Deploy. Render will provide an `onrender.com` URL.
5. Open the URL. Your browser will ask for a username and password:
   - Username: `owner` (unless you change `APP_USER`)
   - Password: the `APP_PASSWORD` you set in Render.

## Hosted-preview safety

- Basic Authentication protects the site and API routes.
- API-key storage is disabled in this hosted preview. Do not enter API keys.
- Live provider actions remain disabled; this is not a production automation platform.
- The free hosting filesystem may be temporary. Saved demo snapshots may not survive restarts or redeploys.
- Do not use this preview for sensitive, customer, payment, or private data.
- Free Render web services can spin down after inactivity and take time to wake up.

## Local run

Requires Node.js 18+.

```bash
APP_PASSWORD="choose-a-strong-password" npm start
```

On Windows PowerShell:

```powershell
$env:APP_PASSWORD="choose-a-strong-password"
npm start
```

Then open `http://127.0.0.1:4173`.
