/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The capture fork — three ways to bring an existing list across (ref:
 * design-refs/scriptally-onboarding-fork.html). Pure: copy, tags and the primary's label, with no
 * React and no db, so the wording and the button contract can be locked without rendering.
 *
 * ⚠️ THE PRIMARY'S LABEL CHANGES WITH THE CHOICE, AND THAT IS THE WHOLE POINT OF DERIVING IT.
 * A fixed "Continue" would send a writer who picked "Add them by hand" into a file picker, and a
 * writer who picked the template into a form. The button says what it will do.
 *
 * ⚠️ THE TAGS STATE A FACT ABOUT COST, NOT A RECOMMENDATION. "Uses your free taster" is the honest
 * thing to say beside Smart Import when the taster is one-shot; "Always free, no limit" is what
 * makes the template a real alternative rather than a consolation. The app reports; it does not
 * appraise — so "Best for a messy list" describes the INPUT, never the writer.
 */

export type CaptureOption = "smart" | "template" | "byhand";

/** Fixed order: the three tiles are peers, not a default with two fallbacks. */
export const CAPTURE_OPTIONS: CaptureOption[] = ["smart", "template", "byhand"];

/**
 * One tile (onboarding v5). ⚠️ THERE IS NO `primaryLabel`, NO `fit` TAG AND NO REVEAL ANY MORE. The
 * fork was a radio group with one shared primary whose label changed with the choice; it is three
 * tiles now, each with its own buttons, so there is nothing to choose before acting. The fact line
 * states COST and nothing else — no "recommended", no "best for".
 */
export interface CaptureChoice {
  key: CaptureOption;
  title: string;
  desc: string;
}

export const CAPTURE_HEADING = "How shall we capture your existing agents & queries?";
export const CAPTURE_SUB =
  "Whichever you pick, you can add, import and edit agents and queries at any time afterwards. " +
  "Nothing here is permanent.";

/** The quiet exit for a writer with nothing to bring across. */
export const CAPTURE_LATER = "I've nothing to capture yet";

/** The line under the tiles: a spreadsheet with unusual columns belongs on the Import page. */
export const CAPTURE_ESCAPE_PREFIX = "Keep a spreadsheet with unusual columns? You can ";
export const CAPTURE_ESCAPE_LINK = "match them up yourself";
export const CAPTURE_ESCAPE_SUFFIX = " on the Import page once you're in.";

export const CAPTURE_CHOICES: Record<CaptureOption, CaptureChoice> = {
  smart: {
    key: "smart",
    title: "Smart import.",
    desc:
      "Upload the spreadsheet you already keep, in any layout and any wording. QueryHawk reads it " +
      "and shows you everything before anything is saved.",
  },
  template: {
    key: "template",
    title: "Our template.",
    desc:
      "Download a ready-made sheet, fill in your agents, upload it back. Set columns mean we read " +
      "it exactly, every time.",
  },
  byhand: {
    key: "byhand",
    title: "Add by hand.",
    desc:
      "Go straight to the agent form and type them in. Quickest route if you've only a handful to " +
      "record.",
  },
};

/** Each tile's buttons, in order. The first is the tile's main action. */
export const CAPTURE_SMART_ACTION = "Import a spreadsheet";
export const CAPTURE_TEMPLATE_DOWNLOAD = "Download the template";
export const CAPTURE_TEMPLATE_UPLOAD = "Upload my sheet";
export const CAPTURE_HAND_ACTION = "Add an agent";

/** The drop zone's words, on the ringed Smart import tile. Dropping a file there works. */
export const CAPTURE_DROP_LEAD = "Drop your file here, or ";
export const CAPTURE_DROP_LINK = "choose a file";
export const CAPTURE_DROP_TYPES = ".csv · .xlsx · up to 5 MB";

/**
 * The fact line under a tile: what it costs, and nothing else. Smart import's depends on the
 * writer's tier, read from the entitlement — never a guess, and never hard-coded to free.
 */
export function captureFact(option: CaptureOption, tier: "free" | "pro"): string {
  if (option === "smart") return tier === "pro" ? "Uses this month's Smart Import" : "Uses your one Smart Import";
  if (option === "template") return "Always free";
  return "Always free · Ends set-up";
}

/** The file types the picker accepts, and so the only ones a drop is taken for. */
export const CAPTURE_ACCEPT = [".csv", ".xlsx", ".xls"] as const;
export function acceptsDroppedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return CAPTURE_ACCEPT.some((ext) => lower.endsWith(ext));
}
