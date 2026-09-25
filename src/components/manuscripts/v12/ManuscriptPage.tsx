/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS PAGE (v12) — one book, everything that goes out with it ═══════════════════
 *
 * Design authority: design-refs/manuscripts/manuscripts-v12.html, rendered at its default body
 * attributes (desk hero · across · blush tray · list versions). Locks:
 * tests/e2e/manuscriptsV12.measure.ts (L1–L11) + msv12 unit locks.
 *
 * ⚠️ SINGLE-MANUSCRIPT BY DESIGN (D1). The page shows the SCOPED manuscript — the shell's own
 * `scriptally_active_manuscript_id` selection resolved through `scopedManuscript` — and the
 * "More manuscripts: coming soon" tag renders ONLY while the account holds at most one, because
 * copy asserts what the code does today and a writer with three books beside a working switcher
 * must not be told more are coming soon.
 *
 * ⚠️ NOTHING HERE CHANGES A QUERY INLINE (L4/D13). An owed row's button opens TaskModal with the
 * query's own BOARD CARD — the same card the dashboard's rows open, found in the same assembled
 * board — and only the modal's commit writes, through DashTaskCommit → useTaskCommit, the app's
 * one writing path. No card on the board (snoozed included) means the button routes to the Query
 * Centre rather than inventing a card by hand.
 *
 * ⚠️ EVERY STATUS GLYPH IS `StatusDot` (L5). The mock's `.dot` rings are stand-ins and none is
 * ported.
 */
import React, { Suspense, useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType, ManuscriptStatus, QueryStatus, UserPlan } from "../../../types";
import type { Manuscript, ManuscriptVersion, Query } from "../../../types";
import {
  bylineFor, compLetterTally, currentBookVersion, hasTwoPageSynopsis, letterInUse,
  materialQueryCount, materialsOf, otherMaterialTiles, owedRequests, packageQueries,
  packageUsageCounts, packagesInUse, queryingSince, scopedManuscript, versionUsage,
} from "../../../lib/manuscriptSummary";
import { bookVersionsOf, bookVersionById } from "../../../lib/bookVersions";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { todoRows, nudgeCount, replyWindow } from "../../../lib/dashTodo";
import { listRowInputs } from "../../../lib/taskCardFacts";
import { modalJourney, modalWhen } from "../../../lib/taskModal";
import { localYMD } from "../../../lib/shellSidebar";
import type { BoardCard } from "../../../lib/todoBoard";
import { blankDraft, draftToValues, type RowDraft } from "../../dashboard/TodoRowEditor";
import { StatusDot } from "../../StatusDot";
import { DashTaskCommit, type CommitRequest } from "../../dashboard/DashTaskCommit";
import { useTodoToast } from "../../todo/useTodoToast";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { MaterialModal } from "../../packages/MaterialModal";
import { applyMaterialDraft } from "./msv12Materials";
import type { TaskModalValues } from "../../task/TaskModal";
import type { SendMethod } from "../../../lib/paneJourney";
import {
  CountCluster, MaterialsSections, OtherSection, OwedList, PackagesSection, SectionH,
  VersionsSection, fmtDay, OWED_SEND_TASK_TYPES,
} from "./Msv12Sections";
import type { PkgCardModel } from "./Msv12Sections";
import { CompsRail } from "./Msv12Rail";
import { Msv12EditDetails, Msv12NewVersion } from "./Msv12EditDetails";
import { Msv12Empty } from "./Msv12Empty";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import "./msv12.css";

const TaskModal = React.lazy(() => import("../../task/TaskModal").then((m) => ({ default: m.TaskModal })));

