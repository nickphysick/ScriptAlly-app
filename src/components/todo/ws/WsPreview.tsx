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
import { ActivityType, QueryStatus, type Activity, type Agent, type Manuscript, type Query, type SubmissionPackage } from "../../../types";
import { buildQcRows, type QcRow } from "../../../lib/qcSummary";
import { QcQueryCard149 } from "../../queries/centre/QcQueryCard149";
import { buildCardView, stampedCardRows } from "../../queries/centre/qcCardView";
import { computeRecomputedFields, recomputedPatch } from "../../../lib/recomputeFields";
import { orderSteps, type ThreadStepIn } from "../../../lib/qcThread152";
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
  /**
   * v53 (D8): what the card shows — "typing" while questions are open (dots where the new step will go), "future" on
   * the check step (the card as it will be once the save lands, drawn through its own derivation), "logged" just after
   * the save (the live card, its newest step stamped), or "plain".
   */
  /** ⚠️ ABSENT ON THE PHONE (its card sheet): no mode keeps the card exactly as v52 drew it — the draft as the
   *  composer's dashed step, the book as it is. Only the desktop desk passes a mode. */
  mode?: "typing" | "future" | "logged" | "plain";
  /** the card's inputs for the future state (the Query Centre's row is re-stamped over the future query) */
  agents?: readonly Agent[];
  activities?: readonly Activity[];
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
export const PreviewQueryCard: React.FC<QueryCardProps> = ({ q, row, agent, queries, manuscripts, manuscript, packages, log, draft, nowMs, quietWeeks, free, mode: modeIn, agents, activities }) => {
  const legacy = modeIn === undefined;
  const mode = modeIn ?? "plain";
  /* v53 (D8) — THE FUTURE STATE IS THE CARD'S OWN DERIVATION OVER THE SAVE'S RESULT: the new step joins the query's log,
     the ten recomputed fields come from the recompute's own pure half (lib/recomputeFields), the flow's other writes
     (dates, a cleared nudge) are laid on, and the Query Centre's row is re-stamped over the future query. Nothing about
     the future card is drawn by hand. */
  const future = useMemo(() => {
    if (mode !== "future" || !draft?.ghost) return null;
    const ghost = draft.ghost;
    const events = [...log, ghost];
    const raw = events.map((e) => ({ id: String(e.id), data: e }));
    const fq = { ...q, ...(draft.future ?? {}), ...recomputedPatch(computeRecomputedFields(raw)) } as Query;
    for (const [k, v] of Object.entries(fq)) if (v === undefined) delete (fq as unknown as Record<string, unknown>)[k];
    const fqs = queries.map((x) => (x.id === q.id ? fq : x));
    const st = (ghost.resultingStatus ?? ghost.type) as QueryStatus | undefined;
    const feed: Activity[] = [...(activities ?? []) as Activity[], ...(st && Object.values(QueryStatus).includes(st)
      ? [{ id: "__ghost", queryId: q.id, manuscriptId: q.manuscriptId, date: ghost.createdAt as string, resultingStatus: st, description: "",
        activityType: st === QueryStatus.PARTIAL_SENT || st === QueryStatus.FULL_SENT || st === QueryStatus.RESUBMITTED ? ActivityType.MATERIALS_SENT : ActivityType.STATUS_CHANGED } as unknown as Activity] : [])];
    const frow = stampedCardRows(fqs, agents ?? [], feed, quietWeeks, nowMs).find((x) => x.id === q.id) ?? row;
    return { q: fq, queries: fqs, row: frow, events };
  }, [mode, draft, log, q, queries, agents, activities, quietWeeks, nowMs, row]);
  const vq = future?.q ?? q, vrow = future?.row ?? row, vqueries = future?.queries ?? queries, vlog = future?.events ?? log;
  const view = useMemo(() => (vrow ? buildCardView({ row: vrow, q: vq, ag: agent, ms: manuscript, events: vlog, packages, queries: vqueries, manuscripts, nowMs, quietWeeks, desk: true, free }) : null),
    [vrow, vq, agent, manuscript, vlog, packages, vqueries, manuscripts, nowMs, quietWeeks, free]);
  if (!view || !view.v152) return null;
  /* the step just logged, found the way the future card finds it (in "logged") */
  const newest = mode === "logged" ? newStepKey(view.v152.steps, draft?.ghost ?? null) : null;
  const sent = draft?.sent ?? [];
  /* the phone's sheet (no mode): v52's drawing, the task's new step as the composer's dashed draft */
  if (legacy) {
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
  }
  const desk = {
    bookRow: true,
    typing: mode === "typing",
    /* the step being checked is the future thread's newest step of the save's kind — found in the card's own steps, so
       it is the bubble the card draws for it (the history can date it from the feed, not the new log entry) */
    checkKey: mode === "future" ? newStepKey(view.v152.steps, draft?.ghost ?? null) : null,
    stampKey: newest,
    clip: mode === "future" && sent.length > 1 ? { key: newStepKey(view.v152.steps, draft?.ghost ?? null) ?? "__ghost", items: sent, version: draft?.version ?? null } : null,
  };
  return (
    <QcQueryCard149 {...view.display} card1522={{ desk }}
      mode="view" onMode={noop} onClose={noop} onStep={noop} onPrimary={noop} onCloseQuery={noop} onContactList={noop} onCopyEmail={noop}
      onAgentField={noop} onOpenPiece={noop} onAddNote={noop} onRespond={noopAsync} onSaveEdits={noopAsync}
      index={0} total={1} notes={[]} packageChoices={[]} packageKey={null} pieces={[]} stepChoices={[]} removable={() => []}
      onReply152={noop} onEditStep152={noop} onPencil152={noop} />
  );
};

