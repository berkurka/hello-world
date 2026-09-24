# Partyz

A small party-planning app: create a party, share invite links, and collect RSVPs (yes/no, optional comment, guest counts).

Built on Next.js App Router. Locally it uses a SQLite file at `./data/invite.db`. On Vercel without Turso it uses a temporary `file:/tmp/invite.db` so previews load; that data can disappear between serverless instances. Set a free [Turso](https://turso.tech) database for production.

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
| `NEXT_PUBLIC_APP_URL` | Recommended | Base URL for RSVP and claim links, e.g. `http://localhost:3000` or `https://your-app.vercel.app`. On Vercel, `VERCEL_URL` is used if this is empty. |
| `GMAIL_USER` | To send email | Your Gmail address. |
| `GMAIL_APP_PASSWORD` | To send email | Gmail [App Password](https://myaccount.google.com/apppasswords) (not your normal password). |
| `FROM_NAME` | Optional | From display name (default `Partyz`). Gmail still sends as `GMAIL_USER`. |
| `TURSO_DATABASE_URL` | Production on Vercel | Turso database URL (`libsql://…`). Locally, omit this to use `./data/invite.db`. On Vercel without this, the app uses `/tmp/invite.db` (ephemeral). |
| `TURSO_AUTH_TOKEN` | With Turso URL | Turso auth token. |

Do not commit `.env.local`. Copy `.env.example` and fill in values.

### Gmail app password

1. Turn on 2-Step Verification for the Google account.
2. Open [App passwords](https://myaccount.google.com/apppasswords).
3. Create an app password (name it anything, e.g. “Partyz”).
4. Paste the 16-character password into `GMAIL_APP_PASSWORD`. Spaces are fine.
5. Set `GMAIL_USER` to that Gmail address.

If SMTP is not configured, creating a party still works. The success screen always shows a copyable dashboard URL. You can add invitees and copy each unique RSVP link from the organizer page. Email CTAs stay in the background until mail is configured.

### Turso (Vercel)

Vercel serverless has no persistent disk. Without Turso env vars the app still starts and uses `/tmp/invite.db` so previews work; a banner warns that data is temporary. For production, set Turso so events and RSVPs persist:

1. Create a free account at [turso.tech](https://turso.tech).
2. Create a database (CLI or dashboard).
3. Copy the URL into `TURSO_DATABASE_URL` and a token into `TURSO_AUTH_TOKEN` (Vercel project env vars).
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL, e.g. `https://your-app.vercel.app`.

## How to use

1. **Create a party** on the home page: title, date/time, location or notes, host name, and **host email**. Toggle which RSVP fields invitees will see (comment, adults, kids, kids under 12 months). Yes/no is always shown. There is no password or login wall.
2. **Check email / save the dashboard URL.** After create, the app tries to email a claim link if Gmail is configured. The success page always shows the manage URL (`/e/…/manage?t=…`) once, copyable, in case email is missing or delayed.
3. **Open the dashboard** from the email (`/host/claim?token=…`) or from the saved manage URL. `manage?t=` remains the organizer key.
4. **Add invitees** by family or guest name and email. A second email is optional: both addresses get the same RSVP link, and either person can answer for the family. Or import a CSV with `name`, `email`, and optional `email2` (download a template from the manage page). Copy the link to share (email sending is optional).
5. **Invitees open the link** (no login): yes/no, optional comment, and only the count fields you enabled. If this family already answered, that RSVP is shown first, with a way to change it. The latest save wins.
6. **Organizer view** on the manage page lists RSVPs and totals for yes/no/pending and enabled count fields.

## Host claim tokens

Each new party stores `host_email`, a unique `host_claim_token`, and `host_claimed_at` (null until opened).

- Opening `/host/claim?token=…` marks the party claimed and redirects to `/e/{id}/manage?t={admin_token}`.
- Unclaimed tokens expire **7 days** after `created_at`.
- Opening an already-claimed token still redirects to the dashboard (so the email remains useful).
- A bad or expired token shows a plain not-found message.
- Guest RSVP tokens and `manage?t=` auth are unchanged.

Existing databases get the new columns on startup: the app runs `ALTER TABLE events ADD COLUMN …` and `ALTER TABLE invitees ADD COLUMN email2 TEXT`, and ignores “already exists” errors so this works on local SQLite and Turso. `display_name` stays the family or guest label. One invitee row is still one token and one RSVP.

## Scripts

```bash
npm run dev    # local
npm run build  # production build
npm start      # run the production build
```
