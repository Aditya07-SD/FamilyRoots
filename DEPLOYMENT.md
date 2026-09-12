# FamilyRoots deployment

Recommended production setup:
- MongoDB Atlas for MongoDB
- Cloudinary for image storage
- Resend for transactional email
- Render for the Express API
- Vercel for the React/Vite frontend

## 1. Deploy the API on Render

Create a Render Web Service from this repository. If using the included `render.yaml`, set the service root directory to `server` (the blueprint already does this).

Required environment variables:
- `NODE_ENV=production`
- `MONGODB_URI=<MongoDB Atlas connection string>`
- `JWT_SECRET=<long random secret>`
- `CLIENT_URL=https://YOUR_FRONTEND_DOMAIN`
- `EMAIL_FROM=FamilyRoots <verified-sender@YOUR_DOMAIN>`
- `EMAIL_API_KEY=<Resend API key>`
- `CLOUDINARY_CLOUD_NAME=<cloud name>`
- `CLOUDINARY_API_KEY=<API key>`
- `CLOUDINARY_API_SECRET=<API secret>`

Optional Google sign-in:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL=https://YOUR_FRONTEND_DOMAIN/api/auth/google/callback`

The included `client/vercel.json` proxies `/api/*` to `https://familyroots-api.onrender.com`. If Render gives you a different hostname, change that destination before deploying.

## 2. Deploy the frontend on Vercel

Import the repository into Vercel and set:
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

Set:
- `VITE_API_URL=/api`

The Vercel rewrite keeps authentication cookies on the frontend origin while the API runs on Render. This is preferable to making the browser call a different origin directly.

## 3. MongoDB Atlas

Create a production cluster, create a database user, and allow the Render service to connect. Put the Atlas connection string into `MONGODB_URI`.

Do not use the local Docker MongoDB service in production.

## 4. Cloudinary

Create a Cloudinary account and add the three Cloudinary environment variables. Family memories and member profile photos are stored in Cloudinary; MongoDB stores their metadata.

## 5. Resend

Verify a sending domain and create an API key. Set `EMAIL_FROM` to an address on that verified domain and put the API key in `EMAIL_API_KEY`.

The invitation flow now fails cleanly if email delivery is unavailable instead of leaving a misleading pending invitation in the database.

## 6. Google OAuth

If enabled, add the exact callback URL to Google Cloud:
`https://YOUR_FRONTEND_DOMAIN/api/auth/google/callback`

Also add the frontend domain to the OAuth consent-screen configuration as required by Google.

## 7. Pre-launch checklist

Run:

```bash
cd client && npm ci && npm run build
cd ../server && npm ci && node --check src/index.js
```

Then verify:
- `/api/health` returns `{ "success": true, ... }`
- register/login works
- email verification works
- upload a memory
- open the memory in the gallery
- delete a memory
- invite an existing user
- invite a new user and accept after registration
- confirm the invited user sees the shared tree
- confirm VIEWER cannot upload/delete/edit
- confirm EDITOR can modify family data
- confirm OWNER can manage invitations
