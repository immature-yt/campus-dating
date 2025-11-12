## Campus Dating MVP (Web) - No Compass Feature

Minimal, secure campus dating MVP with email/password auth, student ID + selfie verification, admin review workflow, and simple dashboards. Web-first, deployable on free tiers (Vercel + Render + MongoDB Atlas + Cloudinary).

### Features
- Email + password authentication (register, login).
- Verification upload: college ID photo + selfie with ID (+ optional profile photo).
- Admin review workflow: Approve, Request Re-upload, Decline (+ audit log).
- Limited access for pending users; locked on re-upload request/decline.
- Basic rate limits on auth and uploads, file type/size checks.
- Nodemailer emails (Ethereal for dev; Gmail SMTP optional).
- Clean, minimal UI with status banner, upload previews, and admin panel.

### Tech Stack
- Frontend: Next.js (React). Deploy on Vercel.
- Backend: Node.js + Express, JWT auth. Deploy on Render or Railway.
- Database: MongoDB Atlas (free tier).
- Storage: Cloudinary (free tier).
- Email: Nodemailer (Ethereal for dev) or Gmail SMTP.

---

## Monorepo Layout
```
backend/
  src/
    server.js
    config.js
    db.js
    middleware/
    models/
    routes/
    services/
    scripts/seedAdmin.js
  package.json
  env.example
frontend/
  src/
    pages/
    components/
    lib/api.js
  package.json
  next.config.js
  env.local.example
```

---

## Environment Variables

Copy these examples and create local `.env` files:

- Backend: create `backend/.env` based on `backend/env.example`
- Frontend: create `frontend/.env.local` based on `frontend/env.local.example`

Backend `env.example` (copy to `backend/.env`):
```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=change_this_in_production
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Gmail SMTP for dev (or leave blank to auto-use Ethereal test inbox)
SMTP_USER=
SMTP_PASS=
# SENDGRID_API_KEY=   # optional if you prefer SendGrid

# Admin seeding (auto-created on backend boot if provided)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=StrongPassword123
```

Frontend `env.local.example` (copy to `frontend/.env.local`):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

## Local Development

1) Clone repo

2) Backend
```
cd backend
cp env.example .env
npm install
npm run dev
```
The server runs on `http://localhost:4000`.

3) Frontend
```
cd frontend
cp env.local.example .env.local
npm install
npm run dev
```
The app runs on `http://localhost:3000`.

4) Create Admin Account
- Option A (automatic): set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`; server seeds/updates admin on boot.
- Option B (manual script):
```
cd backend
npm run seed:admin
```

---

## API Spec

Base URL: `BACKEND_URL` (e.g., `http://localhost:4000`)

- POST `/api/auth/register` `{ email, password }`
  - Creates user with `verification_status="pending"`, `access_level="limited"`.
- POST `/api/auth/login` `{ email, password }`
  - Returns `{ token }` (JWT). Use as `Authorization: Bearer <token>`.
- GET `/api/auth/me`
  - Returns current user profile; requires auth.
- POST `/api/user/profile` `{ name, college, year, bio }`
  - Create/edit profile; requires auth.
- POST `/api/user/upload-id` multipart/form-data
  - Fields: `id_photo` (required), `selfie_photo` (required), `profile_photo` (optional)
  - Saves to Cloudinary; sets `verification_status="pending"`, `access_level="limited"`.
  - Enforced: mime types (jpeg/png/webp); max size 5MB; rate limit (3 per 30 mins).
- GET `/api/admin/pending`
  - Lists users with status `pending` or `reupload_required`; admin only.
- POST `/api/admin/approve` `{ userId, note }`
  - Sets `verification_status="approved"`, `access_level="full"`; admin only; sends email; logs audit.
- POST `/api/admin/request-reupload` `{ userId, note }`
  - Sets `verification_status="reupload_required"`, `access_level="locked"`; admin only; sends email; logs audit.
- POST `/api/admin/decline` `{ userId, note }`
  - Sets `verification_status="declined"`, `access_level="locked"`; admin only; sends email; logs audit.
- GET `/api/admin/audit-log`
  - Returns recent audit log entries; admin only.

JWT: 7 day expiry; signed with `JWT_SECRET`.

---

## Database Schema

User
```
{
  _id, email, passwordHash,
  name, college, year, bio,
  photos: [{ url, publicId, kind: 'profile'|'id'|'selfie' }],
  id_photo_url, id_photo_public_id,
  selfie_url, selfie_public_id,
  verification_status: 'pending'|'reupload_required'|'approved'|'declined',
  access_level: 'limited'|'full'|'locked',
  admin_note,
  isAdmin: boolean,
  createdAt, updatedAt
}
```

