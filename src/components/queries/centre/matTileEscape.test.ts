/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.3 · Phase 3 (D4) — ESCAPE CLOSES THE MATERIALS POP-UP AND IT STAYS CLOSED, however it was opened.
 * The tile's handlers all go through `tileNext` (QcMatTile); this replays what the browser sends for each way of opening:
 *   hover  → pointerenter … Escape → (the tile takes focus back) focus  — was: the focus re-opened it (measured on the
 *            base, reports/log-a-query-v2-3/before readings.json `escape`: hover → Escape → open again on the Queries
 *            page, Responses and Log a query's preview)
 *   focus  → focus … Escape (focus is already on the tile)
 *   click  → pointerenter, focus, click … Escape → focus
 * Red before: the base had no `tileNext` and its focus handler opened unconditionally (`onFocus={show}`).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TILE_CLOSED, tileNext, type TileEvent, type TileState } from "./QcMatTile";

const play = (events: TileEvent[], from: TileState = TILE_CLOSED) => events.reduce(tileNext, from);

describe("LAQ23-3 Escape and the materials pop-up (D4)", () => {
  it("hover → Escape: closed, and the tile taking focus back does not reopen it", () => {
    const opened = play(["enter"]);
    expect(opened.open).toBe(true);
    const s = play(["escape", "focus"], opened);
    expect(s.open).toBe(false);
  });
  it("…and it stays closed while the pointer stays (a second focus, a re-render), until the pointer leaves and comes back", () => {
    let s = play(["enter", "escape", "focus", "focus"]);
    expect(s.open).toBe(false);
    s = play(["leave"], s);
    expect(s.open).toBe(false);
    s = play(["enter"], s);
    expect(s.open).toBe(true);
  });
  it("focus → Escape: closed; the tile keeps focus (the escape handler focuses it, which is no new focus event)", () => {
    const s = play(["focus", "escape"]);
    expect(s).toEqual({ open: false, muted: true });
    const src = readFileSync(new URL("./QcMatTile.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/useEscapeLayer\(open, \(\) => \{ go\("escape"\); btn\.current\?\.focus\(\); \}, escLevel\);/);
  });
  it("focus → Escape → focus leaves and returns: open again", () => {
    expect(play(["focus", "escape", "blur", "focus"]).open).toBe(true);
  });
  it("click-open → Escape: closed and stays closed; a click or Enter opens it again", () => {
    const s = play(["enter", "focus", "click", "escape", "focus"]);
    expect(s.open).toBe(false);
    expect(play(["click"], s).open).toBe(true);
    expect(play(["press"], s).open).toBe(true);
  });
  it("Enter / Space still toggles, as built", () => {
    const s = play(["focus"]);
    expect(play(["press"], s).open).toBe(false);
    expect(play(["press", "press"], s).open).toBe(true);
  });
  it("every handler goes through tileNext (no direct open), so no route around the mute is left", () => {
    const src = readFileSync(new URL("./QcMatTile.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/setOpen\(/);
    for (const h of ['onPointerEnter={() => go("enter")}', 'onPointerLeave={() => go("leave")}', 'onFocus={() => go("focus")}', 'onBlur={() => go("blur")}', 'go("click")', 'go("press")'])
      expect(src).toContain(h);
  });
});
