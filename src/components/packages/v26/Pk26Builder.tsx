/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the builder (ref `.pb-build`): the package buttons, the open package (its Harbour
 * header bar and packing list), the named extras with their "+ Add" popover, and Your materials. Markup is the
 * ref's `renderTabs` / `renderOpen` / `renderLib`, with the `p6-` prefix.
 *
 * ⚠️ DRAGGING: only the matching row accepts a drop and is highlighted while dragging; the others dim
 *    (`.p6-dragging` on the open package, `.p6-ok` on the matching row, `.p6-over` while hovered). "Add" on each
 *    row of Your materials is the keyboard and touch route to the same write.
 * ⚠️ WITH NO PACKAGE YET the open panel is a DRAFT — "My first package", nothing stored. The first piece dropped
 *    or added creates the package with that piece in it, so an empty package is never written by accident.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { extraSuggestions, headerFigures, iconOf, offersNewExtra, packageFoot, readiness, readinessLabel } from "../../../lib/packagesV26";
import { Mark, Pic } from "./icons";
import type { MaterialRow, PieceKind, Pk26Model, VersionRow } from "./usePk26Model";

export const DRAFT_ID = "__draft";
export type LibTab = "let" | "syn" | "ver";

const SLOT: Record<PieceKind, { t: string; req: boolean; empty: string }> = {
  let: { t: "Query letter", req: true, empty: "Empty." },
  syn: { t: "Synopsis", req: false, empty: "None: fine for agents who don’t ask for one." },
  ver: { t: "Pages from", req: true, empty: "Empty." },
};
const FIELD = { let: "queryLetterVersionId", syn: "synopsisVersionId", ver: "bookVersionId" } as const;
const vnum = (v: Pick<VersionRow, "original" | "num">) => (v.original ? "O" : String(v.num));

export interface BuilderProps {
  model: Pk26Model;
  current: SubmissionPackage | null;
  onSelect: (id: string) => void;
  onNewPackage: () => void;
  onEditPackage: (p: SubmissionPackage) => void;
  onOpenMaterial: (kind: "let" | "syn" | "ext", id: string) => void;
  onNewMaterial: (kind: LibTab) => void;
  onOpenVersions: () => void;
  onOpenComps: () => void;
}

