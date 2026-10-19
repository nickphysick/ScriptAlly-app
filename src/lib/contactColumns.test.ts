/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §C, v19.1 §D — the columns' widths: Agent by its own rule (widest name / agency line / heading + 8,
 * 230–330) and never the slack; the rest each as wide as its entry or heading; the spare shared between the gaps up to
 * 56 each, the remainder to the right of the Email column; side by side when they fit, else stacked with the type
 * stepped down 0.5px at a time, never below 12px.
 */
import { describe, expect, it } from "vitest";
import {
  CONTACT_AGENT_MAX, CONTACT_AGENT_MIN, CONTACT_FS_MIN, CONTACT_GAP_MAX, CONTACT_ICON, agentColumn, fitContactColumns,
  type ContactColumnWidths,
} from "./contactColumns";

const base: ContactColumnWidths = {
  avail: 1190, gap: 20, agent: 220, agentHead: 60,
  date: 90, dateHead: 104, web: 180, webHead: 64, email: 228, emailHead: 50, bothHead: 150, replies: 100, status: 170,
};
const tracks = (cols: string) => cols.split(" ").map((s) => parseFloat(s));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("agentColumn (v19.1 §D)", () => {
  it("the widest of content and heading, + 8, between 230 and 330", () => {
    expect(agentColumn(260, 60)).toBe(268);
    expect(agentColumn(100, 60)).toBe(CONTACT_AGENT_MIN);
    expect(agentColumn(400, 60)).toBe(CONTACT_AGENT_MAX);
    expect(agentColumn(200, 240)).toBe(248);
  });
});

describe("fitContactColumns", () => {
  it("side by side at 15px: six fixed tracks, Agent first at its rule's width", () => {
    const f = fitContactColumns(base);
    expect(f).toMatchObject({ stacked: false, fs: 15, count: 6 });
    const t = tracks(f.cols);
    expect(t).toHaveLength(6);
    expect(t[0]).toBe(agentColumn(base.agent, base.agentHead));
    /* a column is never narrower than its entry or its heading (date's heading wins here); a value counts its icon */
    expect(t[1]).toBeGreaterThanOrEqual(104);
    expect(t[2]).toBeGreaterThanOrEqual(180 + CONTACT_ICON);
    expect(t[3]).toBeGreaterThanOrEqual(228 + CONTACT_ICON);
    /* and the row is used exactly: tracks + gaps fill the room, never more */
    expect(sum(t) + 5 * f.gap).toBeLessThanOrEqual(base.avail);
    expect(base.avail - (sum(t) + 5 * f.gap)).toBeLessThan(1.5);
  });
  it("THE SPARSE CASE (Nick's list): no website or email anywhere — Agent does not balloon, the gaps stop at 56, the rest goes right of Email", () => {
    const sparse = { ...base, avail: 1400, web: 0, email: 0, webAdd: 92, emailAdd: 80 };
    const f = fitContactColumns(sparse);
    const t = tracks(f.cols);
    expect(f.stacked).toBe(false);
    expect(t[0]).toBe(CONTACT_AGENT_MIN);
    expect(f.gap).toBe(CONTACT_GAP_MAX);
    /* the empty columns keep room for their "+ Add" link (and so their headings) */
    expect(t[2]).toBeGreaterThanOrEqual(92);
    /* the remainder is in the Email track, which is wider than its content */
    expect(t[3]).toBeGreaterThan(80);
    expect(Math.abs(sum(t) + 5 * f.gap - sparse.avail)).toBeLessThan(1.5);
    /* the Website column is only its content: the growth is to the right of Email, not shared out */
    expect(t[2]).toBeLessThan(100);
  });
  it("a little spare widens every gap equally and nothing else", () => {
    const tight = fitContactColumns({ ...base, avail: 1220 });
    const roomy = fitContactColumns({ ...base, avail: 1240 });
    expect(tracks(roomy.cols)).toEqual(tracks(tight.cols));
    expect(roomy.gap).toBeGreaterThan(tight.gap);
  });
  it("stacks, one column fewer, stepping the type down from 14.5 when they do not fit", () => {
    const f = fitContactColumns({ ...base, avail: 930 });
    expect(f.stacked).toBe(true);
    expect(f.count).toBe(5);
    expect(f.fs).toBe(14.5);
    expect(tracks(f.cols)).toHaveLength(5);
    /* the stacked column holds the longer of the two, scaled */
    expect(tracks(f.cols)[2]).toBeGreaterThanOrEqual(228 * (14.5 / 15) + CONTACT_ICON);
  });
  it("steps further, 0.5 at a time, and stops at 12px however little room there is; Agent then gives way", () => {
    const tight = fitContactColumns({ ...base, avail: 840 });
    expect(tight.stacked).toBe(true);
    expect(tight.fs).toBeLessThan(14.5);
    expect((tight.fs * 2) % 1).toBe(0);
    const none = fitContactColumns({ ...base, avail: 200 });
    expect(none.fs).toBe(CONTACT_FS_MIN);
    expect(none.cols.startsWith("minmax(0, 1fr) ")).toBe(true);
  });
  it("each step is the LARGEST size that fits", () => {
    const A = agentColumn(base.agent, base.agentHead);
    for (let avail = 760; avail <= 1200; avail += 7) {
      const f = fitContactColumns({ ...base, avail });
      if (!f.stacked || f.fs === 14.5 || f.fs === CONTACT_FS_MIN) continue;
      const up = f.fs + 0.5, k = up / 15;
      const r = (n: number) => Math.ceil(n + 0.5); // the lib's own track rounding
      const need = r(Math.max(base.date * k, base.dateHead)) + r(Math.max(base.email * k + CONTACT_ICON, base.bothHead)) + r(base.replies) + r(base.status) + 4 * base.gap;
      expect(avail - need, `${avail}: ${up} would not have fitted`).toBeLessThan(A);
    }
  });
  it("v19.1 §B: the icon does not scale with the type; a missing value is its unscaled \"+ Add\" link", () => {
    const f = fitContactColumns({ ...base, avail: 930 });
    expect(tracks(f.cols)[2]).toBeGreaterThanOrEqual(228 * (f.fs / 15) + CONTACT_ICON);
    const none = fitContactColumns({ ...base, web: 0, email: 0, webAdd: 92, emailAdd: 80, avail: 2000 });
    const t = tracks(none.cols);
    expect(t[2]).toBeGreaterThanOrEqual(92);
    expect(t[3]).toBeGreaterThanOrEqual(80);
  });
});
