/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 (design-refs/add-agent-v2/) — THE JOURNEY'S MODEL, pure. One question a screen, six steps:
 *
 *   Agent → Wishlist → Asks for → How → Replies → Add
 *
 * The answers become the new-agent card's own draft (`CardDraft`), and the save is the one every add has used since add
 * agent v1: `addAgent(agentFromDraft(draft))`. So the record this journey writes is, field for field, the record the old
 * journey wrote for the same answers. Nothing here writes.
 *
 * ⚠️ WHAT HAS NO HOME IN THE AGENT RECORD IS NOT ASKED (the brief's rule: never invent storage):
 *    - the sample's "a different part" — `materialsWanted` has no "from" form, so the typed sample (design v15,
 *      `SampleTyped`) is drawn without its starting point;
 *    - the four suggested extras under "Something else" (Author bio is stripped on write; the other three have no token).
 *      The free-text "Something else" stays: it is the record's Other material (40 characters, the card's own cap).
 * ⚠️ Design v15 — the wishlist page link is the card's own (`CardDraft.mswl` → the MSWL entry in `socials`), and a closed
 *    agent's reopening date is the card's own (`CardDraft.reopens` → `reopensOn`, a local YYYY-MM-DD); "Not sure" saves
 *    nothing. Both go through `agentFromDraft` unchanged.
 * ⚠️ "Not sure" for open to queries is the record's Unknown door; Elsewhere's country is the app's own country field (an
 *    ISO code, `CountryCombobox`), as the record stores it.
 */
import { SubmissionMethod } from "../../types";
import { emptyCardDraft, type CardDraft } from "../cardDraft";
import type { Sample } from "./sample";
import { OTHER_MAX } from "../matOps";
import { typedName } from "./sampleTyped";

export type AStage = "agent" | "wish" | "asks" | "how" | "reply" | "add";
export const A_STAGES: readonly AStage[] = ["agent", "wish", "asks", "how", "reply", "add"];
export const A_LABEL: Record<AStage, string> = { agent: "Agent", wish: "Wishlist", asks: "Asks for", how: "How", reply: "Replies", add: "Add" };

/** the ways in, in the reference's order, each with the record's method */
export const A_METHODS: readonly { k: string; label: string; method: SubmissionMethod }[] = [
  { k: "email", label: "Email", method: SubmissionMethod.EMAIL },
  { k: "form", label: "Online form", method: SubmissionMethod.ONLINE_FORM },
  { k: "qm", label: "QueryManager", method: SubmissionMethod.QUERY_MANAGER },
  { k: "post", label: "Post", method: SubmissionMethod.POST },
  { k: "other", label: "Another way", method: SubmissionMethod.OTHER },
];
/** the method whose link is the form, not the agency's website */
export const isFormMethod = (k: string) => k === "form" || k === "qm";

export type Country = "GB" | "IE" | "US" | "XX" | "";
export type SynLen = "" | "1" | "2" | "unsaid";

export interface AState {
  step: AStage; dir: "in" | "back" | "";
  /** the steps the writer has been on (a step is "done" on the track once it has been passed) */
  seen: Partial<Record<AStage, boolean>>;
  name: string; agency: string; noAgency: boolean; askAg: boolean;
  country: Country; city: string; elsewhere: string;
  genres: string[]; wish: string;
  /** design v15 — the wishlist page link (the card's `mswl`) */
  mswl: string;
  ask: { letter: boolean; syn: boolean; sample: boolean; other: boolean };
  synLen: SynLen; samp: Sample; otherTx: string;
  method: string; methodTx: string; email: string; web: string; door: "" | "open" | "closed" | "unsure";
  /** design v15 — a closed agent's reopening: weeks from today on the slider, "Not sure" (roNone), and the date it makes */
  ro: number; roNone: boolean; reopens: string;
  wk: number; wkNone: boolean; policy: "" | "always" | "nrn";
  fit: number;
}

export const freshA = (name = ""): AState => ({
  step: "agent", dir: "", seen: {}, name, agency: "", noAgency: false, askAg: false,
  /* the UK chosen to begin with, as the reference and add agent v1 both open (`defaultCountry: "GB"`) */
  country: "GB", city: "", elsewhere: "", genres: [], wish: "", mswl: "",
  ask: { letter: false, syn: false, sample: false, other: false }, synLen: "", samp: { unit: "chapters", amt: 3, from: 1, sect: false, fu: null }, otherTx: "",
  method: "", methodTx: "", email: "", web: "", door: "", ro: 6, roNone: true, reopens: "", wk: 8, wkNone: true, policy: "", fit: 0,
});

/** a name is enough to start (two letters, the reference's rule) */
export const nameOk = (s: Pick<AState, "name">) => s.name.trim().length > 1;
export const firstOf = (name: string) => name.trim().split(/\s+/)[0] || "them";
/** "Sarah’s", or "their" before there is a name */
export const possOf = (name: string) => { const f = firstOf(name); return f === "them" ? "their" : `${f}’s`; };

/** "First 3 chapters", "First 7,500 words" — the typed sample's own words (lib/queryActions/sampleTyped) */
export const sampleName = (s: Sample): string => typedName(s);

