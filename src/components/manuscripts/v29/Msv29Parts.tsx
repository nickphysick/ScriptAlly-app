/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v29 (design-refs/manuscripts-v29/manuscripts-v29.html) — THE BOOK ON THE PAGE: the desk beneath the navy
 * header. Left, "The pitch" (logline, elevator pitch, synopsis); right, "Details" (five ledger rows and the queries foot)
 * then "Your manuscripts" (the active book and a coming-soon tile). Every value is the stored one; every edit is the
 * one Edit details drawer (v28/MsEditDrawer), opened on a field.
 *
 * ⚠️ THE FRAMES ARE PAGE-LOCAL (`ms29-frame` / `ms29-in` / `ms29-band`), restated from the ref's values: Versions v6's
 *    `.v6-card` is scoped under `.vv6` and the Dashboard's frame under its own page, so neither can be borrowed.
 *    Lift candidates — reports/manuscripts-v29/REPORT.md §7.
 * ⚠️ COPY WRITES THE WRITER'S OWN WORDS, verbatim (the logline without the page's display quotes). Nothing here writes
 *    for the writer (baked decision 4).
 * ⚠️ ONE FILLED BUTTON ON THE PAGE, "Edit details" in the header. Everything here is a pill, a link or a row.
 * ⚠️ THE ADD-A-MANUSCRIPT TILE IS NOT A CONTROL: no button, no tabindex, default cursor; a screen reader hears its label.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Manuscript } from "../../../types";
import {
  PITCH, COPY_FAILED, SOON_LINE, SYNOPSIS_CLAMP_WORDS, type PitchKey,
  pitchSub, pitchText, writtenCount, countWords, unquoted, sinceShown, queryFoot,
  mainGenre, alsoGenres, seriesWord, statusWord, ageDisplay, splitLastWord,
} from "../../../lib/manuscriptV29";
import { wordsOf, wordsText } from "../../../lib/manuscriptV27";
import "./msv29.css";

/* ══ icons (the ref's) ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const PenIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="m11.5 3.5 3 3L6 15H3v-3z" /><path d="m10 5 3 3" /></svg>
);
const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></svg>
);
const TickIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 8.5 3.2 3.2L13 5" /></svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 3.5v11M3.5 9h11" /></svg>
);

/* ══ the header's right block (the ref's `.vit`) ═════════════════════════════════════════════════════════════════ */

export const MsVitals: React.FC<{ ms: Manuscript; since: string | null; onAddWords: () => void }> = ({ ms, since, onAddWords }) => {
  const w = wordsOf(ms);
  const day = sinceShown(ms, since);
  const status = statusWord(ms);
  const genre = mainGenre(ms), age = ageDisplay(ms.ageCategory);
  return (
    <div className="ms29-vit" data-ms29="vitals">
      <div className="ms29-vit-n" data-ms29="vit-words">
        {w > 0 ? <>{wordsText(w)}<small>words</small></> : (
          <button type="button" className="ms29-vit-add" data-ms29="add-words" onClick={onAddWords}>Add a word count</button>
        )}
      </div>
      <i aria-hidden="true" />
      <div className="ms29-vit-g">
        {genre ? <b data-ms29="vit-genre">{genre}</b> : null}
        {age ? <span data-ms29="vit-age">{age}</span> : null}
        <span data-ms29="vit-status"><i className="ms29-cdot" aria-hidden="true" />{day ? `${status} since ${day}` : status}</span>
      </div>
    </div>
  );
};

