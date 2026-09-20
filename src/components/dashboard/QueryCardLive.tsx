/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCardLive — the card's reading half (to-do row round, 20 Sep).
 *
 * ⚠️ A SEPARATE MODULE SO THE PANEL CAN `React.lazy` IT, AND THAT IS NOT AN OPTIMISATION. It reaches
 * `useDockActivity` → `lib/firebase`, which initialises the SDK at module load, and a static import
 * from the dashboard would stop eleven suites COLLECTING.
 *
 * ⚠️ THE AUTHORITATIVE STORE, NOT THE FEED'S OWN ARRAY. The dashboard feed is built from the GLOBAL
 * `users/{uid}/activities` projection, which is a best-effort twin; the per-query subcollection is
 * what the Query Centre and the task pane read. A card built from the row that opened it would show
 * a history the rest of the app disagrees with.
 *
 * ⚠️ ONE LISTENER, AND IT GOES WHEN THE CARD GOES. Only one card is open at a time, and this is
 * only mounted while one is — so the subscription's life is the popover's.
 */
import React, { useMemo } from "react";
import { QueryCard, type QueryCardModel } from "./QueryCard";
import { useDockActivity } from "../todo/useDockActivity";
import { dockTimeline } from "../../lib/dockTimeline";
import { toEntry, withTerminus } from "../../lib/taskPaneJourney";
import { replyWindow } from "../../lib/dashTodo";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { getStatusLabel } from "../StatusPill";
import { formatQueryMaterials } from "../../lib/materials";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { daysBetween } from "../../lib/elapsed";
import { QueryStatus, type Agent, type Manuscript, type Query } from "../../types";

export const QueryCardLive: React.FC<{
  uid: string | undefined;
  query: Query;
  agent: Agent | undefined;
  manuscript: Manuscript | undefined;
  anchor: HTMLElement;
  onClose: () => void;
  onOpenQuery: (queryId: string) => void;
}> = ({ uid, query, agent, manuscript, anchor, onClose, onOpenQuery }) => {
  const rows = useDockActivity(uid, query.id);
  const status = query.status as QueryStatus;

  const model = useMemo<QueryCardModel>(() => {
    const act = getPrimaryAction(status);

    const rungs = dockTimeline(rows, { sendMethod: query.sendMethod ? String(query.sendMethod) : undefined })
      .map((e) => toEntry({
        key: e.key, label: e.label, when: e.when, via: e.via, status: e.status as string | undefined,
        incoming: /requested|offer|rejected|response|reply/i.test(e.label),
      }));

    /**
     * ⚠️ THE TERMINUS ONLY APPEARS WHERE THE BALL IS ACTUALLY WITH THE WRITER. The task pane appends
     * it unconditionally and is right to: it only ever opens on a live task the writer owes
     * something on. This card opens on ANY query — including closed ones — and a rejection ending
     * in a rust "Your turn · Today" tells a writer they owe a reply to an agency that has said no.
     */
    const events = act.ballHolder === "writer" ? withTerminus(rungs) : rungs;

    /**
     * ⚠️ THE BAND IS DERIVED FROM THE STATUS, NOT FROM `ballHolder` (Nick, 20 Sep — and he is right
     * that letting `null` mean "closed" was the fault rather than the offer being an exception).
     *
     * `getPrimaryAction` answers "whose move decides the next rung", and it returns `null` for an
     * OFFER exactly as it does for the three terminal states — because an offer's next move is
     * neither party's alone. That is a correct answer to its own question and the wrong input for
     * this one: read as "closed" it put a stone **CLOSED** band over a live offer at Day 110, with
     * the status pill beside it reading "Offer". An offer is the most alive a query gets.
     *
     * So the status decides, and `ballHolder` only splits the two live directions beneath it. The
     * three terminal states are named, so a tenth status arriving in the enum lands on the live side
     * and is visible rather than being quietly filed as closed.
     */
    const CLOSED = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];
    const court = status === QueryStatus.OFFER
      /* with the writer: an offer is theirs to answer */
      ? { label: "An offer", band: "rose" as const }
      : CLOSED.includes(status)
        ? { label: "Closed", band: "stone" as const }
        : act.ballHolder === "writer"
          ? { label: "With you", band: "rose" as const }
          : { label: "With the agency", band: "sand" as const };

    const sentMs = query.dateSent ? new Date(query.dateSent).getTime() : NaN;
    const day = Number.isFinite(sentMs) ? `Day ${Math.max(0, daysBetween(sentMs, Date.now()))}` : null;

    const w = replyWindow(status, agent?.responseTimeWeeks);
    const weeks = Math.round(w.days / 7);

    const tags = [manuscript?.ageCategory, manuscript?.genre,
      typeof manuscript?.wordCount === "number" ? `${manuscript.wordCount.toLocaleString("en-GB")} words` : null]
      .filter((t): t is string => !!t);

    return {
      court,
      day,
      agent: {
        /* ⚠️ THE APP'S OWN AGENT DISPLAY, WHICH HANDLES THE AGENCY-LESS RECORD. */
        name: agentPrimary(agent),
        ...((a) => (a ? { agency: a } : {}))(agentSecondary(agent)),
        initials: agentInitials(agent),
      },
      status: status ?? null,
      /* through the app's ONE status-word function — what the Query Centre's pill reads */
      statusWord: getStatusLabel(status),
      ms: manuscript?.title ? { title: manuscript.title, tags } : null,
      events,
      /**
       * ⚠️ STATED FACTS ONLY, AND AN ABSENT ONE SAYS SO. A blank row where an agency stated no
       * window would read as "no window"; `—` reads as "they did not say", which is the truth.
       */
      agentFacts: [
        { k: "Agency", v: agent?.agency || "—" },
        { k: "Reply window", v: w.stated ? `${weeks} weeks (theirs)` : "Not stated" },
        { k: "Email", v: agent?.email || "—" },
        { k: "Queried", v: query.dateSent ? new Date(query.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—" },
      ],
      materials: [
        { k: "Sent", v: formatQueryMaterials(query.materialsWanted) || "Nothing recorded" },
        { k: "How", v: query.sendMethod ? String(query.sendMethod) : "—" },
      ],
      /* ⚠️ "THEIR window" ONLY WHERE THE AGENCY STATED ONE — the house assumption is labelled as
         the house's, because printing it under their name puts words in their mouth. */
      window: w.stated ? `Their window · ${weeks} weeks` : `House window · ${weeks} weeks`,
      onOpenQuery: () => onOpenQuery(query.id),
    };
  }, [rows, query, agent, manuscript, status, onOpenQuery]);

  return <QueryCard model={model} anchor={anchor} onClose={onClose} />;
};
