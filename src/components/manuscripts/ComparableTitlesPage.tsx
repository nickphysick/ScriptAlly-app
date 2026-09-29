/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v2 (27 Sep; ref design-refs/materials/comps-v2.html). Route /manuscripts/comps.
 *
 * The page renders its OWN group, like the Contact list's `.clv-group`: the full `PageHeader` is row 1
 * across both tracks, and beneath its rule sit the main column (the query line and the library, the
 * add form included) and the rail (the Scout, coming soon). `WorkspacePageGrid` is given
 * `masthead={null}` — the header is the page's first row, not the grid's slab.
 *
 * ⚠️ STORE FACTS AND ONE INTENT. `inQuery` is the only stored intent; the order is array position
 * (no stored `order`); the line, the ordinals, the composition and the ages are derived at render
 * (lib/compsPage.ts). Every write goes through `normalizeComp`, so optional fields stay omit-empty.
 *
 * ⚠️ NO WRITE FAILS SILENTLY (Phase 5). Each write shows its change at once, awaits the store, and
 * on a refusal puts the list back and says so (`lib/compsWrite.ts`). It used to be
 * `void updateManuscript(…)`, an unhandled rejection on every failure.
 *
 * ⚠️ SCOPE IS THE BAR SWITCHER'S, READ EVERY RENDER — never latched in state. The switcher writes
 * `scriptally_active_manuscript_id` and re-opens the route.
 */
import { SHORTCUTS, matchesShortcut } from "../../lib/shortcuts";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { CompTitle } from "../../types";
import { PageHeader } from "../shell/PageHeader";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import {
  CompDraft, MAX_COMPS, manuscriptComps, normalizeComp, withCompAdded, withCompEdited, withCompMoved, withCompRemoved,
} from "../../lib/comps";
import { QueryFormat, compCounts, compositionLine, currentYear } from "../../lib/compsPage";
import { SAVE_FAILED, runWrite } from "../../lib/compsWrite";
import { useToast } from "../toast/ToastProvider";
import { CompCard } from "./CompCard";
import { CompForm } from "./CompForm";
import { CompsQueryLine } from "./CompsQueryLine";
import { CompsScoutRail } from "./CompsScoutRail";
import { CompsExampleCards, CompsHow } from "./CompsEmpty";
import "./compsV2.css";

/** Shared with the bar's switcher and the packages page — the section's one active-manuscript key. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

type FormState = { mode: "add" } | { mode: "edit"; index: number; focusNote: boolean };

/** A stable key per card: the title, and which occurrence of it (duplicates are allowed). */
function cardKeys(comps: CompTitle[]): string[] {
  const seen = new Map<string, number>();
  return comps.map((c) => {
    const n = seen.get(c.title) ?? 0;
    seen.set(c.title, n + 1);
    return `${c.title}\u0000${n}`;
  });
}

