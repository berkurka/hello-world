# UI audit — Invite MVP

Read-only inventory of **existing** screens and broken UX on those screens. No new pages or visual system proposed.

Evidence is from App Router files, server actions, and empty/error branches as of this audit. There are **no modals/dialogs**.

Core loop in this app: **create event → manage (add invitees / share) → guest RSVP → organizer dashboard**.

---

## 1. Screen list

| Path / surface | File | Purpose |
| --- | --- | --- |
| `/` | `app/page.tsx` | Landing + **New event** form (create). |
| `/?error=…&draft=1&…` | `app/page.tsx` | Same create form with server validation error and restored field values. |
| `/e/[id]/manage?t=…` | `app/e/[id]/manage/page.tsx` | Organizer dashboard: RSVP totals/table, add invitee, send email, edit event. Secret is `t` (no login). |
| `/e/[id]/manage?t=…&error=…` or `&notice=…` | same | Same dashboard with flash error or success. |
| `/rsvp/[token]` | `app/rsvp/[token]/page.tsx` | Guest RSVP: invite card image + yes/no form. |
| `/rsvp/[token]?error=…` | same | Guest form with flash error. |
| `/rsvp/[token]?done=1` | same | Guest **confirmation** (only when `done=1` **and** an RSVP row exists). |
| Unmatched routes; manage missing/`wrong` `t`; unknown RSVP token | `app/not-found.tsx` | App 404. |
| `GET /api/invite-card/[token]` | `app/api/invite-card/[token]/route.tsx`, `lib/invite-card.tsx` | Generated invitation PNG (RSVP `<img>` + email CID). Not a navigable page. |
| Invite email | `lib/mail.ts` | Off-app surface: card, “RSVP now” button, paste-link fallback. |
| Global chrome | `app/layout.tsx` | Header brand link + optional ephemeral-DB banner on **every** HTML page. |
| Inline flash | `app/components/flash.tsx` | Error **or** notice paragraph (not a dialog). |

**Embedded forms (not separate routes):**

| Surface | File | Purpose |
| --- | --- | --- |
| Event create/edit fields | `app/components/event-form.tsx` | Title, date, time, location, host, RSVP field toggles, submit. |
| Guest RSVP fields | `app/components/rsvp-form.tsx` | Yes/no, optional counts/comment, **Save RSVP**. |
| Add invitee + bulk send | `app/e/[id]/manage/page.tsx` | Display name, email, **Add**, **Email everyone who has not been sent an invite**. |

**Does not exist:** modal/dialog, event list, public event page (`/e/[id]` without `/manage` 404s), guest dashboard of other guests, copy-to-clipboard UI, `loading.tsx`, `error.tsx`.

---

## 2. Dead-end buttons/links

Controls that look actionable but go nowhere, 404, fail as a stub, or open an incomplete feature in the core loop.

| Control | File | What happens |
| --- | --- | --- |
| RSVP URL text (`<p class="mono">http…/rsvp/…</p>`) | `app/e/[id]/manage/page.tsx` | Looks like a link; **not an `<a>`**, no copy/open button. Click does nothing. Share = manual select-copy. |
| **Send email** / **Resend email** | `app/e/[id]/manage/page.tsx` | Always shown per invitee. If Gmail SMTP env is unset, submit errors instead of sharing. Incomplete share feature in the core loop. |
| **Email everyone who has not been sent an invite** | `app/e/[id]/manage/page.tsx` | Same: primary bulk-share control; fails when mail is not configured. Still shown with **zero** invitees (then notice “No unsent invites.”). |
| Header **Invite** | `app/layout.tsx` | Always `href="/"`. From **guest RSVP**, opens the create-event product. From **manage**, dumps the organizer off the secret URL onto a blank create form. |
| 404 body | `app/not-found.tsx` | Title + lede only. **No in-page action** (only the header). Broken guest links dead-end into “Not found”. |
| Brand link after losing `?t=` | `app/layout.tsx` + manage page | Manage without `t` is `notFound()`. There is no “restore my event” path in UI. Clicking **Invite** will not get the organizer back. |

