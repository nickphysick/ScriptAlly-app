/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do on the phone v1, screens 2 and 3 (design-refs/todo-phone-v1/todo-phone-v1.html) — THE DESK, FULL SCREEN, AND
 * THE CARD AS A PULL-UP SHEET. Opened from the phone's To-do list and from Home's To-do card.
 *
 * ⚠️ ONE BRAIN (D1). The questions, their answered tests, their summaries and the save are the desktop's own
 *    (`useWsCore().makeFlow` → `buildFlow`); the snooze is the desktop's writer, the dismiss its reasons and writes.
 *    Nothing here asks a question of its own.
 * ⚠️ A CHOICE NEVER MOVES YOU ON (the desktop's L8): only the footer's one pill advances, and it is disabled until the
 *    question is answered. On the last question the pill is the flow's own verb and commits.
 * ⚠️ THE CARD IS THE QUERY CENTRE'S OWN (`PreviewQueryCard`, `QcQueryCard149` over `buildCardView`), with the task's
 *    pending step as its dashed draft — never a second card.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QueryStatus } from "../../../types";
import type { WsTask } from "../../../lib/todoWs";
import { dueChip, mentorLine } from "../../../lib/todoWs";
import { slotAnswer, slotWord } from "../../../lib/todoPhone";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { flagForCard } from "../../../lib/todoColumns";
import { setAsideRules } from "../../../lib/todoSetAside";
import { RULE_PLAIN } from "../../../lib/taskSettings";
import { openQueryDrawer, showUndoBar } from "../../../lib/queryActions/drawerStore";
import { lockStageScroll } from "../../../lib/stageScroll";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { stampedCardRows } from "../../queries/centre/qcCardView";
import { quietWeeksOf } from "../../../lib/queryState";
import { packagesUnlocked } from "../../../lib/entitlements";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import { SetAsidePop } from "../SetAsidePop";
import { DismissPop, type DismissChoice } from "../ws/WsPops";
import { WsOwnTask } from "../ws/WsOwnTask";
import { PreviewQueryCard, useQueryLog } from "../ws/WsPreview";
import type { Answers } from "../ws/wsFlows";
import { useWsBatch, type useWsCore } from "../ws/useWsCore";
import type { BoardCard } from "../../../lib/todoBoard";
import "./todoPhoneV1.css";

type Core = ReturnType<typeof useWsCore>;
const DAY = 86400000;
const msOf = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const t = typeof v === "object" && v && "toDate" in (v as object) ? (v as { toDate(): Date }).toDate().getTime() : new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};

export interface PhoneTaskScreenProps {
  core: Core;
  /** the list's order: what "{i} of {n}" counts and the arrows walk */
  tasks: readonly WsTask[];
  startKey: string;
  now: number;
  onClose: () => void;
  /** Phone app v4: when given, a finished task hands back what was done and the next task's key instead of opening it,
   *  so Today can show the stamp and "Continue" (the snackbar and its Undo are unchanged) */
  onDid?: (did: { head: string; task: WsTask; next: string | null }) => void;
}

