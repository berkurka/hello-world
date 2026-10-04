import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FIND_PARTIES_PATH, MY_PARTIES_PATH } from "./paths";
import { appRouteExists } from "./app-route";

test("my parties and find my parties are linked once those pages exist", () => {
  assert.equal(appRouteExists(MY_PARTIES_PATH), true);
  assert.equal(appRouteExists(FIND_PARTIES_PATH), true);
  assert.equal(appRouteExists("/host/claim"), true);
});

test("a route group page counts as the public URL", () => {
  const appDir = mkdtempSync(join(tmpdir(), "partyz-app-"));
  mkdirSync(join(appDir, "(host)", "host", "recover"), { recursive: true });
  writeFileSync(join(appDir, "(host)", "host", "recover", "page.tsx"), "export default function Page() { return null }\n");
  assert.equal(appRouteExists("/host/recover", appDir), true);
  assert.equal(appRouteExists("/host", appDir), false);
});
