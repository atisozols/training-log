# Copenhagen

A personal training-log PWA: Claude writes each session into Supabase, you log it in the app, reflect, and Claude writes the next one from your history.

- **Today**: active plan, days to target, next session, morning check-in, squeeze test, XP
- **Session**: tick exercises, log kg / reps / seconds / pain per set, rest timer, squeeze test
- **Reflection**: pain during + where, energy, rating, favorite, journal prompt
- **Big picture**: road to target date, level/XP/badges, pain trend, history with favorites
- **Library**: every exercise marked allowed / progressing / avoid

## Stack

Next.js 15 (App Router, server actions) · Supabase (Postgres + Auth + RLS) · Tailwind CSS 4 · installable PWA (manifest + service worker)

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Deploy (Vercel)

Import the repo, then add the two environment variables from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Access

Row Level Security allows only the user listed in `public.app_owner`. Create an account on `/login`, then add that user's id to `app_owner` (and confirm the email in Supabase if confirmations are on).

## Data model

`programs` → `phases` → `workouts` → `workout_exercises` → `set_logs`, plus `exercises` (library) and `reflections` (one per workout). Programs can be `planned`, `active`, `completed` or `archived`, so new plans slot in after the current one.
