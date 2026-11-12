/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryLettersPage — `/materials/letters`, Query letters v2 (12 Nov; design-refs/query-letters-v2): the letter desk.
 * The shared open header (`shell/OpenHeader`) with the in-use block in its third column; under it three columns on
 * the same grid — "Your letters", the selected letter in full, and "How it's doing". Writing happens in the middle
 * column; there is no drawer on this page. Desktop only: below 768px App.tsx sends the route to Materials on the phone.
 *
 * ⚠️ EVERY FIGURE IS `lib/queryLetters`. "In use" is `inUseLetter`; a query's letter is `resolveLetters`; sent, replied
 * and asked-for-more are `letterFacts`. Nothing on this page derives them a second way.
 * ⚠️ IT WRITES ONLY THROUGH THE EXISTING WRITERS: `addVersion` (a new letter, and a new version of a sent one),
 * `updateVersion` (a draft's text, name and changes) and `updateManuscriptQuiet({ inUseLetterId })`. A sent letter's
 * text is never written: the editor is never opened on one, `save` refuses one, and `updateVersion` refuses it anyway.
 * The one other call is `deleteVersion`, as the Undo of a letter this page has just created.
 * ⚠️ NOTHING IS LOST SILENTLY. Leaving an editor with unsaved changes — another row, Cancel, Esc, New letter, Upload, a
 * route change — raises the guard bar in place; the page stays mounted across routes, so a route change keeps the edit
 * and the guard is waiting on return. Closing the tab asks through `beforeunload`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import { ComponentType, type Agent, type ManuscriptVersion, type Query } from "../../types";
import { scopedManuscript } from "../../lib/manuscriptSummary";
import { buildRows } from "../../lib/analytics";
import { PACKAGES_PATH } from "../../lib/packagesRoute";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { nextVersionName } from "../../lib/versionLock";
import {
  countWords, earlierUnrecorded, earlyNote, firstLetter, inUseLetter, isLiveLetter, letterFacts, lettersFor, lettersTitle,
  packageLetterDiffers, pageOrder, resolveLetters, type LetterFacts,
} from "../../lib/queryLetters";
import { OpenHeader } from "../shell/OpenHeader";
import { LetterRows, LetterView, LetterEditor, ReadRail, WriteRail, DayOne, DeskSkeleton, type EdState } from "./LetterDesk";
import { isFileOnly } from "./letterBits";
import "./queryLetters.css";

export const QUERY_LETTERS_TITLE = "Query letters";
export const NO_LETTERS_TITLE = "No query letters yet";
export const EMPTY_LETTER = "Paste your letter in first. There's nothing to save yet.";
export const SAVE_FAILED = "That letter didn't save. Check your connection and try again.";
export const SENT_LOCKED = "This letter has gone out, so its text stays as it was sent. To change it, start a new version from it.";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const COURIER = "/images/dash/courier.png";
const isTextFile = (f: File) => /\.(txt|md|text)$/i.test(f.name) || f.type.startsWith("text/");

/** the editor has something a leave would lose */
export const edDirty = (e: EdState): boolean =>
  e.text !== e.orig || e.name !== e.origName || e.changes.join("|") !== e.origChanges.join("|");
/** a leave asks first: changes, or a new letter from nothing that has text or a file in it (the ref's `leaveEd`) */
export const edNeedsGuard = (e: EdState): boolean =>
  edDirty(e) || (e.kind === "new" && (!!e.text.trim() || !!e.file));

/** the nearest scrolling ancestor's height, published as `--qlp-port-h` for the sticky list's own scroll */
function usePortHeight(el: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const node = el.current;
    if (!node || !active || typeof ResizeObserver === "undefined") return undefined;
    let port: HTMLElement | null = node.parentElement;
    while (port && !/(auto|scroll)/.test(getComputedStyle(port).overflowY)) port = port.parentElement;
    const target = port ?? document.documentElement;
    const set = () => node.style.setProperty("--qlp-port-h", `${target.clientHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(target);
    return () => ro.disconnect();
  }, [el, active]);
}

export const QueryLettersPage: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const db = useScriptAllyDb();
  const {
    manuscripts, packages, queries, activities, agents, versions, collectionsReady,
    updateManuscriptQuiet, addVersion, updateVersion, deleteVersion,
  } = db;
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const stored = useMemo(() => { try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; } }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, stored), [manuscripts, stored]);

  const msQueries = useMemo(() => (ms ? (queries as Query[]).filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const rows = useMemo(() => new Map(buildRows(msQueries, activities, agents as Agent[], Date.now()).map((r) => [r.id, r])), [msQueries, activities, agents]);
  const letters = useMemo(() => (ms ? lettersFor(ms.id, versions) : []), [ms, versions]);
  const live = useMemo(() => letters.filter(isLiveLetter), [letters]);
  const retired = useMemo(() => letters.filter((v) => !isLiveLetter(v)), [letters]);
  const use = useMemo(() => inUseLetter(ms, versions, packages), [ms, versions, packages]);
  const differs = useMemo(() => packageLetterDiffers(ms, versions, packages), [ms, versions, packages]);
  const resolved = useMemo(() => (ms ? resolveLetters(ms.id, msQueries, versions, packages) : new Map()), [ms, msQueries, versions, packages]);
  const facts = useMemo(() => new Map<string, LetterFacts>(letters.map((v) => [v.id, letterFacts(v, msQueries, resolved, rows)])), [letters, msQueries, resolved, rows]);
  const firstId = ms ? firstLetter(ms.id, versions)?.id ?? null : null;
  const ordered = useMemo(() => pageOrder(live, use?.id ?? null), [live, use]);
  const byId = useCallback((id: string | null | undefined) => (id ? versions.find((v) => v.id === id) ?? null : null), [versions]);

  /* ── page state ── */
  const [selId, setSelId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [picker, setPicker] = useState(false);
  const [diff, setDiff] = useState(false);
  const [ed, setEd] = useState<EdState | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [stamp, setStamp] = useState(false);
  const [justSaved, setJustSaved] = useState<ReadonlySet<string>>(new Set());
  const [firstNote, setFirstNote] = useState<{ id: string; n: number } | null>(null);
  const thenRef = useRef<(() => void) | null>(null);
  const saving = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef<HTMLDivElement>(null);
  usePortHeight(pageRef, active);

  /* selection defaults to the in-use letter, and falls back to it when the selected letter goes */
  const allIds = useMemo(() => new Set(letters.map((v) => v.id)), [letters]);
  const sel = selId && allIds.has(selId) ? selId : use?.id ?? ordered[0]?.id ?? null;
  const selLetter = byId(sel);

  useEffect(() => { if (!flash) return undefined; const t = setTimeout(() => setFlash(null), 1400); return () => clearTimeout(t); }, [flash]);
  useEffect(() => { if (!stamp) return undefined; const t = setTimeout(() => setStamp(false), 300); return () => clearTimeout(t); }, [stamp]);

  /* ── the editor ── */
  const start = (kind: EdState["kind"], letter: ManuscriptVersion | null, file?: { name: string; text: string } | null) => {
    const names = live.map((l) => l.versionName);
    const name = kind === "edit" ? letter?.versionName ?? "" : nextVersionName((kind === "copy" ? letter?.versionName : use?.versionName) ?? "Query letter v0", names);
    const text = kind === "new" ? file?.text ?? "" : letter?.contentDraft ?? "";
    const changes = kind === "edit" ? [...(letter?.changes ?? [])].slice(0, 3) : [];
    while (changes.length < 3) changes.push("");
    setEd({
      kind, id: kind === "edit" ? letter?.id ?? null : null, from: kind === "copy" ? letter?.id ?? null : null,
      name, text, changes, orig: text, origName: name, origChanges: [...changes],
      file: kind === "new" ? file?.name ?? null : kind === "edit" ? letter?.fileName ?? null : null, fileRead: !!file?.text,
      guard: false, err: null,
    });
    setNext(null); setDiff(false); setPicker(false);
    requestAnimationFrame(() => { const ta = taRef.current; if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } });
  };
  const exit = () => { setEd(null); thenRef.current = null; };
  /** leave only when nothing would be lost; otherwise ask, in place, with Save as the filled button */
  const leave = (then: (() => void) | null) => {
    if (!ed) { then?.(); return; }
    if (edNeedsGuard(ed)) { thenRef.current = then; setEd({ ...ed, guard: true }); return; }
    exit(); then?.();
  };
  const keepEditing = () => { if (!ed) return; thenRef.current = null; setEd({ ...ed, guard: false }); requestAnimationFrame(() => taRef.current?.focus()); };
  const discard = () => { const then = thenRef.current; exit(); then?.(); };

  /** a new letter, from the editor or the day-one sheet: `addVersion` only */
  const create = async (input: { name: string; text: string; file: string | null; from: string | null; changes: string[] }): Promise<string | null> => {
    if (!ms) return null;
    const firstEver = live.length === 0 && !versions.some((v) => v.manuscriptId === ms.id && v.componentType === ComponentType.QUERY_LETTER);
    const earlier = firstEver ? earlierUnrecorded(ms.id, queries as Query[], versions, packages) : 0;
    const v: Record<string, unknown> = { manuscriptId: ms.id, componentType: ComponentType.QUERY_LETTER, versionName: input.name.slice(0, 256), fileAttached: false };
    if (input.text.trim()) { v.contentType = "text"; v.contentDraft = input.text; v.wordCount = countWords(input.text); }
    else v.contentType = "ref";
    if (input.file) v.fileName = input.file;
    if (input.from) { v.parentId = input.from; if (input.changes.length) v.changes = input.changes; }
    const id = await addVersion(v as Parameters<typeof addVersion>[0]);
    if (!id) { showToast({ message: SAVE_FAILED }); return null; }
    setSelId(id); setFlash(id); setDiff(false);
    setJustSaved((s) => new Set(s).add(id));
    setNext(id);
    setFirstNote(earlier > 0 ? { id, n: earlier } : null);
    showToast({ message: `Saved ${input.name} as a draft.`, undo: async () => { await deleteVersion(id); } });
    return id;
  };

  const save = async () => {
    const e = ed;
    if (!e || !ms || saving.current) return;
    const then = thenRef.current;
    if (e.kind === "edit" && !edDirty(e)) { exit(); then?.(); return; }
    const text = e.text.replace(/\s+$/, "");
    const name = e.name.trim() || e.origName;
    if (!text.trim() && !(e.kind === "new" && e.file)) { setEd({ ...e, err: EMPTY_LETTER, guard: false }); return; }
    const changes = e.changes.map((c) => c.trim()).filter(Boolean).slice(0, 8).map((c) => c.slice(0, 80));
    saving.current = true;
    try {
      if (e.kind === "edit") {
        const l = byId(e.id);
        if (!l) { exit(); return; }
        /* ⚠️ A SENT LETTER'S TEXT IS NEVER WRITTEN — the change is a new version (updateVersion refuses it too) */
        if (facts.get(l.id)?.direct) { setEd({ ...e, guard: false, err: SENT_LOCKED }); return; }
        const fields: Record<string, unknown> = {};
        const before: Record<string, unknown> = {};
        const put = (k: keyof ManuscriptVersion, val: unknown) => { fields[k] = val; before[k] = l[k] ?? deleteField(); };
        if (name !== l.versionName) put("versionName", name.slice(0, 256));
        if (text !== (l.contentDraft ?? "")) { put("contentDraft", text); put("contentType", "text"); put("wordCount", countWords(text)); }
        if (l.parentId && changes.join("|") !== (l.changes ?? []).join("|")) put("changes", changes.length ? changes : deleteField());
        if (!Object.keys(fields).length) { exit(); then?.(); return; }
        const err = await updateVersion(l.id, fields as Parameters<typeof updateVersion>[1]);
        if (err) { showToast({ message: err }); setEd({ ...e, guard: false }); return; }
        exit();
        setFlash(l.id);
        setJustSaved((s) => new Set(s).add(l.id));
        showToast({ message: `Saved ${name}.`, undo: async () => { await updateVersion(l.id, before as Parameters<typeof updateVersion>[1]); } });
        then?.();
      } else {
        const id = await create({ name, text, file: e.file, from: e.kind === "copy" ? e.from : null, changes: e.kind === "copy" ? changes : [] });
        if (!id) { setEd({ ...e, guard: false }); return; }
        exit();
        then?.();
      }
    } finally { saving.current = false; }
  };

  /* ── reading actions ── */
  const select = (id: string) => {
    if (ed && ed.kind === "edit" && ed.id === id) return;
    leave(() => { setSelId(id); setDiff(false); setNext(null); setFirstNote((f) => (f?.id === id ? f : null)); });
  };
  const useForNew = async (id: string) => {
    setPicker(false); setNext(null);
    if (!ms || id === use?.id) return;
    const before = ms.inUseLetterId;
    await updateManuscriptQuiet(ms.id, { inUseLetterId: id });
    setStamp(true);
    const name = byId(id)?.versionName ?? "This letter";
    showToast({
      message: `New queries now go out with ${name}.`,
      undo: async () => { await updateManuscriptQuiet(ms.id, { inUseLetterId: before ?? (deleteField() as unknown as string) }); },
    });
  };
  const copyText = async (l: ManuscriptVersion) => {
    try { await navigator.clipboard.writeText(l.contentDraft ?? ""); } catch { /* the toast still says what to do */ }
    showToast({ message: `Copied ${l.versionName}. Paste it into your email or the agent's form.` });
  };
  const newLetter = () => leave(() => start("new", null));
  const newVersion = (l: ManuscriptVersion) => leave(() => start("copy", l));
  /* "Paste the text" on a file-only letter: its own editor while it is a draft; a sent one becomes a new version */
  const editLetter = (l: ManuscriptVersion) => leave(() => start(facts.get(l.id)?.direct ? "copy" : "edit", l));
  const upload = () => leave(() => fileRef.current?.click());
  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    /* today's behaviour, unchanged: a text file's contents are read; any other file is kept by name */
    const text = isTextFile(file) ? await file.text() : "";
    start("new", null, { name: file.name, text });
  };

  /* ── keyboard, route change, tab close ── */
  useEscapeLayer(picker && active, () => setPicker(false), ESC_LEVEL.page);
  useEscapeLayer(!!ed && active, () => { if (ed?.guard) keepEditing(); else leave(null); }, ESC_LEVEL.pageMode);
  useEffect(() => {
    if (!ed || !active) return undefined;
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); void save(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });
  useEffect(() => { if (!active && ed && edNeedsGuard(ed) && !ed.guard) { thenRef.current = null; setEd({ ...ed, guard: true }); } }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirtyNow = !!ed && edNeedsGuard(ed);
  useEffect(() => {
    if (!dirtyNow) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyNow]);
  useEffect(() => {
    if (!picker) return undefined;
    const down = (e: PointerEvent) => { if (!pickRef.current?.contains(e.target as Node)) setPicker(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [picker]);

  /* ── render ── */
  const loading = !collectionsReady;
  const empty = !loading && letters.length === 0;
  const useFacts = use ? facts.get(use.id) : undefined;
  const title = loading ? " " : empty ? NO_LETTERS_TITLE : lettersTitle(live.length);
  const note = earlyNote(live.map((v) => ({ name: v.versionName, sent: facts.get(v.id)?.sent ?? 0 })));

  const inUseBlock = use && !loading ? (
    <div className="qlp-wk" data-ql="in-use">
      <div className="qlp-wkh">
        <span className="qlp-wkt" data-ql="in-use-name"><b>{use.versionName}</b> in use</span>
        {live.length > 1 && (
          <div className="qlp-chw" ref={pickRef}>
            <button type="button" className="qlp-lnk" data-ql="change" aria-expanded={picker} onClick={() => setPicker((o) => !o)}>Change</button>
            {picker && (
              <div className="qlp-pick" role="listbox" aria-label="Letter for new queries" data-ql="picker">
                {pageOrder(live, null).map((v) => (
                  <button key={v.id} type="button" role="option" aria-selected={v.id === use.id} className="qlp-pick-o" onClick={() => void useForNew(v.id)}>
                    <b>{v.versionName}</b>
                    <span>{(facts.get(v.id)?.sent ?? 0) ? `${facts.get(v.id)?.sent} sent` : "Not sent yet"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="qlp-wkn" data-ql="in-use-line">
        Going out with new queries. {useFacts && useFacts.sent > 0 ? `${useFacts.more} of ${useFacts.sent} asked for more so far.` : "Not sent yet."}
      </p>
      {differs && (
        <p className="qlp-wkn qlp-wkpk" data-ql="pkg-letter">
          Package sends go with{" "}
          <a href={`${PACKAGES_PATH}?pkg=${differs.pkg.id}`} onClick={(e) => { e.preventDefault(); navigate(`${PACKAGES_PATH}?pkg=${differs.pkg.id}`); }}>
            {differs.pkg.packageName}
          </a>'s letter: {differs.letter.versionName}
        </p>
      )}
    </div>
  ) : null;

  const selFacts = selLetter ? facts.get(selLetter.id) : undefined;
  const edParent = ed ? (ed.kind === "copy" ? byId(ed.from) : ed.kind === "edit" ? byId(byId(ed.id)?.parentId) : null) : null;

  return (
    <div ref={pageRef} className={`qlp${empty ? " qlp--empty" : ""}`} data-ql="page" data-state={loading ? "loading" : empty ? "empty" : "filled"}>
      <div className="qc151 qlp-hdw">
        <OpenHeader
          className="qlp-hd"
          attrs={{ "data-ql": "header", "data-own-header": "" }}
          art={<img src={COURIER} alt="" />}
          artClassName="qlp-art"
          title={title}
          titleAttrs={{ "data-ql": "title", tabIndex: "-1" }}
          forLine={ms ? { lead: "for", text: ms.title, attrs: { "data-ql": "for" } } : null}
          actions={empty || loading ? null : <>
            <button type="button" className="qc1531-b qc1531-b--n" data-ql="new" onClick={newLetter}>+ New letter</button>
            <button type="button" className="qc1531-b qc1531-b--g" data-ql="upload" onClick={upload}>Upload a file</button>
          </>}
          ring={inUseBlock}
        />
        <input ref={fileRef} type="file" hidden accept=".txt,.md,.doc,.docx,.pdf,.rtf,.odt,text/*" data-ql="file-input" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>

      {loading ? <DeskSkeleton /> : empty ? (
        <DayOne onCreate={create} defaultName={nextVersionName("Query letter v0", [])} />
      ) : (
        <div className="qlp-desk" data-ql="desk" data-writing={ed ? "" : undefined}>
          <LetterRows
            ordered={ordered} retired={retired} facts={facts} inUseId={use?.id ?? null} firstId={firstId} sel={sel} ed={ed}
            edFromName={ed?.kind === "copy" ? byId(ed.from)?.versionName ?? null : null}
            flash={flash} stamp={stamp} justSaved={justSaved} note={note}
            showRetired={showRetired} onToggleRetired={() => setShowRetired((s) => !s)} onSelect={select}
          />
          <section className="qlp-mid" data-ql="letter" aria-live="polite">
            {ed ? (
              <LetterEditor
                ed={ed} taRef={taRef} parentName={edParent?.versionName ?? null}
                onChange={(patch) => setEd((cur) => (cur ? { ...cur, ...patch, err: null } : cur))}
                onSave={() => void save()} onCancel={() => leave(null)} onKeep={keepEditing} onDiscard={discard}
              />
            ) : selLetter && selFacts ? (
              <LetterView
                letter={selLetter} facts={selFacts} parent={byId(selLetter.parentId)} inUse={selLetter.id === use?.id}
                justSaved={justSaved.has(selLetter.id)} diff={diff} onDiff={() => setDiff((d) => !d)}
                next={next === selLetter.id && selLetter.id !== use?.id ? { current: use?.versionName ?? "" } : null}
                firstNote={firstNote?.id === selLetter.id ? firstNote.n : null}
                fileOnly={isFileOnly(selLetter)}
                onCopy={() => void copyText(selLetter)} onNewVersion={() => newVersion(selLetter)} onEdit={() => editLetter(selLetter)}
                onUse={() => void useForNew(selLetter.id)} onNotYet={() => setNext(null)}
              />
            ) : null}
          </section>
          {ed ? (
            <WriteRail ed={ed} parentName={edParent?.versionName ?? null} sentBefore={ed.kind === "edit" && (facts.get(ed.id ?? "")?.sent ?? 0) > 0}
              onChanges={(changes) => setEd((cur) => (cur ? { ...cur, changes } : cur))} />
          ) : selLetter && selFacts && ms ? (
            <ReadRail ms={ms} letter={selLetter} facts={selFacts} parent={byId(selLetter.parentId)} isFirst={selLetter.id === firstId}
              onNewVersion={(id) => { const l = byId(id); if (l) newVersion(l); }} />
          ) : <aside className="qlp-rail" />}
        </div>
      )}
    </div>
  );
};
