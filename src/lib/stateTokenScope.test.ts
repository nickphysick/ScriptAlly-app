/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHERE THE STATE PALETTE IS DECLARED — the root cause, locked at its cause.
 *
 * ⚠️ THE BOARD'S ACCENTS FAILED BECAUSE OF A SCOPE, NOT A VALUE. `STATE_ACCENT_TOKEN` is exported
 * from `lib/` as the one `{state} → token` mapping "every surface reads", and the tokens behind it
 * were declared on `.t-f12` — the Query Centre's theme class. The Contact list is not under it, so
 * every `var(--state-*-deep)` there resolved to nothing, the declaration was dropped, and nine
 * column rules fell back to `currentColor`: one ink hairline, through a clean build and a green
 * source lock that asserted the token's NAME.
 *
 * The measurement in `tests/e2e/contactBoard.measure.ts` catches the SYMPTOM on the board. This
 * catches the CAUSE, so the next surface to read them does not have to rediscover it: a map `lib/`
 * offers app-wide must be backed by declarations an app-wide reader can reach.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { STATE_ACCENT_TOKEN, STATE_TOKEN } from "./queryCardFacts";

const css = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");

/** The selector block a custom property is declared inside. */
const declaringSelector = (token: string): string | null => {
  const at = css.indexOf(`${token}:`);
  if (at < 0) return null;
  const open = css.lastIndexOf("{", at);
  const before = css.slice(0, open);
  return before.slice(before.lastIndexOf("\n") + 1).trim() || null;
};

describe("the state palette is reachable from any page", () => {
  const tokens = [...Object.values(STATE_TOKEN), ...Object.values(STATE_ACCENT_TOKEN)]
    .map((v) => v.replace(/^var\(|\)$/g, ""));

  it("names ten tokens — the five fills and their five deeper steps", () => {
    expect(new Set(tokens).size, "the map lost a state, so this sweep covers fewer than it reads").toBe(10);
  });

  it("every one is declared, exactly once", () => {
    for (const t of tokens) {
      expect((css.match(new RegExp(`${t}\\s*:`, "g")) ?? []).length, `${t} is not declared exactly once`).toBe(1);
    }
  });

  /* ⚠️ AT `:root`, NEVER ON A THEME CLASS. A theme class is only sometimes an ancestor, and the
     failure when it is not is silent: the declaration is dropped and the property falls back. */
  it("is declared at :root, not on a theme class", () => {
    for (const t of tokens) {
      const sel = declaringSelector(t);
      expect(sel, `${t} has no declaring selector`).not.toBeNull();
      expect(sel, `${t} is declared on "${sel}" — a page not wearing that class reads nothing`).toBe(":root");
      expect(sel, `${t} is scoped to a theme class`).not.toMatch(/\.t-/);
    }
  });
});
