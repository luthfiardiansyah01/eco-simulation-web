# EcoSim — River Ecosystem Simulation

EcoSim is a browser-based environmental simulation game built with Next.js. Players restore river ecosystems across West Java, Central Java, and East Java through mission-based gameplay, research points, and achievements.

The app works as a guest, and signing in with Supabase adds persistent progress, achievement tracking, and a place on the single-player leaderboard. Gameplay is online-only: missions and progress require a network connection. The app is also installable as a PWA and ships with an Android shell via Capacitor; offline mode is a fallback screen, not an offline game.

## Tech stack

- **Next.js 16.4** — App Router, Turbopack, React 19
- **TypeScript**
- **Tailwind CSS 4**
- **Phaser 4** — gameplay simulation
- **Supabase** — authentication, Postgres, RLS, and mission progress RPC
- **Framer Motion** — UI transitions
- **Web Audio API** — synthesized UI/gameplay effects and nature ambience
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

The database schema, migrations, RLS policies, achievements seed data, mission completion RPC, and public leaderboard RPC live in [`supabase/`](./supabase).

Follow [`supabase/README.md`](./supabase/README.md) for the full setup. At a minimum:

1. Apply `supabase/schema.sql` to a fresh project, or run the migrations in `supabase/migrations/` in filename order.
2. Set **Authentication → URL Configuration**:
   - **Site URL:** your production origin
   - **Redirect URLs:** `/auth/callback`, `/auth/confirm`, and `/auth/recovery` for production and local development
3. Update the **Confirm signup** and **Reset Password** email templates. The confirmation template uses `/auth/confirm` with `{{ .TokenHash }}`; the recovery template adds `{{ .Token }}` for the 6-digit code and links to `/auth/recovery`. Both templates are documented in `supabase/README.md`.

## Authentication flow

- `/login` — sign up, sign in, and resend confirmation email
- `/forgot-password` — requests a 6-digit recovery code by email and verifies it
- `/reset-password` — sets a new password for a verified recovery session
- `/auth/recovery` — processes recovery links (`token_hash`, PKCE `code`, or fragment tokens) and redirects to `/reset-password`
- `/auth/callback` — exchanges OAuth/PKCE codes for a session
- `/auth/confirm` — verifies email confirmation links
- `src/proxy.ts` — refreshes the Supabase session on navigation using `getClaims()` and keeps guest pages available if Supabase is unreachable

Email confirmation and password recovery require working email delivery. Configure **custom SMTP** in Supabase before editing the templates; the default template cannot be customized until SMTP is set up. The required **Confirm signup** and **Reset Password** templates are documented in [`supabase/README.md`](./supabase/README.md).

## Sound effects and ambience

The app uses a small Web Audio synth instead of bundled audio files. UI clicks, navigation, mission actions, errors, objective feedback, mission completion, and achievements are generated at runtime, so they add no audio cache weight. Gameplay also gets a procedural nature ambience: a soft pad, river, wind, and occasional bird calls.

- `src/lib/audio/sound-engine.ts` generates tones, filtered noise, and the gameplay ambience.
- `src/components/audio/SoundProvider.tsx` unlocks audio on the first user gesture and persists the mute preference in `localStorage`.
- `src/components/audio/SoundToggle.tsx` adds a mute button to the top-right of every page; gameplay has its own toggle in the top bar.

No third-party samples or copyrighted recordings are used; the ambience is synthesized entirely with oscillators, noise buffers, and filters. Sound starts only after the first click or keypress, as required by browser autoplay policies. The preference is stored under `ecosim_sound_muted`.

## Difficulty

The mission briefing lets players choose **Easy**, **Normal**, or **Hard** before starting. Difficulty changes the starting environment and resources only; mission objectives and rewards stay the same.

- **Easy:** cleaner air and water, healthier biodiversity and fish, extra trees, credits, energy, and one drone.
- **Normal:** the standard starting conditions and mission resources.
- **Hard:** higher pollution, weaker biodiversity and water quality, fewer trees and drones, and tighter credits/energy.

The choice is carried in the `difficulty` query parameter, so refreshing gameplay keeps it, and the pause link returns to the briefing with the same difficulty selected. Presets live in `src/lib/gameplay/difficulty.ts`.

## Settings

`/settings` provides local, per-device preferences:

- **Appearance:** dark or light theme; defaults to dark and applies across the app. An inline boot script applies the saved theme before paint to avoid a flash. The isometric gameplay map keeps its dark game palette.
- **Volume:** controls sound effects and gameplay ambience.
- **Language:** Bahasa Indonesia or English; the Settings page updates immediately and `document.lang` follows the selection.
- **Notifications:** enables or disables in-app achievement notifications.

