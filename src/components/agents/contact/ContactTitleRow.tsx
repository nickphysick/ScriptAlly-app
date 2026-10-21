/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 §A — THE TITLE ROW, between the hero and the list card (design-refs/contact-list-v20/, screens 01, 02,
 * 09). Left to right: the live count ("All 41 agents" / "5 of 41 agents"), the Cards / List pill, and Full screen.
 *
 * Since Query Centre v142 the row and the switch are SHARED (shell/ViewTitleRow): this file only names the Contact
 * list's words and probes, so what it renders is unchanged.
 *
 *   - The count is the list's own: `shown` is the agents actually showing (the applied row's figure), `total` every agent
 *     on file. "All N" when nothing narrows the list. It is `aria-live="polite"`, so a filter change is spoken.
 *   - The pill and the toolbar's switch (ContactViewSwitch) read and write ONE state, the page's `view`.
 *   - Full screen calls the shared pin hook through the page's toggle; F, Esc, the memory and the scroll are the hook's.
 *
 * Not drawn in full screen (the page leaves it out).
 */
import React from "react";
import type { ContactView } from "../../../lib/contactListMemory";
import { FULL_ICON, VIEW_CARDS_ICON, VIEW_LABEL, VIEW_LIST_ICON, ViewSwitch, ViewTitleRow, listCountTitle } from "../../shell/ViewTitleRow";
import "./contactV20.css";

export { FULL_ICON, VIEW_CARDS_ICON, VIEW_LABEL, VIEW_LIST_ICON };

/** the count's words: "All 41 agents", "5 of 41 agents", "1 agent" */
export const countTitle = (shown: number, total: number, narrowed: boolean): string => listCountTitle(shown, total, narrowed, "agent", "agents");

/** The Contact list's Cards / List switch: the shared switch with its own probe (`data-cl20`) and words. */
export const ContactViewSwitch: React.FC<{
  view: ContactView;
  onView: (v: ContactView) => void;
  variant: "pill" | "icons";
  labels?: boolean;
  disabled?: boolean;
  probe: string;
}> = (p) => <ViewSwitch {...p} ns="cl20" noun="agents" />;

/* data-cl19="pin" / data-cl16="full": the v16–v19 locks find the full-screen control by these, and this is it while the
   title row shows (the toolbar's carries them in full screen and once this row has scrolled away) */
const CL_FULL = { "data-cl19": "pin", "data-cl16": "full" };

export const ContactTitleRow: React.FC<{
  shown: number;
  total: number;
  narrowed: boolean;
  view: ContactView;
  onView: (v: ContactView) => void;
  onFull: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
}> = ({ shown, total, narrowed, view, onView, onFull, rowRef }) => (
  <ViewTitleRow title={countTitle(shown, total, narrowed)} view={view} onView={onView} onFull={onFull} ns="cl20" noun="agents" fullAttrs={CL_FULL} rowRef={rowRef} />
);
