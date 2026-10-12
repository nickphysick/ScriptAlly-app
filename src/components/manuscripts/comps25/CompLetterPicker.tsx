/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part E: "Comps this letter mentions". A centred dialog, portalled, on the
 * escape stack above the comp drawer.
 *
 * Three kinds of letter:
 *   - not sent: tick and Save, as often as you like;
 *   - sent, nothing recorded: tick and Save ONCE (the notice says its queries are tracked too);
 *   - sent and recorded: FIXED. The list is read-only and the foot offers "New version of {name}".
 *
 * The ticks are the dialog's own draft; nothing is written until Save.
 */
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CompTitle } from "../../../types";
import { MAX_LETTER_COMPS, compKey, ready } from "../../../lib/compUsage";
import { LetterLite, kindOf, letterShort } from "../../../lib/compsLibrary";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CloseIcon, KindIcon, LockIcon, TickIcon } from "./marks";

export interface PickerRequest { letterId: string | null; forKey?: string }

export const CompLetterPicker: React.FC<{
  request: PickerRequest | null;
  letters: readonly LetterLite[];
  currentLetterId: string | null;
  comps: readonly CompTitle[];
  /** letter id → the number of queries it went out with */
  sentByLetter: ReadonlyMap<string, number>;
  onClose: () => void;
  /** write the ticked comps (by their keys) to one letter */
  onSave: (letterId: string, keys: string[]) => void;
  onNewVersion: (letterId: string) => void;
  onOpenPackages: () => void;
}> = (p) => {
  const open = !!p.request;
  const [letterId, setLetterId] = useState<string | null>(null);
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const keyOfId = useMemo(() => new Map(p.comps.map((c, i) => [c.id ?? "", compKey(c, i)])), [p.comps]);
  const letter = p.letters.find((l) => l.id === letterId) ?? null;
  const sent = letter ? (p.sentByLetter.get(letter.id) ?? 0) : 0;
  const recorded = !!letter && Array.isArray(letter.compIds);
  const fixed = sent > 0 && recorded;

  /* a letter made a moment ago ("New version") arrives from the store a tick after it is asked for */
  const wantedHere = !!p.request?.letterId && p.letters.some((l) => l.id === p.request!.letterId);

  const load = (id: string | null, forKey?: string) => {
    const l = p.letters.find((x) => x.id === id) ?? null;
    const next = new Set((l?.compIds ?? []).map((cid) => keyOfId.get(cid)).filter((k): k is string => !!k));
    const isFixed = !!l && Array.isArray(l.compIds) && (p.sentByLetter.get(l.id) ?? 0) > 0;
    const c = forKey ? p.comps.find((x, i) => compKey(x, i) === forKey) : null;
    if (c && ready(c) && !isFixed && next.size < MAX_LETTER_COMPS) next.add(forKey!);
    setLetterId(l?.id ?? null);
    setTicks(next);
  };

  /* opening: the letter the door named, else the current one.
     ⚠️ CHOSEN DURING RENDER, NEVER IN AN EFFECT (comps v26.1). An effect runs after the picker is drawn, so for one
     frame it stood with no letter, no ticks and "0 logged". Setting state while rendering makes React render again
     before anything is put on screen, so the first frame drawn is the chosen letter's. */
  const [loaded, setLoaded] = useState<{ request: PickerRequest | null; here: boolean }>({ request: null, here: false });
  const stale = loaded.request !== p.request || (!!p.request && loaded.here !== wantedHere);
  const sync = () => {
    setLoaded({ request: p.request, here: wantedHere });
    if (p.request) load(p.request.letterId ?? p.currentLetterId ?? p.letters[p.letters.length - 1]?.id ?? null, p.request.forKey);
  };
  if (stale) sync();

  useEscapeLayer(open, p.onClose, ESC_LEVEL.pageModal);
  if (!open || typeof document === "undefined") return null;

  const toggle = (key: string) => setTicks((t) => {
    const n = new Set(t);
    if (n.has(key)) n.delete(key);
    else if (n.size < MAX_LETTER_COMPS) n.add(key);
    return n;
  });
  const short = letter ? letterShort(letter.versionName) : "";
  const q = `${sent} ${sent === 1 ? "query" : "queries"}`;

  return createPortal(
    <div className="cv-layer cv-pdim" data-cv="picker-dim" onPointerDown={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      <div className="cv-pk" role="dialog" aria-modal="true" aria-label="Log comps in a letter" data-cv="picker" data-letter={letter?.id ?? ""} data-fixed={fixed ? "true" : "false"}>
        <div className="cv-ph">
          <div><h3 className="cv-pt">Comps this letter mentions</h3><small>Choose every comp the letter references.</small></div>
          <button type="button" className="cv-x" aria-label="Close" data-cv="picker-close" onClick={p.onClose}><CloseIcon /></button>
        </div>
        {p.letters.length === 0 ? (
          <div className="cv-pempty" data-cv="picker-empty">
            <p>You haven’t saved a query letter for this book yet. Save one in Submission packages, then log the comps it mentions here.</p>
            <button type="button" className="cv-pillbtn" onClick={p.onOpenPackages}>Open Submission packages</button>
          </div>
        ) : (
          <>
            <div className="cv-lsel" data-cv="picker-letters">
              {p.letters.map((l) => (
                <button key={l.id} type="button" data-cv="picker-letter" data-letter={l.id} aria-pressed={l.id === letterId} title={l.versionName} onClick={() => load(l.id)}>
                  {(p.sentByLetter.get(l.id) ?? 0) > 0 && <LockIcon />}{letterShort(l.versionName)}
                </button>
              ))}
            </div>
            {fixed
              ? <div className="cv-pn" data-cv="picker-notice">{short} has gone out with {q}, so its comps are fixed. To change them, make a new version of the letter.</div>
              : sent > 0
                ? <div className="cv-pn" data-cv="picker-notice">{short} has already gone out with {q}. Log what it mentioned and {sent === 1 ? "that query is" : "those queries are"} tracked too.</div>
                : null}
            <ul className="cv-tk" data-cv="picker-list">
              {p.comps.map((c, i) => {
                const key = compKey(c, i);
                const on = ticks.has(key);
                const ok = ready(c);
                const can = ok && !fixed;
                const by = [c.author?.trim(), c.year ? String(c.year) : ""].filter(Boolean).join(" · ");
                return (
                  <li key={key} role="checkbox" aria-checked={on} aria-disabled={!can} tabIndex={can ? 0 : -1} data-cv="picker-comp" data-key={key}
                    className={`${ok ? "" : "is-off"}${fixed ? " is-ro" : ""}`}
                    onClick={() => { if (can) toggle(key); }}
                    onKeyDown={(e) => { if (can && (e.key === " " || e.key === "Enter")) { e.preventDefault(); toggle(key); } }}>
                    <span className="cv-cbx">{on && <TickIcon />}</span>
                    <span className={`cv-disc${on ? "" : " is-ring"}`}><KindIcon kind={kindOf(c)} /></span>
                    <span><b>{c.title}</b>{ok ? <small>{by}</small> : <small className="is-need">{kindOf(c) === "book" && !c.publisher?.trim() ? "Needs a publisher first" : "Needs a year first"}</small>}</span>
                  </li>
                );
              })}
            </ul>
            <div className="cv-pf">
              <span data-cv="picker-count">{ticks.size} logged{ticks.size >= MAX_LETTER_COMPS ? ` · a letter records up to ${MAX_LETTER_COMPS}` : ""}</span>
              <div className="cv-bt">
                {fixed ? (
                  <>
                    <button type="button" className="cv-ghost" onClick={p.onClose}>Close</button>
                    <button type="button" className="cv-pillbtn" data-cv="picker-newv" onClick={() => letter && p.onNewVersion(letter.id)}>New version of {short}</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="cv-ghost" data-cv="picker-cancel" onClick={p.onClose}>Cancel</button>
                    <button type="button" className="cv-pillbtn" data-cv="picker-save" disabled={!letter} onClick={() => letter && p.onSave(letter.id, [...ticks])}>Save</button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};
