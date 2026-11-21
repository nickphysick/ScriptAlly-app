/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v164 (design-refs/query-card-v164/) — WHAT THE SLIDE-IN CARD'S STRIP SAYS: the grid card's four-step track
 * (lib/qc153 `slipTrack`, drawn by QcSlip153 `Track153`) and the status's own display name (lib/qcSummary `STAGE_NAME`),
 * in place of v152.2's "YOUR MOVE" / "WITH THE AGENT" word. The footer already says whose move it is.
 *
 * ⚠️ The strip's accessible name is "{Status}, step {n} of 4"; a closed query's is its status alone (it stopped).
 */
import { STAGE_NAME, type QcRow } from "./qcSummary";
import { slipTrack, type SlipTrack } from "./qc153";

export interface StripStatus164 { name: string; track: SlipTrack; step: number; label: string }

export function stripStatus164(r: Pick<QcRow, "status" | "furthest" | "history">): StripStatus164 {
  const track = slipTrack(r);
  const name = STAGE_NAME[r.status];
  const step = track.cur + 1;
  return { name, track, step, label: track.ended ? name : `${name}, step ${step} of 4` };
}
