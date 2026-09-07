/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's three views. A separate module because the URL reader, the switch and the
 * locks all need the list, and a component that owned it would make importing the vocabulary mean
 * importing the page.
 */
import { QueryView } from "../queries/QueryViewSwitch";

/** Grid · List · Board. The Query Centre's Calendar has no meaning for a contact list. */
export type AgentView = Extract<QueryView, "grid" | "list" | "board">;

export const AGENT_VIEWS: readonly { key: AgentView; label: string }[] = [
  { key: "grid", label: "Grid" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
];
