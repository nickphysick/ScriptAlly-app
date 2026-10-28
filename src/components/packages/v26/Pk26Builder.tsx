/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — the workbench (ref `.wbf`): the open package with its Draft → Ready → Out with agents
 * stepper, the quiet empty slots (E3), Your materials, and the package guidelines (E5). With no live package, the open
 * panel is the start card (E4). Markup is the ref's `renderOpen` / `renderLib` / `lockBand`, with the `p6-` prefix.
 * ⚠️ v38 (27 Oct): the workbench's own header ("Put a package together") and its package buttons are gone — "Your
 *    packages" (Pk38Labels) above the builder chooses what opens here, and it can open ANY live package, including
 *    one that has gone out. The open package's Harbour bar gains "Figures" (the package drawer).
 *
 * ⚠️ DRAGGING: only the matching row accepts a drop and is highlighted while dragging; the others dim
 *    (`.p6-dragging` on the open package, `.p6-ok` on the matching row, `.p6-over` while hovered). "Add" on each
 *    row of Your materials is the keyboard and touch route to the same write.
 * ⚠️ WITH NO PACKAGE AT ALL the open panel is a DRAFT — "My first package", nothing stored. The first piece dropped
 *    or added creates the package with that piece in it, so an empty package is never written by accident.
 * ⚠️ A PACKAGE THAT HAS GONE OUT OPENS HERE LOCKED (v38 over v40's lock; Nick, 27 Oct): its pieces read as they went —
 *    no drop target, no ✕, no extras to tick, no "Add" in Your materials — with a lock line and "Make a copy" in the
 *    foot. Name, note and icon stay editable, as the rules allow. `isLocked` is the one test.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { extraSuggestions, iconOf, materialSummary, offersNewExtra } from "../../../lib/packagesV26";
import { canRetire, deleteLabel, isLocked, packageStage, STAGE_LABEL, type PackageStage } from "../../../lib/packagesV40";
import { Lock, Mark, Pic } from "./icons";
import type { MaterialRow, PieceKind, Pk26Model, VersionRow } from "./usePk26Model";

export const DRAFT_ID = "__draft";
export type LibTab = "let" | "syn" | "ver";

const SLOT: Record<PieceKind, { t: string; req: boolean }> = {
  let: { t: "Query letter", req: true },
  syn: { t: "Synopsis", req: false },
  ver: { t: "Pages from", req: true },
};
/* E3 — the quiet empty slots: the ref's `mr-em` words, verbatim */
const EMPTY: Record<PieceKind, { t: string; s: string }> = {
  let: { t: "Drop a letter here", s: "or press Add next to one on the left" },
  syn: { t: "No synopsis", s: "That’s fine for agents who don’t ask for one" },
  ver: { t: "Drop your pages here", s: "or press Add next to one on the left" },
};
const FIELD = { let: "queryLetterVersionId", syn: "synopsisVersionId", ver: "bookVersionId" } as const;
const vnum = (v: Pick<VersionRow, "original" | "num">) => (v.original ? "O" : String(v.num));
const STAGE_CLASS: Record<PackageStage, string> = { draft: "draft", ready: "ready", out: "out", retired: "ret" };
/** what a draft still needs, in the ref's words ("a query letter and pages") */
const needOf = (p: SubmissionPackage) => [!p.queryLetterVersionId && "a query letter", !p.bookVersionId && "pages"].filter(Boolean).join(" and ");

/* E5 — the package guidelines, verbatim */
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
  /** v38 — the Harbour bar's "Figures": the package drawer for the open package */
  onFigures: (p: SubmissionPackage) => void;
  /** Your materials' list, held by the page so `?tab=let|syn|ver` can set it (v38: the tab pages are gone) */
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

  /* the draft first package — only when the writer has no package at all; with packages on the shelf and none on the
     bench, the open panel is the start card instead (E4) */
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
  /* ⚠️ A PUT-AWAY MATERIAL STILL HAS A WAY BACK (v38): the Query letters and Synopses tables were the route to
     "Bring it back", and they are gone, so Your materials lists put-away ones last, on request, and opens their
     drawer. They cannot be dragged or added. */
  const [showAway, setShowAway] = useState(false);
  const away: MaterialRow[] = lib === "let" ? model.lettersAll.filter((m) => m.retired) : lib === "syn" ? model.synopsesAll.filter((m) => m.retired) : [];
  const inThis = (kind: PieceKind, id: string) => !!p && (p[FIELD[kind]] ?? "") === id;
  void onSelect;

  return (
    <div className="p6-wbf" data-pk40="wbf">
      <section className="p6-pb-build" aria-label="The open package" data-pk26="builder">
        <div className="p6-pb-grid">
          <div className="p6-pb-left">
            {p ? <OpenPackage model={model} p={p} dragK={dragK} over={over} slotProps={slotProps} onEdit={onEditPackage} onFigures={onFigures} onDuplicate={onDuplicate}
              onOpenMaterial={onOpenMaterial} onOpenVersions={onOpenVersions} isActive={active?.id === p.id || p.id === DRAFT_ID} />
              : <StartCard retired={retired} onNewPackage={onNewPackage} onDuplicate={onDuplicate} />}
          </div>
          <div className="p6-pb-libcol">
            <p className="p6-dd-step p6-wb-l1"><i>1</i>Your materials<em>Drag one across →</em></p>
            <aside className="p6-pb-lib" aria-label="Your materials" data-pk26="lib">
              <div className="p6-lib-tabs" role="tablist">
                {([["let", "Letters", letters.length], ["syn", "Synopses", synopses.length], ["ver", "Versions", versionRows.length]] as const).map(([k, l, n]) => (
                  <button type="button" key={k} role="tab" className={`p6-t-${k}`} aria-selected={lib === k} onClick={() => setLib(k)}><Mark k={k} />{l}<em>{n}</em></button>
                ))}
              </div>
              <div className="p6-lib-list" data-pk26="lib-list">
                {libList.length ? libList.map((m) => {
                  const key = `${lib}:${m.id}`;
                  const used = inThis(lib, m.id);
                  const isVer = lib === "ver";
                  /* v26.1: own summary (· sent n), else "sent n · in m packages", never the type */
                  const own = isVer ? (m as VersionRow).summary : (m as MaterialRow).summary;
                  const sum = own ? `${own}${m.sent ? ` · sent ${m.sent}` : ""}` : materialSummary("", m.sent, m.inPackages.length);
                  return (
                    <div key={m.id} className={`p6-lr${ghost === key ? " p6-ghost" : ""}`} draggable={!!p && !locked} onDragStart={onDragStart(lib, m.id)} onDragEnd={onDragEnd} data-drag={key}>
                      <span className="p6-lr-g" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                      <span className={`p6-tic p6-t-${lib}`}>{isVer ? vnum(m as VersionRow) : <Mark k={lib} />}</span>
                      <span className="p6-lr-tx"><b><span className="p6-nm" title={m.name}>{m.name}</span>{m.inUse ? <em>In use</em> : null}</b>{sum ? <small>{sum}</small> : null}</span>
                      {!isVer ? <button type="button" className="p6-lr-ed" aria-label={`Edit ${m.name}`} onClick={() => onOpenMaterial(lib as "let" | "syn", m.id)}><Mark k="pen" /></button> : null}
                      <button type="button" className="p6-lr-add" disabled={used || !p || locked} title={locked && !used ? "This package has gone out, so its pieces are locked" : undefined} onClick={() => void put(lib, m.id)}>{used ? "In package" : "Add"}</button>
                    </div>
                  );
                }) : <p className="p6-lib-empty">No {lib === "let" ? "query letters" : lib === "syn" ? "synopses" : "versions"} yet.</p>}
                {showAway ? away.map((m) => (
                  <div key={m.id} className="p6-lr p6-lr--away" data-away={`${lib}:${m.id}`}>
                    <span className="p6-lr-g" aria-hidden="true" />
                    <span className={`p6-tic p6-t-${lib}`}><Mark k={lib as "let" | "syn"} /></span>
                    <span className="p6-lr-tx"><b><span className="p6-nm" title={m.name}>{m.name}</span><em>Put away</em></b>{materialSummary("", m.sent, m.inPackages.length) ? <small>{materialSummary("", m.sent, m.inPackages.length)}</small> : null}</span>
                    <button type="button" className="p6-lr-add" onClick={() => onOpenMaterial(lib as "let" | "syn", m.id)}>Open</button>
                  </div>
                )) : null}
                {away.length ? <button type="button" className="p6-cx-lnk p6-lib-away" data-pk38="show-away" onClick={() => setShowAway((v) => !v)}>{showAway ? "Hide put away" : `Show put away (${away.length})`}</button> : null}
                <button type="button" className="p6-lib-new" onClick={() => onNewMaterial(lib)}>+ {lib === "let" ? "Write or paste a query letter" : lib === "syn" ? "Add a synopsis" : "Save a new version"}</button>
              </div>
              <p className="p6-lib-foot">
                {lib === "ver" ? <>Full version history and who has which version: <button type="button" className="p6-cx-lnk" onClick={onOpenVersions}>Versions page</button></>
                  : lib === "let" ? <>Comps come from your <button type="button" className="p6-cx-lnk" onClick={onOpenComps}>comparable titles</button> library.</>
                    : "A synopsis only goes to agents who ask for one."}
              </p>
            </aside>
          </div>
        </div>
      </section>
      <details className="p6-pkgl" data-pk40="guidelines">
        <summary><span className="p6-pkgl-ic">i</span>Package guidelines</summary>
        <ul>{GUIDELINES.map(([b, t]) => <li key={b}><b>{b}</b>{t}</li>)}</ul>
      </details>
    </div>
  );
};

