# FamilyRoots

**Our Family, Our Story.**

FamilyRoots is a full-stack family-tree application built with React/Vite, Express and MongoDB. This repository preserves the existing React Flow genealogy graph and Cloudinary photo workflow while adding a premium SaaS-style shell, dashboard, theme system, authentication hardening, email verification, collaboration invitations and server-side roles.

## Architecture

```text
React + Vite
   │ httpOnly cookie / REST
   ▼
Express API ── MongoDB
   ├── User
   ├── FamilyTree
   ├── FamilyMember
   ├── Relationship
   ├── FamilyEvent
   ├── TreeCollaborator
   └── Invitation
             │
             └── Cloudinary (profile photos)
```

Every family resource is scoped through the authenticated family tree. `X-Family-Tree-Id` may be supplied for shared-tree context; the server verifies ownership or collaborator membership before reading or writing data.

## Local development

Requirements: Node.js 18+ and MongoDB (or Docker).

```bash
docker compose up -d mongodb

cd server
cp .env.example .env
npm install
npm run dev
```

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

For email verification during local development, leaving `EMAIL_API_KEY` empty logs a development-only email message on the server. Production must configure a real provider.

## Production configuration

Set:

- `NODE_ENV=production`
- `MONGODB_URI`
- a long random `JWT_SECRET`
- `CLIENT_URL`
- Cloudinary credentials if photos are enabled
- `EMAIL_FROM` and `EMAIL_API_KEY`
- Google OAuth credentials if Google sign-in is enabled

The Google OAuth redirect URI must exactly match `GOOGLE_CALLBACK_URL` registered in Google Cloud Console.

Do not commit `.env` files or credentials.

## API

Existing APIs remain in place:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `GET /api/tree`
- `PUT /api/tree`
- `GET/POST/PUT/DELETE /api/members`
- `POST/DELETE /api/relationships`
- `GET/POST/DELETE /api/events`
- `POST /api/uploads/photo`
- `GET /api/dashboard`
- `GET /api/collaborators`
- `POST /api/collaborators/invite`
- `POST /api/collaborators/accept`
- `POST/DELETE /api/collaborators/:id`
- `GET /api/health`

## Roles

- **OWNER** — full family-tree administration, invitations and permissions.
- **EDITOR** — can modify family information.
- **VIEWER** — read-only access.

Role checks are enforced on the backend, not merely by hiding UI controls.

## Verification

Client build:

```bash
cd client
npm run build
```

Server syntax checks:

```bash
cd server
node --check src/index.js
```

There is currently no lint/test script in the supplied project; these should be added as a follow-up before a strict CI gate is introduced.
