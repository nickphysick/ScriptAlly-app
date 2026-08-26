/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight popover (not a full modal) for the writer's-turn action: recording that the
 * requested materials have been sent. Anchored to the contextual CTA in the query reading
 * pane and triggered only from Partial Requested / Full Requested / Revise & Resubmit.
 *
 * Fast path is just a date — "What you sent" and the reminder are optional and never block
 * save. On save it calls recordMaterialsSent (db.tsx), which performs the single status write.
 *
 * ⚠️ ITS COLOURS ARE THE NEUTRAL SCALE NOW, AND THAT REACHES BEYOND QUERY CENTRE. Every other
 * surface in this pack is page-scoped through `.qc-neutral`; this popover is rendered inline by its
 * caller rather than through a portal host, and one of those callers is the dashboard's
 * TimelineComposer. Tailwind arbitrary values cannot be page-scoped, so it reads `--n*` — which are
 * declared at `:root` and therefore resolve the same everywhere. The popover is consistent, and it
 * is neutral on the dashboard too. Reported rather than hidden: it is the one place this experiment
 * is not confined to one page.
 *
 * ⚠️ BURGUNDY IS UNTOUCHED. `#7c3a2a` and its hover stay — the accent is the accent. The one pink
 * that was here (`#e8c8bc`, a button rim) is not an accent, it was furniture.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Send, Bell, X } from "lucide-react";
import { Agent, Query } from "../types";
import type { BookVersion } from "../types";
import { sendVersionDefault } from "../lib/queryVersions";
import { agentPrimary } from "../lib/agentDisplay";
import { BrandDatePicker } from "./forms";
import { formatQueryMaterial } from "../lib/materials";

export type MarkSentKind = "partial" | "full" | "resubmit";

export interface MarkSentPopoverProps {
  /** Fixed-position style from the host's useFixedMenu, anchored to the CTA. */
  style: React.CSSProperties;
  /** §1 — the panel's element, so `useFixedMenu`'s `auto` placement can measure it and flip. */
  panelRef?: React.RefObject<HTMLElement | null>;
  kind: MarkSentKind;
  query: Query & { materialsRequestedType?: string; materialsRequestedQuantity?: string };
  agent: Agent;
  /** The CTA button — excluded from the outside-click so its toggle keeps working. */
  triggerRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  /** Manual override: the agent actually responded — switch to the full response/status path. */
  onRecordResponseInstead: () => void;
  /* ⚠️ §2 · `writerExpectedDate` — the writer is stating when they expect to hear back, so the
     prop is named for the column that holds writer-stated dates. */
  onSave: (args: { sentDate: string; writerExpectedDate?: string; nudgeDate?: string; bookVersionId?: string }) => Promise<void>;
  /**
   * The manuscript's BOOK versions, and the one the agent READ (Part E, D5–D8).
   *
   * ⚠️ FEWER THAN TWO AND THE FIELD NEVER APPEARS (D8) — there is nothing to choose between. The
   * host passes the list; the gate is applied here, once.
   */
  bookVersions?: readonly BookVersion[];
  /** The version on the sample in the package that went out — the pre-fill, and the note's subject. */
  readVersion?: BookVersion | null;
}

const todayISO = () => new Date().toISOString().split("T")[0];

/** Add whole weeks to a "YYYY-MM-DD" value, returning the same format (local, no UTC drift). */
const addWeeks = (iso: string, weeks: number): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + weeks * 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const TITLES: Record<MarkSentKind, string> = {
  partial: "Mark partial as sent",
  full: "Mark full as sent",
  resubmit: "Record your resubmission",
};

