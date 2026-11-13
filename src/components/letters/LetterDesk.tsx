/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2 — the letter desk's three columns (design-refs/query-letters-v2): "Your letters" (`LetterRows`), the
 * letter in full or its editor (`LetterView`, `LetterEditor`), and the right column — "How it's doing" while reading
 * (`ReadRail`, v1's drawer tab brought onto the page) or "While you write" (`WriteRail`). Plus the day-one sheet and the
 * loading skeleton. The page (`QueryLettersPage`) owns every piece of state and every write but one: the comps a letter
 * names, which go through the Comparable titles page's own picker exactly as v1's drawer did.
 *
 * ⚠️ THE SQUARE-BRACKET LIST ONLY REPORTS WHAT IS IN BRACKETS (`bracketGaps`). No advice, no wording, nothing AI.
 * ⚠️ STATUS IS THE REAL `StatusDot`, never a recreated glyph.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import type { Agent, Manuscript, ManuscriptVersion, Query } from "../../types";
import { PACKAGES_PATH } from "../../lib/packagesRoute";
import { STAGE_NAME } from "../../lib/qcSummary";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { openQueryPanel } from "../../lib/queryPanelStore";
import { manuscriptComps, normalizeComp } from "../../lib/comps";
import { compKey, usageModel, withCompIds } from "../../lib/compUsage";
import { buildRows as buildCompRows, letterShort } from "../../lib/compsLibrary";
import { currentYear } from "../../lib/compsPage";
import { bracketGaps, changedLine, countWords, firstLetterNote, type LetterFacts } from "../../lib/queryLetters";
import { letterDiff } from "../../lib/letterDiff";
import { StatusDot } from "../StatusDot";
import { CompLetterPicker, type PickerRequest } from "../manuscripts/comps25/CompLetterPicker";
import { ARROW, BOOK, BOX, CLIP, COPY, DOC, FILM, Ic, LOCK, PEN, STAMP, TICK, fmtDay, plural } from "./letterBits";

const QUILL = "/images/dash/quill.png";
import "../manuscripts/comps25/compsV25.css";

/** The editor's state. `kind`: "new" (blank or an upload), "copy" (a new version of `from`), "edit" (a draft, `id`). */
export interface EdState {
  kind: "new" | "copy" | "edit";
  id: string | null;
  from: string | null;
  name: string;
  text: string;
  changes: string[];
  orig: string;
  origName: string;
  origChanges: string[];
  /** an uploaded (new) or kept (edit) file's name */
  file: string | null;
  /** an upload whose text was read */
  fileRead: boolean;
  /** v2.1: a file chosen for an EXISTING letter ("Upload the file" on a letter with no text), to be recorded by name */
  fileNew: boolean;
  /** the text a file brought in, while the writer has not changed it (the "Text pulled from…" line) */
  fileText: string | null;
  guard: boolean;
  err: string | null;
}

const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? "");
const SAVE_KEY = MAC ? "⌘S" : "Ctrl+S";
const QUERIES_SHOWN = 6;