/** E4 — the start card: no live package left (everything retired), so start from scratch or copy one (up to three). */
const StartCard: React.FC<{ retired: SubmissionPackage[]; onNewPackage: () => void; onDuplicate: (p: SubmissionPackage) => void }> = ({ retired, onNewPackage, onDuplicate }) => (
  <div className="p6-pk-open" data-pk40="start">
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
);

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
  const n = st === "draft" ? 1 : st === "ready" ? 2 : 3;

  const step = (i: number, t: string, sub: string) => (
    <div className={`p6-lc-s${i < n ? " p6-dn" : i === n ? " p6-on" : ""}`}><i>{i < n ? "✓" : i === 3 && n === 3 ? <Lock /> : i}</i><span><b>{t}</b><small>{sub}</small></span></div>
  );

  const row = (k: PieceKind) => {
    const id = (p[FIELD[k]] ?? "") as string;
    const S = SLOT[k];
    let body: React.ReactNode;
    if (id) {
      if (k === "ver") {
        const v = model.versionRows.find((x) => x.id === id);
        body = (
          <div className="p6-mr-it">
            <i className="p6-tic p6-t-ver">{v ? vnum(v) : "?"}</i>
            <div className="p6-mr-tx"><b>{v?.name ?? "A version no longer on file"}</b><small>{v?.summary || " "}</small></div>
            <div className="p6-mr-ac"><button type="button" className="p6-mr-b" onClick={onOpenVersions}>View</button>
              {draft || locked ? null : <button type="button" className="p6-mr-x" aria-label={`Take ${v?.name ?? "it"} out`} onClick={() => void model.removePiece(p, "ver")}>✕</button>}</div>
          </div>
        );
      } else {
        const m = (k === "let" ? model.letters : model.synopses).find((x) => x.id === id);
        const sum = m ? materialSummary(m.summary, m.sent, m.inPackages.length) : "";
        body = (
          <div className="p6-mr-it">
            <i className={`p6-tic p6-t-${k}`}><Mark k={k} /></i>
            <div className="p6-mr-tx"><b>{m?.name ?? "A letter no longer on file"}</b><small>{sum}</small></div>
            <div className="p6-mr-ac"><button type="button" className="p6-mr-b" onClick={() => m && onOpenMaterial(k, m.id)}>Edit</button>
              {locked ? null : <button type="button" className="p6-mr-x" aria-label={`Take ${m?.name ?? "it"} out`} onClick={() => void model.removePiece(p, k)}>✕</button>}</div>
          </div>
        );
      }
    } else {
      body = locked ? <div className="p6-mr-em p6-mr-em--lk"><span className="p6-em-t">{k === "syn" ? "No synopsis went with it" : "Nothing recorded"}</span></div> : <div className="p6-mr-em"><span className="p6-em-ic">{k === "ver" ? <b>1</b> : <Mark k={k} />}</span><span className="p6-em-t">{EMPTY[k].t}</span><span className="p6-em-s">{EMPTY[k].s}</span></div>;
    }
    const cls = `p6-slt p6-mr p6-t-${k}${dragK ? (dragK === k ? " p6-ok" : "") : ""}${over === k ? " p6-over" : ""}`;
    return (
      <div key={k} className={cls} data-slot={k} {...(locked ? {} : slotProps(k))}>
        <div className="p6-mr-l"><span>{S.t}</span>{S.req ? <em>Needed</em> : <em className="p6-o">Optional</em>}</div>
        {body}
      </div>
    );
  };

  return (
    <div className={`p6-pk-open${dragK && !locked ? " p6-dragging" : ""}${locked ? " p6-pk-locked" : ""}`} data-pk26="open" data-pk40="open" data-pkg={p.id} data-stage={STAGE_CLASS[st]} data-locked={locked ? "" : undefined}>
      <div className="p6-po-h">
        <button type="button" className="p6-po-ic" aria-label="Change icon" onClick={() => !draft && onEdit(p)}><Pic ic={iconOf(p)} /></button>
        <div className="p6-po-tt">
          <h3><span className="p6-po-nm" title={p.packageName}>{p.packageName}</span><button type="button" className="p6-po-ed" aria-label={`Rename or edit ${p.packageName}`} onClick={() => !draft && onEdit(p)}><Mark k="pen" /></button></h3>
          {/* v26.1: a real note is one line, cut short (full text in the title); none → a quiet "+ Add a note" that opens
              Package details with the note focused. The draft keeps its own placeholder line. */}
          {p.note
            ? <small className="p6-po-note" title={p.note}>{p.note}</small>
            : draft ? null : <button type="button" className="p6-po-addnote" onClick={() => onEdit(p, "note")}>+ Add a note</button>}
        </div>
        <span className="p6-sp" />
        <div className="p6-po-st">
          {draft ? null : <button type="button" className="p8-po-fig" data-pk38="figures" onClick={() => onFigures(p)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5" /></svg>Figures</button>}
          <span className={`p6-lc-chip p6-${STAGE_CLASS[st]}`}>{STAGE_LABEL[st]}</span>
          {isActive && st !== "draft" ? <span className="p6-pill p6-act">Active</span>
            : st === "ready" ? <button type="button" className="p6-po-mk" onClick={() => void model.makeActive(p)}>Make active</button> : null}
        </div>
      </div>
      <div className="p6-lc">
        {step(1, "Draft", n === 1 ? `Add ${need}` : "Letter and pages in")}
        <em className={n > 1 ? "p6-dn" : ""} />
        {step(2, "Ready", n === 2 ? "Pick it when you log a query" : n > 2 ? "Was ready to send" : "Needs a letter and pages")}
        <em className={n > 2 ? "p6-dn" : ""} />
        {step(3, "Out with agents", "Locks with its first query")}
      </div>
      {from ? <div className="p6-lc-from">Copied from <b>{from.packageName}</b>. Change one piece, and Results can tell you what that piece did.</div> : null}
      <div className="p6-mf">
        {(["let", "syn", "ver"] as const).map(row)}
        <div className="p6-mr p6-mr-ex">
          <div className="p6-mr-l"><span>Also sends</span><em className="p6-o">If asked</em></div>
          <div className="p6-ex">
            {model.extras.map((e) => {
              const on = ticked.has(e.id);
              return (
                <span key={e.id} className={`p6-exc${on ? " p6-on" : ""}`}>
                  <button type="button" aria-pressed={on} disabled={draft || locked} onClick={() => void model.toggleExtra(p, e.id)}>{on ? "✓ " : ""}{e.name}</button>
                  <button type="button" className="p6-exc-ed" aria-label={`Edit ${e.name}`} onClick={() => onOpenMaterial("ext", e.id)}><Mark k="pen" /></button>
                </span>
              );
            })}
            {draft || locked ? null : <AddExtra model={model} p={p} />}
          </div>
        </div>
      </div>
      {locked ? (
        <p className="p6-po-foot p6-po-foot--lk" data-pk38="lock-line">
          <span><Lock /> Out with agents, so what went stays as it went. To change a piece, make a copy.</span>
          <span className="p6-po-lkb">
            <button type="button" className="p6-po-del" data-pk38="lock-copy" onClick={() => onDuplicate(p)}>Make a copy</button>
            {canRetire(p, model.active?.id) ? <button type="button" className="p6-po-del" onClick={() => void model.retire(p)}>Retire</button> : null}
          </span>
        </p>
      ) : (
        <p className="p6-po-foot">
          <span>{st === "draft" ? `Add ${need} to make it ready.` : "Change it as much as you like. It locks when you log a query with it."}</span>
          {draft ? null : <button type="button" className="p6-po-del" onClick={() => void model.deletePkg(p)}>{deleteLabel(p)}</button>}
        </p>
      )}
    </div>
  );
};

/** "+ Add" and its popover (ref `.exa` / `#exPop`): a name field and suggestions, filtered as you type. */
const AddExtra: React.FC<{ model: Pk26Model; p: SubmissionPackage }> = ({ model, p }) => {
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
    <span className="p6-exa" ref={box}>
      <button type="button" className="p6-exa-b" aria-expanded={open} onClick={() => setOpen((o) => !o)}>+ Add</button>
      {open ? (
        <span className="p6-exa-pop" data-pk26="expop">
          <label className="p6-exa-in"><input ref={input} className="p6-id-exIn" value={v} placeholder="Name it: what did the agent ask for?" autoComplete="off"
            aria-label="Name the extra" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { e.preventDefault(); void add(v); } }} /></label>
          <span className="p6-exa-l">
            {offersNewExtra(v, model.extras) ? <button type="button" onClick={() => void add(v)}>+ Add “{v.trim()}”</button> : null}
            {sug.map((s) => <button type="button" key={s} onClick={() => void add(s)}>{s}</button>)}
          </span>
          <small className="p6-exa-f">Saved to your extras, so every package can use it.</small>
        </span>
      ) : null}
    </span>
  );
};
