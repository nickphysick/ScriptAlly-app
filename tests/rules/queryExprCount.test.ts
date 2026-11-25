/**
 * Controls: entry v1 · close-out 4 — HOW MANY EXPRESSIONS THE QUERY UPDATE RULE EVALUATES, measured, not reasoned.
 *
 * A MEASUREMENT, NOT A LOCK: skipped unless `SA_EXPR_COUNT=1`, so the rules suite never runs it. It writes one query,
 * reads the emulator's rule-coverage report, makes ONE update, reads the report again, and takes the difference: the
 * evaluation counts of that one request, per source line of firestore.rules. Two documents: the smallest a writer
 * makes (the required fields only) and the fullest (every optional field `isValidQuery` names, present and valid),
 * because `isValidQuery` costs more for a field that is there than for one that is absent.
 *
 * Writes reports/controls-entry-v1/ledger/expr-count.json. The coverage counts are the emulator's own per-expression
 * evaluation counts; Firestore's 1,000 limit is on the same unit, but production may count slightly differently, so
 * the figure is "as best measured", not a guarantee.
 */
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, "../../firestore.rules");
const RULES = readFileSync(RULES_PATH, "utf8");
const PROJECT = "demo-scriptally-expr";
const HOST = "127.0.0.1", PORT = 8080;
const U = "expr-writer";
let env: RulesTestEnvironment;

type Node = { sourcePosition?: { line?: number; column?: number; currentOffset?: number; endOffset?: number }; values?: { count?: number }[]; children?: Node[] };
/** every expression node's evaluation count, keyed by its source offset */
async function coverage(): Promise<Map<string, { line: number; n: number; text: string }>> {
  const r = await fetch(`http://${HOST}:${PORT}/emulator/v1/projects/${PROJECT}:ruleCoverage`);
  const j = (await r.json()) as { report?: Node[] };
  const out = new Map<string, { line: number; n: number; text: string }>();
  const walk = (ns: Node[] | undefined) => {
    for (const n of ns ?? []) {
      const p = n.sourcePosition ?? {};
      const key = `${p.line}:${p.column}:${p.currentOffset}:${p.endOffset}`;
      const c = (n.values ?? []).reduce((s, v) => s + (v.count ?? 0), 0);
      const text = p.currentOffset != null && p.endOffset != null ? RULES.slice(p.currentOffset, p.endOffset).replace(/\s+/g, " ").slice(0, 90) : "";
      const was = out.get(key);
      out.set(key, { line: p.line ?? 0, n: (was?.n ?? 0) + c, text });
      walk(n.children);
    }
  };
  walk(j.report);
  return out;
}
const diff = (a: Awaited<ReturnType<typeof coverage>>, b: Awaited<ReturnType<typeof coverage>>) => {
  const rows: { key: string; line: number; n: number; text: string }[] = [];
  for (const [k, v] of b) { const d = v.n - (a.get(k)?.n ?? 0); if (d > 0) rows.push({ key: k, line: v.line, n: d, text: v.text }); }
  return rows;
};

/* the fullest valid query: one value per optional clause of isValidQuery, chosen from the clause's own check */
function fullest(): Record<string, unknown> {
  const body = RULES.slice(RULES.indexOf("function isValidQuery("), RULES.indexOf("}", RULES.indexOf("&& (data.get('agentRecheckOn'")));
  const out: Record<string, unknown> = {};
  for (const m of body.matchAll(/\(data\.get\('(\w+)', null\) == null \|\| ([^\n]*)\);?(?=\n|$)/g)) {
    const [, f, check] = m;
    const inList = check.match(/in \['([^']+)'/);
    out[f] = inList ? inList[1]
      : /isValidId/.test(check) ? "v1"
      : /is list \|\| .* is map/.test(check) || /is list/.test(check) ? []
      : /is bool/.test(check) ? true
      : /is int/.test(check) && !/is string/.test(check) ? 1
      : "2026-11-24";
  }
  return out;
}
const REQUIRED = { id: "q1", userId: U, manuscriptId: "m1", agentId: "a1", packageId: "", status: "Queried", sendMethod: "Email" };