Not dead-ends (wired): **Create event** / **Save changes** (`createEvent` / `updateEvent`), **Add** (`addInvitee`), **Save RSVP** (`saveRsvp`), **Change my RSVP** (`/rsvp/[token]`).

---

## 3. Wrong copy/state

Empty, loading, error, and success states that are missing, placeholder, or misleading.

| Where | File | Shows today | Should show (on this screen) |
| --- | --- | --- | --- |
| Returning guest (already RSVPed, no `?done=1`) | `app/rsvp/[token]/page.tsx` | Form: “Hi {name} — can you make it?” with prior radios filled. | Confirmation (same copy as `?done=1`) plus change-RSVP, or an explicit “you already responded” state. Success is **only** `done=1 && rsvp`. |
| RSVP submit when token/event vanished | `app/actions.ts` `saveRsvp` | `redirect("/")` — create-event home, **no flash**. | Stay on RSVP 404 (`notFound`) or RSVP page with an error. Silent home is the wrong surface. |
| RSVP submit in flight | `app/components/rsvp-form.tsx` | Button stays **Save RSVP**; not disabled. | Pending label (EventForm already uses **Saving…**). |
| Add / Send / Email everyone in flight | `app/e/[id]/manage/page.tsx` | Buttons stay enabled with original labels. | Pending/disabled so double-submit is not silent. |
| Any route transition / server render | no `app/loading.tsx` | Blank/previous page; no loading UI. | At least a simple pending state on the three HTML pages. |
| Uncaught server errors (DB, `requireOrganizer`) | no `app/error.tsx`; `app/actions.ts` throws `"Event not found"` | Next.js default error / digest. | Same-page flash or the existing 404, not a raw framework page. |
| Mail failure flash | `app/actions.ts` `sendOne` | “Email is not configured. Copy the RSVP link **below**, or set `GMAIL_USER` and `GMAIL_APP_PASSWORD`.” | User-facing “email isn’t set up — copy the RSVP link **in this row/table**.” Env var names do not belong in the flash. “Below” is wrong for **Send email** (link is **above** the button). |
| Manage hint | `app/e/[id]/manage/page.tsx` | “Emails need Gmail SMTP env vars.” | Operator hint is infra copy in the share step. |
| Home lede | `app/page.tsx` | “Create an event, **email a personalized card**, and collect yes/no RSVPs…” | Overstates email as the default path even when SMTP is off (README says copy links instead). |
| 404 lede | `app/not-found.tsx` | “That event or RSVP link does not exist.” | Also used for manage URLs missing `t` and for any unknown path — copy does not match those cases. |
| Empty invitee table | `app/e/[id]/manage/page.tsx` | One cell `colSpan={8}`: “No invitees yet.” | `colSpan` should match visible columns (4–8). Message is fine; layout is wrong. |
| Blank comments in table | `app/e/[id]/manage/page.tsx` | Empty `<td>` for no comment. | Counts use “—”; comments should match that empty pattern. |
| Infant labels | event form, RSVP form, manage totals, table header | “Kids under 12 months” vs “Under 12 months” vs **Infants**. | One label on all surfaces of this page set. |
| Edit **Preview:** | `app/components/event-form.tsx` | `formatWhen(event.starts_at)` from the **saved** row, not the date/time fields being edited. | Live preview of the values in the form, or drop the line so it is not a stale “preview”. |
| Flash | `app/components/flash.tsx` | If both `error` and `notice` are in the URL, **only error**. | Unlikely from current redirects, but the component cannot show both. |
| Yes + all counts 0 | `app/components/rsvp-form.tsx` + `saveRsvp` | **Yes** with Adults/Kids/Infants 0 is saved; dashboard totals stay 0. | Either block submit or show that a Yes added nobody — today’s success state is misleading for hosts. |
| Invite card `<img>` | `app/rsvp/[token]/page.tsx` | No `onError` / fallback. API 500/404 → broken image. | Keep alt; show the text event block as the fallback (already on the page). |
| 404 API body | `app/api/invite-card/[token]/route.tsx` | Plain text `Not found`. | OK for an image URL; RSVP page still renders a broken image. |
| `.btn:disabled` | `app/globals.css` | **Saving…** is disabled but still wine-colored with hover. | Disabled should not look fully clickable. |
| Guest + organizer chrome | `app/layout.tsx` | Ephemeral banner: “Set `TURSO_DATABASE_URL` (and `TURSO_AUTH_TOKEN`) for production…” | Infra copy on the guest RSVP screen. |

