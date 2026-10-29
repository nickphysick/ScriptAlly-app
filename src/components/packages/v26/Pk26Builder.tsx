/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the builder: the "Build, view and edit" section. v39.3 (design-refs/submission-packages-v39-3/,
 * option B) REPLACES v39's two cards — Your materials (its folder tab, tabs and rows) and the package card with its
 * packing list — with Steps + preview (Pk393Builder). DRAG AND DROP IS RETIRED WITH THEM: pieces are picked in the steps.
 * This file keeps what the section owns: the draft first package and `put`, the start card, v40's package guidelines,
 * and the parts the new header reuses (the name in place, the icon-and-colour picker, "+ Add" for extras).
 *
 * ⚠️ WITH NO PACKAGE AT ALL the open package is a DRAFT — "My first package", nothing stored. The first piece picked
 *    creates the package with that piece in it, so an empty package is never written by accident.
 * ⚠️ A PACKAGE THAT HAS GONE OUT IS LOCKED (v40; Nick, 29 Oct, kept over the v39.3 pack): its steps are read-only and
 *    the note offers Make a copy. ITS NAME STAYS EDITABLE IN PLACE (Nick, 28 Oct): renaming is filing.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PACKAGE_ICONS, type PackageIcon, type SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { extraSuggestions, iconOf, offersNewExtra } from "../../../lib/packagesV26";
import { isLocked } from "../../../lib/packagesV40";
import { colourOf, PACKAGE_COLOURS, pcStyle } from "../../../lib/packagesV39";
import { PicBare } from "./icons";
import type { PieceKind, Pk26Model } from "./usePk26Model";
import { Pk393Builder } from "./Pk393Builder";

export const DRAFT_ID = "__draft";
export type LibTab = "let" | "syn" | "ver";

export const BUILDER_KICKER = "Build, view and edit";
export const STAGE_LOCK_TIP = "Locked: what each agent got stays as it was. You can still rename it; to change what goes out, make a copy.";
export const PICKER_NOTE = "Shows on its label, in the Query Centre and in your results.";

/* E5 — the package guidelines (v40), verbatim */
const GUIDELINES: [string, string][] = [
  ["Every package goes Draft → Ready → Out with agents.", " Draft until it has a letter and pages; Ready to pick when you log a query; locked once the first query goes out, so its results stay true."],
  ["Want to change one that’s out?", " Make a new package from it. The original stays exactly as agents got it."],
  ["Change one thing at a time.", " If two packages differ only by the letter, Results can tell you which letter does better."],
  ["Give it five queries before judging.", " One or two replies can swing a percentage either way."],
  ["Name it for who it’s for,", " like “Standard UK” or “US agents”, so it’s easy to pick when you log a query."],
  ["Fixing a typo?", " Edit the letter itself. A small fix keeps the same letter; a rewrite is a new letter."],
];

export interface BuilderProps {
  model: Pk26Model;
  /** retired packages, for the start card's "Copy …" options (shown only when no live package is left) */
  retired: SubmissionPackage[];
  current: SubmissionPackage | null;
  onSelect: (id: string) => void;
  /** v38 — Figures: the package drawer for the open package */
  onFigures: (p: SubmissionPackage) => void;
  /** a deep link (`?tab=let|syn|ver`) asks for that step open (the Your materials list it used to open is retired) */
  askStep: LibTab | null;
  onNewPackage: () => void;
  onDuplicate: (p: SubmissionPackage) => void;
  onEditPackage: (p: SubmissionPackage, focus?: "note") => void;
  onOpenMaterial: (kind: "let" | "syn" | "ext", id: string) => void;
  onNewMaterial: (kind: LibTab) => void;
  onOpenVersions: () => void;
  onOpenComps: () => void;
}

