/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS v1 — /manuscripts/versions ═══════════════════════════════════════════════════════════
 *
 * Design authority: design-refs/versions-v1/versions-v1.html (look and behaviour; its data is invented). It
 * replaces v27 Part E's interim page (`manuscripts/v27/VersionsPage`, still in the tree, mounted nowhere).
 *
 * The page: the header (Contact-list light grammar: hawk, eyebrow, "{n} versions on file", "of {title}", the
 * active-version card on the right) → the warning banner (live queries that reach no version) → the version
 * list → the comparison (a thin banner, Responses-style cards, the league). Every figure is `lib/versionsPage`.
 *
 * ⚠️ PRO, AND FOUNDING MEMBERS IN FULL: `versionsUnlocked` (lib/entitlements). Locked, the page renders inert and
 *    blurred under the lock card and writes nothing.
 * ⚠️ THE ACTIVE VERSION IS THE ACTIVE PACKAGE'S VERSION. Change makes a live package stating the chosen version the
 *    active package (`setActivePackage`) and Undo puts back the previous `activePackageId` exactly (a snapshot,
 *    never an inverse). With no package stating it, Change opens Submission packages' package form with that version
 *    chosen (`?new=1&version={id}`), as every "Add to a package" does.
 * ⚠️ STATUS IS ALWAYS THE REAL StatusDot. Positive is navy; rust is only eyebrows, the blush strip and the discs.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import type { Agent, BookVersion, BookVersionKind, Manuscript, Query } from "../../types";
import { QueryStatus } from "../../types";
import { scopedManuscript } from "../../lib/manuscriptSummary";
import { appendBookVersion, bookVersionsOf, newBookVersionId, renameBookVersion, KIND_LABEL } from "../../lib/bookVersions";
import { buildRows } from "../../lib/analytics";
import { versionsUnlocked, VERSIONS_FOUNDING_ACCESS } from "../../lib/entitlements";
import { agentPrimary } from "../../lib/agentDisplay";
import { openQueryPanel } from "../../lib/queryPanelStore";
import { STAGE_NAME } from "../../lib/qcSummary";
import { ESC_LEVEL } from "../../lib/escapeStack";
import { MONTHS_SHORT } from "../../lib/dates";
import {
  activeVersionId, bannerLead, cardOrder, headerTitle, insightSay, kindLine, leader, leagueLead, leagueSort,
  isLive, numbered, packageForVersion, unversionedLive, versionStats, MIN_SENDS_FOR_CLAIM,
  type LeagueKey, type NumberedVersion, type VersionStats,
} from "../../lib/versionsPage";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { HalfDrawer } from "../shell/HalfDrawer";
import { useDismissable } from "../shell/useDismissable";
import { StatusDot } from "../StatusDot";
import { AgentDisc } from "../shared/AgentDisc";
import heroArt from "../../assets/manuscripts/hero-archivist.png";
import "../manuscripts/v12/msv12.css";
import "../manuscripts/v27/msv27.css";
import "./versionsV1.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/* ⚠️ A REVIEW AID FOR THE FREE STATE, DEV BUILDS ONLY: with founding access on, no account is locked, so the lock
   card is reachable on dev through `sessionStorage["sa.dev.versionsFree"] = "1"`. The MODE check is statically
   replaced, so a production build carries none of this. */
const reviewFree = (): boolean => {
  if (import.meta.env.MODE === "production") return false;
  try { return sessionStorage.getItem("sa.dev.versionsFree") === "1"; } catch { return false; }
};

/* the app's one month table (lib/dates); the day is read off the stored "YYYY-MM-DD" so no zone can move it */
const MONTHS = MONTHS_SHORT;
const dayOf = (iso: string): string => { const [, m, d] = iso.split("-").map(Number); return m && d ? `${d} ${MONTHS[m - 1]}` : iso; };
const longDay = (iso: string): string => { const [y, m, d] = iso.split("-").map(Number); return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso; };
const msDay = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const pct = (n: number | null): string => (n == null ? "–" : `${Math.round(n)}%`);
const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const HOT = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.REVISE_RESUBMIT]);

const Doc = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M5 2.5h7l3 3v12H5z" /><path d="M8 9h5M8 12h5" />
  </svg>
);
const XMark = () => (<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>);

/* ══ the page ══════════════════════════════════════════════════════════════════════════════════ */

