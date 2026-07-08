/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryPrimaryAction — the ONE pure status→primary-action map (the "CTA engine").
 *
 * Whose turn is it? The agent's-turn states record a response; the writer's-turn states (the
 * agent asked, the writer owes materials) open the Mark-Sent flow instead; terminal states keep
 * the plain "Record response" behaviour. Lifted out of Queries.tsx so the Queries command bar AND
 * the To-do focus/ledger flows share ONE source — a duplicated copy would drift the first time the
 * taxonomy changes (and QueryStatus strings are already a recurring regression source).
 *
 * DELIBERATELY PURE: it maps a status to an action descriptor and nothing else — no popover/menu
 * wiring, no React, no Firebase. Consumers own the wiring (Queries anchors MarkSentPopover to its
 * command bar; the focus flow anchors it to the "Do it" button). Locked in queryPrimaryAction.test.ts.
 */

import { QueryStatus } from "../types";

export type PrimaryBallHolder = "writer" | "agent";
/** Structurally identical to MarkSentPopover's MarkSentKind — kept here so the map has no component dep. */
export type PrimaryMarkKind = "partial" | "full" | "resubmit";

export type PrimaryAction =
  | { kind: "record"; label: string; ballHolder: PrimaryBallHolder | null }
  | { kind: "mark-sent"; markKind: PrimaryMarkKind; target: QueryStatus; label: string; ballHolder: "writer" };

export const getPrimaryAction = (status: QueryStatus): PrimaryAction => {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED:
      return { kind: "mark-sent", markKind: "partial", target: QueryStatus.PARTIAL_SENT, label: "Mark partial as sent", ballHolder: "writer" };
    case QueryStatus.FULL_REQUESTED:
      return { kind: "mark-sent", markKind: "full", target: QueryStatus.FULL_SENT, label: "Mark full as sent", ballHolder: "writer" };
    case QueryStatus.REVISE_RESUBMIT:
      return { kind: "mark-sent", markKind: "resubmit", target: QueryStatus.FULL_SENT, label: "Record your resubmission", ballHolder: "writer" };
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
      return { kind: "record", label: "Record response", ballHolder: "agent" };
    default:
      // OFFER / REJECTED / WITHDRAWN / NO_RESPONSE — no ball-holder chip.
      return { kind: "record", label: "Record response", ballHolder: null };
  }
};
