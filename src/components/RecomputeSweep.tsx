/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ TEMPORARY — DELETE THIS FILE AND ITS ROUTE ONCE THE SWEEP HAS BEEN RUN. ⚠️
 *
 * One-off recompute sweep (#/recompute-sweep, DEV builds only).
 *
 * WHY IT EXISTS: `responseReceivedAt`, `rejectedDate` and `lastStatusChange` became DERIVED
 * fields (Tiers 1 and 3), on the stated assumption that records heal on their next recompute.
 * That assumption holds for live queries and fails for CLOSED ones — a rejected query is never
 * touched again, so it would never gain the `rejectedDate` the package reply-time maths reads.
 * Those are precisely the records the fix was for. They need one deliberate recompute.
 *
 * NOTHING RUNS AUTOMATICALLY. There is no mount-effect write, no localStorage "run once" guard,
 * no cleverness: the only work this file performs is what a button press starts. (The one
 * on-load action is an aggregate COUNT — no document reads, no writes.) The deleted
 * runTimelineCleanup, which silently rewrote everyone's activity log on page load, is why.
 *
 * OWNER-SCOPED BY CONSTRUCTION: it uses the app's own auth + client SDK, so the security rules
 * confine every read and write to the SIGNED-IN USER'S OWN queries. It cannot heal another
 * account's data — that is a rules guarantee, not a limitation to engineer around.
 *
 * SINGLE DERIVATION: the live `recomputeQuery` performs every write; the dry run previews via
 * `computeRecomputedFields`, the pure export it shares. Derivation is never reimplemented here.
 */
import React, { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { computeRecomputedFields, recomputeQuery, RecomputedFields } from "../lib/recomputeQuery";
import { getActivityTime } from "../lib/queryDerivation";
import { agentPrimary } from "../lib/agentDisplay";

/** Pause between writes — correctness over speed; keeps the sweep off Firestore's throttle. */
const WRITE_PAUSE_MS = 120;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The ten derived keys, and which of them are dates (compared by instant, not by shape). */
const FIELD_KEYS: (keyof RecomputedFields)[] = [
  "status", "partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate",
  "revisionRound", "hasAgentResponded", "responseReceivedAt", "rejectedDate", "lastStatusChange",
];
const DATE_KEYS = new Set<keyof RecomputedFields>([
  "partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate",
  "responseReceivedAt", "rejectedDate", "lastStatusChange",
]);

interface FieldDiff { key: string; stored: string; proposed: string }
interface DryRow { id: string; agent: string; status: string; diffs: FieldDiff[] }
interface SweepRow { id: string; agent: string; ok: boolean; error?: string }

const shortDate = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

/** Display a stored value of any shape (Timestamp | ISO string | number | bool | absent). */
function show(value: unknown, isDate: boolean): string {
  if (value === undefined || value === null) return "—";
  if (isDate) {
    const ms = getActivityTime(value);
    return ms ? shortDate(ms) : "(unreadable)";
  }
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return String(value);
}

/**
 * Would this field change? Dates compare by INSTANT — a stored Firestore Timestamp and the
 * derived ISO string can denote the same moment, and reporting that as a change would drown the
 * real ones. Presence/absence always counts. (A same-instant Timestamp→ISO rewrite still happens
 * on the live sweep; the rules accept both shapes. It is not a data change, so it is not listed.)
 */
function diffOf(key: keyof RecomputedFields, stored: unknown, proposed: string | number | boolean | null): FieldDiff | null {
  const isDate = DATE_KEYS.has(key);
  const storedAbsent = stored === undefined || stored === null;
  const proposedAbsent = proposed === null;
  if (storedAbsent && proposedAbsent) return null;

  if (!storedAbsent && !proposedAbsent) {
    const same = isDate
      ? getActivityTime(stored) === getActivityTime(proposed)
      : stored === proposed;
    if (same) return null;
  }
  return {
    key,
    stored: show(stored, isDate),
    proposed: proposedAbsent ? "— (cleared)" : show(proposed, isDate),
  };
}

export const RecomputeSweep: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("unknown");
  const [queryCount, setQueryCount] = useState<number | null>(null);
  const [loadErr, setLoadErr] = useState("");

  const [busy, setBusy] = useState<null | "dry" | "sweep">(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dryRows, setDryRows] = useState<DryRow[] | null>(null);
  const [dryScanned, setDryScanned] = useState(0);
  const [sweepRows, setSweepRows] = useState<SweepRow[] | null>(null);

  // The ONLY on-load work: identify the user and COUNT their queries (an aggregate query — no
  // document reads, no writes). Everything else waits for a button.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUid(user?.uid ?? null);
      setProjectId((db as unknown as { app?: { options?: { projectId?: string } } }).app?.options?.projectId ?? "unknown");
      if (!user) { setQueryCount(null); return; }
      try {
        const snap = await getCountFromServer(collection(db, "users", user.uid, "queries"));
        setQueryCount(snap.data().count);
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : String(e));
      }
    });
    return () => unsub();
  }, []);

  /** Agent id → display name, for readable rows. One read of the user's own agents. */
  const loadAgentNames = async (userId: string): Promise<Map<string, string>> => {
    const snap = await getDocs(collection(db, "users", userId, "agents"));
    const names = new Map<string, string>();
    snap.docs.forEach((d) => names.set(d.id, agentPrimary(d.data() as never) || "—"));
    return names;
  };

  /** DRY RUN — reads only. Computes what the sweep would write and reports the differences. */
  const runDry = async () => {
    if (!uid || busy) return;
    setBusy("dry");
    setDryRows(null);
    setSweepRows(null);
    setDryScanned(0);
    try {
      const [qSnap, names] = await Promise.all([
        getDocs(collection(db, "users", uid, "queries")),
        loadAgentNames(uid),
      ]);
      setProgress({ done: 0, total: qSnap.docs.length });
      const rows: DryRow[] = [];
      for (let i = 0; i < qSnap.docs.length; i++) {
        const qDoc = qSnap.docs[i];
        const stored = qDoc.data() as Record<string, unknown>;
        const actSnap = await getDocs(collection(db, "users", uid, "queries", qDoc.id, "activity"));
        const proposed = computeRecomputedFields(actSnap.docs.map((d) => ({ id: d.id, data: d.data() })));
        const diffs = FIELD_KEYS
          .map((k) => diffOf(k, stored[k], proposed[k] as string | number | boolean | null))
          .filter((d): d is FieldDiff => d !== null);
        if (diffs.length) {
          rows.push({
            id: qDoc.id,
            agent: names.get(String(stored.agentId ?? "")) ?? "—",
            status: String(stored.status ?? "—"),
            diffs,
          });
        }
        setProgress({ done: i + 1, total: qSnap.docs.length });
      }
      setDryScanned(qSnap.docs.length);
      setDryRows(rows);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  /** LIVE SWEEP — recomputes every query, sequentially. A failure is recorded, never fatal. */
  const runSweep = async () => {
    if (!uid || busy) return;
    setBusy("sweep");
    setSweepRows(null);
    try {
      const [qSnap, names] = await Promise.all([
        getDocs(collection(db, "users", uid, "queries")),
        loadAgentNames(uid),
      ]);
      setProgress({ done: 0, total: qSnap.docs.length });
      const rows: SweepRow[] = [];
      for (let i = 0; i < qSnap.docs.length; i++) {
        const qDoc = qSnap.docs[i];
        const agent = names.get(String((qDoc.data() as Record<string, unknown>).agentId ?? "")) ?? "—";
        try {
          await recomputeQuery(uid, qDoc.id);
          rows.push({ id: qDoc.id, agent, ok: true });
        } catch (e) {
          // Recorded and carried on: one permission denial must never strand the rest.
          rows.push({ id: qDoc.id, agent, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
        setProgress({ done: i + 1, total: qSnap.docs.length });
        setSweepRows([...rows]);
        if (i < qSnap.docs.length - 1) await sleep(WRITE_PAUSE_MS);
      }
      setSweepRows(rows);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const fieldTally = (rows: DryRow[]) => {
    const tally = new Map<string, number>();
    rows.forEach((r) => r.diffs.forEach((d) => tally.set(d.key, (tally.get(d.key) ?? 0) + 1)));
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  };

  const btn = (kind: "dry" | "sweep", disabled: boolean): React.CSSProperties => ({
    padding: "10px 18px",
    borderRadius: 9,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    border: kind === "dry" ? "1px solid #b9ac9c" : "1.5px solid #8a3a28",
    background: kind === "dry" ? "#fffdf9" : "#8a3a28",
    color: kind === "dry" ? "#2b2118" : "#fff",
  });

  const cell: React.CSSProperties = { padding: "6px 12px 6px 0", verticalAlign: "top" };
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 };

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f1", padding: "48px 32px", fontFamily: "Inter, sans-serif", color: "#2b2118" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
          Recompute sweep
        </h1>
        <p style={{ color: "#8a7d6e", fontSize: 13, lineHeight: 1.55, marginBottom: 18 }}>
          A one-off heal for historical queries. <b>responseReceivedAt</b>, <b>rejectedDate</b> and{" "}
          <b>lastStatusChange</b> are derived from the activity log now, and records heal on their next
          recompute — but a closed or rejected query is never touched again, so it never heals on its own.
          This runs that recompute deliberately, once.
        </p>

        <div style={{ background: "#f6efe4", border: "1px solid #e2d4bd", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.55, marginBottom: 22 }}>
          <b>Your own data only.</b> This uses the app's normal sign-in, so the security rules confine every
          read and write to the signed-in account's queries. It cannot touch anyone else's records.
          <br />
          <b>Nothing runs on its own.</b> Only a button press does anything. Re-running is safe: the recompute
          is idempotent, so a second pass over an unchanged log writes the same values.
        </div>

        <p style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 20 }}>
          Firebase project: <b>{projectId}</b>
          {uid && <> · queries in your account: <b>{queryCount ?? "counting…"}</b></>}
        </p>

        {!uid && <p>Sign in on this build, then return to <code>#/recompute-sweep</code>.</p>}
        {loadErr && <p style={{ color: "#8a3a28" }}>Error: {loadErr}</p>}

        {uid && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <button type="button" style={btn("dry", busy !== null)} disabled={busy !== null} onClick={runDry}>
                {busy === "dry" ? "Dry run…" : "1 · Dry run (reads only)"}
              </button>
              <button type="button" style={btn("sweep", busy !== null)} disabled={busy !== null} onClick={runSweep}>
                {busy === "sweep" ? "Sweeping…" : "2 · Run sweep (writes)"}
              </button>
              {busy && (
                <span style={{ ...mono, color: "#5d5245" }}>
                  {progress.done} / {progress.total}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 26 }}>
              Dry run first and read the table. The sweep writes only what the dry run predicted.
            </p>
          </>
        )}

        {dryRows && (
          <section style={{ marginBottom: 34 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Dry run — nothing was written</h2>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Scanned <b>{dryScanned}</b> {dryScanned === 1 ? "query" : "queries"}; <b>{dryRows.length}</b>{" "}
              would change.
            </p>
            {dryRows.length > 0 && (
              <p style={{ ...mono, color: "#5d5245", marginBottom: 14 }}>
                {fieldTally(dryRows).map(([k, n]) => `${k} ×${n}`).join("  ·  ")}
              </p>
            )}
            {dryRows.length === 0 ? (
              <p style={{ fontSize: 13, color: "#3B6D11" }}>Everything is already in step — the sweep would be a no-op.</p>
            ) : (
              <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2d4bd" }}>
                    <th style={cell}>Agent</th>
                    <th style={cell}>Status</th>
                    <th style={cell}>Field</th>
                    <th style={cell}>Stored</th>
                    <th style={cell}>Would become</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRows.map((r) =>
                    r.diffs.map((d, i) => (
                      <tr key={`${r.id}-${d.key}`} style={{ borderBottom: "0.5px solid #efe5da" }}>
                        <td style={cell}>{i === 0 ? r.agent : ""}</td>
                        <td style={{ ...cell, ...mono }}>{i === 0 ? r.status : ""}</td>
                        <td style={{ ...cell, ...mono }}>{d.key}</td>
                        <td style={{ ...cell, ...mono, color: "#8a7d6e" }}>{d.stored}</td>
                        <td style={{ ...cell, ...mono, color: "#3B6D11" }}>{d.proposed}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            )}
          </section>
        )}

        {sweepRows && (
          <section>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Sweep</h2>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Recomputed <b>{sweepRows.filter((r) => r.ok).length}</b> of <b>{sweepRows.length}</b>
              {sweepRows.some((r) => !r.ok) && (
                <> · <span style={{ color: "#8a3a28" }}><b>{sweepRows.filter((r) => !r.ok).length}</b> failed</span></>
              )}
              {busy === "sweep" ? " (running…)" : "."}
            </p>
            {sweepRows.filter((r) => !r.ok).length > 0 && (
              <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2d4bd" }}>
                    <th style={cell}>Agent</th>
                    <th style={cell}>Query id</th>
                    <th style={cell}>Failure</th>
                  </tr>
                </thead>
                <tbody>
                  {sweepRows.filter((r) => !r.ok).map((r) => (
                    <tr key={r.id} style={{ borderBottom: "0.5px solid #efe5da" }}>
                      <td style={cell}>{r.agent}</td>
                      <td style={{ ...cell, ...mono }}>{r.id}</td>
                      <td style={{ ...cell, ...mono, color: "#8a3a28" }}>{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!busy && (
              <p style={{ fontSize: 12.5, color: "#8a7d6e", marginTop: 16, lineHeight: 1.55 }}>
                Run the dry run again to confirm: it should now report zero changes. Package reply-time
                figures will read LONGER than before — straight rejections have re-entered the average,
                which is the fix working.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