export const Pk26Builder: React.FC<BuilderProps> = ({ model, current, onSelect, onNewPackage, onEditPackage, onOpenMaterial, onNewMaterial, onOpenVersions, onOpenComps }) => {
  const { live, active, letters, synopses, versionRows, extras, activeMs } = model;
  const [lib, setLib] = useState<LibTab>("let");
  const [dragK, setDragK] = useState<PieceKind | null>(null);
  const [over, setOver] = useState<PieceKind | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);

  /* the draft first package, until something is put in it */
  const draft: SubmissionPackage | null = useMemo(() => (current || !activeMs ? null : {
    id: DRAFT_ID, manuscriptId: activeMs.id, userId: "", packageName: "My first package",
    note: "Name it whatever helps you — “Standard”, “UK agents”", queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "",
    ...(activeMs.inUseBookVersionId ? { bookVersionId: activeMs.inUseBookVersionId } : {}), status: "Active", createdDate: "",
  }), [current, activeMs]);
  const p = current ?? draft;

  const put = async (kind: PieceKind, id: string) => {
    if (!p) return;
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
  const inThis = (kind: PieceKind, id: string) => !!p && (p[FIELD[kind]] ?? "") === id;

  return (
    <section className="p6-pb-build" aria-label="Your packages" data-pk26="builder">
      <div className="p6-pb-grid">
        <div className="p6-pb-left">
          <div className="p6-pkbs" role="group" aria-label="Your packages">
            {(live.length ? live : draft ? [draft] : []).map((x) => {
              const on = x.id === p?.id;
              return (
                <button type="button" key={x.id} className={`p6-pkb${on ? " p6-on" : ""}`} aria-pressed={on} title={x.packageName}
                  onClick={() => x.id !== DRAFT_ID && onSelect(x.id)}>
                  <span className="p6-pkb-ic"><Pic ic={iconOf(x)} /></span><b>{x.packageName}</b>{active?.id === x.id || x.id === DRAFT_ID ? <em>Active</em> : null}
                </button>
              );
            })}
            <button type="button" className="p6-pkb p6-new" onClick={onNewPackage}>+ New package</button>
          </div>
          {p ? <OpenPackage model={model} p={p} dragK={dragK} over={over} slotProps={slotProps} onEdit={onEditPackage}
            onOpenMaterial={onOpenMaterial} onOpenVersions={onOpenVersions} isActive={active?.id === p.id || p.id === DRAFT_ID} /> : null}
        </div>
        <aside className="p6-pb-lib" aria-labelledby="p6-libT" data-pk26="lib">
          <div className="p6-lib-top"><h3 className="p6-id-libT" id="p6-libT">Your materials</h3><span className="p6-lib-hint">Drag into the package</span></div>
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
              const sum = isVer ? (m as VersionRow).summary : (m as MaterialRow).summary || (lib === "let" ? "Query letter" : (m as MaterialRow).words ? `${(m as MaterialRow).words!.toLocaleString("en-GB")} words` : "Synopsis");
              return (
                <div key={m.id} className={`p6-lr${ghost === key ? " p6-ghost" : ""}`} draggable onDragStart={onDragStart(lib, m.id)} onDragEnd={onDragEnd} data-drag={key}>
                  <span className="p6-lr-g" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                  <span className={`p6-tic p6-t-${lib}`}>{isVer ? vnum(m as VersionRow) : <Mark k={lib} />}</span>
                  <span><b>{m.name}{m.inUse ? <em>In use</em> : null}</b><small>{sum}{m.sent ? ` · sent ${m.sent}` : ""}</small></span>
                  {!isVer ? <button type="button" className="p6-lr-ed" aria-label={`Edit ${m.name}`} onClick={() => onOpenMaterial(lib as "let" | "syn", m.id)}><Mark k="pen" /></button> : null}
                  <button type="button" className="p6-lr-add" disabled={used} onClick={() => void put(lib, m.id)}>{used ? "In package" : "Add"}</button>
                </div>
              );
            }) : <p className="p6-lib-empty">No {lib === "let" ? "query letters" : lib === "syn" ? "synopses" : "versions"} yet.</p>}
            <button type="button" className="p6-lib-new" onClick={() => onNewMaterial(lib)}>+ {lib === "let" ? "Write or paste a query letter" : lib === "syn" ? "Add a synopsis" : "Save a new version"}</button>
          </div>
          <p className="p6-lib-foot">
            {lib === "ver" ? <>Full version history and who has which version: <button type="button" className="p6-cx-lnk" onClick={onOpenVersions}>Versions page</button></>
              : lib === "let" ? <>Comps come from your <button type="button" className="p6-cx-lnk" onClick={onOpenComps}>comparable titles</button> library.</>
                : "A synopsis only goes to agents who ask for one."}
          </p>
        </aside>
      </div>
      {extras && null}
    </section>
  );
};

