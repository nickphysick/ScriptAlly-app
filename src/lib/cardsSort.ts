/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cards-sort-search v1 §B — THE CARDS VIEW'S SORT FIELDS, per page. Each is one of that page's own sort keys (the keys the
 * List view's column headings set), so the chip and the headings cannot disagree; the order switch's words suit the
 * field, each mapped to the direction it sets (`reversed: false` is a heading's first press).
 */
import type { SortField } from "../components/shell/SortChip";
import type { Qc138SortKey } from "./qc138";
import type { SortKey } from "./contactList";

const AZ = [{ label: "A to Z", reversed: false }, { label: "Z to A", reversed: true }] as SortField<string>["order"];

/** Query Centre: the default (Due) first, then the column headings in their order, then Last changed (no heading) */
export const QC_SORT_FIELDS: readonly SortField<Qc138SortKey>[] = [
  { key: "due", label: "Due date", order: [{ label: "Soonest first", reversed: false }, { label: "Latest first", reversed: true }] },
  { key: "agent", label: "Agent", order: AZ },
  { key: "first", label: "First queried", order: [{ label: "Newest first", reversed: true }, { label: "Oldest first", reversed: false }] },
  { key: "stage", label: "Where it stands", order: [{ label: "Furthest on", reversed: true }, { label: "Earliest first", reversed: false }] },
  { key: "sent", label: "What you sent", order: AZ },
  { key: "next", label: "Next move", order: AZ },
  { key: "changed", label: "Last changed", order: [{ label: "Newest first", reversed: true }, { label: "Oldest first", reversed: false }] },
];

/** Contact list: its four sortable headings, in their order (Agent sorts by surname) */
export const CL_SORT_FIELDS: readonly SortField<SortKey>[] = [
  { key: "surname", label: "Surname", order: AZ },
  { key: "added", label: "Date added", order: [{ label: "Newest first", reversed: false }, { label: "Oldest first", reversed: true }] },
  { key: "reply", label: "Reply time", order: [{ label: "Fastest first", reversed: false }, { label: "Slowest first", reversed: true }] },
  { key: "status", label: "Query status", order: [{ label: "Furthest on", reversed: false }, { label: "Earliest first", reversed: true }] },
];
