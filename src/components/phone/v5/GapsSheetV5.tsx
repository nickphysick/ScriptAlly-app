/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase C — FILLING THE GAPS (design-refs/phone-app-v5/phone-gaps-v1.html, the fifth phone; phone-hub-v5.html
 * `sess`): Housekeeping's gap-filling session as a sheet in the overlay layer (v3Store `{ type: "gaps" }`). Below 768px.
 *   - One gap at a time, in Housekeeping's own order: the model's items (`hkModel`, the order the desktop drawer's "One at
 *     a time" runs). Opened from a group's row, that group's gaps come first (lib/phoneV5 `gapQueue`). The queue is
 *     taken when the sheet opens, so the progress strip has one segment per gap in this session.
 *   - Each card: the agent (seal, name, "agency · queried N ago"), the gap's title, why and "Where to find it" —
 *     Housekeeping's own copy (`gapCopy`) — and the drawer's own fix control for that gap (HousekeepingDrawer
 *     `FocusField`: the same inputs, option lists and refusals), sized for a phone.
 *   - "Save and next" is the shared handler (`useHkFixes().onHkFix`, the Contact list's), with its Undo on the
 *     snackbar; "Ask me later" is its `onLater`; "Skip" moves on and writes nothing. THIS SHEET WRITES NOTHING ITSELF.
 *   - The small ring is the live List health figure; the strip marks each saved gap navy, and the current one.
 * Escape closes it (the layer's own Escape); Tab stays inside the sheet while it is open.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useV3Data } from "../v3/V3Provider";
import { closeV3, showV3Snack } from "../v3/v3Store";
import { queryByAgent } from "../v4/AgentsV4";
import { Seal } from "../v4/V4Parts";
import { FocusField } from "../../agents/contact/HousekeepingDrawer";
import type { HkFix } from "../../agents/contact/ContactHousekeeping";
import { gapCopy, type GroupKey, type HkItem, type Run } from "../../../lib/contactHousekeeping";
import { gapQueue, gapStrip, nextGap, queriedAgo, type GapOutcome } from "../../../lib/phoneV5";
import { HealthRingV5 } from "./HealthRingV5";
import { usePhoneHk } from "./usePhoneHk";
import "./phoneV5.css";

const RunsText: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <>{runs.map((r, i) => (typeof r === "string" ? <React.Fragment key={i}>{r}</React.Fragment> : "em" in r ? <em key={i}>{r.em}</em> : <b key={i}>{r.b}</b>))}</>
);
const nameOf = (a: HkItem["agent"]) => (a.name ?? "").trim() || (a.agency ?? "").trim();
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const GapsSheetV5: React.FC<{ group: GroupKey | null }> = ({ group }) => {
  const v = useV3Data();
  const { model, health, book, today, fixes, agents } = usePhoneHk();
  /* the session's queue, taken once as the sheet opens */
  const [queue] = useState<HkItem[]>(() => gapQueue(model.items, group));
  const keys = useMemo(() => queue.map((i) => i.key), [queue]);
  const [at, setAt] = useState<number | null>(queue.length ? 0 : null);
  const [out, setOut] = useState<(GapOutcome | undefined)[]>([]);
  const [answer, setAnswer] = useState<HkFix | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const open = useMemo(() => new Set(model.items.map((i) => i.key)), [model.items]);
  const byAgent = useMemo(() => queryByAgent(v.qs), [v.qs]);
  const cur = at != null ? queue[at] : null;

  const move = (k: number, o: GapOutcome) => {
    setOut((x) => { const n = [...x]; n[k] = o; return n; });
    setAnswer(null); setErr(null);
    setAt(nextGap(keys, k, open));
  };
  const save = async () => {
    if (at == null || !cur || !answer || busy) return;
    setBusy(true);
    const r = await fixes.onHkFix(cur, answer);
    setBusy(false);
    if ("error" in r) { setErr(`Couldn’t save that: ${r.error}`); return; }
    const undo = r.undo;
    showV3Snack({ msg: r.line, undo: undo ? async () => { await undo(); } : undefined });
    move(at, "saved");
  };
  const later = async () => {
    if (at == null || !cur || busy) return;
    setBusy(true);
    try { await fixes.onLater(cur); } catch { setBusy(false); setErr("Couldn’t put that off. Try again."); return; }
    setBusy(false);
    move(at, "later");
  };
  const skip = () => { if (at != null && !busy) move(at, "skipped"); };

  /* focus: the close button on open, and Tab kept inside the sheet */
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const strip = gapStrip(queue.length, at ?? -1, out);
  const saved = out.filter((o) => o === "saved").length;
  const copy = cur ? gapCopy(cur, book) : null;
  const latest = cur ? byAgent.get(cur.agent.id) ?? null : null;
  const line = cur ? [(cur.agent.agency ?? "").trim(), latest?.queriedMs != null ? queriedAgo(latest.queriedMs, v.now) : ""].filter(Boolean).join(" · ") : "";

  return (
    <div ref={ref} className="pa4-sheet pa5-gs" role="dialog" aria-modal="true" aria-label="Filling the gaps" onKeyDown={onKey}
      data-pa5="gaps-sheet" data-i={at != null ? at + 1 : queue.length} data-total={queue.length} data-done={at == null ? "1" : "0"}>
      <div className="pa4-grab" />
      <div className="pa5-gs-hd">
        <HealthRingV5 pct={health?.pct ?? 0} small />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pa4-s" data-pa5="gaps-count">{at != null ? `Filling the gaps · ${at + 1} of ${queue.length}` : "Filling the gaps"}</div>
          <div className="pa5-seg" aria-hidden="true" data-pa5="gaps-strip">{strip.map((c, k) => <i key={k} className={c} data-k={k} />)}</div>
        </div>
        <button ref={closeRef} type="button" className="pa5-gs-x" aria-label="Close" data-pa5="gaps-close" onClick={closeV3}>✕</button>
      </div>

      {cur && copy ? (<>
        <div key={cur.key} className="pa4-card pa5-gc" data-pa5="gap-card" data-agent={cur.agent.id} data-kind={cur.gap} data-key={cur.key}>
          <div className="pa5-gc-who">
            <Seal name={nameOf(cur.agent)} size={48} />
            <div style={{ minWidth: 0 }}><div className="pa4-b" style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{nameOf(cur.agent)}</div>{line ? <div className="pa4-s">{line}</div> : null}</div>
          </div>
          <h2 className="pa4-h" data-pa5="gap-title" style={{ marginBottom: 8 }}>{copy.title}</h2>
          <p className="pa4-b pa4-body" style={{ margin: "0 0 12px" }}><RunsText runs={copy.why} /></p>
          <div className="pa5-gc-where" data-pa5="gap-where"><div className="pa4-s" style={{ fontWeight: 600, color: "var(--pa-ink)" }}>Where to find it</div><div className="pa4-s">{copy.where}</div></div>
          <div className="pa5-gc-fix"><FocusField key={cur.key} item={cur} book={book} today={today} agents={agents} onAnswer={setAnswer} /></div>
          {err ? <p className="pa4-s pa5-gc-err" role="alert" data-pa5="gap-error">{err}</p> : null}
        </div>
        <button type="button" className="pa4-cta" style={{ marginTop: 16 }} data-pa5="gap-save" disabled={!answer || busy} onClick={() => void save()}>Save and next</button>
        <div style={{ display: "flex" }}>
          <button type="button" className="pa4-link" style={{ flex: 1 }} data-pa5="gap-later" disabled={busy} onClick={() => void later()}>Ask me later</button>
          <button type="button" className="pa4-link" style={{ flex: 1 }} data-pa5="gap-skip" disabled={busy} onClick={skip}>Skip</button>
        </div>
      </>) : (
        <div className="pa4-card pa5-gc pa5-gs-end" data-pa5="gaps-end">
          <h2 className="pa4-h" style={{ marginBottom: 8 }}>That’s every gap for now.</h2>
          <p className="pa4-b pa4-body" style={{ margin: "0 0 16px" }}>{saved > 0 ? `You filled in ${saved} this time.` : "Nothing was changed this time."}</p>
          <button type="button" className="pa4-cta" data-pa5="gaps-doneb" onClick={closeV3}>Done</button>
        </div>
      )}
    </div>
  );
};
