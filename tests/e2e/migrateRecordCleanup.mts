/**
 * THE RECORD CLEAN-UP (clean-up pass, 28 Sep) — Nick: "the record only contains things that happened,
 * or honestly labelled reconstructions". One script, read-only unless a mode says apply, every apply
 * reversible from its backup, every count reported. Runs the APP'S OWN derivation
 * (`computeRecomputedFields`, src/lib/recomputeFields.ts) — never a copy.
 *
 *   npx tsx tests/e2e/migrateRecordCleanup.mts --audit                 read-only: every count below
 *   npx tsx tests/e2e/migrateRecordCleanup.mts --apply-1a              starting steps for empty logs
 *   npx tsx tests/e2e/migrateRecordCleanup.mts --apply-1b              reconstructed steps: remove / flag
 *   npx tsx tests/e2e/migrateRecordCleanup.mts --apply-1e              "Added" rows: gaps, duplicates, orphans
 *   npx tsx tests/e2e/migrateRecordCleanup.mts --revert <backup.json>
 *
 * ⚠️ STATUS AND DATES ON THE QUERY DOCUMENT NEVER MOVE: no mode recomputes, and 1a/1b re-read every
 * touched query and STOP (exit 1) if a stored status or date changed. 1b removes a step only where
 * the derivation with and without it agree on the status and every date; the rest are HELD for a
 * ruling and listed, never applied. Harness-scoped: it signs in as one account on dev.
 */
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { computeRecomputedFields, type RawActivityDoc, type RecomputedFields } from "../../src/lib/recomputeFields";
import { normalizeResultingStatus } from "../../src/lib/queryDerivation";

const { db, uid } = await harnessDb();
const arg = (k: string) => process.argv.includes(k);
const OUT = "reports/cleanup";
mkdirSync(OUT, { recursive: true });

const STATUS_KEY: Record<string, string> = {
  "Partial Requested": "partial_requested", "Full Requested": "full_requested", "Revise & Resubmit": "rr_requested",
  "Partial Sent": "partial_sent", "Full Sent": "full_sent", "Resubmitted": "resubmitted", "Rejected": "pass",
  "Offer": "offer", "Signed": "signed", "No Response": "closed_no_reply", "Withdrawn": "withdrawn",
};
const NOTE: Record<string, string> = {
  "Partial Requested": "Partial manuscript requested", "Partial Sent": "Partial manuscript sent",
  "Full Requested": "Full manuscript requested", "Full Sent": "Full manuscript sent",
  "Revise & Resubmit": "Revise & resubmit requested", "Offer": "Offer of representation received",
  "Rejected": "Rejection received", "Withdrawn": "Query withdrawn", "No Response": "Query closed — no response",
  "Resubmitted": "Resubmitted", "Signed": "Signed",
};
const DATE_FIELDS: (keyof RecomputedFields)[] = ["partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate", "responseReceivedAt", "rejectedDate", "lastStatusChange"];
const guarded = (q: Record<string, unknown>) => JSON.stringify(["status", ...DATE_FIELDS].map((k) => [k, q[k] ?? null]));
const isStatusBearing = (d: RawActivityDoc) => (normalizeResultingStatus(d.data.resultingStatus) ?? normalizeResultingStatus(d.data.type)) !== null;
const toMs = (v: unknown): number => {
  if (!v) return NaN;
  if (typeof v === "string") return Date.parse(v);
  const o = v as { seconds?: number; toDate?: () => Date };
  if (typeof o.seconds === "number") return o.seconds * 1000;
  if (typeof o.toDate === "function") return o.toDate().getTime();
  return NaN;
};
const diff = (a: RecomputedFields, b: RecomputedFields) =>
  (["status", "revisionRound", "hasAgentResponded", ...DATE_FIELDS] as (keyof RecomputedFields)[])
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((k) => `${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`);

/* ── read everything once ── */
const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown>, ref: d.ref }));
const logs = new Map<string, RawActivityDoc[]>();
for (const q of queries) logs.set(q.id, (await getDocs(collection(db, "users", uid, "queries", q.id, "activity"))).docs.map((d) => ({ id: d.id, data: d.data() })));