/** the newest step in a card's thread matching the save's new step (its status, or a nudge) */
function newStepKey(steps: readonly ThreadStepIn[], ghost: Record<string, unknown> | null): string | null {
  if (!ghost) return null;
  const nudge = ghost.type === NUDGE_NESTED_TYPE;
  const st = (ghost.resultingStatus ?? ghost.type) as string | undefined;
  const hit = orderSteps(steps).filter((x) => (nudge ? x.kind === "nudge" : !x.kind && x.status === st)).pop();
  return hit ? hit.key : null;
}

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
export const ScaledCard: React.FC<{ kind: "query" | "agent"; label: string; onOpen: () => void; children: React.ReactNode; focusKey: string }> = ({ kind, label, onOpen, children, focusKey }) => {
  const slot = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(1);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return undefined;
    /* workspace width v2 (8 Nov): the card is as tall as its content, up to the space the rail offers — so the space is
       read from the RAIL (its height less its padding and the other things in it), never from the slot, which now hugs
       the card and would only ever report the card's own height back. `h` is the card's MAXIMUM, in its own units. */
    const host = el.parentElement;
    const fit = () => {
      const w = el.clientWidth;
      let hh = el.clientHeight;
      if (host) {
        const cs = getComputedStyle(host);
        const others = [...host.children].filter((c) => c !== el).reduce((n, c) => n + (c as HTMLElement).offsetHeight, 0);
        hh = host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - others;
      }
      if (w <= 0 || hh <= 0) return;
      const zz = Math.min(1, w / TRUE_W(kind));
      setZ(zz); setH(hh / zz);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (host) ro.observe(host);
    return () => ro.disconnect();
  }, [kind]);
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
      <div className="tws-pvz" data-tws="preview-card" inert style={{ zoom: z, width: TRUE_W(kind), maxHeight: h || undefined } as React.CSSProperties}>
        <aside className={`spanel tws-pvpanel ${kind === "query" ? "qsp" : "qsp apn"}`}>
          <div className="spanel-own">{children}</div>
        </aside>
      </div>
      <span className="tws-pvopen" aria-hidden="true">{label}</span>
    </div>
  );
};
