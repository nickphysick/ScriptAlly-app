/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryPeekLive — the peek's reading half (feed/to-do pass, 20 Sep).
 *
 * ⚠️ A SEPARATE MODULE SO THE PANEL CAN `React.lazy` IT, AND THAT IS NOT AN OPTIMISATION. It reaches
 * `useDockActivity` → `lib/firebase`, which initialises the Firebase SDK AT MODULE LOAD; this repo's
 * test environment is `node` with no emulator, so a static import from the dashboard would put
 * `auth/invalid-api-key` into eleven suites' import graph and they would stop COLLECTING — the
 * failure that reads as "no tests found" rather than as a red. `DashTaskDrawer` is the same shape
 * for the same reason.
 *
 * ⚠️ THE AUTHORITATIVE STORE, NOT THE FEED'S OWN ARRAY. The dashboard feed is built from the GLOBAL
 * `users/{uid}/activities` projection, which is a best-effort twin; the per-query subcollection is
 * what the Query Centre and the task pane read. A peek built from the row that opened it would show
 * a history the rest of the app disagrees with.
 *
 * ⚠️ ONE LISTENER, AND IT GOES WHEN THE PEEK GOES. Only one peek is open at a time, and this is only
 * mounted while one is — so the subscription's life is the popover's.
 */
import React, { useMemo } from "react";
import { QueryPeek, type QueryPeekModel } from "./QueryPeek";
import { useDockActivity } from "../todo/useDockActivity";
import { dockTimeline } from "../../lib/dockTimeline";
import { toEntry, withTerminus } from "../../lib/taskPaneJourney";
import { replyWindow } from "../../lib/dashTodo";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { getStatusLabel } from "../StatusPill";
import { formatQueryMaterials } from "../../lib/materials";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import type { Agent, Query, QueryStatus } from "../../types";

export const QueryPeekLive: React.FC<{
  uid: string | undefined;
  query: Query;
  agent: Agent | undefined;
  anchor: HTMLElement;
  onClose: () => void;
  onOpenQuery: (queryId: string) => void;
  onOpenAgent: (agentId: string) => void;
  /** the next thing to do, which the CARD owns — the peek states it and the card performs it */
  onAct: (queryId: string) => void;
}> = ({ uid, query, agent, anchor, onClose, onOpenQuery, onOpenAgent, onAct }) => {
  const rows = useDockActivity(uid, query.id);
  const status = query.status as QueryStatus;

  const model = useMemo<QueryPeekModel>(() => {
    const act = getPrimaryAction(status);

    const rungs = dockTimeline(rows, { sendMethod: query.sendMethod ? String(query.sendMethod) : undefined })
      .map((e) => toEntry({
        key: e.key, label: e.label, when: e.when, via: e.via, status: e.status as string | undefined,
        /* the ref's `in` rung — an event the AGENT caused. The same test the pane applies. */
        incoming: /requested|offer|rejected|response|reply/i.test(e.label),
      }));

    /**
     * ⚠️ THE TERMINUS ONLY APPEARS WHERE THE BALL IS ACTUALLY WITH THE WRITER. The task pane appends
     * it unconditionally and is right to: it only ever opens on a live task the writer owes
     * something on. This peek opens on ANY query in the feed — including closed ones — and a
     * rejection ending in a rust "Your turn · Today" tells a writer they owe a reply to an agency
     * that has said no. Measured on a `Rejected` query before this branch existed.
     *
     * ⚠️ AND ON THE AGENT'S TURN THERE IS NO TERMINUS EITHER. The last rung IS the current state:
     * they have it, and "Your turn" would be false in the other direction.
     */
    const events = act.ballHolder === "writer" ? withTerminus(rungs) : rungs;

    /* ⚠️ THE WINDOW IS `replyWindow`'S, WHICH THE TO-DO ROW AND THE TASK PANEL ALSO READ, and a
       window nobody stated says so rather than being printed as though the agency had given it. */
    const w = replyWindow(status, agent?.responseTimeWeeks);
    const weeks = Math.round(w.days / 7);

    return {
      status: status ?? null,
      /* ⚠️ THROUGH THE APP'S ONE STATUS-WORD FUNCTION — what the Query Centre's pill reads, so the
         two cannot come to call one status two things. */
      statusWord: getStatusLabel(status),
      agent: {
        /* ⚠️ THE APP'S OWN AGENT DISPLAY, WHICH HANDLES THE AGENCY-LESS RECORD. An agent may be
           stored with an agency and no name; `agentPrimary`/`agentSecondary` decide which line is
           which, and the peek must not have its own opinion about that. */
        name: agentPrimary(agent),
        ...((a) => (a ? { agency: a } : {}))(agentSecondary(agent)),
        initials: agentInitials(agent),
        ...(agent?.id ? { onOpen: () => onOpenAgent(agent.id) } : {}),
      },
      facts: [
        /* ⚠️ "The house window" IS A DIFFERENT CLAIM FROM "Their window", AND IT IS LABELLED AS ONE.
           Printing an assumed figure under the agency's name would put words in their mouth. */
        { k: w.stated ? "Their window" : "House window", v: `${weeks} week${weeks === 1 ? "" : "s"}` },
        { k: "Sent previously", v: formatQueryMaterials(query.materialsWanted) || "None sent" },
      ],
      events,
      onOpenQuery: () => onOpenQuery(query.id),
      /* ⚠️ NO ACTION ON A QUERY THAT IS FINISHED. `ballHolder: null` is the CTA engine's own word for
         a terminal state, and an ink pill saying "Record response" on a rejection is an invitation
         to record something that already happened. */
      ...(act.ballHolder ? { primary: { label: act.label, onPress: () => onAct(query.id) } } : {}),
    };
  }, [rows, query, agent, status, onOpenQuery, onOpenAgent, onAct]);

  return <QueryPeek model={model} anchor={anchor} onClose={onClose} />;
};