**States that are OK on current pages:** create validation (client + `/?error=` draft restore); manage notices (“Invitee added.”, “Event updated.”, “Invite sent.”, “No unsent invites.”); duplicate email (“That email is already on this event.”); RSVP “Please choose yes or no.”; empty invitees copy; pending/yes/no via `attendingLabel`.

---

## 4. Core-flow leak

Unfinished or infra features sitting on the main loop (create → share → RSVP → dashboard).

1. **Share is email-first, link-second.** Manage always shows **Send email** / **Resend email** / **Email everyone…** plus “Gmail SMTP env vars”. The working share method (unique URL) is inert text with no Copy/Open. Email is an incomplete optional integration, not a finished step.
2. **Home promises email.** `/` lede: “email a personalized card” — same leak at the start of the loop.
3. **Guest RSVP is wrapped in organizer chrome.** Header **Invite** → create event. Ephemeral Turso banner can appear on the guest card. Guests can leave RSVP and start a new host flow.
4. **Organizer secret URL is easy to abandon.** Logo → `/` with no event list. Bookmark warning exists (`app/e/[id]/manage/page.tsx`) but the only global nav fights it.
5. **Confirmation is a query flag, not RSVP state.** The guest “success” view is `?done=1`, so the canonical share link (`/rsvp/[token]`) never shows “Your RSVP is saved” on return.
6. **Env names in the loop:** `GMAIL_*` in errors, `TURSO_*` in the layout banner, “SMTP env vars” on manage. Preview/ops concerns rendered as product UI.

---

## 5. Out of scope notes

Looks broken or sharp; belongs to Spec / API / Data, not UI copy on existing screens.

| Issue | Why not UI-bot |
| --- | --- |
| Data lives in `/tmp` on Vercel without Turso; banner is factually true | Data / env. |
| Gmail SMTP required to actually send | API / env. UI issue is **surfacing** send as if it were ready. |
| Organizer auth is `?t=` in the URL; no login | Spec. |
| No event list, no delete invitee, no public event page | Spec (absent, not a stub control). |
| `starts_at` stored as `YYYY-MM-DDTHH:MM` (no timezone); `formatWhen` uses `new Date(...)` | Data / format — server vs client clocks can disagree. |
| Duplicate invitee email unique index | Data; UI already maps the catch to a flash. |
| `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` wrong → RSVP URLs point at the wrong host | Config. |
| Invite PNG generation (`ImageResponse`) failing | API. |
| `requireOrganizer` throw vs `notFound()` | API error mapping; UI gap is missing `error.tsx`. |
| Email HTML injection is escaped; CID image | API / mail. |

---

## Audit notes

- Routes searched: `app/page.tsx`, `app/e/[id]/manage/page.tsx`, `app/rsvp/[token]/page.tsx`, `app/not-found.tsx`, `app/api/invite-card/[token]/route.tsx`. No `middleware.ts`, `error.tsx`, or `loading.tsx`.
- Click handlers searched: `href`, `button`, `action=`, `redirect(`, `notFound(`. No `onClick` handlers, no dialog/modal components.
- Worst product-loop failures: **non-clickable share URLs**, **email buttons that error with env copy**, **guest chrome leaking create + Turso**, **RSVP success only on `?done=1`**, **silent redirect to `/` on bad RSVP submit**.