/* ── left: Your letters ──────────────────────────────────────────────────────────────────────────────────────────── */
export const LetterRows: React.FC<{
  ordered: readonly ManuscriptVersion[];
  retired: readonly ManuscriptVersion[];
  facts: ReadonlyMap<string, LetterFacts>;
  inUseId: string | null;
  firstId: string | null;
  sel: string | null;
  ed: EdState | null;
  edFromName: string | null;
  flash: string | null;
  stamp: boolean;
  justSaved: ReadonlySet<string>;
  note: string;
  showRetired: boolean;
  onToggleRetired: () => void;
  onSelect: (id: string) => void;
}> = ({ ordered, retired, facts, inUseId, firstId, sel, ed, edFromName, flash, stamp, justSaved, note, showRetired, onToggleRetired, onSelect }) => {
  const row = (v: ManuscriptVersion) => {
    const f = facts.get(v.id);
    const sent = f?.sent ?? 0;
    const more = f?.more ?? 0;
    const pc = sent ? Math.round((100 * more) / sent) : 0;
    const cur = ed ? ed.kind === "edit" && ed.id === v.id : v.id === sel;
    const fileOnly = !v.contentDraft?.trim() && !!v.fileName;
    return (
      <button key={v.id} type="button" className={`qlp-row${flash === v.id ? " qlp-row--flash" : ""}`} data-ql="row" data-id={v.id}
        aria-current={cur ? "true" : "false"} onClick={() => onSelect(v.id)}>
        <span className="qlp-row-n">{v.versionName}</span>
        <span className="qlp-row-s">
          {v.id === firstId ? "The first letter · " : ""}{fileOnly ? "Kept in a file · " : ""}{justSaved.has(v.id) ? "saved just now" : `saved ${fmtDay(v.createdDate)}`}
        </span>
        {v.id === inUseId && <span className={`qlp-flag${stamp ? " qlp-flag--stamp" : ""}`} data-ql="flag"><Ic d={TICK} w={2.4} />In use for new queries</span>}
        <span className="qlp-row-f" data-ql="row-figure">
          {sent ? (<>
            <span><b>{more}</b> of <b>{sent}</b> asked for more</span>
            <span className="qlp-bar" title={`${pc}% asked for more`}><i style={{ width: `${pc}%` }} /></span>
          </>) : <em>Not sent yet</em>}
        </span>
      </button>
    );
  };
  return (
    <nav className="qlp-list" aria-label="Your letters" data-ql="list">
      <h2 className="qlp-h2">Your letters</h2>
      <div className="qlp-rows" data-ql="rows">
        {ed && ed.kind !== "edit" && (
          <div className="qlp-row qlp-row--new" data-ql="row-new" aria-current="true">
            <span className="qlp-row-n">{ed.name || "Untitled letter"}</span>
            <span className="qlp-row-s">Not saved yet{edFromName ? ` · a copy of ${edFromName}` : ""}</span>
          </div>
        )}
        {ordered.map(row)}
      </div>
      {note && <p className="qlp-note" data-ql="list-note">{note}</p>}
      {retired.length > 0 && (
        <div className="qlp-retired">
          <button type="button" className="qlp-lnk" data-ql="show-retired" aria-expanded={showRetired} onClick={onToggleRetired}>
            {showRetired ? "Hide retired" : `Show retired · ${retired.length}`}
          </button>
          {showRetired && <div className="qlp-rows qlp-rows--retired" data-ql="retired">{retired.map(row)}</div>}
        </div>
      )}
    </nav>
  );
};

