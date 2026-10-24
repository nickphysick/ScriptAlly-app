/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS v2 — /manuscripts/versions ═══════════════════════════════════════════════════════════════════════════
 *
 * Design authority: design-refs/versions-v2/versions-v2.html (its markup, CSS and copy are ported wholesale; its data is
 * invented), amended by v2.1 (design-refs/versions-v2-1, the warming-up panel) and v2.2 (design-refs/versions-v2-2: the
 * title card, the tinted list panel and the empty states). Supersedes Versions v1, whose page is deleted.
 *
 * The page: the title card ("Versions" PRO, one line naming the manuscript, New version · How it works, the quill hawk)
 * → the warning banner (queries with no version) → "{n} versions saved" in its tinted panel → the family tree → the navy
 * Tracking & performance band. With no versions: "No versions yet" (a preview of the list) and the comparisons note.
 * Pro (and founding members); Free sees the lock.
 *
 * ⚠️ v2.2 DELETED THE LIVING HEADER AND ITS DONUT ("Sent with queries so far"), and with them the Compare button. The
 *    folder tab already names the page; the title card is the page's one header.
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
import { VERSION_NOT_SURE, firstSaveMessage, hasGoneOut, packagesHolding, versionsModel } from "../../lib/versionsV2";
import {
  VERSIONS_CHECKLIST, VERSIONS_GUIDE_HIDDEN_PATH, VERSIONS_GUIDE_SEEN_PATH, VERSIONS_GUIDE_UNHIDE_PATH, VERSIONS_LOCKED, VERSIONS_STEP_TEXT,
  versionsGuideDonePath, versionsGuideOf, type VersionsGuideKey,
} from "../../lib/pageChecklist";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { PageChecklist } from "../shell/guide/PageChecklist";
import { PageHeaderCard } from "../shared/PageHeaderCard";
import { PageAlertBanner } from "../shared/PageAlertBanner";
import heroArt from "../../assets/manuscripts/hero-archivist.png";
import { agentLine, today } from "./v2Bits";
import { V2List } from "./V2List";
import { V2Tree } from "./V2Tree";
import { V2Tracking } from "./V2Tracking";
import { V2Empty } from "./V2Empty";
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
    /* v2.2 A3 — "Add a version" points at the title card's button, or at the empty state's dashed row when that is the
       one on screen and the title card's has scrolled away */
    const onScreen = (e: HTMLElement | null) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
    const titleBtn = page?.querySelector<HTMLElement>('[data-vv2="title"] [data-vv2="new"]') ?? null;
    const dashed = page?.querySelector<HTMLElement>('button[data-vv2="first"]') ?? null;
    const el = k === "add" ? (dashed && !onScreen(titleBtn) && onScreen(dashed) ? dashed : titleBtn)
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
      /* v2.2 C4 — with no earlier queries the first save says only that Original came with it (S37) */
      message: first ? firstSaveMessage(s.name, earlier) : `Saved ${s.name}. Add it to a package to send it.`,
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

  const attrs = { "data-page": "v", "data-tier": locked ? "free" : "pro", "data-ms": fresh ? "fresh" : "full" };
  const state = !collectionsReady ? "loading" : locked ? "locked" : fresh ? (msQueries.length ? "pre" : "fresh") : "filled";

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
          {/* v2.2 A — the title card (S31): replaces the living header, its Compare and "?" buttons and the donut */}
          <PageHeaderCard classPrefix="hb" titleId="hbT" data={{ "data-vv2": "title" }} titleData={{ "data-page-title": "true" }}
            title="Versions" tag="Pro" art={heroArt}
            body={<>Save each version of <b>{ms?.title ?? "your manuscript"}</b> as it changes. QueryHawk records which one went out with every query, so you can see which gets agents asking for more.</>}
            primary={{ label: fresh ? "+ Save your first version" : "+ New version", data: { "data-vv2": "new" }, disabled: !ms || locked, onClick: () => openForm(null) }}
            secondary={{ label: "How it works", data: { "data-vv2": "how" }, onClick: () => setModal({ kind: "how" }) }} />

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
                <PageAlertBanner classPrefix="wb" className="is-full" id="msNote" headlineId="msNoteT" facesId="msNoteG" data={{ "data-vv2": "banner" }}
                  headline={<><b>{m.unrecorded.length} {m.unrecorded.length === 1 ? "query is" : "queries are"} out with agents</b> without a version assigned.</>}
                  line="Until you say which version went, their replies don’t count towards any version."
                  faces={m.unrecorded.slice(0, 6).map((q) => { const a = agentLine(q, agentById); return { key: q.id, initials: a.initials, title: `${a.name}${a.agency ? `, ${a.agency}` : ""}` }; })}
                  action={{ label: "Assign versions", data: { "data-vv2": "assign" }, onClick: openPicker }} />
              ) : null}

              {ms && !fresh ? (
                <>
                  <V2List ms={ms} m={m} locked={locked} onOpen={(id) => openVersion(id)} onEdit={openForm} onUse={(id) => void onUse(id)}
                    onBin={(id) => setModal({ kind: "confirm", id })} onBringBack={(id) => void onBringBack(id)} />
                  <V2Tree ms={ms} m={m} onOpen={(id) => openVersion(id)} />
                  <V2Tracking m={m} rows={rows} onOpen={(id) => openVersion(id)} onPackage={goPackage} onFill={openPicker} queries={msQueries} today={today()} />
                </>
              ) : null}

              {/* v2.2 C — "No versions yet" (a preview of the list) and the comparisons note (S34–S36) */}
              {ms && fresh && collectionsReady ? <V2Empty ms={ms} out={m.sentTotal} disabled={locked} onFirst={() => openForm(null)} /> : null}
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
