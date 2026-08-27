/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ BOOK VERSIONS — the model (Part A) ════════════════════════════════════════════════════════
 *
 * ⚠️ WHAT THIS FILE CAN AND CANNOT PROVE. These are derivation checks over pure functions — they
 * prove the arithmetic, never that a panel rendered it. The rendered claims (the panel is absent at
 * one version, present at two; the counts on screen match these) are measured in `tests/e2e/`, and
 * the report says which claim has which kind of evidence.
 *
 * ⚠️ AND THE INPUTS ARE BUILT THE WAY THE APP BUILDS THEM. The standing rule: a test that hands a
 * function an argument its callers cannot produce is exercising a function nobody runs. `holdings`
 * is fed real `QueryStatus` members, and `requestsByVersion` takes the app's own `isRequest`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_BOOK_VERSIONS, KIND_LABEL, bookVersionsOf, versionsActive, latestVersion, bookVersionById,
  bookVersionOf, rrLink, appendBookVersion, renameBookVersion, samplesOfVersion, holdings,
  holdingEarlier, requestsByVersion, versionMeta, manuscriptsForTier, isSendStatus,
} from "./bookVersions";
import { isRequest } from "./packageMetrics";
import { manuscriptLimitError } from "./manuscripts";
import { ComponentType, QueryStatus, UserPlan } from "../types";
import type { Activity, BookVersion, Manuscript, ManuscriptVersion, Query } from "../types";

const v = (id: string, over: Partial<BookVersion> = {}): BookVersion =>
  ({ id, name: id, kind: "reordering", createdDate: "2026-05-01", ...over });

const ms = (bookVersions?: BookVersion[]): Manuscript =>
  ({ id: "m1", userId: "u", title: "T", genre: "g", ageCategory: "a", wordCount: 1, logline: "",
     comps: [], status: "Querying", statusChangedDate: "", bookVersions } as unknown as Manuscript);

const sample = (id: string, bookVersionId?: string, componentType = ComponentType.SAMPLE_PAGES): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType, versionName: id, fileAttached: false,
     createdDate: "", bookVersionId } as ManuscriptVersion);

const q = (id: string, status: QueryStatus, packageId?: string): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId: "a", status, packageId } as unknown as Query);

const send = (queryId: string, bookVersionId: string, date: string, resultingStatus = QueryStatus.FULL_SENT): Activity =>
  ({ id: `act-${queryId}-${date}`, userId: "u", queryId, manuscriptId: "m1",
     activityType: "Materials Sent", description: "", date, details: "",
     resultingStatus, bookVersionId } as unknown as Activity);

