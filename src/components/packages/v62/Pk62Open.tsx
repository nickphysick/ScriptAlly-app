/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.4 — the open package: a navy band (icon, name, its line, its buttons), then "What's in it"
 * beside "What an agent receives", and on an unsent package a foot that says what it can still do.
 *
 * "What's in it" is two groups. Always sent: Query letter, Sample. Only if an agent asks: Synopsis, Other extras. On a
 * package that has not been sent, the first three rows open a radio list under the row (one option per line; choosing
 * saves at once and closes it), and Other extras is a row of toggle chips. A sent or retired package shows the pieces
 * as they went, with no controls.
 *
 * ⚠️ THE PREVIEW'S TEXT IS THE BUILDER'S (v39.3, lib/packagesV393): "To" a Contact-list agent not yet queried for this
 *    book, marked "(example)"; the subject; "Dear {first name},"; the opening of the letter's STORED text.
 * ⚠️ THE ROW LABEL IS "Sample", never "Manuscript sample": the value carries the "From".
 */
import { MaterialIcon } from "../../shared/MaterialIcon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { iconOf } from "../../../lib/packagesV26";
import { greetingName, letterOpening, previewAgent } from "../../../lib/packagesV393";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { bandLine } from "../../../lib/packagesV62";
import type { SubmissionPackage } from "../../../types";
import { Pic } from "../v26/icons";
import type { Pk26Model } from "../v26/usePk26Model";
import { M62 } from "./Pk62Icons";
import type { Pk62, PkInfo, Piece } from "./usePk62";
import type { usePk62Actions } from "./usePk62Actions";

export type StepKey = "let" | "ver" | "syn";
const LABEL: Record<StepKey | "ext", string> = { let: "Query letter", ver: "Sample", syn: "Synopsis", ext: "Other extras" };
const NEW_LINK: Record<StepKey, string> = { let: "+ Write or paste a new query letter", ver: "+ Save a new version", syn: "+ Write or paste a new synopsis" };