export const PhoneTaskScreen: React.FC<PhoneTaskScreenProps> = ({ core, tasks, startKey, now, onClose, onDid }) => {
  const { db, all, today, todayYmd } = core;
  const { queries, agents, manuscripts, packages, activities, taskFlags, currentUser, updateUserTask } = db;
  const [key, setKey] = useState<string | null>(startKey);
  const [A, setA] = useState<Answers>({});
  const [qi, setQi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [later, setLater] = useState(false);
  const [dis, setDis] = useState<HTMLElement | null>(null);
  const [picking, setPicking] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const sel = tasks.find((t) => t.key === key) ?? all.find((t) => t.key === key) ?? null;
  /* ⚠️ DECLARED ABOVE `go`, which resets its skips */
  const batch = useWsBatch(sel, key, setKey, all);
  const { bRemaining, bCur, deskT } = batch;
  const go = (k: string | null) => {
    if (!k) { onClose(); return; }
    setKey(k); setA({}); setQi(0); setCardOpen(false); setLater(false); setDis(null); setPicking(false); batch.resetSkip();
    sheetRef.current?.scrollTo({ top: 0 });
  };
  const pos = sel ? tasks.findIndex((t) => t.key === sel.key) : -1;
  const step = (d: 1 | -1) => { if (!tasks.length) return; const i = pos < 0 ? 0 : (pos + d + tasks.length) % tasks.length; go(tasks[i].key); };
  const nextKeyAfter = (t: WsTask): string | null => { const i = tasks.findIndex((x) => x.key === t.key); return (tasks[i + 1] ?? null)?.key ?? null; };

  /* the page underneath does not scroll while the screen is up; Escape closes it */
  useEffect(() => {
    const release = lockStageScroll();
    document.body.classList.add("tdp-task-on");
    return () => { release(); document.body.classList.remove("tdp-task-on"); };
  }, []);
  useEscapeLayer(true, onClose, ESC_LEVEL.page);
  /* a task gone from the board (saved elsewhere, or the last of the list): back to the list.
     ⚠️ NOT WHILE A SAVE IS IN FLIGHT: Firestore applies the write locally before `commit()` resolves, so the task leaves
     the board a moment before the save hands over the next one — closing then would throw away "the next task opens". */
  const saving = useRef(false);
  useEffect(() => { if (key && !sel && !saving.current) onClose(); }, [key, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (m: string, undo?: () => Promise<void>) => showUndoBar({ message: m, sub: "", ...(undo ? { undo } : {}) });
  const flow = useMemo(() => core.makeFlow(sel, deskT, A, setA, (m) => flash(m)),
    [sel, deskT, A, today, currentUser?.id, queries, agents, manuscripts, activities, taskFlags]); // eslint-disable-line react-hooks/exhaustive-deps

  const qLog = useQueryLog(currentUser?.id ?? null, cardOpen ? deskT?.query?.id ?? null : null);
  const quietWeeks = quietWeeksOf(currentUser);
  const cardRow = useMemo(() => (cardOpen && deskT?.query ? stampedCardRows(queries, agents, activities, quietWeeks, now).find((r) => r.id === deskT.query!.id) ?? null : null),
    [cardOpen, deskT?.query, queries, agents, activities, quietWeeks, now]);

  if (!sel) return null;
  const t = deskT ?? sel;
  const own = t.kind === "own" && t.userTask ? t.userTask : null;
  const qs = flow?.questions ?? [];
  const cur = Math.min(qi, Math.max(0, qs.length - 1));
  const curQ = qs[cur] ?? null;
  const last = cur === qs.length - 1;
  const chip = dueChip(t);
  const facts = t.kind === "quiet" || t.kind === "nudge" ? core.quietFacts(t) : undefined;
  const meta = own ? "Your task" : [t.agentName, t.agency && t.agency !== t.agentName ? t.agency : ""].filter(Boolean).join(" · ");
  const q = t.query ?? null;
  const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) ?? null : null;
  const sent = q ? msOf(q.dateSent) : null;
  const dayN = sent != null ? Math.max(1, Math.floor((now - sent) / DAY) + 1) : null;

  /* ── the save: the flow's own commit, the navy snackbar with its Undo, then the next task ── */
  const logIt = async () => {
    if (!flow?.commit || busy) return;
    setBusy(true);
    saving.current = true;
    const next = nextKeyAfter(sel);
    try {
      const d = await flow.commit();
      if (sel.kind === "batch" && bCur && bRemaining.length > 1) {
        const qid = bCur.queryId;
        batch.markSaved(qid);
        setA({}); setQi(0);
        flash(d.msg, d.undo ? async () => { await d.undo!(); batch.unmarkSaved(qid); } : undefined);
        return;
      }
      flash(d.head, d.undo);
      if (onDid) { onDid({ head: d.head, task: sel, next }); return; }
      go(next);
    } catch (e) {
      console.error("[to-do] the save failed", e);
      flash("Couldn’t save that. Nothing was changed.");
    } finally { setBusy(false); saving.current = false; }
  };
  const ownDone = async () => {
    if (!own || busy) return;
    setBusy(true);
    saving.current = true;
    const next = nextKeyAfter(sel);
    try { const undo = await core.ownDoneWrite(own); flash("Done. One less thing on your mind.", undo); if (onDid) { onDid({ head: "Done", task: sel, next }); return; } go(next); }
    catch { flash("Couldn’t save that. Nothing was changed."); } finally { setBusy(false); saving.current = false; }
  };

  /* ── Later: the existing snooze sheet over the desktop's own writer ── */
  const card = core.cardOf(sel);
  const rules = sel.userTask ? null : setAsideRules(card, sel.query, flagForCard(card, taskFlags)?.snoozeCount ?? 0, todayYmd);
  const snooze = async (days: number, ymd: string) => {
    setLater(false);
    const next = nextKeyAfter(sel);
    saving.current = true;
    const undo = await core.snoozeTask(sel, days).finally(() => { saving.current = false; });
    if (!undo) { flash("That task can’t be snoozed that far."); return; }
    const [y, m, dd] = ymd.split("-").map(Number);
    flash(core.snoozeWords(sel, new Date(y, m - 1, dd)), undo);
    go(next);
  };
  /* ── Dismiss: the desktop's reasons and writes ── */
  const choose = async (c: DismissChoice) => {
    setDis(null);
    if (c === "logit") { setQi(0); if (t.kind === "nudge") setA((a) => ({ ...a, sent: true })); flash("Answer the questions, and it’s logged."); return; }
    if (c === "card") { core.openCard(t); return; }
    if (c === "withdraw" && t.query) { openQueryDrawer({ mode: "close", queryId: t.query.id, preset: { closeWhy: "withdraw" } } as never); return; }
    const next = nextKeyAfter(sel);
    saving.current = true;
    const w = await core.dismissWrite(sel, c).finally(() => { saving.current = false; });
    if (w === "error") { flash("Couldn’t save that. Nothing was changed."); return; }
    if (!w) return;
    flash(w.msg, w.undo);
    go(next);
  };

  /* ── the footer's one pill ── */
  let pill: React.ReactNode = null;
  let progress: string | null = null;
  if (own) {
    const steps = own.steps ?? [];
    progress = steps.length ? `${steps.filter((x) => x.done).length} of ${steps.length} steps` : null;
    pill = <button type="button" className="tdp-pill" data-tdp="primary" disabled={busy} onClick={() => void ownDone()}>Mark done</button>;
  } else if (flow) {
    if (curQ) {
      const verb = last && (curQ.answered || t.kind !== "quiet");
      if (verb && flow.door && !flow.commit) pill = <button type="button" className="tdp-pill" data-tdp="primary" disabled={!curQ.answered} onClick={flow.door.open}>{flow.door.label}</button>;
      else if (verb && flow.commit) pill = <button type="button" className="tdp-pill" data-tdp="primary" data-log="" disabled={!curQ.answered || busy} onClick={() => void logIt()}>Log it</button>;
      else pill = <button type="button" className="tdp-pill" data-tdp="primary" data-next="" disabled={!curQ.answered} onClick={() => setQi(cur + 1)}>Next →</button>;
      progress = `${cur + 1} of ${t.kind === "quiet" && !A.act ? "a few" : qs.length}`;
    } else if (flow.door) {
      pill = <button type="button" className="tdp-pill" data-tdp="primary" onClick={flow.door.open}>{flow.door.label}</button>;
    }
  }

  const ruleWord = (() => { const r = (sel.item.card as BoardCard & { sweepRule?: string }).sweepRule; return r && r in RULE_PLAIN ? RULE_PLAIN[r] : null; })();
  const title = t.kind === "batch" && bCur ? `${t.first} · ${bRemaining.indexOf(bCur) + 1} of ${bRemaining.length}` : t.title;

  return createPortal(
    <div className="pa-layer tws-layer tdp-task" role="dialog" aria-modal="true" aria-label={t.title} data-tdp="task" data-kind={t.kind} data-key={sel.key}>
      <div className="tdp-tscroll" ref={sheetRef}>
        <header className="tdp-tband" data-tdp="task-band">
          <div className="tdp-tnav">
            <button type="button" className="pa-ring" aria-label="Close" data-tdp="close" onClick={onClose}>{PI.close}</button>
            {pos >= 0 ? <span className="tdp-pos" data-tdp="pos">{pos + 1} of {tasks.length}</span> : <span className="tdp-pos" />}
            <button type="button" className="pa-ring" aria-label="Previous task" data-tdp="prev" onClick={() => step(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></button>
            <button type="button" className="pa-ring" aria-label="Next task" data-tdp="next-task" onClick={() => step(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
          </div>
          <h1 className="tdp-ttitle" data-tdp="title">{title}</h1>
          {meta ? <p className="tdp-tsub" data-tdp="meta">{meta}</p> : null}
          {q ? (
            <div className="tdp-mini" role="button" tabIndex={0} data-tdp="mini" aria-label="See the whole card" onClick={() => setCardOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter") setCardOpen(true); }}>
              <div className="tdp-minih"><span>{STAGE_NAME[q.status as QueryStatus] ?? q.status}</span>{dayN ? <span>Day {dayN}</span> : null}</div>
              <div className="tdp-minib">
                <PhoneDisc status={q.status} size={36} />
                <span className="tdp-mt"><b>{t.agentName || t.first}</b><span>{ms?.title ?? ""}</span></span>
                {chip ? <span className="tdp-due" data-late={chip.late ? "" : undefined}><b>{chip.b}</b>{chip.s ? ` ${chip.s}` : ""}</span> : null}
              </div>
              {qs.length ? (
                <div className="tdp-slots" data-tdp="slots">
                  {qs.map((x, i) => {
                    const done = i < cur;
                    return (
                      <button key={x.key} type="button" className="tdp-slot" data-tdp-slot={x.key} data-done={done ? "" : undefined}
                        onClick={(e) => { e.stopPropagation(); if (done) setQi(i); else setCardOpen(true); }}>
                        {done && x.summary ? slotAnswer(x.summary) : slotWord(x.key, x.title)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <span className="tdp-peek">Tap to see the whole card</span>
            </div>
          ) : null}
        </header>

        <div className="tdp-tsheet" data-tdp="task-sheet">
          <div className="tdp-hawk"><p className="tdp-bub" data-tdp="mentor">{mentorLine(t, facts)}</p></div>
          {own ? (
            <WsOwnTask task={own} today={today} agents={agents} queries={queries} picking={picking} setPicking={setPicking}
              titleOf={(id) => manuscripts.find((m) => m.id === id)?.title?.trim() || null}
              w={{ update: (f) => updateUserTask(own.id, f), done: () => void ownDone(), said: (m) => flash(m) }} />
          ) : (
            <>
              {cur > 0 ? (
                <div className="tdp-answered" data-tdp="answers">
                  {qs.slice(0, cur).map((x, i) => (
                    <button key={x.key} type="button" className="tdp-ans" data-tdp-qa={x.key} aria-label={`${x.title}: ${x.summary}. Change`} onClick={() => setQi(i)}>
                      <span aria-hidden="true">✓</span>{x.summary}
                    </button>
                  ))}
                </div>
              ) : null}
              {curQ ? (
                <div key={curQ.key} className="tdp-q" data-tdp-q={curQ.key}>
                  <h2 className="tdp-qt">{curQ.title}</h2>
                  {curQ.hint ? <p className="tdp-qh">{curQ.hint}</p> : null}
                  <div className="tdp-qbody">{curQ.body}</div>
                </div>
              ) : null}
              {t.kind === "batch" && bRemaining.length > 1 ? (
                <button type="button" className="tdp-skip" data-tdp="skip" onClick={() => { if (batch.skipOne()) { setA({}); setQi(0); } }}>Skip this one</button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <footer className="tdp-foot" data-tdp="footer">
        <button type="button" className="tdp-ghost" aria-label={own ? "Move it" : "Later"} data-tdp="later" onClick={() => setLater(true)}>{PI.later}</button>
        <button type="button" className="tdp-ghost" aria-label={own ? "Delete" : "Dismiss"} data-tdp="dismiss" onClick={(e) => setDis(e.currentTarget)}>{PI.closeq}</button>
        {progress ? <em className="tdp-of" data-tdp="progress">{progress}</em> : <span className="tdp-of" />}
        {pill}
      </footer>

      <MobileSheet open={later} onClose={() => setLater(false)} ariaLabel="Later" pa={{ height: "auto", white: true, className: "pa-later", z: 1100 }}>
        {later ? (
          <div data-pa="later-sheet">
            <SetAsidePop mode="aside" focus="snooze" todayYmd={todayYmd} rules={rules}
              first={t.first} backLine="" rulePlain={null} deedPlain={t.title}
              onSnooze={(days, ymd) => void snooze(days, ymd)} onDismiss={() => setLater(false)} onRule={() => setLater(false)}
              onDelete={() => setLater(false)} onDoor={() => setLater(false)} onClose={() => setLater(false)} opener={null} />
          </div>
        ) : null}
      </MobileSheet>
      {dis ? <DismissPop t={t} ruleWord={ruleWord} opener={dis} onClose={() => setDis(null)} onSnoozeInstead={() => { setDis(null); setLater(true); }} onChoose={(c) => void choose(c)} /> : null}

      <MobileSheet open={cardOpen && !!q} onClose={() => setCardOpen(false)} ariaLabel={`${t.first}’s query`} pa={{ height: "auto", className: "pa-qsheet tdp-csheet", z: 1100 }}>
        {cardOpen && q ? (
          <div className="pa-qwrap tdp-cwrap" data-tdp="card">
            <PreviewQueryCard q={q} row={cardRow} agent={t.agent ?? null} queries={queries} manuscripts={manuscripts} manuscript={ms} packages={packages}
              log={qLog} draft={flow ? (Object.values(A).some((v) => v !== undefined) ? flow.draft : { section: flow.draft.section }) : null}
              nowMs={now} quietWeeks={quietWeeks} free={!packagesUnlocked(db.entitlement)} />
          </div>
        ) : null}
      </MobileSheet>
    </div>,
    document.body,
  );
};
