# Logística 7 Cajas — v2

Oil delivery system. The Google Sheets spreadsheet the salesperson already builds remains
the source of truth for the day's route — this system doesn't replace it, it connects to it
via manual copy-paste (no Google account or API involved).

## How it works, end to end

1. The salesperson builds the day's route in Sheets, as always (one tab per day).
2. Selects the whole tab (**Ctrl+A**), copies it (**Ctrl+C**).
3. Opens the web panel, pastes the content, and presses **"Update route"**. The site shows
   a preview of what it parsed before confirming.
4. The drivers (Tito / Meme) open the phone app, identify themselves, manually pick which
   of the day's destinations are theirs, order their route, and press "Start".
5. As they make deliveries, the web panel updates live (per-driver checklist: yellow =
   pending, green = delivered, red = skipped).

See the project memory (`project_logistica_7cajas.md` in Claude's memory) for the
full flow spec — it was recorded there after a long design session.

## Stack

- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Web**: React + Vite, hosted on **Vercel**
- **Mobile**: Expo (React Native)
- **Zero Google dependency** (no API or OAuth) anywhere in the system

---

## 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com) (free).
2. In the SQL Editor, run `supabase/migrations/001_schema.sql`.
3. Note down the `Project URL` and the `anon public key` (Settings → API).
4. Under **Authentication → Users**, manually create accounts (email + password) for whoever
   will log into the web panel. There's no self-signup: only someone with an account created
   there can log in.
5. Under **Authentication → Settings**, disable "Allow new users to sign up" so no one else
   can create their own account.

## 2. Web (salesperson/admin panel)

```bash
cd web
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Screens:
- `/` — Update route (paste spreadsheet, preview, confirm)
- `/panel` — Live per-driver checklist

To deploy it, connect the repo to [Vercel](https://vercel.com) pointing at the `web/` folder
(Framework preset: Vite) and load the same environment variables there.

## 3. Mobile (driver app)

```bash
cd mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo install --fix   # aligns versions to the available Expo SDK
npx expo start
```

Install on the phone with **Expo Go**, scanning the QR code. No login required — the
identity (Tito/Meme) is picked on screen each time the day is closed out.

---

## Technical notes

- The paste parser (`web/src/lib/parser.js`) is deterministic (no AI) — column order is
  fixed based on the real spreadsheet. If the spreadsheet format ever changes, that's the
  only file that needs to be touched.
- "Update route" freezes the stops a driver has already started delivering that day — it
  won't overwrite them even if the salesperson updates again.
- Reordering the route on the phone uses real drag gestures (press and hold, then drag),
  via `react-native-draggable-flatlist` + `react-native-gesture-handler` + `react-native-reanimated`.
  If installing them causes version conflicts, run `npx expo install --fix` to let Expo align
  everything to your SDK.
- No strict per-user RLS: both the web app (after login) and the mobile app (no login) read
  and write with the same `anon` key. This is a deliberate simplification given the project's
  size — worth revisiting if the business grows significantly.