export const VersionsV1Page: React.FC<{ onNavigate: (tab: string, subPage?: string) => void }> = ({ onNavigate }) => {
  const db = useScriptAllyDb();
  const { manuscripts, packages, queries, activities, agents, currentUser, collectionsReady, updateManuscript, setActivePackage } = db;
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const stored = useMemo(() => { try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; } }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, stored), [manuscripts, stored]);
  const locked = reviewFree() || !versionsUnlocked(currentUser, VERSIONS_FOUNDING_ACCESS);

  const msQueries = useMemo(() => (ms ? (queries as Query[]).filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const msPackages = useMemo(() => (ms ? packages.filter((p) => p.manuscriptId === ms.id) : []), [ms, packages]);
  const rows = useMemo(() => new Map(buildRows(msQueries, activities, agents as Agent[], Date.now()).map((r) => [r.id, r])), [msQueries, activities, agents]);
  const nvs = useMemo(() => numbered(ms), [ms]);
  const stats = useMemo(() => versionStats(nvs, msPackages, msQueries, rows), [nvs, msPackages, msQueries, rows]);
  const activeId = useMemo(() => activeVersionId(ms, msPackages), [ms, msPackages]);
  const lead = useMemo(() => leader(stats), [stats]);
  const unversioned = useMemo(() => unversionedLive(msQueries, msPackages), [msQueries, msPackages]);
  const agentById = useMemo(() => new Map((agents as Agent[]).map((a) => [a.id, a])), [agents]);
  const sentCount = stats.filter((s) => s.split.sent > 0).length;

  const [form, setForm] = useState<null | { edit: BookVersion | null }>(null);
  const [open, setOpen] = useState<string | null>(null);
  const openFrom = useRef<HTMLElement | null>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const openInsights = (id: string, from: HTMLElement | null) => { openFrom.current = from; setOpen(id); };
  const closeInsights = useCallback(() => {
    setOpen(null);
    const el = openFrom.current;
    requestAnimationFrame(() => el?.focus());
  }, []);

  /* the package form, opened with this version chosen (Submission packages reads ?new=1&version={id}) */
  const goPackages = (versionId: string) => navigate(`/manuscripts/packages?new=1&version=${encodeURIComponent(versionId)}`);
  const assign = () => { if (unversioned[0]) openQueryPanel(unversioned[0].id, "other"); };

  const pick = async (v: NumberedVersion) => {
    if (!ms || locked) return;
    const pkg = packageForVersion(ms, v.v.id, msPackages);
    if (!pkg) {
      showToast({ message: `No package holds ${v.v.name} yet. Here’s a new one with it chosen.` });
      goPackages(v.v.id);
      return;
    }
    const before = ms.activePackageId ?? "";
    if (before === pkg.id) return;
    await setActivePackage(ms.id, pkg.id);
    showToast({
      message: `${v.v.name} now goes out with new queries.`,
      undo: async () => { await setActivePackage(ms.id, before); },
    });
  };

  const fresh = nvs.length === 0;
  const activeNv = nvs.find((n) => n.v.id === activeId) ?? null;
  const statOf = (id: string) => stats.find((s) => s.nv.v.id === id)!;

  const body = !ms ? null : fresh ? (
    <FirstVersion onNew={() => setForm({ edit: null })} />
  ) : (
    <>
      {unversioned.length > 0 ? (
        <WarnBanner qs={unversioned} agentById={agentById} onAssign={assign} />
      ) : null}
      <section className="ver1-sec" aria-labelledby="ver1-lh">
        <div className="ver1-sech">
          <h2 id="ver1-lh">{nvs.length === 1 ? "1 version saved" : `${nvs.length} versions saved`}</h2>
          <span className="ver1-tag">Newest first</span>
          <span className="ver1-sp" />
          <span className="ver1-hint">Click a version to see how it’s doing.</span>
        </div>
        <VersionList stats={stats} activeId={activeId} leadId={lead?.nv.v.id ?? null}
          onOpen={openInsights} onEdit={(v) => setForm({ edit: v })} onAdd={goPackages} />
      </section>
      {sentCount >= 1 ? (
        <div ref={compareRef} id="ver1-compare">
          <Comparison stats={stats} activeId={activeId} lead={lead} saved={nvs.length} sentCount={sentCount}
            unversioned={unversioned.length} onSee={(id, el) => openInsights(id, el)} onAdd={goPackages} onAssign={assign} />
        </div>
      ) : null}
    </>
  );

  const header = !ms ? null : (
    <header className="ms27-mh ms27-mh--ver ver1-mh" data-ver1="header" data-own-header="">
      <img className="ms27-mh-art" src={heroArt} alt="" aria-hidden="true" />
      <div className="ms27-mh-t">
        <p className="ms27-mh-k" data-ver1="eyebrow">— Versions —</p>
        <h1 className="ms27-h1" data-page-title="" data-ver1="title">{headerTitle(nvs.length)}</h1>
        <p className="ms27-mh-by" data-ver1="of"><i aria-hidden="true" /><em>of</em> {ms.title}<i aria-hidden="true" /></p>
        <div className="ms27-mh-b">
          <button type="button" className="ms27-p1" data-ver1="new" onClick={() => setForm({ edit: null })} disabled={locked}>+ New version</button>
          {sentCount >= 2 ? (
            <button type="button" className="ms27-p2" data-ver1="compare" disabled={locked}
              onClick={() => compareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Compare</button>
          ) : null}
          <button type="button" className="ver1-hw" aria-label="How version tracking works" onClick={() => navigate("/help")}><i aria-hidden="true">?</i></button>
        </div>
      </div>
      <div className="ms27-mh-r ver1-mh-r">
        {fresh ? (
          <div className="ver1-ring" data-ver1="ring">
            <button type="button" className="ver1-rg" onClick={() => setForm({ edit: null })} disabled={locked}>
              <svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" fill="none" stroke="#ece6dc" strokeWidth="9" /><text x="42" y="50" textAnchor="middle" fontSize="23" fill="#1c130f">0</text></svg>
              <b>Versions saved<small>Save one to start tracking</small></b>
            </button>
          </div>
        ) : (
          <ActiveCard active={activeNv} versions={nvs} statOf={statOf} disabled={locked} onPick={pick} />
        )}
      </div>
    </header>
  );

  return (
    <WorkspacePageGrid className="msv12-wpg ver1-wpg" masthead={null} scrollLabel="Versions">
      <div className="msv12-own msv12-root ms27 ver1" data-ver1="page"
        data-state={!ms ? (collectionsReady ? "no-manuscript" : "loading") : locked ? "locked" : fresh ? "fresh" : "filled"}>
        {!ms ? (collectionsReady ? (
          <div className="ver1-none" data-ver1="no-manuscript">
            <p>Versions belong to a manuscript. Add yours first.</p>
            <button type="button" className="ver1-b p" onClick={() => onNavigate("manuscripts")}>Go to Manuscripts</button>
          </div>
        ) : null) : locked ? (
          <div className="ver1-lockwrap" data-ver1="locked">
            <div className="ver1-under" aria-hidden="true" inert={true}>{header}{body}</div>
            <LockCard title={ms.title} onPlans={() => navigate("/plans")} />
          </div>
        ) : (
          <>{header}{body}</>
        )}
      </div>
      {!locked && ms && open ? (
        <Insights s={statOf(open)} lead={lead} msTitle={ms.title} active={open === activeId} packages={msPackages}
          agentById={agentById} rows={rows} onClose={closeInsights} onAdd={() => { const id = open; closeInsights(); goPackages(id); }}
          onEdit={() => { const v = statOf(open).nv.v; closeInsights(); setForm({ edit: v }); }} />
      ) : null}
      {!locked && ms && form ? (
        <VersionForm ms={ms} edit={form.edit} nvs={nvs} statOf={statOf} updateManuscript={updateManuscript}
          onClose={() => setForm(null)} onSaved={(m) => showToast({ message: m })} />
      ) : null}
    </WorkspacePageGrid>
  );
};

/* ══ the active-version card and its Change menu ═══════════════════════════════════════════════ */

const ActiveCard: React.FC<{
  active: NumberedVersion | null; versions: NumberedVersion[]; statOf: (id: string) => VersionStats;
  disabled: boolean; onPick: (v: NumberedVersion) => void;
}> = ({ active, versions, statOf, disabled, onPick }) => {
  const [menu, setMenu] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <div className="ver1-avc" data-ver1="active-card">
      <header className="ver1-avc-s"><span>Active version</span><span>{active ? `Version ${active.n}` : ""}</span></header>
      <div className="ver1-avc-v">
        {active ? <span className="ver1-avc-d">{active.n}</span> : null}
        <div>
          <b data-ver1="active-name">{active ? active.v.name : "None yet"}</b>
          <i>{active ? "Goes out with new queries by default" : "Choose one for new queries"}</i>
        </div>
      </div>
      <footer className="ver1-avc-f">
        <button ref={btn} type="button" className="ver1-avc-b" data-ver1="change" aria-haspopup="menu" aria-expanded={menu}
          disabled={disabled} onClick={() => setMenu((m) => !m)}>
          Change<svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </footer>
      {menu ? (
        <ChangeMenu anchor={btn} versions={versions} activeId={active?.v.id ?? null} statOf={statOf}
          onClose={() => setMenu(false)} onPick={(v) => { setMenu(false); onPick(v); }} />
      ) : null}
    </div>
  );
};

/**
 * ⚠️ PORTALLED TO <body> AND PLACED FROM THE BUTTON'S RECT: the header clips. So its colours are literals (or
 * `:root` values) — no page-scoped token reaches it out there.
 */
const ChangeMenu: React.FC<{
  anchor: React.RefObject<HTMLButtonElement | null>; versions: NumberedVersion[]; activeId: string | null;
  statOf: (id: string) => VersionStats; onClose: () => void; onPick: (v: NumberedVersion) => void;
}> = ({ anchor, versions, activeId, statOf, onClose, onPick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useDismissable(true, ref, onClose, { level: ESC_LEVEL.page, ignore: (t) => !!anchor.current?.contains(t) });
  useEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const width = 320;
      const left = Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12));
      setPos({ top: r.bottom + 8, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor]);
  useEffect(() => { requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>("[aria-checked=true], button")?.focus()); }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} className="ver1-menu" role="menu" aria-label="Choose the active version" data-ver1="change-menu"
      style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: "hidden" }}>
      {versions.map((nv) => {
        const s = statOf(nv.v.id);
        const on = nv.v.id === activeId;
        return (
          <button key={nv.v.id} type="button" role="menuitemradio" aria-checked={on} data-ver1-opt={nv.v.id} onClick={() => onPick(nv)}>
            <span className={`ver1-mn${on ? " on" : ""}`}>{nv.n}</span>
            <span><b>{nv.v.name}</b><small>{s.split.sent ? `${s.split.sent} sent · ${s.askedPct}% asked for more` : "Not sent yet"}</small></span>
            {on ? <i aria-hidden="true">✓</i> : null}
          </button>
        );
      })}
    </div>,
    document.body,
  );
};

