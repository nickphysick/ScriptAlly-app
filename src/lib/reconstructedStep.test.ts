/**
 * 1c · A RECONSTRUCTED STEP NEVER OUTRANKS A REAL EVENT (Nick, 28 Sep). It sorts by its date, but the
 * status — and when it last changed — come from real events whenever the log has any.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { computeRecomputedFields } from "./recomputeFields";

const at = (iso: string) => ({ seconds: Date.parse(iso) / 1000 });
const real = (id: string, s: QueryStatus, iso: string) => ({ id, data: { type: s, resultingStatus: s, createdAt: at(iso) } });
const recon = (id: string, s: QueryStatus, iso: string) => ({ id, data: { type: s, resultingStatus: s, createdAt: at(iso), reconstructed: true } });

describe("a reconstructed step and the status", () => {
  it("dated AFTER a real event, it does not decide the status or the last change", () => {
    const f = computeRecomputedFields([
      real("a1", QueryStatus.PARTIAL_SENT, "2026-08-01T10:00:00Z"),
      real("a2", QueryStatus.NO_RESPONSE, "2026-08-20T10:00:00Z"),
      recon("act-status-partial-requested-q", QueryStatus.PARTIAL_REQUESTED, "2026-09-01T10:00:00Z"),
    ]);
    expect(f.status).toBe(QueryStatus.NO_RESPONSE);
    expect(f.lastStatusChange).toBe("2026-08-20T10:00:00.000Z");
  });
  it("as the only record, it is the status", () => {
    const f = computeRecomputedFields([recon("act-status-rejected-q", QueryStatus.REJECTED, "2026-07-01T10:00:00Z")]);
    expect(f.status).toBe(QueryStatus.REJECTED);
  });
  it("an UNFLAGGED act-status row still counts as before — only the flag demotes a row", () => {
    const f = computeRecomputedFields([
      real("a1", QueryStatus.PARTIAL_SENT, "2026-08-01T10:00:00Z"),
      { id: "act-status-partial-requested-q", data: { type: QueryStatus.PARTIAL_REQUESTED, resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: at("2026-09-01T10:00:00Z") } },
    ]);
    expect(f.status).toBe(QueryStatus.PARTIAL_REQUESTED);
  });
});

import { buildTimelineRows } from "../components/reading-pane/QueryTimeline";
import { dockTimeline } from "./dockTimeline";
import { RECONSTRUCTED_TITLE } from "./reconstructed";

describe("1c · a reconstruction is labelled honestly wherever history is drawn", () => {
  const q = { id: "q", status: QueryStatus.REJECTED, dateSent: "2026-06-01", sendMethod: "Email", materialsWanted: [] } as never;
  const recEvt = { id: "act-status-rejected-q", type: QueryStatus.REJECTED, resultingStatus: QueryStatus.REJECTED, createdAt: { seconds: Date.parse("2026-07-01T10:00:00Z") / 1000 }, reconstructed: true };
  it("Tracking: the fixed words, the status as the sub-line, flagged", () => {
    const row = buildTimelineRows([recEvt], q, null).find((r) => r.activityId === recEvt.id)!;
    expect(row.title).toBe(RECONSTRUCTED_TITLE);
    expect(row.sub).not.toBe(RECONSTRUCTED_TITLE);
    expect(row.reconstructed).toBe(true);
  });
  it("a real event of the same status is drawn as itself", () => {
    const row = buildTimelineRows([{ ...recEvt, id: "real", reconstructed: undefined }], q, null).find((r) => r.activityId === "real")!;
    expect(row.title).not.toBe(RECONSTRUCTED_TITLE);
    expect(row.reconstructed).toBeUndefined();
  });
  it("the To-do / quick-card timeline: the same words, flagged, no channel", () => {
    const ev = dockTimeline([recEvt as never], { sendMethod: "Email" }).find((e) => e.key === recEvt.id)!;
    expect(ev.label).toBe(RECONSTRUCTED_TITLE);
    expect(ev.reconstructed).toBe(true);
    expect(ev.via).toBeUndefined();
  });
});
