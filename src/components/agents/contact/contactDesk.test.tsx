/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's badge desk (header panel v2, Part D): what it renders, from the model alone.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { ContactDesk, DESK_ART_LABEL, DESK_BADGE_TITLE } from "./ContactDesk";
import { CONTACT_DESK_ART_PROFILES, CONTACT_DESK_ART_QUERIED, CONTACT_DESK_ART_WEEK } from "./ContactOpenHeader";
import type { DeskModel } from "../../../lib/contactDesk";

const model = (p: Partial<DeskModel["profiles"]> = {}): DeskModel => ({
  week: { figure: "3", rest: "added this week", label: "3 agents added this week, 12 in the last 8 weeks", mom: { dir: "up", n: 1, text: "1 more than last week" }, bars: [0, 1, 2, 0, 3, 1, 2, 3], total: 12, month: 5 },
  queried: { figure: "27", rest: "queried", label: "27 agents queried", mom: { dir: "up", n: 2, text: "2 since last month" }, queried: 27, active: 19, closed: 8, total: 41 },
  profiles: { figure: "68%", rest: "of profiles complete", label: "68% of profiles complete", mom: null, pct: 68, filled: 28, total: 41, ...p },
} as DeskModel);
const html = (m = model()) => renderToStaticMarkup(<ContactDesk model={m} onQueried={() => {}} onProfiles={() => {}} />);
const card = (h: string, key: string) => { const i = h.indexOf(`data-dk="${key}"`); expect(i).toBeGreaterThan(-1); const j = h.indexOf("</section>", i); return h.slice(i, j); };

describe("the Contact list's badge desk", () => {
  it("three badge cards, in order, and none is the shared icon card", () => {
    const h = html();
    expect([...h.matchAll(/data-dk="(week|queried|profiles)"/g)].map((m) => m[1])).toEqual(["week", "queried", "profiles"]);
    expect(h).not.toMatch(/class="dsk-card|dsk-disc|dsk-row-grid/);
    expect((h.match(/data-cdb="badge"/g) ?? []).length).toBe(3);
  });
  it("each card states its badge figure, its title and its two tiles from the model", () => {
    const h = html();
    const tiles = (k: string) => [...card(h, k).matchAll(/data-cdb="tile">(\d+)<\/b><span[^>]*>([^<]+)</g)].map((m) => `${m[1]} ${m[2]}`);
    expect(card(h, "week")).toContain(`data-dk-part="figure">3<`);
    expect(tiles("week")).toEqual(["12 in the last 8 weeks", "5 this month"]);
    expect(card(h, "queried")).toContain(`data-dk-part="figure">27<`);
    expect(tiles("queried")).toEqual(["19 active", "8 closed"]);
    expect(card(h, "profiles")).toContain(`data-dk-part="figure">68%<`);
    expect(tiles("profiles")).toEqual(["28 complete", "13 with gaps to fill"]);
    for (const k of ["week", "queried", "profiles"] as const) expect(card(h, k)).toContain(`>${DESK_BADGE_TITLE[k]}<`);
  });
  it("the gaps tile is hot only while there are gaps", () => {
    expect(card(html(), "profiles")).toMatch(/cdb-tile is-hot" data-cdb="tile">13</);
    expect(card(html(model({ filled: 41, pct: 100, figure: "100%" })), "profiles")).not.toContain("is-hot");
  });
  it("the badge is the card's own child, ahead of the strip (the inner border cannot paint across it)", () => {
    const c = card(html(), "week");
    expect(c.indexOf(`data-cdb="badge"`)).toBeGreaterThan(-1);
    expect(c.indexOf(`data-cdb="badge"`)).toBeLessThan(c.indexOf(`data-cdb="strip"`));
    const strip = c.slice(c.indexOf(`data-cdb="strip"`), c.indexOf(`data-cdb="body"`));
    expect(strip).not.toContain("cdb-badge");
  });
  it("the line keeps its element when there is no comparison to state", () => {
    const c = card(html(), "profiles");
    expect(c).toMatch(/class="cdb-mom is-empty" data-dk-part="mom"/);
    expect(card(html(), "week")).toContain("1 more than last week");
  });
  it("press: Queried and Profiles carry a button with the icon cards' labels; the week card carries none", () => {
    const h = html();
    expect(card(h, "week")).not.toContain("<button");
    expect(card(h, "queried")).toContain(`aria-label="27 agents queried. Show them in the list"`);
    expect(card(h, "profiles")).toContain(`aria-label="68% of profiles complete. Open Housekeeping"`);
    expect(h).not.toMatch(/is-on|aria-pressed/);
  });
  it("the three art slots are registered and empty, and an empty slot is a hidden placeholder that says so", () => {
    expect([CONTACT_DESK_ART_WEEK, CONTACT_DESK_ART_QUERIED, CONTACT_DESK_ART_PROFILES]).toEqual([null, null, null]);
    const h = html();
    expect((h.match(/data-cdb="art" aria-hidden="true"/g) ?? []).length).toBe(3);
    expect((h.match(new RegExp(DESK_ART_LABEL, "g")) ?? []).length).toBe(3);
    expect(h).not.toContain("<img");
  });
  it("the shared DeskCard and its sheet are not edited by this desk: it imports the charts only", () => {
    const src = readFileSync("src/components/agents/contact/ContactDesk.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toMatch(/import \{ BarChart, RingChart, WeekBars \} from "..\/..\/shell\/desk\/DeskCard"/);
    expect(src).not.toMatch(/<DeskCard[\s>]|["\/]desk\.css/);
  });
});
