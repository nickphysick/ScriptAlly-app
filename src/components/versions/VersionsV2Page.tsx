/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS v2 — /manuscripts/versions ═══════════════════════════════════════════════════════════════════════════
 *
 * Design authority: design-refs/versions-v2/versions-v2.html (its markup, CSS and copy are ported wholesale; its data is
 * invented). Supersedes Versions v1 (design-refs/versions-v1), whose page is deleted in the same commit.
 *
 * The page: the header (the quill hawk, "{n} versions on file", "of {title}", New version · Compare · ?, and the donut of
 * queries sent so far) → the warning banner (queries with no version) → "{n} versions saved" → the family tree → the
 * navy Tracking & performance band (the carousel and the league table). Pro (and founding members); Free sees the lock.
 *
 * ⚠️ THE ROUTE STAYS /manuscripts/versions — the app's routing convention (its siblings are /manuscripts/comps and
 *    /manuscripts/packages, and every route register already lists it). The prompt's "/versions" said to follow it.
 * ⚠️ EVERY FIGURE IS lib/versionsV2, AND EVERY WRITE IS lib/bookVersions' + ONE db.writeVersionChange BATCH, so each Undo
 *    is the snapshot taken before it (absent stays absent).
 * ⚠️ THE STYLESHEET IS GENERATED from the ref (versionsV2.css, scoped to .vv2); app-side differences are in
 *    versionsV2.app.css, each with its reason.
 * ⚠️ NO WRITING ADVICE ANYWHERE (R14). The page reports.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import type { Agent, Query } from "../../types";
import { scopedManuscript } from "../../lib/manuscriptSummary";
import {
  archiveVersion, bringBackVersion, deleteVersion, editVersion, newBookVersionId, saveNewVersion, setInUse, versionSnapshot,
  type VersionFields,
} from "../../lib/bookVersions";
import { buildRows } from "../../lib/analytics";
import { versionsUnlocked, VERSIONS_FOUNDING_ACCESS } from "../../lib/entitlements";
import { VERSION_NOT_SURE, donut, hasGoneOut, packagesHolding, trackingState, versionsModel } from "../../lib/versionsV2";
import {
  VERSIONS_CHECKLIST, VERSIONS_GUIDE_HIDDEN_PATH, VERSIONS_GUIDE_SEEN_PATH, VERSIONS_GUIDE_UNHIDE_PATH, VERSIONS_LOCKED, VERSIONS_STEP_TEXT,
  versionsGuideDonePath, versionsGuideOf, type VersionsGuideKey,
} from "../../lib/pageChecklist";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { PageChecklist } from "../shell/guide/PageChecklist";
import heroArt from "../../assets/manuscripts/hero-archivist.png";
import { agentLine, today } from "./v2Bits";
import { V2List } from "./V2List";
import { V2Tree } from "./V2Tree";
import { V2Tracking } from "./V2Tracking";
import { ArchiveConfirm, DrawerShell, Explainer, Layer, ModalShell, Picker, VersionDrawer, VersionForm, type FormSave, type PickerMode } from "./V2Overlays";
import "./versionsV2.css";
import "./versionsV2.app.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const SCROLLS = "/images/versions/versions-scrolls-hawk.webp";

/* ⚠️ A REVIEW AID FOR THE FREE STATE, DEV BUILDS ONLY (as v1): with founding access on, no account is locked, so the
   lock is reachable on dev through `sessionStorage["sa.dev.versionsFree"] = "1"`. MODE is statically replaced, so a
   production build carries none of this. */
const reviewFree = (): boolean => {
  if (import.meta.env.MODE === "production") return false;
  try { return sessionStorage.getItem("sa.dev.versionsFree") === "1"; } catch { return false; }
};

type Drawer = { kind: "version"; id: string } | { kind: "form"; edit: string | null } | null;
type Modal = { kind: "picker"; mode: PickerMode } | { kind: "confirm"; id: string } | { kind: "how" } | null;

