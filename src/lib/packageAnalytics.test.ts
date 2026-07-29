/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { overdueSends, sentToRows, rankMaterialsByReplies, recommendations, weeksSinceSent, composition, compositionWidths, compositionLabel } from "./packageAnalytics";
import { Query, QueryStatus, SubmissionMethod, SubmissionPackage, ManuscriptVersion, Agent, ComponentType } from "../types";

const NOW = Date.parse("2026-07-28T00:00:00.000Z");
const DAY = 86400000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString().slice(0, 10);

const q = (over: Partial<Query>): Query =>
  ({
    id: "q", userId: "u", manuscriptId: "m", agentId: "a1", packageId: "p",
    status: QueryStatus.QUERIED, dateSent: ago(10), personalisationNotes: "",
    sendMethod: SubmissionMethod.EMAIL, ...over,
  }) as Query;

const pkg = (over: Partial<SubmissionPackage>): SubmissionPackage =>
  ({
    id: "p", manuscriptId: "m", userId: "u", packageName: "P",
    queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "",
    status: "Active", createdDate: "2026-01-01", ...over,
  }) as SubmissionPackage;

const ver = (id: string, type: ComponentType, name: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m", userId: "u", componentType: type, versionName: name, fileAttached: false, createdDate: "2026-01-01" }) as ManuscriptVersion;

const agent = (over: Partial<Agent>): Agent =>
  ({ id: "a1", name: "Hartley", agency: "Hartley Lit", responseTimeWeeks: 8, noResponseMeansNo: false, ...over }) as Agent;

describe("overdueSends", () => {
  const agents = [agent({})]; // 8-week window + 14 days' grace ⇒ overdue past ~70 days

  it("uses taskPrecedence, so a send inside the window plus grace is not overdue", () => {
    expect(overdueSends([q({ dateSent: ago(60) })], agents, NOW)).toHaveLength(0);
    expect(overdueSends([q({ dateSent: ago(100) })], agents, NOW)).toHaveLength(1);
  });

  it("never flags a send that has already been answered", () => {
    const replied = q({ dateSent: ago(200), status: QueryStatus.REJECTED, hasAgentResponded: true });
    expect(overdueSends([replied], agents, NOW)).toHaveLength(0);
  });

  it("stays silent when the agent has no recorded reply window — nothing to be late against", () => {
    expect(overdueSends([q({ dateSent: ago(400) })], [agent({ responseTimeWeeks: 0 })], NOW)).toHaveLength(0);
  });

  it("reports whole weeks out, longest first", () => {
    const rows = overdueSends([q({ id: "a", dateSent: ago(100) }), q({ id: "b", dateSent: ago(200) })], agents, NOW);
    expect(rows.map((r) => r.query.id)).toEqual(["b", "a"]);
    expect(rows[0].weeksOut).toBe(28);
    expect(weeksSinceSent(q({ dateSent: undefined }), NOW)).toBe(0);
  });
});

describe("sentToRows", () => {
  it("orders requests, then replies, then waiting — and flags the overdue waiter", () => {
    const agents = [agent({ id: "a1", name: "Hartley" }), agent({ id: "a2", name: "Vane" }), agent({ id: "a3", name: "Marsh" })];
    const queries = [
      q({ id: "w", agentId: "a3", dateSent: ago(200) }),
      q({ id: "r", agentId: "a2", status: QueryStatus.REJECTED, hasAgentResponded: true }),
      q({ id: "req", agentId: "a1", status: QueryStatus.FULL_REQUESTED }),
    ];
    const rows = sentToRows("p", queries, agents, NOW);
    expect(rows.map((r) => r.state)).toEqual(["request", "replied", "waiting"]);
    expect(rows[2]).toMatchObject({ agentName: "Marsh", overdue: true });
  });
});

describe("recommendations", () => {
  const strong = ver("v-strong", ComponentType.SYNOPSIS, "Character-led synopsis");
  const weak = ver("v-weak", ComponentType.SYNOPSIS, "One-page synopsis");
  const letter = ver("v-l", ComponentType.QUERY_LETTER, "Letter");
  const pStrong = pkg({ id: "pS", packageName: "Strong", synopsisVersionId: "v-strong", queryLetterVersionId: "v-l" });
  const pWeak = pkg({ id: "pW", packageName: "Weak", synopsisVersionId: "v-weak", queryLetterVersionId: "v-l" });
  // Strong: 4 sends, 4 replies (100%). Weak: 4 sends, 1 reply (25%). Both clear MIN_SENDS_FOR_CLAIM.
  const queries = [
    ...Array.from({ length: 4 }, (_, i) => q({ id: `s${i}`, packageId: "pS", status: QueryStatus.REJECTED, hasAgentResponded: true, dateSent: ago(30) })),
    q({ id: "w0", packageId: "pW", status: QueryStatus.REJECTED, hasAgentResponded: true, dateSent: ago(30) }),
    ...Array.from({ length: 3 }, (_, i) => q({ id: `w${i + 1}`, packageId: "pW", dateSent: ago(30) })),
  ];
  const base = { versions: [strong, weak, letter], packages: [pStrong, pWeak], queries, agents: [agent({})], now: NOW };

  it("names the strongest material and a package that doesn't have it yet", () => {
    const [first] = recommendations(base);
    expect(first.id).toBe("strength");
    expect(first.body).toContain("Character-led synopsis");
    expect(first.action).toBe("open-package");
    expect(first.packageId).toBe("pW");
  });

  it("raises the laggard only when a same-type replacement beats it by a real margin", () => {
    const laggard = recommendations(base).find((r) => r.id === "laggard");
    expect(laggard?.body).toContain("One-page synopsis");
    expect(laggard?.action).toBe("swap"); // no flow built — the view renders it as coming-soon

    // Narrow the gap below the 15-point margin and the card must disappear rather than nag.
    const closer = queries.map((x) => (x.id.startsWith("w") && x.id !== "w0" ? { ...x, status: QueryStatus.REJECTED, hasAgentResponded: true } : x));
    expect(recommendations({ ...base, queries: closer }).find((r) => r.id === "laggard")).toBeUndefined();
  });

  it("only suggests a nudge when a send is genuinely past the agent's window", () => {
    expect(recommendations(base).find((r) => r.id === "waiting")).toBeUndefined();
    const old = { ...base, queries: queries.map((x) => (x.id === "w1" ? { ...x, dateSent: ago(300) } : x)) };
    expect(recommendations(old).find((r) => r.id === "waiting")?.action).toBe("queries");
  });

  it("returns nothing rather than padding when no material clears the sample threshold", () => {
    const thin = { ...base, queries: [q({ id: "one", packageId: "pS", status: QueryStatus.REJECTED, hasAgentResponded: true })] };
    expect(recommendations(thin)).toEqual([]);
  });

  it("ranks materials by reply rate and ignores any that never travelled", () => {
    const ranked = rankMaterialsByReplies(base.versions, base.packages, base.queries);
    expect(ranked.map((m) => m.version.id)).toEqual(["v-strong", "v-l", "v-weak"]);
  });
});

describe("composition — the three-part bar", () => {
  const agents = [agent({})]; // 8-week window ⇒ nudge past ~70d, close past max(2×8×7, 90) = 112d

  it("counts a reply as replied, whatever its outcome", () => {
    const qs = [
      q({ id: "rej", status: QueryStatus.REJECTED, hasAgentResponded: true }),
      q({ id: "req", status: QueryStatus.FULL_REQUESTED }),
    ];
    expect(composition(qs, agents, NOW)).toMatchObject({ sent: 2, replied: 2, waiting: 0, noReply: 0, requests: 1 });
  });

  it("puts a nudge-due send in STILL WAITING, not no-reply — the divergence from overdueSends", () => {
    const nudgeDue = q({ id: "n", dateSent: ago(90) }); // past deadline+grace, short of close
    expect(composition([nudgeDue], agents, NOW)).toMatchObject({ waiting: 1, noReply: 0 });
    // …while the ⚠ marker DOES fire on the very same send. Both are correct; they answer
    // different questions. This test exists so the two are never "fixed" into agreement.
    expect(overdueSends([nudgeDue], agents, NOW)).toHaveLength(1);
  });

  it("only calls it no-reply once replyTask says close", () => {
    expect(composition([q({ id: "c", dateSent: ago(200) })], agents, NOW)).toMatchObject({ waiting: 0, noReply: 1 });
  });

  it("treats stated silence as an answer — noResponseMeansNo closes without ever nudging", () => {
    const silent = [agent({ noResponseMeansNo: true })];
    expect(composition([q({ id: "s", dateSent: ago(90) })], silent, NOW)).toMatchObject({ waiting: 0, noReply: 1 });
  });

  it("never calls a send with no recorded reply window overdue", () => {
    const noWindow = [agent({ responseTimeWeeks: 0 })];
    expect(composition([q({ id: "w", dateSent: ago(900) })], noWindow, NOW)).toMatchObject({ waiting: 1, noReply: 0 });
  });

  it("gives widths that sum to 100, and a label carrying the denominator", () => {
    const c = composition([
      q({ id: "a", status: QueryStatus.REJECTED, hasAgentResponded: true }),
      q({ id: "b", status: QueryStatus.REJECTED, hasAgentResponded: true }),
      q({ id: "c", dateSent: ago(90) }),
      q({ id: "d", dateSent: ago(300) }),
    ], agents, NOW);
    const w = compositionWidths(c);
    expect(Math.round(w.replied + w.waiting + w.noReply)).toBe(100);
    expect(w.replied).toBe(50);
    expect(compositionLabel(c)).toBe("2/4");
  });

  it("is all-zero on an empty set rather than dividing by nothing", () => {
    expect(compositionWidths(composition([], agents, NOW))).toEqual({ replied: 0, waiting: 0, noReply: 0 });
  });
});
