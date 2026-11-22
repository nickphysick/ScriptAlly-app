/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.3 — the preview's derivations (design-refs/submission-packages-v39-3/, option B). The preview
 * is illustrative: it sends nothing and stores nothing.
 */
import type { Agent, Query } from "../types";
import { surnameOf } from "./contactList";

/** "To": the first agent on the Contact list (its default order: surname, then name) not queried for this book. */
export function previewAgent(agents: readonly Agent[], bookQueries: readonly Pick<Query, "agentId">[]): Agent | null {
  const queried = new Set(bookQueries.map((q) => q.agentId).filter(Boolean));
  const name = (a: Agent) => (a.name.trim() || a.agency).toLowerCase();
  const open = agents.filter((a) => !queried.has(a.id) && (a.name.trim() || a.agency.trim()));
  open.sort((a, b) => surnameOf(a).localeCompare(surnameOf(b)) || name(a).localeCompare(name(b)));
  return open[0] ?? null;
}

/** "Dear {first name}," — the agent's first name, or "agent" when there is none to address. */
export const greetingName = (a: Agent | null): string => (a?.name.trim() ? a.name.trim().split(/\s+/)[0] : "agent");

/**
 * The letter's opening: the first ~200 characters of its STORED TEXT (`contentDraft`), cut at a word and closed with an
 * ellipsis. Never the summary: the summary is the writer's note about the letter, not the letter.
 */
export function letterOpening(text: string | null | undefined, max = 200): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:—–-]+$/, "")}…`;
}

/** The primary button's words: what is missing, or the journey. */
export function primaryLabel(hasVersion: boolean, hasLetter: boolean): { ready: boolean; text: string } {
  if (hasVersion && hasLetter) return { ready: true, text: "Log a query with it" };
  const need = [!hasVersion && "a version", !hasLetter && "a letter"].filter(Boolean).join(" and ");
  return { ready: false, text: `Add ${need} to send it` };
}
