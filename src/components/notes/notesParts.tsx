/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Your notes v1 — the small parts the page, the panel and the pop-up share: the kind's icon, the status chip and the
 * one way to open the pop-up with a kind chosen (as the band's buttons do).
 */
import React from "react";
import { feedbackDraft, openFeedback, setFeedbackDraft } from "../../lib/feedbackStore";
import { composeFor, type ComposeKey } from "../../lib/foundingCard";
import { CHIP, bucketOf, composeKeyOf, type YourNote } from "../../lib/yourNotes";
import { ICONS } from "../dashboard/v105/foundingArt";

export const TICK = <svg viewBox="0 0 24 24" aria-hidden="true" className="yn-tick"><path d="M5 12.5l4.5 4.5L19 7" /></svg>;

/** Open the one feedback pop-up, with a kind chosen or (no key) the kept draft's. */
export function tellUs(k?: ComposeKey): void {
  setFeedbackDraft({ ...feedbackDraft(), kind: k ? composeFor(k).kind : feedbackDraft().kind });
  openFeedback();
}

/** The kind's icon: thumbs-up, thumbs-down, bulb. A Help Centre "Article" note reads as a thumbs-down. */
export const iconFor = (kind: string): React.ReactNode => ICONS[composeKeyOf(kind) ?? "dont"];

export const Chip: React.FC<{ status: YourNote["status"] }> = ({ status }) => {
  const c = CHIP[bucketOf(status)];
  return <i className={`yn-oc ${c.cls}`} data-yn="chip" data-b={bucketOf(status)}>{c.cls === "ok" ? TICK : null}{c.label}</i>;
};
