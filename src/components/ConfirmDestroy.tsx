/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfirmDestroy — THE hard-delete guard (Phase 6A), shared by manuscript + agent deletes (desktop
 * and mobile; the mobile sketches' frame 5 is the visual reference — unavailable at build time, so
 * the layout follows the app's existing delete-dialog grammar with the pack's spec verbatim).
 *
 * Anatomy: serif "Delete {name}?" · a plain-English consequence line · the "Goes with it" panel
 * (live counts computed at dialog-open from cascade.destroyManifest — ONE source with the cascade
 * plan, so the dialog can never promise less than the delete removes) · type-to-confirm (the input
 * must match the name exactly; the warm-red "Delete forever" stays disabled until it does — the
 * gate is cascade.canDestroy, unit-locked) · "Keep it" is the safe default (autofocused).
 *
 * NO undo — hard deletes are hard; the type-to-confirm IS the safety, and the dialog says so.
 * LIGHT mode (a record nothing depends on, e.g. a zero-query agent): consequence line +
 * Delete/Keep only — deleting an unused contact shouldn't feel like decommissioning a reactor.
 */
import React, { useState } from "react";
import { DestroyManifest, canDestroy } from "../lib/cascade";

const RED = "#b3452f";

export interface ConfirmDestroyProps {
  kind: "manuscript" | "agent";
  name: string;
  manifest: DestroyManifest;
  /** No type-to-confirm; consequence + Delete/Keep. Callers pass this when nothing depends on it. */
  light?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const ConfirmDestroy: React.FC<ConfirmDestroyProps> = ({ kind, name, manifest, light = false, onConfirm, onCancel }) => {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const armed = canDestroy(typed, name, light);

  const rows: string[] = [];
  if (manifest.queries > 0) {
    rows.push(
      `${plural(manifest.queries, "query", "queries")}${manifest.materialsOut > 0 ? ` — ${manifest.materialsOut} with fulls or partials OUT with agents` : ""}`,
    );
  }
  if (manifest.activityRecords > 0) rows.push(plural(manifest.activityRecords, "activity record", "activity records"));
  if (manifest.packages > 0) rows.push(plural(manifest.packages, "submission package", "submission packages"));
  if (manifest.versions > 0) rows.push(plural(manifest.versions, "material version", "material versions"));
  if (manifest.taskFlags > 0) rows.push(plural(manifest.taskFlags, "to-do stance", "to-do stances"));

  const consequence = light
    ? `This permanently removes the ${kind}. Nothing else depends on it.`
    : `This permanently removes the ${kind} and everything below. This can’t be undone.`;

  async function fire() {
    if (!armed || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-5 z-[70]" onClick={busy ? undefined : onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`Delete ${name}?`}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#fdfaf5] rounded-[15px] w-[min(460px,94vw)] shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <h3 className="font-serif text-[20px] leading-tight mb-2 text-[#3a1c14]">Delete “{name}”?</h3>
          <p className="text-[13.5px] font-light leading-relaxed text-[rgba(58,28,20,0.72)]">{consequence}</p>

          {!light && rows.length > 0 && (
            <div className="mt-4 rounded-[11px] border border-[#e7d9cd] bg-[#faf4ec] px-4 py-3">
              <div className="font-mono text-[9px] tracking-[0.13em] uppercase text-[rgba(58,28,20,0.55)] mb-2">Goes with it</div>
              <ul className="space-y-1">
                {rows.map((r) => (
                  <li key={r} className="text-[13px] text-[#5a3a2e] flex items-start gap-2">
                    <span aria-hidden style={{ color: RED }}>—</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!light && (
            <label className="block mt-4">
              <span className="font-mono text-[9px] tracking-[0.13em] uppercase text-[rgba(58,28,20,0.55)] block mb-1.5">
                Type the name to confirm
              </span>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={name}
                disabled={busy}
                className="w-full rounded-[9px] border border-[#ddcbbb] bg-white px-3 py-2.5 text-[14px] text-[#3a1c14] focus:outline-none"
                style={{ borderColor: armed ? RED : undefined }}
              />
            </label>
          )}

          <div className="flex items-center gap-2.5 mt-5 flex-wrap">
            <button
              type="button"
              onClick={fire}
              disabled={!armed || busy}
              className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 text-white cursor-pointer disabled:opacity-40 disabled:cursor-default hover:brightness-110"
              style={{ background: RED }}
            >
              {busy ? "Deleting…" : "Delete forever"}
            </button>
            <button
              type="button"
              autoFocus
              onClick={onCancel}
              disabled={busy}
              className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 bg-white border border-[#ddcbbb] text-[#5a3a2e] hover:bg-[#faf4ec] cursor-pointer"
            >
              Keep it
            </button>
            {!light && <span className="text-[11.5px] text-[rgba(58,28,20,0.5)]">This can’t be undone.</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDestroy;
