/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 §6 — THE CARD PREVIEW. The real Query Centre query card (`QcOpenCard` in the side panel's own dress,
 * its ledger built by `buildTimelineRows` exactly as the Query Centre builds it) or the real Contact list agent card
 * (`AgentPaperCard`'s panel variant with the panel's own profile sections), laid out at its true width and scaled down
 * with CSS zoom to fit the column, like a legible thumbnail.
 *
 * ⚠️ IT IS A PICTURE OF THE CARD, NOT A SECOND COPY OF IT. Nothing inside takes a pointer: a press anywhere on it opens
 *    the card itself as a drawer, the same way it opens on the Query Centre and the Contact list.
 * ⚠️ THE PENDING CHANGE IS DRAWN BY THE CARD'S OWN RENDERERS: a draft step is a proposed activity in the timeline's
 *    activity shape (`__ghost`, the shape the Query Centre's desk already drafts with), outlined through the ledger's own
 *    highlight; a filled field is the agent as it will be once saved.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import type { Activity, Agent, Manuscript, Query, SubmissionPackage } from "../../../types";
import { buildQcRows } from "../../../lib/qcSummary";
import { buildTimelineRows } from "../../reading-pane/QueryTimeline";
import { QueryLedger } from "../../queries/panel/QueryLedger";
import { StandCard } from "../../queries/panel/StandCard";
import { standCard } from "../../../lib/standCard";
import { QcOpenCard } from "../../queries/centre/QcOpenCard";
import { AgentCard262, type AgentCard262Props, type Sec262 } from "../../agents/contact/AgentCard262";
import { agentFacts, agentRows } from "../../../lib/contactList";
import { agentHistory } from "../../../lib/agentHistory";
import { heardWords, replyWeeksOf, storyBlocks } from "../../../lib/contactStory255";
import { colleaguesOf, genreFit } from "../../../lib/contactV24";
import { genreLabel } from "../../../lib/genres";
import { bookGenreHit, bookGenres } from "../../../lib/genreMatch";
import type { Draft } from "./wsFlows";
import "../../shell/sidePanel.css";
import "../../queries/queryPanelHost.css";
import "../../agents/panel/agentPanel.css";

/** the panel's true width: the side panel is 560, or 520 under 1440 */
const TRUE_W = () => (typeof window !== "undefined" && window.innerWidth <= 1440 ? 520 : 560);

/** the query's own activity log, live (the Query Centre's listener, for one query) */
export function useQueryLog(uid: string | null, queryId: string | null): Record<string, unknown>[] {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    setRows([]);
    if (!uid || !queryId) return undefined;
    return onSnapshot(fsQuery(collection(fsdb, "users", uid, "queries", queryId, "activity"), orderBy("createdAt", "asc")),
      (s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setRows([]));
  }, [uid, queryId]);
  return rows;
}

export interface QueryCardProps {
  q: Query;
  agent: Agent | null;
  activities: readonly Activity[];
  agents: readonly Agent[];
  manuscript: Manuscript | null;
  packages: readonly SubmissionPackage[];
  log: Record<string, unknown>[];
  draft: Draft | null;
  nowMs: number;
}