/* ══ the frame ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

const Frame: React.FC<{ id: string; tone: "sand" | "stone"; title: string; sub?: string | null; band?: React.ReactNode; probe: string; children: React.ReactNode }> = ({ id, tone, title, sub, band, probe, children }) => (
  <section className="ms29-frame" aria-labelledby={id} data-ms29={probe}>
    <div className="ms29-in">
      <div className={`ms29-band ms29-band--${tone}`} data-ms29="band">
        <div><h2 className="ms29-bh" id={id}>{title}</h2>{sub ? <p className="ms29-bs" data-ms29="band-sub">{sub}</p> : null}</div>
        {band}
      </div>
      {children}
    </div>
  </section>
);

/* ══ the pitch ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

type CopyState = "idle" | "done";

const PitchRow: React.FC<{
  p: (typeof PITCH)[number]; text: string; flash: boolean;
  onEdit: (k: PitchKey) => void; onCopy: (k: PitchKey, text: string) => Promise<boolean>;
}> = ({ p, text, flash, onEdit, onCopy }) => {
  const [copy, setCopy] = useState<CopyState>("idle");
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const k = p.k;
  if (!text) {
    return (
      <section className={`ms29-pt is-none${flash ? " is-flash" : ""}`} data-ms29="pt" data-k={k}>
        <div className="ms29-pt-h"><h3 className="ms29-ph">{p.h}</h3><em>{p.tag}</em></div>
        <div className="ms29-pt-x"><p><b>{p.none}</b>{p.why}</p></div>
        <div className="ms29-pt-a"><button type="button" className="ms29-b2" data-ms29="add" onClick={() => onEdit(k)}><PlusIcon />Add one</button></div>
      </section>
    );
  }
  const words = countWords(text);
  const long = k === "synopsis" && words > SYNOPSIS_CLAMP_WORDS;
  const doCopy = async () => {
    const ok = await onCopy(k, text);
    if (!ok) return;
    setCopy("done");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy("idle"), 1800);
  };
  return (
    <section className={`ms29-pt${flash ? " is-flash" : ""}`} data-ms29="pt" data-k={k}>
      <div className="ms29-pt-h"><h3 className="ms29-ph">{p.h}</h3><em>{p.tag}</em></div>
      <div className="ms29-pt-x">
        {k === "logline" ? (() => {
          const { head, last } = splitLastWord(unquoted(text));
          return <p className="ms29-q" data-ms29="text">“{head}<span className="ms29-qend">{last}”</span></p>;
        })() : null}
        {k === "elevatorPitch" ? <p data-ms29="text">{text}</p> : null}
        {k === "synopsis" ? (
          <>
            <p className={long && !open ? "ms29-cl" : ""} id="ms29-syn" data-ms29="text">{text}</p>
            {long ? (
              <button type="button" className="ms29-lk" data-ms29="more" aria-expanded={open} aria-controls="ms29-syn" onClick={() => setOpen((o) => !o)}>
                {open ? "Show less" : "Read it all"}
              </button>
            ) : null}
            <span className="ms29-cnt" data-ms29="count">{words} words</span>
          </>
        ) : null}
      </div>
      <div className="ms29-pt-a">
        <button type="button" className={`ms29-b2${copy === "done" ? " is-done" : ""}`} data-ms29="copy" aria-label={`Copy the ${p.h.toLowerCase()}`} onClick={() => void doCopy()}>
          {copy === "done" ? <><TickIcon /><span>Copied</span></> : <><CopyIcon /><span>Copy</span></>}
        </button>
        <button type="button" className="ms29-lk" data-ms29="edit" aria-label={`Edit the ${p.h.toLowerCase()}`} onClick={() => onEdit(k)}>Edit</button>
      </div>
    </section>
  );
};

export const PitchFrame: React.FC<{
  ms: Manuscript; flash: PitchKey[];
  onEdit: (k: PitchKey) => void; onCopy: (k: PitchKey, text: string) => Promise<boolean>;
}> = ({ ms, flash, onEdit, onCopy }) => (
  <Frame id="ms29-pH" tone="sand" title="The pitch" sub={pitchSub(writtenCount(ms))} probe="pitch">
    {PITCH.map((p) => (
      <PitchRow key={p.k} p={p} text={pitchText(ms, p.k)} flash={flash.includes(p.k)} onEdit={onEdit} onCopy={onCopy} />
    ))}
  </Frame>
);

/** Writes the text to the clipboard; false when the browser refuses. */
export const writeClipboard = async (text: string): Promise<boolean> => {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch { return false; }
};
export { COPY_FAILED };

