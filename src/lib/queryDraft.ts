/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryDraft — the pure model behind INLINE query creation (Queries Hub v4 P2; ref
 * design-refs/create-mode-ref.html). The draft is LOCAL STATE ONLY: nothing here touches
 * Firestore, and nothing is written until the user presses Save, at which point
 * `draftToPayload` hands the existing `addQuery` path (db.tsx) the same shape the retired
 * popup handed it — one creation path, not two.
 *
 * The materials checklist reuses the agent list's `MaterialRow` model verbatim, so "3 chapters"
 * means the same thing on both pages and a prefill from the agent's materials-wanted is a
 * straight `materialRowsFromAgent` call rather than a second interpretation of the data.
 */
import { SubmissionMethod, type Agent, type QueryMaterial } from "../types";
import {
  materialRowsFromAgent,
  parseAmount,
  snapToUnit,
  type MaterialRow,
  type SampleUnit,
} from "./agentMaterials";
import { elapsedLabel, DAY } from "./queryAmbient";

/** The three send methods create mode offers (ref). Query Manager is reachable after save via
 *  the reading pane's click-to-pick method control — deliberately not a fourth segment here. */
export const CREATE_SEND_METHODS: readonly { label: string; value: SubmissionMethod }[] = [
  { label: "Email", value: SubmissionMethod.EMAIL },
  { label: "Form", value: SubmissionMethod.ONLINE_FORM },
  { label: "Post", value: SubmissionMethod.POST },
];

/**
 * The nudge-reminder choice.
 *
 * ⚠️ `preset` CARRIES WEEKS, NOT A DATE, and that is what makes "changing the sent date moves the
 * nudge, but a date you picked yourself stays put" true by construction rather than by a handler
 * remembering to do it. A preset is an INTERVAL resolved against `dateSent` at read time; a custom
 * is an ABSOLUTE date the writer chose. There is no third case where the two could disagree.
 *
 * It replaces `{ kind: "suggested" }`, which meant "whatever the agent stated" and therefore had
 * no answer at all for an agent who stated nothing — the writer fell through to no reminder,
 * silently, because a gap in the agent's record was read as a preference of theirs.
 */
export type ReminderChoice =
  | { kind: "preset"; weeks: number }
  | { kind: "custom"; date: string }
  | { kind: "none" };

/** The presets offered, in weeks. Three is a choice; six is a list. */
export const NUDGE_PRESETS: readonly number[] = [6, 8, 12] as const;

/**
 * ⚠️ THE HOUSE DEFAULT EXISTS SO A MISSING AGENT FIGURE IS NEVER READ AS "NO NUDGE". An agent who
 * has not published a turnaround is a gap in *their* record; falling through to no reminder turns
 * that gap into a decision the writer never made, and the query goes quiet with nothing scheduled.
 * Eight weeks is a convention, and the derived line says so out loud rather than passing it off as
 * the agent's own figure.
 */
export const HOUSE_NUDGE_WEEKS = 8;

/** The nudge a freshly chosen agent gets: their stated turnaround, else the house convention. */
export function initialReminder(agent: Agent | null | undefined): ReminderChoice {
  const w = agent?.responseTimeWeeks;
  return { kind: "preset", weeks: typeof w === "number" && w > 0 ? w : HOUSE_NUDGE_WEEKS };
}

export interface QueryDraft {
  agentId: string | null;
  manuscriptId: string;
  /** yyyy-mm-dd (the date input's native format). */
  dateSent: string;
  sendMethod: SubmissionMethod;
  reminder: ReminderChoice;
  materials: MaterialRow[];
  journal: string;
}

export const todayInputDate = (now: number = Date.now()): string =>
  new Date(now).toISOString().slice(0, 10);

/**
 * The checklist a chosen agent pre-fills — `materialRowsFromAgent` with two create-mode rules:
 *  · ONE sample row. A legacy agent asking for two units (say pages AND chapters) yields a row
 *    each on the agent page; create mode's checklist offers a single "Sample materials" line, so
 *    the first survives and the rest is a post-save edit. Without this, one toggle would patch
 *    every sample row at once (they share a key).
 *  · A ticked sample with no stated amount snaps to that unit's default, so the row never saves
 *    as "ticked but blank".
 */
export function materialRowsForDraft(agent: Agent | null | undefined): MaterialRow[] {
  const rows = materialRowsFromAgent(agent?.materialsWanted);
  let sampleSeen = false;
  const out: MaterialRow[] = [];
  for (const row of rows) {
    if (row.key !== "sample") { out.push(row); continue; }
    if (sampleSeen) continue;
    sampleSeen = true;
    out.push(row.on && !row.amount.trim() ? { ...row, amount: snapToUnit(row.unit) } : row);
  }
  return out;
}

/** A fresh draft. Seeds (from "Log query" on an agent card / a manuscript plate) are optional. */
export function emptyDraft(seed: { agentId?: string | null; manuscriptId?: string | null } = {}, now: number = Date.now()): QueryDraft {
  return {
    agentId: seed.agentId ?? null,
    manuscriptId: seed.manuscriptId ?? "",
    dateSent: todayInputDate(now),
    sendMethod: SubmissionMethod.EMAIL,
    reminder: { kind: "preset", weeks: HOUSE_NUDGE_WEEKS },
    materials: materialRowsForDraft(null),
    journal: "",
  };
}

/** Save is offered only once the three facts that make a query a query are present. */
export function draftReady(d: QueryDraft): boolean {
  return !!d.agentId && !!d.manuscriptId && !!d.dateSent;
}

/**
 * Has the user actually put anything in? Cancel/Esc/click-away discard SILENTLY when untouched
 * and confirm when dirty — so this must not count the defaults (today's date, Email, the empty
 * checklist) as work. A seeded agent/manuscript is likewise part of the baseline.
 */