/* ══ the warning banner ════════════════════════════════════════════════════════════════════════ */

const WarnBanner: React.FC<{ qs: Query[]; agentById: Map<string, Agent>; onAssign: () => void }> = ({ qs, agentById, onAssign }) => (
  <div className="ver1-wb" role="status" data-ver1="banner" data-count={qs.length}>
    <span className="ver1-wb-i" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2v.1" /></svg>
    </span>
    <div className="ver1-wb-t">
      <p className="ver1-wb-h"><b>{bannerLead(qs.length)} out with agents</b> without a version assigned.</p>
      <p className="ver1-wb-s">Until you say which version went, their replies don’t count towards any version.</p>
    </div>
    <span className="ver1-wb-g">
      {qs.slice(0, 4).map((q) => {
        const a = agentById.get(q.agentId);
        const name = a ? agentPrimary(a) : "Agent";
        return <AgentDisc key={q.id} initials={initials(name)} standing="querying" size={32} title={name} />;
      })}
    </span>
    <button type="button" className="ver1-wb-b" data-ver1="assign" onClick={onAssign}>Assign versions</button>
  </div>
);

/* ══ the version list ══════════════════════════════════════════════════════════════════════════ */

const Glyphs: React.FC<{ s: VersionStats; size?: number }> = ({ s, size = 18 }) => (
  <span className="ver1-qg" data-ver1="glyphs">
    {s.groups.map((g) => (
      <span key={g.title} className={`g${g.closed ? " cl" : ""}`} title={g.title} data-n={g.n}>
        <StatusDot status={g.status} overrideSize={size} decorative /><b>{g.n}</b>
      </span>
    ))}
  </span>
);