/* ══ the details ═════════════════════════════════════════════════════════════════════════════════════════════════ */

const Row: React.FC<{ label: string; value: React.ReactNode; plain: string; sub?: string | null; muted?: boolean; k: string; onEdit: () => void }> = ({ label, value, plain, sub, muted, k, onEdit }) => (
  <button type="button" className="ms29-dt-r" data-ms29="dt-row" data-k={k} aria-label={`${label}: ${plain}. Edit`} onClick={onEdit}>
    <span className="ms29-dt-l">{label}</span><i aria-hidden="true" />
    <span className={`ms29-dt-v${muted ? " is-mu" : ""}`}>{value}{sub ? <small>{sub}</small> : null}</span>
  </button>
);

export const DetailsFrame: React.FC<{
  ms: Manuscript; since: string | null; queries: number;
  onEdit: () => void; onSeeQueries: () => void; onLogQuery: () => void;
}> = ({ ms, since, queries, onEdit, onSeeQueries, onLogQuery }) => {
  const status = statusWord(ms);
  const day = sinceShown(ms, since, true);
  const genre = mainGenre(ms), also = alsoGenres(ms), age = ageDisplay(ms.ageCategory);
  const w = wordsOf(ms);
  const foot = queryFoot(queries);
  return (
    <Frame id="ms29-dH" tone="stone" title="Details" probe="details"
      band={<button type="button" className="ms29-lk" data-ms29="details-edit" onClick={onEdit}>Edit</button>}>
      <div className="ms29-dt" data-ms29="ledger">
        <Row k="status" label="Where it stands" plain={status} value={<><span className="ms29-ndot" aria-hidden="true" />{status}</>} sub={day ? `since ${day}` : null} onEdit={onEdit} />
        <Row k="genre" label="Genre" plain={genre || "Not set"} value={genre || "Not set"} muted={!genre} sub={also.length ? `also fits ${also.join(", ")}` : null} onEdit={onEdit} />
        <Row k="age" label="Age category" plain={age || "Not set"} value={age || "Not set"} muted={!age} onEdit={onEdit} />
        <Row k="words" label="Word count" plain={w > 0 ? wordsText(w) : "Not set"} value={w > 0 ? wordsText(w) : "Not set"} muted={w <= 0} onEdit={onEdit} />
        <Row k="series" label="Series" plain={seriesWord(ms)} value={seriesWord(ms)} onEdit={onEdit} />
      </div>
      <div className="ms29-dt-f" data-ms29="foot">
        <span data-ms29="foot-text">{foot.n !== null ? <><b>{foot.n}</b>{foot.text}</> : foot.text}</span>
        <button type="button" className="ms29-lk" data-ms29="foot-link" onClick={foot.n !== null ? onSeeQueries : onLogQuery}>{foot.link}</button>
      </div>
    </Frame>
  );
};

/* ══ your manuscripts ════════════════════════════════════════════════════════════════════════════════════════════ */

export const ShelfFrame: React.FC<{ ms: Manuscript }> = ({ ms }) => (
  <Frame id="ms29-sH" tone="stone" title="Your manuscripts" probe="shelf">
    <div className="ms29-sh">
      <div className="ms29-bk" data-ms29="active">
        <div className="ms29-bk-t"><b>{ms.title}</b>{mainGenre(ms) ? <span>{mainGenre(ms)}</span> : null}</div>
        <span className="ms29-bk-f"><i aria-hidden="true" />Active</span>
      </div>
      <div className="ms29-nx" data-ms29="next" role="group" aria-label="Add a manuscript, coming soon">
        <span className="ms29-nx-p" aria-hidden="true"><PlusIcon /></span>
        <div className="ms29-nx-t">
          <p aria-hidden="true"><b>Add a manuscript</b><em className="ms29-soon">Coming soon</em></p>
          <span>{SOON_LINE}</span>
        </div>
      </div>
    </div>
  </Frame>
);
