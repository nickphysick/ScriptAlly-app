/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54, D7 (design-refs/todo-list-v54/todo-batch-v3.html, `picker`) — THE SAMPLE THAT WENT: chapters, pages or
 * words, each with − [amount] +, where the amount is a box you can type any whole number into; presets beside it; "From
 * the opening" or "A section from further in", and for the second "Where did it start?" with the same typed box; then
 * "Reads as".
 *
 * ⚠️ THE MODEL IS `lib/queryActions/sample` AND THE WORDS ARE `sampleName`. Nothing here restates either: a picker and the
 *    record it writes cannot disagree about what "pages 40–76" is.
 * ⚠️ A TYPED NUMBER IS COMMITTED ON BLUR OR ENTER, never mid-keystroke: the box shows "5,000" with its comma, and
 *    rewriting the field while the caret is in it would throw the caret about.
 * ⚠️ SWITCHING A UNIT SEEDS THAT UNIT'S OWN DEFAULT (3 chapters, 10 pages, 5,000 words), as the mock does — never a
 *    conversion, which would state a quantity nobody chose.
 */
import React, { useEffect, useState } from "react";
import { fromSpec, n0, sampleName, unitSpec, type Book, type FromUnit, type Sample } from "../../lib/queryActions/sample";
import { typedWhole } from "../../lib/sentSample";
import "./sentSamplePicker.css";

type Unit = "chapters" | "pages" | "words";
const UNITS: readonly [Unit, string][] = [["chapters", "Chapters"], ["pages", "Pages"], ["words", "Words"]];
const FROMS: readonly [FromUnit, string][] = [["chapter", "Chapter"], ["page", "Page"], ["word", "Word"]];
/** the mock's presets for where a section started */
const FROM_PRESETS: Record<FromUnit, readonly number[]> = { chapter: [2, 3, 4, 5], page: [10, 25, 40, 50], word: [5000, 10000, 20000] };
const STEP: Record<Unit, number> = { chapters: 1, pages: 5, words: 500 };
const FROM_STEP: Record<FromUnit, number> = { chapter: 1, page: 5, word: 1000 };


/** − [typed box] + */
function Stepper({ value, words, onSet, onBump, label, testId }: { value: number; words: boolean; onSet: (n: number) => void; onBump: (d: 1 | -1) => void; label: string; testId: string }) {
  const shown = words ? n0(value) : String(value);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => { setDraft(null); }, [value]);
  const commit = () => { if (draft == null) return; const n = typedWhole(draft); setDraft(null); if (n != null && n !== value) onSet(n); };
  return (
    <span className="ssp-st" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label={`Less (${label})`} onClick={() => onBump(-1)}>−</button>
      <input className="ssp-num" type="text" inputMode="numeric" aria-label={label} data-ssp={testId} value={draft ?? shown}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } else if (e.key === "Escape" && draft != null) { e.stopPropagation(); setDraft(null); } }} />
      <button type="button" aria-label={`More (${label})`} onClick={() => onBump(1)}>+</button>
    </span>
  );
}