export const Pk26Builder: React.FC<BuilderProps> = ({ model, retired, current, onSelect, onFigures, askStep, onNewPackage, onDuplicate, onEditPackage, onOpenMaterial, onNewMaterial, onOpenVersions, onOpenComps }) => {
  const { msPkgs, active, activeMs } = model;

  /* the draft first package — only when the writer has no package at all; with packages and none live, the open
     card is the start card instead (E4) */
  const draft: SubmissionPackage | null = useMemo(() => (current || !activeMs || msPkgs.length ? null : {
    id: DRAFT_ID, manuscriptId: activeMs.id, userId: "", packageName: "My first package",
    note: "Name it whatever helps you — “Standard”, “UK agents”", queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "",
    ...(activeMs.inUseBookVersionId ? { bookVersionId: activeMs.inUseBookVersionId } : {}), status: "Active", createdDate: "",
  }), [current, activeMs, msPkgs.length]);
  const p = current ?? draft;

  const locked = !!p && p.id !== DRAFT_ID && isLocked(p);
  const put = async (kind: PieceKind, id: string) => {
    if (!p || locked) return;
    if (p.id === DRAFT_ID) {
      const made = await model.createPackage({ name: p.packageName, note: "", icon: "box", from: null, piece: { kind, id } });
      if (made) onSelect(made);
      return;
    }
    await model.putPiece(p, kind, id);
  };

  return (
    <>
      <section className="p9-pb-build" aria-label="Put a package together" data-pk26="builder" data-pk39="builder">
        <p className="p9-bk-k" data-pk39="kicker">{BUILDER_KICKER}</p>
        {/* v39.3: Steps + preview, or the start card when every package is retired */}
        {p ? <Pk393Builder model={model} p={p} isActive={active?.id === p.id || p.id === DRAFT_ID} onFigures={onFigures} onEdit={onEditPackage} onDuplicate={onDuplicate}
          onPut={put} onOpenMaterial={onOpenMaterial} onNewMaterial={onNewMaterial} onOpenVersions={onOpenVersions} onOpenComps={onOpenComps} askStep={askStep} />
          : <StartCard retired={retired} onNewPackage={onNewPackage} onDuplicate={onDuplicate} />}
        {/* v40's package guidelines, kept (v39 draws none and asks for none to go). v39.1: inside the builder's own section,
            24 under the cards, so the builder ends 96 above the results band (the ref's rhythm) */}
        <div className="p6-wbf p9-gl">
          <details className="p6-pkgl" data-pk40="guidelines">
            <summary><span className="p6-pkgl-ic">i</span>Package guidelines</summary>
            <ul>{GUIDELINES.map(([b, t]) => <li key={b}><b>{b}</b>{t}</li>)}</ul>
          </details>
        </div>
      </section>
    </>
  );
};

/** E4 (v40) — the start card: no live package left (everything retired), so start from scratch or copy one. */
const StartCard: React.FC<{ retired: SubmissionPackage[]; onNewPackage: () => void; onDuplicate: (p: SubmissionPackage) => void }> = ({ retired, onNewPackage, onDuplicate }) => (
  <div className="p9-pk-open" data-pk40="start">
    <div className="p6-pk-open p9-pk-start">
      <div className="p6-wb-start">
        <h3>Start a package</h3>
        <p>Every package you’ve made is retired. Start a new one here.</p>
        <div className="p6-wb-opts">
          <button type="button" onClick={onNewPackage}><b>From scratch</b><small>Pick every piece yourself</small></button>
          {retired.slice(0, 3).map((x) => (
            <button type="button" key={x.id} onClick={() => onDuplicate(x)}><b>Copy {x.packageName}</b><small>Same pieces, then change one</small></button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** F — the name, edited in place (the app's "editable in place" grammar: a dashed underline on hover). */
export const NameInPlace: React.FC<{ model: Pk26Model; p: SubmissionPackage }> = ({ model, p }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const restore = () => { if (ref.current) ref.current.textContent = p.packageName; };
  const commit = () => {
    const v = ref.current?.textContent?.trim() ?? "";
    /* an empty name restores the old one and saves nothing */
    if (!v) { restore(); return; }
    if (v !== p.packageName) void model.setLook(p, { name: v });
  };
  return (
    <span ref={ref} key={p.packageName} className="p9-po-nm" contentEditable="plaintext-only" suppressContentEditableWarning spellCheck={false}
      role="textbox" aria-label="Package name" title="Click to rename" data-pk39="name"
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); ref.current?.blur(); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); restore(); ref.current?.blur(); }
      }}>{p.packageName}</span>
  );
};

