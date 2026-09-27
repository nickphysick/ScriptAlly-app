/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which journey each door opens (brief §F), as pure data — the Query Centre's row actions and the
 * query card's footer both read it, so the two cannot offer different verbs for one status.
 *
 * ⚠️ `DRAWER_LIVE` IS THE CUT-OVER, ONE JOURNEY AT A TIME (brief §I): "until a journey lands, its
 * old flow stays live". A door asks whether its journey is live and, if not, keeps its old route.
 * When every journey is live the flag and the old routes are deleted together.
 */
import { QueryStatus } from "../../types";
import type { DrawerMode } from "./drawerStore";

export const DRAWER_LIVE: Record<DrawerMode, boolean> = {
  log: false,
  resp: false,
  sent: false,
  nudge: false,
  close: false,
  offer: false,
  edit: false,
};

const OWED: ReadonlySet<string> = new Set([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);
const ENDED: ReadonlySet<string> = new Set([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);

export interface Door { mode: DrawerMode; label: string; primary?: boolean }

/** The query card's footer, by status — the mock's table (MOCK-SPEC §3.4). */
export function cardDoors(status: QueryStatus | string): Door[] {
  if (ENDED.has(status)) return [{ mode: "resp", label: "Record a late reply", primary: true }];
  if (status === QueryStatus.SIGNED) return [];
  if (status === QueryStatus.OFFER) return [{ mode: "offer", label: "Offer: next steps", primary: true }];
  if (OWED.has(status)) return [
    { mode: "sent", label: "I've sent it", primary: true },
    { mode: "resp", label: "Record a response" },
    { mode: "close", label: "Close" },
  ];
  return [
    { mode: "resp", label: "Record a response", primary: true },
    { mode: "nudge", label: "Nudge" },
    { mode: "close", label: "Close query" },
  ];
}

/** A Query Centre row's hover actions, by status (MOCK-SPEC §3.3). */
export function rowDoors(status: QueryStatus | string): Door[] {
  if (OWED.has(status)) return [{ mode: "sent", label: "✓ SENT IT" }];
  if (status === QueryStatus.OFFER) return [{ mode: "offer", label: "OFFER" }];
  if (status === QueryStatus.SIGNED) return [];
  if (ENDED.has(status)) return [{ mode: "resp", label: "LATE REPLY" }];
  return [{ mode: "resp", label: "✓ RESPONSE" }, { mode: "nudge", label: "NUDGE" }];
}

/** The card's primary — the first door, when its journey is live. */
export function primaryDoor(status: QueryStatus | string): Door | null {
  const d = cardDoors(status).find((x) => x.primary) ?? null;
  return d && DRAWER_LIVE[d.mode] ? d : null;
}
