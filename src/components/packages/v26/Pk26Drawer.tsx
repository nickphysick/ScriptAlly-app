/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the material drawer (ref `.cx-drw`, `paintLD` / `fixNew` / `verAsk`), portalled to
 * the body inside `.p6-layer`. One slide-out with a 7px white rim and a fine inner border; the pink header, the
 * cream body and the white footer all stop at that border.
 *
 * Views: a letter or synopsis (edit or new), an extra, "A fix, or a new letter?", a new version of the book, and
 * "Use it in your packages too?".
 *
 * ⚠️ FIX OR NEW: saving a change to the TEXT or the COMPS of a letter or synopsis that has gone out asks first. A
 *    fix keeps it in place for the queries it went with; a new one is saved as "{name} (2)". A change only to the
 *    name or the summary is always a fix, and asks nothing.
 * ⚠️ ATTACHED FILES ARE VISIBLE AND DISABLED. Firebase Storage is not set up on dev, so Phase 5 is stopped: the
 *    drop zone says it is coming rather than taking a file it cannot keep.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf, namedAgents } from "../../../lib/packagesV26";
import { Mark, Pic } from "./icons";
import type { MaterialRow, Pk26Model } from "./usePk26Model";

export type DrawerView =
  | { m: "mat"; kind: "let" | "syn"; id: string }
  | { m: "newmat"; kind: "let" | "syn" }
  | { m: "ext"; id: string }
  | { m: "newver"; parentId: string | null }
  | { m: "verask"; versionId: string; parentId: string | null };

const NM = { let: "Query letter", syn: "Synopsis", ext: "Extra" } as const;