/** E — the icon-and-colour picker: a popover under the header's icon tile. A pick saves at once. */
export const LookPicker: React.FC<{ model: Pk26Model; p: SubmissionPackage; anchor: HTMLElement; onClose: () => void }> = ({ model, p, anchor, onClose }) => {
  const box = useRef<HTMLDivElement | null>(null);
  useEscapeLayer(true, onClose, ESC_LEVEL.page);
  /* below the tile, 10 clear; v39.2: ABOVE it when there is no room below. It is portalled and fixed, so a picker that
     opened under the fold could not be scrolled to (the panel's padding put the tile on the fold at 1280 × 832). */
  const place = () => {
    const r = anchor.getBoundingClientRect(), h = box.current?.offsetHeight ?? 0;
    const below = r.bottom + 10, above = r.top - 10 - h;
    return { left: r.left, top: h && below + h > window.innerHeight - 8 && above >= 8 ? above : below };
  };
  const [pos, setPos] = useState(() => { const r = anchor.getBoundingClientRect(); return { left: r.left, top: r.bottom + 10 }; });
  /* once the box has a height, place it for real, before the first paint */
  useLayoutEffect(() => { setPos(place()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    /* focus moves in on open */
    box.current?.querySelector<HTMLButtonElement>("button[aria-pressed='true']")?.focus();
    const down = (e: PointerEvent) => { const t = e.target as Node; if (box.current?.contains(t) || anchor.contains(t)) return; onClose(); };
    const move = () => setPos(place());
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("scroll", move, true);
    window.addEventListener("resize", move);
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("scroll", move, true); window.removeEventListener("resize", move); };
  }, [anchor, onClose]);
  const ic = iconOf(p), col = colourOf(p);
  return createPortal(
    <div className="p9-icp" ref={box} role="dialog" aria-label="Icon and colour" data-pk39="picker" style={{ ...pcStyle(p), left: pos.left, top: pos.top }}>
      <p className="p9-icp-k">Icon</p>
      <div className="p9-icp-ics">
        {PACKAGE_ICONS.map((k: PackageIcon) => (
          <button type="button" key={k} aria-pressed={ic === k} aria-label={k} data-ic={k} onClick={() => void model.setLook(p, { icon: k })}><PicBare ic={k} /></button>
        ))}
      </div>
      <p className="p9-icp-k">Colour</p>
      <div className="p9-icp-cols">
        {PACKAGE_COLOURS.map((c) => (
          <button type="button" key={c.key} aria-pressed={col === c.key} title={c.name} aria-label={c.name} data-col={c.key} style={{ ["--sw" as string]: c.hex }} onClick={() => void model.setLook(p, { colour: c.key })} />
        ))}
      </div>
      <p className="p9-icp-f">{PICKER_NOTE}</p>
    </div>,
    document.body,
  );
};

/** "+ Add" and its popover (ref `.exa` / `#exPop`): a name field and suggestions, filtered as you type. */
export const AddExtra: React.FC<{ model: Pk26Model; p: SubmissionPackage }> = ({ model, p }) => {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const box = useRef<HTMLSpanElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const down = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);
  /* Escape closes the popover first, on the app's one escape stack (never a second capture listener) */
  useEscapeLayer(open, () => setOpen(false), ESC_LEVEL.page);
  const add = async (name: string) => { if (!name.trim()) return; setOpen(false); setV(""); await model.addExtra(p, name); };
  const sug = extraSuggestions(v, model.extras);
  return (
    <span className="p9-exa" ref={box}>
      <button type="button" className="p9-exa-b" aria-expanded={open} onClick={() => setOpen((o) => !o)}>+ Add</button>
      {open ? (
        <span className="p9-exa-pop" data-pk26="expop">
          <label className="p9-exa-in"><input ref={input} className="p9-id-exIn" value={v} placeholder="Name it: what did the agent ask for?" autoComplete="off"
            aria-label="Name the extra" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { e.preventDefault(); void add(v); } }} /></label>
          <span className="p9-exa-l">
            {offersNewExtra(v, model.extras) ? <button type="button" onClick={() => void add(v)}>+ Add “{v.trim()}”</button> : null}
            {sug.map((s) => <button type="button" key={s} onClick={() => void add(s)}>{s}</button>)}
          </span>
          <small className="p9-exa-f">Saved to your extras, so every package can use it.</small>
        </span>
      ) : null}
    </span>
  );
};