/** The shell's shared scope key — the sidebar switcher writes it; this page only reads. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export interface ManuscriptPageProps {
  onNavigate: (tab: string, subPage?: string) => void;
  active?: boolean;
  openId?: string | null;
}

export const ManuscriptPage: React.FC<ManuscriptPageProps> = ({ onNavigate, openId = null }) => {
  const {
    currentUser, manuscripts, versions, packages, agents, queries, activities,
    userTasks, tasks, taskFlags, updateManuscript, addVersion, updateVersion,
  } = useScriptAllyDb();

  const stored = useMemo(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  }, []);
  const ms = useMemo(
    () => scopedManuscript(manuscripts, openId ?? stored),
    [manuscripts, openId, stored],
  );

  /* everything below is scoped to the one manuscript the page shows */
  const msQueries = useMemo(() => (ms ? queries.filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const msPackages = useMemo(() => (ms ? packages.filter((p) => p.manuscriptId === ms.id && p.status !== "Retired") : []), [ms, packages]);
  const bookVersions = useMemo(() => bookVersionsOf(ms), [ms]);
  const newestFirst = useMemo(() => [...bookVersions].sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)), [bookVersions]);
  const current = useMemo(() => currentBookVersion(ms), [ms]);
  const letters = useMemo(() => (ms ? materialsOf(ms.id, ComponentType.QUERY_LETTER, versions) : []), [ms, versions]);
  const synopses = useMemo(() => (ms ? materialsOf(ms.id, ComponentType.SYNOPSIS, versions) : []), [ms, versions]);
  const inUseLetter = useMemo(() => letterInUse(msPackages, msQueries), [msPackages, msQueries]);
  const owed = useMemo(() => owedRequests(msQueries), [msQueries]);
  const since = useMemo(() => queryingSince(msQueries), [msQueries]);
  const pro = currentUser?.plan === UserPlan.PRO;

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "The agent";

  /**
   * "pins {version}" — only where the record genuinely carries one. A REQUEST records no version
   * (the ask is the agent's); the nearest true fact is the version the query's package states,
   * which is what a send from it would carry. Absent, the clause is omitted (run report).
   */
  const versionPin = (q: Query): string | null => {
    const p = msPackages.find((x) => x.id === q.packageId);
    return p?.bookVersionId ? bookVersionById(bookVersions, p.bookVersionId)?.name ?? null : null;
  };

  /* ══ the owed rows' modal host — the dashboard's own machinery, scoped ══════════════════════ */

  const now = useMemo(() => new Date(), []);
  const cols = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
  }).cols, [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);
  const taskData = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities }),
    [queries, agents, manuscripts, userTasks, activities]);

  /** The query's own board card — live first, then snoozed; never hand-built. */
  const cardForOwed = (row: { query: Query; kind: "partial" | "full" }): BoardCard | null => {
    const want = OWED_SEND_TASK_TYPES[row.kind];
    const pool = [...cols.todo, ...cols.today, ...cols.snoozed];
    return pool.find((c) => c.relatedRecordId === row.query.id && c.taskType === want)
      ?? pool.find((c) => c.relatedRecordId === row.query.id) ?? null;
  };

  const [modalCard, setModalCard] = useState<BoardCard | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [request, setRequest] = useState<CommitRequest | null>(null);
  const seq = useRef(0);
  const { flash } = useTodoToast();

  const openSend = (row: { query: Query; kind: "partial" | "full" }) => {
    const c = cardForOwed(row);
    if (!c || !modalJourney(c)) {
      /* the board is not raising this card (muted, or mid-write) — the Query Centre hosts the
         full flow rather than this page inventing a card (see the header) */
      onNavigate("queries");
      return;
    }
    setWarn(null);
    setModalCard(c);
  };

  const modalFacts = useMemo(() => {
    const c = modalCard;
    const j = c ? modalJourney(c) : null;
    if (!c || !j) {
      return { journey: "sent" as const, title: { pre: "", who: "", post: "" }, when: "",
        agent: { name: "", initials: "", meta: "" }, partial: false, materials: "",
        expected: null, remind: null, method: "Email" as SendMethod };
    }
    const row = todoRows({ cards: [c], data: taskData, isUrgent: () => false })[0];
    const inputs = listRowInputs(c, taskData);
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const agent = agents.find((a) => a.id === (q?.agentId ?? c.agentId));
    const win = replyWindow((q?.status as QueryStatus) ?? null, agent?.responseTimeWeeks);
    const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    return {
      journey: j,
      title: row.title,
      when: modalWhen(j, inputs.anchorDate, row.days, nudgeCount(row.queryId, activities)),
      agent: {
        name: c.who || "the agent",
        initials: row.initials,
        meta: [inputs.agency, win.stated ? `${Math.round(win.days / 7)}-week window` : null].filter(Boolean).join(" · "),
      },
      partial: inputs.partial,
      materials: inputs.ask || (inputs.partial ? "Partial" : "Full manuscript"),
      expected: win.days ? { date: day(win.days), hint: win.stated ? `Their ${Math.round(win.days / 7)}-week window` : "House estimate" } : null,
      remind: win.days ? { date: day(win.days + 14), hint: "2 weeks after" } : null,
      method: (q?.sendMethod as SendMethod) ?? "Email",
    };
  }, [modalCard, taskData, queries, agents, activities]);

  /** The modal's answer, routed to the write that names it — the dashboard's own mapping. */
  const commitFromModal = (c: BoardCard, v: TaskModalValues) => {
    seq.current += 1;
    const id = seq.current;
    const allow = !!warn;
    setModalCard(null); setWarn(null);
    if (v.answer.write === "close") { setRequest({ id, kind: "close", card: c, note: v.note || undefined }); return; }
    if (v.answer.write === "mute") { setRequest({ id, kind: "mute", card: c }); return; }
    if (v.answer.write === "commit" && modalJourney(c) === "quiet") { setRequest({ id, kind: "nudge", card: c }); return; }
    const mode = modalJourney(c) === "nudge" ? "nudge" as const : "sent" as const;
    const base: RowDraft = blankDraft(todoRows({ cards: [c], data: taskData, isUrgent: () => false })[0]);
    const draft: RowDraft = {
      ...base,
      materials: v.materials ? [v.materials] : base.materials,
      also: v.also, sentDate: v.when, method: v.method,
      expected: v.expected, remind: v.remind, note: v.note,
    };
    setRequest({ id, kind: "values", card: c, values: draftToValues(draft, mode), allowDuplicate: allow });
  };

  /* ══ the page's own dialogs ═════════════════════════════════════════════════════════════════ */

  const [editOpen, setEditOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [materialModal, setMaterialModal] = useState<ComponentType | null>(null);

  /* ══ derived card models ════════════════════════════════════════════════════════════════════ */

  const pkgCards: PkgCardModel[] = useMemo(() => msPackages.map((p) => {
    const items: { label: string; version?: string }[] = [];
    const letter = versions.find((v) => v.id === p.queryLetterVersionId);
    if (letter) items.push({ label: letter.versionName });
    const syn = versions.find((v) => v.id === p.synopsisVersionId);
    if (syn) items.push({ label: syn.versionName });
    if (p.bookVersionId) {
      items.push({ label: "Opening pages", version: bookVersionById(bookVersions, p.bookVersionId)?.name ?? undefined });
    }
    if (p.otherMaterials) items.push({ label: p.otherMaterials });
    const mine = packageQueries(p.id, msQueries);
    const seen = new Map<string, number>();
    for (const qq of mine) if (!seen.has(qq.agentId)) seen.set(qq.agentId, 1);
    const recipientIds = [...seen.keys()];
    const shown = recipientIds.slice(0, 3).map((id) => agents.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a);
    return {
      pkg: p, items, recipients: shown, extraRecipients: Math.max(0, recipientIds.length - shown.length),
      counts: packageUsageCounts(p.id, msQueries),
    };
  }), [msPackages, versions, bookVersions, msQueries, agents]);

  const otherTiles = useMemo(() => otherMaterialTiles(msPackages, msQueries), [msPackages, msQueries]);

  /* ══ render ═════════════════════════════════════════════════════════════════════════════════ */

  const grid = (children: React.ReactNode) => (
    <WorkspacePageGrid className="msv12-wpg" masthead={null} scrollLabel="Manuscripts">
      <div className="msv12-own msv12-root" data-msv12="page">{children}</div>
    </WorkspacePageGrid>
  );

  if (!ms) {
    return grid(
      <Msv12Empty
        heroArt={heroArt}
        onCreate={() => onNavigate("manuscripts", "Add a manuscript")}
      />,
    );
  }

  const showSoonTag = manuscripts.length <= 1;
  const shelved = ms.status === ManuscriptStatus.SHELVED || ms.shelved === true;

  return grid(
    <>
      <div className="msv12-topline">
        <button type="button" className="msv12-btn" data-msv12="edit-details" onClick={() => setEditOpen(true)}>
          Edit details
        </button>
      </div>

      <div className="msv12-group">
        {/* ── the hero ─────────────────────────────────────────────────────────────────────── */}
        <section className="msv12-hero" data-msv12="hero">
          <div className="msv12-heroart" data-msv12="hero-art">
            <img
              className="msv12-heroimg" data-msv12="hero-img" src={heroArt}
              alt="The Archivist writing in an open manuscript with a quill"
            />
          </div>
          <div data-msv12="hero-text">
            <div className="msv12-kick">
              <span className="msv12-lbl">Your manuscript</span>
              {showSoonTag ? <span className="msv12-soon">More manuscripts: coming soon</span> : null}
            </div>
            <h1 className="msv12-title">{ms.title}</h1>
            <div className="msv12-by">{bylineFor(ms, currentUser?.name)}</div>
            {ms.logline ? <p className="msv12-log">{ms.logline}</p> : null}
            <dl className="msv12-facts" data-msv12="facts">
              <div data-msv12="fact-status">
                <dt>Status</dt>
                <dd>
                  {since ? (
                    <>
                      <span className="msv12-sd" data-msv12-sd="">
                        <StatusDot status={QueryStatus.QUERIED} overrideSize={12} decorative />
                      </span>
                      {shelved ? "Shelved" : "Querying"} since {fmtDay(since)}
                    </>
                  ) : (
                    <>{shelved ? "Shelved" : "Not yet querying"}</>
                  )}
                </dd>
              </div>
              <div data-msv12="fact-current">
                <dt>Current version</dt>
                {current ? (
                  <dd className="msv12-rust">{current.name}</dd>
                ) : (
                  <dd className="msv12-miss">
                    Not recorded <button type="button" className="msv12-mini" onClick={() => setNewVersionOpen(true)}>Add</button>
                  </dd>
                )}
              </div>
              <div data-msv12="fact-setting">
                <dt>Setting</dt>
                {ms.setting ? (
                  <dd>{ms.setting}</dd>
                ) : (
                  <dd className="msv12-miss">
                    Not recorded <button type="button" className="msv12-mini" onClick={() => setEditOpen(true)}>Add</button>
                  </dd>
                )}
              </div>
              <div data-msv12="fact-series">
                <dt>Series</dt>
                {ms.series ? (
                  <dd>{ms.series}</dd>
                ) : (
                  <dd className="msv12-miss">
                    Not recorded <button type="button" className="msv12-mini" onClick={() => setEditOpen(true)}>Add</button>
                  </dd>
                )}
              </div>
            </dl>
          </div>
          <div className="msv12-cover" data-msv12="cover">
            {/* ⚠️ NO UPLOAD IN THIS PASS (D9) — Storage is not provisioned. The button opens
                nothing and says so; wiring it later is one handler. */}
            <button
              type="button" className="msv12-coverph" aria-disabled="true"
              aria-label="Add your book cover" title="Cover upload is coming soon"
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <rect x="4" y="3" width="18" height="20" rx="2" /><circle cx="10" cy="9.5" r="2" />
                <path d="M4.5 19l5.5-5.5 4 4 3-3 4.5 4.5" />
              </svg>
              <span className="msv12-ct">Book cover</span>
              <span className="msv12-cadd">Add image</span>
            </button>
          </div>
        </section>

        {/* ── the main column ──────────────────────────────────────────────────────────────── */}
        <div className="msv12-col" data-msv12="col">
          <OwedList owed={owed} agentName={agentName} versionPin={versionPin} onSend={openSend} />
          <VersionsSection
            versions={newestFirst}
            currentId={current?.id ?? null}
            usage={(id) => versionUsage(id, msPackages, msQueries)}
            onNewVersion={() => setNewVersionOpen(true)}
          />
          <MaterialsSections
            letters={letters}
            synopses={synopses}
            letterInUseId={inUseLetter}
            queryCount={(id, slot) => materialQueryCount(id, slot, msPackages, msQueries)}
            showTwoPageNote={synopses.length > 0 && !hasTwoPageSynopsis(synopses)}
            onNew={(which) => setMaterialModal(which === "letter" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS)}
          />
          <OtherSection tiles={otherTiles} />
          <PackagesSection
            pro={pro}
            cards={pkgCards}
            inUse={packagesInUse(msPackages, msQueries)}
            onOpenPackages={() => onNavigate("manuscripts", "Submission packages")}
            onSeePro={() => onNavigate("plans")}
          />
        </div>

        {/* ── the rail ─────────────────────────────────────────────────────────────────────── */}
        <CompsRail
          comps={ms.comps ?? []}
          tally={compLetterTally(ms.comps ?? [])}
          onAddComp={() => onNavigate("manuscripts", "Comparable titles")}
          onOpenComps={() => onNavigate("manuscripts", "Comparable titles")}
          onAddNote={() => onNavigate("manuscripts", "Comparable titles")}
        />
      </div>

      {/* ── overlays ───────────────────────────────────────────────────────────────────────── */}
      {editOpen ? (
        <Msv12EditDetails ms={ms} updateManuscript={updateManuscript} onClose={() => setEditOpen(false)} />
      ) : null}
      {newVersionOpen ? (
        <Msv12NewVersion ms={ms} updateManuscript={updateManuscript} onClose={() => setNewVersionOpen(false)} />
      ) : null}
      {materialModal ? (
        <MaterialModal
          editing={null}
          versions={versions.filter((v) => v.manuscriptId === ms.id)}
          bookVersions={bookVersions}
          preselect={materialModal}
          onClose={() => setMaterialModal(null)}
          onSave={(draft) => {
            void applyMaterialDraft(draft, ms.id, { addVersion, updateVersion }).then(() => setMaterialModal(null));
          }}
        />
      ) : null}
      {modalCard ? (
        <Suspense fallback={null}>
          <TaskModal
            facts={modalFacts}
            order={null}
            warn={warn}
            onOpenQuery={() => { setModalCard(null); onNavigate("queries"); }}
            onClose={() => { setModalCard(null); setWarn(null); }}
            onCommit={(v) => commitFromModal(modalCard, v)}
          />
        </Suspense>
      ) : null}
      <DashTaskCommit
        request={request}
        onLogged={() => { /* the commit's own toast carries the receipt and the undo */ }}
        onDuplicate={(_key, prompt) => {
          /* the guard declined and hands the question up — reopen the modal with the banner */
          setWarn(prompt);
          const c = request && "card" in request ? request.card : null;
          if (c) setModalCard(c);
        }}
        onFailed={(_key, message) => flash(message)}
        onNeedsPage={() => onNavigate("queries")}
      />
    </>,
  );
};
