# Business Details Getter

Vite + React SPA with Vercel Edge Functions for the Google Maps lead finder.

## Develop

```bash
npm install
npm run dev
```

## Environment variables

Set in Vercel → Project → Settings → Environment Variables (and locally in `.env`):

- `GOOGLE_PLACES_API_KEY` — Google Places API (New) key. Enable "Places API (New)" in Google Cloud Console.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel — framework preset: **Vite**.
3. Add `GOOGLE_PLACES_API_KEY` in env vars.
4. Deploy.

API routes live in `/api/leads/*.js` and run on Vercel's Edge runtime.