/* ── middle: the letter in full ──────────────────────────────────────────────────────────────────────────────────── */
export const LetterView: React.FC<{
  letter: ManuscriptVersion;
  facts: LetterFacts;
  parent: ManuscriptVersion | null;
  inUse: boolean;
  justSaved: boolean;
  diff: boolean;
  onDiff: () => void;
  next: { current: string } | null;
  firstNote: number | null;
  /** v2.1: on the in-use letter, when the active package holds a different one (`packageLetterDiffers`) */
  pkgLine: { id: string; pkg: string; letter: string } | null;
  onPkg: (pkgId: string) => void;
  onUploadFor: () => void;
  onCopy: () => void;
  onNewVersion: () => void;
  onEdit: () => void;
  onUse: () => void;
  onNotYet: () => void;
}> = ({ letter, facts, parent, inUse, justSaved, diff, onDiff, next, firstNote, pkgLine, onPkg, onUploadFor, onCopy, onNewVersion, onEdit, onUse, onNotYet }) => {
  const text = letter.contentDraft ?? "";
  const hasText = !!text.trim();
  const locked = facts.direct;
  const retired = (letter.status ?? "Active") === "Retired";
  const words = letter.wordCount ?? countWords(text);
  const meta = [
    ...(hasText ? [plural(words, "word")] : []),
    justSaved ? "saved just now" : `saved ${fmtDay(letter.createdDate)}`,
    facts.sent ? `sent with ${plural(facts.sent, "query", "queries")}` : "not sent yet",
  ];
  const canDiff = !!parent?.contentDraft?.trim() && hasText;
  const paras = useMemo(() => (diff && canDiff ? letterDiff(parent!.contentDraft!, text) : null), [diff, canDiff, parent, text]);
  return (
    <div data-ql="view" data-id={letter.id}>
      <div className="qlp-lt-top">
        <div>
          <h2 className="qlp-lt-name" data-ql="letter-name">{letter.versionName}</h2>
          <p className="qlp-lt-meta" data-ql="letter-meta">{meta.join(" · ")}</p>
          {pkgLine && (
            <p className="qlp-lt-pkg" data-ql="pkg-letter">
              Package sends go with{" "}
              <a href={`${PACKAGES_PATH}?pkg=${pkgLine.id}`} onClick={(e) => { e.preventDefault(); onPkg(pkgLine.id); }}>{pkgLine.pkg}</a>'s letter: {pkgLine.letter}
            </p>
          )}
        </div>
        <div className="qlp-lt-acts">
          {hasText && <button type="button" className="qlp-b2" data-ql="copy-text" onClick={onCopy}><Ic d={CLIP} />Copy the text</button>}
          {locked
            ? <button type="button" className="qlp-b2" data-ql="new-version" onClick={onNewVersion}><Ic d={COPY} />New version</button>
            : hasText ? <button type="button" className="qlp-b2" data-ql="edit" onClick={onEdit}><Ic d={PEN} />Edit</button> : null}
          {!inUse && !retired && !next && <button type="button" className="qlp-b2" data-ql="use" onClick={onUse}>Use for new queries</button>}
        </div>
      </div>
      {next && (
        <div className="qlp-nx" data-ql="next-card">
          <Ic d={STAMP} w={1.6} />
          <div><b>Saved as a draft.</b>Send new queries with {letter.versionName} from now on? {next.current} keeps its results either way.</div>
          <button type="button" className="qlp-b1 qlp-b1--sm" data-ql="next-use" onClick={onUse}>Use for new queries</button>
          <button type="button" className="qlp-lnk" data-ql="next-no" onClick={onNotYet}>Not yet</button>
        </div>
      )}
      {firstNote != null && <p className="qlp-first-note" data-ql="first-note" role="status">{firstLetterNote(firstNote)}</p>}
      {!hasText ? (<>
        {/* v2.1, the "no words yet" sheet: any letter with no text saved (kept in a file, or a name only) */}
        {locked && (
          <div className="qlp-lt-bar">
            <span className="qlp-lock" data-ql="lock-line"><Ic d={LOCK} /><span>This letter has gone out. Its name and results are on record, but not its words.</span></span>
          </div>
        )}
        <div className="qlp-paper qlp-paper--nt" data-ql="sheet" data-state={locked ? "sent-no-text" : "no-text"}>
          <img src={QUILL} alt="" />
          <h3 className="qlp-nt-h">{locked ? "What did this letter say?" : "The words aren't here yet"}</h3>
          <p>
            {letter.fileName ? `It's kept in ${letter.fileName}. ` : ""}
            {locked
              ? `Add the text you sent and you can read it here, copy it and compare it with your other letters. Its ${facts.sent === 1 ? "1 query and its result" : `${facts.sent} queries and their results`} stay exactly as they are.`
              : "Paste the text in and you can read it here, copy it and compare it with your other letters."}
          </p>
          <div className="qlp-nt-a">
            {locked
              ? <button type="button" className="qlp-b2" data-ql="add-text" onClick={onEdit}><Ic d={PEN} />Add the text you sent</button>
              : <button type="button" className="qlp-b2" data-ql="paste-text" onClick={onEdit}><Ic d={PEN} />Paste the text</button>}
            <button type="button" className="qlp-b2" data-ql="upload-for" onClick={onUploadFor}><Ic d={DOC} w={1.6} />Upload the file</button>
          </div>
          {locked && <p className="qlp-nt-n">You can add it once. After that it locks, like any letter that has gone out.</p>}
        </div>
      </>) : (<>
        <div className="qlp-lt-bar">
          {locked
            ? <span className="qlp-lock" data-ql="lock-line"><Ic d={LOCK} /><span>This letter has gone out, so its text stays as it was sent. To change it, start a new version from it.</span></span>
            : facts.sent > 0
              ? <span data-ql="draft-line">Your earlier queries count towards this letter.</span>
              : <span data-ql="draft-line">A draft. Edit it as much as you like until it goes out.</span>}
          {canDiff && (
            <span className="qlp-lt-r">
              {diff && <span className="qlp-key" data-ql="diff-key"><ins>added</ins><del>taken out</del></span>}
              <button type="button" className="qlp-sw" role="switch" aria-checked={diff} data-ql="diff-switch" onClick={onDiff}><i />Show what changed from {parent!.versionName}</button>
            </span>
          )}
        </div>
        <article className="qlp-paper" data-ql="sheet" lang="en-GB">
          {paras ? paras.map((p, i) => (
            <React.Fragment key={i}>
              {i > 0 && "\n\n"}
              {p.map((s, j) => s.kind === "added" ? <ins key={j}>{s.text}</ins> : s.kind === "removed" ? <del key={j}>{s.text}</del> : <React.Fragment key={j}>{s.text}</React.Fragment>)}
            </React.Fragment>
          )) : text}
        </article>
      </>)}
    </div>
  );
};

