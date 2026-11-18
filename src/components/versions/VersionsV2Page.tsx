/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS v6 — /manuscripts/versions ═══════════════════════════════════════════════════════════════════════════
 *
 * Design authority: design-refs/versions-v6/versions-v6.html (its structure, order, copy, spacing, funnel and
 * interactions; live path `S.mp = 6`, `S.fs = 2`, `S.co = 8`). It is NOT authority for parts the app already has: the
 * navy header and slim bar are the shared WorkspaceNavyHeader; the cards, founding band, notice and switch are the
 * Dashboard's look (page-local copies in v6/V6Parts, each naming its source). Rebuilt from Versions v2.2, whose data
 * layer is unchanged: every figure is lib/versionsV2, every write lib/bookVersions + one db.writeVersionChange batch.
 *
 * The page, top to bottom: the navy header ("Versions", "of {title}", New version · How it works; on the right the
 * one-line Version map, which opens the family tree in a dialog) → the founding writer band → the notice for queries
 * with no version recorded → "{n} versions saved" beside the open version and its queries → "Compare your versions".
 * With no versions: the header without the map, the band, and one How it works card. Pro (and founding writers); Free
 * sees v2's lock, as built.
 *
 * ⚠️ THE ROUTE STAYS /manuscripts/versions, AND THIS FILE KEEPS ITS NAME — App.tsx and every route register import it.
 * ⚠️ EVERY UNDO IS THE SNAPSHOT TAKEN BEFORE ITS WRITE (absent stays absent).
 * ⚠️ NO WRITING ADVICE ANYWHERE (R14). The page reports figures.
 * ⚠️ SPACING: tight inside a section, generous between: header, band and notice 16 apart; 40 before the desk (56 when
 *    the notice precedes it); 64 before the comparison. S1 measures it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import type { Agent, Query } from "../../types";
import { scopedManuscript } from "../../lib/manuscriptSummary";
import { archiveVersion, bringBackVersion, editVersion, newBookVersionId, saveNewVersion, setInUse, versionSnapshot, type VersionFields } from "../../lib/bookVersions";
import { buildRows } from "../../lib/analytics";
import { versionsUnlocked } from "../../lib/entitlements";
import { VERSION_NOT_SURE, firstSaveMessage, hasGoneOut, versionsModel } from "../../lib/versionsV2";
import type { ListSort, MeasureKey } from "../../lib/versionsV6";
import {
  VERSIONS_CHECKLIST, VERSIONS_GUIDE_HIDDEN_PATH, VERSIONS_GUIDE_SEEN_PATH, VERSIONS_GUIDE_UNHIDE_PATH, VERSIONS_LOCKED, VERSIONS_STEP_TEXT,
  versionsGuideDonePath, versionsGuideOf, type VersionsGuideKey,
} from "../../lib/pageChecklist";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { PageChecklist } from "../shell/guide/PageChecklist";
import { WorkspaceNavyHeader } from "../shell/WorkspaceNavyHeader";
import { XMark, agentLine, today } from "./v2Bits";
import { V2Tree } from "./V2Tree";
import { Explainer, Layer, ModalShell, Picker, type FormSave, type PickerMode } from "./V2Overlays";
import { MapBlock, V6Founding, V6Frame, V6Notice } from "./v6/V6Parts";
import { V6List } from "./v6/V6List";
import { V6Open, type OpenMode } from "./v6/V6Open";
import { V6Compare, type Scale } from "./v6/V6Compare";
import "./versionsV2.css";
import "./versionsV2.app.css";
import "./v6/versionsV6.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const SCROLLS = "/images/versions/versions-scrolls-hawk.webp";

/* ⚠️ A REVIEW AID FOR THE FREE STATE, DEV BUILDS ONLY (as v1): with founding access on, no account is locked, so the
   lock is reachable on dev through `sessionStorage["sa.dev.versionsFree"] = "1"`. MODE is statically replaced, so a
   production build carries none of this. */
const reviewFree = (): boolean => {
  if (import.meta.env.MODE === "production") return false;
  try { return sessionStorage.getItem("sa.dev.versionsFree") === "1"; } catch { return false; }
};

type Modal = { kind: "picker"; mode: PickerMode } | { kind: "how" } | { kind: "map" } | null;

