/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v167 §C step 3 — "What {first} asks for", edited on the query card: the agent's stored `materialsWanted`
 * read into the drawer's four tiles, and written back THROUGH THE AGENT MATERIALS ENCODER (lib/agentMaterials
 * `materialRowsFromAgent` → `materialsWantedFromRows`). Never a hand-built string.
 *
 * ⚠️ NOTHING STORED IS LOST. The encoder's rows carry query letter, synopsis (with its page count), any number of sample
 *    units, and the Other text. Two legacy spellings they cannot carry are kept here:
 *      · "Author bio" — the drawer offers it among Something else's suggestions, so a stored one shows ticked there and
 *        is written back as Other text (which the classifier reads as Author bio again);
 *      · "Full manuscript" — not offered anywhere; a stored one is carried through unchanged (its stored spelling).
 *    A legacy agent with more than one sample unit keeps every unit: the drawer edits the first, the rest ride along.
 * ⚠️ THE SAMPLE IS A UNIT AND AN AMOUNT. The agent's profile stores nothing else (no "from" or section), so the drawer's
 *    sample picker shows units and amount only (v167 baked deviation 1). An untouched sample is written back as stored.
 */
import {
  OTHER_JOIN, UNIT_CFG, classifyMaterial, materialRowsFromAgent, materialsWantedFromRows, parseAgentMaterials,
  type MaterialRow, type SampleUnit as AgentUnit,
} from "./agentMaterials";
import { blankSample, type Sample } from "./queryActions/sample";

export const OTHER_SUGGESTIONS = ["Author bio", "One-line pitch", "Comparable titles", "Chapter outline"] as const;

type SampleRow = Extract<MaterialRow, { key: "sample" }>;

export interface AsksDraft {
  ql: boolean;
  syn: boolean;
  /** a stored synopsis page count, kept on save */
  synPages: string;
  sample: boolean;
  /** the sample the drawer edits (the first stored unit), as stored */
  sampleRow: SampleRow | null;
  /** the picker's value; null until the writer touches the sample (an untouched one is written back as stored) */
  edited: Sample | null;
  /** legacy: further stored sample units, kept as they are */
  moreSamples: SampleRow[];
  other: boolean;
  /** the suggestions ticked under Something else */
  picks: string[];
  /** the rest of the Other text */
  free: string;
  /** legacy stored strings the rows cannot carry ("Full manuscript"), written back unchanged */
  kept: string[];
}

const AGENT_TO_PICKER: Record<AgentUnit, Exclude<Sample["unit"], "none">> = { Chapters: "chapters", Pages: "pages", Words: "words" };
const PICKER_TO_AGENT: Record<Exclude<Sample["unit"], "none">, AgentUnit> = { chapters: "Chapters", pages: "Pages", words: "Words" };

/** the picker's value for a stored sample row (a stored row with no amount shows that unit's default) */
export function sampleOf(row: SampleRow | null): Sample {
  if (!row) return blankSample();
  const n = parseInt(row.amount, 10);
  return { ...blankSample(), unit: AGENT_TO_PICKER[row.unit], amt: Number.isFinite(n) && n > 0 ? n : UNIT_CFG[row.unit].def };
}

export function asksFromStored(stored: readonly string[]): AsksDraft {
  const rows = materialRowsFromAgent(stored);
  const parsed = parseAgentMaterials(stored);
  const ql = rows.find((r) => r.key === "queryLetter")!;
  const syn = rows.find((r): r is Extract<MaterialRow, { key: "synopsis" }> => r.key === "synopsis")!;
  const samples = rows.filter((r): r is SampleRow => r.key === "sample" && r.on);
  const oth = rows.find((r): r is Extract<MaterialRow, { key: "other" }> => r.key === "other")!;
  const items = oth.on ? oth.text.split(OTHER_JOIN).map((x) => x.trim()).filter(Boolean) : [];
  const picks = items.filter((x) => (OTHER_SUGGESTIONS as readonly string[]).includes(x));
  if (parsed.selected.includes("Author bio") && !picks.includes("Author bio")) picks.unshift("Author bio");
  const free = items.filter((x) => !(OTHER_SUGGESTIONS as readonly string[]).includes(x)).join(OTHER_JOIN);
  const kept = stored.filter((raw) => classifyMaterial(String(raw ?? "")).pill === "Full manuscript");
  return {
    ql: ql.on, syn: syn.on, synPages: syn.pages,
    sample: samples.length > 0, sampleRow: samples[0] ?? null, edited: null, moreSamples: samples.slice(1),
    other: picks.length > 0 || free !== "", picks, free, kept,
  };
}

/** the other text: the ticked suggestions in their offered order, then the free words */
export const otherText = (d: Pick<AsksDraft, "picks" | "free">): string =>
  [...OTHER_SUGGESTIONS.filter((x) => d.picks.includes(x)), ...d.picks.filter((x) => !(OTHER_SUGGESTIONS as readonly string[]).includes(x)), d.free.trim()]
    .filter(Boolean).join(OTHER_JOIN);

export function asksToStored(d: AsksDraft): string[] {
  const rows: MaterialRow[] = [
    { key: "queryLetter", kind: "binary", name: "", on: d.ql },
    { key: "synopsis", kind: "binary", name: "", on: d.syn, pages: d.synPages },
  ];
  if (d.sample) {
    /* the picker's value once touched; else the stored row; else (ticked fresh, untouched) the picker's own blank */
    const s = d.edited ?? (d.sampleRow ? null : blankSample());
    const first: SampleRow = s
      ? { key: "sample", kind: "qty", name: "", on: true, unit: PICKER_TO_AGENT[s.unit === "none" ? "chapters" : s.unit], amount: String(s.amt) }
      : d.sampleRow!;
    rows.push(first, ...d.moreSamples);
  }
  const text = d.other ? otherText(d) : "";
  rows.push({ key: "other", kind: "text", name: "", on: !!text, text });
  return [...materialsWantedFromRows(rows), ...d.kept];
}

/** true when the drawer would write what is already stored (Save stays off) */
export const asksUnchanged = (d: AsksDraft, stored: readonly string[]): boolean =>
  JSON.stringify(asksToStored(d)) === JSON.stringify(asksToStored(asksFromStored(stored)));

/** at least one thing asked for: Save needs it (as the ref) */
export const asksAny = (d: AsksDraft): boolean => d.ql || d.syn || d.sample || (d.other && otherText(d) !== "");
