/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dock peek (Contact list v13 §7): one flag, offered from 1100px of window, and the agent card's
 * root keeps a CONSTANT className — its `is-docked` is added imperatively, so a className React
 * rewrote between renders would take it with it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PEEK_MIN_WIDTH, isDockPeeking, peekOffered, setDockPeek, subscribeDockPeek } from "./dockPeek";
import { ESC_LEVEL } from "../escapeStack";

describe("the flag", () => {
  it("is offered from 1100px of window, not below", () => {
    expect(PEEK_MIN_WIDTH).toBe(1100);
    expect(peekOffered(1100)).toBe(true);
    expect(peekOffered(1099)).toBe(false);
  });
  it("notifies once per real change and never for a repeat", () => {
    let n = 0;
    const off = subscribeDockPeek(() => { n += 1; });
    setDockPeek(true); setDockPeek(true); setDockPeek(false);
    off();
    setDockPeek(true);
    expect(n).toBe(2);
    expect(isDockPeeking()).toBe(true);
    setDockPeek(false);
  });
  it("folds before the drawer hears Escape, after a popup inside the drawer (ruling Q5)", () => {
    expect(ESC_LEVEL.dockPeek).toBe(35);
    expect(ESC_LEVEL.drawer).toBeLessThan(ESC_LEVEL.dockPeek);
    expect(ESC_LEVEL.dockPeek).toBeLessThan(ESC_LEVEL.drawerPopup);
  });
});

describe("the agent card's root", () => {
  const src = readFileSync(resolve(__dirname, "../../components/agents/card/AgentCardFrame.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("keeps a constant className and carries the peek as an attribute", () => {
    expect(src).toMatch(/<div className="ac-ov" ref=\{rootRef\}/);
    expect(src).toMatch(/data-peek=\{peeking \|\| undefined\}/);
    expect(src).not.toMatch(/className=\{`ac-ov/);
  });
});