AuditLog
```
{
  _id, userId, adminId,
  action: 'approve' | 'request_reupload' | 'decline',
  note, timestamp
}
```

---

## Admin Flow

- Approve: user becomes `approved` + `full` access.
- Request Re-upload: user becomes `reupload_required` + `locked`; user must reupload, then returns to `pending` + `limited` on submission.
- Decline: user becomes `declined` + `locked` (admin can later approve manually if you choose to add such UI).

All actions create audit log entries and attempt to email the user.

---

## Deploy Instructions

### MongoDB Atlas (free tier)
1) Create free cluster at `https://www.mongodb.com/atlas`.
2) Create a DB user and password.
3) Network: allow access from anywhere (0.0.0.0/0) or use IP allow list / Cloud access.
4) Get connection string; put into `MONGO_URI`.

### Cloudinary (free tier)
1) Create account at `https://cloudinary.com/`.
2) Get `cloud name`, `API key`, `API secret`.
3) Put into backend `.env` as `CLOUDINARY_*` values.

### Backend on Render (free tier)
1) Push this repo to GitHub.
2) Create a new Web Service on Render from your repo.
3) Runtime: Node. Build Command: `cd backend && npm install`. Start Command: `cd backend && npm start`.
4) Set Environment Variables in Render dashboard (from `backend/env.example`).
5) Deploy. Note the public URL (e.g., `https://your-api.onrender.com`). Set `FRONTEND_URL` accordingly.

Alternative: Railway (similar steps — set vars, point to `backend`).

### Frontend on Vercel
1) Create Vercel account and import the repo.
2) Framework: Next.js. Root directory: `frontend`.
3) Environment variable: `NEXT_PUBLIC_BACKEND_URL` -> use Render backend URL.
4) Deploy.

### Logs
- Render backend logs: in Render dashboard.
- Vercel frontend logs: in Vercel dashboard.

---

## Emails

By default, in development (no SMTP creds), the backend uses Ethereal (test inbox). When sending email, the console prints a preview URL (copy/paste to view the email).

For simple Gmail SMTP for dev:
- Set `SMTP_USER` and `SMTP_PASS` (app password recommended).

For SendGrid:
- Optionally set up and use SMTP/API and adjust the transporter as needed.

---

## Security Notes and Retention

- Passwords: hashed with bcrypt (12 rounds).
- JWT: 7d expiration; store token in `localStorage` (MVP). For production, consider httpOnly cookies.
- Rate limits: auth endpoints and upload attempts limited.
- Upload validation: enforce file type and 5MB max size.
- Retention suggestions:
  - Remove raw ID/selfie images after a retention period (e.g., 90 days) or once approved if policy permits.
  - Store only needed metadata in DB; do not store PII beyond business needs.
  - Allow users to request deletion of verification images after approval if compliant with your policies.
- Location: no compass/proximity feature implemented.

---

## Troubleshooting

- 401/403 errors: ensure you are logged in and using the Bearer token.
- CORS issues: set `FRONTEND_URL` to your deployed frontend URL in backend env.
- Upload failures: verify Cloudinary credentials and file size/type limits.
- Emails not received: in dev, check console for Ethereal preview URL; for Gmail SMTP, ensure app password and less secure app settings as required.

---

## After Deploy Checklist

1) Set backend env vars on Render (MONGO_URI, JWT_SECRET, FRONTEND_URL, BACKEND_URL, CLOUDINARY_*, ADMIN_EMAIL/PASSWORD).
2) Deploy backend and confirm `GET /api/health` returns `{ ok: true }`.
3) Set frontend env on Vercel: `NEXT_PUBLIC_BACKEND_URL` = your backend URL.
4) Deploy frontend.
5) Create/verify admin account (auto-seeded or run `npm run seed:admin` in backend).
6) Sign up a test user, login, upload ID + selfie (+ optional profile photo).
7) In Admin dashboard: Approve or Request Re-upload; verify user status updates.
8) Confirm email notifications (Ethereal preview/Gmail inbox).

---

## Notes

- Ambiguities resolved with safe defaults: locked users can only access upload page and basic auth; no chat implemented.
- Admin can later unlock by Approve action; decline persists as locked until an admin changes status (UI provided for approve only).

Happy building!