/** Bring an element to the top of the visible page scroller, under the slim bar (its scroll-margin-top). */
const scrollToEl = (el: HTMLElement | null) => { if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

export const VersionsV2Page: React.FC<{ onNavigate: (tab: string, subPage?: string) => void; active?: boolean }> = ({ onNavigate, active = true }) => {
  const db = useScriptAllyDb();
  const { manuscripts, packages, queries, activities, agents, versions: materials, currentUser, collectionsReady, writeVersionChange, updateUserPaths } = db;
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const stored = useMemo(() => { try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; } }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, stored), [manuscripts, stored]);
  const locked = reviewFree() || !versionsUnlocked(db.entitlement);
  /* the band says "You have full access as a founding writer": only true of a founding writer, so only they see it */
  const founding = db.entitlement?.basis === "founding";

  const msQueries = useMemo(() => (ms ? (queries as Query[]).filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const rows = useMemo(() => new Map(buildRows(msQueries, activities, agents as Agent[], Date.now()).map((r) => [r.id, r])), [msQueries, activities, agents]);
  const m = useMemo(() => versionsModel(ms, msQueries, packages, materials, rows), [ms, msQueries, packages, materials, rows]);
  const agentById = useMemo(() => new Map((agents as Agent[]).map((a) => [a.id, a])), [agents]);
  const fresh = m.versions.length === 0;

  const [modal, setModal] = useState<Modal>(null);
  const [mode, setMode] = useState<OpenMode>({ kind: "view" });
  const [picked, setPicked] = useState<string | null>(null);
  const [sort, setSort] = useState<ListSort>("new");
  const [measure, setMeasure] = useState<MeasureKey>("rate");
  const [scale, setScale] = useState<Scale>("own");
  const [arch, setArch] = useState(false);
  const [stamp, setStamp] = useState(false);
  const deskRef = useRef<HTMLDivElement>(null);
  const mapBtn = useRef<HTMLButtonElement>(null);

  /* the page opens on the version in use; a pick holds until it stops existing (an Undo of its save, say) */
  const sel = picked && m.versions.some((v) => v.id === picked) ? picked : m.inUse ?? m.live[m.live.length - 1]?.id ?? null;
  const selV = sel ? m.versions.find((v) => v.id === sel) ?? null : null;
  useEffect(() => { setArch(false); }, [sel]);
  useEffect(() => { if (!stamp) return; const t = window.setTimeout(() => setStamp(false), 400); return () => window.clearTimeout(t); }, [stamp]);

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
    const q = (s: string) => page?.querySelector<HTMLElement>(s) ?? null;
    const onScreen = (e: HTMLElement | null) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
    const titleBtn = q('[data-wsnh-page="versions"] [data-vv2="new"]');
    const first = q('[data-vv6="first"]');
    const rowsEl = [...(page?.querySelectorAll<HTMLElement>('[data-vv6="row"]') ?? [])];
    const el = k === "add" ? (first && !onScreen(titleBtn) && onScreen(first) ? first : titleBtn)
      : k === "edit" ? q('[data-vv6="edit"]')
        : k === "use" ? q('[data-vv6="use"]') ?? rowsEl.find((r) => !r.querySelector('[data-vv6="in-use-tag"]')) ?? null
          : rowsEl.find((r) => !r.querySelector(".v6-row-f > em")) ?? rowsEl[0] ?? null;
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

  const openForm = (edit: string | null) => {
    if (locked || !ms) return;
    setMode({ kind: "form", edit });
    setArch(false);
    window.setTimeout(() => scrollToEl(deskRef.current), 30);
  };

  const onSave = async (s: FormSave) => {
    if (!ms || mode.kind !== "form") return;
    const editId = mode.edit;
    if (editId) {
      const sent = hasGoneOut(m, editId);
      const before = await write(editVersion(ms, editId, { name: s.name, changes: s.changes, wordCount: s.wordCount, ...(sent || !s.parentId ? {} : { parentId: s.parentId }) }, sent));
      if (!before) return;
      setMode({ kind: "view" });
      tick("edit");
      showToast({ message: `Saved ${s.name}.`, undo: async () => { await writeVersionChange(ms.id, before); } });
      return;
    }
    const first = m.versions.length === 0;
    const id = newBookVersionId();
    const earlier = m.sentTotal;
    const before = await write(saveNewVersion(ms, { name: s.name, changes: s.changes, wordCount: s.wordCount, parentId: s.parentId }, today(), { version: id, original: newBookVersionId() }));
    if (!before) return;
    setMode({ kind: "view" });
    setPicked(id);
    tick("add");
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
    setStamp(true);
    const nv = m.versions.find((v) => v.id === id);
    showToast({ message: `${nv?.name} is now in use for new queries. Queries already sent don’t change.`, undo: async () => { await writeVersionChange(ms.id, before); } });
  };

  const onArchive = async (id: string) => {
    if (!ms) return;
    const v = m.versions.find((x) => x.id === id);
    if (!v) return;
    const before = await write(archiveVersion(ms, id, today(), m.inUse));
    setArch(false);
    if (!before) return;
    setPicked(null);
    showToast({ message: `${v.name} archived.`, undo: async () => { await writeVersionChange(ms.id, before); setPicked(id); } });
  };

  const onBringBack = async (id: string) => {
    if (!ms) return;
    const v = m.versions.find((x) => x.id === id);
    const before = await write(bringBackVersion(ms, id));
    if (!before) return;
    showToast({ message: `${v?.name} is back in your comparisons.`, undo: async () => { await writeVersionChange(ms.id, before); } });
  };

  const onPicked = async (picks: Map<string, string | null>, pm: PickerMode) => {
    if (!ms || locked) return;
    const entries = [...picks];
    const before = entries.map(([qid]) => ({ id: qid, bookVersionId: (msQueries.find((q) => q.id === qid)?.bookVersionId ?? null) as string | null }));
    const after = entries.map(([qid, vid]) => ({ id: qid, bookVersionId: vid ?? VERSION_NOT_SURE }));
    const ok = await writeVersionChange(ms.id, null, { queries: after });
    if (!ok) { showToast({ message: "That didn’t save. Check your connection and try again." }); return; }
    setModal(null);
    const undo = async () => { await writeVersionChange(ms.id, null, { queries: before }); };
    if (pm.kind === "change") {
      const who = agentLine(pm.q, agentById).name;
      const to = entries[0][1] ? m.versions.find((v) => v.id === entries[0][1]) : null;
      showToast({ message: to ? `${who} now counts towards ${to.name}.` : `${who} is out of the comparison until you choose a version.`, undo });
    } else {
      const n = after.length;
      showToast({ message: `${n} ${n === 1 ? "query now counts" : "queries now count"} towards ${n === 1 ? "its" : "their"} version.`, undo });
    }
  };

  /** Open a version on the page (from the list, the map or a comparison card); `far` brings the desk into view. */
  const select = (id: string, far = false) => {
    if (locked) return;
    setPicked(id);
    setMode({ kind: "view" });
    if ((m.facts.get(id)?.n ?? 0) > 0) tick("check");
    if (far) window.setTimeout(() => scrollToEl(deskRef.current), 30);
  };
  const openPicker = () => { if (!locked && m.unrecorded.length) setModal({ kind: "picker", mode: { kind: "assign" } }); };
  const formClose = () => setMode({ kind: "view" });
  const formDetails = () => { setMode({ kind: "view" }); onNavigate("manuscripts"); };

  const attrs = { "data-page": "v", "data-tier": locked ? "free" : "pro", "data-ms": fresh ? "fresh" : "full" };
  const state = !collectionsReady ? "loading" : locked ? "locked" : fresh ? (msQueries.length ? "pre" : "fresh") : "filled";
  const inUseV = !fresh ? m.versions.find((v) => v.id === m.inUse) ?? null : null;
  const newLabel = fresh ? "Save your first version" : "New version";
  const un = m.unrecorded.length;
  const noop = () => {};

  return (
    <WorkspacePageGrid className="vv2-wpg" masthead={null} scrollLabel="Versions">
      <div className="vv2 vv6" data-vv2="page" data-state={state} {...attrs}>
        {ms && collectionsReady ? (
          <PageChecklist page="Versions" items={VERSIONS_CHECKLIST} done={doneMap} seen={guide.seen} hidden={guide.hidden}
            active={active && !locked} ready={collectionsReady} targetFor={targetFor} art={SCROLLS} disabled={disabled}
            onSeen={() => { if (!guide.seen) void updateUserPaths(VERSIONS_GUIDE_SEEN_PATH); }}
            onHide={() => { void updateUserPaths(VERSIONS_GUIDE_HIDDEN_PATH); }}
            onUnhide={() => { void updateUserPaths(VERSIONS_GUIDE_UNHIDE_PATH); }}
            quiet={!!modal} empty={fresh} />
        ) : null}
        <div className="ms25">
          <WorkspaceNavyHeader page="versions" art="versions-header" loading={!collectionsReady}
            title="Versions"
            forLine={ms ? { lead: "of", text: ms.title } : null}
            actions={<>
              <button type="button" className="qc1531-b qc1531-b--n" data-vv2="new" disabled={!ms || locked} onClick={() => openForm(null)}>{newLabel}</button>
              <button type="button" className="qc1531-b qc1531-b--g" data-vv2="how" onClick={() => setModal({ kind: "how" })}>How it works</button>
            </>}
            right={!fresh && !locked ? <MapBlock ref={mapBtn} count={m.versions.length} inUse={inUseV?.name ?? null} onOpen={() => setModal({ kind: "map" })} /> : null}
            bar={ms ? {
              title: "Versions",
              aside: inUseV ? <><em>In use</em><b data-vv6="slim-inuse">{inUseV.name}</b></> : null,
              button: { label: newLabel, onClick: () => openForm(null), disabled: locked },
            } : null} />

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
              <div className="v6-top" data-vv6="top">
                {founding && !locked ? <V6Founding /> : null}
                {!fresh && un ? (
                  <V6Notice probe="notice" title={`${un} ${un === 1 ? "query has" : "queries have"} no version recorded`}
                    text={`${un === 1 ? "It isn’t" : "They aren’t"} counted on this page until you assign one.`} action="Assign versions" onAction={openPicker} />
                ) : null}
              </div>

              {ms && !fresh ? (
                <>
                  <div className={`v6-desk${un ? " after-notice" : ""}`} id="v6-desk" ref={deskRef} data-vv6="desk">
                    <V6List m={m} sel={mode.kind === "view" ? sel : null} sort={sort} stamp={stamp} locked={locked} onSort={() => setSort((s) => (s === "new" ? "best" : "new"))}
                      onSelect={(id) => select(id)} onNew={() => openForm(null)} onBringBack={(id) => void onBringBack(id)} />
                    <V6Open ms={ms} m={m} v={selV} mode={mode} agents={agentById} locked={locked} arch={arch}
                      onUse={(id) => void onUse(id)} onEdit={(id) => openForm(id)} onArchAsk={setArch} onArchive={(id) => void onArchive(id)}
                      onMap={() => setModal({ kind: "map" })} onCloseForm={formClose} onSave={(s) => void onSave(s)} onDetails={formDetails} />
                  </div>
                  <V6Compare m={m} sel={sel} measure={measure} scale={scale} onMeasure={setMeasure} onScale={setScale} onPick={(id) => select(id, true)} />
                </>
              ) : null}

              {ms && fresh && collectionsReady ? (
                mode.kind === "form" ? (
                  <div className="v6-desk solo" id="v6-desk" ref={deskRef} data-vv6="desk">
                    <V6Open ms={ms} m={m} v={null} mode={mode} agents={agentById} locked={locked} arch={false}
                      onUse={noop} onEdit={noop} onArchAsk={noop} onArchive={noop} onMap={noop}
                      onCloseForm={formClose} onSave={(s) => void onSave(s)} onDetails={formDetails} />
                  </div>
                ) : (
                  <div className="v6-first" data-vv6="day-one">
                    <V6Frame tone="sand" probe="how" band={<h2 className="v6-bt">How it works</h2>}>
                      <div className="v6-pad">
                        <ol className="v6-steps">
                          <li><b>Save a version</b>Name it and note what you changed in the manuscript.</li>
                          <li><b>Pick it when you log a query</b>The query records which version you sent.</li>
                          <li><b>Compare the results</b>See how many agents asked for more with each version.</li>
                        </ol>
                        <p className="v6-first-go"><button type="button" className="v6-pill v6-pill--navy" data-vv6="first" disabled={locked} onClick={() => openForm(null)}>Save your first version</button></p>
                      </div>
                    </V6Frame>
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>

        <Layer attrs={attrs}>
          <ModalShell open={modal?.kind === "how"} kind="m" onClose={() => setModal(null)} vv="how">
            <Explainer onClose={() => setModal(null)} onNew={() => { setModal(null); openForm(null); }} />
          </ModalShell>
          <ModalShell open={modal?.kind === "picker"} kind="p" onClose={() => setModal(null)} vv="picker" k={modal}>
            {modal?.kind === "picker" ? <Picker mode={modal.mode} m={m} agents={agentById} onClose={() => setModal(null)} onSave={(p) => void onPicked(p, modal.mode)} /> : null}
          </ModalShell>
          <ModalShell open={modal?.kind === "map"} kind="map" onClose={() => setModal(null)} vv="map">
            {modal?.kind === "map" && ms ? (
              <div className="vv6" data-vv6="map">
                <div className="v6-mhd">
                  <h2 id="msTH">How your versions connect</h2>
                  <p>Each version is shown to the right of the one it started from. The coloured line leads to the version in use.</p>
                  <button type="button" className="cx-x v6-mx" aria-label="Close" data-first="" data-vv6="map-close" onClick={() => setModal(null)}><XMark /></button>
                </div>
                <div className="v6-mbd"><V2Tree ms={ms} m={m} bare onOpen={(id) => { setModal(null); select(id); }} /></div>
              </div>
            ) : null}
          </ModalShell>
        </Layer>
      </div>
    </WorkspacePageGrid>
  );
};