const OpenPackage: React.FC<{
  model: Pk26Model;
  p: SubmissionPackage;
  isActive: boolean;
  dragK: PieceKind | null;
  over: PieceKind | null;
  slotProps: (k: PieceKind) => React.HTMLAttributes<HTMLDivElement>;
  onEdit: (p: SubmissionPackage) => void;
  onOpenMaterial: (kind: "let" | "syn" | "ext", id: string) => void;
  onOpenVersions: () => void;
}> = ({ model, p, isActive, dragK, over, slotProps, onEdit, onOpenMaterial, onOpenVersions }) => {
  const draft = p.id === DRAFT_ID;
  const ready = readiness(p);
  const sent = !draft && model.goneOut(p);
  const figs = draft ? null : headerFigures(model.currentSplit(p));
  const split = draft ? { asIs: 0, changed: 0 } : model.splitOf(p);
  const ticked = new Set(p.extraIds ?? []);

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
              {draft ? null : <button type="button" className="p6-mr-x" aria-label={`Take ${v?.name ?? "it"} out`} onClick={() => void model.removePiece(p, "ver")}>✕</button>}</div>
          </div>
        );
      } else {
        const m = (k === "let" ? model.letters : model.synopses).find((x) => x.id === id);
        const sum = m ? (m.summary || (k === "syn" && m.words ? `${m.words.toLocaleString("en-GB")} words` : k === "let" ? "Query letter" : "Synopsis")) : "";
        body = (
          <div className="p6-mr-it">
            <i className={`p6-tic p6-t-${k}`}><Mark k={k} /></i>
            <div className="p6-mr-tx"><b>{m?.name ?? "A letter no longer on file"}</b><small>{sum}</small></div>
            <div className="p6-mr-ac"><button type="button" className="p6-mr-b" onClick={() => m && onOpenMaterial(k, m.id)}>Edit</button>
              <button type="button" className="p6-mr-x" aria-label={`Take ${m?.name ?? "it"} out`} onClick={() => void model.removePiece(p, k)}>✕</button></div>
          </div>
        );
      }
    } else {
      body = <div className="p6-mr-em">{S.empty} Drag one in from <b>Your materials</b>, or press Add there.</div>;
    }
    const cls = `p6-slt p6-mr p6-t-${k}${dragK ? (dragK === k ? " p6-ok" : "") : ""}${over === k ? " p6-over" : ""}`;
    return (
      <div key={k} className={cls} data-slot={k} {...slotProps(k)}>
        <div className="p6-mr-l"><span>{S.t}</span>{S.req ? <em>Needed</em> : <em className="p6-o">Optional</em>}</div>
        {body}
      </div>
    );
  };

  return (
    <div className={`p6-pk-open${dragK ? " p6-dragging" : ""}`} data-pk26="open" data-pkg={p.id}>
      <div className="p6-po-h">
        <button type="button" className="p6-po-ic" aria-label="Change icon" onClick={() => !draft && onEdit(p)}><Pic ic={iconOf(p)} /></button>
        <div className="p6-po-tt">
          <h3>{p.packageName}<button type="button" className="p6-po-ed" aria-label={`Rename or edit ${p.packageName}`} onClick={() => !draft && onEdit(p)}><Mark k="pen" /></button></h3>
          <small>{p.note || "Add a note: who is this for?"}</small>
        </div>
        <span className="p6-sp" />
        <div className="p6-po-st">
          {ready === "ready" ? <span className="p6-pill p6-ok">Ready</span> : <span className="p6-pill p6-no">{readinessLabel(ready)}</span>}
          <span className="p6-po-n">{figs ? <>{figs.sent} sent · <b>{figs.more}</b> asked for more</> : "Not sent yet"}</span>
          {isActive ? <span className="p6-pill p6-act">Active</span> : <button type="button" className="p6-po-mk" onClick={() => void model.makeActive(p)}>Make active</button>}
        </div>
      </div>
      <div className="p6-mf">
        {(["let", "syn", "ver"] as const).map(row)}
        <div className="p6-mr p6-mr-ex">
          <div className="p6-mr-l"><span>Also sends</span><em className="p6-o">If asked</em></div>
          <div className="p6-ex">
            {model.extras.map((e) => {
              const on = ticked.has(e.id);
              return (
                <span key={e.id} className={`p6-exc${on ? " p6-on" : ""}`}>
                  <button type="button" aria-pressed={on} disabled={draft} onClick={() => void model.toggleExtra(p, e.id)}>{on ? "✓ " : ""}{e.name}</button>
                  <button type="button" className="p6-exc-ed" aria-label={`Edit ${e.name}`} onClick={() => onOpenMaterial("ext", e.id)}><Mark k="pen" /></button>
                </span>
              );
            })}
            {draft ? null : <AddExtra model={model} p={p} />}
          </div>
        </div>
      </div>
      <p className="p6-po-foot">{packageFoot(p, sent, split)}</p>
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
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key, true); };
  }, [open]);
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
