import { isEmail } from "./format";

export const INVITEE_CSV_FILENAME = "partyz-invitees-template.csv";
export const INVITEE_CSV_HEADERS = ["name", "email", "email2"] as const;
export const INVITEE_CSV_MAX_BYTES = 256 * 1024;
export const INVITEE_CSV_MAX_ROWS = 500;

const PLACEHOLDER_ROWS = [
  ["The Example Family", "alex@example.com", "jordan@example.com"],
  ["Sam Guest", "sam@example.com", ""],
] as const;

export type InviteeCsvSkip = {
  line: number;
  reason: string;
};

export type InviteeCsvDraft = {
  line: number;
  displayName: string;
  email: string;
  email2: string | null;
};

export type InviteeImportPlan = {
  toAdd: InviteeCsvDraft[];
  skips: InviteeCsvSkip[];
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isNameHeader(value: string) {
  const key = normalizeHeader(value);
  return (
    key === "display_name" ||
    key === "displayname" ||
    key === "name" ||
    key === "guest" ||
    key === "guest_name"
  );
}

function isEmailHeader(value: string) {
  const key = normalizeHeader(value);
  return key === "email" || key === "e_mail" || key === "email_address";
}

function isEmail2Header(value: string) {
  const key = normalizeHeader(value);
  return (
    key === "email2" ||
    key === "email_2" ||
    key === "second_email" ||
    key === "secondary_email"
  );
}

export function emailsInUse(values: Iterable<string | null | undefined>) {
  const taken = new Set<string>();
  for (const value of values) {
    const email = (value ?? "").trim().toLowerCase();
    if (email) taken.add(email);
  }
  return taken;
}

function detectDelimiter(line: string) {
  let comma = 0;
  let semi = 0;
  let tab = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (c === ",") comma += 1;
    else if (c === ";") semi += 1;
    else if (c === "\t") tab += 1;
  }
  if (tab > comma && tab > semi) return "\t";
  if (semi > comma) return ";";
  return ",";
}

function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === delimiter) {
      pushField();
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      pushRow();
      continue;
    }
    field += c;
  }
  if (inQuotes || field !== "" || row.length > 0) pushRow();
  return rows;
}

function headerIndexes(cells: string[]) {
  let nameIndex = -1;
  let emailIndex = -1;
  let email2Index = -1;
  cells.forEach((cell, index) => {
    if (nameIndex === -1 && isNameHeader(cell)) nameIndex = index;
    if (email2Index === -1 && isEmail2Header(cell)) email2Index = index;
    if (emailIndex === -1 && !isEmail2Header(cell) && isEmailHeader(cell)) emailIndex = index;
  });
  if (nameIndex !== -1 && emailIndex !== -1) return { nameIndex, emailIndex, email2Index };
  return null;
}

export function inviteeCsvTemplate() {
  const lines = [
    INVITEE_CSV_HEADERS.join(","),
    ...PLACEHOLDER_ROWS.map((row) => row.join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function parseInviteeCsv(text: string): InviteeImportPlan {
  const table = parseCsv(text);
  if (table.length === 0) return { toAdd: [], skips: [] };

  const header = headerIndexes(table[0]);
  const start = header ? 1 : 0;
  const nameIndex = header?.nameIndex ?? 0;
  const emailIndex = header?.emailIndex ?? 1;
  const email2Index = header ? header.email2Index : 2;
  const toAdd: InviteeCsvDraft[] = [];
  const skips: InviteeCsvSkip[] = [];
  const seen = new Set<string>();

  if (!header && (table[0].length < 2 || isEmailHeader(table[0][0] ?? ""))) {
    return {
      toAdd: [],
      skips: [{ line: 1, reason: "CSV needs name and email columns" }],
    };
  }

  for (let i = start; i < table.length; i++) {
    const line = i + 1;
    if (toAdd.length + skips.length >= INVITEE_CSV_MAX_ROWS) {
      skips.push({
        line,
        reason: `row limit is ${INVITEE_CSV_MAX_ROWS}; remaining rows were skipped`,
      });
      break;
    }
    const cells = table[i];
    const displayName = (cells[nameIndex] ?? "").trim();
    const email = (cells[emailIndex] ?? "").trim().toLowerCase();
    const email2Raw = email2Index >= 0 ? (cells[email2Index] ?? "").trim().toLowerCase() : "";
    const email2 = email2Raw || null;
    if (!displayName && !email && !email2) continue;
    if (!displayName) {
      skips.push({ line, reason: "missing display name" });
      continue;
    }
    if (!isEmail(email)) {
      skips.push({ line, reason: "invalid email" });
      continue;
    }
    if (email2 && !isEmail(email2)) {
      skips.push({ line, reason: "invalid second email" });
      continue;
    }
    if (email2 && email2 === email) {
      skips.push({ line, reason: "same email in both fields" });
      continue;
    }
    if (seen.has(email) || (email2 && seen.has(email2))) {
      skips.push({ line, reason: "duplicate email in this file" });
      continue;
    }
    seen.add(email);
    if (email2) seen.add(email2);
    toAdd.push({ line, displayName, email, email2 });
  }

  return { toAdd, skips };
}

export function applyExistingEmails(
  plan: InviteeImportPlan,
  existingEmails: Iterable<string | null | undefined>,
): InviteeImportPlan {
  const existing = emailsInUse(existingEmails);
  const toAdd: InviteeCsvDraft[] = [];
  const skips = [...plan.skips];
  for (const row of plan.toAdd) {
    if (existing.has(row.email) || (row.email2 && existing.has(row.email2))) {
      skips.push({ line: row.line, reason: "already on this event" });
      continue;
    }
    existing.add(row.email);
    if (row.email2) existing.add(row.email2);
    toAdd.push(row);
  }
  skips.sort((a, b) => a.line - b.line);
  return { toAdd, skips };
}

export function summarizeInviteeImport(added: number, skips: InviteeCsvSkip[]) {
  const addedText =
    added === 0 ? "No invitees added" : added === 1 ? "Added 1 invitee" : `Added ${added} invitees`;
  if (skips.length === 0) {
    return added === 0 ? "No invitee rows found in that CSV." : `${addedText}.`;
  }
  const preview = skips.slice(0, 8).map((skip) => `row ${skip.line} ${skip.reason}`);
  const extra = skips.length > preview.length ? `; and ${skips.length - preview.length} more` : "";
  return `${addedText}. Skipped ${skips.length}: ${preview.join("; ")}${extra}.`;
}
