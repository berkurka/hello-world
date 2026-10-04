# Partyz

A small party-planning app: create a party, share invite links, and collect RSVPs (yes, maybe, or no, optional comment, guest counts).

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
| `SMTP_HOST` | To send email | SMTP server. Resend: `smtp.resend.com`. |
| `SMTP_PORT` | Optional | SMTP port. Default `465` (TLS from the start). `587` uses STARTTLS. |
| `SMTP_USER` | To send email | SMTP username. Resend: `resend`. |
| `SMTP_PASS` | To send email | SMTP password. Resend: your API key. |
| `MAIL_FROM` | To send email | From address, e.g. `onboarding@resend.dev` or an address on a verified domain. |
| `FROM_NAME` | Optional | From display name (default `Partyz`). Paired with `MAIL_FROM`, or with `GMAIL_USER` on the legacy path. |
| `GMAIL_USER` | Legacy fallback | Gmail address. Used only when the SMTP variables above are not all set. |
| `GMAIL_APP_PASSWORD` | Legacy fallback | Gmail [App Password](https://myaccount.google.com/apppasswords). The from address is `GMAIL_USER`. |
| `TURSO_DATABASE_URL` | Production on Vercel | Turso database URL (`libsql://…`). Locally, omit this to use `./data/invite.db`. On Vercel without this, the app uses `/tmp/invite.db` (ephemeral). |
| `TURSO_AUTH_TOKEN` | With Turso URL | Turso auth token. |

Party images live in the same database as events (local `./data/invite.db` or Turso). No extra blob-storage keys are required. Do not use ephemeral `/tmp` files for images.

Do not commit `.env.local`. Copy `.env.example` and fill in values.

### Resend (or any SMTP)

1. Create an API key in [Resend](https://resend.com).
2. Set `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, and `SMTP_PASS` to that API key.
3. Set `MAIL_FROM` to `onboarding@resend.dev` for testing, or to an address on a domain you have verified in Resend.
4. Optional: set `FROM_NAME` (default `Partyz`).

Resend’s testing sender only delivers to the email address on your Resend account until a domain is verified. Invite, sign-in, and host-email confirmation messages all need a verified `MAIL_FROM` domain before they can reach anyone else. If a send fails, the organizer notice includes the provider’s error.

### Gmail fallback

If `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` are not all set, the app falls back to Gmail:

1. Turn on 2-Step Verification for the Google account.
2. Open [App passwords](https://myaccount.google.com/apppasswords).
3. Create an app password (name it anything, e.g. “Partyz”).
4. Paste the 16-character password into `GMAIL_APP_PASSWORD`. Spaces are fine.
5. Set `GMAIL_USER` to that Gmail address. Mail is sent as `GMAIL_USER`.

If SMTP is not configured, creating a party still works. The success screen always shows a copyable dashboard URL. You can add invitees and copy each unique RSVP link from the organizer page. Email CTAs stay in the background until mail is configured.

### Turso (Vercel)

Vercel serverless has no persistent disk. Without Turso env vars the app still starts and uses `/tmp/invite.db` so previews work; a banner warns that data is temporary. For production, set Turso so events and RSVPs persist:

1. Create a free account at [turso.tech](https://turso.tech).
2. Create a database (CLI or dashboard).
3. Copy the URL into `TURSO_DATABASE_URL` and a token into `TURSO_AUTH_TOKEN` (Vercel project env vars).
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL, e.g. `https://your-app.vercel.app`.

## How to use

1. **Create a party** on the home page: title, date/time, optional end time, location or notes, optional party image, host name, and **host email**. The browser time zone is saved with the party. Toggle which RSVP fields invitees will see (comment, adults, kids, kids under 12 months) and whether Maybe is allowed (on by default). Yes/no is always shown. There is no password. If a required field is missing, you stay on the form and scroll to the first problem. The optional image (JPEG, PNG, WebP, or GIF, max 1 MB) appears on the generated invite card and as the guest RSVP page background. You can add or replace it later from the manage page. Non-images are rejected.
2. **Check email / save the dashboard URL.** After create, the app emails a one-time sign-in link (30 minutes) if SMTP (or legacy Gmail) is configured. It does not sign you in from the address you typed until that link is opened. The success page always shows the manage URL (`/e/…/manage?t=…`) once, copyable, as a backup. This browser also remembers the new party.
3. **Open the dashboard** from My parties after signing in, from the saved manage URL, or from an older claim link (`/host/claim?token=…`). A signed-in host can open `/e/…/manage` without the secret. `manage?t=` still works.
4. **Find my parties** at `/host/recover` sends one sign-in link for every party on that email. The link expires in 30 minutes, is single-use, and is consumed when you press Continue (opening the link does not use it up). The session cookie lasts 30 days. The page always shows the same confirmation, whether or not the email has parties.
5. **Add invitees** by family or guest name and email. A second email is optional: both addresses get the same RSVP link, and either person can answer for the family. Or import a CSV with `name`, `email`, and optional `email2` (download a template from the manage page). Copy the link to share (email sending is optional). Invite mail is sent as “{host} via Partyz” and replies go to the host email.
6. **Invitees open the link** (no login): yes, maybe, or no (maybe can be turned off), optional comment, and only the count fields you enabled. Maybe keeps the counts. They can add the party to a calendar or open the location in Maps. If this family already answered, that RSVP is shown first, with a way to change it. The latest save wins.
7. **Organizer view** on the manage page lists RSVPs and totals for yes/maybe/no/pending and enabled count fields. Host access settings can confirm a new host email or reset the dashboard link so a leaked URL stops working.

## Host claim tokens

Each new party stores `host_email`, a unique `host_claim_token`, and `host_claimed_at` (null until opened).

- Opening `/host/claim?token=…` marks the party claimed and redirects to `/e/{id}/manage?t={admin_token}`.
- Unclaimed tokens expire **7 days** after `created_at`.
- Opening an already-claimed token still redirects to the dashboard (so the email remains useful).
- A bad or expired token shows a plain not-found message.
- Guest RSVP tokens and `manage?t=` auth are unchanged.

Existing databases get new columns and tables on startup. `CREATE TABLE IF NOT EXISTS` does not alter a table that is already there, so the app reads `PRAGMA table_info` and runs `ALTER TABLE … ADD COLUMN` only when a column is missing. That is safe to repeat on local SQLite and Turso. No separate migration command is required.

Columns added this way:

- `events.host_email`, `events.host_claim_token`, `events.host_claimed_at`
- `events.party_image_mime`, `invitees.email2`
- `events.allow_maybe` (default 0 for parties that already existed; new parties set it from the form, on unless the host turns it off), `events.timezone`, `events.ends_at`, `events.updated_at`, `events.host_email_verified_at`
- index `events_host_email`

New tables: `host_login_tokens` (one-time sign-in links, 30-minute expiry, only the SHA-256 hash is stored; recover links are limited to 3 per email per hour, create links to 10 per email per hour, and both share a cap of 30 per IP per hour), `host_sessions` (30-day cookie sessions), `host_email_changes` (confirm a new host email; `previous_email` is the address at request time), and `host_device_grants` (this browser can reopen a party it created, with `expires_at`). A one-time `schema_flags` row turns Maybe off for parties created before that row's timestamp. Party images also use an `event_images` table (bytes stay out of ordinary event reads). `display_name` stays the family or guest label. One invitee row is still one token and one RSVP. Rows saved before `email2` existed keep a null second address and the same link. Changing the host email requires a signed-in session for the current address. The current address is notified, and the new address must confirm the link. A party with no host email can gain one only from the browser that created it, not from a dashboard link. A new sign-in link cancels older unused sign-in links for that email, and a new create link cancels older unused create links. The two budgets stay separate.

Sign-in and recovery mail use the same SMTP settings as invites. There are no new environment variables. With Resend, `MAIL_FROM` must be on a domain you have verified, or messages only reach the Resend account owner.

Invite card and party image URLs include `?v=` set from `events.updated_at` (or `created_at` when a party has never been edited), so a browser does not keep a year-old card after the date or photo changes. RSVP and dashboard pages send `noindex`. Guest links use the party title, date, and place for link previews.

## Scripts

```bash
npm run dev    # local
npm run build  # production build
npm start      # run the production build
npm test       # unit tests (CSV import, party images, family email, mail config)
```