export const ComparableTitlesPage: React.FC<{
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}> = () => {
  const { currentUser, manuscripts, updateManuscript } = useScriptAllyDb();
  const { showToast } = useToast();

  /* ⚠️ EVERY HOOK ABOVE THE FIRST EARLY RETURN — the old page declared a `useRef` below
     `if (!currentUser) return null`, a hook whose presence depended on a branch. */
  const [format, setFormat] = useState<QueryFormat>("readers");
  const [form, setForm] = useState<FormState | null>(null);
  /** the manuscript whose empty-state form the writer dismissed (the form is open by default at 0) */
  const [emptyClosedFor, setEmptyClosedFor] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ key: string; n: number } | null>(null);
  /** the optimistic list while a write is in flight — what the page shows until the store answers */
  const [pending, setPending] = useState<{ msId: string; comps: CompTitle[] } | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: { index: number; after: boolean } | null } | null>(null);
  const seq = useRef(0);
  const compsRef = useRef<CompTitle[]>([]);
  const openerRef = useRef<HTMLElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const gripRefs = useRef(new Map<string, HTMLButtonElement>());
  const editRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusGrip = useRef<string | null>(null);
  /**
   * What to focus after the next commit — a function, resolved AFTER the render, because the element
   * to focus often does not exist yet: the form replaces the card (or the add button), so closing it
   * mounts a NEW Edit / add button and the element captured at open is disconnected by then. Run in a
   * layout effect so focus never sits on <body> for a frame.
   */
  const focusNext = useRef<(() => HTMLElement | null | undefined) | null>(null);
  const formOpenRef = useRef(false);
  const openAddRef = useRef<() => void>(() => {});

  const selectedMsId = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const ordered = [...manuscripts].sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)));
  const activeMs = manuscripts.find((m) => m.id === selectedMsId) ?? ordered[0] ?? null;
  const stored = activeMs ? manuscriptComps(activeMs) : [];
  const comps = pending && activeMs && pending.msId === activeMs.id ? pending.comps : stored;
  compsRef.current = comps;
  const keys = cardKeys(comps);
  const now = currentYear();
  const isEmpty = !!activeMs && comps.length === 0;
  const liveForm: FormState | null = form ?? (isEmpty && emptyClosedFor !== activeMs?.id ? { mode: "add" } : null);
  formOpenRef.current = !!liveForm;
  const full = comps.length >= MAX_COMPS;

  /* `N` opens the add form — never from inside a field, never over an open form */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!matchesShortcut(SHORTCUTS.compAdd, e)) return; /* the key is the registry's (lib/shortcuts.ts) */
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (formOpenRef.current) return;
      /* only when THIS page is the one on screen — every workspace page stays mounted */
      if (!pageRef.current || pageRef.current.getBoundingClientRect().height === 0) return;
      e.preventDefault();
      openAddRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* a grip moved by the keyboard keeps focus across the re-render; a closed edit form gives focus
     back to its card's Edit */
  useLayoutEffect(() => {
    if (focusGrip.current) {
      gripRefs.current.get(focusGrip.current)?.focus();
      focusGrip.current = null;
    }
    if (focusNext.current) {
      const el = focusNext.current();
      focusNext.current = null;
      el?.focus();
    }
  });

  /* the flash plays once, then comes off so a repeat can restart it */
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2000);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!currentUser) return null;

  // ── writes ──
  /** Show `next` now, write it, and on a refusal put the list back and say so. Never rejects. */
  const commit = async (next: CompTitle[]): Promise<boolean> => {
    if (!activeMs) return false;
    const msId = activeMs.id;
    const mine = ++seq.current;
    const clean = next.map(normalizeComp);
    setPending({ msId, comps: clean });
    const ok = await runWrite(
      () => updateManuscript(msId, { comps: clean }),
      () => showToast({ message: SAVE_FAILED }),
    );
    if (seq.current === mine) setPending(null);
    return ok;
  };

  const flashAt = (index: number, list = compsRef.current) => {
    const k = cardKeys(list)[index];
    if (k) setFlash({ key: k, n: Date.now() });
  };

  /** back to what opened the form, or — when that has gone — the add button, then the header's primary */
  const returnFocus = () => {
    const el = openerRef.current;
    focusNext.current = () => (el && el.isConnected ? el : addBtnRef.current ?? primaryRef.current);
  };
  const focusEditOf = (key: string | undefined) => {
    focusNext.current = () => (key ? editRefs.current.get(key) : null) ?? addBtnRef.current;
  };

  const openAdd = () => {
    if (full) return;
    /* what opened it gets focus back; a key press from nowhere (the body) falls back to the add button */
    const a = document.activeElement as HTMLElement | null;
    openerRef.current = a && a !== document.body ? a : null;
    if (isEmpty) setEmptyClosedFor(null);
    setForm({ mode: "add" });
  };
  openAddRef.current = openAdd;

  const openEdit = (index: number, focusNote: boolean) => {
    openerRef.current = null;
    setForm({ mode: "edit", index, focusNote });
  };

  const cancel = () => {
    const f = form;
    setForm(null);
    if (isEmpty && activeMs) setEmptyClosedFor(activeMs.id);
    if (f?.mode === "edit") focusEditOf(keys[f.index]);
    else returnFocus();
  };

  const add = (draft: CompDraft) => {
    const comp = normalizeComp({ ...draft, inQuery: false, source: "user" });
    const next = withCompAdded(compsRef.current, comp);
    setForm(null);
    void commit(next);
    flashAt(next.length - 1, next);
    /* ⚠️ FOCUS RETURNS TO THE ADD BUTTON — a writer adds three comps in a sitting */
    focusNext.current = () => addBtnRef.current;
    showToast({
      message: `Added ${comp.title}.`,
      undo: async () => {
        const cur = compsRef.current;
        let at = -1;
        for (let i = cur.length - 1; i >= 0; i--) if (cur[i].title === comp.title) { at = i; break; }
        if (at >= 0) await commit(withCompRemoved(cur, at));
      },
    });
  };

  const save = (index: number, draft: CompDraft) => {
    const before = compsRef.current[index];
    const next = withCompEdited(compsRef.current, index, draft);
    setForm(null);
    void commit(next);
    flashAt(index, next);
    focusEditOf(cardKeys(next)[index]);
    showToast({
      message: `Saved ${draft.title}.`,
      undo: async () => { await commit(compsRef.current.map((c, i) => (i === index ? before : c))); },
    });
  };

  const remove = (index: number) => {
    const gone = compsRef.current[index];
    void commit(withCompRemoved(compsRef.current, index));
    showToast({
      message: `Removed ${gone.title}.`,
      /* ⚠️ RESTORED AT ITS ORIGINAL INDEX, never appended: position is the line's order */
      undo: async () => {
        const back = [...compsRef.current];
        back.splice(Math.min(index, back.length), 0, gone);
        if (await commit(back)) flashAt(index, back);
      },
    });
  };

  const toggle = (index: number) =>
    void commit(compsRef.current.map((c, i) => (i === index ? { ...c, inQuery: !c.inQuery } : c)));

  const move = (from: number, to: number, keyboard: boolean) => {
    if (to < 0 || to >= compsRef.current.length || from === to) return;
    const next = withCompMoved(compsRef.current, from, to);
    const k = cardKeys(next)[to];
    if (keyboard) focusGrip.current = k;
    else setFlash({ key: k, n: Date.now() });
    void commit(next);
  };

  // ── drag by the grip (pointer; 3px dead zone; auto-scroll near the window's edges) ──
  const onGripDown = (from: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (liveForm || e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    let moved = false;
    let over: { index: number; after: boolean } | null = null;
    const scroller = listRef.current?.closest(".wpg-scroll") as HTMLElement | null;
    document.body.classList.add("cpv-reordering");
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - startY) < 3) return;
      moved = true;
      if (scroller) {
        const r = scroller.getBoundingClientRect();
        if (ev.clientY < r.top + 60) scroller.scrollTop -= 14;
        else if (ev.clientY > r.bottom - 60) scroller.scrollTop += 14;
      }
      const cards = [...(listRef.current?.querySelectorAll<HTMLElement>(':scope > [data-cpv="comp"]') ?? [])];
      over = null;
      for (let i = 0; i < cards.length; i++) {
        if (i === from) continue;
        const r = cards[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) { over = { index: i, after: false }; break; }
        over = { index: i, after: true };
      }
      setDrag({ from, over });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("cpv-reordering");
      setDrag(null);
      if (!moved || !over) return;
      const to = over.index > from ? (over.after ? over.index : over.index - 1) : (over.after ? over.index + 1 : over.index);
      move(from, to, false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // ── render ──
  const counts = compCounts(comps);
  const fact = compositionLine(comps, now);
  const description = !activeMs
    ? "Add a manuscript to build its comp list."
    : isEmpty
      ? <>Books, films and shows like <span className="ph-ms">{activeMs.title}</span>, with a line on why each compares. The ones you switch on build your query line.</>
      : <>Books, films and shows like <span className="ph-ms">{activeMs.title}</span>, and why. <strong>{counts.total}</strong> on your list, <strong>{counts.inQuery}</strong> named in your query letter.</>;

  const formEl = (f: FormState) => (
    <CompForm
      key={f.mode === "edit" ? `edit-${keys[f.index]}` : "add"}
      mode={f.mode}
      initial={f.mode === "edit" ? comps[f.index] : undefined}
      focusNote={f.mode === "edit" && f.focusNote}
      existing={comps.map((c, index) => ({ title: c.title, index }))}
      onSave={(d) => (f.mode === "edit" ? save(f.index, d) : add(d))}
      onCancel={cancel}
      onShowExisting={(index) => {
        setForm(null);
        flashAt(index);
        window.requestAnimationFrame(() => listRef.current?.querySelectorAll('[data-cpv="comp"]')[index]?.scrollIntoView({ block: "nearest" }));
      }}
    />
  );

  return (
    <WorkspacePageGrid scrollLabel="Comparable titles" masthead={null}>
      <div className="cpv-page" data-cpv="page" ref={pageRef}>
        <div className="cpv-group">
          <div className="cpv-head">
            <PageHeader
              variant="full"
              title="Comparable titles"
              description={description}
              primaryRef={primaryRef}
              primary={activeMs ? { label: full ? "This list is full" : "+ Add a comp", onClick: openAdd, disabled: full } : undefined}
            />
          </div>

          <div className="cpv-main" data-cpv="main">
            {!activeMs ? (
              <p className="cpv-hint">No manuscript to compare yet.</p>
            ) : isEmpty ? (
              <>
                {liveForm && formEl(liveForm)}
                <CompsHow />
                <CompsQueryLine comps={[]} msTitle={activeMs.title} format="readers" onFormat={() => {}} example />
                <CompsExampleCards now={now} />
              </>
            ) : (
              <>
                <CompsQueryLine comps={comps} msTitle={activeMs.title} format={format} onFormat={setFormat} />
                <div>
                  <div className="cpv-sech">
                    <h2>Your comps <span className="cpv-pill" data-cpv="lib-count">{counts.total}</span></h2>
                    <span className="cpv-hint">Drag to reorder. The order sets your query line.</span>
                  </div>
                  {fact && <div className="cpv-libfact" data-cpv="lib-fact">{fact}</div>}
                  <div className="cpv-list" data-cpv="list" ref={listRef}>
                    {liveForm?.mode === "add" ? formEl(liveForm) : (
                      <button type="button" className="cpv-btn cpv-btn--line" data-cpv="add" ref={addBtnRef} disabled={full} onClick={openAdd}>
                        {full ? "This list is full" : "+ Add a comp"}
                      </button>
                    )}
                    {comps.map((c, i) => {
                      if (liveForm?.mode === "edit" && liveForm.index === i) return <React.Fragment key={keys[i]}>{formEl(liveForm)}</React.Fragment>;
                      const pos = c.inQuery ? comps.slice(0, i + 1).filter((x) => x.inQuery).length : null;
                      return (
                        <CompCard
                          key={keys[i]}
                          comp={c}
                          position={pos}
                          now={now}
                          dragging={drag?.from === i}
                          drop={drag?.over?.index === i ? (drag.over.after ? "after" : "before") : null}
                          flash={flash?.key === keys[i]}
                          onToggle={() => toggle(i)}
                          onEdit={(focusNote) => openEdit(i, !!focusNote)}
                          onRemove={() => remove(i)}
                          onGripPointerDown={onGripDown(i)}
                          onGripKey={(d) => move(i, i + d, true)}
                          gripRef={(el) => { if (el) gripRefs.current.set(keys[i], el); else gripRefs.current.delete(keys[i]); }}
                          editRef={(el) => { if (el) editRefs.current.set(keys[i], el); else editRefs.current.delete(keys[i]); }}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <CompsScoutRail />
        </div>
      </div>
    </WorkspacePageGrid>
  );
};
