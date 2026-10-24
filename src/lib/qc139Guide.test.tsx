/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 — the unit half of the QC139 locks.
 *
 * A3 empty: with no queries, Find, Pin the list (v140 §G), Open and Birds-eye wait for the first query; Log and Record a response stay
 *    available (the practice query does not depend on the writer's data). The shared harness account cannot be emptied
 *    of its queries, so this is asserted here, against the page's own derivation and the checklist's rendering of it.
 * The practice store: Pip arrives as the pack states, `practiceRespond` applies the real path's plan in memory, and he
 *    is gone at the end — with nothing persisted.
 * The guide's copy, verbatim.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";

/* the boundaries only: the app's Firebase handle (no app in a unit run), and the Firestore writers as spies, so the
   practice query can be shown to write nothing */
vi.mock("./firebase", () => ({ db: {}, handleFirestoreError: vi.fn((e: unknown) => { throw e; }), OperationType: { WRITE: "write", UPDATE: "update" } }));
vi.mock("firebase/firestore", async (orig) => {
  const real = await orig<typeof import("firebase/firestore")>();
  return { ...real, setDoc: vi.fn(), updateDoc: vi.fn(), addDoc: vi.fn(), deleteDoc: vi.fn(), writeBatch: vi.fn(), getDocs: vi.fn(), getDoc: vi.fn() };
});
import * as fs from "firebase/firestore";
import { QC_AFTER_FIRST, QC_ALL_DONE, QC_CHECKLIST, QC_NEEDS_A_QUERY, qcGuideOf } from "./pageChecklist";
import { PIP_AGENCY, PIP_ID, PIP_NAME, currentPractice, endPractice, isPracticeId, practiceRespond, startPractice } from "./practiceQuery";
import { QueryStatus } from "../types";
import type { RecordResponseData } from "./recordResponse";

const read = (p: string) => readFileSync(p, "utf8");
const DAY = 86_400_000;

describe("A3 · the empty account", () => {
  it("Find, Pin the list, Open and Birds-eye wait for the first query; Log and Record a response do not", () => {
    expect([...QC_NEEDS_A_QUERY].sort()).toEqual(["birds", "find", "open", "pin"]);
    expect(QC_NEEDS_A_QUERY).not.toContain("resp");
    expect(QC_NEEDS_A_QUERY).not.toContain("log");
    expect(QC_AFTER_FIRST).toBe("After your first query");
  });
  it("the page derives the disabled set from having no queries, and hands it to the checklist", () => {
    const page = read("src/components/Queries.tsx");
    expect(page).toMatch(/collectionsReady && !hasQueries \? Object\.fromEntries\(QC_NEEDS_A_QUERY\.map\(\(k\) => \[k, QC_AFTER_FIRST\]\)\)/);
    expect(page).toMatch(/disabled=\{guideOff\}/);
  });
  it("the checklist draws a disabled item with its own line, not pressable, and no arrow", () => {
    const pc = read("src/components/shell/guide/PageChecklist.tsx");
    /* Help system v1 retarget — the same law, spelt once: an item is BLOCKED while the page says it cannot be done
       and it is not done (a real save or a skip, `eff`); a blocked row is disabled, shows its own line and no arrow */
    expect(pc).toMatch(/const blocked = !!off2\[it\.key\] && !eff\[it\.key\];/);
    expect(pc).toMatch(/disabled=\{blocked\}/);
    expect(pc).toMatch(/blocked \? off2\[it\.key\] : it\.line/);
    expect(pc).toMatch(/blocked \? <span \/> : <span className="pck-go"/);
    expect(read("src/components/shell/guide/pageChecklist.css")).toMatch(/\.pck-l li\.is-off \.pck-tx small \{ font-style: italic/);
  });
});

describe("the guide's six items and its words (v140 §G adds Pin the list, third)", () => {
  it("in order, with the pack's copy", () => {
    expect(QC_CHECKLIST.map((i) => [i.key, i.title, i.line])).toEqual([
      ["log", "Log a query", "Who you sent it to, and when."],
      ["find", "Find a query", "Search by agent or agency, or press Filters and tick a status."],
      ["pin", "Go full screen", "Turn the list into the whole page while you work."], /* v142 §A: the Contact list v20 wording */
      ["open", "Open a query", "Its whole story, in one panel."],
      ["resp", "Record a response", "Try it on a practice query. Nothing is saved."],
      ["birds", "See the Birds-eye view", "Every live query on one timeline. Press B."],
    ]);
    expect(QC_CHECKLIST).toHaveLength(6);
    /* v140 §G — the eyebrows count six: the log card is Step 1, Pip's walkthrough (Record a response) Step 5 */
    expect(QC_CHECKLIST.findIndex((it) => it.key === "resp") + 1).toBe(5);
    const page = read("src/components/Queries.tsx");
    expect(page).not.toMatch(/Step \d of 5/);
    expect(page).toContain("kicker: `Query Centre · Step 1 of ${QC_CHECKLIST.length}`");
    expect(page).toContain('Step ${QC_CHECKLIST.findIndex((it) => it.key === "resp") + 1} of ${QC_CHECKLIST.length}');
    /* the tick is read from the pin's real state, never from the guide's own buttons */
    expect(page).toMatch(/if \(qcPin\.full && !was\.full && !was\.known && routeActive\) tickGuide\.current\("pin"\)/);
    expect(QC_ALL_DONE).toEqual({ title: "All done", line: "You know your way round the Query Centre. This checklist goes away next time you visit." });
  });
  it("the state is the account's, under todoPrefs.queries.guide", () => {
    const g = qcGuideOf({ todoPrefs: { queries: { guide: { done: { find: true, nope: true }, seen: true, finished: true } } } } as never);
    expect(g).toEqual({ done: { find: true }, seen: true, hidden: false, finished: true });
    expect(qcGuideOf(null)).toEqual({ done: {}, seen: false, hidden: false, finished: false });
  });
});

describe("B · the practice query", () => {
  beforeEach(() => endPractice());
  const base: RecordResponseData = {
    responseType: "partial", materialsType: "Chapters", materialsQuantity: 3, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
    dateReceived: new Date().toISOString().slice(0, 10), rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "",
    requeryPreference: "", offerDate: "", offerDeadline: "", offerNotes: "", closingReason: "Other", closingNotes: "", eventKey: "partial_requested",
  } as RecordResponseData;

  it("Pip arrives queried 12 days ago, with the agent, a reply due 30 days from today", () => {
    const now = Date.UTC(2026, 9, 18, 12);
    const p = startPractice({ userId: "u", manuscriptId: "m", nowMs: now });
    expect(p.query.id).toBe(PIP_ID);
    expect(p.agent.name).toBe(PIP_NAME);
    expect(p.agent.agency).toBe(PIP_AGENCY);
    expect(p.query.status).toBe(QueryStatus.QUERIED);
    expect(Math.round((now - new Date(p.query.dateSent!).getTime()) / DAY)).toBe(12);
    expect((p.agent as { responseTimeWeeks?: number }).responseTimeWeeks! * 7 - 12).toBe(30);
    expect(p.query.materialsWanted).toEqual(["Query letter", "Synopsis"]);
    expect(isPracticeId(PIP_ID)).toBe(true);
    expect(isPracticeId("q1")).toBe(false);
  });
  it("a response is the real path's plan, applied in memory, with his fields derived from his log", () => {
    startPractice({ userId: "u", manuscriptId: "m" });
    expect(practiceRespond(base, { requestSynopsis: false })).toBe(QueryStatus.PARTIAL_REQUESTED);
    const p = currentPractice()!;
    expect(p.query.status).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(p.query.materialsRequestedType).toBe("chapters");
    expect(String(p.query.materialsRequestedQuantity)).toBe("3");
    expect(p.query.partialRequestedDate).toBeTruthy();
    expect(p.log).toHaveLength(2);
    expect(p.feed).toHaveLength(2);
    expect(p.answered).toBe(QueryStatus.PARTIAL_REQUESTED);
    /* nothing reached Firestore, read or write */
    for (const f of ["setDoc", "updateDoc", "addDoc", "deleteDoc", "writeBatch", "getDocs", "getDoc"] as const) expect(vi.mocked(fs[f]), f).not.toHaveBeenCalled();
  });
  it("a pass closes him", () => {
    startPractice({ userId: "u", manuscriptId: "m" });
    practiceRespond({ ...base, responseType: "rejected", eventKey: "pass" } as RecordResponseData);
    expect(currentPractice()!.query.status).toBe(QueryStatus.REJECTED);
  });
  it("he is gone at the end, and the module holds nothing", () => {
    startPractice({ userId: "u", manuscriptId: "m" });
    endPractice();
    expect(currentPractice()).toBeNull();
  });
  it("⚠️ the module touches no store: no Firestore write, no local or session storage", () => {
    const src = read("src/lib/practiceQuery.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const w of ["setDoc", "updateDoc", "addDoc", "deleteDoc", "writeBatch", "localStorage", "sessionStorage", "recordQueryResponse"]) expect(src).not.toContain(w);
  });
  it("⚠️ the journey's one write is swapped at one seam, and the drawer neither snapshots, undoes nor parks him", () => {
    const j = read("src/components/queryActions/journeys/ResponseJourney.tsx");
    expect(j).toMatch(/if \(isPracticeId\(q\.id\)\) \{[\s\S]*?practiceRespond\(data, extra\);[\s\S]*?return \{/);
    /* v149 RE-POINTED (relocation): the real write is the shared response save (lib/queryActions/respondSave), still
       called AFTER the practice seam returns — so Pip's stand-in still runs first and nothing real runs for him. */
    expect(j.indexOf("practiceRespond(data, extra)")).toBeLessThan(j.indexOf("await saveResponse(db, { q, agent, ms }, {"));
    expect(read("src/lib/queryActions/respondSave.ts")).toContain("await recordQueryResponse(");
    const d = read("src/components/queryActions/QueryDrawer.tsx");
    expect(d).toMatch(/if \(isPracticeId\(r\.queryId\)\) \{[\s\S]*?await view\.commit\(\);[\s\S]*?return;\n    \}\n    try \{\n      const snap = await takeSnapshot/);
    expect(d).toMatch(/if \(isPracticeId\(r\.queryId\)\) \{ close\(\); return; \}/);
    expect(d).toMatch(/if \(isPracticeId\(active\.queryId\) && active\.mode !== "resp"\) return chip;/);
  });
});