/** the real query card, as the Query Centre composes it (the ledger and the stand card, from the same builders) */
export const PreviewQueryCard: React.FC<QueryCardProps> = ({ q, agent, activities, agents, manuscript, packages, log, draft, nowMs }) => {
  const shown: Query = draft?.status ? { ...q, status: draft.status } : q;
  const row = useMemo(() => buildQcRows([shown], agents, activities as Activity[], nowMs)[0] ?? null, [shown, agents, activities, nowMs]);
  if (!row) return null;
  const evs = draft?.ghost ? [...log, draft.ghost] : log;
  /* the timeline reads the query as it is (its stored stage dates), plus the draft step: a status patched in here would
     make the builder date the draft from the query's own fields */
  const ledgerRows = buildTimelineRows(evs as never[], q, agent as never);
  const first = (agent?.name || "").trim().split(/\s+/)[0] || (agent?.agency ? "the agency" : "the agent");
  const stand = (
    <StandCard view={standCard({
      status: row.status, first, agency: (agent?.agency || "").trim(), court: row.court, stageStartMs: row.stageStartMs, expectedMs: row.expectedMs,
      windowWeeks: typeof agent?.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null,
      unansweredNudgeMs: null, closedHow: row.closedHow, manuscriptTitle: manuscript?.title ?? null, hasSentDate: !!q.dateSent,
      keepTracking: (q as { closureOfferDismissed?: boolean }).closureOfferDismissed === true, reminderOpen: false,
    }, nowMs)} onLink={() => undefined} renderSetDate={() => null} />
  );
  const tracking = <QueryLedger rows={ledgerRows} stand={stand} nowMs={nowMs} sendMethod={q.sendMethod} revisionRound={q.revisionRound} highlightId={draft?.ghost ? "__ghost" : null} />;
  const tags = manuscript ? [manuscript.genre, ...(manuscript.subGenres ?? [])].filter((x): x is string => !!x).slice(0, 2) : [];
  return (
    <QcOpenCard row={row} nowMs={nowMs} packages={[...packages]} manuscriptTitle={manuscript?.title ?? null} manuscript="caption" manuscriptTags={tags}
      onPrimary={() => undefined} onAction={() => undefined} tracking={tracking} agentTab={tracking} notesTab={tracking} noteCount={0} />
  );
};

export interface AgentCardProps {
  agent: Agent;
  queries: readonly Query[];
  activities: readonly Activity[];
  agents: readonly Agent[];
  manuscript: Manuscript | null;
  /** every manuscript, for the card's titles */
  manuscripts: readonly Manuscript[];
  personalGenres: Parameters<typeof genreLabel>[1];
  draft: Draft | null;
  nowMs: number;
}

/** the desk's section names, as the address book card names them (lib/contactCard262's Sec262) */
const CARD_SEC: Record<string, Sec262> = { how: "how", wishlist: "wishlist", send: "materials", genres: "genres" };
const noop = () => undefined;

/**
 * The agent's card is the Contact list's own (Contact list v26.2, `AgentCard262`), with the draft value laid on the agent.
 * Its props are built from the same libraries the Contact list builds them from (`agentFacts`, `agentHistory`,
 * `storyBlocks`, `genreFit`, `colleaguesOf`); every handler is inert and there is no edit kit, because the preview is a
 * picture of the card — a click on it opens the real one.
 */
export const PreviewAgentCard: React.FC<AgentCardProps> = ({ agent: a0, queries, activities, agents, manuscript, manuscripts, personalGenres, draft, nowMs }) => {
  const agent: Agent = draft?.agentPatch ? { ...a0, ...draft.agentPatch } : a0;
  const msId = manuscript?.id ?? null;
  const qcRows = useMemo(() => buildQcRows(queries.filter((q) => q.agentId === agent.id || (!!a0.agency && agents.some((x) => x.id === q.agentId && x.agency === a0.agency))), agents.map((x) => (x.id === agent.id ? agent : x)), activities as Activity[], nowMs),
    [queries, agents, agent, a0.agency, activities, nowMs]);
  const x = agentFacts(agent, qcRows, msId);
  /* the colleagues line needs the agency's other agents' facts, and nothing else */
  const peers = agents.filter((o) => o.id !== agent.id && !!agent.agency && o.agency === agent.agency).map((o) => agentFacts(o, qcRows, msId));
  const toAgent = queries.filter((q) => q.agentId === agent.id);
  const titleOf = (id: string) => manuscripts.find((m) => m.id === id)?.title?.trim() || "Untitled manuscript";
  const book = bookGenres(manuscript);
  const hit = bookGenreHit(book);
  const word = (raw: string) => genreLabel(raw, personalGenres);
  const rows = agentRows(qcRows, agent.id, null);
  const props: AgentCard262Props = {
    x, all: [x, ...peers], nowMs, bookTitle: manuscript?.title?.trim() || null,
    genreWord: word, genreHit: hit,
    queries: toAgent, titleOf, history: agentHistory({ agent, queries: toAgent, activities: activities as Activity[], notes: [], titleOf, nowMs }),
    index: 0, total: 1, onStep: noop,
    onJourney: noop, onLog: noop, onEdit: noop, onOpenQuery: noop, onNotes: async () => false,
    story: { blocks: storyBlocks(rows, toAgent, activities as Activity[], (id) => titleOf(id) || null, replyWeeksOf(agent), nowMs), heard: heardWords(rows) },
    fit: genreFit(agent.genres, book, manuscript?.title ?? null, word),
    colleagues: colleaguesOf(x, [x, ...peers]), onOpenAgent: noop,
    deleteQueries: 0, onDelete: noop,
  };
  const sec = draft?.section ? CARD_SEC[draft.section] ?? null : null;
  return (
    <div className="tws-agcard" data-tws-sec={sec ?? undefined} aria-hidden="true">
      <AgentCard262 {...props} />
    </div>
  );
};