/* ── 1a · queries past Queried whose log holds no status step ── */
const empties = queries.filter((q) => q.data.status !== "Queried" && !(logs.get(q.id) ?? []).some(isStatusBearing));
const plan1a = empties.map((q) => {
  const status = String(q.data.status);
  const when = toMs(q.data.lastStatusChange) || toMs(q.data.dateSent) || Date.now();
  const id = `act-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${q.id}`;
  const step = { type: status, resultingStatus: status, createdAt: Timestamp.fromMillis(when), note: NOTE[status] ?? status, queryId: q.id, reconstructed: true, ...(STATUS_KEY[status] ? { eventKey: STATUS_KEY[status] } : {}) };
  const after = computeRecomputedFields([...(logs.get(q.id) ?? []), { id, data: step }]);
  return { q, id, step, datedFrom: toMs(q.data.lastStatusChange) ? "lastStatusChange" : "dateSent", afterStatus: after.status };
});

/* ── 1b · every reconstructed step (`act-status-…`) already in a log ── */
type B = { qid: string; stepId: string; stepStatus: string; storedStatus: string; kind: "only" | "remove" | "hold"; changes: string[]; flagged: boolean };
const plan1b: B[] = [];
for (const q of queries) {
  const log = logs.get(q.id) ?? [];
  for (const s of log.filter((d) => d.id.startsWith("act-status-"))) {
    const others = log.filter((d) => d.id !== s.id && isStatusBearing(d) && !d.id.startsWith("act-status-"));
    const stepStatus = String(normalizeResultingStatus(s.data.resultingStatus) ?? s.data.type);
    if (!others.length) { plan1b.push({ qid: q.id, stepId: s.id, stepStatus, storedStatus: String(q.data.status), kind: "only", changes: [], flagged: s.data.reconstructed === true }); continue; }
    const withIt = computeRecomputedFields(log);
    const without = computeRecomputedFields(log.filter((d) => d.id !== s.id));
    const changes = diff(withIt, without);
    plan1b.push({ qid: q.id, stepId: s.id, stepStatus, storedStatus: String(q.data.status), kind: changes.length ? "hold" : "remove", changes, flagged: s.data.reconstructed === true });
  }
}

/* ── 1e · "Added" rows in the global feed ── */
const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown>, ref: d.ref }));
const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as ({ id: string; name?: string; agency?: string; dateAdded?: string })[];
const manuscripts = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as ({ id: string; title?: string; createdDate?: string })[];
const agentAdded = feed.filter((a) => a.data.activityType === "Agent Added");
const msAdded = feed.filter((a) => a.data.activityType === "Manuscript Added");
/* attribute an agent row: its stable id first, then its current name (the old backfill's own test) */
const agentOf = (row: typeof feed[number]): string | null => {
  const m = /^act-added-agent-(.+)$/.exec(row.id);
  if (m) return agents.some((a) => a.id === m[1]) ? m[1] : `missing:${m[1]}`;
  const desc = String(row.data.description ?? "");
  const byName = agents.filter((a) => (a.name ?? "").trim() && desc.includes(String(a.name).trim()));
  if (byName.length === 1) return byName[0].id;
  if (byName.length > 1) return `ambiguous`;
  const byAgency = agents.filter((a) => (a.agency ?? "").trim() && desc.endsWith(` at ${String(a.agency).trim()}`) || desc === `Added ${String(a.agency ?? "").trim()}`);
  return byAgency.length ? `renamed-or-other:${byAgency.map((a) => a.id).join("|")}` : null;
};
const byAgent = new Map<string, typeof feed>();
const agentOrphans: typeof feed = [];
const agentHeld: { id: string; description: string; why: string }[] = [];
for (const r of agentAdded) {
  const a = agentOf(r);
  if (a === null || a.startsWith("missing:")) { agentOrphans.push(r); continue; }
  if (a === "ambiguous" || a.startsWith("renamed-or-other:")) {
    /* a renamed agent's original row: its agency matches, its name does not. Attributed only when
       exactly one agent at that agency already has a stable row — otherwise held, never guessed */
    const cands = a.startsWith("renamed-or-other:") ? a.slice(17).split("|") : [];
    if (cands.length === 1) { const k = cands[0]; byAgent.set(k, [...(byAgent.get(k) ?? []), r]); continue; }
    agentHeld.push({ id: r.id, description: String(r.data.description), why: a });
    continue;
  }
  byAgent.set(a, [...(byAgent.get(a) ?? []), r]);
}
const earliest = (rows: typeof feed) => [...rows].sort((x, y) => (toMs(x.data.date) || 0) - (toMs(y.data.date) || 0) || x.id.localeCompare(y.id))[0];
const agentDupes = [...byAgent.values()].flatMap((rows) => { const keep = earliest(rows); return rows.filter((r) => r.id !== keep.id); });
const byMs = new Map<string, typeof feed>();
const msOrphans: typeof feed = [];
for (const r of msAdded) {
  const mid = String(r.data.manuscriptId ?? "") || (/^act-added-ms-(.+)$/.exec(r.id)?.[1] ?? "");
  if (!manuscripts.some((m) => m.id === mid)) { msOrphans.push(r); continue; }
  byMs.set(mid, [...(byMs.get(mid) ?? []), r]);
}
const msDupes = [...byMs.values()].flatMap((rows) => { const keep = earliest(rows); return rows.filter((r) => r.id !== keep.id); });
/* 1d's gaps, filled ONCE here rather than by a runtime repair — and skipped, never dated "today",
   when the record has no add date */
