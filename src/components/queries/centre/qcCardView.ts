/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERY CARD'S VIEW — every value the Query Centre's open card (`QcQueryCard149` over the v152 thread) READS,
 * derived from the record. Lifted out of `Queries.tsx`'s `qcCardNode` (To-do list v52, Part D) so that a second surface
 * can draw the same card from the same derivation: the To-do list's card preview calls this and renders the card with
 * no handlers. The Query Centre keeps its handlers and its saves; only the reading half moved, unchanged.
 *
 * ⚠️ ONE DERIVATION, TWO CALLERS. A change to what the card shows is made here, and both surfaces follow it.
 */
import type { Agent, Manuscript, Query, SubmissionPackage } from "../../../types";
import { QueryStatus } from "../../../types";
import type { QcRow } from "../../../lib/qcSummary";
import { buildQcRows } from "../../../lib/qcSummary";
import { sentView } from "../../queryActions/SentHow";
import {
  agentView as qcAgentView, bookChips as qcBookChips, methodQualifier, nextStepOf, storySteps, stripOf, submissionWords, undatedIds,
} from "../../../lib/qcCardStory";
import { nextLine } from "../../../lib/qcRowLines";
import { nextDoor } from "../../../lib/queryActions/entry";
import { buildTimelineRows } from "../../reading-pane/QueryTimeline";
import { nudgeMsOf, stampRows, stateOf, queryState as qsOf } from "../../../lib/queryState";
import { dayLabel as dayLabel152, sideOf as side152, type ThreadStepIn } from "../../../lib/qcThread152";
import { getActivityTime } from "../../../lib/queryDerivation";
import { anyToMs } from "../../../lib/qcStages";
import { storedLabels, TOLD_TYPE } from "../../../lib/qc152Write";
import { bookVersionsOf } from "../../../lib/bookVersions";
import { hrefFor } from "../../../lib/quickAdd";
import { fieldDay, type CardStep } from "./QcQueryCard149";
import type { QcCard152Data } from "./QcCard152";
import type { Activity } from "../../../types";

export const capWord = (t: string) => t.replace(/^./, (c) => c.toUpperCase());

export interface CardViewIn {
  row: QcRow;
  q: Query;
  ag: Agent | null;
  ms: Manuscript | null;
  /** the query's own activity log (users/{uid}/queries/{id}/activity, oldest first) */
  events: readonly Record<string, unknown>[];
  packages: readonly SubmissionPackage[];
  queries: readonly Query[];
  manuscripts: readonly Manuscript[];
  nowMs: number;
  quietWeeks: number;
  /** the desktop card's v152 thread (the phone passes false) */
  desk: boolean;
  /** packages locked for this writer (or the dev aid) */
  free: boolean;
}

/**
 * The page's rows, as the Query Centre's desktop list stamps them: built over every query, then stamped with the six
 * states (lib/queryState). A second surface reads one row from this, so its row is the Query Centre's row.
 */
export function stampedCardRows(queries: readonly Query[], agents: readonly Agent[], activities: readonly Activity[], quietWeeks: number, nowMs: number): QcRow[] {
  return stampRows(buildQcRows(queries as Query[], agents as Agent[], activities as Activity[], nowMs), agents as Agent[], { quietWeeks, nowMs });
}

