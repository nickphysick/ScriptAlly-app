/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the builder. v39 Parts D, E and F (design-refs/submission-packages-v39/, screens 02–05): a
 * quiet "Build, view and edit" label over TWO SEPARATE CARDS with a 28px gap — Your materials (320, or 280 when the
 * sheet is 1200 or narrower; sticky) and the open package — no outer panel and no nested trays. Both headers are 84px
 * tall, so they line up: Your materials in deep berry, the package in its own colour. The package's header holds the
 * icon tile (it opens the icon-and-colour picker), the name (edited in place), the Active tag, one status pill (v39.1:
 * "Out with agents · n sent", "Ready to send" or "Draft · needs …"), "Make active" and Figures. Its contents are one aligned list: Version (v39.2: first), Query letter, Synopsis,
 * then Also sends, on a 130px label column (110 compact). Markup is the ref's `renderOpen` / `renderLib` with the `p9-`
 * prefix (pk39.generated.css); what the capture cannot see is in pk39.css.
 *
 * ⚠️ DRAGGING: only the matching row accepts a drop and is highlighted while dragging; the others dim (`.p9-dragging`
 *    on the open package, `.p9-ok` on the matching row, `.p9-over` while hovered). "Add" on each row of Your materials
 *    is the keyboard and touch route to the same write.
 * ⚠️ WITH NO PACKAGE AT ALL the open panel is a DRAFT — "My first package", nothing stored. The first piece dropped
 *    or added creates the package with that piece in it, so an empty package is never written by accident.
 * ⚠️ A PACKAGE THAT HAS GONE OUT OPENS LOCKED (v38 over v40's lock): its pieces read as they went — no drop target,
 *    no ✕, no extras to tick, no Add — and the padlock sits after "Out with agents" in the stage. `isLocked` is the one
 *    test. ITS NAME STAYS EDITABLE IN PLACE (Nick, 28 Oct, over the v39 mock): renaming is filing, not misreporting,
 *    which is v40's own reasoning and what the rules allow.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PACKAGE_ICONS, type PackageIcon, type SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { extraSuggestions, iconOf, materialSummary, offersNewExtra } from "../../../lib/packagesV26";
import { canMakeActive, canRetire, isLocked, packageStage, type PackageStage } from "../../../lib/packagesV40";
import { colourOf, PACKAGE_COLOURS, pcStyle } from "../../../lib/packagesV39";
import { Lock, Mark, Pic, PicBare } from "./icons";
import type { MaterialRow, PieceKind, Pk26Model, VersionRow } from "./usePk26Model";
import { Pk393Builder } from "./Pk393Builder";

export const DRAFT_ID = "__draft";
export type LibTab = "let" | "syn" | "ver";

const SLOT: Record<PieceKind, { t: string; req: boolean; empty: string }> = {
  let: { t: "Query letter", req: true, empty: "Query letter" },
  syn: { t: "Synopsis", req: false, empty: "Synopsis" },
  /* v39.2 C: the version leads (it decides which pages go out); display order only — the stored fields are unchanged */
  ver: { t: "Version", req: true, empty: "Version" },
};
const FIELD = { let: "queryLetterVersionId", syn: "synopsisVersionId", ver: "bookVersionId" } as const;
const vnum = (v: Pick<VersionRow, "original" | "num">) => (v.original ? "O" : String(v.num));
const STAGE_CLASS: Record<PackageStage, string> = { draft: "draft", ready: "ready", out: "out", retired: "ret" };
/** what a draft still needs, in the ref's words ("a query letter and pages") */
const needOf = (p: SubmissionPackage) => [!p.queryLetterVersionId && "a query letter", !p.bookVersionId && "pages"].filter(Boolean).join(" and ");

export const BUILDER_KICKER = "Build, view and edit";
export const EMPTY_SLOT_TIP = "Drag one in from Your materials";
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
  /** Your materials' list, held by the page so `?tab=let|syn|ver` can set it */
  lib: LibTab;
  onLib: (t: LibTab) => void;
  onNewPackage: () => void;
  onDuplicate: (p: SubmissionPackage) => void;
  onEditPackage: (p: SubmissionPackage, focus?: "note") => void;
  onOpenMaterial: (kind: "let" | "syn" | "ext", id: string) => void;
  onNewMaterial: (kind: LibTab) => void;
  onOpenVersions: () => void;
  onOpenComps: () => void;
}

