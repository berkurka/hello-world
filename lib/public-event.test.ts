import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PUBLIC_EVENT_COLUMNS,
  PUBLIC_EVENT_OPTIONAL_COLUMNS,
  toEditableEvent,
  toPublicEvent,
  toPublicInvitee,
  toPublicRsvp,
  type PublicEvent,
  type PublicEventInput,
  type PublicInvitee,
} from "./public-event";

function fullEvent(): PublicEventInput {
  return {
    id: "e1",
    title: "Garden Party",
    starts_at: "2026-12-01T18:00:00.000Z",
    ends_at: "2026-12-01T21:00:00.000Z",
    timezone: "America/New_York",
    location: "Riverside Park",
    host_name: "Alex Host",
    ask_comment: 1,
    ask_adults: 1,
    ask_kids: 0,
    ask_infants: 0,
    allow_maybe: 1,
    party_image_mime: "image/png",
    theme: "garden",
    notes: "Bring a sweater",
    updated_at: "2026-10-02T00:00:00.000Z",
    created_at: "2026-10-01T00:00:00.000Z",
  };
}

const dir = mkdtempSync(join(tmpdir(), "partyz-rsvp-"));
process.env.TURSO_DATABASE_URL = `file:${join(dir, "invite.db")}`;
delete process.env.TURSO_AUTH_TOKEN;

const ADMIN = "admin-token-leaks-7f3c9a";
const CLAIM = "claim-token-leaks-7f3c9a";
const HOST_EMAIL = "host-leak-7f3c9a@example.com";
const GUEST_EMAIL = "guest-leak-7f3c9a@example.com";
const SPOUSE_EMAIL = "spouse-leak-7f3c9a@example.com";
const GUEST_TOKEN = "guest-rsvp-link-7f3c9a";
const MAYBE_EMAIL = "maybe-leak-7f3c9a@example.com";
const MAYBE_SPOUSE = "maybe-spouse-7f3c9a@example.com";
const MAYBE_TOKEN = "maybe-rsvp-link-7f3c9a";
const MAYBE_CLAIM = "maybe-claim-token-7f3c9a";
const FAMILY_HEADING = "Your family already RSVP'd: Yes";
const MAYBE_HEADING = "Your family already RSVP'd: Maybe";