export function buildCardView(i: CardViewIn) {
  const { row, q, ag, ms, packages, queries, manuscripts, quietWeeks } = i;
  const now = i.nowMs;
  const trackingEvents = i.events as never[];
  /* v149.1 B3 — a step with no date stays undated (the shared builder reads it as now) and sorts last */
  const noDate = undatedIds(trackingEvents as { id?: unknown; createdAt?: unknown }[]);
  const ledger = [...buildTimelineRows(trackingEvents, q, ag as never)].map((r0) => (r0.activityId && noDate.has(r0.activityId) ? { ...r0, timeMs: undefined } : r0))
    .sort((a, b) => (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity));
  const steps: CardStep[] = ledger.map((r0, ix) => ({ key: r0.key, activityId: r0.activityId, title: r0.title, ms: r0.timeMs ?? null, status: r0.kind ? null : r0.status, root: ix === 0 }));
  const sv = sentView(q, packages as SubmissionPackage[]);
  const sent = sv.pieces.map((pc) => ({ label: pc.key === "sample" && pc.value ? capWord(pc.value.split(" · ")[0]) : pc.label }));
  /* v149.1 Part A — the story, the next step, the strip and the Agent tab, every value from the record (lib/qcCardStory) */
  const firstName = (ag?.name || "").trim().split(/\s+/)[0] || ag?.agency || "the agent";
  const storyCtx = { row, first: firstName, nowMs: now, agentWeeks: typeof ag?.responseTimeWeeks === "number" && ag.responseTimeWeeks > 0 ? ag.responseTimeWeeks : null };
  const story = storySteps({ rows: ledger, query: q, manuscript: ms, sentWithQuery: sent.map((x) => x.label) });
  const toAgent = queries.filter((x) => x.agentId === q.agentId);
  const msGenres = [ms?.genre, ...((ms as { subGenres?: string[] } | null)?.subGenres ?? [])].filter(Boolean).map((g) => String(g).trim().toLowerCase());
  const agView = qcAgentView(ag, toAgent as Query[], (id) => manuscripts.find((m) => m.id === id)?.title ?? "A manuscript", q.id, now);
  const site = (ag?.website ?? "").trim();
  const nl = nextLine(row, null, now);
  const door = row.court === "closed" ? null : nextDoor(row, now);
  const first = (ag?.name || "").trim().split(/\s+/)[0] || "the agent";

  /* ══ v152 §2 — the desktop card's thread, reply box and tabs (lib/qcThread152 derives; this only gathers) ══
     ⚠️ A STEP'S CHIPS ARE WHAT WAS RECORDED ON IT (recon A): Query sent shows the query's record, a step whose log
        carries `materials` shows those, and every other step shows none — nothing is copied from a neighbour. */
  let v152: QcCard152Data | undefined;
  const evStore = new Map((trackingEvents as { id?: string; materials?: unknown }[]).map((e) => [String(e.id ?? ""), e]));
  if (i.desk) {
    const free = i.free;
    const KIND: Record<string, string> = { ql: "Your query letter.", syn: "Your synopsis.", sample: "Your opening sample.", other: "What you sent with the query." };
    const queryChips = sv.pieces.map((pc) => {
      const label = pc.key === "sample" && pc.value ? capWord(pc.value.split(" · ")[0]) : pc.label;
      const detail = free ? KIND[pc.key] ?? label
        : pc.key === "sample" ? capWord(pc.value || "Opening sample")
        : pc.value ? `${pc.label} · ${pc.value}` : KIND[pc.key] ?? label;
      return { label, detail };
    });
    const evById = evStore;
    const stepChips = (activityId?: string) => {
      const m = activityId ? evById.get(activityId)?.materials : undefined;
      if (!Array.isArray(m)) return [];
      /* v152.1 — a step's recorded materials are maps ({ kind, name, unit, n, versionId }: lib/qc152Write storeMats); v152
         read a `label` they never carry, so every step's own materials drew nothing. Read them as the writer wrote them. */
      const vs = bookVersionsOf(ms);
      return storedLabels(m, { free, versionName: (id) => vs.find((v) => v.id === id)?.name ?? null, originalId: vs[0]?.id ?? null })
        .map((label) => ({ label, detail: label }));
    };
    /* v152.1 §2.6 — what the agent said: the step's own `replyNote`; on an older query, the one text the query holds for
       that kind of reply, shown on the LATEST step of that kind only (display-only, Nick: rrNotes, rejectionFeedbackText,
       offerNotes). A holding reply's words are its log note. New saves write `replyNote` and never the old fields. */
    const evData = (id?: string) => (id ? (evStore.get(id) as Record<string, unknown> | undefined) : undefined);
    const LEGACY: Partial<Record<string, string | undefined>> = {
      [QueryStatus.REVISE_RESUBMIT]: q.rrNotes, [QueryStatus.REJECTED]: q.rejectionFeedbackText, [QueryStatus.OFFER]: q.offerNotes,
    };
    const latestOf = (st: QueryStatus | null) => [...story].reverse().find((y) => y.status === st && !y.kind)?.key;
    const quoteOf = (x: (typeof story)[number]): string | null => {
      const own = evData(x.activityId)?.replyNote;
      if (typeof own === "string" && own.trim()) return own.trim();
      if (x.kind === "holding") { const n = evData(x.activityId)?.note; return typeof n === "string" && n.trim() ? n.trim() : null; }
      const leg = x.status && !x.kind ? LEGACY[x.status] : undefined;
      return leg && leg.trim() && latestOf(x.status) === x.key ? leg.trim() : null;
    };
    /* §2.5 a close's reason, in italic: the close's first note, read as a phrase ("an offer elsewhere") */
    const reason = (() => { const r = (q.closingNotes ?? "").split(" · ")[0].trim(); return r ? r.charAt(0).toLowerCase() + r.slice(1) : null; })();
    const latestKey = (st: QueryStatus) => [...story].reverse().find((y) => y.status === st && !y.kind)?.key;
    const stepExtras152 = (x: (typeof story)[number]): Pick<ThreadStepIn, "askedFor" | "sub" | "event"> => {
      const e = evData(x.activityId) ?? {};
      const ev = typeof e.eventKey === "string" ? e.eventKey : null;
      const askedFor = typeof e.askedFor === "string" && e.askedFor.trim() ? e.askedFor.trim() : null;
      let sub: string | null = null;
      if (x.status === QueryStatus.REJECTED && !x.kind) {
        const fb = typeof e.feedbackType === "string" ? e.feedbackType : null;
        const kind = fb ? (fb === "Yes" || fb === "detailed" ? "Personal rejection" : "Form rejection") : null;
        sub = [kind, e.openToMore === true ? "open to more work" : null].filter(Boolean).join(" · ") || null;
      }
      if (x.status === QueryStatus.OFFER && !x.kind && latestKey(QueryStatus.OFFER) === x.key) { const t = anyToMs(q.offerResponseDeadline); if (t != null) sub = `Answer by ${dayLabel152(t, now)}`; }
      if (x.status === QueryStatus.REVISE_RESUBMIT && !x.kind && q.status === QueryStatus.REVISE_RESUBMIT && latestKey(QueryStatus.REVISE_RESUBMIT) === x.key) {
        const t = anyToMs(q.expectedSendDate); if (t != null) sub = `Resubmit by ${dayLabel152(t, now)}`;
      }
      if ((x.status === QueryStatus.FULL_REQUESTED || x.status === QueryStatus.PARTIAL_REQUESTED) && !x.kind && q.status === x.status && latestKey(x.status) === x.key) {
        const t = anyToMs(q.expectedSendDate); if (t != null) sub = `Send by ${dayLabel152(t, now)}`;
      }
      return { askedFor, sub, event: ev };
    };
    const tSteps: ThreadStepIn[] = story.map((x) => ({
      key: x.key, activityId: x.activityId, status: x.status, kind: x.kind, ms: x.ms,
      chips: x.status === QueryStatus.QUERIED && !x.kind ? (stepChips(x.activityId).length ? stepChips(x.activityId) : queryChips) : stepChips(x.activityId),
      via: x.status === QueryStatus.QUERIED && !x.kind ? methodQualifier(q.sendMethod)
        : x.kind === "nudge" ? methodQualifier(q.sendMethod)
        : !x.kind && (x.status === QueryStatus.WITHDRAWN || x.status === QueryStatus.NO_RESPONSE) ? reason : null,
      quote: quoteOf(x),
      /* v152.2 §5 — what the step itself carries: "Something else", the kind of no, an offer's and an R&R's dates */
      ...stepExtras152(x),
    }));
    /* §2.5 told other agents: its own steps on the log (not statuses, so the story does not carry them) */
    for (const e of trackingEvents as { id?: string; type?: string; createdAt?: unknown; toldCount?: unknown; toldDeadline?: unknown }[]) {
      if (e.type !== TOLD_TYPE || !e.id) continue;
      const ms0 = getActivityTime(e.createdAt as never);
      /* stored as the day at local noon, ISO (dayIso), as the marks' `offerToldOn` is */
      const dl = typeof e.toldDeadline === "string" ? new Date(e.toldDeadline).getTime() : NaN;
      tSteps.push({ key: `t-${e.id}`, activityId: e.id, status: null, kind: "told", ms: Number.isFinite(ms0) && ms0 > 0 ? ms0 : null, chips: [],
        toldCount: typeof e.toldCount === "number" ? e.toldCount : null, via: Number.isFinite(dl) ? `offer deadline ${dayLabel152(dl, now)}` : null });
    }
    const nrmnRaw = typeof (q as { nrmnOverride?: unknown }).nrmnOverride === "boolean" ? (q as { nrmnOverride?: boolean }).nrmnOverride! : ag?.noResponseMeansNo;
    const state = stateOf(row) ?? qsOf({ ...row, nrmn: !!nrmnRaw }, { quietWeeks, nowMs: now });
    const heard = [...tSteps].reverse().find((x) => x.ms != null && side152(x) === "them");
    const lastMs = [...tSteps].reverse().find((x) => x.ms != null)?.ms ?? null;
    const lsc = q.lastStatusChange ? new Date(q.lastStatusChange as string).getTime() : NaN;
    v152 = {
      state,
      replyMs: (row as { replyMs?: number | null }).replyMs ?? row.expectedMs,
      dueMs: row.court === "agent" ? null : row.expectedMs,
      closedMs: state === "closed" ? (Number.isFinite(lsc) ? lsc : lastMs) : null,
      steps: tSteps,
      agentWeeks: storyCtx.agentWeeks,
      nrmn: typeof nrmnRaw === "boolean" ? nrmnRaw : null,
      free,
      queriedVia: methodQualifier(q.sendMethod),
      asks: (ag?.materialsWanted ?? []).map((x) => String(x)).filter(Boolean),
      sentLabels: sent.map((x) => x.label),
      lastHeardMs: heard?.ms ?? null,
      how: submissionWords(ag),
      quietWeeks,
      reason,
      nudged: nudgeMsOf({ ...row, nrmn: !!nrmnRaw }, now) != null,
      foot: (() => {
        /* v152.2 §3.2 — the footer's facts: an offer answered with time taken is Deciding; signed is Offer accepted */
        const toldStep = tSteps.some((x) => x.kind === "told");
        const offerEv = [...(trackingEvents as { resultingStatus?: string; type?: string; tellLater?: unknown; createdAt?: unknown }[])]
          .filter((e) => e.resultingStatus === QueryStatus.OFFER || e.type === QueryStatus.OFFER)
          .sort((a, b) => getActivityTime(a.createdAt as never) - getActivityTime(b.createdAt as never)).pop();
        const toTell = queries.filter((x) => x.offerRefQueryId === q.id && x.offerTold === false).length;
        const phase = q.status === QueryStatus.SIGNED ? "signed" as const
          : q.status === QueryStatus.OFFER ? (toldStep || offerEv?.tellLater === true ? "deciding" as const : "offer" as const) : null;
        const reqStep = [...tSteps].reverse().find((x) => x.status === QueryStatus.PARTIAL_REQUESTED && !x.kind);
        return {
          fullName: ag?.name || ag?.agency || row.agentName,
          phase,
          dueMs: row.court === "agent" ? null : row.expectedMs,
          replyMs: row.expectedMs,
          nudgeMs: nudgeMsOf({ ...row, nrmn: !!nrmnRaw }, now),
          quietWeeks,
          closeLeads: !!(row as { closeLeads?: boolean }).closeLeads,
          toTell: phase === "signed" && offerEv?.tellLater !== true ? 0 : toTell,
          askedFor: q.status === QueryStatus.PARTIAL_REQUESTED ? reqStep?.askedFor ?? null : null,
          closedMs: state === "closed" ? (Number.isFinite(lsc) ? lsc : lastMs) : null,
          closedHow: q.status === QueryStatus.REJECTED ? "passed" as const : q.status === QueryStatus.NO_RESPONSE ? "noresp" as const
            : q.status === QueryStatus.WITHDRAWN ? (q.closingReason === "offer_declined" ? "declined" as const : "withdrawn" as const) : null,
        };
      })(),
    };
  }

  /** the props the card READS (the caller adds the handlers, the mode and the order) */
  const display = {
    row,
    nowMs: now,
    msTitle: ms?.title ?? null,
    packageName: sv.how === "package" ? sv.name : null,
    sent,
    agent: {
      name: ag?.name || ag?.agency || row.agentName,
      agency: ag?.name ? (ag?.agency ?? "") : "",
      email: ag?.email ?? "",
      replyWeeks: typeof ag?.responseTimeWeeks === "number" && ag.responseTimeWeeks > 0 ? ag.responseTimeWeeks : null,
      firstQueried: row.sentMs != null ? `${fieldDay(row.sentMs)}${row.dayN != null ? ` · day ${row.dayN}` : ""}` : "—",
      first: (ag?.name || "").trim().split(/\s+/)[0] || null,
    },
    steps,
    bookChips: qcBookChips(ms),
    story,
    nextStep: nextStepOf(storyCtx),
    strip: stripOf(storyCtx),
    agentView: agView,
    wishlist: { text: (ag?.mswlNotes ?? "").trim(), genres: (ag?.genres ?? []).map((g) => ({ label: g, hit: msGenres.includes(g.trim().toLowerCase()) })) },
    contact: { email: (ag?.email ?? "").trim(), website: site, websiteHref: site ? hrefFor(site) ?? null : null, submission: submissionWords(ag) },
    due: row.court === "closed" ? { line: nl.line, hot: false } : { line: nl.line, hot: nl.hot },
    primary: door ? { label: door.label, respond: door.mode === "resp", close: door.mode === "close" } : null,
    v152,
  };

  return { ledger, steps, sv, sent, storyCtx, story, firstName, first, toAgent, msGenres, agView, site, nl, door, evStore, v152, display };
}
