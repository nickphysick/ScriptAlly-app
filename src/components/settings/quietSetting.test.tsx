/**
 * Query Centre v153.3 §1 — "Gone quiet after" leaves the Query Centre header and lives in Settings → Preferences, in
 * a small "Queries" card. The stored value and its reader are unchanged (`todoPrefs.queries.quietWeeks`,
 * `quietWeeksOf`); only the place it is edited moves. The write the Settings row makes is `quietWeeksPaths(w)`, and
 * the case below proves that write changes which queries count as Gone quiet.
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderPageSeededWith, noNavigate, SMOKE_USER } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { AccountSettings } from "../AccountSettings";
import { QcHeader1531 } from "../queries/centre/QcHeader1531";
import { QUIET_WEEKS, QUIET_WEEKS_PATH, quietWeeksOf, quietWeeksPaths, queryState } from "../../lib/queryState";
import { QueryStatus } from "../../types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 8, 12);

/** apply a dotted-path patch to a user, the way `updateUserPaths` writes it */
function applyPaths<T extends Record<string, unknown>>(user: T, paths: Record<string, unknown>): T {
  const out = JSON.parse(JSON.stringify(user)) as Record<string, unknown>;
  for (const [path, v] of Object.entries(paths)) {
    const keys = path.split(".");
    let at = out;
    for (const k of keys.slice(0, -1)) { at[k] = (at[k] as Record<string, unknown>) ?? {}; at = at[k] as Record<string, unknown>; }
    at[keys[keys.length - 1]] = v;
  }
  return out as T;
}

const prefs = (weeks: number) => renderPageSeededWith(
  <AccountSettings section="preferences" onNavigate={noNavigate} />, "/account/preferences",
  { currentUser: { ...SMOKE_USER, todoPrefs: { queries: { quietWeeks: weeks } } } },
);

describe("the quiet window lives in Settings", () => {
  it("Preferences carries a Queries card with the label, the helper and a weeks picker", () => {
    const h = prefs(4);
    expect(h).toContain(">Queries<");
    expect(h).toContain("Treat a query as gone quiet after");
    expect(h).toContain("Queries with no reply after this long move to Gone quiet.");
    const sel = h.match(/<select[^>]*aria-label="Treat a query as gone quiet after"[^>]*>([\s\S]*?)<\/select>/);
    expect(sel, "the weeks picker").not.toBeNull();
    const opts = [...sel![1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/g)];
    expect(opts.map((o) => Number(o[1]))).toEqual([...QUIET_WEEKS]);
    expect(opts.map((o) => o[2])).toEqual(QUIET_WEEKS.map((w) => `${w} weeks`));
  });

  it("the picker shows the stored value", () => {
    expect(prefs(8)).toMatch(/<option[^>]*value="8"[^>]*selected=""/);
    expect(prefs(3)).toMatch(/<option[^>]*value="3"[^>]*selected=""/);
    expect(prefs(3)).not.toMatch(/<option[^>]*value="8"[^>]*selected=""/);
  });

  it("the Query Centre header no longer carries it", () => {
    const h = renderToStaticMarkup(<QcHeader1531 loading={false} onLog={() => {}} onRecord={() => {}} counts={{ sent: 4, ms: "Book" } as never}
      {...({ quietWeeks: 4, onQuietWeeks: () => {} } as object)} />);
    expect(h).not.toContain("Gone quiet after");
    expect(h).not.toContain("quiet-setting");
    expect(h.match(/<button/g)?.length).toBe(2);
  });

  it("the Settings write changes which queries count as Gone quiet", () => {
    expect(quietWeeksPaths(6)).toEqual({ [QUIET_WEEKS_PATH]: 6 });
    // queried, past its reply date by five weeks, no nudge, replies to everyone
    const q = { status: QueryStatus.QUERIED, expectedMs: NOW - 35 * DAY, stageStartMs: NOW - 90 * DAY, sentMs: NOW - 90 * DAY, query: {}, nrmn: false };
    const stateFor = (user: Record<string, unknown>) => queryState(q, { quietWeeks: quietWeeksOf(user), nowMs: NOW });
    const base = { ...SMOKE_USER, todoPrefs: { queries: { quietWeeks: 4 } } };
    expect(stateFor(base)).toBe("quiet");
    expect(stateFor(applyPaths(base, quietWeeksPaths(6)))).toBe("nudge");
    expect(stateFor(applyPaths(base, quietWeeksPaths(2)))).toBe("quiet");
  });
});
