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

/** The order the fork offers them. Smart Import first: it is the one that saves the most typing. */
export const CAPTURE_OPTIONS: CaptureOption[] = ["smart", "template", "byhand"];

export interface CaptureTag {
  label: string;
  /** `cost` is the one that names what the choice spends; `fit` describes the input. */
  kind: "cost" | "fit";
}

export interface CaptureChoice {
  key: CaptureOption;
  title: string;
  desc: string;
  tags: CaptureTag[];
  /** The footer primary's label while this option is selected. */
  primaryLabel: string;
}

export const CAPTURE_HEADING = "How shall we capture your existing agents & queries?";

export const CAPTURE_SUB =
  "Whichever you pick, you can add, import and edit agents and queries at any time afterwards. " +
  "Nothing here is permanent.";

/** The quiet exit — a text link, never a fourth card. See the docblock on `CAPTURE_LATER`. */
export const CAPTURE_LATER = "I've nothing to capture yet";

/** The line beneath the card, pointing at the Import desk's own column matching. */
export const CAPTURE_ESCAPE_PREFIX = "Already keep a spreadsheet with unusual columns? You can ";
export const CAPTURE_ESCAPE_LINK = "match them up yourself";
export const CAPTURE_ESCAPE_SUFFIX = " in the import desk once you're in.";

/**
 * ⚠️ THE TASTER SENTENCE IS THE REASON THE TEMPLATE IS WORTH OFFERING AT ALL. Without it a writer
 * reads two upload paths and picks the clever-sounding one, spending a one-shot entitlement on a
 * sheet they were willing to fill in by hand.
 */
export const TEMPLATE_TASTER_NOTE =
  "The template doesn't use your Smart Import taster — keep that for a spreadsheet you'd rather " +
  "not retype.";

export const HAND_NOTE =
  "This closes onboarding and opens the real Add agent form, so nothing you type here gets typed " +
  "twice.";

/** The template reveal's three beats. */
export const TEMPLATE_STEPS: { num: string; title: string; body: string }[] = [
  { num: "01", title: "Download", body: "A sheet with the columns already set up." },
  { num: "02", title: "Fill it in", body: "One agent per row. Leave anything blank you don't know." },
  { num: "03", title: "Upload", body: "We'll show you what we read before saving." },
];

export const CAPTURE_CHOICES: Record<CaptureOption, CaptureChoice> = {
  smart: {
    key: "smart",
    title: "Smart Import",
    desc:
      "Upload the spreadsheet you already keep — any layout, any wording. We read it and turn it " +
      "into agents and queries.",
    tags: [
      { label: "Uses your free taster", kind: "cost" },
      { label: "Best for a messy list", kind: "fit" },
    ],
    primaryLabel: "Continue to review",
  },
  template: {
    key: "template",
    title: "Use the ScriptAlly template",
    desc:
      "Download a ready-made sheet, fill in your agents, upload it back. Set columns mean we read " +
      "it exactly, every time.",
    tags: [
      { label: "Always free, no limit", kind: "cost" },
      { label: "Best for starting clean", kind: "fit" },
    ],
    primaryLabel: "Continue",
  },
  byhand: {
    key: "byhand",
    title: "Add them by hand",
    desc:
      "Go straight to the agent form and type them in. Quickest route if you've only a handful to " +
      "record.",
    tags: [
      { label: "Always free", kind: "cost" },
      { label: "Best for under ten", kind: "fit" },
    ],
    primaryLabel: "Take me to the agent form",
  },
};

/** What the footer primary reads while `option` is selected. */
export function capturePrimaryLabel(option: CaptureOption): string {
  return CAPTURE_CHOICES[option].primaryLabel;
}