Preferences are stored in `localStorage` under `ecosim_volume`, `ecosim_theme`, `ecosim_language`, and `ecosim_notifications`. The Settings page is reachable from the home footer and the PWA app shortcut.

## Leaderboard

`/leaderboard` is a public single-player ranking for registered players. Players are ordered by total research points across all regions, then by completed missions, achievements, and active regions. Guests can view the board; signing in saves progress and adds the player to the ranking.

Rankings are read through the `get_leaderboard(p_limit)` RPC in `supabase/migrations/20261022000000_leaderboard.sql`. The function uses `security definer` so guests do not need direct access to `profiles` or `user_progress`, and it only returns a username plus aggregate counts. Direct writes to `user_progress` and `mission_results` are revoked; progress is written only by the server-side `complete_mission` RPC. The page is linked from the home footer, the profile page, and the PWA shortcut menu.

Mission completion is validated against the server-side `mission_catalog` before progress is stored. The RPC checks the final pollution, biodiversity, water, fish, tree, and drone values, derives research points from the catalog instead of trusting the client, and enforces a 30-second cooldown between first-time completions. This prevents fabricated completion calls from spamming progress. If a mission runs out of affordable actions before its objectives are met, the gameplay screen shows a failure dialog with a **Reset Misi** action; save failures also offer retry and reset.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server with Turbopack |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## PWA and network behavior

Gameplay is intentionally online-only. The PWA makes the app installable and gives offline users a useful fallback screen, but it does not cache mission pages or run the game offline.

The PWA setup is intentionally framework-native so it works with Next.js 16's default Turbopack build:

- `public/manifest.json` defines the app name, icons, shortcuts, and install metadata.
- `src/components/pwa/ServiceWorkerRegistration.tsx` registers `/sw.js` in production and unregisters existing workers in development to avoid stale caches while editing.
- `public/sw.js` handles runtime caching:
  - **Navigation:** network-first, with `/offline.html` as the offline fallback.
  - **Hashed Next.js assets, icons, and images:** stale-while-revalidate.
  - **Auth routes and cross-origin Supabase requests:** not intercepted.
  - **Mission pages and mission state:** never cached; they require the network.

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
    leaderboard/       Public single-player ranking
    settings/          Appearance, audio, language, and notification preferences
  components/          Layout, gameplay, audio, UI, and PWA components
  data/                Regions, missions, and level definitions
  lib/                 Supabase clients, progress, gameplay, audio, and helpers
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
4. Add the production `/auth/callback`, `/auth/confirm`, and `/auth/recovery` URLs to Supabase's **Redirect URLs**.

Do not expose the Supabase service-role key in any `NEXT_PUBLIC_*` variable.

## Android / Capacitor

The Android shell is configured in `capacitor.config.ts` and loads the deployed web app through `server.url`. Update that URL to your deployment origin before syncing. See the Capacitor Android documentation for opening the project in Android Studio.

## Troubleshooting

- **Not signed in after email confirmation:** confirm the email template points to `/auth/confirm` with `token_hash`, and that the route is listed in Supabase Redirect URLs.
- **Password recovery code is not received:** configure custom SMTP and add `{{ .Token }}` to the **Reset Password** template, as shown in [`supabase/README.md`](./supabase/README.md).
- **Password reset link is invalid:** confirm the **Reset Password** template sends `token_hash` and `type=recovery` to `/auth/recovery`, and that `/auth/recovery` is listed in Supabase Redirect URLs.
- **Session disappears after navigation:** check the Supabase environment variables in the deployment and redeploy.
- **PWA is not installable:** use HTTPS (or localhost), verify the manifest and icons in DevTools, and test against a production build.
- **The game does not work offline:** this is expected. Offline mode only serves the fallback page; missions and progress require a connection.
- **Old UI still appears after deploy:** clear site data or bump `CACHE_NAME` in `public/sw.js`.
- **Mission progress is not saved:** sign in and verify the `complete_mission` and `mission_catalog` migration has been applied. If the completion screen shows a validation error, reset the mission and finish every objective before saving.
- **Mission completion is rate-limited:** first-time completions have a 30-second cooldown. Wait for the message to clear, then retry the save; replays of an already-completed level are not rate-limited.
- **Leaderboard says it is unavailable:** apply `supabase/migrations/20261022000000_leaderboard.sql` in the Supabase SQL editor or with `supabase db push`.
