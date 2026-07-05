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
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Send, Bell, X } from "lucide-react";
import { Agent, Query } from "../types";
import { agentPrimary } from "../lib/agentDisplay";
import { BrandDatePicker } from "./forms";
import { formatQueryMaterial } from "../lib/materials";

export type MarkSentKind = "partial" | "full" | "resubmit";

export interface MarkSentPopoverProps {
  /** Fixed-position style from the host's useFixedMenu, anchored to the CTA. */
  style: React.CSSProperties;
  kind: MarkSentKind;
  query: Query & { materialsRequestedType?: string; materialsRequestedQuantity?: string };
  agent: Agent;
  /** The CTA button — excluded from the outside-click so its toggle keeps working. */
  triggerRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  /** Manual override: the agent actually responded — switch to the full response/status path. */
  onRecordResponseInstead: () => void;
  onSave: (args: { sentDate: string; responseDeadline?: string; nudgeDate?: string }) => Promise<void>;
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
  kind,
  query,
  agent,
  triggerRef,
  onClose,
  onRecordResponseInstead,
  onSave,
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
      await onSave({ sentDate, responseDeadline: reminder, nudgeDate: reminder });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <motion.div
      ref={popRef}
      role="dialog"
      aria-label={TITLES[kind]}
      // initial={false}: render at the resting state immediately. The host control bar re-renders
      // often (live query snapshot), and a from-0 enter animation was getting reset to opacity 0 on
      // those renders; rendering opaque at rest is correct and flicker-free.
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14 }}
      style={{ ...style, width: 300, zIndex: 1000 }}
      className="bg-[#fdfaf5] border border-[#e0d5c8] rounded-xl shadow-[0_8px_24px_rgba(58,28,20,0.16)] p-3.5 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-[#7c3a2a]" />
          <span className="text-[12.5px] font-bold text-[#3a1c14]">{TITLES[kind]}</span>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-[#c9a89e] hover:text-[#7c3a2a] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Date sent — required, defaults today */}
      <label className="block text-[10px] uppercase font-bold text-[#a08070] tracking-wider mb-1">Date sent</label>
      <div className="mb-2.5">
        <BrandDatePicker value={sentDate} onChange={setSentDate} placeholder="When you sent it" />
      </div>

      {/* What you sent — optional confirmation chip */}
      {requestedMaterial && (
        <>
          <label className="block text-[10px] uppercase font-bold text-[#a08070] tracking-wider mb-1">What you sent</label>
          <button
            type="button"
            onClick={() => setMaterialConfirmed(v => !v)}
            aria-pressed={materialConfirmed}
            className={`mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              materialConfirmed
                ? "bg-[rgba(124,58,42,0.10)] text-[#7c3a2a] border-[#e8c8bc]"
                : "bg-white text-[#9a8579] border-[#e8e0d8]"
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
          className="flex items-center gap-1.5 text-[11px] text-[#9a8579] hover:text-[#7c3a2a] transition-colors mb-1"
        >
          <Bell className="w-3 h-3" />
          Set a reminder
        </button>
      ) : (
        <div className="mb-1 p-2 bg-[#fbf6f0] border border-[#ece0d4] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-bold text-[#a08070] tracking-wider">Expected reply by</label>
            <button
              type="button"
              onClick={() => { setWantReminder(false); expectedEdited.current = false; }}
              className="text-[10px] text-[#c9a89e] hover:text-[#7c3a2a]"
            >
              Remove
            </button>
          </div>
          <BrandDatePicker
            value={expectedDate}
            onChange={(v) => { expectedEdited.current = true; setExpectedDate(v); }}
            placeholder="Auto-filled from response time"
          />
          <p className="text-[10px] text-[#a08070] leading-snug mt-0.5">
            We'll remind you to nudge {agentPrimary(agent).split(" ")[0]} if you haven't heard back by then.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#9a8579] hover:bg-stone-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!sentDate || saving}
          className="px-4 py-1.5 rounded-full text-[11px] font-bold text-[#fffffd] bg-[#7c3a2a] hover:bg-[#6c3224] disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Confirm sent"}
        </button>
      </div>

      {/* Manual override — the agent responded instead of waiting for materials. */}
      <button
        type="button"
        onClick={onRecordResponseInstead}
        className="mt-2 block w-full text-center text-[10.5px] text-[#9a8579] hover:text-[#7c3a2a] transition-colors"
      >
        Agent responded instead? Record a response →
      </button>
    </motion.div>
  );
};