export const VersionsV2Page: React.FC<{ onNavigate: (tab: string, subPage?: string) => void; active?: boolean }> = ({ onNavigate, active = true }) => {
  const db = useScriptAllyDb();
  const { manuscripts, packages, queries, activities, agents, versions: materials, currentUser, collectionsReady, writeVersionChange, updateUserPaths } = db;
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const stored = useMemo(() => { try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; } }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, stored), [manuscripts, stored]);
  const locked = reviewFree() || !versionsUnlocked(currentUser, VERSIONS_FOUNDING_ACCESS);

  const msQueries = useMemo(() => (ms ? (queries as Query[]).filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const rows = useMemo(() => new Map(buildRows(msQueries, activities, agents as Agent[], Date.now()).map((r) => [r.id, r])), [msQueries, activities, agents]);
  const m = useMemo(() => versionsModel(ms, msQueries, packages, materials, rows), [ms, msQueries, packages, materials, rows]);
  const agentById = useMemo(() => new Map((agents as Agent[]).map((a) => [a.id, a])), [agents]);
  const fresh = m.versions.length === 0;
  /* v2.1 B1 — Compare appears only with the full Tracking & performance section, on the same condition */
  const tracking = trackingState(m);

  const [drawer, setDrawer] = useState<Drawer>(null);
  const [modal, setModal] = useState<Modal>(null);
  const lastDrawer = useRef<Drawer>(null);
  if (drawer) lastDrawer.current = drawer;

  /* ── the guide ── */
  const guide = versionsGuideOf(currentUser);
  const doneMap = useMemo(() => ({ ...guide.done, ...(m.versions.some((v) => !v.original) ? { add: true } : {}) }), [guide.done, m.versions]);
  const tick = useCallback((k: VersionsGuideKey) => { if (!guide.done[k]) void updateUserPaths(versionsGuideDonePath(k)); }, [guide.done, updateUserPaths]);
  const disabled = useMemo(() => {
    const d: Partial<Record<VersionsGuideKey, string>> = {};
    if (!doneMap.edit && !m.versions.length) d.edit = VERSIONS_LOCKED.edit;
    if (!doneMap.use && m.live.length < 2) d.use = VERSIONS_LOCKED.use;
    if (!doneMap.check && !m.versions.some((v) => (m.facts.get(v.id)?.n ?? 0) > 0)) d.check = VERSIONS_LOCKED.check;
    return d;
  }, [doneMap, m]);
  const targetFor = useCallback((k: VersionsGuideKey) => {
    const page = document.querySelector<HTMLElement>('[data-vv2="page"]');
    const rowsEl = [...(page?.querySelectorAll<HTMLElement>('[data-vv2="row"]') ?? [])];
    const el = k === "add" ? page?.querySelector<HTMLElement>('[data-vv2="new"]') ?? null
      : k === "edit" ? rowsEl[0]?.querySelector<HTMLElement>('[data-vv2="edit"]') ?? null
        : k === "use" ? rowsEl.find((r) => !r.classList.contains("use"))?.querySelector<HTMLElement>('[data-vv2="use"]') ?? null
          : rowsEl.find((r) => !r.querySelector(".db-q > em")) ?? rowsEl[0] ?? null;
    return { el, text: VERSIONS_STEP_TEXT[k] };
  }, []);

  /* ── writes: one batch each, Undo is the snapshot ── */
  const write = useCallback(async (fields: VersionFields | string, extra?: Parameters<typeof writeVersionChange>[2]): Promise<VersionFields | null> => {
    if (!ms || locked) return null;
    if (typeof fields === "string") { showToast({ message: "That couldn’t be saved. Nothing has changed." }); return null; }
    const before = versionSnapshot(ms);
    const ok = await writeVersionChange(ms.id, fields, extra);
    if (!ok) { showToast({ message: "That didn’t save. Check your connection and try again." }); return null; }
    return before;
  }, [ms, locked, writeVersionChange, showToast]);

  const flash = (id: string) => window.setTimeout(() => {
    const c = document.getElementById(`card-${id}`);
    if (!c) return;
    c.scrollIntoView({ behavior: "smooth", block: "center" });
    c.classList.add("flash");
    window.setTimeout(() => c.classList.remove("flash"), 1400);
  }, 120);

  const onSave = async (s: FormSave) => {
    if (!ms) return;
    const editId = drawer?.kind === "form" ? drawer.edit : null;
    if (editId) {
      const sent = hasGoneOut(m, editId);
      const before = await write(editVersion(ms, editId, { name: s.name, changes: s.changes, wordCount: s.wordCount, ...(sent || !s.parentId ? {} : { parentId: s.parentId }) }, sent));
      if (!before) return;
      setDrawer(null);
      tick("edit");
      showToast({ message: `Saved ${s.name}.`, undo: async () => { await writeVersionChange(ms.id, before); } });
      return;
    }
    const first = m.versions.length === 0;
    const id = newBookVersionId();
    const earlier = m.sentTotal;
    const before = await write(saveNewVersion(ms, { name: s.name, changes: s.changes, wordCount: s.wordCount, parentId: s.parentId }, today(), { version: id, original: newBookVersionId() }));
    if (!before) return;
    setDrawer(null);
    tick("add");
    flash(id);
    showToast({
      message: first ? `Saved ${s.name}. Your ${earlier} earlier ${earlier === 1 ? "query counts" : "queries count"} towards Original.` : `Saved ${s.name}. Add it to a package to send it.`,
      undo: async () => { await writeVersionChange(ms.id, before); },
    });
  };

  const onUse = async (id: string) => {
    if (!ms) return;
    const old = m.inUse;
    const before = await write(setInUse(ms, id));
    if (!before) return;
    if (old && old !== id) tick("use");
    const nv = m.versions.find((v) => v.id === id);
    showToast({ message: `New queries will now go out with ${nv?.name}.`, undo: async () => { await writeVersionChange(ms.id, before); } });
  };

  const onBinGo = async (id: string) => {
    if (!ms) return;
    setModal(null);
    const v = m.versions.find((x) => x.id === id);
    if (!v) return;
    const f = m.facts.get(id)!;
    if (hasGoneOut(m, id)) {
      const before = await write(archiveVersion(ms, id, today(), m.inUse));
      if (!before) return;
      showToast({ message: `Archived ${v.name}. Its ${f.all.length} ${f.all.length === 1 ? "query stays" : "queries stay"} recorded.`, undo: async () => { await writeVersionChange(ms.id, before); } });
      return;
    }
    const held = packagesHolding(packages, ms.id, id);
    const before = await write(deleteVersion(ms, id, m.inUse), { packages: held.map((p) => ({ id: p.id, bookVersionId: null })) });
    if (!before) return;
    showToast({
      message: `Deleted ${v.name}. It hadn’t gone out, so nothing is lost.`,
      undo: async () => { await writeVersionChange(ms.id, before, { packages: held.map((p) => ({ id: p.id, bookVersionId: id })) }); },
    });
  };

  const onBringBack = async (id: string) => {
    if (!ms) return;
    const v = m.versions.find((x) => x.id === id);
    const before = await write(bringBackVersion(ms, id));
    if (!before) return;
    showToast({ message: `${v?.name} is back in your comparisons.`, undo: async () => { await writeVersionChange(ms.id, before); } });
  };

  const onPicked = async (picks: Map<string, string | null>, mode: PickerMode) => {
    if (!ms || locked) return;
    const entries = [...picks];
    const before = entries.map(([qid]) => ({ id: qid, bookVersionId: (msQueries.find((q) => q.id === qid)?.bookVersionId ?? null) as string | null }));
    const after = entries.map(([qid, vid]) => ({ id: qid, bookVersionId: vid ?? VERSION_NOT_SURE }));
    const ok = await writeVersionChange(ms.id, null, { queries: after });
    if (!ok) { showToast({ message: "That didn’t save. Check your connection and try again." }); return; }
    setModal(null);
    const undo = async () => { await writeVersionChange(ms.id, null, { queries: before }); };
    if (mode.kind === "change") {
      const who = agentLine(mode.q, agentById).name;
      const to = entries[0][1] ? m.versions.find((v) => v.id === entries[0][1]) : null;
      showToast({ message: to ? `${who} now counts towards ${to.name}.` : `${who} is out of the comparison until you choose a version.`, undo });
    } else {
      const n = after.length;
      showToast({ message: `${n} ${n === 1 ? "query now counts" : "queries now count"} towards ${n === 1 ? "its" : "their"} version.`, undo });
    }
  };

  const openVersion = (id: string) => {
    if (locked) return;
    setDrawer({ kind: "version", id });
    if ((m.facts.get(id)?.n ?? 0) > 0) tick("check");
  };
  const openForm = (edit: string | null) => { if (!locked) setDrawer({ kind: "form", edit }); };
  const openPicker = () => { if (!locked && m.unrecorded.length) setModal({ kind: "picker", mode: { kind: "assign" } }); };
  const goPackage = (id: string) => navigate(`/manuscripts/packages?new=1&version=${encodeURIComponent(id)}`);
  const goCompare = () => document.getElementById("msLH")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const attrs = { "data-page": "v", "data-tier": locked ? "free" : "pro", "data-ms": fresh ? "fresh" : "full" };
  const state = !collectionsReady ? "loading" : locked ? "locked" : fresh ? (msQueries.length ? "pre" : "fresh") : "filled";

  /* ── the header's right: the donut (or, with nothing saved, the zero ring) ── */
  const slices = donut(m);
  const tot = m.sentTotal;
  const R = 44, CC = 2 * Math.PI * R;
  let off = 0;
  const arcs = slices.map((s) => {
    const L = tot ? (s.n / tot) * CC : 0, gap = slices.length > 1 ? 2 : 0;
    const a = <circle key={s.key} cx="60" cy="60" r={R} fill="none" stroke={s.colour} strokeWidth="16" strokeDasharray={`${Math.max(L - gap, 0.5)} ${CC}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />;
    off += L;
    return a;
  });

  const liveN = m.live.length;
  const title = liveN ? `${liveN} ${liveN === 1 ? "version" : "versions"} on file` : "No versions yet";
  const dv = lastDrawer.current;
  const drawerV = dv?.kind === "version" ? m.versions.find((v) => v.id === dv.id) ?? null : null;
  const formEdit = dv?.kind === "form" && dv.edit ? m.versions.find((v) => v.id === dv.edit) ?? null : null;

  return (
    <WorkspacePageGrid className="vv2-wpg" masthead={null} scrollLabel="Versions">
      <div className="vv2" data-vv2="page" data-state={state} {...attrs}>
        {ms && collectionsReady ? (
          <PageChecklist page="Versions" items={VERSIONS_CHECKLIST} done={doneMap} seen={guide.seen} hidden={guide.hidden}
            active={active && !locked} ready={collectionsReady} targetFor={targetFor} art={SCROLLS} disabled={disabled}
            onSeen={() => { if (!guide.seen) void updateUserPaths(VERSIONS_GUIDE_SEEN_PATH); }}
            onHide={() => { void updateUserPaths(VERSIONS_GUIDE_HIDDEN_PATH); }}
            onUnhide={() => { void updateUserPaths(VERSIONS_GUIDE_UNHIDE_PATH); }}
            quiet={!!drawer || !!modal} empty={fresh} />
        ) : null}
        <div className="ms25">
          <header className="mh vh" aria-labelledby="msH1" data-vv2="header">
            <img className="mh-art" alt="" aria-hidden="true" src={heroArt} />
            <div className="mh-t">
              <p className="mh-k">— Versions —</p>
              <h1 id="msH1" data-page-title><span id="vTitle">{title}</span></h1>
              <p className="mh-by"><i /><em>of</em> {ms?.title ?? "your manuscript"}<i /></p>
              <div className="mh-b">
                <button type="button" className="p1" data-vv2="new" disabled={!ms || locked} onClick={() => openForm(null)}>+ New version</button>
                {tracking === "full" ? <button type="button" className="p2" data-vv2="compare" onClick={goCompare}>Compare</button> : null}
                <button type="button" className="hw" data-vv2="how" onClick={() => setModal({ kind: "how" })}><i>?</i><span>How version tracking works</span></button>
              </div>
            </div>
            <div className="mh-r" id="mhR" style={fresh ? { width: "190px" } : undefined} data-vv2="donut">
              {fresh ? (
                <div className="mcard" style={{ gridTemplateColumns: "1fr" }}>
                  <button type="button" className="rg" disabled={!ms || locked} onClick={() => openForm(null)}>
                    <svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" fill="none" stroke="#ece6dc" strokeWidth="9" /><text x="42" y="50" textAnchor="middle" fontSize="23" fill="#1c130f" style={{ fontFamily: "var(--machine)" }}>0</text></svg>
                    <b>Versions saved<small>Save one to start tracking</small></b>
                  </button>
                </div>
              ) : (
                <div className="hpie">
                  <svg className="hpie-g" viewBox="0 0 120 120" role="img" aria-label={`${tot} queries sent, split by version`}>
                    <defs><pattern id="vv2hz" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#efe9e0" /><path d="M0 0v5" stroke="#b9ad9d" strokeWidth="2" /></pattern></defs>
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#f1ece4" strokeWidth="16" />
                    {arcs}
                    <text x="60" y="62" textAnchor="middle" className="hpie-n">{tot}</text>
                    <text x="60" y="78" textAnchor="middle" className="hpie-l">QUERIES SENT</text>
                  </svg>
                  <div className="hpie-k">
                    <p className="hpie-t">Sent with queries so far</p>
                    {slices.map((s) => s.versionId
                      ? <button type="button" key={s.key} className={`hpie-r${s.inUse ? " use" : ""}`} data-vv2="legend" onClick={() => flash(s.versionId!)}><i style={{ background: s.colour }} /><span>{s.name}</span><b>{s.n}</b></button>
                      : s.rest ? <p key={s.key} className="hpie-r o"><i style={{ background: s.colour }} /><span>{s.name}</span><b>{s.n}</b></p>
                        : <button type="button" key={s.key} className="hpie-r un" onClick={openPicker}><i className="hz" /><span>Not recorded</span><b>{s.n}</b></button>)}
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="mc lockwrap">
            {locked ? (
              <div className="qk lockcard" role="region" aria-labelledby="lkH" data-vv2="lock">
                <div className="qk-st nv"><span>Versions · part of Pro</span><span>{ms?.title ?? ""}</span></div>
                <div className="bd">
                  <h2 id="lkH">Find out which opening gets agents reading on.</h2>
                  <p className="d">Save each version of your manuscript as it changes. QueryHawk records which one went out with every query, then shows you which is landing.</p>
                  <ul>
                    <li><i>1</i><span><b>A league table.</b> Every version side by side.</span></li>
                    <li><i>2</i><span><b>Every query, by version.</b> One timeline of who saw what.</span></li>
                    <li><i>3</i><span><b>Fix the record.</b> Say which version went, even after it’s sent.</span></li>
                  </ul>
                </div>
                <div className="ft">
                  <button type="button" className="p1" data-vv2="plans" onClick={() => navigate("/plans")}>See plans</button>
                  <button type="button" className="p2" onClick={() => setModal({ kind: "how" })}>How it works</button>
                  <small>Plans run only while you’re querying.</small>
                </div>
              </div>
            ) : null}

            <div className="under" inert={locked || undefined} data-vv2="under">
              {!fresh && m.unrecorded.length ? (
                <div className="wb is-full" id="msNote" role="status" data-vv2="banner">
                  <span className="wb-i" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2v.1" /></svg></span>
                  <div className="wb-t">
                    <p className="wb-h" id="msNoteT"><b>{m.unrecorded.length} {m.unrecorded.length === 1 ? "query is" : "queries are"} out with agents</b> without a version assigned.</p>
                    <p className="wb-s">Until you say which version went, their replies don’t count towards any version.</p>
                  </div>
                  <span className="wb-g" id="msNoteG">{m.unrecorded.slice(0, 6).map((q) => { const a = agentLine(q, agentById); return <span key={q.id} title={`${a.name}${a.agency ? `, ${a.agency}` : ""}`}>{a.initials}</span>; })}</span>
                  <button type="button" className="wb-b" data-vv2="assign" onClick={openPicker}>Assign versions</button>
                </div>
              ) : null}

              {ms && !fresh ? (
                <>
                  <V2List ms={ms} m={m} locked={locked} onOpen={(id) => openVersion(id)} onEdit={openForm} onUse={(id) => void onUse(id)}
                    onBin={(id) => setModal({ kind: "confirm", id })} onBringBack={(id) => void onBringBack(id)} />
                  <V2Tree ms={ms} m={m} onOpen={(id) => openVersion(id)} />
                  <V2Tracking m={m} rows={rows} onOpen={(id) => openVersion(id)} onPackage={goPackage} onFill={openPicker} queries={msQueries} today={today()} />
                </>
              ) : null}

              {fresh && collectionsReady ? (
                <section className="cx-sec first is-fresh" aria-labelledby="msVH0" data-vv2="empty">
                  <div className="cx-sh"><h2 id="msVH0">Start tracking versions</h2></div>
                  {msQueries.length ? (
                    <div className="pre-note" id="preNote" data-vv2="pre-note"><span className="ic">i</span><div>
                      <h3 id="preNoteH">You’ve already sent {m.sentTotal} {m.sentTotal === 1 ? "query" : "queries"}.</h3>
                      <p>When you save your first version, we’ll assume they went out with your <b>original manuscript</b> and count them there. If any went out differently, it’s easy to change.</p>
                    </div></div>
                  ) : null}
                  <div className="vsteps">
                    <ol>
                      <li><i>1</i><h3>Save the manuscript as it stands.</h3><p>Your first version is the book you’re sending now. Give it a name you’ll recognise.</p><div className="ex">e.g. <b>Prologue first</b></div></li>
                      <li><i>2</i><h3>Save a new version when the opening changes.</h3><p>List what you changed, one thing at a time. We’ll draw how each version leads to the next.</p><div className="ex">e.g. <b>Fast-paced opening</b> · Cut the prologue · Opens on the ferry</div></li>
                      <li><i>3</i><h3>Each query records the version that went.</h3><p>Over time you’ll see which opening gets agents asking for more.</p><div className="ex">e.g. <b>40%</b> asked for more, from 5 queries</div></li>
                    </ol>
                    <div className="foot"><p>A version is the same story told a different way. A new book is a new manuscript.</p><button type="button" className="cx-b p" data-vv2="first" disabled={!ms || locked} onClick={() => openForm(null)}>+ Save your first version</button></div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        <Layer attrs={attrs}>
          <DrawerShell open={!!drawer} onClose={() => setDrawer(null)} kind={dv?.kind ?? "none"} k={dv && "id" in dv ? dv.id : dv?.kind === "form" ? `f-${dv.edit}` : null}>
            {ms && dv?.kind === "version" && drawerV ? (
              <VersionDrawer m={m} v={drawerV} rows={rows} agents={agentById} locked={locked} onClose={() => setDrawer(null)}
                onEdit={(id) => setDrawer({ kind: "form", edit: id })} onChange={(q) => setModal({ kind: "picker", mode: { kind: "change", q } })} onPackage={goPackage} />
            ) : null}
            {ms && dv?.kind === "form" ? (
              <VersionForm key={dv.edit ?? "new"} ms={ms} m={m} edit={formEdit} earlier={m.sentTotal} onClose={() => setDrawer(null)} onSave={(s) => void onSave(s)}
                onDetails={() => { setDrawer(null); onNavigate("manuscripts"); }} />
            ) : null}
          </DrawerShell>
          <ModalShell open={modal?.kind === "how"} kind="m" onClose={() => setModal(null)} vv="how">
            <Explainer onClose={() => setModal(null)} onNew={() => { setModal(null); openForm(null); }} />
          </ModalShell>
          <ModalShell open={modal?.kind === "picker" || modal?.kind === "confirm"} kind="p" onClose={() => setModal(null)} vv={modal?.kind ?? undefined} k={modal}>
            {modal?.kind === "picker" ? <Picker mode={modal.mode} m={m} agents={agentById} onClose={() => setModal(null)} onSave={(p) => void onPicked(p, modal.mode)} /> : null}
            {modal?.kind === "confirm" && ms ? (() => {
              const v = m.versions.find((x) => x.id === modal.id);
              if (!v) return null;
              const names = hasGoneOut(m, v.id) ? [] : packagesHolding(packages, ms.id, v.id).map((p) => p.packageName);
              return <ArchiveConfirm m={m} v={v} packageNames={names} onKeep={() => setModal(null)} onGo={() => void onBinGo(v.id)} />;
            })() : null}
          </ModalShell>
        </Layer>
      </div>
    </WorkspacePageGrid>
  );
};
