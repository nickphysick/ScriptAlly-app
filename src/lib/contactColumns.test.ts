/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §C — the columns' widths: side by side when they fit, else stacked with the type stepped down
 * 0.5px at a time, never below 12px; a column is never narrower than its heading.
 */
import { describe, expect, it } from "vitest";
import { CONTACT_FS_MIN, CONTACT_ICON, fitContactColumns, type ContactColumnWidths } from "./contactColumns";

const base: ContactColumnWidths = {
  avail: 1190, gap: 20, agentFloor: 220,
  date: 90, dateHead: 104, web: 180, webHead: 64, email: 228, emailHead: 50, bothHead: 150, replies: 100, status: 170,
};
const tracks = (cols: string) => cols.split(" ").slice(2).map((s) => parseFloat(s));

describe("fitContactColumns", () => {
  it("side by side at 15px when the agent keeps its floor: six columns, Agent first and flexible", () => {
    const f = fitContactColumns(base);
    expect(f).toMatchObject({ stacked: false, fs: 15, count: 6 });
    expect(f.cols.startsWith("minmax(0, 1fr) ")).toBe(true);
    const t = tracks(f.cols);
    expect(t).toHaveLength(5);
    /* a column is never narrower than its entry or its heading (date's heading wins here) */
    expect(t[0]).toBeGreaterThanOrEqual(104);
    /* v19.1 §B: a value's column counts its icon and gap (+22) */
    expect(t[1]).toBeGreaterThanOrEqual(180 + CONTACT_ICON);
    expect(t[2]).toBeGreaterThanOrEqual(228 + CONTACT_ICON);
  });
  it("stacks, one column fewer, stepping the type down from 14.5 when they do not fit", () => {
    const f = fitContactColumns({ ...base, avail: 930 });
    expect(f.stacked).toBe(true);
    expect(f.count).toBe(5);
    expect(f.fs).toBe(14.5);
    expect(tracks(f.cols)).toHaveLength(4);
    /* the stacked column holds the longer of the two, scaled */
    expect(tracks(f.cols)[1]).toBeGreaterThanOrEqual(228 * (14.5 / 15) + CONTACT_ICON);
  });
  it("steps further, 0.5 at a time, and stops at 12px however little room there is", () => {
    const tight = fitContactColumns({ ...base, avail: 760 });
    expect(tight.stacked).toBe(true);
    expect(tight.fs).toBeLessThan(14.5);
    expect((tight.fs * 2) % 1).toBe(0);
    const none = fitContactColumns({ ...base, avail: 200 });
    expect(none.fs).toBe(CONTACT_FS_MIN);
  });
  it("each step is the LARGEST size that fits", () => {
    for (let avail = 700; avail <= 1200; avail += 7) {
      const f = fitContactColumns({ ...base, avail });
      if (!f.stacked || f.fs === 14.5 || f.fs === CONTACT_FS_MIN) continue;
      const up = f.fs + 0.5, k = up / 15;
      const need = Math.max(base.date * k, base.dateHead) + Math.max(base.email * k + CONTACT_ICON, base.bothHead) + base.replies + base.status + 4 * base.gap;
      expect(avail - need, `${avail}: ${up} would not have fitted`).toBeLessThan(base.agentFloor);
    }
  });
  it("v19.1 §B: the icon does not scale with the type; a missing value is its unscaled \"+ Add\" link", () => {
    const f = fitContactColumns({ ...base, avail: 930 });
    expect(tracks(f.cols)[1]).toBeGreaterThanOrEqual(228 * (f.fs / 15) + CONTACT_ICON);
    const none = fitContactColumns({ ...base, web: 0, email: 0, webAdd: 92, emailAdd: 80, avail: 2000 });
    const t = tracks(none.cols);
    expect(t[1]).toBeGreaterThanOrEqual(92);
    expect(t[2]).toBeGreaterThanOrEqual(80);
  });
});
