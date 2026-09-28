/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HousekeepingSweep — the full-screen takeover that fixes housekeeping (design ref:
 * design-refs/todo-focus-flow.html; renamed from FocusFlow when query actions moved to the query
 * drawer). "Start the sweep" on a grouped housekeeping card opens it: one group, one sheet — the
 * agents missing the same field, filled in together and saved in one batch.
 *
 * ⚠️ NOTHING HERE FINISHES A QUERY. Every task that finishes a query — a send, a nudge, a close, an
 * offer, a materials gap — opens the query drawer (`drawerDoorForTask`), and the host routes it
 * there before this mounts. The single cards that still arrive are the two that are not about a
 * query's progress: one agent's record gaps (`updateAgent`), and a card with no journey of its own
 * (a hand-off that writes nothing — `agent_recheck` lands here, by decision). The writer's own note
 * used to be a third; the task pane finishes a note itself, so that sheet was unreachable and is
 * deleted (v1.2).
 *
 * Surface choice (recon): a fixed full-viewport overlay hosted by ToDoPage, NOT a route — the flow
 * needs the board's live data/handlers, exit is a state flip, and a transient route would have to
 * be registered across the six locked nav surfaces for no benefit.
 *
 * The staged model: the group's "Never ask" STAGES a rule mute — nothing persists until the review
 * sheet's Save (apply = the existing per-item-isolated applyStaged; partial failures are re-listed,
 * never silently half-saved). Back at an item boundary un-stages the previous item. IMMEDIATE
 * writes (data entry, not a deferrable log): the batch/dq saves (updateAgent) and the note tick.
 *
 * Theme: F12 tokens only.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useConfirmAsk } from "./ConfirmAsk";
import { useScriptAllyDb } from "../../lib/db";
import { JOURNEY_ART, JourneyArtKey } from "./journeyArt";
import { useOverlay } from "../shell/useOverlay";
import { agentPrimary } from "../../lib/agentDisplay";
import { flagKeyForTask } from "../../lib/taskFlags";
import { cardJourney } from "../../lib/todoJourneys";
import { agentDataQualityNeeds, AgentDataNeed } from "../../lib/agentDataQuality";
import { BoardCard } from "../../lib/todoBoard";
import { HkGroup, HK_RULES, HK_PAYOFF, mutedMembersForRule } from "../../lib/todoHousekeeping";
import { StagedPayload, applyStaged } from "../../lib/todoWalk";
import { saveHkRows } from "../../lib/hkSave";
import { isProUser, fetchAssistedFill, AssistFillError, AssistFound } from "../../lib/assistFill";
import { Agent, Query } from "../../types";

export type SweepItem = { kind: "card"; card: BoardCard } | { kind: "group"; group: HkGroup };

const fmtShort = (iso: string): string => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const WEEK_CHIPS = [4, 6, 8, 12];
const MATERIAL_VOCAB = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];

const itemKey = (it: SweepItem): string => (it.kind === "card" ? it.card.key : `group-${it.group.rule}`);

/* ── THE JOURNEY TAKEOVER (journeys pack, Phase 1; ref design-refs/todo-workspace-v14.html) ─────
 *
 * ⚠️ ONE CHROME, AND THE STEPS ARE A DECLARED TABLE. Every journey hands
 * `journeySheet` a spec and renders nothing of its own frame. The alternative — the shape this
 * replaces — was a per-journey `if (step === 0) return sheet(…)` with the numbering, the footer
 * and the consequence hint restated inside each one; a copy of a layout per journey is a chance
 * for two of them to disagree about what the writer is looking at.
 *
 * ⚠️ A JOURNEY IS ONE SCREEN, NOT A WIZARD. The numbers are reading order, not pagination — the
 * writer sees everything they are about to record at once, which is the only way the summary
 * strip beneath can be true of the whole thing.
 */
export interface JourneyStep {
  id: string;
  /** The Playfair heading — "What went", "How it went", "When". */
  name: string;
  /** Renders the italic `optional` marker, right-aligned on the heading row. */
  optional?: boolean;
  body: React.ReactNode;
}

export interface JourneySpec {
  steps: JourneyStep[];
  /**
   * ⚠️ THE REFERENCE PANEL HOLDS WHAT THE RECORD ALREADY SAYS, never a control. It is what the
   * agent asked for, or what the listing states, or what closing does — the thing the writer would
   * otherwise leave the surface to go and check.
   */
  reference: { heading: string; body: React.ReactNode; meta?: string };
  /** ⚠️ MANDATORY. The commit button must never be the first time the writer sees what will be
   *  written — composed off the LIVE form state, never off the string it composes. */
  summary: string;
  commit: { label: string; hint?: string; onCommit: () => void; disabled?: boolean };
}

