# Fit Log

A personal fitness log for one person. It tracks weight, tape measurements, a U.S. Navy body-fat estimate, and meals. Dates use America/Los_Angeles and are stored as `YYYY-MM-DD`.

The app is a Next.js site with a passcode gate, a Turso database, and a phone-first layout you can install on your home screen.

## Run locally

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Name | Purpose |
| --- | --- |
| `APP_PASSCODE` | The only password. There is no signup. |
| `TURSO_DATABASE_URL` | `libsql://...` URL for the Turso database |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `USDA_API_KEY` | Optional. Open Food Facts is used even when this is empty. |

Then:

```bash
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847). The first request creates the tables and the cooked food table.

```bash
npm test
npm run lint
```

## Deploy on Vercel

1. Create a Turso database if you do not already have one:

   ```bash
   turso db create fitnessapp
   turso db show fitnessapp --url
   turso db tokens create fitnessapp
   ```

2. Push this repo to GitHub.
3. In Vercel, import the repo. Framework preset: Next.js.
4. Add the same four environment variables. Do not commit them.
5. Deploy. Vercel gives you a `*.vercel.app` URL.
6. Open the URL, enter the passcode, then set sex, height, and goals in Settings. Sex and height are what the body-fat estimate needs. Men use waist and neck. Women also use hip.

Changing `APP_PASSCODE` signs you out, because the session cookie is signed with it.

## Add it to your home screen

The installed app needs the deployed HTTPS URL. A local `http://127.0.0.1` address will not install as a full-screen app.

**iPhone:** open the Vercel URL in Safari, tap Share, then Add to Home Screen. It opens full screen as Fit Log.

**Android:** open the URL in Chrome, tap the menu, then Install app or Add to Home screen.

## What is stored

- Profile and goals
- One measurements row per day. Every field is optional.
- Meals, with local foods first, then Open Food Facts and USDA, then manual macros
- Foods you pick from the web, so the next time they resolve locally

Settings can export a CSV and a JSON backup. Restoring a JSON backup replaces the current log. The built-in food table is kept.