/** the materials the answers ask for, as the review's track counts them */
export function asksList(s: Pick<AState, "ask" | "synLen" | "samp" | "otherTx">): string[] {
  const l: string[] = [];
  if (s.ask.letter) l.push("Query letter");
  if (s.ask.syn) l.push("Synopsis");
  if (s.ask.sample) l.push(sampleName(s.samp));
  if (s.ask.other && s.otherTx.trim()) l.push(s.otherTx.trim());
  return l;
}

/** the answers as the new-agent card's draft — the one mapping every add goes through (`agentFromDraft`) */
export function draftOfAnswers(s: AState, countryOf: (typed: string) => string | undefined): CardDraft {
  const d = emptyCardDraft();
  const m = A_METHODS.find((x) => x.k === s.method) ?? null;
  const country = s.country === "XX" ? (countryOf(s.elsewhere) ?? "") : s.country;
  const unit = s.samp.unit === "pages" ? "Pages" : s.samp.unit === "words" ? "Words" : "Chapters";
  return {
    ...d,
    name: s.name.trim(),
    agency: s.noAgency ? "" : s.agency.trim(),
    agencyUnknown: s.noAgency && !!s.name.trim(),
    country,
    city: s.city.trim(),
    email: s.email.trim(),
    website: m && isFormMethod(m.k) ? "" : s.web.trim(),
    form: m && isFormMethod(m.k) ? s.web.trim() : "",
    genres: [...s.genres],
    wishlist: s.wish.trim().slice(0, 400),
    mswl: s.mswl.trim(),
    mats: {
      ql: s.ask.letter,
      syn: { on: s.ask.syn, len: s.synLen === "1" ? 1 : s.synLen === "2" ? 2 : null },
      smp: { on: s.ask.sample && s.samp.unit !== "none", unit, qty: s.samp.amt },
      oth: { on: s.ask.other && !!s.otherTx.trim(), text: s.otherTx.trim().slice(0, OTHER_MAX) },
    },
    weeks: s.wkNone ? null : s.wk,
    nrn: s.policy === "nrn" ? true : s.policy === "always" ? false : null,
    method: m?.method ?? null,
    methodOther: m?.k === "other" ? s.methodTx.trim().slice(0, 40) : "",
    door: s.door === "open" ? "open" : s.door === "closed" ? "closed" : null,
    reopens: s.door === "closed" && !s.roNone ? s.reopens : "",
    rating: s.fit >= 1 && s.fit <= 5 ? s.fit : null,
  };
}

/** has the step had anything entered? ("Skip this" until it has, then "Carry on") */
export function stepHasAnswer(s: AState, k: AStage): boolean {
  switch (k) {
    case "wish": return s.genres.length > 0 || !!s.wish.trim() || !!s.mswl.trim();
    case "asks": return asksList(s).length > 0 || s.ask.other;
    case "how": return !!s.method || !!s.email.trim() || !!s.web.trim() || !!s.door;
    case "reply": return !s.wkNone || !!s.policy;
    default: return true;
  }
}

/** the value a finished step shows under its label on the track */
export function stepValue(s: AState, k: AStage): string {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (k === "agent") return firstOf(s.name);
  if (k === "wish") return s.genres.length ? plural(s.genres.length, "genre") : s.wish.trim() || s.mswl.trim() ? "Added" : "Skipped";
  if (k === "asks") { const n = asksList(s).length; return n ? plural(n, "thing") : "Skipped"; }
  if (k === "how") {
    if (s.method) return s.method === "other" ? "Other" : A_METHODS.find((x) => x.k === s.method)!.label;
    return s.door === "open" ? "Open" : s.door === "closed" ? "Closed" : s.door === "unsure" ? "Not sure" : (s.email.trim() || s.web.trim()) ? "Added" : "Skipped";
  }
  if (k === "reply") return s.wkNone ? (s.policy ? "Added" : "Skipped") : plural(s.wk, "week");
  return "";
}

/** the two-line headline (screens 02, 08, 17) */
export function headlineA(s: AState, added: { onFile: number } | null): [string, string] {
  if (added) return [`${firstOf(s.name)} is on your list.`, `That’s ${added.onFile} agents on file.`];
  if (s.step !== "agent" && nameOk(s)) return [`Adding ${s.name.trim()}.`, "Add as much as you know."];
  return ["Found someone new?", "Let’s add them to your list."];
}

/** the added screen's line (screen 17), and screen 21's from inside Log a query */
export function addedLine(gaps: number, name: string, fromLog: boolean): string {
  const f = firstOf(name);
  if (fromLog) return `Back to your query. ${f} is already chosen.`;
  if (!gaps) return `Everything’s on file. ${possOf(name)} card is ready when you query.`;
  return `${gaps} ${gaps === 1 ? "detail" : "details"} still to add. ${gaps === 1 ? "It’s" : "They’re"} waiting on ${possOf(name)} card whenever you have ${gaps === 1 ? "it" : "them"}.`;
}

/** "A and B", "A, B and C" */
export const andList = (xs: readonly string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
