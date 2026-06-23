/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import — the messy→orderly processing beat (Phase 4a). After extraction returns, a handful of
 * the writer's OWN messy values straighten into clean ScriptAlly lines before the Overview — the
 * "we've sorted your chaos" promise shown, not told. Reads only data already in hand (sentDateRaw →
 * parsed date, plus the junk-name/set-aside case); never fabricates mess, never a new function call.
 * Timing-disciplined (a beat, not a flash; never holds the writer back); reduced-motion gets a calm
 * static line straight to the Overview; a click skips ahead.
 */
import React from "react";
import { SmartImportResult } from "../../types/smartImport";
import { fmtDate } from "../../lib/smartImportReviewModel";

const MONO = "'JetBrains Mono',monospace";
const SERIF = "'Playfair Display',serif";

interface Pair { raw: string; clean: string }

/** How visibly "messy" a raw date cell looks — bias the sample toward the striking ones (serial,
 *  dotted, ambiguous slashes) over already-tidy written dates. */
function messyScore(raw: string): number {
  if (/^\d{4,}$/.test(raw)) return 5;          // excel serial e.g. 44621
  if (raw.includes(".")) return 4;             // dotted e.g. 12.4.24
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(raw)) return 3; // short ambiguous e.g. 15/5/24
  if (raw.includes("/")) return 2;             // other slashed
  return 1;                                    // written / iso
}

/** Pull up to 8 real messy→clean pairs from the result — never fabricated. */
export function tidyPairs(result: SmartImportResult): Pair[] {
  const nameOf = (ref: string) => {
    const a = (result.agents || []).find((x) => x.ref === ref);
    return (a?.name || a?.agency || "").trim();
  };
  const out: Pair[] = [];
  // The junk-name / unidentifiable case, set gently aside (shown first if present).
  const junk = (result.queries || []).find((q) => {
    const a = (result.agents || []).find((x) => x.ref === q.agentRef);
    return (q.notes || "").trim() && a && !a.name?.trim() && !a.agency?.trim();
  });
  if (junk?.notes) out.push({ raw: junk.notes.trim(), clean: "set aside — name it any time" });
  // Date pairs: the raw cell straightening into the parsed date (+ who it's for).
  const dated = (result.queries || [])
    .filter((q) => (q.sentDateRaw || "").trim() && q.sentDate)
    .map((q) => ({ raw: (q.sentDateRaw as string).trim(), date: q.sentDate as string, ref: q.agentRef, score: messyScore((q.sentDateRaw as string).trim()) }))
    .sort((a, b) => b.score - a.score);
  for (const d of dated) {
    if (out.length >= 8) break;
    const who = nameOf(d.ref);
    out.push({ raw: d.raw, clean: who ? `${who} · ${fmtDate(d.date)}` : fmtDate(d.date) });
  }
  return out.slice(0, 8);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const ImportTidyAnimation: React.FC<{ result: SmartImportResult; onDone: () => void }> = ({ result, onDone }) => {
  const pairs = React.useMemo(() => tidyPairs(result), [result]);
  const reduced = React.useMemo(prefersReducedMotion, []);
  const fired = React.useRef(false);
  const finish = React.useCallback(() => { if (!fired.current) { fired.current = true; onDone(); } }, [onDone]);

  React.useEffect(() => {
    // A beat, not a flash — but never a gate. Static/reduced or no-mess cases resolve briskly; the
    // animated case holds just long enough for the last row to settle, capped so it can't drag.
    const ms = reduced || pairs.length === 0 ? 900 : Math.min(2600, 700 + pairs.length * 120 + 600);
    const t = window.setTimeout(finish, ms);
    return () => window.clearTimeout(t);
  }, [reduced, pairs.length, finish]);

  const calm = reduced || pairs.length === 0;

  return (
    <div onClick={finish} role="button" aria-label="Continue"
      style={{ position: "fixed", inset: 0, background: "#f2ede7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 24, cursor: "pointer", zIndex: 50 }}>
      <style>{`@keyframes saTidyRow{from{opacity:0;transform:translateX(-10px) rotate(-1.3deg)}to{opacity:1;transform:none}}`}</style>
      <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 24, color: "#3a1c14", textAlign: "center" }}>
        {calm ? "We've read your file" : "Tidying your records…"}
      </div>
      {calm ? (
        <div style={{ fontFamily: MONO, fontSize: 12.5, color: "#9a8c80" }}>here's what we found →</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 560 }}>
          {pairs.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #e7ddd2", borderRadius: 10, padding: "11px 15px", animation: `saTidyRow .5s ease both`, animationDelay: `${i * 0.12}s` }}>
              <span style={{ fontFamily: MONO, fontSize: 12.5, color: "#b6a89a", textDecoration: "line-through", whiteSpace: "nowrap", flexShrink: 0, minWidth: 92 }}>{p.raw}</span>
              <span style={{ color: "#8a9e88", flexShrink: 0 }}>→</span>
              <span style={{ fontFamily: SERIF, fontSize: 15, color: "#2a2521", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.clean}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