test.after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("toPublicEvent copies guest fields and drops secret columns", () => {
  assert.doesNotMatch(PUBLIC_EVENT_COLUMNS, /admin_token|host_claim_token|host_email/);
  assert.doesNotMatch(PUBLIC_EVENT_OPTIONAL_COLUMNS.join(","), /admin_token|host_claim_token|host_email/);

  const secretRow = Object.assign(fullEvent(), {
    admin_token: ADMIN,
    host_email: HOST_EMAIL,
    host_claim_token: CLAIM,
    host_claimed_at: "2026-10-01T00:00:00.000Z",
    host_email_verified_at: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(secretRow.admin_token, ADMIN);
  assert.equal(secretRow.host_email, HOST_EMAIL);
  assert.equal(secretRow.host_claim_token, CLAIM);
  const pub = toPublicEvent(secretRow);
  const encoded = JSON.stringify(pub);
  assert.equal(pub.title, "Garden Party");
  assert.equal(pub.photo_url, "/api/party-image/e1");
  assert.equal(pub.allow_maybe, 1);
  assert.equal(pub.updated_at, "2026-10-02T00:00:00.000Z");
  assert.equal("admin_token" in pub, false);
  assert.equal("host_email" in pub, false);
  assert.equal("host_claim_token" in pub, false);
  assert.equal("host_email_verified_at" in pub, false);
  assert.doesNotMatch(encoded, new RegExp([ADMIN, CLAIM, HOST_EMAIL].join("|")));

  const editable = toEditableEvent(secretRow);
  assert.equal(editable.host_email, HOST_EMAIL);
  assert.equal(editable.title, "Garden Party");
  assert.equal("admin_token" in editable, false);
  assert.equal("host_claim_token" in editable, false);
  assert.equal("host_email_verified_at" in editable, false);
  assert.doesNotMatch(JSON.stringify(editable), new RegExp([ADMIN, CLAIM].join("|")));

  const again = toPublicEvent(pub);
  assert.equal(again.photo_url, pub.photo_url);
  assert.equal(again.allow_maybe, 1);

  const guest = toPublicInvitee(
    Object.assign(
      { display_name: "The Lees", email2: SPOUSE_EMAIL },
      { email: GUEST_EMAIL, token: GUEST_TOKEN },
    ),
  );
  assert.deepEqual(guest, { display_name: "The Lees", family: true });
  assert.doesNotMatch(JSON.stringify(guest), new RegExp(`${GUEST_EMAIL}|${SPOUSE_EMAIL}|${GUEST_TOKEN}`));
  const answer = toPublicRsvp({
    id: "r1",
    invitee_id: "i1",
    attending: 1,
    comment: "See you",
    adults: 2,
    kids: 1,
    infants: 0,
    updated_at: "2026-10-02T00:00:00.000Z",
  });
  assert.equal("invitee_id" in answer, false);
  assert.doesNotMatch(JSON.stringify(answer), /i1/);
  assert.deepEqual(toPublicInvitee({ display_name: "Sam", family: 1 }), {
    display_name: "Sam",
    family: true,
  });
});

test("guest RSVP page HTML does not include host secrets", async () => {
  const db = await import("./db");
  await db.readyDb();
  await db.run(
    `INSERT INTO events (
      id, admin_token, title, starts_at, ends_at, timezone, location, host_name,
      host_email, host_claim_token, ask_comment, ask_adults, ask_kids, ask_infants,
      theme, notes, party_image_mime, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "e1",
      ADMIN,
      "Garden Party",
      "2026-12-01T18:00:00.000Z",
      "2026-12-01T21:00:00.000Z",
      "America/New_York",
      "Riverside Park",
      "Alex Host",
      HOST_EMAIL,
      CLAIM,
      1,
      1,
      1,
      0,
      "garden",
      "Bring a sweater",
      null,
      "2026-10-01T00:00:00.000Z",
    ],
  );
  await db.run(
    `INSERT INTO invitees (id, event_id, email, email2, display_name, token, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["i1", "e1", GUEST_EMAIL, SPOUSE_EMAIL, "The Lees", GUEST_TOKEN, "2026-10-01T00:00:00.000Z"],
  );
  await db.run(
    `INSERT INTO rsvps (id, invitee_id, attending, comment, adults, kids, infants, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ["r1", "i1", 1, "See you", 2, 1, 0, "2026-10-02T00:00:00.000Z"],
  );

  const loadedEvent = await db.getPublicEvent("e1");
  const loadedInvitee = await db.getGuestInvitee(GUEST_TOKEN);
  assert.ok(loadedEvent);
  assert.ok(loadedInvitee);
  assert.equal("admin_token" in loadedEvent, false);
  assert.equal("host_email" in loadedEvent, false);
  assert.equal("host_claim_token" in loadedEvent, false);
  assert.equal("email" in loadedInvitee, false);
  assert.equal("email2" in loadedInvitee, false);
  assert.equal(loadedInvitee.family, 1);

  const [{ default: RsvpPage }, { GuestInvite }, { InviteCardView }, { PartyFacts }, { GuestFooter }] =
    await Promise.all([
      import("../app/(guest)/rsvp/[token]/page"),
      import("../app/components/guest-invite"),
      import("../app/components/invite-card-view"),
      import("../app/components/party-facts"),
      import("../app/components/guest-footer"),
    ]);
  const expand = new Set<unknown>([GuestInvite, InviteCardView, PartyFacts, GuestFooter]);

  const page = await RsvpPage({
    params: Promise.resolve({ token: GUEST_TOKEN }),
    searchParams: Promise.resolve({}),
  });
  const html = renderedGuestHtml(page, expand);
  assert.match(html, /Garden Party/);
  assert.match(html, /Alex Host/);
  assert.match(decodeHtml(html), new RegExp(FAMILY_HEADING));
  assertNoSecrets(html);
  assert.equal(html.includes("invitee_id"), false);
  assert.equal(html.includes("i1"), false);

  const poisonedEvent = Object.assign({}, loadedEvent, {
    admin_token: ADMIN,
    host_email: HOST_EMAIL,
    host_claim_token: CLAIM,
    host_claimed_at: "2026-10-01T00:00:00.000Z",
    host_email_verified_at: "2026-10-01T00:00:00.000Z",
  });
  const poisonedInvitee = Object.assign(
    { display_name: "The Lees", token: GUEST_TOKEN, email2: SPOUSE_EMAIL },
    { email: GUEST_EMAIL },
  );
  assert.equal(poisonedEvent.admin_token, ADMIN);
  assert.equal(poisonedInvitee.email, GUEST_EMAIL);
  assert.equal(poisonedInvitee.email2, SPOUSE_EMAIL);
  const poisoned = GuestInvite({
    event: poisonedEvent as PublicEvent,
    guestName: "The Lees",
    invitee: poisonedInvitee as unknown as PublicInvitee,
    token: GUEST_TOKEN,
    rsvp: {
      id: "r1",
      invitee_id: "i1",
      attending: 1,
      comment: "See you",
      adults: 2,
      kids: 1,
      infants: 0,
      updated_at: "2026-10-02T00:00:00.000Z",
    },
  });
  const poisonedHtml = renderedGuestHtml(poisoned, expand);
  assert.match(decodeHtml(poisonedHtml), new RegExp(FAMILY_HEADING));
  assertNoSecrets(poisonedHtml);
  assert.equal(poisonedHtml.includes("invitee_id"), false);
  assert.equal(poisonedHtml.includes("i1"), false);
});

test("a Maybe party stays on the public guest fields", async () => {
  const db = await import("./db");
  await db.readyDb();
  await db.run(
    `INSERT INTO events (
      id, admin_token, title, starts_at, ends_at, timezone, location, host_name,
      host_email, host_claim_token, ask_comment, ask_adults, ask_kids, ask_infants,
      allow_maybe, theme, notes, party_image_mime, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "e-maybe",
      ADMIN,
      "Maybe Picnic",
      "2026-12-02T18:00:00.000Z",
      null,
      "America/New_York",
      "The Lawn",
      "Alex Host",
      HOST_EMAIL,
      MAYBE_CLAIM,
      1,
      1,
      0,
      0,
      1,
      "classic",
      "",
      null,
      "2026-10-01T00:00:00.000Z",
      "2026-10-03T00:00:00.000Z",
    ],
  );
  await db.run(
    `INSERT INTO invitees (id, event_id, email, email2, display_name, token, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["i-maybe", "e-maybe", MAYBE_EMAIL, MAYBE_SPOUSE, "The Parks", MAYBE_TOKEN, "2026-10-01T00:00:00.000Z"],
  );
  await db.run(
    `INSERT INTO rsvps (id, invitee_id, attending, comment, adults, kids, infants, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ["r-maybe", "i-maybe", 2, "We might", 2, 0, 0, "2026-10-03T00:00:00.000Z"],
  );

  const loadedEvent = await db.getPublicEvent("e-maybe");
  const loadedInvitee = await db.getGuestInvitee(MAYBE_TOKEN);
  assert.ok(loadedEvent);
  assert.ok(loadedInvitee);
  assert.equal(loadedEvent.allow_maybe, 1);
  assert.equal(loadedEvent.updated_at, "2026-10-03T00:00:00.000Z");
  assert.equal("admin_token" in loadedEvent, false);
  assert.equal("host_email" in loadedEvent, false);
  assert.equal("host_claim_token" in loadedEvent, false);
  assert.equal("email" in loadedInvitee, false);
  assert.equal("email2" in loadedInvitee, false);
  assert.equal(loadedInvitee.family, 1);

  const [{ default: RsvpPage }, { GuestInvite }, { InviteCardView }, { PartyFacts }, { GuestFooter }] =
    await Promise.all([
      import("../app/(guest)/rsvp/[token]/page"),
      import("../app/components/guest-invite"),
      import("../app/components/invite-card-view"),
      import("../app/components/party-facts"),
      import("../app/components/guest-footer"),
    ]);
  const expand = new Set<unknown>([GuestInvite, InviteCardView, PartyFacts, GuestFooter]);
  const page = await RsvpPage({
    params: Promise.resolve({ token: MAYBE_TOKEN }),
    searchParams: Promise.resolve({}),
  });
  const html = renderedGuestHtml(page, expand);
  assert.match(html, /Maybe Picnic/);
  assert.match(decodeHtml(html), new RegExp(MAYBE_HEADING));
  assert.match(html, /2 adults/);
  assertNoSecrets(html);
  assert.equal(html.includes(MAYBE_EMAIL), false);
  assert.equal(html.includes(MAYBE_SPOUSE), false);
  assert.equal(html.includes("invitee_id"), false);
  assert.equal(html.includes("i-maybe"), false);

  const poisoned = GuestInvite({
    event: Object.assign({}, loadedEvent, {
      admin_token: ADMIN,
      host_email: HOST_EMAIL,
      host_claim_token: CLAIM,
    }) as PublicEvent,
    guestName: "The Parks",
    invitee: Object.assign(
      { display_name: "The Parks", token: MAYBE_TOKEN, email2: MAYBE_SPOUSE },
      { email: MAYBE_EMAIL },
    ) as unknown as PublicInvitee,
    token: MAYBE_TOKEN,
    rsvp: {
      id: "r-maybe",
      invitee_id: "i-maybe",
      attending: 2,
      comment: "We might",
      adults: 2,
      kids: 0,
      infants: 0,
      updated_at: "2026-10-03T00:00:00.000Z",
    },
    allowMaybe: true,
  });
  const poisonedHtml = renderedGuestHtml(poisoned, expand);
  assert.match(decodeHtml(poisonedHtml), new RegExp(MAYBE_HEADING));
  assertNoSecrets(poisonedHtml);
  assert.equal(poisonedHtml.includes(MAYBE_EMAIL), false);
  assert.equal(poisonedHtml.includes(MAYBE_SPOUSE), false);
});

function decodeHtml(html: string) {
  return html.replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

function assertNoSecrets(html: string) {
  for (const secret of [ADMIN, CLAIM, MAYBE_CLAIM, HOST_EMAIL, GUEST_EMAIL, SPOUSE_EMAIL, MAYBE_EMAIL, MAYBE_SPOUSE]) {
    assert.equal(html.includes(secret), false, `guest page exposed ${secret}`);
  }
}

function renderedGuestHtml(node: ReactNode, expand: Set<unknown>) {
  const chunks = [renderToStaticMarkup(node as ReactElement)];
  visit(node, chunks, expand);
  return chunks.join("\n");
}

function visit(node: ReactNode, chunks: string[], expand: Set<unknown>) {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    chunks.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) visit(child, chunks, expand);
    return;
  }
  if (!isValidElement(node)) return;
  const element = node as ReactElement<{ children?: ReactNode } & Record<string, unknown>>;
  if (typeof element.type === "string") {
    visit(element.props.children, chunks, expand);
    return;
  }
  if (typeof element.type === "function" && expand.has(element.type)) {
    visit((element.type as (props: unknown) => ReactNode)(element.props), chunks, expand);
    return;
  }
  const props = { ...element.props };
  delete props.children;
  chunks.push(
    JSON.stringify(props, (_key, value) => {
      if (typeof value === "function") return undefined;
      if (isValidElement(value)) return "[element]";
      return value;
    }),
  );
  visit(element.props.children, chunks, expand);
}
