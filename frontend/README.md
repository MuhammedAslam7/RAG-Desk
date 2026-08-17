# RAG Desk — Frontend

Next.js app for the RAG Desk AI support platform. Authentication is fully
custom (email + password, JWT access tokens + revocable refresh tokens in
httpOnly cookies) — no Clerk.

## Setup

1. Copy `.env.example` to `.env` and fill it in:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   JWT_SECRET=<must match backend JWT_SECRET>
   ```

2. Run the backend (FastAPI) — see `backend/README.md` / `../docker-compose.yml`.
3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

## Auth flow

- **Sign up** → verification email (via Brevo) → verify → auto sign-in → onboarding.
- **Sign in** → httpOnly `access_token` (15 min) + `refresh_token` (30 days) cookies.
- The API client silently refreshes the access token on 401; sessions are
  revocable server-side (password reset/change logs out other devices).
- Route protection: `middleware.ts` verifies the access-token cookie with
  `jose`; the `(app)` layout re-validates against `/api/v1/auth/me` server-side.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
