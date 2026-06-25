/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The single, sanitised, atomic agent-write path for the Edit Agent panel.
 *
 * Two pieces, deliberately split so the validation is pure and unit-testable:
 *   - `sanitizeAgentPatch(patch)` — PURE. Drops `undefined` keys (since the legacy `updateAgent`
 *     at db.tsx:1281 does NOT, and a raw `undefined` throws at the Firestore layer); turns the
 *     panel's "Not set" response time (`responseTimeWeeks: null`) into a `deleteField()` (the
 *     relaxed `isValidAgent` rule now permits the field to be absent); and guards the values the
 *     Firestore rules enforce (submissionStatus enum, starRating 1–5 int, responseTimeWeeks ≥0
 *     int when present, materialsWanted ≤20) so a bad write is rejected in code before the round-trip.
 *   - `commitAgentEdits(db, userId, agentId, patch, extraWrites?)` — builds a `writeBatch` and
 *     commits the agent update together with any `extraWrites`. `extraWrites` is THE seam the
 *     Prompt-3 `responseTimeWeeks` deadline fan-out plugs into, so the agent doc and the per-query
 *     deadline recomputes land as ONE atomic commit.
 *
 * Does not touch `updateAgent` or its existing callers. Never throws to the caller — returns a
 * typed { ok } result the UI acts on.
 */
import {
  Firestore,
  DocumentReference,
  doc,
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { SubmissionStatus } from "../types";

/** The panel's edit patch. Any key left `undefined` is omitted from the write. A `responseTimeWeeks`
 *  of `null` is the explicit "Not set" intent → the field is deleted (deadline falls back to
 *  live-compute at activityUtils.ts:109). */
export interface AgentEditPatch {
  name?: string;
  agency?: string;
  email?: string;
  website?: string;
  genres?: string[];
  mswlNotes?: string;
  notes?: string;
  starRating?: number;
  submissionStatus?: SubmissionStatus | string;
  responseTimeWeeks?: number | null;
  noResponseMeansNo?: boolean;
  submissionMethod?: string;
  materialsWanted?: string[];
}

export interface SanitizedAgentWrite {
  /** Validated fields to set (no `undefined`, no `null`-as-delete). */
  fields: Record<string, unknown>;
  /** Keys to `deleteField()` (currently only ever `responseTimeWeeks`). */
  deletes: string[];
  /** Validation failures; non-empty means do NOT write. */
  errors: string[];
}

/** A batched write the fan-out (Prompt 3) hands in so it joins the agent commit atomically. */
export interface AgentExtraWrite {
  ref: DocumentReference;
  data: Record<string, unknown>;
}

export type SaveAgentResult = { ok: true } | { ok: false; error: string };

const VALID_SUBMISSION_STATUSES = new Set<string>(Object.values(SubmissionStatus));
const MATERIALS_CAP = 20;
const STAR_MIN = 1;
const STAR_MAX = 5;

/** Pure validation + normalisation. No Firestore, no I/O — fully unit-testable. */
export function sanitizeAgentPatch(patch: AgentEditPatch): SanitizedAgentWrite {
  const fields: Record<string, unknown> = {};
  const deletes: string[] = [];
  const errors: string[] = [];

  // Plain string fields — pass through when defined (the panel owns trimming/UX copy).
  for (const k of ["name", "agency", "email", "website", "mswlNotes", "notes", "submissionMethod"] as const) {
    const v = patch[k];
    if (v === undefined) continue;
    if (typeof v !== "string") { errors.push(`${k} must be a string.`); continue; }
    fields[k] = v;
  }

  if (patch.genres !== undefined) {
    if (!Array.isArray(patch.genres)) errors.push("genres must be a list.");
    else fields.genres = patch.genres;
  }

  if (patch.noResponseMeansNo !== undefined) {
    if (typeof patch.noResponseMeansNo !== "boolean") errors.push("noResponseMeansNo must be a boolean.");
    else fields.noResponseMeansNo = patch.noResponseMeansNo;
  }

  if (patch.submissionStatus !== undefined) {
    if (!VALID_SUBMISSION_STATUSES.has(patch.submissionStatus)) {
      errors.push(`submissionStatus must be one of ${[...VALID_SUBMISSION_STATUSES].join(" / ")}.`);
    } else {
      fields.submissionStatus = patch.submissionStatus;
    }
  }

  if (patch.starRating !== undefined) {
    const n = patch.starRating;
    if (!Number.isInteger(n) || n < STAR_MIN || n > STAR_MAX) {
      errors.push(`starRating must be an integer ${STAR_MIN}–${STAR_MAX}.`);
    } else {
      fields.starRating = n;
    }
  }

  if (patch.materialsWanted !== undefined) {
    if (!Array.isArray(patch.materialsWanted)) errors.push("materialsWanted must be a list.");
    else if (patch.materialsWanted.length > MATERIALS_CAP) errors.push(`materialsWanted is capped at ${MATERIALS_CAP}.`);
    else fields.materialsWanted = patch.materialsWanted;
  }

  // The "Not set" pivot: null → delete the field; a present value must be a non-negative int.
  if (patch.responseTimeWeeks !== undefined) {
    if (patch.responseTimeWeeks === null) {
      deletes.push("responseTimeWeeks");
    } else if (!Number.isInteger(patch.responseTimeWeeks) || patch.responseTimeWeeks < 0) {
      errors.push("responseTimeWeeks must be a non-negative integer, or null for Not set.");
    } else {
      fields.responseTimeWeeks = patch.responseTimeWeeks;
    }
  }

  return { fields, deletes, errors };
}

/**
 * Sanitise the patch and commit it (plus any `extraWrites`) as a single atomic `writeBatch`.
 *
 * Deliberately does NOT touch `lastCheckedDate`: a field edit is not a re-verification, so it must
 * not reset the freshness clock (unlike `updateAgent`, which stamps it). The rule requires
 * `lastCheckedDate` to be present, but `batch.update` merges, so the existing value is preserved on
 * the resulting doc and the rule still passes. Returns a typed result; never throws.
 */
export async function commitAgentEdits(
  db: Firestore,
  userId: string,
  agentId: string,
  patch: AgentEditPatch,
  extraWrites: AgentExtraWrite[] = [],
): Promise<SaveAgentResult> {
  if (!userId) return { ok: false, error: "Not signed in." };

  const sanitized = sanitizeAgentPatch(patch);
  if (sanitized.errors.length) return { ok: false, error: sanitized.errors[0] };

  try {
    const batch = writeBatch(db);

    const agentRef = doc(db, "users", userId, "agents", agentId);
    const update: Record<string, unknown> = { ...sanitized.fields };
    for (const key of sanitized.deletes) update[key] = deleteField();
    batch.update(agentRef, update);

    // ───────────────────────────────────────────────────────────────────────────────────────
    // FAN-OUT SEAM (Prompt 3): when responseTimeWeeks changes, the deadline fan-out passes the
    // per-query `responseDeadline` recomputes here so they commit ATOMICALLY with the agent edit.
    // Empty today — the agent update is the only op. (writeBatch caps at 500 ops; Prompt 3 chunks.)
    // ───────────────────────────────────────────────────────────────────────────────────────
    for (const op of extraWrites) batch.update(op.ref, op.data);

    await batch.commit();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the agent." };
  }
}