/* ── middle: the editor ──────────────────────────────────────────────────────────────────────────────────────────── */
export const LetterEditor: React.FC<{
  ed: EdState;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  parentName: string | null;
  onChange: (patch: Partial<Pick<EdState, "name" | "text">>) => void;
  onSave: () => void;
  onCancel: () => void;
  onKeep: () => void;
  onDiscard: () => void;
}> = ({ ed, taRef, parentName, onChange, onSave, onCancel, onKeep, onDiscard }) => {
  const isNew = ed.kind !== "edit";
  /* the sheet grows with the letter, never under 520px (the ref's `fit`) */
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(520, ta.scrollHeight + 4)}px`;
  }, [ed.text, taRef]);
  const w = countWords(ed.text);
  const dirty = ed.text !== ed.orig || ed.name !== ed.origName || ed.changes.join("|") !== ed.origChanges.join("|");
  let lead: React.ReactNode;
  if (ed.file && ed.fileText != null && ed.text === ed.fileText) {
    lead = ed.fileRead
      ? `Text pulled from ${ed.file}. Have a quick read to check it came through properly`
      : `${ed.file} is kept by name: paste the text below if you'd like to read it here.`;
  } else if (dirty) lead = <><i className="qlp-dirt" aria-hidden="true" />Unsaved changes</>;
  else if (ed.kind === "copy" && parentName && ed.orig.trim()) lead = `Word for word the same as ${parentName} so far`;
  else if (isNew) lead = "Paste or type your letter";
  else lead = "No changes yet";
  return (
    <div data-ql="editor" data-kind={ed.kind}>
      <div className="qlp-ed-top">
        <input className="qlp-ed-name" data-ql="ed-name" aria-label="Letter name" value={ed.name} maxLength={256} onChange={(e) => onChange({ name: e.target.value })} />
        {!ed.guard && (
          <div className="qlp-lt-acts">
            <button type="button" className="qlp-b2" data-ql="cancel" onClick={onCancel}>Cancel</button>
            <button type="button" className="qlp-b1 qlp-b1--sm" data-ql="save" onClick={onSave}>Save letter</button>
          </div>
        )}
      </div>
      {ed.guard ? (
        <div className="qlp-guard" role="alert" data-ql="guard">
          <span>{isNew ? "This new letter isn't saved yet. Save it before you go?" : "You've changed this letter. Save it before you go?"}</span>
          <button type="button" className="qlp-b2" data-ql="g-keep" onClick={onKeep}>Keep editing</button>
          <button type="button" className="qlp-b2" data-ql="g-drop" onClick={onDiscard}>{isNew ? "Don't keep it" : "Discard changes"}</button>
          <button type="button" className="qlp-b1 qlp-b1--sm" data-ql="g-save" onClick={onSave}>Save letter</button>
        </div>
      ) : (
        <p className="qlp-ed-status" data-ql="ed-status" aria-live="polite">
          {ed.err ? <span className="qlp-err" data-ql="ed-err">{ed.err}</span> : (<>
            {lead}
            {w > 0 && <> · {plural(w, "word")} · {ed.text.length.toLocaleString("en-GB")} characters</>}
            {" · "}<kbd>{SAVE_KEY}</kbd> to save
          </>)}
        </p>
      )}
      <textarea ref={taRef} className="qlp-paper qlp-paper--edit" data-ql="ed-text" lang="en-GB" spellCheck aria-label="The letter"
        placeholder="Paste or type your letter here." value={ed.text} onChange={(e) => onChange({ text: e.target.value })} />
    </div>
  );
};

