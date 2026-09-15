# Invite

A small Evite-style app: create an event, email a personalized invitation card, and collect RSVPs (yes/no, optional comment, guest counts).

Built on Next.js App Router. Locally it uses a SQLite file. On Vercel it uses a free [Turso](https://turso.tech) libSQL database (serverless has no persistent disk).

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Base URL for RSVP links, e.g. `http://localhost:3000` or `https://your-app.vercel.app`. On Vercel, `VERCEL_URL` is used if this is empty. |
| `GMAIL_USER` | To send email | Your Gmail address. |
| `GMAIL_APP_PASSWORD` | To send email | Gmail [App Password](https://myaccount.google.com/apppasswords) (not your normal password). |
| `FROM_NAME` | Optional | From display name (default `Invite`). Gmail still sends as `GMAIL_USER`. |
| `TURSO_DATABASE_URL` | On Vercel | Turso database URL (`libsql://…`). Locally, omit this to use `./data/invite.db`. |
| `TURSO_AUTH_TOKEN` | On Vercel | Turso auth token. |

Do not commit `.env.local`. Copy `.env.example` and fill in values.

### Gmail app password

1. Turn on 2-Step Verification for the Google account.
2. Open [App passwords](https://myaccount.google.com/apppasswords).
3. Create an app password (name it anything, e.g. “Invite”).
4. Paste the 16-character password into `GMAIL_APP_PASSWORD`. Spaces are fine.
5. Set `GMAIL_USER` to that Gmail address.

If SMTP is not configured, you can still add invitees and copy each unique RSVP link from the organizer page.

### Turso (Vercel)

SQLite files do not persist on Vercel serverless, so production needs a remote DB. Turso’s free tier is enough for this MVP.

1. Create a free account at [turso.tech](https://turso.tech).
2. Create a database (CLI or dashboard).
3. Copy the URL into `TURSO_DATABASE_URL` and a token into `TURSO_AUTH_TOKEN` (Vercel project env vars).
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL, e.g. `https://your-app.vercel.app`.

## How to use

1. **Create an event** on the home page: title, date/time, location or notes, host name. Toggle which RSVP fields invitees will see (comment, adults, kids, kids under 12 months). Yes/no is always shown.
2. **Save the manage URL** (`/e/…/manage?t=…`). That token is the organizer key — there is no login.
3. **Add invitees** by display name + email. Each person gets a unique RSVP link.
4. **Send invite** (or send all unsent). The email includes a generated invitation image with their name and the RSVP link.
5. **Invitees open the link** (no login): yes/no, optional comment, and only the count fields you enabled. Saving shows a confirmation. They can change the response later.
6. **Organizer view** on the manage page lists RSVPs and totals for yes/no/pending and enabled count fields.

## Scripts

```bash
npm run dev    # local
npm run build  # production build
npm start      # run the production build
```