export const Pk26Builder: React.FC<BuilderProps> = ({ model, retired, current, onSelect, onFigures, lib, onLib: setLib, onNewPackage, onDuplicate, onEditPackage, onOpenMaterial, onNewMaterial, onOpenVersions, onOpenComps }) => {
  const { msPkgs, active, letters, synopses, versionRows, activeMs } = model;
  const [dragK, setDragK] = useState<PieceKind | null>(null);
  const [over, setOver] = useState<PieceKind | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);

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

  /* ── drag and drop: the ref's handlers, as React events ── */
  const onDragStart = (kind: PieceKind, id: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `${kind}:${id}`);
    e.dataTransfer.effectAllowed = "copy";
    setDragK(kind); setGhost(`${kind}:${id}`);
  };
  const onDragEnd = () => { setDragK(null); setOver(null); setGhost(null); };
  const slotProps = (kind: PieceKind) => ({
    onDragOver: (e: React.DragEvent) => { if (dragK === kind) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (over !== kind) setOver(kind); } },
    onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) setOver((o) => (o === kind ? null : o)); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const [k, id] = e.dataTransfer.getData("text/plain").split(":");
      onDragEnd();
      if (k === kind && id) void put(kind, id);
    },
  });

  const libList: (MaterialRow | VersionRow)[] = lib === "let" ? letters : lib === "syn" ? synopses : versionRows;
  /* ⚠️ A PUT-AWAY MATERIAL STILL HAS A WAY BACK (v38): Your materials lists put-away ones last, on request, and opens
     their drawer. They cannot be dragged or added. */
  const [showAway, setShowAway] = useState(false);
  const away: MaterialRow[] = lib === "let" ? model.lettersAll.filter((m) => m.retired) : lib === "syn" ? model.synopsesAll.filter((m) => m.retired) : [];
  const inThis = (kind: PieceKind, id: string) => !!p && (p[FIELD[kind]] ?? "") === id;

  return (
    <>
      <section className="p9-pb-build" aria-label="Put a package together" data-pk26="builder" data-pk39="builder">
        <p className="p9-bk-k" data-pk39="kicker">{BUILDER_KICKER}</p>
        {/* v39.3: Steps + preview */}
        {p ? <Pk393Builder model={model} p={p} isActive={active?.id === p.id || p.id === DRAFT_ID} onFigures={onFigures} onEdit={onEditPackage} onDuplicate={onDuplicate}
          onPut={put} onOpenMaterial={onOpenMaterial} onNewMaterial={onNewMaterial} onOpenVersions={onOpenVersions} onOpenComps={onOpenComps} /> : null}
        <div className="p9-pb-grid p9-v39" data-pk39="grid">
          <aside className="p9-pb-lib" aria-labelledby="p9-libT" data-pk26="lib" data-pk39="lib">
            <div className="p9-lib-top" data-pk39="lib-head">
              {/* v39.2 C: a folder tab on the card's top edge — the envelope glyph and the name, no art */}
              <span className="p9-hx-t">
                <span className="p9-mh-tt"><span className="p9-mt-env" aria-hidden="true" /><h3 className="p9-id-libT" id="p9-libT">Your materials</h3></span>
              </span>
            </div>
            <div className="p9-lib-tabs" role="tablist">
              {([["ver", "Versions", versionRows.length], ["let", "Letters", letters.length], ["syn", "Synopses", synopses.length]] as const).map(([k, l, n]) => (
                <button type="button" key={k} role="tab" className={`p9-t-${k}`} aria-selected={lib === k} onClick={() => setLib(k)}><Mark k={k} />{l}<em>{n}</em></button>
              ))}
            </div>
            <div className="p9-lib-list" data-pk26="lib-list">
              {libList.length ? libList.map((m) => {
                const key = `${lib}:${m.id}`;
                const used = inThis(lib, m.id);
                const isVer = lib === "ver";
                /* v26.1: own summary (· sent n), else "sent n · in m packages", never the type */
                /* v39.2 C: the summary is the material's own words, wrapping to two lines; the meta line under it carries
                   whether it has been sent (the ref's "· {k} files" has no source: a material here carries no files) */
                const own = (isVer ? (m as VersionRow).summary : (m as MaterialRow).summary).trim();
                const canAdd = !!p && !locked;
                return (
                  <div key={m.id} className={`p9-lr${used ? " p9-inpk" : ""}${ghost === key ? " p9-ghost" : ""}`} draggable={canAdd} onDragStart={onDragStart(lib, m.id)} onDragEnd={onDragEnd} data-drag={key}>
                    <span className={`p9-tic p9-t-${lib}`}>{isVer ? vnum(m as VersionRow) : <Mark k={lib} />}</span>
                    <span className="p9-lr-tx"><b>{m.name}</b>{own ? <small>{own}</small> : null}
                      <em className="p9-lr-m">{used ? <i className="p9-lr-in">✓ In this package</i> : null}{m.sent ? `Sent ${m.sent}` : "Not sent yet"}</em></span>
                    {!isVer ? <button type="button" className="p9-lr-ed" aria-label={`Edit ${m.name}`} onClick={() => onOpenMaterial(lib as "let" | "syn", m.id)}><Mark k="pen" /></button> : null}
                    {/* in this package: no Add (the meta line says so); otherwise Add shows on hover or focus */}
                    {!used && canAdd ? <button type="button" className="p9-lr-add" onClick={() => void put(lib, m.id)}>Add</button> : null}
                  </div>
                );
              }) : <p className="p9-lib-empty">No {lib === "let" ? "query letters" : lib === "syn" ? "synopses" : "versions"} yet.</p>}
              {showAway ? away.map((m) => (
                <div key={m.id} className="p9-lr p9-lr--away" data-away={`${lib}:${m.id}`}>
                  <span className={`p9-tic p9-t-${lib}`}><Mark k={lib as "let" | "syn"} /></span>
                  <span><b title={m.name}>{m.name}</b><small>Put away{materialSummary("", m.sent, m.inPackages.length) ? ` · ${materialSummary("", m.sent, m.inPackages.length)}` : ""}</small></span>
                  <button type="button" className="p9-lr-add p9-lr-open" onClick={() => onOpenMaterial(lib as "let" | "syn", m.id)}>Open</button>
                </div>
              )) : null}
              {away.length ? <button type="button" className="p9-cx-lnk p9-lib-away" data-pk38="show-away" onClick={() => setShowAway((v) => !v)}>{showAway ? "Hide put away" : `Show put away (${away.length})`}</button> : null}
              <button type="button" className="p9-lib-new" onClick={() => onNewMaterial(lib)}>+ {lib === "let" ? "Write or paste a query letter" : lib === "syn" ? "Add a synopsis" : "Save a new version"}</button>
            </div>
            <p className="p9-lib-foot">
              {lib === "ver" ? <>Full version history and who has which version: <button type="button" className="p9-cx-lnk" onClick={onOpenVersions}>Versions page</button></>
                : lib === "let" ? <>Comps come from your <button type="button" className="p9-cx-lnk" onClick={onOpenComps}>comparable titles</button> library.</>
                  : "A synopsis only goes to agents who ask for one."}
            </p>
          </aside>
          <div className="p9-pb-left">
            {p ? <OpenPackage model={model} p={p} dragK={dragK} over={over} slotProps={slotProps} onEdit={onEditPackage} onFigures={onFigures} onDuplicate={onDuplicate}
              onOpenMaterial={onOpenMaterial} onOpenVersions={onOpenVersions} isActive={active?.id === p.id || p.id === DRAFT_ID} />
              : <StartCard retired={retired} onNewPackage={onNewPackage} onDuplicate={onDuplicate} />}
          </div>
        </div>
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

const OpenPackage: React.FC<{
  model: Pk26Model;
  p: SubmissionPackage;
  isActive: boolean;
  dragK: PieceKind | null;
  over: PieceKind | null;
  slotProps: (k: PieceKind) => React.HTMLAttributes<HTMLDivElement>;
  onEdit: (p: SubmissionPackage, focus?: "note") => void;
  onFigures: (p: SubmissionPackage) => void;
  onDuplicate: (p: SubmissionPackage) => void;
  onOpenMaterial: (kind: "let" | "syn" | "ext", id: string) => void;
  onOpenVersions: () => void;
}> = ({ model, p, isActive, dragK, over, slotProps, onEdit, onFigures, onDuplicate, onOpenMaterial, onOpenVersions }) => {
  const draft = p.id === DRAFT_ID;
  const locked = !draft && isLocked(p);
  const st = packageStage(p);
  const ticked = new Set(p.extraIds ?? []);
  const need = needOf(p);
  const from = p.copiedFromId ? model.msPkgs.find((x) => x.id === p.copiedFromId) ?? null : null;
  const tile = useRef<HTMLButtonElement | null>(null);
  const [picker, setPicker] = useState(false);
  const closePicker = useMemo(() => () => { setPicker(false); tile.current?.focus(); }, []);
  useEffect(() => { setPicker(false); }, [p.id]);

  const out = st === "out" || st === "retired";
  /* the status pill's words (ref `stg-need`): naming only what a draft is missing, joined with "and" */
  const sent = draft ? 0 : model.figPk(p).sent;
  const statusText = st === "retired" ? "Retired" : out ? (sent ? `Out with agents · ${sent} sent` : "Out with agents") : st === "ready" ? "Ready to send" : `Draft · needs ${need}`;

  const row = (k: PieceKind) => {
    const id = (p[FIELD[k]] ?? "") as string;
    const S = SLOT[k];
    let body: React.ReactNode;
    if (id) {
      if (k === "ver") {
        const v = model.versionRows.find((x) => x.id === id);
        body = (
          <div className="p9-mr-it">
            <i className="p9-tic p9-t-ver">{v ? vnum(v) : "?"}</i>
            <div className="p9-mr-tx"><b>{v?.name ?? "A version no longer on file"}</b>{v?.summary ? <small>{v.summary}</small> : null}</div>
            <div className="p9-mr-ac"><button type="button" className="p9-mr-b" onClick={onOpenVersions}>View</button>
              {draft || locked ? null : <button type="button" className="p9-mr-x" aria-label={`Take ${v?.name ?? "it"} out`} onClick={() => void model.removePiece(p, "ver")}>✕</button>}</div>
          </div>
        );
      } else {
        const m = (k === "let" ? model.letters : model.synopses).find((x) => x.id === id);
        const sum = m ? materialSummary(m.summary, m.sent, m.inPackages.length) : "";
        body = (
          <div className="p9-mr-it">
            <i className={`p9-tic p9-t-${k}`}><Mark k={k} /></i>
            <div className="p9-mr-tx"><b>{m?.name ?? "A letter no longer on file"}</b>{sum ? <small>{sum}</small> : null}</div>
            <div className="p9-mr-ac"><button type="button" className="p9-mr-b" onClick={() => m && onOpenMaterial(k, m.id)}>Edit</button>
              {locked ? null : <button type="button" className="p9-mr-x" aria-label={`Take ${m?.name ?? "it"} out`} onClick={() => void model.removePiece(p, k)}>✕</button>}</div>
          </div>
        );
      }
    } else {
      /* v39 D: an empty slot is a dashed box holding only its name; a locked one says what went instead */
      body = locked ? <div className="p9-mr-em p9-mr-em--lk">{k === "syn" ? "No synopsis went with it" : "Nothing recorded"}</div>
        : <div className="p9-mr-em" title={EMPTY_SLOT_TIP}>{S.empty}</div>;
    }
    const cls = `p9-slt p9-mr p9-t-${k}${dragK ? (dragK === k ? " p9-ok" : "") : ""}${over === k ? " p9-over" : ""}`;
    return (
      <div key={k} className={cls} data-slot={k} {...(locked ? {} : slotProps(k))}>
        <div className="p9-mr-l"><span>{S.t}</span>{k === "ver" ? <em className="p9-vsub">Sets the pages that go out</em> : S.req ? <em>Needed</em> : <em className="p9-o">Optional</em>}</div>
        {body}
      </div>
    );
  };

  return (
    <div className={`p9-pk-open${dragK && !locked ? " p9-dragging" : ""}${locked ? " p9-pk-locked" : ""}`} data-pk26="open" data-pk40="open" data-pkg={p.id}
      data-stage={STAGE_CLASS[st]} data-locked={locked ? "" : undefined}>
      <div className="p9-po-h" style={pcStyle(p)} data-pk39="pkg-head">
        <button ref={tile} type="button" className="p9-po-ic" aria-label="Change icon and colour" title="Change icon and colour" aria-expanded={picker} aria-haspopup="dialog"
          disabled={draft} data-pk39="tile" onClick={() => setPicker((v) => !v)}>
          <Pic ic={iconOf(p)} cls="p9-pic" /><span className="p9-po-icx" aria-hidden="true"><Mark k="pen" /></span>
        </button>
        <div className="p9-po-tt">
          <h3>{draft ? <span className="p9-po-nm p9-locked">{p.packageName}</span> : <NameInPlace model={model} p={p} />}{isActive && !draft ? <em className="p9-po-act">Active</em> : null}</h3>
          {p.note ? <small title={p.note}>{p.note}</small>
            : draft ? <small>{p.note}</small> : <small><button type="button" className="p9-po-addnote" onClick={() => onEdit(p, "note")}>Add a note: who is this for?</button></small>}
        </div>
        <span className="p9-sp" />
        <div className="p9-po-st">
          {/* v39.1 C: ONE readable status pill in place of v39's three-dot stage. Green dot when out or ready; the padlock
              (v39's ruling: the name stays renamable) follows "Out with agents". */}
          <span className={`p9-stp p9-stp--${out ? "out" : st}`} data-pk39="status">
            <i aria-hidden="true" />{statusText}
            {out ? <span className="p9-stg-lk" title={STAGE_LOCK_TIP} aria-label="Locked" data-pk39="stage-lock"><Lock /></span> : null}
          </span>
          {!draft && !isActive && canMakeActive(p, model.active?.id) ? <button type="button" className="p9-po-mk" onClick={() => void model.makeActive(p)}>Make active</button> : null}
          {draft ? null : <button type="button" className="p9-po-fig" title="Figures" aria-label="Figures" data-pk38="figures" onClick={() => onFigures(p)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5" /></svg></button>}
        </div>
        {picker && tile.current ? <LookPicker model={model} p={p} anchor={tile.current} onClose={closePicker} /> : null}
      </div>
      {from ? <div className="p9-lc-from">Copied from <b>{from.packageName}</b>. Change one piece, and Results can tell you what that piece did.</div> : null}
      <div className="p9-mf">
        {(["ver", "let", "syn"] as const).map(row)}
        <div className="p9-mr p9-mr-ex">
          <div className="p9-mr-l"><span>Also sends</span><em className="p9-o">If asked</em></div>
          <div className="p9-ex">
            {model.extras.map((e) => {
              const on = ticked.has(e.id);
              return (
                <span key={e.id} className={`p9-exc${on ? " p9-on" : ""}`}>
                  <button type="button" aria-pressed={on} disabled={draft || locked} onClick={() => void model.toggleExtra(p, e.id)}>{on ? "✓ " : ""}{e.name}</button>
                  <button type="button" className="p9-exc-ed" aria-label={`Edit ${e.name}`} onClick={() => onOpenMaterial("ext", e.id)}><Mark k="pen" /></button>
                </span>
              );
            })}
            {draft || locked ? null : <AddExtra model={model} p={p} />}
          </div>
        </div>
      </div>
      <p className={`p9-po-foot${locked ? " p9-po-foot--lk" : ""}`} data-pk38={locked ? "lock-line" : undefined} data-pk39="foot">
        <span>{locked ? "Out with agents, so what went stays as it went. Queries already sent keep exactly what went with them."
          : st === "draft" ? `Add ${need} to make it ready.` : "Change it as much as you like. It locks when you log a query with it."}</span>
        {draft ? null : (
          <span className="p9-po-lkb">
            {locked ? <button type="button" className="p9-po-del" data-pk38="lock-copy" onClick={() => onDuplicate(p)}>Make a copy</button> : null}
            {locked && canRetire(p, model.active?.id) ? <button type="button" className="p9-po-del" onClick={() => void model.retire(p)}>Retire</button> : null}
            <button type="button" className="p9-po-del" data-pk39="details" onClick={() => onEdit(p)}>Note, copy or delete…</button>
          </span>
        )}
      </p>
    </div>
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