export interface HousekeepingSweepProps {
  items: SweepItem[];
  onClose: () => void;
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  onToast: (msg: string, action?: { label: string; fn: () => void }) => void;
}

export const HousekeepingSweep: React.FC<HousekeepingSweepProps> = ({ items, onClose, onNavigate, onToast }) => {
  const {
    queries, agents, manuscripts, activities, taskFlags, currentUser,
    upsertTaskFlag, updateUserProfile, updateAgent, resolveTaskFlag,
  } = useScriptAllyDb();

  const [qi, setQi] = useState(0);
  const [step, setStep] = useState(0);
  const [staged, setStaged] = useState<StagedPayload[]>([]);
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();
  const [leaving, setLeaving] = useState(false);
  const [savedN, setSavedN] = useState<number | null>(null); // the "Desk cleared" screen
  const [saving, setSaving] = useState(false);
  // per-item scratch (reset on advance)
  const [rows, setRows] = useState<Record<string, string>>({}); // batch/dq drafts keyed by agentId (+need for dq)
  const [noMeansNo, setNoMeansNo] = useState<Record<string, boolean>>({});
  const [found, setFound] = useState<Record<string, AssistFound>>({});
  const [notFound, setNotFound] = useState<Set<string>>(new Set());
  const [assistAt, setAssistAt] = useState<string | null>(null);
  const [assisting, setAssisting] = useState(false);
  const [assistMsg, setAssistMsg] = useState<string | null>(null);
  const [showMuted, setShowMuted] = useState(false);

  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // P3 — the dim-scrim presentation: the board stays mounted beneath; scroll locks for the
  // journey's life (lockStageScroll — the app-wide mechanism); focus is captured from the
  // invoking control, trapped in the sheet, and returned on close. Scrim clicks NUDGE, never close.
  const rootRef = useRef<HTMLDivElement>(null);
  const [nudged, setNudged] = useState(false);
  /* ⚠️ THE PRESENTATION IS THE SHARED PRIMITIVE NOW (§3). Focus capture and return, the
     stage-scroll lock and the Tab trap were the same twenty lines here and in
     `TaskSettingsSheet.tsx`; they live in `useOverlay` and this file no longer keeps a copy.

     ⚠️ WHAT STAYS THIS FILE'S OWN IS THE BACKDROP MEANING, and it is the opposite of the settings
     sheet's: a stray click on the scrim NUDGES rather than closes, because this journey holds a
     STAGED model that a misplaced click must not discard. That difference is why the primitive
     takes `onScrimClick` instead of assuming one.

     ⚠️ AND ESCAPE STAYS HERE TOO, deliberately. It routes through `requestExit`, which is async and
     may open a confirm, and it reads `staged.length` — so it is a handler with its own dependencies
     rather than the primitive's plain callback. `onEscape` is omitted for exactly this case. */
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    scrimClasses: ["tdb-ff", "tdb-ffstage"],
    onScrimClick: () => { if (!reduce) setNudged(true); },
  });
  const atReview = qi >= items.length;
  const item = atReview ? undefined : items[qi];

  const resetScratch = () => {
    /* ⚠️ EVERY PIECE OF PER-ITEM SCRATCH IS CLEARED HERE — a field left out arrives pre-filled on
       the next item, ready to be saved against a different agent.
       ⚠️ `setAssisting(false)` COMPLETES THE TRIO — `assistAt` and `assistMsg` were cleared here and
       its in-flight flag was not, so advancing mid-fetch left the next group's button reading
       "Searching…" and disabled (it self-heals when the promise resolves, and it feeds no write,
       but it is the same shape). What is NOT fixed here is
       the stale RESPONSE: a resolving fetch still calls `setFound` against whichever item is on
       screen. That needs a generation guard, and half-fixing it would be worse than leaving it
       named — see `reports/activity-event-date.md`'s closing note. */
    setRows({}); setNoMeansNo({}); setFound({}); setNotFound(new Set()); setAssistAt(null); setAssistMsg(null); setAssisting(false); setShowMuted(false);
  };

  /** Animate the sheet away, then run the transition. */
  function go(fn: () => void) {
    if (reduce) { fn(); return; }
    setLeaving(true);
    window.setTimeout(() => { setLeaving(false); fn(); }, 280);
  }
  const advance = () => go(() => { setQi((i) => i + 1); setStep(0); resetScratch(); });
  function backOne() {
    if (step > 0) { setStep((s) => s - 1); return; }
    if (qi === 0) return;
    // crossing an item boundary un-stages the previous item
    const prevKey = itemKey(items[qi - 1]);
    setStaged((s) => s.filter((p) => p.cardKey !== prevKey));
    setQi((i) => i - 1); setStep(0); resetScratch();
  }
  const stageAndAdvance = (p: StagedPayload) => { setStaged((s) => [...s, p]); advance(); };
  async function requestExit(after?: () => void) {
    // the styled ConfirmAsk replaced window.confirm (hero-pair P4) — a true blocking choice
    if (staged.length && !(await confirmAsk(`You have ${staged.length} staged change${staged.length === 1 ? "" : "s"}. Discard them?`, { confirmLabel: "Discard them", cancelLabel: "Keep working" }))) return;
    onClose();
    after?.();
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestExit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged.length]);

  /* ⚠️ THE SWEEP STAGES ONE THING — the group's "Never ask" rule mute. The shared runner takes a
     handler for every staged kind; the kinds that finish a query are never staged here (they open
     the query drawer), so their handlers refuse rather than write. */
  const unstaged = () => Promise.reject(new Error("the housekeeping sweep stages only rule mutes"));
  const stagedHandlers = {
    markSent: unstaged,
    nudge: unstaged,
    snooze: unstaged,
    muteItem: unstaged,
    muteRule: (p: Extract<StagedPayload, { kind: "mute-rule" }>) => updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), p.rule])) }),
  };

  async function saveAll() {
    if (saving) return;
    setSaving(true);
    const res = await applyStaged(staged, stagedHandlers);
    setSaving(false);
    if (res.failed.length) {
      setStaged((s) => s.filter((p) => res.failed.includes(p.cardKey)));
      onToast(`Saved ${res.ok.length}; ${res.failed.length} failed — still listed below.`);
    } else {
      setSavedN(res.ok.length);
      setStaged([]);
    }
  }

  // ── shared bits ───────────────────────────────────────────────────────────
  const cardQuery = (c: BoardCard): Query | undefined => (c.relatedRecordId ? queries.find((q) => q.id === c.relatedRecordId) : undefined);
  const cardAgent = (c: BoardCard, q?: Query): Agent | undefined =>
    q ? agents.find((a) => a.id === q.agentId) : c.relatedRecordId ? agents.find((a) => a.id === c.relatedRecordId) : undefined;

  const emTitle = (c: BoardCard) =>
    c.who && c.title.includes(c.who)
      ? <>{c.title.split(c.who)[0]}<em>{c.who}</em>{c.title.split(c.who).slice(1).join(c.who)}</>
      : c.title;

  const whoRow = (ag?: Agent, initials?: string) => ag && (
    <div className="tdb-ffwho">
      <span className="tdb-ffbigav">{initials || "•"}</span>
      <span><div className="tdb-ffwn">{agentPrimary(ag)}</div>{ag.agency && <div className="tdb-ffwa">{ag.agency}</div>}</span>
    </div>
  );

  // ── journeys ─────────────────────────────────────────────────────────────
  /**
   * ⚠️ THE JOURNEY THAT RECORDS NOTHING. A card that reaches this sheet with no journey of its own —
   * a gap in the record that is not one agent's fields — is corrected where the data lives. So this
   * states why in one paragraph and hands off. The commit verb NAVIGATES, and the hint says
   * `Nothing is recorded here.` — a surface that looks like every other recording surface must say
   * when it is not one.
   *
   * ⚠️ IT SITS BEHIND `dqSheet`, NEVER IN FRONT OF IT — AND THAT IS A RULING, NOT AN OVERSIGHT. The
   * Fix bucket is mostly `data_quality_poor` — a missing reply window, materials list or wish list,
   * all of which live on the AGENT and all of which `dqSheet` fills in place. Submission packages is
   * a manuscripts page and cannot touch one of them, so handing those off would answer a writer who
   * clicked "3 agents have no reply window" by navigating them somewhere with no reply window on it.
   */
  function handoffSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    return journeySheet({
      steps: [{
        id: "why",
        name: "What to do",
        body: (
          <div className="tdb-jnreport">
            This one is fixed where the data lives, not here. Recording it against a query would put a note on the record instead of correcting it.
          </div>
        ),
      }],
      reference: {
        heading: "Why it appeared",
        body: <>{c.subtitle || "Something in the record is incomplete."}</>,
        meta: c.due || undefined,
      },
      /* ⚠️ THE SUMMARY STRIP IS MANDATORY EVERYWHERE, and on a journey that records nothing the
         honest thing for it to say is that nothing is going on the record. */
      summary: "Nothing goes on the record here.",
      commit: {
        label: "Open submission packages",
        hint: "Nothing is recorded here.",
        onCommit: () => requestExit(() => onNavigate("manuscripts", "Submission packages")),
      },
    }, journeyBand("cof", "Tidying the record", ag, c.initials, "details"));
  }

  function dqSheet(c: BoardCard) {
    const ag = c.relatedRecordId ? agents.find((a) => a.id === c.relatedRecordId) : undefined;
    const needs: AgentDataNeed[] = ag ? agentDataQualityNeeds(ag) : [];
    if (step === 0) return sheet(
      <>
        <div className="tdb-ffqsub">Clean data is how QueryHawk judges fit and checks your package — worth most before you query. Fill what you know; skip what you don’t.</div>
        {whoRow(ag, c.initials)}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Not now</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Fill them in →</button>
      </>,
      band("cof", "Housekeeping", emTitle(c), undefined, { art: "details", kickCls: "hk" }),
    );
    const filled = needs.some((n) => (rows[n] ?? "").trim());
    return sheet(
      <>
        <div className="tdb-ffbatch">
          {needs.includes("responseTime") && (
            <div className="tdb-ffbrow">
              <span className="tdb-ffbn"><span className="tdb-ffbnn">Reply window</span></span>
              <span className="tdb-ffbf">
                {WEEK_CHIPS.map((w) => <button key={w} type="button" className={`tdb-ffbc${rows.responseTime === String(w) ? " on" : ""}`} onClick={() => setRows((p) => ({ ...p, responseTime: String(w) }))}>{w} wks</button>)}
                <input className="tdb-ffother" type="number" min={1} placeholder="other" value={WEEK_CHIPS.includes(Number(rows.responseTime)) ? "" : rows.responseTime ?? ""} onChange={(e) => setRows((p) => ({ ...p, responseTime: e.target.value }))} />
                <label className="tdb-fftick"><input type="checkbox" checked={!!noMeansNo.one} onChange={(e) => setNoMeansNo({ one: e.target.checked })} />No reply = no</label>
              </span>
            </div>
          )}
          {needs.includes("materials") && (
            <div className="tdb-ffbrow">
              <span className="tdb-ffbn"><span className="tdb-ffbnn">Materials wanted</span></span>
              <span className="tdb-ffbf">{MATERIAL_VOCAB.map((m) => {
                const set = new Set((rows.materials ?? "").split(",").map((s) => s.trim()).filter(Boolean));
                return <button key={m} type="button" className={`tdb-ffbc${set.has(m) ? " on" : ""}`} onClick={() => { set.has(m) ? set.delete(m) : set.add(m); setRows((p) => ({ ...p, materials: Array.from(set).join(", ") })); }}>{m}</button>;
              })}</span>
            </div>
          )}
          {needs.includes("mswl") && (
            <div className="tdb-ffbrow">
              <span className="tdb-ffbn"><span className="tdb-ffbnn">Wish list</span></span>
              <span className="tdb-ffbf"><input className="tdb-ffwide" type="text" placeholder="What are they looking for?" value={rows.mswl ?? ""} onChange={(e) => setRows((p) => ({ ...p, mswl: e.target.value }))} /></span>
            </div>
          )}
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Skip</button>
        <button type="button" className="tdb-ffpri" disabled={!filled} onClick={async () => {
          if (!ag) { advance(); return; }
          const fields: Partial<Agent> = {};
          if ((rows.responseTime ?? "").trim()) { fields.responseTimeWeeks = Number(rows.responseTime); fields.noResponseMeansNo = !!noMeansNo.one; }
          if ((rows.materials ?? "").trim()) fields.materialsWanted = rows.materials.split(",").map((s) => s.trim()).filter(Boolean);
          if ((rows.mswl ?? "").trim()) fields.mswlNotes = rows.mswl;
          try {
            await updateAgent(ag.id, fields);
            resolveTaskFlag(flagKeyForTask("data_quality_poor", ag.id));
            onToast("Saved to the profile.");
          } catch { onToast("Couldn’t save — try again."); }
          advance();
        }}>Save & continue →</button>
      </>,
      band("cof", <>{c.who || "Agent"} · details</>, "What do you know?", undefined, { art: "details", kickCls: "hk" }),
    );
  }

  function groupSheet(g: HkGroup) {
    const meta = HK_RULES[g.rule];
    const pro = isProUser(currentUser);
    const mutedList = mutedMembersForRule(g.rule, agents, taskFlags, Date.now());
    if (step === 0) {
      const title = meta.title(g.members.length);
      const numMatch = title.match(/^(\d+\s+agents?)([\s\S]*)$/);
      return sheet(
        <>
          <div className="tdb-ffqsub">{HK_PAYOFF[g.rule]} It’s usually on the agency’s submissions page. Fill what you know; skip what you don’t.</div>
          {mutedList.length > 0 && (
            <div className="tdb-ffsmall">
              <button type="button" className="tdb-fflink" onClick={() => setShowMuted((s) => !s)}>{mutedList.length} muted — {showMuted ? "hide" : "show"}</button>
              {showMuted && mutedList.map((mm) => (
                <span key={mm.agentId} className="tdb-ffmuted">{mm.agentName}
                  <button type="button" className="tdb-ffunmute" onClick={() => { upsertTaskFlag(flagKeyForTask("data_quality_poor", mm.agentId), { snoozedUntil: null }); onToast("Unmuted — it’ll come back to the board."); }}>Unmute</button>
                </span>
              ))}
            </div>
          )}
        </>,
        <>
          <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-ffskip" onClick={advance}>Not now</button>
          <button type="button" className="tdb-ffskip" onClick={() => stageAndAdvance({ kind: "mute-rule", cardKey: itemKey({ kind: "group", group: g }), label: meta.label, rule: g.rule })}>Never ask</button>
          <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Fix them together →</button>
        </>,
        band("cof", <>Housekeeping · {meta.label.toLowerCase()}</>, numMatch ? <><em>{numMatch[1]}</em>{numMatch[2]}.</> : title, undefined, { art: "batch", kickCls: "hk" }),
      );
    }
    const filledIds = g.members.filter((m) => (rows[m.agentId ?? ""] ?? "").trim()).map((m) => m.agentId!);
    const q2 = g.rule === "dq_responseTime" ? "They usually reply within…" : g.rule === "dq_materials" ? "They ask to receive…" : "What are they looking for?";
    return sheet(
      <>
        <div className="tdb-ffbatch">{g.members.map((m) => {
          const id = m.agentId ?? m.card.key;
          const prov = m.agentId ? found[m.agentId] : undefined;
          return (
            <div key={m.card.key} className="tdb-ffbrow">
              <span className="tdb-ffbav">{m.card.initials}</span>
              <span className="tdb-ffbn">
                <span className="tdb-ffbnn">{m.agentName}{m.queried && <span className="tdb-pip" title="You’ve queried this agent" />}</span>
                {m.agency && <span className="tdb-ffbna">{m.agency}</span>}
              </span>
              <span className="tdb-ffbf">
                {g.rule === "dq_responseTime" && <>
                  {WEEK_CHIPS.map((w) => <button key={w} type="button" className={`tdb-ffbc${rows[id] === String(w) ? " on" : ""}`} onClick={() => setRows((p) => ({ ...p, [id]: String(w) }))}>{w} wks</button>)}
                  <input className="tdb-ffother" type="number" min={1} placeholder="other" value={WEEK_CHIPS.includes(Number(rows[id])) ? "" : rows[id] ?? ""} onChange={(e) => setRows((p) => ({ ...p, [id]: e.target.value }))} />
                </>}
                {g.rule === "dq_materials" && MATERIAL_VOCAB.map((mv) => {
                  const set = new Set((rows[id] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
                  return <button key={mv} type="button" className={`tdb-ffbc${set.has(mv) ? " on" : ""}`} onClick={() => { set.has(mv) ? set.delete(mv) : set.add(mv); setRows((p) => ({ ...p, [id]: Array.from(set).join(", ") })); }}>{mv}</button>;
                })}
                {g.rule === "dq_mswl" && <input className="tdb-ffwide" type="text" placeholder="What are they looking for?" value={rows[id] ?? ""} onChange={(e) => setRows((p) => ({ ...p, [id]: e.target.value }))} />}
                {prov && <span className="tdb-ffprov" title={prov.source}>✨ Found · {prov.source}{assistAt ? ` · ${fmtShort(assistAt)}` : ""} — check before saving</span>}
                {!prov && m.agentId && notFound.has(m.agentId) && !(rows[id] ?? "").trim() && <span className="tdb-ffnf">Not found — enter manually</span>}
              </span>
            </div>
          );
        })}</div>
        {meta.assistable && (
          <div className="tdb-ffassist">
            <button type="button" className="tdb-ffcopy" disabled={assisting} onClick={async () => {
              if (!pro) { requestExit(() => onNavigate("plans")); return; }
              setAssisting(true); setAssistMsg(null);
              const targets = g.members.filter((m) => m.agentId);
              try {
                const rs = await fetchAssistedFill({ rule: g.rule as "dq_responseTime" | "dq_materials" | "dq_mswl", agents: targets.map((m) => ({ agentId: m.agentId!, name: m.agentName, ...(m.agency ? { agency: m.agency } : {}) })) });
                const byId: Record<string, AssistFound> = {};
                const next = { ...rows };
                for (const r of rs) { byId[r.agentId] = r; next[r.agentId] = r.value; }
                setFound((f) => ({ ...f, ...byId })); setRows(next); setAssistAt(new Date().toISOString());
                setNotFound(new Set(targets.map((m) => m.agentId!).filter((id) => !byId[id] && !(rows[id] ?? "").trim())));
                setAssistMsg(rs.length ? `Found ${rs.length} of ${targets.length} — check each before saving.` : "Nothing sourced this time — enter them manually.");
              } catch (e) {
                setAssistMsg(e instanceof AssistFillError && e.code === "deadline-exceeded" ? "Took too long — enter these manually." : "Couldn’t reach assisted fill — enter these manually.");
              } finally { setAssisting(false); }
            }}>
              {assisting ? "Searching…" : <>✨ Find these for me{!pro && <span className="tdb-propill">Pro</span>}</>}
            </button>
            {assistMsg && <span className="tdb-ffsmall">{assistMsg}</span>}
          </div>
        )}
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Skip the rest</button>
        <button type="button" className="tdb-ffpri" disabled={!filledIds.length || saving} onClick={async () => {
          // THE batch save — shared with the quick rail's card-flip (hkSave.saveHkRows).
          const res = await saveHkRows(g, rows, noMeansNo, found, new Date().toISOString(), { agents, updateAgent, resolveTaskFlag });
          onToast(res.failed ? `Saved ${res.ok}; ${res.failed} failed.` : `Saved ${res.ok}.`, res.undo ? { label: "Undo all", fn: res.undo } : undefined);
          advance();
        }}>Save {filledIds.length || ""} & continue →</button>
      </>,
      band("cof", <>{meta.label} · {filledIds.length} of {g.members.length} filled</>, q2, undefined, { art: "batch", kickCls: "hk" }),
    );
  }

  // ── review + done ─────────────────────────────────────────────────────────
  /* the one staged kind is the rule mute — "never ask", noted */
  const stagedDetail = (): string => "never ask";
  const stagedVerb = (): { cls: string; label: string } => ({ cls: "k", label: "Noted" });

  function reviewSheet() {
    if (savedN != null) return sheet(
      <div className="tdb-ffbigdone">
        <div className="tdb-ffcir">✓</div>
      </div>,
      <>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={onClose}>Back to the board</button>
      </>,
      // ceremony D — a completion/receipt screen
      band("sage", "All saved", <>{savedN} saved. Desk cleared.</>, "They’re logged against their queries and struck through on Today. Go write something.", { art: "reviewClose", center: true }),
    );
    if (!staged.length) return sheet(
      <div className="tdb-ffbigdone">
        <div className="tdb-ffcir">✓</div>
      </div>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => { setQi(items.length - 1); setStep(0); }}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={onClose}>Back to the board</button>
      </>,
      // ceremony D — the walk/sweep completion screen
      band("sage", "Desk walked", "Desk walked.", "You left everything as it was — sometimes that’s the right call too.", { art: "reviewClose", center: true }),
    );
    return sheet(
      <>
        {staged.map((p, i) => {
          const v = stagedVerb();
          return (
            <div key={`${p.cardKey}-${i}`} className="tdb-ffsum">
              <span className={`tdb-ffverb ${v.cls}`}>{v.label}</span>
              <span className="tdb-ffst">{p.label ?? p.cardKey}</span>
              <span className="tdb-ffsd">{stagedDetail().toUpperCase()}</span>
              <button type="button" className="tdb-ffrm" title="Drop this one" onClick={() => setStaged((s) => s.filter((_, j) => j !== i))}>✕</button>
            </div>
          );
        })}
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => { setQi(items.length - 1); setStep(0); }}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={() => requestExit()}>Discard</button>
        <button type="button" className="tdb-ffpri" disabled={saving} onClick={saveAll}>Save {staged.length} & finish</button>
      </>,
      band("sage", "Ready to save", <>You worked through <em>{staged.length} thing{staged.length === 1 ? "" : "s"}</em>.</>, "Nothing has been saved yet — check the list, drop anything you’re not sure of, then save the lot.", { art: "review", kickCls: "sage" }),
    );
  }

  // ── frame ─────────────────────────────────────────────────────────────────
  /* ⚠️ `summaryNode` SITS OUTSIDE THE SCROLLER, deliberately. It is the account of what the commit
     button is about to write, so it must be on screen at the moment that button is pressed — a
     summary that scrolls away is a summary the writer can commit without having read. */
  function sheet(body: React.ReactNode, foot: React.ReactNode, bandNode?: React.ReactNode, summaryNode?: React.ReactNode) {
    return (
      <>
        {bandNode}
        <div className="tdb-ffbody">{body}</div>
        {summaryNode}
        <div className="tdb-fffoot">
          {/* C1 — progress relocated from the retired chrome row (dots + count, multi-item modes) */}
          {items.length > 1 && (
            <span className="tdb-fffprog">
              <span className="tdb-ffprog" aria-hidden>
                {items.map((it, i) => <span key={itemKey(it)} className={`tdb-ffdot${i < qi ? " done" : i === qi ? " on" : ""}`} />)}
              </span>
              <span className="tdb-ffcount">{atReview ? "REVIEW" : `${qi + 1} OF ${items.length}`}</span>
            </span>
          )}
          {staged.length > 0 && <span className="tdb-ffpend">{staged.length} staged — nothing saved yet</span>}
          {foot}
        </div>
      </>
    );
  }

  /** C1 — the zoned family BAND (layout E; center = ceremony D). The title carries .tdb-ffq so
   *  the dialog's aria-labelledby stamp keeps finding the heading; art comes from JOURNEY_ART
   *  (absent = the slot renders nothing at all). Keyed by family so mixed walks crossfade. */
  type BandFam = "pink" | "cof" | "sage" | "paper";
  function band(famKey: BandFam, kick: React.ReactNode, title: React.ReactNode, sub?: React.ReactNode, opts?: { art?: JourneyArtKey; center?: boolean; kickCls?: string }) {
    const src = opts?.art ? JOURNEY_ART[opts.art] : null;
    const f = famKey;
    return (
      <div key={f} className={`tdb-fband ${f}${opts?.center ? " center" : ""}`}>
        <div className="tdb-fbtx">
          <div className={`tdb-ffstream ${opts?.kickCls ?? ""}`}>{kick}</div>
          {opts?.center && src && <div className="tdb-fbart big"><img src={src} alt="" /></div>}
          <div className="tdb-ffq tdb-fbh">{title}</div>
          {sub && <div className="tdb-fbsub">{sub}</div>}
        </div>
        {!opts?.center && src && <div className="tdb-fbart"><img src={src} alt="" /></div>}
      </div>
    );
  }
  /**
   * The journey's band. ⚠️ IT KEEPS THE AVATAR, THE NAME AND THE AGENCY ON SCREEN FOR THE WHOLE
   * JOURNEY — the writer must never lose track of who they are recording against, and a form that
   * only names its subject on the screen before it is a form you can fill in for the wrong agent.
   *
   * ⚠️ `.tdb-ffq` RIDES THE PRE-LINE, NOT THE NAME. The dialog is labelled by its first `.tdb-ffq`,
   * and "Recording what you sent" is what this surface is; the agent is its subject. Labelling the
   * dialog with a person's name would announce the wrong thing.
   *
   * Keyed by family like every other band, so the mixed-walk crossfade key holds here too.
   */
  function journeyBand(famKey: BandFam, title: React.ReactNode, ag?: Agent, initials?: string, art?: JourneyArtKey) {
    const f = famKey;
    const src = art ? JOURNEY_ART[art] : null;
    return (
      <div key={f} className={`tdb-fband ${f} journey`}>
        <div className="tdb-jnwho">
          <span className="tdb-ffbigav">{initials || "•"}</span>
          <div className="tdb-fbtx">
            <div className="tdb-ffq tdb-jnpre">{title}</div>
            {ag && <div className="tdb-jnname">{agentPrimary(ag)}</div>}
            {ag?.agency && <div className="tdb-jnagency">{ag.agency}</div>}
          </div>
        </div>
        {src && <div className="tdb-fbart"><img src={src} alt="" /></div>}
      </div>
    );
  }

  /**
   * The journey body: numbered steps left, sticky reference panel right, summary strip above a
   * pinned footer of Cancel · the named commit verb · the consequence hint.
   *
   * ⚠️ SINGLE-COLUMN BELOW THE THRESHOLD IS A CONTAINER QUERY, NOT A MEDIA QUERY. The Calendar's
   * item sheet mounts this with no width constraint of its own, so the journey must answer to the
   * box it is in rather than to the viewport — a viewport query would lay a two-column journey out
   * inside a narrow sheet on a wide screen and be right about nothing.
   *
   * ⚠️ CANCEL AND ESCAPE BOTH GO THROUGH `requestExit`, which writes nothing. `← Back` appears only
   * where there is a step behind this one; it is an addition to the ref's three-item footer,
   * because dropping it would strand a multi-item walk with no way back to the item before.
   */
  function journeySheet(spec: JourneySpec, bandNode: React.ReactNode) {
    return sheet(
      <div className="tdb-jnbody">
        <div className="tdb-jngrid">
          <div className="tdb-jnsteps">
            {spec.steps.map((st, i) => (
              <div key={st.id} className="tdb-jnstep">
                <div className="tdb-jnn">
                  <span className="tdb-jni">{String(i + 1).padStart(2, "0")}</span>
                  <h4>{st.name}</h4>
                  {st.optional && <span className="tdb-jnopt">optional</span>}
                </div>
                {st.body}
              </div>
            ))}
          </div>
          <div className="tdb-jnrefwrap">
            <div className="tdb-jnref">
              <h5>{spec.reference.heading}</h5>
              <div className="tdb-jnrefq">{spec.reference.body}</div>
              {spec.reference.meta && <div className="tdb-jnrefm">{spec.reference.meta}</div>}
            </div>
          </div>
        </div>
      </div>,
      <>
        {step > 0 && <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>}
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={() => requestExit()}>Cancel</button>
        <button type="button" className="tdb-ffpri" disabled={spec.commit.disabled} onClick={spec.commit.onCommit}>{spec.commit.label}</button>
        {spec.commit.hint && <span className="tdb-jnhint">{spec.commit.hint}</span>}
      </>,
      bandNode,
      <div className="tdb-jnsum">
        <span className="tdb-jnsumic" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        <span className="tdb-jnsumtx">{spec.summary}</span>
      </div>,
    );
  }

  // The dialog is labelled by the CURRENT sheet's question heading — one renders at a time, so the
  // first .tdb-ffq is it (stamped after each step render; jsdom-safe).
  useEffect(() => {
    document.querySelector(".tdb-ff .tdb-ffq")?.setAttribute("id", "tdb-ff-heading");
  });

  const content = useMemo(() => {
    if (atReview) return reviewSheet();
    const it = items[qi];
    if (it.kind === "group") return groupSheet(it.group);
    /* ⚠️ A QUERY CARD NEVER REACHES THIS SHEET. Every task that finishes a query opens the query
       drawer (`drawerDoorForTask`), and the host routes it there before this mounts. What arrives
       as a single card is one of the two that are not about finishing a query: one agent's record
       gaps, or a card with no journey of its own (a hand-off that writes nothing). */
    const j = cardJourney(it.card);
    if (j === "dq") return dqSheet(it.card);
    return handoffSheet(it.card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    /* ⚠️ THE JOURNEY STATE BELONGS IN THESE DEPS OR THE SHEET DOES NOT REDRAW. `content` is memoised
       over every piece of scratch it reads, so a new one that is left out renders as a control that
       visibly does nothing. */
  }, [atReview, qi, step, items, rows, noMeansNo, found, notFound, assistAt, assisting, assistMsg, showMuted, staged, savedN, saving, queries, agents, manuscripts, activities, taskFlags, currentUser]);


  const remaining = items.length - qi - 1;
  return (
    <div className="tdb-ff" role="dialog" aria-modal="true" aria-label="Housekeeping sweep" aria-labelledby="tdb-ff-heading" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick}>
      {confirmAskNode}
      <div className="tdb-ffstage">
        {!atReview && remaining >= 2 && <div className="tdb-ffbehind b2" aria-hidden />}
        {!atReview && remaining >= 1 && <div className="tdb-ffbehind" aria-hidden />}
        {/* C1 — the positioning WRAPPER carries the corner exit; the sheet keeps overflow:hidden
            for band clipping, so the exit never lives inside the clipped box. Rendered AFTER the
            sheet in DOM order = the focus trap's LAST tab stop (trapTab walks DOM order). The
            chrome row is retired — progress lives in the sheet foot (sheet()). */}
        <div className="tdb-ffwrap">
          <div className={`tdb-ffsheet${leaving ? " leaving" : ""}${nudged ? " nudged" : ""}`} onAnimationEnd={(e) => { if ((e.target as HTMLElement).classList.contains("nudged")) setNudged(false); }}>
            {content}
          </div>
          <button type="button" className="tdb-ffx" aria-label="Back to my desk" onClick={() => requestExit()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HousekeepingSweep;
