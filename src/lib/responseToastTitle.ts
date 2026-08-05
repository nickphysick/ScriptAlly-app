/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The undo-toast title, keyed on recordResponse's responseType union — the ONE vocabulary the
 * record flows actually produce. The old inline version (Queries.tsx) also compared against
 * camelCase strings nothing produces ("partialRequested", "fullRequested", "reviseAndResubmit",
 * "noResponse"), so those branches were unreachable and the types they meant to serve fell
 * silently to the generic title (Tier 3 · Phase 1). Typing the parameter on the union makes that
 * class of bug uncompilable.
 */
import type { RecordResponseData } from "./recordResponse";

export type ResponseStyle = RecordResponseData["responseType"];

/**
 * `null` = the caller recorded something without a specific response type (the focus form's
 * message path, whose prose the toast never rendered anyway) — the honest generic title.
 * The switch is exhaustiveness-guarded: adding a union member without a title fails to compile.
 */
export function responseToastTitle(resType: ResponseStyle | null): string {
  if (resType === null) return "Response recorded";
  switch (resType) {
    case "partial": return "Partial request recorded";
    case "full": return "Full request recorded";
    case "rr": return "R&R recorded";
    case "offer": return "Offer recorded";
    case "rejected": return "Rejection recorded";
    case "close": return "Query closed";
    case "queried": return "Response recorded"; // reversion to Queried — nothing new to announce
    default: {
      const unhandled: never = resType;
      return unhandled;
    }
  }
}
