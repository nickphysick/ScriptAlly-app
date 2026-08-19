/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskPaneJourney — the data side of the port.
 *
 * ⚠️ THIS FILLS IN THE MOCKUP'S `DATA` SHAPE AND NOTHING MORE. `design-refs/todo-materials-contract.html`
 * declares one object per journey — deed, sub, fig/figU, btns, tiles, actTitle/actSub/body,
 * will/quiet/prim, tl — and the pane renders whatever is in it. So the wiring's whole job is to
 * answer those fields from a `BoardCard`; it never reaches into the pane's markup, and the pane
 * never branches on a task type.
 *
 * ⚠️ ABSENCE IS A VALUE HERE, NOT A MISSING BRANCH. `fig: null` is what puts `.nofig` on the band;
 * `tiles: null` hides the row; `tl: null` drops the timeline card and leaves the workrow one
 * column. Every one of those is the mockup's own handling, which is exactly why the structure does
 * not have to bend when a journey is thin.
 *
 * ⚠️ THE DERIVATIONS ARE THE ONES ALREADY IN THE APP — `liveFamily`/`GROUP_CLASS` for the paper,
 * `bandDeed`/`bandSubline` for the words, `panePresence` for what a journey carries, `cardBucket`
 * for the act. Re-deriving any of them here would give the pane a second opinion about a card the
 * rest of the page has already settled.
 */
import React from "react";
import { BoardCard } from "./todoBoard";
import { GROUP_CLASS, liveFamily } from "./todoFamily";
import { bandDeed, bandSubline, bandPreline, panePresence } from "./todoHandoff";
import { cardFootHint } from "./todoBuckets";
import type { TaskPaneEvent, TaskPaneJourney, TaskPaneTile } from "../components/todo/TaskPane";

/** what the page hands in — every one of these is already computed for the list */
export interface JourneyInputs {
  card: BoardCard;
  /** the rail's own figure, so the two surfaces cannot state different waits */
  figure: { value: string; unit: string } | null;
  /** the stat pair the header already derives */
  facts: { k: string; v: string }[];
  /** what already went to this agent, formatted through the one formatter */
  sentPreviously: string | null;
  /** the activity-log timeline, in order */
  events: { key: string; label: string; when: string; via?: string; incoming?: boolean; minor?: boolean }[];
  /** the verb the list row states, so the pane cannot name the deed differently */
  primaryLabel: string;
  /** what pressing the primary will write */
  will: string;
  body: React.ReactNode;
  btns?: { label: string; onPress: (anchor: HTMLElement) => void }[];
  quiet?: { label: string; onPress: () => void };
  onOpenQuery?: () => void;
  primDisabled?: boolean;
}

/**
 * ⚠️ THE DEED CARRIES AN `<em>` (the mockup: `Send your <em>full manuscript</em>`), and it is built
 * rather than parsed out of a string. The emphasis falls on the OBJECT — what is being sent, chased
 * or logged — because that is the word you scan for; the verb is the same on every card in a group.
 */
function deedNode(c: BoardCard): React.ReactNode {
  const text = bandDeed(c);
  /* the object is everything after the first two words ("Send your …", "Chase your …", "Log the …") */
  const m = /^(\S+\s+\S+\s+)(.+)$/.exec(text);
  if (!m) return text;
  return <>{m[1]}<em>{m[2]}</em></>;
}

/** the mockup's `tl` kinds, from what the event already knows */
function eventKind(e: JourneyInputs["events"][number]): TaskPaneEvent["kind"] {
  if (e.minor) return "minor";
  return e.incoming ? "in" : "";
}

export function buildJourney(input: JourneyInputs): TaskPaneJourney {
  const { card: c } = input;
  const presence = panePresence(c);
  const isNote = !!(c.userTaskId || c.nature || c.stream === "nt");

  /**
   * ⚠️ A LABEL MAY NOT REPEAT INSIDE ONE TILE ROW (frame2 Phase 3). `paneFacts` can return two
   * entries whose keys resolve to the same word — a card with no query behind it produced "Added"
   * twice, one reading "12 days" and one "7 August", which states one fact under one name in two
   * places and invites the reader to think they are different. The FIRST wins: it is the row's own
   * order, and the second was the duplicate.
   */
  const seen = new Set<string>();
  const tiles: TaskPaneTile[] | null = presence.tiles
    ? [
        ...input.facts.map((f) => ({ k: f.k, val: f.v })),
        {
          k: "Sent previously",
          val: input.sentPreviously ?? "None sent",
          absent: !input.sentPreviously,
        },
      ].filter((t) => {
        const key = t.k.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    : null;

  /**
   * ⚠️ THE TERMINUS IS PART OF THE DATA, not something the pane appends. The mockup's own array
   * ends `['now','Your turn','Today']`, so a rail that stopped at the last thing that happened
   * would be a shorter array, not a different renderer.
   */
  const tl: TaskPaneEvent[] | null = presence.timeline
    ? [
        ...input.events.map((e) => ({
          key: e.key,
          kind: eventKind(e),
          t: e.label,
          d: e.via ? `${e.when} · ${e.via}` : e.when,
        })),
        { key: "__now", kind: "now" as const, t: "Your turn", d: "Today" },
      ]
    : null;

  return {
    cls: `u-${GROUP_CLASS[liveFamily(c)]}` as TaskPaneJourney["cls"],
    deed: isNote ? c.title : deedNode(c),
    hand: isNote,
    sub: isNote ? cardFootHint(c) : bandSubline(c, bandPreline(c)),
    fig: presence.figure && input.figure?.value ? input.figure.value : null,
    figU: input.figure?.unit ?? "",
    btns: input.btns,
    tiles,
    actTitle: input.primaryLabel,
    actSub: cardFootHint(c),
    body: input.body,
    will: input.will,
    quiet: input.quiet,
    prim: input.primaryLabel,
    primDisabled: input.primDisabled,
    tl,
    onOpenQuery: c.relatedRecordId ? input.onOpenQuery : undefined,
  };
}
