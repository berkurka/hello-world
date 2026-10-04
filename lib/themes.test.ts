import assert from "node:assert/strict";
import test from "node:test";
import { THEME_IDS, THEMES, themeById } from "./themes";

test("six invite themes, classic by default", () => {
  assert.deepEqual(THEME_IDS, ["classic", "confetti", "garden", "midnight", "playful", "minimal"]);
  assert.equal(themeById(null).id, "classic");
  assert.equal(themeById("nope").id, "classic");
  assert.equal(themeById("midnight").dark, true);
  assert.equal(themeById("confetti").display, "fredoka");
  for (const id of THEME_IDS) {
    assert.equal(THEMES[id].id, id);
    assert.ok(THEMES[id].accent);
    assert.ok(THEMES[id].paper);
  }
});
