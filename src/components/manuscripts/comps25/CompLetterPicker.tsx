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
 *
 * Comps v28 §E: each row shows its record (its asked-for-more rate if it has gone out, its age if it is over five
 * years old, else "not sent yet"), and a live tip advises against more than three comps or old ones. The tip
 * NEVER blocks Save. A comp brought by a card's or the drawer's "Log in a letter" is pre-ticked only on an unsent
 * letter (a sent one records what actually went).
 */
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CompTitle } from "../../../types";
import { MAX_LETTER_COMPS, compKey, ready } from "../../../lib/compUsage";
import { CompRow, LetterLite, kindOf, letterShort } from "../../../lib/compsLibrary";
import { pickRecord, pickTip } from "../../../lib/compsShelf";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CloseButton, KindIcon, LockIcon, TickIcon } from "./marks";

export interface PickerRequest { letterId: string | null; forKey?: string }

export const CompLetterPicker: React.FC<{
  request: PickerRequest | null;
  letters: readonly LetterLite[];
  currentLetterId: string | null;
  comps: readonly CompTitle[];
  /** the shelf's rows (for each comp's record), and the current year */
  rows: readonly CompRow[];
  now: number;
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
    const unsent = !!l && (p.sentByLetter.get(l.id) ?? 0) === 0;
    const c = forKey ? p.comps.find((x, i) => compKey(x, i) === forKey) : null;
    if (c && ready(c) && unsent && next.size < MAX_LETTER_COMPS) next.add(forKey!);
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
  const rowByKey = new Map(p.rows.map((r) => [r.key, r]));
  const tip = fixed ? [] : pickTip(p.comps.filter((c, i) => ticks.has(compKey(c, i))), p.now);
  const q = `${sent} ${sent === 1 ? "query" : "queries"}`;

  return createPortal(
    <div className="cv-layer cv-pdim" data-cv="picker-dim" onPointerDown={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      <div className="cv-pk" role="dialog" aria-modal="true" aria-label="Log comps in a letter" data-cv="picker" data-letter={letter?.id ?? ""} data-fixed={fixed ? "true" : "false"}>
        <div className="cv-ph">
          <div><h3 className="cv-pt">Comps this letter names</h3><small>Choose every comp the letter mentions.</small></div>
          <CloseButton className="cv-x" data-cv="picker-close" onClick={p.onClose} />
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
                    {(() => {
                      const r = rowByKey.get(key);
                      if (!r) return null;
                      const rec = pickRecord(r, p.now);
                      return rec.kind === "rate"
                        ? <span className="cx-pr" data-cv="picker-record" data-kind="rate">{rec.pct}%<small>of {rec.queries} asked for more</small></span>
                        : rec.kind === "old"
                          ? <span className="cx-pr is-old" data-cv="picker-record" data-kind="old"><small>{rec.age} yrs old</small></span>
                          : <span className="cx-pr" data-cv="picker-record" data-kind="unsent"><small>Not sent yet</small></span>;
                    })()}
                  </li>
                );
              })}
            </ul>
            {tip.length ? (
              <p className="cx-tip" data-cv="picker-tip">
                {tip.map((t, i) => <React.Fragment key={i}>{i ? " " : ""}<b>{t.strong}</b>{t.rest}</React.Fragment>)}
              </p>
            ) : null}
            <div className="cv-pf">
              <span data-cv="picker-count">{ticks.size} {ticks.size === 1 ? "comp" : "comps"} named{ticks.size >= MAX_LETTER_COMPS ? ` · a letter records up to ${MAX_LETTER_COMPS}` : ""}</span>
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