const agentGaps = agents.filter((a) => !byAgent.has(a.id));
const msGaps = manuscripts.filter((m) => !byMs.has(m.id));

const report = {
  "1a": { queriesPastQueriedWithNoStep: empties.length, datedFromLastStatusChange: plan1a.filter((p) => p.datedFrom === "lastStatusChange").length, datedFromSent: plan1a.filter((p) => p.datedFrom === "dateSent").length, ids: plan1a.map((p) => p.q.id) },
  "1b": {
    reconstructedSteps: plan1b.length,
    onlyRecord_keepAndFlag: plan1b.filter((b) => b.kind === "only").length,
    besideRealEvents: plan1b.filter((b) => b.kind !== "only").length,
    besideReal_removeChangesNothing: plan1b.filter((b) => b.kind === "remove").map((b) => `${b.qid} (${b.stepStatus})`),
    besideReal_HELD: plan1b.filter((b) => b.kind === "hold").map((b) => ({ query: b.qid, currentStatus: b.storedStatus, step: b.stepStatus, ifRemoved: b.changes })),
  },
  "1e": {
    agentAddedRows: agentAdded.length, manuscriptAddedRows: msAdded.length,
    agentDuplicates: agentDupes.map((r) => `${r.id} · ${r.data.description}`),
    agentOrphans: agentOrphans.map((r) => `${r.id} · ${r.data.description}`),
    agentHeldUnattributable: agentHeld,
    manuscriptDuplicates: msDupes.map((r) => `${r.id} · ${r.data.description}`),
    manuscriptOrphans: msOrphans.map((r) => `${r.id} · ${r.data.description}`),
    leftForThePackagesSession: [...agentOrphans, ...msOrphans].filter((x) => x.id.includes("pkg21")).map((r) => r.id),
    agentGapsToFill: agentGaps.filter((a) => a.dateAdded).map((a) => `${a.id} · ${a.name ?? a.agency}`), agentGapsSkippedNoDate: agentGaps.filter((a) => !a.dateAdded).map((a) => a.id),
    manuscriptGapsToFill: msGaps.filter((m) => m.createdDate).length, manuscriptGapsSkippedNoDate: msGaps.filter((m) => !m.createdDate).map((m) => m.id),
  },
};
console.log(JSON.stringify(report, null, 1));
if (arg("--audit")) { writeFileSync(`${OUT}/audit-${uid}.json`, JSON.stringify(report, null, 1)); process.exit(0); }