/**
 * The scaled frame: the card at its true width, zoomed to the column's width, as tall as the column. A query card
 * scrolls its own timeline to the draft step; an agent card scrolls to the section the task fills — never past the
 * card's head, so the agent's name is always in view.
 */
export const ScaledCard: React.FC<{ kind: "query" | "agent"; label: string; onOpen: () => void; full?: boolean; children: React.ReactNode; focusKey: string }> = ({ kind, label, onOpen, full = false, children, focusKey }) => {
  const slot = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(1);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return undefined;
    const fit = () => {
      const w = el.clientWidth, hh = el.clientHeight;
      if (w <= 0 || hh <= 0) return;
      const zz = full ? 1 : Math.min(1, w / TRUE_W());
      setZ(zz); setH(hh / zz);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [full]);
  /* bring the change into view: the draft step, or the agent's section (never cutting off the head) */
  useEffect(() => {
    const el = slot.current;
    if (!el) return undefined;
    const id = window.setTimeout(() => {
      /* ⚠️ NEVER scrollIntoView: it scrolls every ancestor, the page's own scroller included, and the header would
         slide out of view. The card's own scroller is moved, and nothing else. */
      if (kind === "query") {
        const tg = el.querySelector<HTMLElement>(".qlg-c--on");
        let sc: HTMLElement | null = tg?.parentElement ?? null;
        while (sc && sc !== el && !(sc.scrollHeight > sc.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        if (tg && sc && sc !== el) {
          const top = tg.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
          sc.scrollTop = Math.max(0, top - sc.clientHeight * 0.45);
        }
      } else {
        const sc = el.querySelector<HTMLElement>("[data-apc=\"scroll\"]");
        const host = el.querySelector<HTMLElement>("[data-tws-sec]");
        const which = host?.getAttribute("data-tws-sec");
        const sec = which ? host!.querySelector<HTMLElement>(`[data-cl262="sec"][data-k="${which}"]`) : null;
        if (sc && sec) {
          const head = el.querySelector<HTMLElement>("[data-apc=\"head\"]");
          const headH = head ? head.offsetHeight : 0;
          const want = sec.offsetTop - sc.offsetTop - headH - 12;
          sc.scrollTop = Math.max(0, Math.min(want, sc.scrollHeight - sc.clientHeight));
        }
      }
    }, 40);
    return () => window.clearTimeout(id);
  }, [kind, focusKey, z]);
  return (
    <div ref={slot} className="tws-pvslot" role="button" tabIndex={0} aria-label={label} data-tws="preview" data-kind={kind}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      <div className="tws-pvz" style={{ zoom: z, width: TRUE_W(), height: h || undefined } as React.CSSProperties}>
        <aside className={`spanel tws-pvpanel ${kind === "query" ? "qsp" : "qsp apn"}`}>
          <div className="spanel-own">{children}</div>
        </aside>
      </div>
      {!full ? <span className="tws-pvopen" aria-hidden="true">{label}</span> : null}
    </div>
  );
};
