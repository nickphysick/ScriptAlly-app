/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Birds-eye's rows from the phone's queries (moved out of BirdsWorld unchanged, Phone Birds-eye first look v1), so
 * Today's preview reads exactly the rows the full view draws: the open ones through the engine (`eyeRows`), the closed
 * ones as closed.
 */
import { eyeRows, type EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import type { V3Query } from "../../../lib/phoneV3";
import { bwRow, type BwRow } from "../../../lib/birdsWorld";

export function bwRowsOf(qs: readonly V3Query[], now: number): BwRow[] {
  const open = qs.filter((x) => x.court !== "closed"), closed = qs.filter((x) => x.court === "closed");
  const live = eyeRows(open.map((x) => x.row as QcRow), now).map((e) => bwRow(e, now));
  const shut = closed.map((x) => bwRow({ id: x.id, row: x.row as QcRow, court: "agent" } as unknown as EyeRow, now, true));
  return [...live, ...shut];
}
