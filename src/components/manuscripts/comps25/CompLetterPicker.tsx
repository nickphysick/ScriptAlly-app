/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part E: the comps a letter mentions. A centred dialog, portalled, on the escape stack above
 * the comp drawer. Also rendered by the Letters page (letters/LetterDesk.tsx), always with a letter.
 *
 * Three kinds of letter:
 *   - not sent: tick and Save, as often as you like;
 *   - sent, nothing recorded: tick and Save ONCE ("Which comps did it mention?"), or "It didn't mention any";
 *   - sent and recorded: FIXED. The list is read-only and the foot offers "New version of {name}".
 *
 * Comps v32: opened for ONE comp (a `forKey` and no letter, from the open comp's "Add to a letter"), it lists the
 * letters instead — tick the unsent letters that mention it; a sent letter that mentions it shows ticked and locked.
 * Same dialog, head, list and foot; only the rows are letters. Saving hands the ticked letter ids to `onSaveForComp`.
 *
 * The ticks are the dialog's own draft; nothing is written until Save.
 *
 * Comps v28 §E: each comp row shows its record (its asked-for-more rate if it has gone out, its age if it is over five
 * years old, else "not sent yet"), and a live tip advises against more than three comps or old ones. The tip
 * NEVER blocks Save.
 */
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CompTitle } from "../../../types";
import { MAX_LETTER_COMPS, compKey, ready } from "../../../lib/compUsage";
import { CompRow, LetterLite, kindOf, letterShort } from "../../../lib/compsLibrary";
import { andList, pickRecord, pickTip } from "../../../lib/compsShelf";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CloseButton, KindIcon, LetterIcon, LockIcon, TickIcon } from "./marks";

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
  /** v32: for one comp, the unsent letters ticked to mention it (absent where the host never opens that mode) */
  onSaveForComp?: (key: string, letterIds: string[]) => void;
  onNewVersion: (letterId: string) => void;
  onOpenPackages: () => void;
}> = (p) => {
  const open = !!p.request;
  const [letterId, setLetterId] = useState<string | null>(null);
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const keyOfId = useMemo(() => new Map(p.comps.map((c, i) => [c.id ?? "", compKey(c, i)])), [p.comps]);
  const titleOfId = useMemo(() => new Map(p.comps.flatMap((c) => (c.id ? [[c.id, c.title] as const] : []))), [p.comps]);
  const letter = p.letters.find((l) => l.id === letterId) ?? null;
  const sent = letter ? (p.sentByLetter.get(letter.id) ?? 0) : 0;
  const recorded = !!letter && Array.isArray(letter.compIds);
  const fixed = sent > 0 && recorded;
  const unrecorded = sent > 0 && !recorded;

  /* v32: one comp, many letters */
  const forComp = !!p.request && !p.request.letterId && !!p.request.forKey && !!p.onSaveForComp;
  const compIdx = forComp ? p.comps.findIndex((c, i) => compKey(c, i) === p.request!.forKey) : -1;
  const comp = compIdx >= 0 ? p.comps[compIdx] : null;
  const [onLetters, setOnLetters] = useState<Set<string>>(new Set());

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

  /* opening: the letter the door named, else the current one; for one comp, the unsent letters that mention it.
     ⚠️ CHOSEN DURING RENDER, NEVER IN AN EFFECT (comps v26.1): the first frame drawn is the chosen state's. */
  const [loaded, setLoaded] = useState<{ request: PickerRequest | null; here: boolean }>({ request: null, here: false });
  const stale = loaded.request !== p.request || (!!p.request && loaded.here !== wantedHere);
  const sync = () => {
    setLoaded({ request: p.request, here: wantedHere });
    if (!p.request) return;
    if (forComp) {
      const id = comp?.id;
      setOnLetters(new Set(id ? p.letters.filter((l) => (p.sentByLetter.get(l.id) ?? 0) === 0 && l.compIds?.includes(id)).map((l) => l.id) : []));
      return;
    }
    load(p.request.letterId ?? p.currentLetterId ?? p.letters[p.letters.length - 1]?.id ?? null, p.request.forKey);
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

  /* ── v32: the letters, for one comp ── */
  if (forComp) {
    const cid = comp?.id ?? null;
    const can = !!comp && ready(comp);
    const drafts = p.letters.filter((l) => (p.sentByLetter.get(l.id) ?? 0) === 0);
    const sentHere = cid ? p.letters.filter((l) => (p.sentByLetter.get(l.id) ?? 0) > 0 && l.compIds?.includes(cid)) : [];
    const flip = (id: string) => setOnLetters((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const others = (l: LetterLite) => (l.compIds ?? []).filter((x) => x !== cid).map((x) => titleOfId.get(x)).filter((t): t is string => !!t);
    return createPortal(
      <div className="cv-layer cv-pdim" data-cv="picker-dim" onPointerDown={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
        <div className="cv-pk" role="dialog" aria-modal="true" aria-label="Add to a letter" data-cv="picker" data-mode="comp" data-key={p.request!.forKey}>
          <div className="cv-ph">
            <div><h3 className="cv-pt">Add to a letter</h3><small>{comp?.title ?? ""}</small></div>
            <CloseButton className="cv-x" data-cv="picker-close" onClick={p.onClose} />
          </div>
          <div className="cv-pn" data-cv="picker-notice">
            {can ? "Tick the letters that mention this comp. Letters you’ve already sent can’t be changed."
              : "Add a publisher and a year to this comp before a letter can mention it."}
          </div>
          <ul className="cv-tk" data-cv="picker-list">
            {drafts.map((l) => {
              const on = onLetters.has(l.id);
              const room = on || (l.compIds?.length ?? 0) < MAX_LETTER_COMPS;
              const ok = can && room;
              const o = others(l);
              return (
                <li key={l.id} role="checkbox" aria-checked={on} aria-disabled={!ok} tabIndex={ok ? 0 : -1} data-cv="picker-letter-row" data-letter={l.id}
                  className={ok ? "" : "is-off"}
                  onClick={() => { if (ok) flip(l.id); }}
                  onKeyDown={(e) => { if (ok && (e.key === " " || e.key === "Enter")) { e.preventDefault(); flip(l.id); } }}>
                  <span className="cv-cbx">{on && <TickIcon />}</span>
                  <span className={`cv-disc${on ? "" : " is-ring"}`}><LetterIcon /></span>
                  <span><b>{l.versionName}</b><small>{o.length ? `Also mentions ${andList(o)}` : "No other comps yet"}</small></span>
                </li>
              );
            })}
            {sentHere.map((l) => (
              <li key={l.id} role="checkbox" aria-checked="true" aria-disabled="true" tabIndex={-1} data-cv="picker-letter-row" data-letter={l.id} data-sent="true" className="is-ro">
                <span className="cv-cbx"><TickIcon /></span>
                <span className="cv-disc"><LockIcon /></span>
                <span><b>{l.versionName}</b><small>Already sent, so it can’t be changed</small></span>
              </li>
            ))}
          </ul>
          <div className="cv-pf">
            <span data-cv="picker-count">{onLetters.size} {onLetters.size === 1 ? "draft letter" : "draft letters"} ticked</span>
            <div className="cv-bt">
              <button type="button" className="cv-ghost" data-cv="picker-cancel" onClick={p.onClose}>Cancel</button>
              <button type="button" className="cv-pillbtn" data-cv="picker-save" disabled={!can} onClick={() => p.onSaveForComp!(p.request!.forKey!, [...onLetters])}>Save</button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="cv-layer cv-pdim" data-cv="picker-dim" onPointerDown={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      <div className="cv-pk" role="dialog" aria-modal="true" aria-label={unrecorded ? "Which comps did it mention?" : "Comps in this letter"} data-cv="picker" data-mode={unrecorded ? "unrecorded" : fixed ? "fixed" : "letter"} data-letter={letter?.id ?? ""} data-fixed={fixed ? "true" : "false"}>
        <div className="cv-ph">
          {unrecorded
            ? <div><h3 className="cv-pt">Which comps did it mention?</h3><small>{letter!.versionName} · sent with {q}</small></div>
            : <div><h3 className="cv-pt">Comps in this letter</h3><small>Tick every comp the letter mentions.</small></div>}
          <CloseButton className="cv-x" data-cv="picker-close" onClick={p.onClose} />
        </div>
        {p.letters.length === 0 ? (
          <div className="cv-pempty" data-cv="picker-empty">
            <p>You haven’t saved a query letter for this book yet. Save one in Submission packages, then tick the comps it mentions here.</p>
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
              ? <div className="cv-pn" data-cv="picker-notice">{short} has been sent with {q}, so its comps can’t be changed. To change them, make a new version of the letter.</div>
              : unrecorded
                ? <div className="cv-pn" data-cv="picker-notice">Tick the comps you mentioned in this letter. You can only set this once, so check before you save.</div>
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
              {unrecorded
                ? <button type="button" className="cv-ghost" data-cv="picker-none" onClick={() => letter && p.onSave(letter.id, [])}>It didn’t mention any</button>
                : <span data-cv="picker-count">{ticks.size} {ticks.size === 1 ? "comp" : "comps"} ticked{ticks.size >= MAX_LETTER_COMPS ? ` · a letter holds up to ${MAX_LETTER_COMPS}` : ""}</span>}
              <div className="cv-bt">
                {fixed ? (
                  <>
                    <button type="button" className="cv-ghost" onClick={p.onClose}>Close</button>
                    <button type="button" className="cv-pillbtn" data-cv="picker-newv" onClick={() => letter && p.onNewVersion(letter.id)}>New version of {short}</button>
                  </>
                ) : (
                  <>
                    {unrecorded ? null : <button type="button" className="cv-ghost" data-cv="picker-cancel" onClick={p.onClose}>Cancel</button>}
                    <button type="button" className="cv-pillbtn" data-cv="picker-save" disabled={!letter || (unrecorded && ticks.size === 0)} onClick={() => letter && p.onSave(letter.id, [...ticks])}>Save</button>
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
