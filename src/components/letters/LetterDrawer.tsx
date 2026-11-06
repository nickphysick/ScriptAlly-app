/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1, Part C — the letter drawer (design-refs/query-letters-v1, 04 and 05), on the shared `HalfDrawer`
 * (floating, on the escape stack at `pageDrawer`). Two tabs, "The letter" and "How it's doing", and a footer that
 * follows whether the letter has gone out. The same drawer holds the New letter form.
 *
 * ⚠️ IT WRITES ONLY THROUGH THE EXISTING MATERIAL WRITERS: `addVersion` for a new letter, `updateVersion` for a draft's
 * text, `updateManuscriptQuiet` for the in-use letter. A sent letter's text is never edited here, and `updateVersion`
 * refuses it anyway; the change is a new letter ("Copy to a new letter").
 *
 * ⚠️ "+ Log a comp from your library" OPENS THE COMPARABLE TITLES PICKER ITSELF (`CompLetterPicker`), with the inputs
 * that page gives it, so the comps a letter names are logged one way only.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import { ComponentType, QueryStatus, type Agent, type Manuscript, type ManuscriptVersion, type Query } from "../../types";
import { HalfDrawer } from "../shell/HalfDrawer";
import { PACKAGES_PATH } from "../../lib/packagesRoute";
import { STAGE_NAME } from "../../lib/qcSummary";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { openQueryPanel } from "../../lib/queryPanelStore";
import { manuscriptComps, normalizeComp } from "../../lib/comps";
import { compKey, usageModel, withCompIds } from "../../lib/compUsage";
import { buildRows as buildCompRows, letterShort } from "../../lib/compsLibrary";
import { currentYear } from "../../lib/compsPage";
import { nextVersionName } from "../../lib/versionLock";
import { changedLine, countWords, earlierUnrecorded, firstLetterNote, type LetterFacts } from "../../lib/queryLetters";
import { CompLetterPicker, type PickerRequest } from "../manuscripts/comps25/CompLetterPicker";
import { fmtDay } from "./LetterCard";
import "../manuscripts/comps25/compsV25.css";

export type DrawerMode = { kind: "letter"; id: string; tab?: "letter" | "stats" } | { kind: "new"; from: string | null } | null;
type Start = "copy" | "blank" | "file";

const Ic: React.FC<{ d: React.ReactNode }> = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const PEN = <><path d="M12 20h9" /><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z" /></>;
const PLUS = <><path d="M12 5v14" /><path d="M5 12h14" /></>;
const X = <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>;
const COPY = <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>;
const ARROW = <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>;
const BOOK = <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />;
const FILM = <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4" /></>;
const CLIP = <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />;

/* the status words' colour: an agent who asked for more (rust), a pass or a silence (grey), else plain */
const MORE = new Set<QueryStatus>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED, QueryStatus.OFFER, QueryStatus.SIGNED]);
const NO = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE]);