const RowMenu: React.FC<{ name: string; onEdit: () => void; onAdd: () => void }> = ({ name, onEdit, onAdd }) => {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useDismissable(open, wrap, () => setOpen(false), { level: ESC_LEVEL.page });
  return (
    <span className="ver1-rm" ref={wrap} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" className="ver1-vm-b" aria-haspopup="menu" aria-expanded={open} aria-label={`More for ${name}`} onClick={() => setOpen((o) => !o)}>•••</button>
      {open ? (
        <span className="ver1-rmm" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit(); }}>Edit</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onAdd(); }}>Add to a package</button>
        </span>
      ) : null}
    </span>
  );
};

const VersionList: React.FC<{
  stats: VersionStats[]; activeId: string | null; leadId: string | null;
  onOpen: (id: string, el: HTMLElement) => void; onEdit: (v: BookVersion) => void; onAdd: (versionId: string) => void;
}> = ({ stats, activeId, leadId, onOpen, onEdit, onAdd }) => (
  <div className="ver1-vl" data-ver1="list">
    <div className="ver1-vl-h" data-ver1="list-head">
      <span>Version</span><span>Saved</span><span>Sent</span><span>Where they stand</span><span className="r">Asked for more</span><span />
    </div>
    {stats.map((s) => {
      const use = s.nv.v.id === activeId;
      return (
        <div key={s.nv.v.id} className={`ver1-vl-r${use ? " use" : ""}`} data-ver1="row" data-version={s.nv.v.id} data-sent={s.split.sent}
          data-live={s.queries.filter(isLive).length}
          tabIndex={0} role="button" aria-label={`${s.nv.v.name}. Open details`}
          onClick={(e) => onOpen(s.nv.v.id, e.currentTarget)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(s.nv.v.id, e.currentTarget); } }}>
          <span className="ver1-vl-id">
            <span className="ver1-vn">{s.nv.n}</span>
            <span>
              <b>{s.nv.v.name}</b>
              {use ? <em className="ver1-use">In use</em> : null}
              {leadId === s.nv.v.id ? <em className="ver1-best">Landing best</em> : null}
              <small>{kindLine(s.nv)}</small>
            </span>
          </span>
          <span className="ver1-vl-d">{dayOf(s.nv.v.createdDate)}</span>
          <span className="ver1-vl-d" data-ver1="sent">{s.split.sent || "–"}</span>
          <span className="ver1-vl-dots">{s.split.sent ? <Glyphs s={s} /> : <em>Not sent yet</em>}</span>
          <span className="ver1-vl-p">
            {s.split.sent ? (
              <><b>{s.askedPct}<small>%</small></b><small>{s.split.requests} of {s.split.sent}</small></>
            ) : (
              <button type="button" className="ver1-lnk" data-ver1="add-row" onClick={(e) => { e.stopPropagation(); onAdd(s.nv.v.id); }}>Add to a package</button>
            )}
          </span>
          <span className="ver1-vl-a"><RowMenu name={s.nv.v.name} onEdit={() => onEdit(s.nv.v)} onAdd={() => onAdd(s.nv.v.id)} /></span>
        </div>
      );
    })}
  </div>
);

/* ══ the insights drawer ═══════════════════════════════════════════════════════════════════════ */