describe.skipIf(!process.env.SA_EXPR_COUNT)("the query update rule's expression count", () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: RULES, host: HOST, port: PORT } });
  });
  afterAll(async () => { await env.cleanup(); });
  const me = () => env.authenticatedContext(U).firestore();
  const report: Record<string, unknown> = {};

  const settle = async () => { let last = -1; for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 250)); const n = [...(await coverage()).values()].reduce((s, v) => s + v.n, 0); if (n === last) return; last = n; } };
  /* Rules budget v1: recomputeQuery's patch (src/lib/recomputeQuery.ts) — the update every status change sends, and
     the widest the app writes routinely — with all eleven of its keys changed on the fullest query. */
  const REMINDER = { nudgeDate: "2026-12-04", nudgeSetAt: "2026-11-24T12:00:00.000Z" };
  const RECOMPUTE = { status: "Full Sent", partialRequestedDate: "2026-11-01", partialSentDate: "2026-11-02", fullRequestedDate: "2026-11-03",
    fullSentDate: "2026-11-04", revisionRound: 2, hasAgentResponded: false, responseReceivedAt: "2026-11-05", rejectedDate: "2026-11-06", lastStatusChange: "2026-11-07" };
  for (const [label, docData, patch] of [["smallest", REQUIRED, REMINDER], ["smallest (again)", REQUIRED, REMINDER], ["fullest", { ...REQUIRED, ...fullest() }, REMINDER], ["fullest (again)", { ...REQUIRED, ...fullest() }, REMINDER],
    ["fullest, recomputeQuery's patch", { ...REQUIRED, ...fullest() }, RECOMPUTE], ["fullest, one field (rrNotes)", { ...REQUIRED, ...fullest() }, { rrNotes: "changed" }]] as const) {
    it(`${label}: one update`, async () => {
      const path = `users/${U}/queries/q-${label.replace(/\W+/g, "-")}`;
      /* seeded with the rules off, so only the update is counted */
      await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), { ...docData, id: "q-x" }); });
      await settle();
      const before = await coverage();
      const outcome = await updateDoc(doc(me(), path), patch as Record<string, unknown>).then(() => "allowed", (e) => `denied: ${String((e as Error).message).slice(0, 200)}`);
      await settle();
      const after = await coverage();
      const rows = diff(before, after);
      const total = rows.reduce((s, r) => s + r.n, 0);
      const fn = (from: string, to: string, after = 0) => { const i = RULES.indexOf(from, after); if (i < 0) return null; const a = RULES.slice(0, i).split("\n").length, b = RULES.slice(0, RULES.indexOf(to, i)).split("\n").length; return rows.filter((r) => r.line >= a && r.line <= b).reduce((s, r) => s + r.n, 0); };
      const byLine = new Map<number, number>();
      for (const r of rows) byLine.set(r.line, (byLine.get(r.line) ?? 0) + r.n);
      const lines = RULES.split("\n");
      report[label] = {
        outcome,
        fields: Object.keys(docData).length,
        changedKeys: Object.keys(patch).length,
        total,
        isValidQuery: fn("function isValidQuery(", "\n    }\n"),
        /* the update-only validator and the four checks it calls (Rules budget v1); null before that change */
        isValidQueryChange: fn("function isValidQueryStatus(", "function isValidActivityNested("),
        updateRule: fn("allow update: if isOwner(userId) && isValidId(queryId)", "match /activity/{activityId}", RULES.indexOf("match /queries/{queryId}")),
        topLines: [...byLine].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([l, n]) => ({ line: l, n, src: lines[l - 1].trim().slice(0, 110) })),
      };
      console.log(`  ${label}: ${outcome} · ${total} expressions over ${Object.keys(docData).length} fields`, JSON.stringify(report[label]).slice(0, 600));
      expect(total).toBeGreaterThan(0);
    });
  }
  /* THE THRESHOLD: the same update, on a query with the first k optional fields present (in the rule's order), for
     every k. The first k that is denied is where the limit bites; read twice, in the rule's order and reversed. */
  for (const order of ["rule order", "reversed"] as const) {
    it(`threshold, ${order}: how many present fields before an update is denied`, async () => {
      const all = Object.entries(fullest());
      const fields = order === "reversed" ? [...all].reverse() : all;
      const outcomes: { k: number; allowed: boolean; last: string }[] = [];
      for (let k = 0; k <= fields.length; k++) {
        const path = `users/${U}/queries/t-${order === "reversed" ? "r" : "o"}-${k}`;
        await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), { ...REQUIRED, id: "q-x", ...Object.fromEntries(fields.slice(0, k)) }); });
        const allowed = await updateDoc(doc(me(), path), { nudgeDate: "2026-12-04", nudgeSetAt: "2026-11-24T12:00:00.000Z" }).then(() => true, () => false);
        outcomes.push({ k, allowed, last: k ? fields[k - 1][0] : "" });
      }
      const firstDenied = outcomes.find((o) => !o.allowed);
      const deniedAfter = firstDenied ? outcomes.filter((o) => o.k >= firstDenied.k && o.allowed).map((o) => o.k) : [];
      report[`threshold (${order})`] = { optionalFields: fields.length, firstDeniedAt: firstDenied?.k ?? null, firstDeniedField: firstDenied?.last ?? null, allowedAgainAfterFirstDenial: deniedAfter };
      console.log(`  threshold (${order}):`, JSON.stringify(report[`threshold (${order})`]));
      expect(outcomes.length).toBe(fields.length + 1);
    });
  }
  /* Rules budget v1 — the other two writes a full query meets: CREATING it whole, and an update that REWRITES every
     optional field at once (each value changed, so every key is in affectedKeys — the worst an update can cost). */
  it("create: the fullest query, written whole", async () => {
    const path = `users/${U}/queries/c-full`;
    const outcome = await setDoc(doc(me(), path), { ...REQUIRED, id: "c-full", ...fullest() }).then(() => "allowed", (e) => `denied: ${String((e as Error).message).slice(0, 200)}`);
    report["create (fullest)"] = { outcome, fields: Object.keys(REQUIRED).length + Object.keys(fullest()).length };
    console.log("  create (fullest):", outcome);
    expect(outcome).toBeTruthy();
  });
  it("update: every optional field changed at once, on the fullest query", async () => {
    const path = `users/${U}/queries/u-all`;
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), { ...REQUIRED, id: "q-x", ...fullest() }); });
    const changed: Record<string, unknown> = {};
    for (const [f, v] of Object.entries(fullest())) changed[f] = typeof v === "string" && v.startsWith("2026-") ? "2026-11-25" : v === true ? false : v === 1 ? 2 : Array.isArray(v) ? ["x"] : v;
    const keys = Object.keys(changed).filter((k) => JSON.stringify(changed[k]) !== JSON.stringify((fullest() as Record<string, unknown>)[k]));
    const outcome = await updateDoc(doc(me(), path), changed).then(() => "allowed", (e) => `denied: ${String((e as Error).message).slice(0, 200)}`);
    report["update (every optional field changed)"] = { outcome, changedKeys: keys.length };
    console.log("  update (all changed):", outcome, keys.length, "keys changed");
    expect(keys.length).toBeGreaterThan(40);
  });
  /* Rules budget v1: on the fullest query, how many keys can ONE update change before it is denied? (the cost now
     grows with the keys an update changes, not the keys a query holds) */
  it("threshold: changed keys on the fullest query", async () => {
    const entries = Object.entries(fullest());
    const outcomes: { k: number; allowed: boolean }[] = [];
    for (let k = 1; k <= entries.length; k++) {
      const path = `users/${U}/queries/ck-${k}`;
      await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), { ...REQUIRED, id: "q-x", ...fullest() }); });
      const patch = Object.fromEntries(entries.slice(0, k).map(([f, v]) => [f, typeof v === "string" && v.startsWith("2026-") ? "2026-11-25" : v === true ? false : v === 1 ? 2 : Array.isArray(v) ? ["x"] : f === "bookVersionId" ? "v2" : `${v}`]));
      const allowed = await updateDoc(doc(me(), path), patch).then(() => true, () => false);
      outcomes.push({ k, allowed });
    }
    const firstDenied = outcomes.find((o) => !o.allowed)?.k ?? null;
    report["threshold (changed keys, fullest query)"] = { firstDeniedAt: firstDenied, allowedUpTo: firstDenied ? firstDenied - 1 : entries.length };
    console.log("  changed-keys threshold:", JSON.stringify(report["threshold (changed keys, fullest query)"]));
    expect(outcomes.length).toBe(entries.length);
  });
  it("writes the ledger", () => {
    const dir = resolve(__dirname, "../..", process.env.SA_EXPR_LEDGER ?? "reports/controls-entry-v1/ledger");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "expr-count.json"), JSON.stringify(report, null, 1));
  });
});