const words = (v: ManuscriptVersion) => v.wordCount ?? countWords(v.contentDraft ?? "");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const LetterDrawer: React.FC<{
  mode: DrawerMode;
  setMode: (m: DrawerMode) => void;
  ms: Manuscript | null;
  facts: ReadonlyMap<string, LetterFacts>;
  live: readonly ManuscriptVersion[];
  inUseId: string | null;
  firstId: string | null;
  routeActive: boolean;
}> = ({ mode, setMode, ms, facts, live, inUseId, firstId, routeActive }) => {
  const db = useScriptAllyDb();
  const { versions, packages, queries, activities, agents, addVersion, updateVersion, updateManuscriptQuiet } = db;
  const { showToast } = useToast();
  const navigate = useNavigate();
  const close = () => setMode(null);
  const open = routeActive && !!mode;

  /* the letter on view */
  const letter = mode?.kind === "letter" ? versions.find((v) => v.id === mode.id) ?? null : null;
  const f = letter ? facts.get(letter.id) : undefined;
  const tab = mode?.kind === "letter" ? mode.tab ?? "letter" : "letter";
  const locked = !!f?.direct;
  const sent = f?.sent ?? 0;
  const prev = letter?.parentId ? versions.find((v) => v.id === letter.parentId) ?? null : null;
  const pkgs = useMemo(() => (letter ? packages.filter((p) => p.manuscriptId === letter.manuscriptId && (p.status ?? "Active") !== "Retired"
    && (p.queryLetterVersionId === letter.id || (p.editions ?? []).some((e) => e.queryLetterVersionId === letter.id))) : []), [letter, packages]);

  /* the comps it names, through the Comparable titles page's own picker */
  const comps = useMemo(() => (ms ? manuscriptComps(ms) : []), [ms]);
  const model = useMemo(() => (ms ? usageModel(ms, versions, packages, queries, activities) : null), [ms, versions, packages, queries, activities]);
  const compRows = useMemo(() => (model && ms ? buildCompRows({
    comps, usage: model.usage, letters: model.letters as ManuscriptVersion[], packages: packages.filter((p) => p.manuscriptId === ms.id),
    queries: queries as Query[], agents: agents as Agent[], asked: model.asked, letterOfQuery: model.letterOfQuery,
  }) : []), [model, ms, comps, packages, queries, agents]);
  const named = letter ? (letter.compIds ?? []).map((id) => comps.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c) : [];
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const busy = useRef(false);
  const saveComps = async (letterId: string, keys: string[]) => {
    if (busy.current || !ms) return;
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

  /* Part D — the first letter's note, kept on its view until the drawer closes or moves to another letter */
  const [firstNote, setFirstNote] = useState<{ id: string; n: number } | null>(null);
  useEffect(() => { if (!mode || (mode.kind === "letter" && firstNote && mode.id !== firstNote.id)) setFirstNote(null); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* editing a draft in place */
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { setEditing(null); }, [mode]);
  const saveEdit = async () => {
    if (!letter || editing == null) return;
    const err = await updateVersion(letter.id, { contentDraft: editing, contentType: "text", wordCount: countWords(editing) });
    if (err) { showToast({ message: err }); return; }
    setEditing(null);
    showToast({ message: `Saved ${letter.versionName}.` });
  };

  const useForNew = async (id: string) => {
    if (!ms) return;
    const before = ms.inUseLetterId;
    await updateManuscriptQuiet(ms.id, { inUseLetterId: id });
    const name = versions.find((v) => v.id === id)?.versionName ?? "This letter";
    showToast({
      message: `${name} now goes out with new queries.`,
      undo: async () => { await updateManuscriptQuiet(ms.id, { inUseLetterId: before ?? (deleteField() as unknown as string) }); },
    });
  };

  /* ── the New letter form ── */
  const source = mode?.kind === "new" ? versions.find((v) => v.id === (mode.from ?? inUseId)) ?? null : null;
  const [name, setName] = useState("");
  const [start, setStart] = useState<Start>("copy");
  const [change, setChange] = useState<string[]>([""]);
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const formKey = mode?.kind === "new" ? `new:${mode.from ?? ""}` : "";
  useEffect(() => {
    if (mode?.kind !== "new") return;
    const src = versions.find((v) => v.id === (mode.from ?? inUseId)) ?? null;
    setName(nextVersionName(src?.versionName ?? "Query letter v0", live.map((l) => l.versionName)));
    setStart(src ? "copy" : "blank");
    setChange([""]);
    setBody(src?.contentDraft ?? "");
    setFileName(null);
    requestAnimationFrame(() => nameRef.current?.select());
  }, [formKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickStart = (s: Start) => {
    setStart(s);
    if (s === "copy") { setBody(source?.contentDraft ?? ""); setFileName(null); }
    if (s === "blank") { setBody(""); setFileName(null); }
    if (s === "file") fileRef.current?.click();
  };
  const onFile = async (file: File | undefined) => {
    if (!file) { if (!fileName) setStart(source ? "copy" : "blank"); return; }
    setFileName(file.name);
    if (/\.(txt|md|text)$/i.test(file.name) || file.type.startsWith("text/")) setBody(await file.text());
    else setBody("");
  };
  const canSave = name.trim().length > 0 && (body.trim().length > 0 || !!fileName);
  const [saving, setSaving] = useState(false);
  const saveNew = async () => {
    if (!ms || !canSave || saving) return;
    setSaving(true);
    try {
      const firstEver = live.length === 0 && !versions.some((v) => v.manuscriptId === ms.id && v.componentType === ComponentType.QUERY_LETTER);
      const earlier = firstEver ? earlierUnrecorded(ms.id, queries as Query[], versions, packages) : 0;
      const changes = change.map((c) => c.trim()).filter(Boolean).slice(0, 8).map((c) => c.slice(0, 80));
      const text = body.trim();
      const v: Record<string, unknown> = {
        manuscriptId: ms.id, componentType: ComponentType.QUERY_LETTER, versionName: name.trim().slice(0, 256), fileAttached: false,
      };
      if (text) { v.contentType = "text"; v.contentDraft = body; v.wordCount = countWords(body); }
      else { v.contentType = "ref"; }
      if (fileName) v.fileName = fileName;
      if (start === "copy" && source) { v.parentId = source.id; if (changes.length) v.changes = changes; }
      const id = await addVersion(v as Parameters<typeof addVersion>[0]);
      if (!id) { showToast({ message: "That letter didn't save. Check your connection and try again." }); return; }
      setMode({ kind: "letter", id });
      if (earlier > 0) setFirstNote({ id, n: earlier });
      showToast({ message: `Saved ${name.trim()}.` });
    } finally { setSaving(false); }
  };

  /* ── head, body, foot ── */
  const isNew = mode?.kind === "new";
  const sub = isNew
    ? (ms ? `for ${ms.title}` : "")
    : letter
      ? sent > 0
        ? `Sent with ${plural(sent, "query", "queries")} · ${plural(words(letter), "word")}${letter.id === inUseId ? " · in use for new queries" : ""}`
        : `Draft · saved ${fmtDay(letter.createdDate)} · ${plural(words(letter), "word")}`
      : "";
  const head = (
    <div className="qld-h">
      <span className="qld-ic"><Ic d={isNew ? PLUS : PEN} /></span>
      <div className="qld-ht">
        <h3 className="qld-title">{isNew ? "New query letter" : letter?.versionName}</h3>
        <span className="qld-sub" data-ql="drawer-sub">{sub}</span>
        {!isNew && letter && (
          <div className="qld-tabs" role="tablist">
            <button type="button" role="tab" data-ql="tab-letter" aria-selected={tab === "letter"} onClick={() => setMode({ kind: "letter", id: letter.id, tab: "letter" })}>The letter</button>
            <button type="button" role="tab" data-ql="tab-stats" aria-selected={tab === "stats"} onClick={() => setMode({ kind: "letter", id: letter.id, tab: "stats" })}>How it's doing</button>
          </div>
        )}
      </div>
      <button type="button" className="qld-x" aria-label="Close" onClick={close}><Ic d={X} /></button>
    </div>
  );

  let content: React.ReactNode = null;
  if (isNew) {
    const fromName = source?.versionName ?? "";
    content = (
      <div className="qld-form" data-ql="new-form">
        <label className="qld-f"><span>Name</span>
          <input ref={nameRef} value={name} data-ql="new-name" onChange={(e) => setName(e.target.value)} placeholder="e.g. Query letter v4, or Open on the harbour" />
        </label>
        <div className="qld-f"><span>Start from</span>
          <div className="qld-seg" role="radiogroup" aria-label="Start from">
            {source && <button type="button" role="radio" aria-checked={start === "copy"} className={start === "copy" ? "on" : ""} onClick={() => pickStart("copy")}>A copy of {fromName}{source.id === inUseId ? " (in use)" : ""}</button>}
            <button type="button" role="radio" aria-checked={start === "blank"} className={start === "blank" ? "on" : ""} onClick={() => pickStart("blank")}>A blank page</button>
            <button type="button" role="radio" aria-checked={start === "file"} className={start === "file" ? "on" : ""} onClick={() => pickStart("file")}><Ic d={CLIP} />Upload a file</button>
          </div>
          <input ref={fileRef} type="file" hidden accept=".txt,.md,.doc,.docx,.pdf,.rtf,.odt,text/*" onChange={(e) => void onFile(e.target.files?.[0])} />
          {start === "file" && fileName && (
            <small className="qld-hint">{body.trim() ? `Read from ${fileName}. Check it below.` : `${fileName} is kept by name: paste the text below if you'd like to read it here.`}</small>
          )}
        </div>
        {start === "copy" && source && (
          <div className="qld-f"><span>What's different from {fromName}?</span>
            {change.map((c, i) => (
              <input key={i} value={c} data-ql="new-change" maxLength={80} placeholder={i === 0 ? "e.g. Opens on the harbour, not the ferry" : "Another change"}
                onChange={(e) => setChange((cs) => cs.map((x, j) => (j === i ? e.target.value : x)))} />
            ))}
            {change.length < 8 && change[change.length - 1].trim() && (
              <button type="button" className="qld-lnk" onClick={() => setChange((cs) => [...cs, ""])}>+ Another change</button>
            )}
          </div>
        )}
        <label className="qld-f"><span>The letter</span>
          <textarea className="qld-sheet qld-sheet--edit" data-ql="new-body" value={body} onChange={(e) => setBody(e.target.value)} rows={16} />
        </label>
      </div>
    );
  } else if (letter && f) {
    const line = changedLine(letter, letter.id === firstId);
    content = tab === "letter" ? (
      <div data-ql="pane-letter">
        {firstNote?.id === letter.id && <p className="qld-first" data-ql="first-note" role="status">{firstLetterNote(firstNote.n)}</p>}
        {prev ? (
          <div className="qld-chg" data-ql="changes">
            <span className="qld-chg-a">{prev.versionName}</span>
            <span className="qld-chg-ar"><Ic d={ARROW} /></span>
            <ul>{(letter.changes?.length ? letter.changes : line ? [line] : ["What changed isn't recorded"]).map((c, i) => <li key={i}>{c}</li>)}</ul>
            <span className="qld-chg-ar"><Ic d={ARROW} /></span>
            <span className="qld-chg-b">{letter.versionName}</span>
          </div>
        ) : (
          <div className="qld-chg qld-chg--root" data-ql="changes">Your first letter. Later letters show what changed from the one before.</div>
        )}
        {editing != null ? (
          <textarea className="qld-sheet qld-sheet--edit" data-ql="sheet-edit" value={editing} onChange={(e) => setEditing(e.target.value)} rows={18} autoFocus />
        ) : letter.contentDraft?.trim() ? (
          <div className="qld-sheet" data-ql="sheet">{letter.contentDraft}</div>
        ) : (
          <div className="qld-sheet qld-sheet--file" data-ql="sheet">{letter.fileName ? `Kept in ${letter.fileName}.` : "No text saved for this letter."}</div>
        )}
        <div className="qld-meta">
          <div>
            <h4 className="qld-h4">Comps it names</h4>
            {named.length ? named.map((c) => (
              <span key={c.id} className="qld-chip"><Ic d={(c.media ?? "book") === "book" ? BOOK : FILM} />{c.title}</span>
            )) : <span className="qld-none">None named</span>}
            <button type="button" className="qld-lnk" data-ql="log-comp" onClick={() => setPicker({ letterId: letter.id })}>+ Log a comp from your library</button>
          </div>
          <div>
            <h4 className="qld-h4">In packages</h4>
            {pkgs.length ? pkgs.map((p) => (
              <button key={p.id} type="button" className="qld-chip qld-chip--pk" onClick={() => { close(); navigate(`${PACKAGES_PATH}?pkg=${p.id}`); }}><Ic d={BOOK} />{p.packageName}</button>
            )) : <span className="qld-none">Not in a package yet</span>}
          </div>
        </div>
      </div>
    ) : sent === 0 ? (
      <p className="qld-none qld-pad" data-ql="pane-stats">Once this letter goes out with a query, you'll see how agents respond to it here.</p>
    ) : (
      <div data-ql="pane-stats">
        <div className="qld-cells">
          <div><b>{sent}</b><span>{sent === 1 ? "query sent with it" : "queries sent with it"}</span></div>
          <div><b>{f.replies}</b><span>{f.replies === 1 ? "reply" : "replies"}</span></div>
          <div><b>{f.more}</b><span>asked for more ({f.morePct}%)</span></div>
        </div>
        <h4 className="qld-h4">Queries it went out with</h4>
        <ul className="qld-q">
          {f.qs.slice(0, 6).map((q) => {
            const a = (agents as Agent[]).find((x) => x.id === q.agentId);
            const kind = MORE.has(q.status) ? "more" : NO.has(q.status) ? "no" : "w";
            return (
              <li key={q.id}>
                <button type="button" data-ql="query-row" onClick={() => { close(); openQueryPanel(q.id, "other"); }}>
                  <span className="qld-qi">{agentInitials(a)}</span>
                  <span className="qld-qn"><b>{agentPrimary(a)}</b><small>{agentSecondary(a)}</small></span>
                  <span className={`qld-qs qld-qs--${kind}`}>{STAGE_NAME[q.status] ?? q.status}</span>
                  <span className="qld-qd">{fmtDay(q.dateSent)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {sent > 6 && <button type="button" className="qld-lnk" data-ql="see-all" onClick={() => { close(); navigate("/queries"); }}>See all {sent} in the Query Centre</button>}
      </div>
    );
  }

  let foot: React.ReactNode = null;
  if (isNew) {
    foot = (
      <div className="qld-df">
        <span className="qld-dfn">Saved letters can be picked in any package.</span>
        <button type="button" className="qld-b2" onClick={close}>Cancel</button>
        <button type="button" className="qld-b1" data-ql="save-letter" disabled={!canSave || saving} onClick={() => void saveNew()}>Save letter</button>
      </div>
    );
  } else if (letter) {
    const inUse = letter.id === inUseId;
    const retired = (letter.status ?? "Active") === "Retired";
    foot = editing != null ? (
      <div className="qld-df">
        <span className="qld-dfn">Not sent yet, so edit it freely.</span>
        <button type="button" className="qld-b2" onClick={() => setEditing(null)}>Cancel</button>
        <button type="button" className="qld-b1" data-ql="save-edit" onClick={() => void saveEdit()}>Save</button>
      </div>
    ) : (
      <div className="qld-df">
        <span className="qld-dfn">{locked ? "Sent letters stay as they went." : sent > 0 ? "Your earlier queries count towards this letter." : "Not sent yet, so edit it freely."}</span>
        {locked
          ? <button type="button" className="qld-b2" data-ql="copy" onClick={() => setMode({ kind: "new", from: letter.id })}><Ic d={COPY} />Copy to a new letter</button>
          : <button type="button" className="qld-b2" data-ql="edit" onClick={() => setEditing(letter.contentDraft ?? "")}><Ic d={PEN} />Edit</button>}
        {!inUse && !retired && <button type="button" className="qld-b1" data-ql="use" onClick={() => void useForNew(letter.id)}>Use for new queries</button>}
      </div>
    );
  }

  return (
    <HalfDrawer
      probe="letter" open={open} onClose={close} label={isNew ? "New query letter" : letter?.versionName ?? "Query letter"}
      width="min(640px, 54vw)" head={head} foot={foot}
      over={
        <CompLetterPicker
          request={open ? picker : null} letters={(model?.letters ?? []) as ManuscriptVersion[]} currentLetterId={letter?.id ?? null}
          comps={comps} rows={compRows} now={currentYear()} sentByLetter={model?.sentByLetter ?? new Map()}
          onClose={() => setPicker(null)}
          onSave={(id, keys) => void saveComps(id, keys)}
          onNewVersion={(id) => { setPicker(null); setMode({ kind: "new", from: id }); }}
          onOpenPackages={() => { setPicker(null); close(); navigate(PACKAGES_PATH); }}
        />
      }
    >
      <div className="qld-db">{content}</div>
    </HalfDrawer>
  );
};