// ─────────────────────────────────────────────────────────────────────────────
describe("D1 — the list is append-only and defended", () => {
  it("reads an absent, empty or malformed field as no versions", () => {
    expect(bookVersionsOf(ms())).toEqual([]);
    expect(bookVersionsOf(null)).toEqual([]);
    expect(bookVersionsOf({ bookVersions: "nope" } as unknown as Manuscript)).toEqual([]);
    /* an entry with no id cannot be referenced by anything, so it is not a version */
    expect(bookVersionsOf({ bookVersions: [{ name: "x" }] } as unknown as Manuscript)).toEqual([]);
  });

  it("appends, and bounds at the cap the rules enforce", () => {
    expect(appendBookVersion([v("a")], v("b")).map((x) => x.id)).toEqual(["a", "b"]);
    const full = Array.from({ length: MAX_BOOK_VERSIONS }, (_, i) => v(`v${i}`));
    const next = appendBookVersion(full, v("new"));
    expect(next.length).toBe(MAX_BOOK_VERSIONS);
    expect(next[next.length - 1].id).toBe("new");
    expect(next[0].id).toBe("v1"); // the oldest drops, never the newest
  });

  it("⚠️ the cap is artefact-locked to firestore.rules — the client must not permit a denied write", () => {
    const rules = readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8");
    expect(rules).toContain(`data.bookVersions.size() <= ${MAX_BOOK_VERSIONS}`);
  });

  it("has no remove — a version a sample points at must keep resolving", () => {
    const src = readFileSync(join(__dirname, "bookVersions.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const banned of ["removeBookVersion", "deleteBookVersion"]) {
      expect(src, `${banned} exists — append-only is the model, not a precaution`).not.toContain(banned);
    }
  });
});

describe("D9 — rename and re-note, and nothing else", () => {
  it("changes the label and leaves every fact alone", () => {
    const before = v("a", { kind: "initial", createdDate: "2026-03-02", fromActivityId: "act1" });
    const [after] = renameBookVersion([before], "a", "  Prologue-first  ", " opens on the storm ");
    expect(after).toEqual({ id: "a", name: "Prologue-first", kind: "initial",
                            createdDate: "2026-03-02", fromActivityId: "act1", note: "opens on the storm" });
  });

  it("an emptied note OMITS the key — absent is unwritten, not \"\"", () => {
    const [after] = renameBookVersion([v("a", { note: "old" })], "a", "n", "   ");
    expect("note" in after).toBe(false);
  });

  it("leaves other entries untouched", () => {
    const out = renameBookVersion([v("a"), v("b", { note: "keep" })], "a", "x", "");
    expect(out[1]).toEqual(v("b", { note: "keep" }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D8/D18/D22 — one gate, read by every surface", () => {
  it("is off at nought and one version, on at two", () => {
    expect(versionsActive(ms())).toBe(false);
    expect(versionsActive(ms([v("a")]))).toBe(false);
    expect(versionsActive(ms([v("a"), v("b")]))).toBe(true);
  });
});

describe("D10 — \"latest\" is a date fact", () => {
  it("is the newest by date, not the last appended", () => {
    const out = latestVersion([v("a", { createdDate: "2026-07-01" }), v("b", { createdDate: "2026-03-01" })]);
    expect(out?.id).toBe("a");
  });
  it("breaks a tie on list order, so append-only decides", () => {
    expect(latestVersion([v("a"), v("b")])?.id).toBe("b");
  });
  it("is null with nothing to date", () => expect(latestVersion([])).toBeNull());

  it("⚠️ ranks nothing — no better/best/recommended anywhere in the module", () => {
    const src = readFileSync(join(__dirname, "bookVersions.ts"), "utf8");
    /**
     * ⚠️ COMMENTS ARE **IN SCOPE** HERE, WHICH REVERSES THIS REPO'S USUAL RULE, AND ON PURPOSE.
     * The standing convention is to strip comments before a source lock, because prose recording a
     * retirement quotes the very token it retired. That is exactly right for "is this class still
     * emitted" and exactly wrong here: the ban is on the CONCEPT, and a comment telling a future
     * reader which opening to prefer would be as much a verdict as code returning one.
     *
     * The cost is real and is accepted: `bookVersions.ts` may not quote these words even to explain
     * them, and its own note about a renamed accumulator is written around the word for that reason.
     * ⚠️ IF THIS EVER GOES RED, THE FIX IS TO REWORD THE PROSE — never to add a `decls()` strip,
     * which would quietly delete half of what this case checks.
     */
    expect(src).not.toMatch(/\b(recommend|best|winner|preferred|strongest|should send)\b/i);
  });
});

describe("D10 — the R&R link degrades to nothing", () => {
  const acts = [send("q1", "a", "2026-07-01")];
  it("resolves a live activity", () => {
    expect(rrLink(v("x", { fromActivityId: acts[0].id }), acts)?.id).toBe(acts[0].id);
  });
  it("returns null for a deleted or re-filed one, rather than a dead chip", () => {
    expect(rrLink(v("x", { fromActivityId: "gone" }), acts)).toBeNull();
    expect(rrLink(v("x"), acts)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D2 — sample pages only", () => {
  it("reads a version off a sample", () => {
    expect(bookVersionOf(sample("s1", "a"))).toBe("a");
  });
  it("IGNORES one stored on a letter or a synopsis", () => {
    expect(bookVersionOf(sample("s1", "a", ComponentType.QUERY_LETTER))).toBeNull();
    expect(bookVersionOf(sample("s1", "a", ComponentType.SYNOPSIS))).toBeNull();
    expect(bookVersionOf(sample("s1", "a", ComponentType.FULL_MANUSCRIPT))).toBeNull();
  });
  it("reads no version when the sample carries none", () => {
    expect(bookVersionOf(sample("s1"))).toBeNull();
  });
});

describe("D3 — only a send carries a version", () => {
  it("names the two send statuses and no others", () => {
    expect(isSendStatus(QueryStatus.FULL_SENT)).toBe(true);
    expect(isSendStatus(QueryStatus.PARTIAL_SENT)).toBe(true);
    for (const s of [QueryStatus.QUERIED, QueryStatus.FULL_REQUESTED, QueryStatus.PARTIAL_REQUESTED,
                     QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
                     QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(isSendStatus(s), `${s} must not carry a version`).toBe(false);
    }
    expect(isSendStatus(undefined)).toBe(false);
  });
});

describe("⚠️ recomputeQuery is untouched — the feature's load-bearing claim", () => {
  it("does not read a version, and nothing imports this module into it", () => {
    const src = readFileSync(join(__dirname, "recomputeQuery.ts"), "utf8");
    expect(src).not.toContain("bookVersion");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D16 — who holds what, derived", () => {
  const acts = [send("q1", "old", "2026-06-01"), send("q1", "new", "2026-08-01"),
                send("q2", "old", "2026-05-01", QueryStatus.PARTIAL_SENT)];

  it("lists only the agents a send is currently sitting with", () => {
    const qs = [q("q1", QueryStatus.FULL_SENT), q("q2", QueryStatus.PARTIAL_SENT),
                q("q3", QueryStatus.QUERIED), q("q4", QueryStatus.REJECTED),
                q("q5", QueryStatus.OFFER), q("q6", QueryStatus.REVISE_RESUBMIT)];
    expect(holdings(qs, acts).map((h) => h.query.id)).toEqual(["q1", "q2"]);
  });

  it("reads what they hold from the status", () => {
    const out = holdings([q("q1", QueryStatus.FULL_SENT), q("q2", QueryStatus.PARTIAL_SENT)], acts);
    expect(out.map((h) => h.what)).toEqual(["FULL", "PARTIAL"]);
  });

  it("⚠️ takes the LATEST send, not the first — a partial then a full means they hold the full's version", () => {
    expect(holdings([q("q1", QueryStatus.FULL_SENT)], acts)[0].versionId).toBe("new");
  });

  it("records null where the send predates the feature", () => {
    expect(holdings([q("q9", QueryStatus.FULL_SENT)], acts)[0].versionId).toBeNull();
  });
});

describe("D17 — earlier is a count, and an unknown is not an earlier", () => {
  const hs = [{ versionId: "new" }, { versionId: "old" }, { versionId: "old" }, { versionId: null }] as never[];
  it("counts holders on something other than the latest", () => {
    expect(holdingEarlier(hs, "new")).toBe(2);
  });
  it("⚠️ does NOT count a holder whose version is unrecorded", () => {
    /* "I do not know what they have" is a different fact from "they have an older one". */
    expect(holdingEarlier([{ versionId: null }] as never[], "new")).toBe(0);
  });
  it("counts nothing when there is no latest to be earlier than", () => {
    expect(holdingEarlier(hs, null)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D15 — requests by opening, read from the package", () => {
  const materials = [sample("s1", "va"), sample("s2", "va"), sample("s3", "vb"),
                     sample("s4", "va", ComponentType.QUERY_LETTER)];
  const packages = [{ id: "p1", samplePagesVersionId: "s1" }, { id: "p2", samplePagesVersionId: "s2" },
                    { id: "p3", samplePagesVersionId: "s3" }, { id: "p4" }]
    .map((p) => ({ ...p, bookVersionId: p.id === "p3" ? "vb" : p.id === "p4" ? undefined : "va" }));
  const queries = [q("q1", QueryStatus.FULL_REQUESTED, "p1"), q("q2", QueryStatus.QUERIED, "p1"),
                   q("q3", QueryStatus.QUERIED, "p2"), q("q4", QueryStatus.QUERIED, "p3"),
                   q("q5", QueryStatus.QUERIED)];

  it("counts every sample and package carrying the version, and the sends they rode", () => {
    /* ⚠️ READ FROM THE PACKAGE (D15), not aggregated through a sample. The sample-pages-only rule
       this case used to guard has no subject left: a stray id on a letter cannot be reached,
       because nothing walks materials to find a version any more. */
    const out = requestsByVersion(v("va"), packages, queries, isRequest);
    expect(out).toEqual({ versionId: "va", packages: 2, sent: 3, requests: 1 });
  });

  it("counts a version nothing has gone out with as zeros, not as absent", () => {
    expect(requestsByVersion(v("vz"), packages, queries, isRequest))
      .toEqual({ versionId: "vz", packages: 0, sent: 0, requests: 0 });
  });

  it("⚠️ RETURNS NO RATE (D15). 2-from-18 against 0-from-6 is not a result", () => {
    const out = requestsByVersion(v("va"), packages, queries, isRequest);
    expect(Object.keys(out).sort()).toEqual(["packages", "requests", "sent", "versionId"]);
    const src = readFileSync(join(__dirname, "bookVersions.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).not.toContain("%");
    expect(src).not.toMatch(/\brate\b/i);
  });

  it("⚠️ THE PACKAGE'S OWN FIELD IS THE ONLY EDGE — no walk through a material", () => {
    /**
     * ⚠️ RETARGETED, AND THE LAW IT NOW ASSERTS IS THE SAME ONE INVERTED. It used to forbid a
     * package field, because the version was inherited from whichever sample sat in the sample slot
     * and a second source would have been a second answer. The package states its version now (D1)
     * and sample pages is not a material type (D9), so the inheritance has no source or
     * destination. What is locked is unchanged: ONE edge, and the two can never disagree.
     */
    const src = readFileSync(join(__dirname, "bookVersions.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const i = src.indexOf("export const requestsByVersion");
    expect(i, "requestsByVersion is gone").toBeGreaterThan(-1);
    const body = src.slice(i, src.indexOf("\n};", i));
    expect(body).toContain("p.bookVersionId");
    expect(body).not.toContain("samplePagesVersionId");
    expect(body).not.toMatch(/samplesOfVersion|bookVersionOf/);
  });
});

describe("the panel's derived meta", () => {
  it("counts samples for a version, sample-pages only", () => {
    expect(samplesOfVersion("va", [sample("s1", "va"), sample("s2", "va", ComponentType.SYNOPSIS)])
      .map((m) => m.id)).toEqual(["s1"]);
  });
  it("agrees with its verbs, and states a zero", () => {
    expect(versionMeta(1, 1)).toEqual(["1 sample", "held by 1 agent"]);
    expect(versionMeta(0, 0)).toEqual(["0 samples", "held by 0 agents"]);
    expect(versionMeta(2, 4)).toEqual(["2 samples", "held by 4 agents"]);
  });
  it("labels the three kinds", () => {
    expect(KIND_LABEL).toEqual({ initial: "Initial", reordering: "Reordering", revision: "Revision" });
  });
  it("finds one by id, and nothing by an unknown one", () => {
    expect(bookVersionById([v("a")], "a")?.id).toBe("a");
    expect(bookVersionById([v("a")], "zz")).toBeNull();
    expect(bookVersionById([v("a")], undefined)).toBeNull();
  });
});

describe("D6 — versions never count against the manuscript limit", () => {
  it("counts manuscripts, whatever versions they carry", () => {
    const many = ms([v("a"), v("b"), v("c")]);
    expect(manuscriptsForTier([many])).toBe(1);
    expect(manuscriptsForTier([many, ms()])).toBe(2);
  });

  it("⚠️ and the LIVE gate is structurally incapable of counting them", () => {
    /* The claim is about the real gate, not about the identity above, so it is asserted where the
       gate lives: `manuscriptLimitError(plan, existingCount)` takes a COUNT OF MANUSCRIPTS and has
       no access to a manuscript at all — it could not reach a version if it wanted to. That is a
       stronger guarantee than a rule saying it must not, and the grep below keeps it that way. */
    expect(manuscriptLimitError(UserPlan.FREE, 1)).toBeTruthy();
    expect(manuscriptLimitError(UserPlan.FREE, 0)).toBeNull();
    const src = readFileSync(join(__dirname, "manuscripts.ts"), "utf8");
    expect(src).not.toContain("bookVersion");
  });
});
