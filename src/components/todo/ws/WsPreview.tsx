/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 §6, v52 Part D — THE CARD PREVIEW. The live Query Centre query card (`QcQueryCard149` over the v152
 * thread, from the Query Centre's own `buildCardView`) or the real Contact list agent card
 * (`AgentPaperCard`'s panel variant with the panel's own profile sections), laid out at its true width and scaled down
 * with CSS zoom to fit the column, like a legible thumbnail.
 *
 * ⚠️ IT IS A PICTURE OF THE CARD, NOT A SECOND COPY OF IT. Nothing inside takes a pointer: a press anywhere on it opens
 *    the card itself as a drawer, the same way it opens on the Query Centre and the Contact list.
 * ⚠️ THE PENDING CHANGE IS DRAWN BY THE CARD'S OWN RENDERERS: a draft step is a proposed activity in the timeline's
 *    activity shape (`__ghost`), drawn as the query card's own composer draft (dashed, in its colour); a filled field is the agent as it will be once saved.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import { QueryStatus, type Activity, type Agent, type Manuscript, type Query, type SubmissionPackage } from "../../../types";
import { buildQcRows, type QcRow } from "../../../lib/qcSummary";
import { QcQueryCard149 } from "../../queries/centre/QcQueryCard149";
import { buildCardView } from "../../queries/centre/qcCardView";
import { NUDGE_NESTED_TYPE } from "../../../lib/logNudge";
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

/** the card's true width: the query card's v152 frame is 540, or 504 at 1400 and under (qcv152card.css); the agent
 *  card's side panel is 560, or 520 at 1440 and under (sidePanel.css) */
const TRUE_W = (kind: "query" | "agent" = "agent") => {
  const w = typeof window !== "undefined" ? window.innerWidth : 1512;
  return kind === "query" ? (w <= 1400 ? 504 : 540) : (w <= 1440 ? 520 : 560);
};

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
  /** the query's row as the Query Centre stamps it (qcCardView's `stampedCardRows`) */
  row: QcRow | null;
  agent: Agent | null;
  queries: readonly Query[];
  manuscripts: readonly Manuscript[];
  manuscript: Manuscript | null;
  packages: readonly SubmissionPackage[];
  log: Record<string, unknown>[];
  draft: Draft | null;
  nowMs: number;
  quietWeeks: number;
  /** packages locked for this writer (the card's materials read as the free plan's words) */
  free: boolean;
}

const noop = () => undefined;
const noopAsync = async () => false;

/**
 * To-do list v52, Part D — THE QUERY CENTRE'S OWN CARD. `QcQueryCard149` over the v152 thread, its every prop from
 * the one derivation the Query Centre reads (`buildCardView`), so a change to the card on the Query Centre is a change
 * here too. Every handler is inert: the preview is a picture of the card, and a press anywhere opens the real one.
 *
 * ⚠️ THE PENDING CHANGE IS THE CARD'S OWN DRAFT: the task's new step is handed to the card as `card1522.draft`, the
 *    dashed step the Query Centre's composer draws, built the way the composer builds it.
 */
export const PreviewQueryCard: React.FC<QueryCardProps> = ({ q, row, agent, queries, manuscripts, manuscript, packages, log, draft, nowMs, quietWeeks, free }) => {
  const view = useMemo(() => (row ? buildCardView({ row, q, ag: agent, ms: manuscript, events: log, packages, queries, manuscripts, nowMs, quietWeeks, desk: true, free }) : null),
    [row, q, agent, manuscript, log, packages, queries, manuscripts, nowMs, quietWeeks, free]);
  if (!view || !view.v152) return null;
  /* the task's new step, as the card's composer draft: built here as the composer builds its own (a status step, or a
     nudge), never through the ledger, which folds a step into an existing one of the same status */
  const g = draft?.ghost ?? null;
  const gStatus = (g?.resultingStatus ?? g?.type) as QueryStatus | undefined;
  const gNudge = g?.type === NUDGE_NESTED_TYPE;
  const gMs = typeof g?.createdAt === "string" ? new Date(g.createdAt).getTime() : null;
  const card1522 = g && (gNudge || (gStatus && Object.values(QueryStatus).includes(gStatus)))
    ? { draft: { key: "__draft", status: gNudge ? null : gStatus!, kind: gNudge ? "nudge" as const : undefined, ms: gMs != null && Number.isFinite(gMs) ? gMs : nowMs, chips: [] } }
    : {};
  return (
    <QcQueryCard149 {...view.display} card1522={card1522}
      mode="view" onMode={noop} onClose={noop} onStep={noop} onPrimary={noop} onCloseQuery={noop} onContactList={noop} onCopyEmail={noop}
      onAgentField={noop} onOpenPiece={noop} onAddNote={noop} onRespond={noopAsync} onSaveEdits={noopAsync}
      index={0} total={1} notes={[]} packageChoices={[]} packageKey={null} pieces={[]} stepChoices={[]} removable={() => []}
      onReply152={noop} onEditStep152={noop} onPencil152={noop} />
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
      const zz = full ? 1 : Math.min(1, w / TRUE_W(kind));
      setZ(zz); setH(hh / zz);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [full, kind]);
  /* bring the change into view: the draft step, or the agent's section (never cutting off the head) */
  useEffect(() => {
    const el = slot.current;
    if (!el) return undefined;
    const id = window.setTimeout(() => {
      /* ⚠️ NEVER scrollIntoView: it scrolls every ancestor, the page's own scroller included, and the header would
         slide out of view. The card's own scroller is moved, and nothing else. */
      if (kind === "query") {
        const tg = el.querySelector<HTMLElement>("[data-qc1522=\"draft\"]");
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
      {/* ⚠️ READ-ONLY (v51.1): the card inside is a picture of the real one. `inert` takes every button and link in it out
          of clicks and focus; the query card's footer action and the stand card's links are hidden as well (todoWs.css),
          so nothing in the preview looks like it can be pressed. A click anywhere is the frame's: it opens the real card. */}
      <div className="tws-pvz" data-tws="preview-card" inert style={{ zoom: z, width: TRUE_W(kind), height: h || undefined } as React.CSSProperties}>
        <aside className={`spanel tws-pvpanel ${kind === "query" ? "qsp" : "qsp apn"}`}>
          <div className="spanel-own">{children}</div>
        </aside>
      </div>
      {!full ? <span className="tws-pvopen" aria-hidden="true">{label}</span> : null}
    </div>
  );
};