export const MarkSentPopover: React.FC<MarkSentPopoverProps> = ({
  style,
  panelRef,
  kind,
  query,
  agent,
  triggerRef,
  onClose,
  onRecordResponseInstead,
  onSave, bookVersions = [], readVersion = null,
}) => {
  const popRef = useRef<HTMLDivElement>(null);

  const [sentDate, setSentDate] = useState(todayISO());

  // "What you sent" — pre-filled from the agent's request, pre-selected, one tap to drop it.
  // Display-only confirmation; it never blocks save and isn't required by the write.
  const requestedMaterial = useMemo(() => {
    const type = query.materialsRequestedType;
    const qty = query.materialsRequestedQuantity;
    if (!type && !qty) return null;
    return formatQueryMaterial({ material: "Sample Pages", type: type as any, quantity: qty });
  }, [query.materialsRequestedType, query.materialsRequestedQuantity]);
  const [materialConfirmed, setMaterialConfirmed] = useState(true);

  // Reminder — de-emphasised behind a "Set a reminder" link. Auto-fills sentDate + responseTime.
  /**
   * ⚠️ SEEDED FROM WHAT THEY READ, AND `""` WHEN NOTHING IS KNOWN (D5/D7). `sendVersionDefault` is
   * the shared derivation rather than a local `?? ""` — a pre-filled answer the writer did not give
   * is this app's recorded fault class, and the empty string is what makes "not recorded" a real
   * option rather than a hole the form fills in.
   */
  const [bookVersionId, setBookVersionId] = useState(sendVersionDefault(readVersion));
  /* ⚠️ THE GATE, ONCE (D8). Below two versions there is nothing to choose between. */
  const showVersionField = bookVersions.length >= 2;

  const [wantReminder, setWantReminder] = useState(false);
  const [expectedDate, setExpectedDate] = useState("");
  const expectedEdited = useRef(false);

  const weeks = agent.responseTimeWeeks || 6;

  // Keep the expected date reactive to the date sent until the writer hand-edits it.
  useEffect(() => {
    if (wantReminder && !expectedEdited.current) {
      setExpectedDate(addWeeks(sentDate || todayISO(), weeks));
    }
  }, [wantReminder, sentDate, weeks]);

  const [saving, setSaving] = useState(false);

  // Dismiss on Esc and on outside-click (excluding the trigger so its toggle still closes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose, triggerRef]);

  const handleSave = async () => {
    if (!sentDate || saving) return;
    setSaving(true);
    try {
      const reminder = wantReminder && expectedDate ? expectedDate : undefined;
      /* ⚠️ AN EMPTY SELECT SENDS NOTHING (D7) — `undefined`, not `""`, so the write path omits the
         key rather than storing a version the writer never chose. */
      await onSave({ sentDate, writerExpectedDate: reminder, nudgeDate: reminder,
        bookVersionId: bookVersionId || undefined });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <motion.div
      /* one element, two holders: the outside-click handler's and the caller's flip measurement */
      ref={(el: HTMLDivElement | null) => {
        (popRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (panelRef) (panelRef as React.MutableRefObject<HTMLElement | null>).current = el;
      }}
      role="dialog"
      aria-label={TITLES[kind]}
      // initial={false}: render at the resting state immediately. The host control bar re-renders
      // often (live query snapshot), and a from-0 enter animation was getting reset to opacity 0 on
      // those renders; rendering opaque at rest is correct and flicker-free.
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14 }}
      style={{ ...style, width: 300, zIndex: 1000 }}
      className="bg-[var(--n1)] border border-[var(--n5)] rounded-xl shadow-[0_8px_24px_rgba(58,28,20,0.16)] p-3.5 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-[#7c3a2a]" />
          <span className="text-[12.5px] font-bold text-[var(--n8)]">{TITLES[kind]}</span>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-[var(--n6)] hover:text-[#7c3a2a] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Date sent — required, defaults today */}
      <label className="block text-[10px] uppercase font-bold text-[var(--n6)] tracking-wider mb-1">Date sent</label>
      <div className="mb-2.5">
        <BrandDatePicker value={sentDate} onChange={setSentDate} placeholder="When you sent it" />
      </div>

      {/* What you sent — optional confirmation chip */}
      {/**
        * ⚠️ ONE PRE-FILLED SELECT, ON THE TWO SEND FLOWS ONLY (D4–D7).
        *
        * The common case is one click and no thought: the right answer is already selected, and the
        * field costs something only when the truth is unusual — exactly when recording it is worth
        * anything.
        *
        * ⚠️ CHANGING IT RECORDS A DELIBERATE DIFFERENCE, NOT A MISTAKE (D6). No warning, no
        * confirmation, no verdict — sending a revision on purpose is ordinary, and the app's job is
        * to keep the record true rather than to ask whether the writer meant it.
        *
        * ⚠️ AND WHERE NOTHING IS KNOWN IT SAYS SO AND STORES NOTHING (D7). `Not recorded` is the
        * ordinary case — no send predating this feature carries a version, and the package's sample
        * may carry none either — so the default is the empty option and saving it writes no key.
        */}
      {showVersionField && (
        <div className="mb-2.5">
          <label htmlFor="ms-bookversion" className="block text-[10px] uppercase font-bold text-[var(--n6)] tracking-wider mb-1">
            Version sent
          </label>
          {readVersion ? (
            <p className="text-[11px] leading-snug text-[var(--n6)] mb-1.5">
              {agent.name} read <strong className="font-semibold text-[#7c3a2a]">{readVersion.name}</strong> in
              the sample you queried with. That&rsquo;s pre-selected below.
            </p>
          ) : (
            /* ⚠️ SAID, NOT GUESSED. Silence here would let the empty option read as a choice. */
            <p className="text-[11px] leading-snug text-[var(--n6)] mb-1.5">
              No version is recorded for the sample you queried with.
            </p>
          )}
          <select
            id="ms-bookversion"
            value={bookVersionId}
            onChange={(e) => setBookVersionId(e.target.value)}
            className="w-full text-[12px] rounded-[8px] border border-[var(--n4)] bg-white px-2.5 py-1.5 text-[var(--n8)]"
          >
            <option value="">— not recorded —</option>
            {bookVersions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <p className="text-[10px] leading-snug text-[var(--n6)] mt-1">
            Which version you actually sent. Change it if you sent something else &mdash; that&rsquo;s a
            fact worth recording, not a mistake.
          </p>
        </div>
      )}

      {requestedMaterial && (
        <>
          <label className="block text-[10px] uppercase font-bold text-[var(--n6)] tracking-wider mb-1">What you sent</label>
          <button
            type="button"
            onClick={() => setMaterialConfirmed(v => !v)}
            aria-pressed={materialConfirmed}
            className={`mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              materialConfirmed
                ? "bg-[rgba(124,58,42,0.10)] text-[#7c3a2a] border-[var(--n5)]"
                : "bg-white text-[var(--n6)] border-[var(--n4)]"
            }`}
          >
            {requestedMaterial}
          </button>
        </>
      )}

      {/* Reminder — de-emphasised behind a link */}
      {!wantReminder ? (
        <button
          type="button"
          onClick={() => setWantReminder(true)}
          className="flex items-center gap-1.5 text-[11px] text-[var(--n6)] hover:text-[#7c3a2a] transition-colors mb-1"
        >
          <Bell className="w-3 h-3" />
          Set a reminder
        </button>
      ) : (
        <div className="mb-1 p-2 bg-[var(--n1)] border border-[var(--n4)] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-bold text-[var(--n6)] tracking-wider">Expected reply by</label>
            <button
              type="button"
              onClick={() => { setWantReminder(false); expectedEdited.current = false; }}
              className="text-[10px] text-[var(--n6)] hover:text-[#7c3a2a]"
            >
              Remove
            </button>
          </div>
          <BrandDatePicker
            value={expectedDate}
            onChange={(v) => { expectedEdited.current = true; setExpectedDate(v); }}
            placeholder="Auto-filled from response time"
          />
          <p className="text-[10px] text-[var(--n6)] leading-snug mt-0.5">
            We'll remind you to nudge {agentPrimary(agent).split(" ")[0]} if you haven't heard back by then.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[var(--n6)] hover:bg-stone-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!sentDate || saving}
          className="px-4 py-1.5 rounded-full text-[11px] font-bold text-[var(--n0)] bg-[#7c3a2a] hover:bg-[#6c3224] disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Confirm sent"}
        </button>
      </div>

      {/* Manual override — the agent responded instead of waiting for materials. */}
      <button
        type="button"
        onClick={onRecordResponseInstead}
        className="mt-2 block w-full text-center text-[10.5px] text-[var(--n6)] hover:text-[#7c3a2a] transition-colors"
      >
        Agent responded instead? Record a response →
      </button>
    </motion.div>
  );
};
