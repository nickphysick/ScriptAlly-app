/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do v5.2 §J.2 — what you're doing, in the desk card's band while a journey is open on it: ONE map from the journey
 * (its mode, the task it was opened for, its preset) to the title's words, unit-locked. The mode is the drawer's own
 * (`data-qad-drawer`), so a switch (Close → "They said no" → a response) re-reads it and the title follows.
 */
import type { DrawerMode, DrawerPreset } from "./queryActions/drawerStore";

/** a send's material, from the task that asked for it */
export function sendNoun(taskType: string | undefined): "partial" | "full" | "revision" {
  return taskType === "partial_requested" ? "partial" : taskType === "revise_resubmit" ? "revision" : "full";
}

export function doingTitle(mode: DrawerMode, taskType: string | undefined, preset: DrawerPreset | undefined): string {
  switch (mode) {
    case "sent": return taskType === "revise_resubmit" ? "Sending the revision" : `Sending your ${sendNoun(taskType)}`;
    case "nudge": return "Recording a nudge";
    case "close": return preset?.closeWhy === "withdraw" ? "Withdrawing the query" : "Closing the query";
    case "resp": return "Logging their reply";
    case "offer": return "Answering the offer";
    /* the edit journey's own panel titles, shortened: the send-by door, and the "tell them" tasks */
    case "edit": return preset?.sendBy ? "Setting a send-by date" : taskType === "signed_tell" ? "Telling them you've signed" : taskType === "withdraw_tell" ? "Telling them you've withdrawn" : "Correcting the record";
    case "log": return "Logging a query";
    default: { const unhandled: never = mode; return String(unhandled); }
  }
}
