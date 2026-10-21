# EcoSim — River Ecosystem Simulation

EcoSim is a browser-based environmental simulation game built with Next.js. Players restore river ecosystems across West Java, Central Java, and East Java through mission-based gameplay, research points, and achievements.

The app works as a guest, and signing in with Supabase adds persistent progress and achievement tracking. It is also installable as a PWA and ships with an Android shell via Capacitor.

## Tech stack

- **Next.js 16.4** — App Router, Turbopack, React 19
- **TypeScript**
- **Tailwind CSS 4**
- **Phaser 4** — gameplay simulation
- **Supabase** — authentication, Postgres, RLS, and mission progress RPC
- **Framer Motion** — UI transitions
- **Capacitor 8** — Android wrapper
- **Native service worker** — offline fallback and static-asset caching

## Requirements

- Node.js **20.9 or newer**
- npm
- A Supabase project (only needed for sign-in and saved progress)

## Getting started

```bash
npm install
```

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in the Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Guest play is supported. Supabase is only required for sign-in, saved progress, and achievements.

## Supabase setup

The database schema, migrations, RLS policies, achievements seed data, and the `complete_mission` RPC live in [`supabase/`](./supabase).

Follow [`supabase/README.md`](./supabase/README.md) for the full setup. At a minimum:

1. Apply `supabase/schema.sql` to a fresh project, or run the migrations in `supabase/migrations/` in filename order.
2. Set **Authentication → URL Configuration**:
   - **Site URL:** your production origin
   - **Redirect URLs:** `/auth/callback` and `/auth/confirm` for production and local development
3. Update the **Confirm signup** email template to use `/auth/confirm` with `{{ .TokenHash }}`. The default Supabase link uses a URL fragment that server-side route handlers cannot read. The required template is documented in `supabase/README.md`.

## Authentication flow

- `/login` — sign up, sign in, and resend confirmation email
- `/auth/callback` — exchanges OAuth/PKCE codes for a session
- `/auth/confirm` — verifies email confirmation `token_hash` links
- `src/proxy.ts` — refreshes the Supabase session on navigation using `getClaims()` and keeps guest pages available if Supabase is unreachable

Email confirmation requires working email delivery. Configure **custom SMTP** in Supabase before editing the confirmation template; the default template cannot be customized until SMTP is set up.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server with Turbopack |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## PWA and offline behavior

The PWA setup is intentionally framework-native so it works with Next.js 16's default Turbopack build:

- `public/manifest.json` defines the app name, icons, shortcuts, and install metadata.
- `src/components/pwa/ServiceWorkerRegistration.tsx` registers `/sw.js` in production and unregisters existing workers in development to avoid stale caches while editing.
- `public/sw.js` handles runtime caching:
  - **Navigation:** network-first, with `/offline.html` as the offline fallback.
  - **Hashed Next.js assets, icons, and images:** stale-while-revalidate.
  - **Auth routes and cross-origin Supabase requests:** not intercepted.

To test the installed experience:

```bash
npm run build
npm start
```

Then open the app in Chrome and check **DevTools → Application → Manifest** and **Service Workers**. Use **Application → Storage → Clear site data** after changing the service worker, or bump `CACHE_NAME` in `public/sw.js` so old caches are removed on activation.

On iOS, install from Safari's **Share → Add to Home Screen**; iOS does not show the Chromium-style install prompt.

`next-pwa` 5.x is not used. It is webpack-only, relies on injecting registration into a legacy `main.js` entry, and is not compatible with the App Router/Turbopack setup used here. Forcing a webpack build also breaks the current Tailwind 4 Turbopack loader. The native service worker keeps the build pipeline intact.

## Project structure

```text
src/
  app/                 App Router pages and route handlers
    (auth)/login/      Server login page + client form
    auth/              OAuth callback and email confirmation routes
    region/            Region selection
    mission/           Mission briefing
    play/              Phaser gameplay
    profile/           Achievements and profile
  components/          Layout, gameplay, UI, and PWA components
  data/                Regions, missions, and level definitions
  lib/                 Supabase clients, progress, gameplay, and helpers
  proxy.ts             Next.js 16 session-refresh proxy
public/
  icons/               PWA icons (72–512 px)
  images/              Region and mission artwork
  manifest.json        Web app manifest
  sw.js                Service worker
  offline.html         Static offline fallback
supabase/              Schema, migrations, and setup notes
```

## Deployment

The project is designed for Vercel:

1. Import the repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's environment variables for Production (and Preview if used).
3. Redeploy after changing environment variables or auth redirect settings.
4. Add the production `/auth/callback` and `/auth/confirm` URLs to Supabase's **Redirect URLs**.

Do not expose the Supabase service-role key in any `NEXT_PUBLIC_*` variable.

## Android / Capacitor

The Android shell is configured in `capacitor.config.ts` and loads the deployed web app through `server.url`. Update that URL to your deployment origin before syncing. See the Capacitor Android documentation for opening the project in Android Studio.

## Troubleshooting

- **Not signed in after email confirmation:** confirm the email template points to `/auth/confirm` with `token_hash`, and that the route is listed in Supabase Redirect URLs.
- **Session disappears after navigation:** check the Supabase environment variables in the deployment and redeploy.
- **PWA is not installable:** use HTTPS (or localhost), verify the manifest and icons in DevTools, and test against a production build.
- **Old UI still appears after deploy:** clear site data or bump `CACHE_NAME` in `public/sw.js`.
- **Mission progress is not saved:** sign in and verify the `complete_mission` RPC migration has been applied.