export const Pk26Drawer: React.FC<{ model: Pk26Model; view: DrawerView | null; go: (v: DrawerView | null) => void; onSeeQueries: (ids: string[]) => void; onOpenComps: () => void }> = ({ model, view, go, onSeeQueries, onOpenComps }) => {
  const open = !!view;
  const [shown, setShown] = useState(false);
  /* the ref slides the drawer in by adding `.on` after it is mounted */
  useEffect(() => { if (!open) { setShown(false); return; } const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, [open]);
  useEscapeLayer(open, () => go(null), ESC_LEVEL.pageDrawer);
  if (!view) return null;
  return createPortal(
    <div className="p6-layer" data-pk26="drawer-layer">
      <div className={`p6-cx-dim${shown ? " p6-on" : ""}`} onClick={() => go(null)} />
      <aside className={`p6-cx-drw${shown ? " p6-on" : ""}`} role="dialog" aria-modal="true" aria-label="Material" data-pk26="drawer">
        {view.m === "mat" || view.m === "newmat" ? <MaterialForm key={view.m === "mat" ? view.id : `new-${view.kind}`} model={model} view={view} go={go} onSeeQueries={onSeeQueries} onOpenComps={onOpenComps} />
          : view.m === "ext" ? <ExtraForm key={view.id} model={model} id={view.id} go={go} onSeeQueries={onSeeQueries} />
            : view.m === "newver" ? <VersionForm model={model} parentId={view.parentId} go={go} />
              : <VersionAsk model={model} versionId={view.versionId} parentId={view.parentId} go={go} />}
      </aside>
    </div>,
    document.body,
  );
};

const Head: React.FC<{ k?: "let" | "syn" | "ext"; title: string; sub: string; onClose: () => void }> = ({ k, title, sub, onClose }) => (
  <div className={`p6-dh${k ? ` p6-t-${k}` : ""}`}>
    <span className="p6-ddisc"><Mark k={k ?? "ver"} /></span>
    <div className="p6-tx"><h3>{title}</h3><small>{sub}</small></div>
    <button type="button" className="p6-cx-x" aria-label="Close" onClick={onClose}>✕</button>
  </div>
);

/** The disabled attachments section (Phase 5 is stopped: no Storage on dev). */
const Attachments: React.FC = () => (
  <>
    <h5>Attached files <span className="p6-h5n">coming soon</span></h5>
    <div className="p6-att" data-pk26="att">
      <label className="p6-att-drop" aria-disabled="true" style={{ cursor: "not-allowed", opacity: 0.6 }}>
        <input type="file" hidden disabled />
        <Mark k="clip" />
        <span><b>Attaching files is coming soon</b><small>Word or PDF, up to 10 MB. Handy when an agent’s form asks for an upload.</small></span>
      </label>
    </div>
  </>
);

const InPackages: React.FC<{ model: Pk26Model; ids: string[] }> = ({ model, ids }) => {
  const pks = model.live.filter((p) => ids.includes(p.id));
  return (
    <div className="p6-cpk">
      {pks.length ? pks.map((p) => <span key={p.id} className="p6-pkg"><Pic ic={iconOf(p)} />{p.packageName}</span>) : <i className="p6-o">Not in a package yet</i>}
    </div>
  );
};

const WentTo: React.FC<{ names: string[]; ids: string[]; onSee: (ids: string[]) => void }> = ({ names, ids, onSee }) => (
  <p className="p6-cp-n">
    {ids.length ? <>{ids.length} agent{ids.length === 1 ? "" : "s"}{names.length ? <>, including {namedAgents(names.slice(0, 3))}</> : null}. <button type="button" className="p6-cx-lnk" onClick={() => onSee(ids)}>See them in the Query Centre</button></> : "No one yet."}
  </p>
);

const MaterialForm: React.FC<{ model: Pk26Model; view: Extract<DrawerView, { m: "mat" | "newmat" }>; go: (v: DrawerView | null) => void; onSeeQueries: (ids: string[]) => void; onOpenComps: () => void }> = ({ model, view, go, onSeeQueries, onOpenComps }) => {
  const kind = view.kind;
  const L = kind === "let";
  const m: MaterialRow | null = view.m === "mat" ? (L ? model.lettersAll : model.synopsesAll).find((x) => x.id === view.id) ?? null : null;
  const [name, setName] = useState(m?.name ?? "");
  const [sum, setSum] = useState(m?.summary ?? "");
  const [text, setText] = useState(m?.text ?? "");
  const [compIds, setCompIds] = useState<string[]>(m?.compIds ?? []);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = !m || name !== m.name || sum !== m.summary || text !== m.text || (L && compIds.join() !== (m.compIds ?? []).join());
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const went = m ? model.wentTo(kind, m.id) : { names: [], ids: [] };
  const pkIds = m ? m.inPackages.map((p) => p.id) : [];
  const big = !!m && (text !== m.text || (L && compIds.join() !== (m.compIds ?? []).join()));

  const save = async (mode: "fix" | "new") => {
    if (busy) return;
    setBusy(true);
    let ok = false;
    if (!m) {
      const id = await model.addMaterial(kind, { name, summary: sum, text, compIds: L ? compIds : undefined });
      ok = !!id;
    } else ok = await model.saveMaterial(m, { name, summary: sum, text, compIds: L ? compIds : null }, mode);
    setBusy(false);
    if (ok) go(null);
  };
  const onSave = () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    if (m && m.sent > 0 && big) { setAsk(true); return; }
    void save("fix");
  };

  if (ask && m) {
    const w = L ? "letter" : "synopsis";
    return (
      <>
        <Head k={kind} title={`A fix, or a new ${w}?`} sub={`${m.name} has gone out with ${m.sent} quer${m.sent === 1 ? "y" : "ies"}`} onClose={() => go(null)} />
        <div className="p6-db">
          <div className="p6-fx2">
            <button type="button" onClick={() => void save("fix")}><b>A fix</b><span>A typo, a tidier summary, the right file attached. The {m.sent} quer{m.sent === 1 ? "y keeps" : "ies keep"} this {w}, and it carries on as it is.</span></button>
            <button type="button" onClick={() => void save("new")}><b>A new {w}</b><span>{L ? "Different comps or a new hook." : "A different length or ending."} Saved as “{m.name} (2)” so the two can be compared. Packages using the old one keep it until you change them.</span></button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head k={kind} title={name || (m ? m.name : L ? "New query letter" : "New synopsis")} sub={`${NM[kind]}${m?.sent ? ` · sent with ${m.sent} quer${m.sent === 1 ? "y" : "ies"}` : ""}`} onClose={() => go(null)} />
      <div className="p6-db">
        <p className="p6-d-sum">{m ? `In ${pkIds.length} package${pkIds.length === 1 ? "" : "s"} · sent to ${went.ids.length} agent${went.ids.length === 1 ? "" : "s"}` : "Not in a package yet"}</p>
        <div className="p6-fld2">
          <label><span>Name</span><input ref={nameRef} className="p6-id-ldName" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label><span>Summary <em>shown in your lists and packages</em></span><input className="p6-id-ldSum" value={sum} placeholder={L ? "e.g. Hook-first, names two comps" : "e.g. One page, ends on the reveal"} onChange={(e) => setSum(e.target.value)} /></label>
        </div>
        <h5>{L ? "The letter" : "The synopsis"}</h5>
        <textarea className="p6-paper" value={text} aria-label={L ? "The letter" : "The synopsis"} onChange={(e) => setText(e.target.value)} rows={Math.max(6, Math.min(24, text.split("\n").length + 3))} />
        <Attachments />
        {L ? <CompsPicker model={model} ids={compIds} onChange={setCompIds} onOpenComps={onOpenComps} /> : null}
        <h5>In packages</h5><InPackages model={model} ids={pkIds} />
        <h5>Went to</h5><WentTo names={went.names} ids={went.ids} onSee={onSeeQueries} />
      </div>
      <div className="p6-df"><span className="p6-dfn">{dirty && m ? "Unsaved changes" : m ? (
        <button type="button" className="p6-cx-lnk" data-pk26={m.retired ? "restore" : "put-away"}
          onClick={async () => { if (m.retired) await model.bringBack(m); else await model.putAwayMat(m); go(null); }}>{m.retired ? "Bring it back" : "Put away"}</button>
      ) : ""}</span><div className="p6-bt"><button type="button" className="p6-cx-b p6-g" onClick={() => go(null)}>Cancel</button><button type="button" className="p6-cx-b p6-p" disabled={busy} onClick={onSave}>Save</button></div></div>
    </>
  );
};

/** Comps it names: the comparable titles library, plus any title typed that is not there yet. */
const CompsPicker: React.FC<{ model: Pk26Model; ids: string[]; onChange: (ids: string[]) => void; onOpenComps: () => void }> = ({ model, ids, onChange, onOpenComps }) => {
  const [v, setV] = useState("");
  const [focus, setFocus] = useState(false);
  const chosen = ids.map((id) => model.comps.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const hits = useMemo(() => model.comps.filter((c) => c.id && !ids.includes(c.id) && (!v.trim() || c.title.toLowerCase().includes(v.trim().toLowerCase()))), [model.comps, ids, v]);
  const exact = model.comps.some((c) => c.title.trim().toLowerCase() === v.trim().toLowerCase());
  const pick = async (title: string, id?: string) => {
    const cid = id ?? (await model.addComp(title));
    if (cid && !ids.includes(cid)) onChange([...ids, cid]);
    setV("");
  };
  return (
    <>
      <h5>Comps it names</h5>
      <div className="p6-cpk">
        {chosen.map((c) => <span key={c.id} className="p6-cp p6-on">{c.title}<button type="button" aria-label={`Remove ${c.title}`} onClick={() => onChange(ids.filter((x) => x !== c.id))}>✕</button></span>)}
        <label className="p6-cp-in">
          <input className="p6-id-cpIn" value={v} placeholder="Add a comp: pick or type a title" autoComplete="off" aria-label="Add a comp"
            onChange={(e) => setV(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { e.preventDefault(); const h = model.comps.find((c) => c.title.trim().toLowerCase() === v.trim().toLowerCase()); void pick(v.trim(), h?.id); } }} />
          <span className="p6-cp-dd">{focus ? <>
            {hits.map((c) => <button type="button" key={c.id} onMouseDown={(e) => e.preventDefault()} onClick={() => void pick(c.title, c.id)}>{c.title}<em>In your library</em></button>)}
            {v.trim() && !exact ? <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void pick(v.trim())}>+ Add “{v.trim()}”<em>New to your library</em></button> : null}
          </> : null}</span>
        </label>
      </div>
      <p className="p6-cp-n">From your <button type="button" className="p6-cx-lnk" onClick={onOpenComps}>comparable titles</button> library. A title you type that isn’t there yet is added to it.</p>
    </>
  );
};

const ExtraForm: React.FC<{ model: Pk26Model; id: string; go: (v: DrawerView | null) => void; onSeeQueries: (ids: string[]) => void }> = ({ model, id, go, onSeeQueries }) => {
  const e = model.extras.find((x) => x.id === id);
  const [name, setName] = useState(e?.name ?? "");
  const pkIds = model.live.filter((p) => (p.extraIds ?? []).includes(id)).map((p) => p.id);
  const went = model.wentTo("ext", id);
  if (!e) return null;
  const save = async () => { if (name.trim() && name.trim() !== e.name) { if (!(await model.renameExtra(id, name))) return; } go(null); };
  return (
    <>
      <Head k="ext" title={name || e.name} sub="Extra" onClose={() => go(null)} />
      <div className="p6-db">
        <p className="p6-d-sum">In {pkIds.length} package{pkIds.length === 1 ? "" : "s"}</p>
        <div className="p6-fld2"><label><span>Name</span><input className="p6-id-ldName" value={name} onChange={(ev) => setName(ev.target.value)} /></label></div>
        <p className="p6-cp-n">An extra goes with a package only when you tick it there. Attach the file you send, so it’s on record with every query it goes out with.</p>
        <Attachments />
        <h5>In packages</h5><InPackages model={model} ids={pkIds} />
        <h5>Went to</h5><WentTo names={went.names} ids={went.ids} onSee={onSeeQueries} />
      </div>
      <div className="p6-df"><span className="p6-dfn">{name !== e.name ? "Unsaved changes" : ""}</span><div className="p6-bt"><button type="button" className="p6-cx-b p6-g" onClick={() => go(null)}>Cancel</button><button type="button" className="p6-cx-b p6-p" onClick={() => void save()}>Save</button></div></div>
    </>
  );
};

/** A new version of the book — Versions v2's own save (it becomes the version in use). */
const VersionForm: React.FC<{ model: Pk26Model; parentId: string | null; go: (v: DrawerView | null) => void }> = ({ model, parentId, go }) => {
  const [name, setName] = useState("");
  const [change, setChange] = useState("");
  const parent = model.versionRows.find((v) => v.id === (parentId ?? model.activeMs?.inUseBookVersionId)) ?? model.versionRows[0] ?? null;
  const save = async () => {
    const id = await model.saveVersion({ name, change, parentId: parent?.id ?? null });
    if (!id) return;
    const using = parent ? model.live.filter((p) => p.bookVersionId === parent.id) : [];
    go(using.length ? { m: "verask", versionId: id, parentId: parent!.id } : null);
  };
  return (
    <>
      <Head title="Save a new version" sub={parent ? `From ${parent.name}` : "Your first version"} onClose={() => go(null)} />
      <div className="p6-db">
        <div className="p6-fld2">
          <label><span>Name</span><input className="p6-id-ldName" value={name} placeholder="e.g. Tighter first chapter" onChange={(e) => setName(e.target.value)} /></label>
          <label><span>What changed <em>shown in your lists and packages</em></span><input className="p6-id-ldSum" value={change} placeholder="e.g. Trimmed chapter one" onChange={(e) => setChange(e.target.value)} /></label>
        </div>
        <p className="p6-cp-n">The full history, and who has which version, is on the Versions page.</p>
      </div>
      <div className="p6-df"><span className="p6-dfn" /><div className="p6-bt"><button type="button" className="p6-cx-b p6-g" onClick={() => go(null)}>Cancel</button><button type="button" className="p6-cx-b p6-p" onClick={() => void save()}>Save version</button></div></div>
    </>
  );
};

/** "Use it in your packages too?" — the packages that use its parent, ticked. */
const VersionAsk: React.FC<{ model: Pk26Model; versionId: string; parentId: string | null; go: (v: DrawerView | null) => void }> = ({ model, versionId, parentId, go }) => {
  const v = model.versionRows.find((x) => x.id === versionId);
  const parent = model.versionRows.find((x) => x.id === parentId);
  const pks = model.live.filter((p) => p.bookVersionId === parentId);
  const [ticked, setTicked] = useState<Set<string>>(new Set(pks.map((p) => p.id)));
  return (
    <>
      <Head title={`Version saved: ${v?.name ?? "new version"}`} sub={parent ? `From ${parent.name}` : ""} onClose={() => go(null)} />
      <div className="p6-db">
        <h5>Use it in your packages too?</h5>
        <p className="p6-cp-n">These packages send pages from {parent?.name ?? "the version"}, the version this one came from.</p>
        <div className="p6-va">
          {pks.map((p) => (
            <label key={p.id}><input type="checkbox" checked={ticked.has(p.id)} onChange={(e) => setTicked((s) => { const n = new Set(s); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} />
              <span className="p6-pkg"><Pic ic={iconOf(p)} />{p.packageName}</span><small>{p.note ?? ""}</small></label>
          ))}
        </div>
        <p className="p6-cp-n">Queries already sent keep the version they went with.</p>
      </div>
      <div className="p6-df"><span /><div className="p6-bt"><button type="button" className="p6-cx-b p6-g" onClick={() => go(null)}>Not now</button><button type="button" className="p6-cx-b p6-p" onClick={async () => { await model.useVersionIn([...ticked], versionId); go(null); }}>Update packages</button></div></div>
    </>
  );
};
