/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 — THE COLLAPSED SUMMARIES (ref design-refs/qc-create-steps.html).
 *
 * ⚠️ THE SUMMARIES ARE THE RECEIPT. There is no separate confirmation screen: by the last step
 * the three collapsed lines are the pre-save review, so each one must state what was actually
 * recorded rather than that something was. "When ✓" tells you nothing; "9 Aug · email · nudge
 * 20 Sep" is a thing you can check.
 *
 * Pure, and derived from the draft on every render — never stored alongside it, or the line and
 * the fields would drift the moment someone edited one without the other.
 */
import type { QueryDraft } from "./queryDraft";
import { resolveReminder } from "./queryDraft";
import type { MaterialRow } from "./agentMaterials";
import { agentPrimary, agentAgencyLine } from "./agentDisplay";
import type { Agent, Manuscript } from "../types";

/** "9 Aug" / "9 Aug 2025" — the year only when it is not the current one, as the list rows do. */
export function shortDate(iso: string, now: number = Date.now()): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  return d.getFullYear() === new Date(now).getFullYear() ? `${day} ${month}` : `${day} ${month} ${d.getFullYear()}`;
}

/**
 * The materials, in the checklist's own order.
 *
 * ⚠️ THE NAMES COME OFF THE ROW, never from a list here. Every row already carries the `name`
 * the checklist showed (MATERIAL_ROW_NAMES), so a summary written from a second copy would say
 * something the writer never saw the moment those names were retuned. Only the sample row
 * differs, because "5 chapters" is more use than "Opening sample".
 */
export function materialsPhrase(rows: MaterialRow[]): string {
  const parts: string[] = [];
  for (const r of rows) {
    if (!r.on) continue;
    if (r.key === "sample") {
      const amount = String(r.amount ?? "").trim();
      parts.push(amount ? `${amount} ${String(r.unit).toLowerCase()}` : r.name.toLowerCase());
    } else if (r.key === "other") {
      parts.push(String(r.text ?? "").trim() || r.name.toLowerCase());
    } else {
      parts.push(r.name.toLowerCase());
    }
  }
  return parts.join(", ");
}

export interface StepSummaries { agent: string; when: string; what: string; notes: string }

/**
 * One line per section. Each falls back to a plain statement of ABSENCE rather than an empty
 * string — a summary row with nothing in it reads as a rendering fault, and "no materials
 * ticked" is a real answer a writer may have meant.
 */
export function stepSummaries(
  draft: QueryDraft,
  agent: Agent | null,
  manuscripts: Manuscript[],
  now: number = Date.now(),
): StepSummaries {
  const when: string[] = [];
  const date = shortDate(draft.dateSent, now);
  if (date) when.push(date);
  if (draft.sendMethod) when.push(String(draft.sendMethod).toLowerCase());
  const reminder = resolveReminder(draft, agent);
  when.push(reminder ? `nudge ${shortDate(reminder, now)}` : "no nudge");

  const title = manuscripts.find((m) => m.id === draft.manuscriptId)?.title ?? "";
  const mats = materialsPhrase(draft.materials);
  const what = [title || "no manuscript", mats || "nothing ticked"].join(" · ");

  const body = draft.journal.trim();
  const notes = body ? (body.length > 60 ? `${body.slice(0, 57)}…` : body) : "No note";

  /* ⚠️ THE AGENT ROW CARRIES THE AGENCY TOO, and it is the only place that does now. The compact
     hero — 54px monogram, name, agency — was retired when choosing the agent became step one, so
     with the step collapsed this line is the whole of "who am I querying". Name alone would make
     two agents at different agencies read identically. `agentPrimary`/`agentAgencyLine` are the
     shared display helpers, so it says exactly what every other surface says. */
  const who = agent ? [agentPrimary(agent), agentAgencyLine(agent)].filter(Boolean).join(" · ") : "";

  return { agent: who || "No agent chosen", when: when.join(" · "), what, notes };
}


/* ══ THE DUPLICATE WARNING ═════════════════════════════════════════════════════════════════
   Choosing an agent you already have a live query with is worth SAYING, and never worth
   blocking: a second query to the same agent is a real thing writers do (a different book, a
   resubmission after a pass, an agency that invites one). So this reports and offers a way to
   look, and Save is untouched.

   ⚠️ COSTS NOTHING. `queriesForAgent` and the terminal-status set already exist and the page
   already holds `queries` — this is an in-memory filter over an array that is sorted on every
   render anyway. No new Firestore read, no new listener, no denormalised count. */
import { queriesForAgent, isTerminalStatus } from "./agentList";
import type { Query } from "../types";

export interface DuplicateNotice { count: number; latest: Query; sentOn: string }

export function openQueriesWith(
  agentId: string | null,
  queries: Query[],
  now: number = Date.now(),
): DuplicateNotice | null {
  if (!agentId) return null;
  const open = queriesForAgent(agentId, queries).filter((q) => !isTerminalStatus(q.status as never));
  if (open.length === 0) return null;
  // queriesForAgent sorts oldest first, so the most recent is the last one.
  const latest = open[open.length - 1];
  return { count: open.length, latest, sentOn: shortDate(String(latest.dateSent ?? ""), now) };
}

/** "You have an open query with Ada Vane (sent 9 Aug)" / "You have 2 open queries with Ada Vane". */
export function duplicateLine(n: DuplicateNotice, agentName: string): string {
  return n.count === 1
    ? `You have an open query with ${agentName}${n.sentOn ? ` (sent ${n.sentOn})` : ""}`
    : `You have ${n.count} open queries with ${agentName}`;
}