const Insights: React.FC<{
  s: VersionStats; lead: VersionStats | null; msTitle: string; active: boolean; packages: { id: string; packageName: string; bookVersionId?: string; status?: string }[];
  agentById: Map<string, Agent>; rows: Map<string, { replyDays: number | null; sentMs: number | null }>;
  onClose: () => void; onAdd: () => void; onEdit: () => void;
}> = ({ s, lead, active, packages, agentById, rows, onClose, onAdd, onEdit }) => {
  const v = s.nv.v;
  const holding = packages.filter((p) => p.bookVersionId === v.id && p.status !== "Retired");
  const pkgLine = holding.length ? `In ${holding.map((p) => p.packageName).join(", ")}` : "In no package yet";
  const sent = [...s.queries].sort((a, b) => (rows.get(b.id)?.sentMs ?? 0) - (rows.get(a.id)?.sentMs ?? 0));
  /* the drawer takes focus on open (its Done button), and the page returns it to the row on close */
  useEffect(() => {
    const id = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-ver1="done"]')?.focus());
    return () => cancelAnimationFrame(id);
  }, [v.id]);
  return (
    <HalfDrawer probe="ver-insights" open onClose={onClose} label={`${v.name}: how it’s doing`} width="min(640px, 54vw)"
      head={(
        <div className="ver1-dh">
          <span className="ver1-disc"><Doc /></span>
          <div className="ver1-dtx">
            <h3>{v.name}</h3>
            <small>Version {s.nv.n} · {KIND_LABEL[v.kind]} · saved {longDay(v.createdDate)}{active ? " · in use" : ""}</small>
          </div>
          <button type="button" className="ver1-x" aria-label="Close" onClick={onClose}><XMark /></button>
        </div>
      )}
      foot={(
        <div className="ver1-df">
          <span><button type="button" className="ver1-lnk" onClick={onAdd}>Add to a package</button></span>
          <div className="ver1-bt">
            <button type="button" className="ver1-b g" onClick={onEdit}>Edit</button>
            <button type="button" className="ver1-b p" data-ver1="done" onClick={onClose}>Done</button>
          </div>
        </div>
      )}>
      <div className="ver1-db" data-ver1="insights" data-version={v.id}>
        <p className={`ver1-say${s.split.sent ? "" : " q"}`} data-ver1="say">{insightSay(s, lead)}</p>
        <div className="ver1-k">
          <div><b>{s.split.sent}</b><span>Sent</span></div>
          <div><b>{s.split.sent ? s.split.replies : "–"}</b><span>Replied</span></div>
          <div><b>{s.split.sent ? s.split.requests : "–"}</b><span>Asked for more</span></div>
          <div><b>{s.avgReply != null ? `${s.avgReply}d` : "–"}</b><span>Average reply</span></div>
        </div>
        <h5>What changed</h5>
        {v.note ? <p className="ver1-why">{v.note}</p> : <p className="ver1-why none">No note.</p>}
        <p className="ver1-m">{[s.nv.parent ? `From ${s.nv.parent.name}` : "First version", v.wordCount ? `${v.wordCount.toLocaleString("en-GB")} words` : null, pkgLine].filter(Boolean).join(" · ")}</p>
        <h5>Queries it went out with</h5>
        {sent.length ? (
          <div className="ver1-q" data-ver1="queries">
            {sent.map((q) => {
              const a = agentById.get(q.agentId);
              const name = a ? agentPrimary(a) : "Agent";
              const r = rows.get(q.id);
              return (
                <button key={q.id} type="button" className="ver1-cq" data-ver1="query" onClick={() => { onClose(); openQueryPanel(q.id, "other"); }}>
                  <span className="ver1-av">{initials(name)}</span>
                  <span><b>{name}</b><small>{[a?.agency, r?.sentMs ? `sent ${msDay(r.sentMs)}` : null, r?.replyDays != null ? `replied in ${r.replyDays}d` : null].filter(Boolean).join(" · ")}</small></span>
                  <span className={`ver1-stt${HOT.has(q.status) ? " hot" : ""}`}><StatusDot status={q.status} overrideSize={14} decorative />{STAGE_NAME[q.status] ?? q.status}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="ver1-qe">Nothing has gone out with this version yet.</p>
        )}
      </div>
    </HalfDrawer>
  );
};

/* ══ the new / edit form ═══════════════════════════════════════════════════════════════════════ */

const KINDS: [BookVersionKind, string, string][] = [
  ["initial", "First version", "The book as it stands"],
  ["reordering", "Reordering", "Same pages, new order"],
  ["revision", "Revision", "New or rewritten pages"],
];
const londonDay = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const VersionForm: React.FC<{
  ms: Manuscript; edit: BookVersion | null; nvs: NumberedVersion[]; statOf: (id: string) => VersionStats;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  onClose: () => void; onSaved: (m: string) => void;
}> = ({ ms, edit, nvs, statOf, updateManuscript, onClose, onSaved }) => {
  const existing = bookVersionsOf(ms);
  const first = existing.length === 0;
  const [kind, setKind] = useState<BookVersionKind>(edit ? edit.kind : first ? "initial" : "reordering");
  const [name, setName] = useState(edit?.name ?? "");
  const [note, setNote] = useState(edit?.note ?? "");
  const [words, setWords] = useState(edit?.wordCount ? edit.wordCount.toLocaleString("en-GB") : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = edit ? nvs.find((x) => x.v.id === edit.id)?.n ?? 0 : nvs.length + 1;
  const sent = edit ? statOf(edit.id).split.sent > 0 : false;
  const ok = name.trim().length > 0;

  const save = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr(null);
    const count = Number(words.replace(/[^\d]/g, "")) || null;
    const next = edit
      ? renameBookVersion(existing, edit.id, name, note)
      : appendBookVersion(existing, {
          id: newBookVersionId(), name: name.trim(), kind: first ? "initial" : kind, createdDate: londonDay(new Date()),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(count ? { wordCount: count } : {}),
        });
    try { await updateManuscript(ms.id, { bookVersions: next }); }
    catch { setErr("That didn’t save. Nothing was recorded."); setBusy(false); return; }
    onSaved(edit ? `Saved ${name.trim()}.` : `Saved ${name.trim()}.`);
    onClose();
  };

  return (
    <HalfDrawer probe="ver-form" open onClose={onClose} label={edit ? `Edit ${edit.name}` : "Save a new version"} width="min(640px, 54vw)"
      head={(
        <div className="ver1-dh">
          <span className="ver1-disc"><Doc /></span>
          <div className="ver1-dtx"><h3>{edit ? `Edit ${edit.name}` : "Save a new version"}</h3><small>Version {n} of {ms.title}</small></div>
          <button type="button" className="ver1-x" aria-label="Close" onClick={onClose}><XMark /></button>
        </div>
      )}
      foot={(
        <div className="ver1-df">
          <span>{err ?? (edit ? "Changes save to this version only." : ok ? "Ready to save. It goes into no package until you add it." : "Give it a name to save it.")}</span>
          <div className="ver1-bt">
            <button type="button" className="ver1-b g" onClick={onClose}>Cancel</button>
            <button type="button" className="ver1-b p" data-ver1="save-version" disabled={!ok || busy} onClick={() => void save()}>{edit ? "Save changes" : "Save version"}</button>
          </div>
        </div>
      )}>
      <div className="ver1-db ver1-form" data-ver1="form">
        {edit ? (
          <p className="ver1-fix">{sent ? "This version has gone out with queries, so its kind is fixed. " : "A version’s kind is set when it’s saved. "}You can rename it and edit its note.</p>
        ) : null}
        <div className="ver1-fsec">
          <h4><span className="ver1-fn">1</span>What kind of change?</h4>
          <div className="ver1-type" role="radiogroup" aria-label="What kind of change?">
            {KINDS.filter(([k]) => (first ? k === "initial" : edit ? true : k !== "initial")).map(([k, label, sub]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} disabled={!!edit} onClick={() => setKind(k)}>
                {label}<small>{sub}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="ver1-fsec">
          <h4><span className="ver1-fn">2</span>Name it</h4>
          <label className="ver1-fld"><span>Version name <i>*</i></span>
            <input autoFocus value={name} placeholder="e.g. Prologue cut" autoComplete="off" onChange={(e) => setName(e.target.value)} /></label>
        </div>
        <div className="ver1-fsec">
          <h4><span className="ver1-fn">3</span>What changed?</h4>
          <label className="ver1-fld"><span>A line for yourself</span>
            <textarea rows={3} value={note} placeholder="e.g. Cut the prologue; opens on the ferry at dawn." onChange={(e) => setNote(e.target.value)} /></label>
          {edit ? null : (
            <label className="ver1-fld ver1-fld--w"><span>Word count <em>· optional</em></span>
              <input inputMode="numeric" value={words} placeholder="e.g. 82,400" onChange={(e) => setWords(e.target.value)} /></label>
          )}
        </div>
      </div>
    </HalfDrawer>
  );
};

/* ══ the comparison ════════════════════════════════════════════════════════════════════════════ */

const Comparison: React.FC<{
  stats: VersionStats[]; activeId: string | null; lead: VersionStats | null; saved: number; sentCount: number;
  unversioned: number; onSee: (id: string, el: HTMLElement) => void; onAdd: (versionId: string) => void; onAssign: () => void;
}> = ({ stats, activeId, lead, saved, sentCount, unversioned, onSee, onAdd, onAssign }) => {
  const [key, setKey] = useState<LeagueKey>("requests");
  const cards = cardOrder(stats);
  const league = leagueSort(stats, key);
  const ll = leagueLead(stats);
  const heads: [LeagueKey | null, string][] = [[null, "Version"], ["sent", "Sent"], [null, "Where they stand"], ["replies", "Replies"], ["rate", "Rate"], ["requests", "Requests"], ["avg", "Avg reply"]];
  return (
    <section className="ver1-band" aria-labelledby="ver1-ch">
      <div className="ver1-tb">
        <span>Which version gets agents asking for more? Every query with a version counts here.</span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3v13M4.5 10.5 10 16l5.5-5.5" /></svg>
        <h2 id="ver1-ch" className="ver1-sr">How your versions compare</h2>
      </div>
      <div className="ver1-oh">
        <p className="ver1-oh-k">Your versions</p>
        <h3>How each version is doing</h3>
        <p className="ver1-oh-s" data-ver1="lede"><b>{saved}</b> saved, <b>{sentCount}</b> sent.{lead ? <> <b>{lead.nv.v.name}</b> is getting the most agents asking for more.</> : null}</p>
      </div>
      <div className="ver1-rcs" data-ver1="cards">
        {cards.map((s) => {
          const use = s.nv.v.id === activeId;
          const isLead = lead?.nv.v.id === s.nv.v.id;
          const unsent = !s.split.sent;
          const strip = unsent ? "Not sent yet" : use ? (isLead ? "In use · Leading" : "In use") : "On file";
          const tone = unsent ? "none" : use ? "blush" : "sage";
          return (
            <article key={s.nv.v.id} className={`ver1-rc${unsent ? " u" : ""}`} data-ver1="card" data-version={s.nv.v.id}
              data-sent={s.split.sent} data-requests={s.split.requests} data-n={s.nv.n}>
              <header className={`ver1-rc-s ${tone}`}><span>{strip}</span><span>Version {s.nv.n}</span></header>
              <div className="ver1-rc-h"><span className="ver1-rc-d">{s.nv.n}</span><div><b>{s.nv.v.name}</b><i>{kindLine(s.nv)}</i></div></div>
              <div className="ver1-rc-box">
                {unsent ? (
                  <><p className="ver1-rc-k">Waiting to go out</p><p className="ver1-rc-v">Not sent yet</p><p className="ver1-rc-i">Saved {dayOf(s.nv.v.createdDate)}. It counts once it goes out with a query.</p></>
                ) : (
                  <><p className="ver1-rc-k">Asked for more</p><p className="ver1-rc-v" data-ver1="card-pct">{s.askedPct}<small>%</small></p>
                    <p className="ver1-rc-i">{s.split.requests} of {s.split.sent} queries{s.firstSentMs ? `, since ${msDay(s.firstSentMs)}` : ""}</p></>
                )}
              </div>
              {unsent ? <div className="ver1-rc-run e">No queries yet</div> : (
                <div className="ver1-rc-run" aria-label="Every query, newest first">
                  {[...s.queries].reverse().map((q) => (
                    <span key={q.id} className={HOT.has(q.status) ? "hot" : ""} title={STAGE_NAME[q.status] ?? q.status}><StatusDot status={q.status} overrideSize={20} /></span>
                  ))}
                </div>
              )}
              <footer className="ver1-rc-f">
                {unsent ? (
                  <><div><p className="ver1-rc-k">Saved</p><p className="ver1-rc-fv">{dayOf(s.nv.v.createdDate)}</p></div>
                    <button type="button" className="ver1-rc-b p" data-ver1="add-card" onClick={() => onAdd(s.nv.v.id)}>Add to a package</button></>
                ) : (
                  <><div><p className="ver1-rc-k">Average reply</p><p className="ver1-rc-fv">{s.avgReply != null ? <>{s.avgReply} <small>days</small><em>from {s.replyN} {s.replyN === 1 ? "reply" : "replies"}</em></> : "–"}</p></div>
                    <button type="button" className="ver1-rc-b" onClick={(e) => onSee(s.nv.v.id, e.currentTarget)}>See queries</button></>
                )}
              </footer>
            </article>
          );
        })}
      </div>
      <div className="ver1-lg">
        <div className="ver1-lg-l">
          <p className="ver1-oh-k">League table</p>
          <h3>Which version is out in front?</h3>
          <p className="ver1-oh-s">Every version, ranked by the requests it’s earned. Click a heading to sort.</p>
          {/* TODO(illustration): a hawk with a trophy */}
          <div className="ver1-lg-art" aria-hidden="true"><span>Illustration<small>A hawk with a trophy</small></span></div>
        </div>
        <section className="ver1-sh" data-ver1="league" aria-label="How they compare, by version">
          <div className="ver1-sh-h"><span className="ver1-sh-t">How they compare, <span>by</span> version</span></div>
          <div className="ver1-sh-lead" data-ver1="lead">
            <div><p className="ver1-rc-k">Request rate, all versions</p><p className="ver1-sh-big">{pct(ll.ratePct)}</p>
              <p className="ver1-sh-i" data-ver1="lead-sum">{ll.requests} requests from {ll.sent} queries</p></div>
            <div><p className="ver1-rc-k">Highest request rate</p><p className="ver1-sh-n">{ll.highest ? ll.highest.nv.v.name : "–"}</p>
              <p className="ver1-sh-i">{ll.highest ? `${ll.highest.split.requests} of ${ll.highest.split.sent} (${ll.highest.askedPct}%)` : `Needs ${MIN_SENDS_FOR_CLAIM} answered`}</p></div>
            <div><p className="ver1-rc-k">Fastest replies</p><p className="ver1-sh-n">{ll.fastest ? ll.fastest.nv.v.name : "–"}</p>
              <p className="ver1-sh-i">{ll.fastest ? `${ll.fastest.avgReply} days on average` : "No replies yet"}</p></div>
            <div><p className="ver1-rc-k">Most sent</p><p className="ver1-sh-n">{ll.mostSent ? ll.mostSent.nv.v.name : "–"}</p>
              <p className="ver1-sh-i">{ll.mostSent ? `${ll.mostSent.split.sent} queries` : "–"}</p></div>
          </div>
          <div className="ver1-sh-row ver1-sh-hd" data-ver1="league-head">
            {heads.map(([k, label]) => k ? (
              <button key={label} type="button" className={key === k ? "on" : ""} data-ls={k} aria-pressed={key === k} onClick={() => setKey(k)}>
                {label}{key === k ? <i aria-hidden="true"> ↓</i> : null}
              </button>
            ) : <span key={label}>{label}</span>)}
          </div>
          {league.map((s) => {
            const unsent = !s.split.sent;
            const note = unsent ? "Not sent yet" : s.split.answered < MIN_SENDS_FOR_CLAIM ? `fewer than ${MIN_SENDS_FOR_CLAIM} answered` : s.nv.v.id === activeId ? "In use" : null;
            return (
              <div key={s.nv.v.id} className={`ver1-sh-row${unsent ? " u" : ""}`} data-ver1="league-row" data-version={s.nv.v.id}
                data-sent={s.split.sent} data-replies={s.split.replies} data-answered={s.split.answered} data-requests={s.split.requests}
                data-rate={s.split.rate ?? ""} data-avg={s.avgReply ?? ""}
                onClick={(e) => onSee(s.nv.v.id, e.currentTarget)}>
                <span className="ver1-sh-v"><span className="ver1-sh-ic">{s.nv.n}</span><span><b>{s.nv.v.name}</b>{note ? <i>{note}</i> : null}</span></span>
                <span className="ver1-sh-num">{s.split.sent || "–"}</span>
                <span>{unsent ? <span className="ver1-lb e" /> : (
                  <span className="ver1-lb">
                    {s.split.requests ? <u className="rq" style={{ flex: s.split.requests }} /> : null}
                    {s.split.otherReplies ? <u className="rp" style={{ flex: s.split.otherReplies }} /> : null}
                    {s.split.out ? <u className="wt" style={{ flex: s.split.out }} /> : null}
                    {s.split.noReply ? <u className="nr" style={{ flex: s.split.noReply }} /> : null}
                  </span>
                )}</span>
                <span className="ver1-sh-num">{unsent ? "–" : s.split.replies}</span>
                <span className="ver1-sh-num" data-ver1="rate">{unsent || s.split.rate == null ? "–" : pct(s.split.rate * 100)}</span>
                <span className="ver1-sh-num">{unsent ? "–" : s.split.requests}</span>
                <span className="ver1-sh-num">{s.avgReply != null ? `${s.avgReply} days` : "–"}</span>
              </div>
            );
          })}
          <div className="ver1-sh-f">
            <span className="ver1-key"><span><u className="rq" />Requests</span><span><u className="rp" />Other replies</span><span><u className="wt" />Still waiting</span><span><u className="nr" />No reply</span></span>
            <p>Rate counts queries no longer waiting.{unversioned ? <> <button type="button" className="ver1-lnk" data-ver1="without" onClick={onAssign}>{unversioned} without a version</button></> : null}</p>
          </div>
        </section>
      </div>
    </section>
  );
};

/* ══ the first-version state and the lock card ═════════════════════════════════════════════════ */

const FirstVersion: React.FC<{ onNew: () => void }> = ({ onNew }) => (
  <section className="ver1-sec" aria-labelledby="ver1-fh" data-ver1="first">
    <div className="ver1-sech"><h2 id="ver1-fh">Start tracking versions</h2></div>
    <div className="ver1-steps">
      <ol>
        <li><i>1</i><h3>Save the manuscript as it stands.</h3><p>Your first version is the book you’re sending now. Give it a name you’ll recognise.</p><div className="ex">e.g. <b>Prologue first</b></div></li>
        <li><i>2</i><h3>Save a new version when the opening changes.</h3><p>Cut a prologue, swap two chapters, rewrite the first page: save it, and say what changed.</p><div className="ex">e.g. <b>Fast-paced opening</b> · “Cut the prologue.”</div></li>
        <li><i>3</i><h3>Each query records the version that went.</h3><p>Over time you’ll see which opening gets agents asking for more.</p><div className="ex">e.g. <b>40%</b> asked for more, from 5 queries</div></li>
      </ol>
      <div className="foot"><p>A version is the same story told a different way. A new book is a new manuscript.</p>
        <button type="button" className="ver1-b p" data-ver1="first-new" onClick={onNew}>+ Save your first version</button></div>
    </div>
  </section>
);

const LockCard: React.FC<{ title: string; onPlans: () => void }> = ({ title, onPlans }) => (
  <div className="ver1-lock" role="region" aria-labelledby="ver1-lkh" data-ver1="lock">
    <div className="ver1-lock-st"><span>Versions · part of Pro</span><span>{title}</span></div>
    <div className="ver1-lock-bd">
      <h2 id="ver1-lkh">Find out which opening gets agents reading on.</h2>
      <p className="d">Save each version of your manuscript as it changes. QueryHawk records which one went out with every query, then shows you which is landing.</p>
      <ul>
        <li><i>1</i><span><b>Version by version.</b> What each one sent, and what came back.</span></li>
        <li><i>2</i><span><b>Every query, by version.</b> Who saw which.</span></li>
        <li><i>3</i><span><b>A league table.</b> Every version, ranked by the requests it’s earned.</span></li>
      </ul>
    </div>
    <div className="ver1-lock-ft">
      <button type="button" className="ver1-b p" data-ver1="plans" onClick={onPlans}>See plans</button>
      <button type="button" className="ver1-b g" data-ver1="plans-2" onClick={onPlans}>How it works</button>
      <small>Plans run only while you’re querying.</small>
    </div>
  </div>
);
