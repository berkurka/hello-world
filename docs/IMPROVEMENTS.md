# Partyz: prioritized product improvements

This is a plan, not a change. It lists what to improve in Partyz (live at
https://hello-world-theta-olive.vercel.app), in what order, and why.

**What it is based on**

- The code on `main` at commit `11ce2f8`, which includes the front door and host email claim (#5),
  CSV invitee import (#6), party images (#7), family invites with a second email (#8), and Resend
  SMTP (#9). File and line references point at that commit.
- The competitor research comparing Partyz with Evite, Partiful, Paperless Post, and Mixily
  (2026-09-24).
- The UI audit in [PR #4](https://github.com/berkurka/hello-world/pull/4) (`docs/UI_AUDIT.md`). It
  was written before #5–#9 merged, so [Appendix A](#appendix-a-pr-4-audit-findings-re-checked-on-main)
  re-checks every finding against today's code.
- A local run of `main` with sample data, viewed at desktop (1280 px) and phone (390 px) widths.
  Nothing was written to the live site.

## Read-aloud summary

1. Let hosts get back into their parties with just their email: a "Find my parties" page sends a one-time sign-in link through the Resend email we already use.
2. Give Partyz a modern look with new fonts, brighter colors, and rounded, consistent buttons and fields, and fix the pieces that look broken today.
3. Rebuild the guest RSVP page for phones: a big party header, readable details with calendar and map buttons, and large Going, Maybe, and Can't go buttons.
4. Rebuild the host dashboard for phones: the headcount at the top and every guest as a card with a visible Copy link button.
5. Then close the biggest gaps with Evite and Partiful: one shareable link for group chats, reminder and update emails, and editing or removing guests.

## How to read the list

- **Priority.** P0: do next. These are the owner's two asks plus bugs that show guests wrong
  information or make the product look broken. P1: closes gaps most hosts hit. P2: worth doing once
  P0 and P1 land; several depend on them.
- **Effort.** S: a contained change in a few existing files, with at most a new column. M: new tables
  or routes, or restructuring one screen end to end. L: a new subsystem or outside dependency (a
  scheduler, an SMS provider) with ongoing cost.
- **Groups.** Quick wins, Core UX, and Bigger bets. Items 1–8 answer the owner's two asks and come
  first; each still carries its group label.

## The list at a glance

In priority order.

| # | Improvement | Group | Priority | Effort | Who does it well |
| --- | --- | --- | --- | --- | --- |
| 1 | Account recovery: "Find my parties" magic link and a My parties page | Core UX | P0 | M | Evite (host accounts) |
| 2 | Polish pass: fix broken-looking fields, buttons, copy, and dead-end pages | Quick win | P0 | S | — |
| 3 | New visual system: type, color, shape, and shared components | Core UX | P0 | M | Partiful, Paperless Post |
| 4 | Guest RSVP page rebuilt phone-first, with an HTML invite card | Core UX | P0 | M | Partiful, Mixily |
| 5 | Host dashboard rebuilt phone-first: headcount, guest cards, share panel | Core UX | P0 | M | Partiful, Mixily |
| 6 | Invite card shows outdated details after the host edits the party | Quick win | P0 | S | — |
| 7 | Shorter create flow with a live preview | Core UX | P1 | M | Partiful |
| 8 | Invite themes across the card, RSVP page, and email | Core UX | P1 | M | Paperless Post, Evite, Partiful |
| 9 | Link previews that show the party, and emails from the host | Quick win | P1 | S | Partiful, Mixily |
| 10 | Add to calendar and Open in Maps | Quick win | P1 | S | Paperless Post |
| 11 | RSVP "Maybe" | Quick win | P1 | S | Evite, Mixily, Partiful |
| 12 | Guest list management: edit, remove, host-entered RSVPs, export | Core UX | P1 | M | Mixily, Paperless Post |
| 13 | One shareable link for group chats | Core UX | P1 | M | Partiful, Mixily, Evite |
| 14 | Email guests: remind the undecided, announce changes, message everyone | Core UX | P1 | M | All four |
| 15 | RSVP controls: deadline, capacity, close or cancel, who's-coming list | Core UX | P2 | M | Mixily, Partiful, Paperless Post, Evite |
| 16 | Automatic scheduled reminders | Bigger bet | P2 | L | All four |
| 17 | Co-hosts | Bigger bet | P2 | M | All four |
| 18 | Text-message invites | Bigger bet | P2 | L | Paperless Post, Evite, Partiful |

---

## Owner ask 1: account recovery

### 1. Account recovery: "Find my parties" by email

**Group:** Core UX · **Priority:** P0 · **Effort:** M (an S-sized first step is described below)

**Competitors.** Evite solves recovery with a required host account, which costs a sign-up wall. This
design keeps Partyz's "No account to start" promise (`app/page.tsx:47`) and still lets hosts get back
in.

**How host access works today.** There are no accounts or passwords. Whoever has the event's
`admin_token` in `/e/{id}/manage?t=…` is the host (`lib/db.ts:153-158`,
`app/e/[id]/manage/page.tsx:23-25`). The host receives that URL two ways when the party is created:
it is shown once on `/e/{id}/created` (`app/e/[id]/created/page.tsx:53-61`), and, when mail is
configured, it is behind a claim link in an email (`app/actions.ts:133-163`, `lib/mail.ts:176-207`).
An unopened claim link expires after 7 days; once opened, it works forever (`lib/host-claim.ts:4-12`).

**Problem.**

- A host who loses both the dashboard URL and the claim email has no way back. The expired-claim page
  tells them to use the dashboard URL instead (`app/host/claim/page.tsx:18-28`), and the 404 page has
  no actions at all (`app/not-found.tsx`).
- A typo in the host email can't be fixed. The edit form shows the email field only when creating
  (`app/components/event-form.tsx:305`), and `updateEvent` doesn't write it
  (`app/actions.ts:184-198`). The claim email goes to the wrong address, and there is no way to
  resend it.
- Hosts with several parties keep one secret URL per party. There is no list.
- A forwarded dashboard URL or claim email gives permanent control, and there is no way to revoke it.
- Parties created before #5 have no host email (`host_email` is nullable, `lib/db.ts:65`), so email
  recovery can't find them yet.

**Proposed change.** Passwordless sign-in by magic link, sent through the existing SMTP transport in
`lib/mail.ts` (Resend). A "reset password" flow doesn't fit: there is no password to reset, and adding
passwords would add a credential store and a sign-up wall without solving anything a magic link
doesn't.

1. **Entry points.** A "Find my parties" link in the host header, on the 404 and expired-claim pages,
   and on the party-created screen.
2. **Request page, `/host/recover`.** One email field. The response is always the same: "If that
   email has parties on Partyz, we sent a sign-in link. It expires in 30 minutes." That way the page
   can't be used to check which emails exist. If any event has that `host_email` (add an index on
   `events.host_email`), create a single-use token (random, like `newToken()` in `lib/ids.ts`), store
   only its SHA-256 hash in a new `host_login_tokens` table with a 30-minute expiry, and email the
   link. Rate-limit by email and by IP, for example 3 per email and 10 per IP per hour, counted from
   the same table. This matters because the Resend free plan allows 100 emails a day, shared with
   invites. Send the email after responding (Next's `after()`), so response time doesn't reveal
   whether the address has parties.
3. **Sign-in page, `/host/login?token=…`.** The link opens a page with a "Continue" button that
   submits a POST. The token is consumed on that POST, not on the GET, because email security
   scanners open links ahead of the user and would use up a single-use token. On success, create a
   `host_sessions` row and set an HttpOnly, Secure, SameSite=Lax cookie for 30 days, then show My
   parties.
4. **My parties, `/host`.** Upcoming and past parties for the signed-in email, each with its headcount
   and an "Open dashboard" button, plus Sign out.
5. **Dashboard access.** The manage page and `requireOrganizer` (`app/actions.ts:38-44`) accept either
   the existing `?t=` token or a session whose email matches the event's `host_email`. Old links keep
   working, and new emails can link to `/e/{id}/manage` without the secret in the URL.
6. **At creation.** Don't sign the creator in as the email they typed: nobody has verified it, and
   automatic sign-in would let anyone list a stranger's parties by entering that person's address.
   Instead, remember the new party on this device with a cookie, and make the creation email a sign-in
   link, which verifies the address.
7. **Dashboard settings.** "Change host email" (confirmed by a link sent to the new address), "Add a
   recovery email" for parties created before #5, and "Reset dashboard link", which rotates
   `admin_token` so a leaked URL stops working.

The smallest useful first step is S effort: the request page emails a fresh, single-use, 30-minute
link for each matching party, and that link opens the existing dashboard. It fixes "I lost my link"
but keeps the secret in the dashboard URL. Sessions and My parties can follow.

**Prerequisite.** Production mail must reach any address. With Resend's testing sender
(`onboarding@resend.dev`), mail only reaches the Resend account owner until a domain is verified
(`README.md`, Resend section). Confirm that production `MAIL_FROM` is on a verified domain before
relying on recovery, claim, or invite emails. When mail isn't configured at all (local development),
hide the entry points and keep today's "save this link" copy.

**User impact.** Hosts can always get back to their party with only their email, from any device, and
see all their parties in one place. The yellow "Bookmark this page… there is no login" warning
(`app/e/[id]/manage/page.tsx:45-47`) can be removed.

---

## Owner ask 2: a modern, phone-first UX

**Why it reads as dated today.** Everything is a serif on beige "stationery": the only font stack is
`"Iowan Old Style", Georgia, "Times New Roman", serif` (`app/globals.css:20`), and no web font is
loaded, so the face depends on the device: Iowan Old Style on Apple devices, Georgia on Windows, and a
generic serif elsewhere (a Times-like face in our Linux screenshots). There is no `border-radius`
anywhere in the app's CSS: square boxes with 1 px beige borders, dashed outlines around the RSVP
toggles and CSV import (`app/globals.css:135-141`, `441-445`), and browser-default file pickers, radio
buttons, and number spinners. Most elements have the same visual weight. The home page's step boxes
look like input fields (`app/globals.css:195-199`), statuses are plain words, and there is no imagery
besides the optional party photo and the generated card.

**Direction.** Bright, celebratory, and built for phones first: the party is the hero and the app
stays quiet. Items 2–8 below turn that into concrete changes to layout, typography, the invite card,
the RSVP page, the dashboard, mobile, and empty states.

### 2. Polish pass: fix what looks broken

**Group:** Quick win · **Priority:** P0 · **Effort:** S (each row is a small, local fix)

**Problem and fix.**

| What's wrong | Evidence | Fix |
| --- | --- | --- |
| The title, host name, and guest name boxes render as unstyled browser inputs next to styled ones | The CSS styles only `input[type=…]` (`app/globals.css:118-129`), and these inputs have no `type` (`app/components/event-form.tsx:206`, `:295`; `app/e/[id]/manage/page.tsx:163`) | Add `type="text"` now; item 3 moves to a class-based input style |
| Disabled buttons look clickable, and most buttons show no progress | No `:disabled` rule (`app/globals.css:154-180`). Save RSVP, Add, Import CSV, Send email, and Email everyone are plain submit buttons (`app/components/rsvp-form.tsx:96-98`; `app/e/[id]/manage/page.tsx:139-141`, `175-177`, `199-201`, `209-211`) | Reuse the pending `SubmitButton` pattern from `app/components/event-form.tsx:368-375` everywhere; add a disabled style |
| "Party created — check your email to open the dashboard" shows even when no email was sent or the send failed | Static heading (`app/e/[id]/created/page.tsx:31`) above a notice that says the opposite (`:37-52`). The raw provider error is printed to the host (`:45`) | Heading per mail state; put the provider error behind a "Details" toggle |
| Single guests are told "Your family already RSVP'd" | `app/components/rsvp-response.tsx:31` | "You're going" or "You can't make it", plus "Change response" |
| One field, three names | "Kids under 12 months" (`app/components/event-form.tsx:359`, `app/components/rsvp-form.tsx:78`), "Under 12 months" (`app/e/[id]/manage/page.tsx:88`, `app/components/rsvp-response.tsx:23`), "Infants" (`app/e/[id]/manage/page.tsx:101`) | One label everywhere, for example "Babies (under 1)" |
| Empty comment cells are blank while empty counts show "—" | `app/e/[id]/manage/page.tsx:128` | Show "—" |
| The "Preview:" line under Edit event shows the saved time, not the time being edited | `app/components/event-form.tsx:362` | Remove it (item 7 adds a real preview) |
| A failed RSVP submit silently lands on the create-party page | `saveRsvp` calls `redirect("/")` when the token or event is missing (`app/actions.ts:359`, `:361`) | Show the not-found page with guest-facing copy |
| `?done=1` is added after saving an RSVP, but nothing reads it | `app/actions.ts:388`; the page reads only `error` (`app/rsvp/[token]/page.tsx:15`) | Drop it, or use it for a one-time "Saved" toast |
| The 404 and expired-claim pages are dead ends | `app/not-found.tsx` is a title and one line; `app/host/claim/page.tsx:18-28` | Friendly copy plus "Create a party" and "Find my parties" (item 1) |
| No loading or error screens | No `app/loading.tsx` or `app/error.tsx`; `requireOrganizer` throws a raw "Event not found" (`app/actions.ts:42`) | Add both files; send missing events to the not-found page |
| The empty guest list is one table row, and "Email everyone…" still shows with zero guests | `app/e/[id]/manage/page.tsx:107-110`, `:205-212` | An empty state with "Add your first guest" and "Import a CSV"; hide bulk send until there is someone to send to |
| Operator copy in the product | Home page: "Email sending is optional and off until you configure it" (`app/page.tsx:64-68`). `SMTP_*` variable names in errors (`app/actions.ts:283`, `lib/mail.ts:79-80`). The temporary-database banner with `TURSO_*` names on every page, including guest pages (`app/layout.tsx:23-29`) | Product copy only; keep configuration details in server logs; show the banner to hosts only |

**User impact.** The first screen no longer looks half-styled, every button shows that it's working,
and no page leaves a guest or host stuck.

### 3. New visual system: type, color, shape, and components

**Group:** Core UX · **Priority:** P0 · **Effort:** M (CSS rewrite and a small component set; no data
changes) · **Competitors:** Partiful (themes, fonts, animations) and Paperless Post (design-led
stationery) set the bar guests compare against.

**Problem.** See "Why it reads as dated" above. Also: there is one 920 px column for every page
(`app/globals.css:45-48`). Statuses have no color (`app/e/[id]/manage/page.tsx:124`). Feedback
messages live in the URL (`?notice=` and `?error=`, built in `app/actions.ts:208-217`), so they
reappear on reload and end up inside the dashboard bookmark the page asks hosts to save
(`app/e/[id]/manage/page.tsx:46`). The brand appears twice on the home page (`app/layout.tsx:21` and
`app/page.tsx:44`).

**Proposed change.**

- **Typography.** Self-host two fonts with `next/font`: a clean sans for the interface (for example
  Inter or Geist) and an expressive display face for party titles and the invite card (for example
  Fraunces). 16 px base. Scale of 14, 16, 18, 22, 28, and 40 px. Tabular numbers for counts.
- **Color.** CSS variables for surface, ink, muted text, lines, accent, soft accent, and status colors
  (green for Going, amber for Maybe, gray for Can't go and Waiting, red for errors). Keep the wine
  `#8b2942` as the Partyz brand mark, use a brighter default accent for parties, and let themes
  (item 8) override the accent.
- **Shape and depth.** 10 px radius on controls, 16 px on cards, fully rounded status chips, soft
  shadows, and spacing instead of dashed boxes.
- **Layout.** Guest pages are a single column up to about 600 px. Host pages go up to about 1,120 px,
  with two columns on desktop. On phones, the main action sits in a sticky bottom bar.
- **Components.** Buttons (primary, secondary, ghost, danger) with pending and disabled states; class-based
  inputs instead of `type` selectors; switches for on/off settings; a minus/plus stepper for counts; a
  three-way segmented control for RSVPs; status chips; cards; a bottom sheet for editing on phones;
  toasts instead of URL flashes; an empty-state block; initials avatars.
- **Accessibility.** Visible focus rings, 44 px minimum tap targets, 16 px text in inputs (stops iOS
  zooming on focus), AA contrast on chips, and reduced motion when the device asks for it.
- **Header.** Host pages show the logo, "My parties", and "New party". Guest pages get no app header
  (item 4).

**User impact.** Partyz looks current and trustworthy, every screen feels like the same product, and
pages are faster to scan.

### 4. Guest RSVP page rebuilt phone-first

**Group:** Core UX · **Priority:** P0 · **Effort:** M · **Competitors:** Partiful (live guest list,
themed pages) and Mixily (event pages with Going, Maybe, and Can't Go).

**Problem.**

- The guest page is wrapped in host chrome. The "PARTYZ" header links to the create-party page
  (`app/layout.tsx:21`), and the temporary-database banner with `TURSO_*` names appears here too when
  Turso isn't set (`app/layout.tsx:23-29`).
- The 800×500 PNG invite card (`app/rsvp/[token]/page.tsx:40-44`) repeats the title, date, place, and
  host that are printed right under it (`:45-53`). On a 390 px phone the card is scaled to about 40%,
  so its date and place lines render at about 8 px, which is unreadable, and the card takes the top
  third of the screen.
- Answering means two plain boxes with small radio circles (`app/components/rsvp-form.tsx:26-49`),
  browser number spinners for counts (`:50-89`), and a plain "Save RSVP" button.
- There is no calendar button, no map link, no way to reach the host, and no moment of confirmation:
  after saving, the guest sees "Your family already RSVP'd: Yes"
  (`app/components/rsvp-response.tsx:31`).
- Nothing changes after the party date; the form stays open.

**Proposed change.**

- **No host chrome.** A guest route group with its own layout: no app header and no infrastructure
  banner, and a small footer reading "Made with Partyz. Host your own party."
- **Hero.** The party photo or theme artwork across the top (about 40% of the screen height on phones),
  the title in the display font, and a personal line: "Hi Priya, you're invited."
- **HTML invite card.** Replace the PNG on this page with the same design in HTML and CSS: crisp text
  at any size, readable by screen readers, and themeable. Keep the PNG for email and link previews
  (items 6, 8, and 9).
- **Details as icon rows.** Date and time with "Add to calendar" (item 10). Place with "Open in Maps".
  The host's name, without exposing their email address. Notes with line breaks preserved.
- **Answering.** Three large buttons: Going, Maybe (item 11), and Can't go. Choosing Going reveals
  steppers for the counts the host turned on, starting at 1 adult, and blocks "Going with 0 people".
  An optional "Note for Bernardo". On phones, a sticky "Send RSVP" bar that shows progress while
  saving.
- **Confirmation.** "You're going! See you Saturday." with the party summary, "Add to calendar", and
  "Change response". For Can't go: "Thanks for letting Bernardo know."
- **After the party.** A read-only "This party was on Oct 17" state.
- **Optional.** A "Who's coming" list when the host turns it on (item 15).

**User impact.** Every guest sees this page. It becomes readable on phones, quicker to answer, and it
answers "when" and "where" without a text to the host.

### 5. Host dashboard rebuilt phone-first

**Group:** Core UX · **Priority:** P0 · **Effort:** M · **Competitors:** Partiful (real-time guest
list) and Mixily (hosts can edit guests' RSVPs, CSV import and export).

**Problem.**

- On a 390 px phone the guest table scrolls sideways (`.table-wrap` uses `overflow-x: auto`,
  `app/globals.css:361-363`). The Invite column, which holds the Copy button and is the host's main
  way to share, starts off-screen.
- Every row prints the full RSVP URL in monospace, plus either a Send email button or, when email is
  off, the same "Copy the link to invite. Email sending is off." hint
  (`app/e/[id]/manage/page.tsx:129-146`), so rows are tall and noisy.
- The totals are six equal boxes (`:58-91`). The number hosts want, "how many people are coming", is
  split across Adults, Kids, and Under 12 months and never added up.
- The full Edit event form is always open and takes half the page (`:226-232`). Add invitee, CSV
  import, and bulk email are stacked in the other half (`:155-224`).
- Statuses are plain text, and there is no filter or search. Whether an invite went out shows only as
  the button label (Send or Resend), never when, even though `invited_at` is stored (`lib/db.ts:82`).

**Proposed change.**

- **Top of the page.** Title, date, and place, with "Share", "Preview as guest", and "Edit". Edit
  opens its own tab on desktop or a bottom sheet on phones.
- **Headline numbers.** "6 people coming" (adults, kids, and babies from Going replies), a "3 of 5
  replied" progress bar, and chips for Going, Maybe, Can't go, and Waiting.
- **Share panel.** "Copy invite link" (item 13), "Send to 2 not yet invited", "Remind 2 waiting"
  (item 14), and the phone's share sheet through `navigator.share`.
- **Guest list.** On phones, one card per guest: name, emails in small type, a status chip, counts,
  the comment, a "Copy link" button, and a "…" menu (item 12). On desktop, a compact table without raw
  URLs and with an "Invited Sep 24" or "Not sent" column. Filter by status and search by name.
- **Adding guests.** One panel with "Add one" and "Paste or import" tabs (item 12).
- **First run.** With no guests yet, a checklist: add guests, share your link, watch replies come in.
- **Reassurance instead of a warning.** Replace the bookmark warning with "Signed in as …" (item 1) or
  "We emailed you a link to this page."

**User impact.** Hosts can run the party from their phone, the share action is always visible, and
the key number is readable at a glance.

### 6. Invite card shows outdated details after the host edits the party

**Group:** Quick win · **Priority:** P0 · **Effort:** S

**Problem.** `/api/invite-card/[token]` returns a Next `ImageResponse` with no cache headers
(`app/api/invite-card/[token]/route.tsx:17-24`, `lib/invite-card.tsx:12-17`). In production,
`ImageResponse` defaults to `Cache-Control: public, immutable, no-transform, max-age=31536000`
(`node_modules/next/dist/server/og/image-response.js:39`; development uses `no-store`, which is why
local testing doesn't show the problem). The RSVP page always requests the same URL
(`app/rsvp/[token]/page.tsx:42`). So after a host changes the date, time, place, or photo through
`updateEvent` (`app/actions.ts:170-206`), a guest who opened their page before can keep seeing the old
card, which browsers may keep for up to a year, directly above the new date printed in text.

**Proposed change.** Add `events.updated_at`, set it in `updateEvent` and when the party image is
saved or removed, and add it to the card URL (`/api/invite-card/{token}?v={updated_at}`). Alternatively,
send `Cache-Control: private, no-cache` from the route. Version `/api/party-image/{id}` the same way;
it is cached for 2 minutes today (`app/api/party-image/[id]/route.ts:14`). Item 4 takes the PNG off
the RSVP page, but email and link previews still need the versioned URL.

**User impact.** Guests never see two different times on the same page.

### 7. Shorter create flow with a live preview

**Group:** Core UX · **Priority:** P1 · **Effort:** M · **Competitors:** Partiful (templates, create
without a sign-up wall).

**Problem.**

- The home page is a text hero, three step boxes, a paragraph about email configuration, and a
  "Create your party" button that scrolls to the form directly below it (`app/page.tsx:43-73`). It
  never shows what an invite looks like.
- The form shows everything at once, including the RSVP field toggles and a browser-default file
  picker (`app/components/event-form.tsx:204-361`). The date and time labels show developer formats,
  "Date (YYYY-MM-DD)" and "Time (HH:MM)" (`:218`, `:237`), and the inputs set `lang="en-CA"` to match
  (`:224`, `:243`). Chrome ignores that and formats the pickers in the browser's own locale: in US
  English they read "10/11/2026" and "06:00 PM" under those labels.
- After submitting, hosts land on an in-between page with the dashboard link and an "Open
  dashboard" button (`app/e/[id]/created/page.tsx:53-69`), one more click before they can add
  guests.
- The host email can't be corrected later (see item 1).

**Proposed change.**

- **Home.** A hero with a sample invite card and one button, "Create an invite". A three-step strip
  with icons. No duplicate brand and no configuration copy.
- **Form.** Required first: what (title), when (date, start time, optional end time), your name, and
  your email. Then an "Add details" section: where and notes, a cover photo drop zone with a preview,
  the theme (item 8), and RSVP questions as switches.
- **Live preview.** The invite card and RSVP page update beside the form on desktop, and under a
  "Preview" tab on phones.
- **Plain labels.** "Date" and "Start time", with pickers in the visitor's own locale. Capture the
  host's time zone for item 10.
- **After creating.** Go straight to the dashboard with the first-run checklist (item 5), send the
  sign-in email (item 1), and keep the backup dashboard link under "Save a backup link".
- **Settings.** The host email is editable, confirmed by a link to the new address.

**User impact.** A first party in fewer steps, fewer abandoned forms, and hosts see what guests will
see before they share.

### 8. Invite themes across the card, RSVP page, and email

**Group:** Core UX · **Priority:** P1 · **Effort:** M · **Competitors:** Paperless Post (large
template library with custom colors and fonts), Evite (themed gallery), and Partiful (themes, fonts,
animations).

**Problem.**

- Every party gets the same card: cream inside a dark wine frame, 800×500
  (`lib/invite-card.tsx:12-17`, `:24-137`). A kid's birthday and a dinner party look identical.
- The guest's name is the largest text on the card (56 px, or 46 px with a photo;
  `lib/invite-card.tsx:78-88`), and the party title is smaller (36 px, `:90-100`). The hierarchy is
  backwards.
- The PNG uses the default font of `next/og`, a sans serif, while the page uses the serif stack, so
  the card and the page around it don't match.
- The invite email is Georgia text, the PNG, and one button (`lib/mail.ts:140-150`), with no theme and
  no calendar links.

**Proposed change.**

- One `InviteCard` design with theme tokens, rendered as HTML on the RSVP page and in the create
  preview, and through `ImageResponse` for email (1200×750, sharp at a 600 px email width) and link
  previews (1200×630). Embed the same fonts through the `ImageResponse` `fonts` option (TTF, OTF, or
  WOFF).
- Six starter themes: Classic (a refined version of today's wine), Confetti (birthdays), Garden,
  Midnight (dark with gold), Playful (kids), and Minimal. Each theme is a palette, a display font, a
  background pattern, and a treatment for the cover photo.
- The party title is the hero. The guest's name moves to a smaller "For Priya" line. Date and place sit
  below, and the host's name closes the card.
- An `events.theme` column (default `classic`) and a theme picker in create and edit.
- The email template follows the theme: table layout, a button that renders in every mail client,
  preview text, and calendar links (item 10).

**User impact.** Invitations people want to open, and a clear difference from bare RSVP tools.

---

## Quick wins

### 9. Link previews that show the party, and emails from the host

**Group:** Quick win · **Priority:** P1 · **Effort:** S · **Competitors:** Partiful and Mixily are
link-first: the shared link is the invitation.

**Problem.**

- No page sets its own metadata. Every page shares the root title "Partyz" and the description "Plan
  and organize your party here in 3 steps." (`app/layout.tsx:6-9`), and there is no `generateMetadata`
  or Open Graph image anywhere. Copying a guest's link into a text thread is a main way to share, and
  the only one when email is off, so the link unfurls as an ad for Partyz instead of an invitation.
- Invite emails come from "Partyz" (the `FROM_NAME` default, `lib/mail.ts:61`), with the subject
  "You're invited: {title}" (`:128`) and no Reply-To (`:126-158`). When a guest hits Reply, the
  message goes to the sending mailbox, not to the host.
- RSVP and dashboard pages aren't marked `noindex`.

**Proposed change.**

- `generateMetadata` on `/rsvp/[token]`: the title "Bernardo invited you to Maya's 7th Birthday", the
  description "Sat, Oct 17 · 2:00 PM · Riverside Park", the versioned 1200×630 card as the Open Graph
  image (items 6 and 8), and `robots: noindex`. The same for the shareable link (item 13). Dashboard
  pages get `noindex` too.
- Emails come from "Bernardo via Partyz", with `replyTo` set to the host email, the subject "Bernardo
  invited you to Maya's 7th Birthday", and preview text with the date and place.

**User impact.** Invitations look personal in chats and inboxes, and replies reach the host.

### 10. Add to calendar and Open in Maps

**Group:** Quick win · **Priority:** P1 · **Effort:** S · **Competitors:** Paperless Post lists "Add
to online calendars".

**Problem.** There are no calendar or map links anywhere. `starts_at` is stored without a time zone
(`app/actions.ts:75`, `lib/db.ts:62`), and there is no end time.

**Proposed change.**

- An `.ics` file per guest (for example `/rsvp/[token]/event.ics`). It uses the party's time zone
  once one is saved (last bullet), and floating local time for older parties, which calendar apps
  read as "this wall-clock time". The end time defaults to 3 hours after the start unless the host
  sets one, and the description includes the RSVP link.
- Google Calendar and Outlook "add event" links.
- "Open in Maps" built from the location text: a Google Maps search link, or Apple Maps on iOS.
- Show these on the RSVP page, on the confirmation, and in invite and reminder emails.
- Capture the host's time zone at creation (`Intl.DateTimeFormat().resolvedOptions().timeZone`) into
  a new `events.timezone` column, which item 16 needs to send reminders at the right hour.

**User impact.** Fewer no-shows and fewer "what time was it again?" texts to the host.

### 11. RSVP "Maybe"

**Group:** Quick win · **Priority:** P1 · **Effort:** S · **Competitors:** Evite, Mixily (Going,
Maybe, Can't Go), and Partiful (Maybe on by default; hosts can turn it off).

**Problem.** `saveRsvp` accepts only yes or no (`app/actions.ts:363-367`). `rsvps.attending` stores 1
or 0 (`lib/db.ts:89`), and the dashboard counts only Yes, No, and Pending
(`app/e/[id]/manage/page.tsx:35-37`). Undecided guests either stay Pending or answer No.

**Proposed change.** Store Maybe as `attending = 2`, which needs no migration because the column is
already an integer, or move to a `status` text column. Either way, code that assumes 1 or 0 must
learn the third value: the form preselects "no" for anything but 1
(`app/components/rsvp-form.tsx:15-17`), `attendingLabel` shows anything else as Pending
(`lib/format.ts:33-37`), and `saveRsvp` keeps headcounts for any non-zero value
(`app/actions.ts:369-371`). Add the three-way control (designed once in item 4), an "Allow Maybe"
setting that is on by default, a Maybe chip and filter on the dashboard, and optional counts for
Maybe ("probably 2"). Maybes are included in reminders (item 14).

**User impact.** More replies, earlier, and hosts know exactly whom to nudge.

---

## Core UX

### 12. Guest list management: edit, remove, host-entered RSVPs, export

**Group:** Core UX · **Priority:** P1 · **Effort:** M · **Competitors:** Mixily (hosts edit guests'
RSVPs, including plus-ones; CSV export) and Paperless Post (paste a list).

**Problem.** Guests can't be edited or removed. The only server actions are create and update event,
add and import invitees, send invites, and save an RSVP (`app/actions.ts`). A mistyped email or a
duplicate family stays forever and counts as Pending. Re-importing a CSV skips emails already on the
event (`lib/invitee-csv.ts:231-249`), so it can't fix a name either. Hosts can't record an RSVP they
got by text or phone call, can't replace a link that was forwarded, and can't export the list.

**Proposed change.**

- A "…" menu on each guest: Edit name and emails (reusing the duplicate check in
  `emailsUsedOnEvent`), Remove (with confirmation; also removes the RSVP), Set RSVP for them (marked
  "added by host"), Copy link, and New link (replaces the token).
- "Export CSV" with each guest's status, counts, and comment, using the same columns as the import
  template so the file can be edited and re-imported.
- "Paste a list": a text box that reuses `parseInviteeCsv`, which already accepts comma, semicolon,
  and tab separators (`lib/invitee-csv.ts:69-92`).

**User impact.** Accurate counts, no stuck mistakes, and one list for every reply, however it
arrived.

### 13. One shareable link for group chats

**Group:** Core UX · **Priority:** P1 · **Effort:** M · **Competitors:** Partiful (one link), Mixily
(share a link, no guest accounts), and Evite (link-only sharing). Paperless Post charges a fee for its
shareable link.

**Problem.** The host must add every guest with a valid email before that guest can reply
(`app/actions.ts:224-226`), and the only guest route is a personal `/rsvp/[token]`. For a casual party,
the host can't drop one link into the group chat; they add each person and copy each link one at a
time.

**Proposed change.** An optional party-wide link, `/p/{token}`, with the setting "Anyone with this link
can RSVP" (on by default for new parties). A guest enters their name and, optionally, an email for
updates. That creates a guest row marked as joined by link, saves their RSVP, and sends them to their
own `/rsvp/{token}` page, which is remembered in a cookie so they can come back and change their
answer. Guardrails: the capacity limit (item 15), a per-IP rate limit, removing entries (item 12), and
regenerating the link to stop it spreading. Personal links keep working for emailed guests.

**User impact.** The biggest cut in host effort for casual parties, and it matches how invitations
actually travel.

### 14. Email guests: remind the undecided, announce changes, message everyone

**Group:** Core UX · **Priority:** P1 · **Effort:** M · **Competitors:** All four. Evite allows up to
5 manual reminders plus guest messages; Mixily has ready-made "Are you coming?" and "See you
tomorrow!" reminders and an email-based messaging inbox; Partiful has text blasts; Paperless Post sends
free reminders and broadcasts.

**Problem.** After the first invite, the host can't reach guests from Partyz. `sendAllUnsent` only
emails guests who were never sent anything (`app/actions.ts:323-354`), and `updateEvent` changes the
date or place without telling anyone (`app/actions.ts:170-206`).

**Proposed change.**

- **"Remind 3 waiting."** Emails Waiting (and Maybe) guests their own link. Store `last_reminded_at`
  and show "Reminded Sep 30" on the guest.
- **Change notices.** When an edit changes the date, time, or place, offer "Email guests about this
  change?" (on by default if anyone has replied), with a "What changed" block in the email.
- **"Message guests."** A plain-text composer addressed to Everyone, Going, or Waiting, with Reply-To
  set to the host (item 9).
- **Sending budget.** Show the number of recipients before sending. The Resend free plan allows 100
  emails a day, and a family's second address counts separately, so translate Resend's daily-quota
  error into plain English and plan for a paid Resend tier before reminders go wide.

**User impact.** More replies and no surprise changes on the day.

### 15. RSVP controls: deadline, capacity, close or cancel, who's-coming list

**Group:** Core UX · **Priority:** P2 · **Effort:** M · **Competitors:** Paperless Post (maximum
capacity), Mixily (RSVP deadline, RSVP limits, guest list visibility), Partiful (guest cap and
waitlist), and Evite (guest list visible on Event Pages).

**Problem.** Replies are accepted forever, even after the party: `saveRsvp` has no date check
(`app/actions.ts:356-389`). There is no capacity, no way to close replies or cancel the party, and
guests can't see who else is coming.

**Proposed change.** Party settings for:

- A reply-by date, shown to guests, after which the form locks.
- A maximum headcount that blocks new Going replies or starts a waitlist.
- "Close RSVPs".
- "Cancel party", which emails guests through item 14 and puts a banner on the page.
- "Show who's coming": names of Going guests only. Off for existing parties; on by default for new
  ones, with clear copy so guests know their name is visible.
- A read-only state once the party date has passed.

**User impact.** Small venues stay safe, cancellations reach everyone, and seeing friends' names
nudges the undecided.

---

## Bigger bets

### 16. Automatic scheduled reminders

**Group:** Bigger bet · **Priority:** P2 · **Effort:** L · **Depends on:** items 10 and 14 ·
**Competitors:** Evite (automatic reminder 2 days before), Mixily (automated reminders), Partiful
(automatic reminders), and Paperless Post (guest opt-in event reminders).

**Problem.** Even with item 14, reminders depend on the host remembering to press the button.

**Proposed change.** A scheduled job (Vercel Cron, hourly) that sends an RSVP nudge to Waiting and Maybe
guests a few days before the reply-by date or the party, and a "See you tomorrow" email with calendar
and map links to Going guests the day before. A per-party switch (on by default) with a preview of
each email. A `notifications` table keyed by party, guest, and reminder type so nothing sends twice.
An unsubscribe link per guest. The host's time zone from item 10. A guard that stops before the daily
email quota.

**User impact.** More replies and more people showing up, with no extra work for the host.

### 17. Co-hosts

**Group:** Bigger bet · **Priority:** P2 · **Effort:** M once item 1 exists · **Competitors:** All
four. On Partiful, co-hosts can change settings and send text blasts.

**Problem.** Each party has exactly one `host_email` (`lib/db.ts:65`). The only way to share control is
to forward the dashboard URL, which gives full, permanent access that can't be taken back.

**Proposed change.** An `event_hosts` table. "Add co-host" by email; the co-host signs in through item
1. Hosts can remove a co-host, and the dashboard link is reset afterwards. Co-hosted parties appear in
My parties, and the invite reads "Hosted by Bernardo and Ana".

**User impact.** Couples and families can plan together without passing secret links around.

### 18. Text-message invites

**Group:** Bigger bet · **Priority:** P2 · **Effort:** L (with an S-sized first stage) ·
**Competitors:** Paperless Post (text in the US and Canada), Evite (US and Canada short code), and
Partiful (text blasts).

**Problem.** Partyz sends email or nothing. Many hosts invite by text, and guests often ignore email.

**Proposed change.**

- **Stage 1 (S, part of item 5).** The phone's share sheet and an `sms:` link with a prefilled message
  for each guest. No provider and no cost.
- **Stage 2 (L).** An SMS provider such as Twilio for invites and reminders: a phone column in the
  CSV, STOP and HELP handling, US A2P 10DLC registration, and a per-message cost.

**User impact.** Invitations reach guests where they actually read messages.

---

## Not recommended yet

These appear in the competitor matrix but don't strengthen the core loop of create, share, reply, and
remind. Revisit them once items 1–14 have landed.

- **Ticketing and payments** (Mixily and Partiful, through Stripe): payments, fees, and refunds are a
  product of their own.
- **Registry and gifting** (Paperless Post, Evite): a simple "Gift ideas" link could be a later S.
- **Photo albums and comment walls** (Partiful; Evite and Paperless Post have albums, partly on paid
  tiers): party images are stored as base64 in the database (`event_images`, `lib/db.ts:97-103`), so
  albums need blob storage first.
- **Polls and date polls** (Mixily, Partiful) and **potluck sign-ups** (Evite).
- **Custom RSVP questions** (Mixily, Partiful): the optional comment covers the common case.
- **Per-person RSVP inside a family** (Paperless Post): one answer per family with counts covers most
  parties.

## Suggested order of work

This is an order, not a schedule.

1. **Check email delivery first.** Confirm that production `MAIL_FROM` is on a Resend-verified domain.
   With the testing sender, claim, recovery, and invite emails fail for everyone except the Resend
   account owner, and the party-created page then shows a raw provider error.
2. **Quick fixes:** items 2 and 6.
3. **Recovery:** item 1, starting with the S-sized first step.
4. **Visual foundation:** item 3, then items 4 and 5. Ship calendar and map links (item 10) and Maybe
   (item 11) with item 4, so the RSVP page is designed once. Item 9 only touches page metadata and
   email headers, so it can go in alongside any of these.
5. **Two P1 streams that can run side by side:** design (items 7 and 8) and the guest loop (items 13,
   12, and 14).
6. **Later:** items 15–18.

---

## Appendix A: PR #4 audit findings, re-checked on main

| Audit finding | Status on `main` | Covered by |
| --- | --- | --- |
| RSVP URL is inert text with no copy control | Fixed in #5 (Copy button) | — |
| Send email, Resend email, and Email everyone error when SMTP isn't set | Fixed in #5 (hidden when mail is off) | — |
| "Email everyone…" shows with zero guests | Still open when mail is on (`app/e/[id]/manage/page.tsx:205-212`) | Items 2, 5 |
| Header link sends guests and hosts to the create page | Still open (`app/layout.tsx:21`) | Items 1, 3, 4 |
| 404 has no action, and its copy doesn't fit missing manage tokens or unknown paths | Still open (`app/not-found.tsx`) | Item 2 |
| A lost `?t=` has no way back | Still open | Item 1 |
| Returning guest sees the form instead of their answer | Fixed in #8; the new copy says "family" to single guests | Item 2 |
| Bad RSVP submit redirects silently to `/` | Still open (`app/actions.ts:359`, `:361`) | Item 2 |
| No pending state on Save RSVP, Add, or Send | Still open | Item 2 |
| No `loading.tsx` or `error.tsx`; raw "Event not found" | Still open (`app/actions.ts:42`) | Item 2 |
| Environment variable names in host-facing errors | Partly fixed: `GMAIL_*` copy is gone, but `SMTP_*` names remain (`app/actions.ts:283`, `lib/mail.ts:79-80`) and raw provider errors show on the created page | Item 2 |
| "Gmail SMTP env vars" hint on the dashboard | Fixed in #5 and #9 | — |
| Home page promises email | Fixed in #5; configuration copy remains (`app/page.tsx:64-68`) | Items 2, 7 |
| Empty table uses `colSpan={8}` | Fixed in #8 | — |
| Blank comment cells | Still open (`app/e/[id]/manage/page.tsx:128`) | Item 2 |
| Three labels for babies under 12 months | Still open | Item 2 |
| Edit "Preview:" shows the saved value | Still open (`app/components/event-form.tsx:362`) | Item 2 |
| Flash can't show an error and a notice together | Still open (minor) | Item 3 (toasts) |
| Yes with every count at 0 is accepted | Still open | Item 4 |
| Invite card image has no fallback | Still open | Item 4 |
| `.btn:disabled` looks clickable | Still open | Item 2 |
| Temporary-database banner with `TURSO_*` names on guest pages | Still in code (`app/layout.tsx:23-29`); not visible on the live site | Items 2, 4 |
| Confirmation depends on `?done=1` | Fixed in #8; the parameter is still added but unused (`app/actions.ts:388`) | Item 2 |

## Appendix B: updates to the competitor research

The research was written on 2026-09-24, as #8 and #9 were merging. Three of its Partyz rows are now
out of date:

- **Two-email family invites** were marked "not in repo/live". They shipped in #8: one guest row per
  family with an optional `email2` that gets the same link (`lib/db.ts:79`). Partyz now matches
  Paperless Post's "add couple/family" basics, though not its per-person RSVP.
- **Email sending** was described as "optional ... if Gmail env configured". Since #9 it uses any SMTP
  server (Resend in production), with Gmail as a fallback (`lib/mail.ts:30-52`).
- **Design** was described as a "minimal single layout". Since #7, an optional party photo appears on
  the invite card and the RSVP page. The "no themes" gap still stands (item 8).
