/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.3 (design-refs/submission-packages-v39-3/, option B · Steps + preview) — the builder under
 * BUILD, VIEW AND EDIT: the Steps column on the left, the preview of what an agent receives on the right.
 *
 *   Phase 1 · the package header (the package's colour band: icon tile → the v39 icon-and-colour popover, the name
 *   renamed in place, the note, the Active tag or Make active, ONE status pill, Figures) and, on a sent package, the
 *   note between the header and the steps.
 *   Phase 2 · the steps: Version, Query letter, Synopsis, Also sends. A step head opens its choice rows (a radiogroup) and
 *   closes any other; by default the first missing required step is open. A pick saves through the model's writer
 *   (`putPiece`, one write; the draft first package is created by the builder's `put`) and opens the next missing
 *   required step. Each row has an Edit pencil (the material drawer; a version opens the Versions page, which is where
 *   versions are edited); under the rows, the create links, "Send without a synopsis", and the put-away materials that
 *   lived in the retired Your materials card (their only way back). On a sent package the steps are read-only (Nick).
 *   Phase 3 · the preview: what an agent receives, as an email. "To" an agent on the Contact list not yet queried for
 *   this book (marked "(example)"), the subject, the letter's OPENING TEXT (`contentDraft`, never its summary), the
 *   attachments; hovering or focusing a step outlines its part. Under it, ONE primary button: disabled and naming what is
 *   missing, else "Log a query with it" (the existing log-a-query journey with this package chosen). Illustrative only:
 *   it sends nothing and stores nothing.
 *
 * ⚠️ A SENT PACKAGE IS LOCKED, AS v40 RULED, AND THE NOTE SAYS SO (Nick, 29 Oct, over the pack's copy): the pack's note
 *    promised "a new edition from your next query", which nothing does — `changeContents` refuses every change to a
 *    package that is out with agents, and nothing starts an edition. So the note reads "What went stays as it went. To
 *    change anything, make a copy", with Make a copy (and Retire, which lived only in the old card's foot).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { canMakeActive, canRetire, isLocked, packageStage } from "../../../lib/packagesV40";
import { pcStyle } from "../../../lib/packagesV39";
import { Lock, Mark, Pic } from "./icons";
import { AddExtra, DRAFT_ID, LookPicker, NameInPlace } from "./Pk26Builder";
import type { MaterialRow, Pk26Model, VersionRow } from "./usePk26Model";
import { greetingName, letterOpening, previewAgent, primaryLabel } from "../../../lib/packagesV393";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";

export type StepKey = "ver" | "let" | "syn";
const FIELD = { ver: "bookVersionId", let: "queryLetterVersionId", syn: "synopsisVersionId" } as const;
export const STEP_TITLE: Record<StepKey, string> = { ver: "Version", let: "Query letter", syn: "Synopsis" };
export const STEP_SUB: Record<StepKey | "ext", string> = {
  ver: "Decides which pages go out", let: "What the agent reads first", syn: "Optional: only for agents who ask", ext: "Only when an agent asks",
};
const NEW_LINK: Record<StepKey, string> = { ver: "+ Save a new version", let: "+ Write or paste a new query letter", syn: "+ Write or paste a new synopsis" };
const vnum = (v: Pick<VersionRow, "original" | "num">) => (v.original ? "O" : String(v.num));
/** The first required piece still missing (version, then letter), skipping the one just picked. */
export const nextMissing = (p: Pick<SubmissionPackage, "bookVersionId" | "queryLetterVersionId">, picked?: StepKey): StepKey | null =>
  (["ver", "let"] as const).find((k) => k !== picked && !p[FIELD[k]]) ?? null;
const Tick = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" /></svg>;

/** The status pill's words: "{n} of 2 needed" while the version or the letter is missing, then ready, then out. */
export function stepStatus(p: Pick<SubmissionPackage, "bookVersionId" | "queryLetterVersionId">, sent: number, out: boolean): { text: string; green: boolean } {
  if (out) return { text: sent ? `Out with agents · ${sent} sent` : "Out with agents", green: true };
  const have = [p.bookVersionId, p.queryLetterVersionId].filter(Boolean).length;
  return have === 2 ? { text: "Ready to send", green: true } : { text: `${have} of 2 needed`, green: false };
}

/** The sent note's words (Nick's ruling): what is true of a locked package. */
export const sentNoteText = (n: number) => ({
  lead: `Out with ${n} ${n === 1 ? "agent" : "agents"}.`,
  rest: ` What went stays as it went. To change anything, make a copy. ${n === 1 ? "The one already sent keeps exactly what it got." : `The ${n} already sent keep exactly what they got.`}`,
});

export interface Pk393Props {
  model: Pk26Model;
  /** the open package, or the draft first package */
  p: SubmissionPackage;
  isActive: boolean;
  onFigures: (p: SubmissionPackage) => void;
  onEdit: (p: SubmissionPackage, focus?: "note") => void;
  onDuplicate: (p: SubmissionPackage) => void;
  /** put a piece in (the builder's `put`: it creates the draft first package, else `putPiece`) */
  onPut: (k: StepKey, id: string) => Promise<void>;
  onOpenMaterial: (kind: "let" | "syn" | "ext", id: string) => void;
  onNewMaterial: (kind: StepKey) => void;
  onOpenVersions: () => void;
  onOpenComps: () => void;
  /** a deep link (`?tab=let|syn|ver`) asks for that step open */
  askStep?: StepKey | null;
}

type Item = { id: string; name: string; summary: string; glyph: React.ReactNode };

/** One step: its head (a button that opens it, or a plain row when the package is read-only) and its choice rows. */
const Step: React.FC<{
  k: StepKey; i: number; p: SubmissionPackage; items: Item[]; away: MaterialRow[]; open: boolean; readOnly: boolean;
  onToggle: () => void; onPick: (id: string) => void; onEditItem: (id: string) => void; onNew: () => void;
  onClear?: () => void; onOpenAway: (id: string) => void; foot?: React.ReactNode; onHov: (k: string | null) => void;
}> = ({ k, i, p, items, away, open, readOnly, onToggle, onPick, onEditItem, onNew, onClear, onOpenAway, foot, onHov }) => {
  const id = (p[FIELD[k]] ?? "") as string;
  const it = id ? items.find((x) => x.id === id) ?? null : null;
  const [showAway, setShowAway] = useState(false);
  const group = useRef<HTMLDivElement | null>(null);
  const word = it ? (readOnly ? "" : "Change") : readOnly ? "" : k === "syn" ? "Optional" : "Choose";
  const sub = it ? <><span className="p93-pick">{it.name}</span>{it.summary ? ` · ${it.summary}` : ""}</> : id ? "No longer on file" : STEP_SUB[k];
  const head = (
    <>
      <span className="p93-sn" aria-hidden="true">{it ? <Tick /> : i}</span>
      <span className="p93-st"><b>{STEP_TITLE[k]}</b><small>{sub}</small></span>
      <em>{word}</em>
    </>
  );
  /* arrow keys move between the rows (a radiogroup); Space and Enter pick, as a button does */
  const onKey = (e: React.KeyboardEvent) => {
    const rows = [...(group.current?.querySelectorAll<HTMLButtonElement>("[role=radio]") ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    rows[(at + step + rows.length) % rows.length]?.focus();
  };
  const tabStop = it ? it.id : items[0]?.id;
  return (
    <div className={`p93-step${it ? " p93-done" : ""}${open ? " p93-open" : ""}${readOnly ? " p93-ro" : ""}`} data-pk393-step={k}
      onMouseEnter={() => onHov(k)} onMouseLeave={() => onHov(null)} onFocus={() => onHov(k)} onBlur={() => onHov(null)}>
      {readOnly ? <div className="p93-sh">{head}</div>
        : <button type="button" className="p93-sh" aria-expanded={open} data-pk393="step-head" onClick={onToggle}>{head}</button>}
      {open && !readOnly ? (
        <div className="p93-sb">
          {items.length ? (
            <div className="p93-choices" role="radiogroup" aria-label={`Choose a ${STEP_TITLE[k].toLowerCase()}`} ref={group} onKeyDown={onKey}>
              {items.map((x) => (
                <div key={x.id} className={`p93-ch${x.id === id ? " p93-sel" : ""}`}>
                  <button type="button" role="radio" aria-checked={x.id === id} tabIndex={x.id === tabStop ? 0 : -1} className="p93-ch-b" data-pk393="choice" data-id={x.id}
                    onClick={() => onPick(x.id)}>
                    {x.glyph}<span className="p93-ch-t"><b>{x.name}</b>{x.summary ? <small>{x.summary}</small> : null}</span><span className="p93-r" aria-hidden="true" />
                  </button>
                  <button type="button" className="p93-ch-ed" aria-label={k === "ver" ? `Open ${x.name} on the Versions page` : `Edit ${x.name}`} title={k === "ver" ? "Open on the Versions page" : "Edit"}
                    data-pk393="edit" onClick={() => onEditItem(x.id)}><Mark k="pen" /></button>
                </div>
              ))}
            </div>
          ) : <p className="p93-none">No {k === "ver" ? "versions" : k === "let" ? "query letters" : "synopses"} yet.</p>}
          <div className="p93-new">
            <button type="button" className="p93-lnk" data-pk393="new" onClick={onNew}>{NEW_LINK[k]}</button>
            {onClear && it ? <button type="button" className="p93-lnk p93-q" data-pk393="clear" onClick={onClear}>Send without a synopsis</button> : null}
            {away.length ? <button type="button" className="p93-lnk p93-q" data-pk393="show-away" onClick={() => setShowAway((v) => !v)}>{showAway ? "Hide put away" : `Show put away (${away.length})`}</button> : null}
          </div>
          {showAway ? (
            <div className="p93-away">
              {away.map((m) => (
                <div key={m.id} className="p93-aw" data-away={`${k}:${m.id}`}>
                  <span className="p93-tic p93-t-m"><Mark k={k as "let" | "syn"} /></span>
                  <span className="p93-ch-t"><b>{m.name}</b><small>Put away</small></span>
                  <button type="button" className="p93-lnk" onClick={() => onOpenAway(m.id)}>Open</button>
                </div>
              ))}
            </div>
          ) : null}
          {foot ? <p className="p93-foot">{foot}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

/** Also sends: always open; the extras as chips (read-only on a sent package or the draft), "+ Add" the extras flow. */
const AlsoSends: React.FC<{ model: Pk26Model; p: SubmissionPackage; readOnly: boolean; onOpenMaterial: (k: "ext", id: string) => void; onHov: (k: string | null) => void }> = ({ model, p, readOnly, onOpenMaterial, onHov }) => {
  const on = new Set(p.extraIds ?? []);
  return (
    <div className={`p93-step p93-ext${readOnly ? " p93-ro" : ""}`} data-pk393-step="ext" onMouseEnter={() => onHov("ext")} onMouseLeave={() => onHov(null)} onFocus={() => onHov("ext")} onBlur={() => onHov(null)}>
      <div className="p93-sh"><span className="p93-sn" aria-hidden="true">4</span><span className="p93-st"><b>Also sends</b><small>{STEP_SUB.ext}</small></span><em /></div>
      <div className="p93-exts">
        {model.extras.map((e) => (
          <span key={e.id} className={`p93-chip${on.has(e.id) ? " p93-on" : ""}`} data-pk393="extra" data-id={e.id}>
            {readOnly ? <span aria-pressed={on.has(e.id)} role="img" aria-label={`${e.name}${on.has(e.id) ? ", sent" : ""}`}>{on.has(e.id) ? "✓ " : ""}{e.name}</span>
              : <button type="button" aria-pressed={on.has(e.id)} onClick={() => void model.toggleExtra(p, e.id)}>{on.has(e.id) ? "✓ " : ""}{e.name}</button>}
            {readOnly ? null : <button type="button" className="p93-chip-ed" aria-label={`Edit ${e.name}`} onClick={() => onOpenMaterial("ext", e.id)}><Mark k="pen" /></button>}
          </span>
        ))}
        {readOnly ? null : <AddExtra model={model} p={p} />}
      </div>
    </div>
  );
};

/** The package header: a rounded band in the package's colour. */
const Header: React.FC<Pk393Props & { locked: boolean; out: boolean; sent: number }> = ({ model, p, isActive, onFigures, onEdit, out, sent }) => {
  const draft = p.id === DRAFT_ID;
  const tile = useRef<HTMLButtonElement | null>(null);
  const [picker, setPicker] = useState(false);
  const closePicker = useMemo(() => () => { setPicker(false); tile.current?.focus(); }, []);
  useEffect(() => { setPicker(false); }, [p.id]);
  const st = stepStatus(p, sent, out);
  return (
    <div className="p93-bh" style={pcStyle(p)} data-pk39="pkg-head" data-pk393="head">
      <button ref={tile} type="button" className="p93-bh-ic" aria-label="Change icon and colour" title="Change icon and colour" aria-expanded={picker} aria-haspopup="dialog"
        disabled={draft} data-pk39="tile" data-pk393="tile" onClick={() => setPicker((v) => !v)}>
        <Pic ic={iconOf(p)} cls="p9-pic" />
      </button>
      <div className="p93-bh-t">
        <h3>{draft ? <span className="p9-po-nm p9-locked">{p.packageName}</span> : <NameInPlace model={model} p={p} />}
          {isActive && !draft ? <em className="p9-po-act">Active</em> : null}
          {!draft && !isActive && canMakeActive(p, model.active?.id) ? <button type="button" className="p93-mk" onClick={() => void model.makeActive(p)}>Make active</button> : null}
        </h3>
        {p.note ? <small title={p.note}>{p.note}</small>
          : draft ? <small>{p.note}</small> : <small><button type="button" className="p93-addnote" onClick={() => onEdit(p, "note")}>Add a note: who is this for?</button></small>}
      </div>
      <span className={`p93-bh-s${st.green ? " p93-g" : ""}`} data-pk39="status" data-pk393="status"><i aria-hidden="true" />{st.text}</span>
      {draft ? <span /> : (
        <button type="button" className="p93-bh-f" title="Figures" aria-label="Figures" data-pk38="figures" data-pk393="figures" onClick={() => onFigures(p)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5" /></svg>
        </button>
      )}
      {picker && tile.current ? <LookPicker model={model} p={p} anchor={tile.current} onClose={closePicker} /> : null}
    </div>
  );
};

/** The preview: an email-style card, sticky while the steps scroll. */
const Preview: React.FC<{ model: Pk26Model; p: SubmissionPackage; hov: string | null; locked: boolean; onChooseLetter: () => void; onEdit: (p: SubmissionPackage) => void; onDuplicate: (p: SubmissionPackage) => void }> = ({ model, p, hov, locked, onChooseLetter, onEdit, onDuplicate }) => {
  const draft = p.id === DRAFT_ID;
  const agent = useMemo(() => previewAgent(model.agents, model.msQueries), [model.agents, model.msQueries]);
  const v = p.bookVersionId ? model.versionRows.find((x) => x.id === p.bookVersionId) ?? null : null;
  const l = p.queryLetterVersionId ? model.lettersAll.find((x) => x.id === p.queryLetterVersionId) ?? null : null;
  const y = p.synopsisVersionId ? model.synopsesAll.find((x) => x.id === p.synopsisVersionId) ?? null : null;
  const on = new Set(p.extraIds ?? []);
  const ext = model.extras.filter((e) => on.has(e.id));
  const cta = primaryLabel(!!p.bookVersionId, !!p.queryLetterVersionId);
  const hl = (k: string) => (hov === k ? " p93-hl" : "");
  const opening = letterOpening(l?.text);
  const title = (model.activeMs?.title ?? "").toUpperCase();
  return (
    <>
      <div className="p93-pv-k"><span>What an agent receives</span><span>Preview</span></div>
      <div className="p93-mail" data-pk393="mail">
        <div className="p93-mail-h">
          <div><span>To</span><b data-pk393="to">{agent ? <>{agent.name.trim() || agent.agency} <em>(example)</em></> : <>An agent <em>(example)</em></>}</b></div>
          <div><span>Subject</span><b data-pk393="subject">Query: {title}</b></div>
        </div>
        <div className={`p93-mail-b${hl("let")}`} data-pk393-part="let">
          {l ? (
            <>
              <p className="p93-lt">Dear {greetingName(agent)},</p>
              <p className="p93-lt" data-pk393="opening">{opening || <i className="p93-ph">This letter has no text yet.</i>}</p>
              <div className="p93-skl" aria-hidden="true"><u /><u /><u /></div>
              <span className="p93-tag" data-pk393="letter-tag"><Mark k="let" />{l.name}</span>
            </>
          ) : (
            <div className="p93-em"><span className="p93-ph">Your query letter goes here.</span>
              {locked ? null : <button type="button" className="p93-lnk" data-pk393="choose-letter" onClick={onChooseLetter}>Choose a letter</button>}</div>
          )}
        </div>
        <div className="p93-att" data-pk393="att">
          {v ? <span className={`p93-a${hl("ver")}`} data-pk393-part="ver"><span className="p93-tic p93-t-v">{vnum(v)}</span><span>Opening pages<small>from {v.name} · as the agent asks</small></span></span>
            : <span className={`p93-a p93-gh${hl("ver")}`} data-pk393-part="ver">Pages: choose a version</span>}
          {y ? <span className={`p93-a${hl("syn")}`} data-pk393-part="syn"><span className="p93-tic p93-t-m"><Mark k="syn" /></span><span>Synopsis<small>{y.name}</small></span></span>
            : <span className={`p93-a p93-gh${hl("syn")}`} data-pk393-part="syn">No synopsis</span>}
          {ext.map((e) => <span key={e.id} className={`p93-a${hl("ext")}`} data-pk393-part="ext" data-id={e.id}><span className="p93-tic p93-t-x">+</span><span>{e.name}<small>if asked</small></span></span>)}
        </div>
      </div>
      <div className="p93-pv-f">
        {draft ? <span /> : <button type="button" className="p93-lnk" data-pk39="details" onClick={() => onEdit(p)}>Note, copy or delete…</button>}
        <span className="p93-pv-b">
          {locked ? <button type="button" className="p93-btn p93-b2" data-pk393="copy" onClick={() => onDuplicate(p)}>Make a copy</button> : null}
          <button type="button" className="p93-btn p93-b1" data-pk393="primary" disabled={!cta.ready || draft}
            onClick={() => openQueryDrawer({ mode: "log", manuscriptId: p.manuscriptId, packageId: p.id })}>{cta.text}</button>
        </span>
      </div>
    </>
  );
};

export const Pk393Builder: React.FC<Pk393Props> = (props) => {
  const { model, p, onDuplicate } = props;
  const draft = p.id === DRAFT_ID;
  const locked = !draft && isLocked(p);
  const st = draft ? "draft" : packageStage(p);
  const out = st === "out" || st === "retired";
  const sent = draft ? 0 : model.figPk(p).sent;
  const note = sentNoteText(sent);
  const from = p.copiedFromId ? model.msPkgs.find((x) => x.id === p.copiedFromId) ?? null : null;

  /* which step is open: undefined = the default (the first missing required one; none on a read-only package) */
  const [open, setOpen] = useState<StepKey | null | undefined>(undefined);
  const [hov, setHov] = useState<string | null>(null);
  useEffect(() => { setOpen(undefined); }, [p.id]);
  /* a deep link's step opens once, on the package it lands on (declared after the reset above, so it wins when the link
     also switches package); a sent package's steps never open */
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!props.askStep || locked || asked.current === props.askStep) return;
    asked.current = props.askStep;
    setOpen(props.askStep);
  }, [props.askStep, p.id, locked]);
  const eff: StepKey | null = locked ? null : open === undefined ? nextMissing(p) : open;
  useEscapeLayer(eff != null, () => setOpen(null), ESC_LEVEL.page);
  const pick = async (k: StepKey, id: string) => {
    await props.onPut(k, id);
    setOpen(nextMissing(p, k));
  };
  const items = useMemo<Record<StepKey, Item[]>>(() => ({
    ver: model.versionRows.map((v) => ({ id: v.id, name: v.name, summary: v.summary, glyph: <span className="p93-tic p93-t-v">{vnum(v)}</span> })),
    let: model.letters.map((m) => ({ id: m.id, name: m.name, summary: m.summary, glyph: <span className="p93-tic p93-t-m"><Mark k="let" /></span> })),
    syn: model.synopses.map((m) => ({ id: m.id, name: m.name, summary: m.summary, glyph: <span className="p93-tic p93-t-m"><Mark k="syn" /></span> })),
  }), [model.versionRows, model.letters, model.synopses]);
  const awayLet = model.lettersAll.filter((m) => m.retired), awaySyn = model.synopsesAll.filter((m) => m.retired);
  return (
    <div className="p93-b" data-pk393="builder" data-pk40="open" data-pk26="open" data-pkg={p.id}>
      <div className="p93-col" data-pk393="steps-col">
        <Header {...props} locked={locked} out={out} sent={sent} />
        {from ? <div className="p9-lc-from">Copied from <b>{from.packageName}</b>. Change one piece, and Results can tell you what that piece did.</div> : null}
        {locked ? (
          <div className="p93-lock" data-pk393="sent-note" data-pk38="lock-line">
            <Lock />
            <span><b>{note.lead}</b>{note.rest}
              <span className="p93-lock-a">
                <button type="button" className="p93-lnk" data-pk393="copy-link" data-pk38="lock-copy" onClick={() => onDuplicate(p)}>Make a copy</button>
                {canRetire(p, model.active?.id) ? <button type="button" className="p93-lnk p93-q" onClick={() => void model.retire(p)}>Retire</button> : null}
              </span>
            </span>
          </div>
        ) : null}
        <div className="p93-steps" data-pk393="steps">
          {(["ver", "let", "syn"] as const).map((k, n) => (
            <Step key={k} k={k} i={n + 1} p={p} items={items[k]} away={k === "ver" ? [] : k === "let" ? awayLet : awaySyn} open={eff === k} readOnly={locked}
              onToggle={() => setOpen(eff === k ? null : k)} onPick={(id) => void pick(k, id)}
              onEditItem={(id) => (k === "ver" ? props.onOpenVersions() : props.onOpenMaterial(k, id))} onNew={() => props.onNewMaterial(k)}
              onClear={k === "syn" && !draft ? () => { void model.removePiece(p, "syn"); setOpen(null); } : undefined}
              onOpenAway={(id) => props.onOpenMaterial(k as "let" | "syn", id)} onHov={setHov}
              foot={k === "ver" ? <>Full version history and who has which version: <button type="button" className="p93-lnk" onClick={props.onOpenVersions}>Versions page</button></>
                : k === "let" ? <>Comps come from your <button type="button" className="p93-lnk" onClick={props.onOpenComps}>comparable titles</button> library.</> : undefined} />
          ))}
          <AlsoSends model={model} p={p} readOnly={locked || draft} onOpenMaterial={props.onOpenMaterial} onHov={setHov} />
        </div>
      </div>
      <aside className="p93-pv" data-pk393="preview" data-hov={hov ?? ""}>
        <Preview model={model} p={p} hov={hov} locked={locked} onChooseLetter={() => setOpen("let")} onEdit={(x) => props.onEdit(x)} onDuplicate={onDuplicate} />
      </aside>
    </div>
  );
};