/** A radio list under a row: arrow keys move between the options, as a radio group does. */
const Options: React.FC<{ k: StepKey; items: Piece[]; chosen: string | null; onPick: (id: string) => void; onNone?: () => void; onNew: () => void; away?: Piece[]; onOpenAway?: (id: string) => void }> = ({ k, items, chosen, onPick, onNone, onNew, away = [], onOpenAway }) => {
  const box = useRef<HTMLDivElement | null>(null);
  const [showAway, setShowAway] = useState(false);
  useEffect(() => {
    (box.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ?? box.current?.querySelector<HTMLElement>('[role="radio"]'))?.focus();
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    const all = [...(box.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
    const i = all.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    all[(i + step + all.length) % all.length]?.focus();
  };
  const sel = items.some((x) => x.id === chosen) ? chosen : null;
  return (
    <div className="k62-opts" data-pk62-opts={k}>
      {items.length ? (
        <div className="k62-opts-g" role="radiogroup" aria-label={LABEL[k]} ref={box} onKeyDown={onKey}>
          {items.map((x, n) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === sel} tabIndex={x.id === sel || (!sel && n === 0) ? 0 : -1}
              className="k62-chk" data-pk62-option={x.id} onClick={() => onPick(x.id)}>
              <span><b>{x.name}</b>{x.desc ? <em>{x.desc}</em> : null}</span><i aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
      <p className="k62-opts-f">
        {onNone ? <button type="button" className="k62-go" data-pk62="no-synopsis" onClick={onNone}>Send no synopsis</button> : null}
        <button type="button" className="k62-go k62-go-q" data-pk62={`new-${k}`} onClick={onNew}>{NEW_LINK[k]}</button>
        {away.length && onOpenAway ? <button type="button" className="k62-go k62-go-q" aria-expanded={showAway} data-pk62={`away-${k}`} onClick={() => setShowAway((v) => !v)}>{showAway ? "Hide put away" : `Put away (${away.length})`}</button> : null}
      </p>
      {/* ⚠️ A PUT-AWAY MATERIAL STILL HAS A WAY BACK: Open opens its drawer, which offers "Bring it back" */}
      {showAway && onOpenAway ? (
        <ul className="k62-away" data-pk62={`away-list-${k}`}>
          {away.map((x) => <li key={x.id}><span><b>{x.name}</b><small>Put away</small></span><button type="button" className="k62-go" onClick={() => onOpenAway(x.id)}>Open</button></li>)}
        </ul>
      ) : null}
    </div>
  );
};

const Row: React.FC<{ k: StepKey | "ext"; value: string | null; desc?: string; empty: string; link: string | null; open?: boolean; onLink?: () => void; children?: React.ReactNode }> =
  ({ k, value, desc, empty, link, open, onLink, children }) => (
    <li className={`k62-cr${value ? "" : " k62-empty"}`} data-pk62-piece={k}>
      <div className="k62-cr-h">
        <span className="k62-tk" aria-hidden="true">{value ? <M62 k="check" /> : null}</span>
        <span className="k62-ck">{LABEL[k]}</span>
        <span className="k62-cv"><b>{value ?? empty}</b>{value && desc ? <em>{desc}</em> : null}</span>
        {link ? <button type="button" className="k62-go" aria-expanded={!!open} data-pk62-step={k} onClick={onLink}>{link}</button> : null}
      </div>
      {children}
    </li>
  );

const AddExtra: React.FC<{ onAdd: (name: string) => Promise<void> }> = ({ onAdd }) => {
  const [on, setOn] = useState(false);
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (on) ref.current?.focus(); }, [on]);
  if (!on) return <button type="button" className="k62-tag k62-tag-add" data-pk62="extra-add" onClick={() => setOn(true)}>+ Add one</button>;
  const done = async () => { const n = v.trim(); setOn(false); setV(""); if (n) await onAdd(n); };
  return (
    <input ref={ref} className="k62-tag-in" aria-label="Name of the extra" placeholder="e.g. Author bio" value={v}
      onChange={(e) => setV(e.target.value)} onBlur={() => void done()}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void done(); } if (e.key === "Escape") { e.stopPropagation(); setOn(false); setV(""); } }} />
  );
};

export const Pk62Open: React.FC<{
  model: Pk26Model;
  d: Pk62;
  act: ReturnType<typeof usePk62Actions>;
  i: PkInfo;
  firstStep: StepKey | null;
  onScreen: boolean;
  onEdit: (p: SubmissionPackage) => void;
  onCopy: (p: SubmissionPackage) => void;
  onNewPiece: (k: StepKey) => void;
  onOpenMaterial: (k: "let" | "syn", id: string) => void;
}> = ({ model, d, act, i, firstStep, onScreen, onEdit, onCopy, onNewPiece, onOpenMaterial }) => {
  const { p, ro } = i;
  const [step, setStep] = useState<StepKey | null>(ro ? null : firstStep);
  useEffect(() => { setStep(ro ? null : firstStep); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ro) setStep(null); }, [ro]);
  useEscapeLayer(step != null && onScreen, () => {
    const k = step;
    setStep(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pk62-step="${k}"]`)?.focus());
  }, ESC_LEVEL.page);

  const agent = useMemo(() => previewAgent(model.agents, model.msQueries), [model.agents, model.msQueries]);
  const letterText = model.lettersAll.find((m) => m.id === p.queryLetterVersionId)?.text ?? "";
  const title = (model.activeMs?.title ?? "").toUpperCase();
  const ids = new Set(p.extraIds ?? []);

  const toggle = (k: StepKey) => setStep((s) => (s === k ? null : k));
  const linkFor = (k: StepKey, filled: boolean): string | null => (ro ? null : step === k ? "Close" : filled ? "Change" : k === "syn" ? "Add" : "Choose");
  const pick = async (k: StepKey, id: string) => {
    const noLetter = !p.queryLetterVersionId;
    setStep(k === "ver" && noLetter ? "let" : null);
    await act.put(p, k, id);
    if (!(k === "ver" && noLetter)) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pk62-step="${k}"]`)?.focus());
  };

  const line = bandLine([p.note, i.sentIn, i.parent ? `Copied from ${i.parent.packageName}` : null]);
  const extrasValue = i.extras.length ? i.extras.join(", ") : null;

  return (
    <section className="k62-rc" aria-labelledby={`k62-name-${p.id}`} data-pk62="open" data-pk62-id={p.id}>
      <div className="k62-rc-in">
        <div className="k62-rb k62-nv k62-band">
          <span className="k62-disc"><Pic ic={iconOf(p)} cls="k62-pic" /></span>
          <div className="k62-band-t"><h2 id={`k62-name-${p.id}`}>{p.packageName}</h2><p data-pk62="band-line">{line}</p></div>
          <div className="k62-acts">
            {i.retired ? <span className="k62-inuse k62-off" data-pk62="retired-pill">Retired</span>
              : i.inUse ? <span className="k62-inuse" data-pk62="in-use"><i aria-hidden="true" />In use for new queries</span>
                : i.finished ? <button type="button" className="k62-pb k62-w" data-pk62="use" onClick={() => void act.useForNew(p)}>Use for new queries</button> : null}
            <button type="button" className="k62-pb k62-g" data-pk62="edit" onClick={() => onEdit(p)}>Edit</button>
            <button type="button" className="k62-pb k62-g" data-pk62="copy" onClick={() => onCopy(p)}>Make a copy</button>
          </div>
        </div>
        <div className="k62-split">
          <section aria-labelledby={`k62-in-${p.id}`}>
            <h3 className="k62-h3" id={`k62-in-${p.id}`}>What’s in it{ro ? <small>As it went</small> : null}</h3>
            <h4 className="k62-cg">Always sent</h4>
            <ul className="k62-lst">
              <Row k="let" value={i.letter?.name ?? null} desc={i.letter?.desc} empty={ro ? "Not recorded" : "Not chosen yet"} link={linkFor("let", !!i.letter)} open={step === "let"} onLink={() => toggle("let")}>
                {step === "let" ? <Options k="let" items={d.letters} chosen={p.queryLetterVersionId || null} onPick={(id) => void pick("let", id)} onNew={() => onNewPiece("let")} away={d.lettersAway} onOpenAway={(id) => onOpenMaterial("let", id)} /> : null}
              </Row>
              <Row k="ver" value={i.version ? `From ${i.version.name}` : null} desc={i.version?.desc} empty={ro ? "Not recorded" : "Not chosen yet"} link={linkFor("ver", !!i.version)} open={step === "ver"} onLink={() => toggle("ver")}>
                {step === "ver" ? <Options k="ver" items={d.versions} chosen={p.bookVersionId || null} onPick={(id) => void pick("ver", id)} onNew={() => onNewPiece("ver")} /> : null}
              </Row>
            </ul>
            <h4 className="k62-cg">Only if an agent asks</h4>
            <ul className="k62-lst">
              <Row k="syn" value={i.synopsis?.name ?? null} desc={i.synopsis?.desc} empty="None" link={linkFor("syn", !!i.synopsis)} open={step === "syn"} onLink={() => toggle("syn")}>
                {step === "syn" ? <Options k="syn" items={d.synopses} chosen={p.synopsisVersionId || null} onPick={(id) => void pick("syn", id)}
                  onNone={i.synopsis ? () => { setStep(null); void act.take(p, "syn"); } : undefined} onNew={() => onNewPiece("syn")} away={d.synopsesAway} onOpenAway={(id) => onOpenMaterial("syn", id)} /> : null}
              </Row>
              <Row k="ext" value={extrasValue} empty="None" link={null}>
                {ro ? null : (
                  <div className="k62-tags" data-pk62="extras">
                    {model.extras.map((e) => {
                      const on = ids.has(e.id);
                      return <button key={e.id} type="button" className="k62-tag" aria-pressed={on} data-pk62-extra={e.id} onClick={() => void act.toggleExtra(p, e.id)}>{on ? <M62 k="check" /> : null}{e.name}</button>;
                    })}
                    <AddExtra onAdd={async (n) => { await act.addExtra(p, n); }} />
                  </div>
                )}
              </Row>
            </ul>
            {ro ? <p className="k62-lockl" data-pk62="lock-line"><M62 k="lock" />{i.retired ? "Retired" : "Sent"}, so it can’t be changed. Make a copy to try something different.</p> : null}
          </section>
          <section aria-labelledby={`k62-pv-${p.id}`}>
            <h3 className="k62-h3" id={`k62-pv-${p.id}`}>What an agent receives<small>Preview</small></h3>
            <div className="k62-mat">
              <div className="k62-paper" data-pk62="paper">
                <div className="k62-pp-h">
                  <span>To</span><div data-pk62="to">{agent ? (agent.name.trim() || agent.agency) : "An agent"} <em>(example)</em></div>
                  <span>Subject</span><div>Query: {title}</div>
                </div>
                <div className="k62-pp-b">
                  {i.letter ? (
                    <>
                      <p>Dear {greetingName(agent)},</p>
                      <p data-pk62="opening">{letterOpening(letterText) || <span className="k62-gap">This letter has no text yet.</span>}</p>
                      <span className="k62-fade" aria-hidden="true" /><span className="k62-fade" aria-hidden="true" />
                    </>
                  ) : <p className="k62-gap">Your query letter goes here.</p>}
                </div>
              </div>
              <div className="k62-encl">
                <h4>Sent with it</h4>
                <ul>
                  {/* Material icons v1: a package's Sample takes "pages" (a package states no unit); Synopsis its own; the extras are
                      the writer's free text and take none */}
                  {i.version ? <li><MaterialIcon kind="pages" /><span><b>Sample</b> <span>taken from {i.version.name}</span></span></li> : <li className="k62-no"><MaterialIcon kind="pages" />{ro ? "No sample recorded" : "No sample yet"}</li>}
                  {i.synopsis ? <li><MaterialIcon kind="synopsis" /><span><b>Synopsis</b> <span>{i.synopsis.name}</span></span></li> : null}
                  {i.extras.map((x) => <li key={x}><span><b>{x}</b> <span>if asked</span></span></li>)}
                </ul>
              </div>
            </div>
          </section>
        </div>
        {ro ? null : <p className="k62-dfoot" data-pk62="foot">{i.finished ? "Not sent yet, so you can still change any piece." : "A package needs a letter and a sample before it can go out."}</p>}
      </div>
    </section>
  );
};