/* ── right: How it's doing ───────────────────────────────────────────────────────────────────────────────────────── */
export const ReadRail: React.FC<{
  ms: Manuscript;
  letter: ManuscriptVersion;
  facts: LetterFacts;
  parent: ManuscriptVersion | null;
  isFirst: boolean;
  onNewVersion: (letterId: string) => void;
}> = ({ ms, letter, facts: f, parent, isFirst, onNewVersion }) => {
  const db = useScriptAllyDb();
  const { versions, packages, queries, activities, agents, updateVersion, updateManuscriptQuiet } = db;
  const { showToast } = useToast();
  const navigate = useNavigate();
  const pkgs = useMemo(() => packages.filter((p) => p.manuscriptId === letter.manuscriptId && (p.status ?? "Active") !== "Retired"
    && (p.queryLetterVersionId === letter.id || (p.editions ?? []).some((e) => e.queryLetterVersionId === letter.id))), [letter, packages]);

  /* the comps it names, through the Comparable titles page's own picker (v1's drawer, unchanged) */
  const comps = useMemo(() => manuscriptComps(ms), [ms]);
  const model = useMemo(() => usageModel(ms, versions, packages, queries, activities), [ms, versions, packages, queries, activities]);
  const compRows = useMemo(() => buildCompRows({
    comps, usage: model.usage, letters: model.letters as ManuscriptVersion[], packages: packages.filter((p) => p.manuscriptId === ms.id),
    queries: queries as Query[], agents: agents as Agent[], asked: model.asked, letterOfQuery: model.letterOfQuery,
  }), [model, ms, comps, packages, queries, agents]);
  const named = (letter.compIds ?? []).map((id) => comps.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  useEffect(() => { setPicker(null); }, [letter.id]);
  const busy = useRef(false);
  const saveComps = async (letterId: string, keys: string[]) => {
    if (busy.current) return;
    const target = versions.find((v) => v.id === letterId);
    if (!target) return;
    busy.current = true;
    try {
      const at = keys.map((k) => comps.findIndex((c, i) => compKey(c, i) === k)).filter((i) => i >= 0);
      let withIds = comps;
      if (at.some((i) => !comps[i].id)) {
        withIds = withCompIds(comps.map(normalizeComp));
        await updateManuscriptQuiet(ms.id, { comps: withIds });
      }
      const ids = at.map((i) => withIds[i].id!).filter(Boolean);
      const had = Array.isArray(target.compIds) ? [...target.compIds] : null;
      const err = await updateVersion(letterId, { compIds: ids });
      if (err) { showToast({ message: err }); return; }
      setPicker(null);
      showToast({
        message: `Logged ${plural(ids.length, "comp")} for ${letterShort(target.versionName)}.`,
        undo: async () => { await updateVersion(letterId, { compIds: had ?? deleteField() }, { restoring: true }); },
      });
    } finally { busy.current = false; }
  };

  const line = changedLine(letter, isFirst);
  return (
    <aside className="qlp-rail" data-ql="rail" data-mode="read">
      <h2 className="qlp-h2">How it's doing</h2>
      {f.sent === 0 ? (
        <p className="qlp-wait" data-ql="wait">Not sent yet. Pick this letter when you log a query and its replies will be counted here.</p>
      ) : (<>
        <div className="qlp-cells" data-ql="cells">
          <div data-ql="cell-sent"><b>{f.sent}</b><span>sent</span></div>
          <div data-ql="cell-replied"><b>{f.replies}</b><span>replied</span></div>
          <div data-ql="cell-more"><b>{f.more}</b><span>asked for more</span></div>
        </div>
        {f.replies === 0 && <p className="qlp-wait">No replies yet. Once agents start answering you will see here how this letter compares with your others.</p>}
        <h3 className="qlp-h3">The queries it went with</h3>
        <ul className="qlp-ql">
          {f.qs.slice(0, QUERIES_SHOWN).map((q) => {
            const a = (agents as Agent[]).find((x) => x.id === q.agentId);
            const agency = agentSecondary(a);
            return (
              <li key={q.id}>
                <button type="button" data-ql="query-row" data-id={q.id} onClick={() => openQueryPanel(q.id, "other")}>
                  <span className="qlp-qi" aria-hidden="true">{agentInitials(a)}</span>
                  <span className="qlp-qn">
                    <b>{agentPrimary(a)}</b>
                    <span className="qlp-qs"><StatusDot status={q.status} overrideSize={14} decorative /><span>{STAGE_NAME[q.status] ?? q.status}</span>{agency && <em>· {agency}</em>}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {f.sent > QUERIES_SHOWN && <button type="button" className="qlp-lnk qlp-lnk--sm" data-ql="see-all" onClick={() => navigate("/queries")}>See all {f.sent} in the Query Centre</button>}
      </>)}
      <h3 className="qlp-h3">What changed</h3>
      {parent ? (
        <div className="qlp-chg" data-ql="changes">
          <div className="qlp-chg-r"><span className="qlp-chg-a">{parent.versionName}</span><Ic d={ARROW} /><span className="qlp-chg-b">{letter.versionName}</span></div>
          <ul>{(letter.changes?.length ? letter.changes : line ? [line] : ["What changed isn't recorded"]).map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      ) : <p className="qlp-none" data-ql="changes">{isFirst ? "This is the first letter, so there is nothing before it." : "Written from scratch."}</p>}
      <h3 className="qlp-h3">Comps it names</h3>
      <div data-ql="comps">
        {named.length ? named.map((c) => <span key={c.id} className="qlp-chip"><Ic d={(c.media ?? "book") === "book" ? BOOK : FILM} />{c.title}</span>)
          : <p className="qlp-none">None logged yet.</p>}
      </div>
      <button type="button" className="qlp-lnk qlp-lnk--sm" data-ql="log-comp" onClick={() => setPicker({ letterId: letter.id })}>+ Log a comp from your library</button>
      <h3 className="qlp-h3">Packages it's in</h3>
      <div data-ql="pkgs">
        {pkgs.length ? pkgs.map((p) => (
          <button key={p.id} type="button" className="qlp-chip qlp-chip--pk" onClick={() => navigate(`${PACKAGES_PATH}?pkg=${p.id}`)}><Ic d={BOX} />{p.packageName}</button>
        )) : <p className="qlp-none">Not in a package.</p>}
      </div>
      <CompLetterPicker
        request={picker} letters={model.letters as ManuscriptVersion[]} currentLetterId={letter.id}
        comps={comps} rows={compRows} now={currentYear()} sentByLetter={model.sentByLetter}
        onClose={() => setPicker(null)}
        onSave={(id, keys) => void saveComps(id, keys)}
        onNewVersion={(id) => { setPicker(null); onNewVersion(id); }}
        onOpenPackages={() => { setPicker(null); navigate(PACKAGES_PATH); }}
      />
    </aside>
  );
};

/* ── right: While you write ──────────────────────────────────────────────────────────────────────────────────────── */
export const WriteRail: React.FC<{
  ed: EdState;
  parentName: string | null;
  sentBefore: boolean;
  onChanges: (changes: string[]) => void;
}> = ({ ed, parentName, sentBefore, onChanges }) => {
  const gaps = bracketGaps(ed.text);
  return (
    <aside className="qlp-rail" data-ql="rail" data-mode="write">
      <h2 className="qlp-h2">While you write</h2>
      {parentName && (<>
        <h3 className="qlp-h3 qlp-h3--first">What changed from {parentName}?</h3>
        {ed.changes.slice(0, 3).map((c, i) => (
          <input key={i} className="qlp-chin" data-ql="change-input" maxLength={80} aria-label={`Change ${i + 1}`} value={c}
            placeholder={i === 0 ? "e.g. Opens on the harbour, not the ferry" : "Another change"}
            onChange={(e) => onChanges(ed.changes.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
        <p className="qlp-hint2">Optional. A few words each. They show beside the letter, so later you can see what made the difference.</p>
      </>)}
      <h3 className={`qlp-h3${parentName ? "" : " qlp-h3--first"}`}>Still in square brackets</h3>
      <div data-ql="gaps">
        {gaps.length ? gaps.map((g) => <span key={g} className="qlp-gp" data-ql="gap">{g}</span>) : <p className="qlp-none" data-ql="no-gaps">Nothing left in square brackets.</p>}
      </div>
      <p className="qlp-hint2">Fine if you fill these in for each agent. Worth a look before you send.</p>
      {ed.kind === "edit" && !sentBefore && (<>
        <h3 className="qlp-h3">Once it goes out</h3>
        <p className="qlp-hint2" data-ql="once">The text locks when you log a query with it, so its results stay true to what agents read.</p>
      </>)}
    </aside>
  );
};

/* ── day one ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const DayOne: React.FC<{
  defaultName: string;
  onCreate: (input: { name: string; text: string; file: string | null; from: string | null; changes: string[] }) => Promise<string | null>;
}> = ({ defaultName, onCreate }) => {
  const [name, setName] = useState(defaultName);
  const [text, setText] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const onFile = async (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    setFile(f.name); setErr(null);
    if (/\.(txt|md|text)$/i.test(f.name) || f.type.startsWith("text/")) setText(await f.text());
  };
  const save = async () => {
    if (busy) return;
    if (!text.trim() && !file) { setErr("Paste your letter in first. There's nothing to save yet."); taRef.current?.focus(); return; }
    setBusy(true);
    try { await onCreate({ name: name.trim() || defaultName, text, file, from: null, changes: [] }); } finally { setBusy(false); }
  };
  return (
    <div className="qlp-first" data-ql="first">
      <div>
        <img className="qlp-quill" src="/images/dash/quill.png" alt="" />
        <ol className="qlp-steps" data-ql="explainer">
          <li><b>Paste your letter, or upload it.</b> Keep every version in one place, readable in full.</li>
          <li><b>Pick it when you log a query.</b> Or put it in a submission package.</li>
          <li><b>See which letter lands.</b> Each letter shows how many agents asked for more.</li>
        </ol>
      </div>
      <div className="qlp-first-p">
        <label className="qlp-fld"><span>Name</span><input data-ql="first-name" value={name} maxLength={256} onChange={(e) => setName(e.target.value)} /></label>
        <textarea ref={taRef} data-ql="first-text" aria-label="Your letter" lang="en-GB" spellCheck placeholder="Paste your letter here." value={text}
          onChange={(e) => { setText(e.target.value); setErr(null); }} />
        {(err || file) && (
          <p className="qlp-ed-status" data-ql="first-status">
            {err ? <span className="qlp-err">{err}</span> : text.trim() ? `Text pulled from ${file}. Have a quick read to check it came through properly` : `${file} is kept by name: paste the text below if you'd like to read it here.`}
          </p>
        )}
        <div className="qlp-first-f">
          <button type="button" className="qlp-lnk" data-ql="first-upload" onClick={() => fileRef.current?.click()}>Or upload the file you keep it in</button>
          <span className="qlp-sp" />
          <button type="button" className="qlp-b1" data-ql="first-save" disabled={busy} onClick={() => void save()}>Save letter</button>
        </div>
        <input ref={fileRef} type="file" hidden accept=".txt,.md,.doc,.docx,.pdf,.rtf,.odt,text/*" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
    </div>
  );
};

/* ── loading: blocks at the three columns' final sizes, so nothing shifts when the data lands ────────────────────── */
export const DeskSkeleton: React.FC = () => (
  <div className="qlp-desk qlp-skel" data-ql="skeleton" aria-busy="true" aria-label="Loading your letters">
    <div className="qlp-list">
      <i className="qlp-sk qlp-sk--h2" />
      {[0, 1, 2].map((i) => <i key={i} className="qlp-sk qlp-sk--row" />)}
    </div>
    <div className="qlp-mid">
      <i className="qlp-sk qlp-sk--name" />
      <i className="qlp-sk qlp-sk--meta" />
      <i className="qlp-sk qlp-sk--paper" />
    </div>
    <div className="qlp-rail">
      <i className="qlp-sk qlp-sk--h2" />
      <i className="qlp-sk qlp-sk--cells" />
      <i className="qlp-sk qlp-sk--list" />
    </div>
  </div>
);