/* ── apply / revert ── */
type Change = { path: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null };
const save = (name: string, changes: Change[]) => {
  const file = `${OUT}/backup-${name}-${uid}-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify({ uid, at: new Date().toISOString(), mode: name, changes }, (k, v) => (v && typeof v === "object" && typeof v.seconds === "number" && typeof v.nanoseconds === "number" ? { __ts: v.seconds * 1000 + Math.round(v.nanoseconds / 1e6) } : v), 1));
  console.log(`backup: ${file}`);
};
const revive = (o: unknown): unknown => {
  if (Array.isArray(o)) return o.map(revive);
  if (o && typeof o === "object") {
    if (typeof (o as { __ts?: number }).__ts === "number") return Timestamp.fromMillis((o as { __ts: number }).__ts);
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, revive(v)]));
  }
  return o;
};
const guardQueries = async (ids: string[], before: Map<string, string>) => {
  const moved: string[] = [];
  for (const id of ids) { const d = (await getDoc(doc(db, "users", uid, "queries", id))).data() ?? {}; if (guarded(d) !== before.get(id)) moved.push(id); }
  if (moved.length) { console.error(`STOP: a stored status or date moved on ${moved.join(", ")}. Revert with the backup above.`); process.exit(1); }
};

const ri = process.argv.indexOf("--revert");
if (ri > 0) {
  const plan = JSON.parse(readFileSync(process.argv[ri + 1], "utf8"));
  if (plan.uid !== uid) throw new Error(`Backup is for ${plan.uid}, signed in as ${uid}.`);
  for (const c of plan.changes as Change[]) {
    const ref = doc(db, c.path);
    if (c.before) await setDoc(ref, revive(c.before) as Record<string, unknown>); else await deleteDoc(ref);
  }
  console.log(`reverted ${plan.changes.length} (${plan.mode})`);
  process.exit(0);
}

if (arg("--apply-1a")) {
  const before = new Map(plan1a.map((p) => [p.q.id, guarded(p.q.data)]));
  const changes: Change[] = plan1a.map((p) => ({ path: `users/${uid}/queries/${p.q.id}/activity/${p.id}`, before: null, after: p.step }));
  save("1a", changes);
  for (const p of plan1a) await setDoc(doc(db, "users", uid, "queries", p.q.id, "activity", p.id), p.step);
  await guardQueries(plan1a.map((p) => p.q.id), before);
  console.log(`1a: wrote ${plan1a.length} reconstructed starting step(s); no stored status or date moved`);
  process.exit(0);
}

if (arg("--apply-1b")) {
  const touched = [...new Set(plan1b.filter((b) => b.kind !== "hold").map((b) => b.qid))];
  const before = new Map(touched.map((id) => [id, guarded(queries.find((q) => q.id === id)!.data)]));
  const changes: Change[] = [];
  for (const b of plan1b) {
    if (b.kind === "hold") continue;
    const data = logs.get(b.qid)!.find((d) => d.id === b.stepId)!.data;
    const path = `users/${uid}/queries/${b.qid}/activity/${b.stepId}`;
    if (b.kind === "remove") changes.push({ path, before: data, after: null });
    else if (!b.flagged) changes.push({ path, before: data, after: { ...data, reconstructed: true, ...(STATUS_KEY[b.stepStatus] && !data.eventKey ? { eventKey: STATUS_KEY[b.stepStatus] } : {}) } });
  }
  save("1b", changes);
  for (const c of changes) { if (c.after) await setDoc(doc(db, c.path), c.after); else await deleteDoc(doc(db, c.path)); }
  await guardQueries(touched, before);
  console.log(`1b: removed ${changes.filter((c) => !c.after).length}, flagged ${changes.filter((c) => c.after).length}, held ${plan1b.filter((b) => b.kind === "hold").length}; no stored status or date moved`);
  process.exit(0);
}

if (arg("--apply-1e")) {
  const changes: Change[] = [];
  /* ⚠️ THE PACKAGES SESSION'S `pkg21-` DATA IS NEVER TOUCHED (standing rule) — its orphaned rows are
     reported and left for that session */
  for (const r of [...agentDupes, ...agentOrphans, ...msDupes, ...msOrphans].filter((x) => !x.id.includes("pkg21"))) changes.push({ path: `users/${uid}/activities/${r.id}`, before: r.data, after: null });
  for (const a of agentGaps.filter((x) => x.dateAdded)) {
    const name = String(a.name ?? "").trim();
    changes.push({ path: `users/${uid}/activities/act-added-agent-${a.id}`, before: null, after: { id: `act-added-agent-${a.id}`, userId: uid, activityType: "Agent Added", description: name ? `Added ${name} at ${a.agency}` : `Added ${a.agency}`, manuscriptId: "", queryId: "", date: a.dateAdded, details: "" } });
  }
  for (const m of msGaps.filter((x) => x.createdDate)) {
    changes.push({ path: `users/${uid}/activities/act-added-ms-${m.id}`, before: null, after: { id: `act-added-ms-${m.id}`, userId: uid, activityType: "Manuscript Added", description: `Added new title ${m.title} to your manuscripts`, manuscriptId: m.id, queryId: "", date: m.createdDate, details: "" } });
  }
  save("1e", changes);
  for (const c of changes) { if (c.after) await setDoc(doc(db, c.path), c.after); else await deleteDoc(doc(db, c.path)); }
  console.log(`1e: removed ${changes.filter((c) => !c.after).length}, filled ${changes.filter((c) => c.after).length}`);
  process.exit(0);
}
console.error("Name a mode: --audit, --apply-1a, --apply-1b, --apply-1e, or --revert <file>.");
process.exit(1);