export const SentSamplePicker: React.FC<{
  sample: Sample; onChange: (s: Sample) => void; book: Book;
  /** D8: "{first}'s guidelines ask for {sample}", shown under the picker; it never changes the answer */
  mismatch?: string | null;
  idPrefix?: string;
}> = ({ sample, onChange, book, mismatch = null, idPrefix = "ssp" }) => {
  const s = sample;
  const unit: Unit = s.unit === "none" ? "chapters" : s.unit;
  const fu: FromUnit = s.fu ?? (unit === "pages" ? "page" : unit === "words" ? "word" : "chapter");
  const setUnit = (u: Unit) => {
    if (u === unit && s.unit !== "none") return;
    const fuNext: FromUnit = u === "pages" ? "page" : u === "chapters" ? "chapter" : fu;
    onChange({ ...s, unit: u, amt: unitSpec(u, book).def, fu: s.sect ? fuNext : s.fu });
  };
  const bumpAmt = (d: 1 | -1) => {
    const st = STEP[unit];
    const v = d > 0 ? Math.floor(s.amt / st) * st + st : Math.ceil(s.amt / st) * st - st;
    onChange({ ...s, unit, amt: Math.max(1, v) });
  };
  const setSect = (on: boolean) => {
    if (!on) { onChange({ ...s, sect: false, from: 1, fu: null }); return; }
    const f = s.fu ?? (unit === "pages" ? "page" : unit === "words" ? "word" : "chapter");
    onChange({ ...s, sect: true, fu: f, from: s.from > 1 ? s.from : fromSpec(f, book).def });
  };
  const setFu = (u: FromUnit) => { if (u === fu && s.sect) return; onChange({ ...s, sect: true, fu: u, from: fromSpec(u, book).def }); };
  const bumpFrom = (d: 1 | -1) => {
    const st = FROM_STEP[fu];
    const v = d > 0 ? Math.floor(s.from / st) * st + st : Math.ceil(s.from / st) * st - st;
    onChange({ ...s, from: Math.max(1, v) });
  };
  const presets = unitSpec(unit, book).pre;
  const name = `${idPrefix}-from`;
  return (
    <div className="ssp" data-ssp="picker">
      <h4 className="ssp-h">How much of the sample went?</h4>
      <div className="ssp-units" role="radiogroup" aria-label="Sample unit">
        {UNITS.map(([u, l]) => {
          const on = unit === u && s.unit !== "none";
          return (
            <div key={u} className="ssp-unit" data-on={on ? "" : undefined} data-ssp-unit={u}>
              <button type="button" role="radio" aria-checked={on} className="ssp-ul" onClick={() => setUnit(u)}>{l}</button>
              {on ? <Stepper value={s.amt} words={u === "words"} label={`How many ${l.toLowerCase()}`} testId="amount"
                onSet={(n) => onChange({ ...s, unit, amt: n })} onBump={bumpAmt} /> : null}
            </div>
          );
        })}
      </div>
      <div className="ssp-pres">
        {presets.map((n) => <button key={n} type="button" aria-pressed={s.amt === n} onClick={() => onChange({ ...s, unit, amt: n })}>{n0(n)}</button>)}
        <span className="ssp-or">or type any amount</span>
      </div>
      <div className="ssp-from" role="radiogroup" aria-label="Where the sample came from">
        <label><input type="radio" name={name} checked={!s.sect} onChange={() => setSect(false)} /> From the opening</label>
        <label><input type="radio" name={name} checked={s.sect} onChange={() => setSect(true)} data-ssp="section" /> A section from further in</label>
      </div>
      {s.sect ? (
        <div className="ssp-sect" data-ssp="start">
          <h4 className="ssp-h">Where did it start?</h4>
          <div className="ssp-units" role="radiogroup" aria-label="Where it started">
            {FROMS.map(([u, l]) => {
              const on = fu === u;
              return (
                <div key={u} className="ssp-unit" data-on={on ? "" : undefined} data-ssp-from={u}>
                  <button type="button" role="radio" aria-checked={on} className="ssp-ul" onClick={() => setFu(u)}>{l}</button>
                  {on ? <Stepper value={s.from} words={u === "word"} label={`Which ${l.toLowerCase()} it started at`} testId="from"
                    onSet={(n) => onChange({ ...s, from: n })} onBump={bumpFrom} /> : null}
                </div>
              );
            })}
          </div>
          <div className="ssp-pres">
            {FROM_PRESETS[fu].map((n) => <button key={n} type="button" aria-pressed={s.from === n} onClick={() => onChange({ ...s, from: n })}>{n0(n)}</button>)}
            <span className="ssp-or">or type where it started</span>
          </div>
        </div>
      ) : null}
      <p className="ssp-reads" data-ssp="reads">Reads as: <b>{sampleName({ ...s, unit, fu: s.sect ? fu : s.fu })}</b></p>
      {mismatch ? <p className="ssp-mm" data-ssp="mismatch">ⓘ {mismatch}. Leave it if that’s not what went.</p> : null}
    </div>
  );
};