export function draftDirty(d: QueryDraft, base: QueryDraft): boolean {
  if (d.agentId !== base.agentId) return true;
  if (d.manuscriptId !== base.manuscriptId) return true;
  if (d.dateSent !== base.dateSent) return true;
  if (d.sendMethod !== base.sendMethod) return true;
  if (d.reminder.kind !== base.reminder.kind) return true;
  if (d.reminder.kind === "custom" && base.reminder.kind === "custom" && d.reminder.date !== base.reminder.date) return true;
  if (d.journal.trim() !== base.journal.trim()) return true;
  return JSON.stringify(d.materials) !== JSON.stringify(base.materials);
}

/** The suggested follow-up date: the send date + the agent's stated turnaround. Null when the
 *  agent states no turnaround — there is nothing to derive a suggestion from, so the chip hides. */
export function suggestedReminderDate(dateSent: string, responseTimeWeeks: number | null | undefined): string | null {
  if (!dateSent || !responseTimeWeeks || responseTimeWeeks <= 0) return null;
  const start = new Date(dateSent).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start + responseTimeWeeks * 7 * DAY).toISOString().slice(0, 10);
}

/** "8 Sep · in 6 weeks" — the chip's label. Reuses the page-wide elapsed vocabulary. */
export function reminderChipLabel(dateISO: string, fromISO: string): string {
  const to = new Date(dateISO).getTime();
  const from = new Date(fromISO).getTime();
  if (Number.isNaN(to)) return "";
  const day = new Date(to).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (Number.isNaN(from)) return day;
  const days = Math.max(0, Math.round((to - from) / DAY));
  return `${day} · in ${elapsedLabel(days)}`;
}

/** The date the draft would actually write as `nudgeDate` (null = no reminder). */
export function resolveReminder(d: QueryDraft, _agent?: Agent | null): string | null {
  if (d.reminder.kind === "none") return null;
  if (d.reminder.kind === "custom") return d.reminder.date || null;
  /* Resolved from `dateSent` on every read — which is why moving the sent date moves a preset and
     leaves a custom date exactly where the writer put it. The agent is no longer consulted here:
     their figure was already baked into `weeks` when the preset was chosen, and re-reading it
     would silently overwrite a writer who picked a different interval on purpose. */
  return suggestedReminderDate(d.dateSent, d.reminder.weeks);
}

/**
 * The line under the chips. It ALWAYS reports the resulting task date — a nudge you cannot see the
 * consequence of is a setting, not a decision.
 *
 * ⚠️ IT NAMES THE HOUSE DEFAULT AS A DEFAULT. Presenting eight weeks as though the agent had said
 * so would put words in their mouth, and the writer would have no way to tell a stated turnaround
 * from a convention when deciding whether to trust it.
 */
export function nudgeDerivedLine(
  d: QueryDraft,
  agent: Agent | null | undefined,
  now: number = Date.now(),
): string | null {
  const date = resolveReminder(d);
  if (!date) return null;
  const when = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  if (d.reminder.kind === "custom") {
    const days = Math.round((new Date(date).getTime() - new Date(d.dateSent).getTime()) / DAY);
    const weeks = Math.round(days / 7);
    return days > 0
      ? `A task appears on ${when} — ${weeks} ${weeks === 1 ? "week" : "weeks"} after sending.`
      : `A task appears on ${when}.`;
  }
  const stated = agent?.responseTimeWeeks;
  const weeks = d.reminder.kind === "preset" ? d.reminder.weeks : 0;
  const isStated = typeof stated === "number" && stated > 0 && stated === weeks;
  return isStated
    ? `A task appears on ${when}.`
    : `A task appears on ${when} — a default, as no response time is listed for them.`;
}

/**
 * Checklist rows → the query's `materialsWanted`. The sample row carries its unit + quantity
 * through as a structured QueryMaterial; "Other" keeps the writer's prose verbatim behind an
 * explicit `type: "other"` so no reader has to guess whether it is a sample.
 */
export function draftMaterialsToQuery(rows: MaterialRow[]): (string | QueryMaterial)[] {
  const out: (string | QueryMaterial)[] = [];
  for (const row of rows) {
    if (!row.on) continue;
    if (row.key === "queryLetter") out.push("Query Letter");
    else if (row.key === "synopsis") out.push("Synopsis");
    else if (row.key === "sample") {
      const qty = parseAmount(row.amount);
      out.push(
        Number.isFinite(qty) && qty > 0
          ? { material: "Sample Pages", type: row.unit.toLowerCase() as Lowercase<SampleUnit>, quantity: qty }
          : "Sample Pages",
      );
    } else if (row.key === "other" && row.text.trim()) {
      out.push({ material: "Other", type: "other", quantity: row.text.trim() });
    }
  }
  return out;
}

/**
 * The draft as `addQuery`'s payload — the SAME shape the retired popup built, so creation keeps
 * one write path (and `recomputeQuery` still derives Queried from the QUERY_SENT activity that
 * `addQuery` seeds). `responseDeadline` is left to addQuery to compute from the agent's window.
 */
export function draftToPayload(d: QueryDraft, agent: Agent | null | undefined) {
  const reminder = resolveReminder(d, agent);
  return {
    manuscriptId: d.manuscriptId,
    agentId: d.agentId as string,
    packageId: "",
    materialsWanted: draftMaterialsToQuery(d.materials),
    personalisationNotes: "",
    sendMethod: d.sendMethod,
    dateSent: new Date(d.dateSent).toISOString(),
    ...(reminder ? { nudgeDate: new Date(reminder).toISOString() } : {}),
  };
}
