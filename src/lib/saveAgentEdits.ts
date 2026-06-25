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
import { SubmissionStatus, AgentSocial } from "../types";

/** The panel's edit patch. Any key left `undefined` is omitted from the write. A `responseTimeWeeks`
 *  of `null` is the explicit "Not set" intent → the field is deleted (deadline falls back to
 *  live-compute at activityUtils.ts:109). */
export interface AgentEditPatch {
  name?: string;
  agency?: string;
  email?: string;
  website?: string;
  country?: string;
  city?: string;
  // Social handles — the canonical list plus the mirrored discrete fields (X/Bluesky/Instagram) the
  // agent-database display still reads. See [[agent-socials-display-backlog]].
  socials?: AgentSocial[];
  twitter?: string;
  bluesky?: string;
  instagram?: string;
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

/** Firestore caps a writeBatch at 500 ops. */
const BATCH_CAP = 500;

/**
 * Split fan-out writes so every batch stays within the 500-op cap. The FIRST chunk shares its batch
 * with the agent doc, so it reserves one slot (≤ cap-1 extras); later chunks use the full cap. Pure
 * — the local proof for the chunking math (the multi-doc commit itself needs the emulator). With no
 * extra writes it returns a single empty chunk → one agent-only batch (the common case stays atomic).
 */
export function chunkExtraWrites(extraWrites: AgentExtraWrite[], cap = BATCH_CAP): AgentExtraWrite[][] {
  if (extraWrites.length === 0) return [[]];
  const chunks: AgentExtraWrite[][] = [];
  let i = 0;
  chunks.push(extraWrites.slice(i, i + (cap - 1)));
  i += cap - 1;
  while (i < extraWrites.length) {
    chunks.push(extraWrites.slice(i, i + cap));
    i += cap;
  }
  return chunks;
}

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
  for (const k of ["name", "agency", "email", "website", "country", "city", "twitter", "bluesky", "instagram", "mswlNotes", "notes", "submissionMethod"] as const) {
    const v = patch[k];
    if (v === undefined) continue;
    if (typeof v !== "string") { errors.push(`${k} must be a string.`); continue; }
    fields[k] = v;
  }

  // Social handles list — { platform, handle } entries, capped at 30 (mirrors the Firestore rule).
  if (patch.socials !== undefined) {
    if (!Array.isArray(patch.socials)) errors.push("socials must be a list.");
    else if (patch.socials.length > 30) errors.push("socials is capped at 30.");
    else if (!patch.socials.every((s) => s && typeof s.platform === "string" && typeof s.handle === "string")) {
      errors.push("each social needs a platform and handle.");
    } else fields.socials = patch.socials;
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
 *
 * `extraWrites` is THE fan-out seam (Prompt 3): the agent doc rides in the FIRST batch alongside as
 * many query-deadline updates as fit, so the common case (≤ 499 extras) is a single atomic commit.
 * An unusually large fan-out spills into further batches committed in sequence (no longer one atomic
 * unit — acceptable for the >499 tail, which doesn't arise in practice).
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
    const agentRef = doc(db, "users", userId, "agents", agentId);
    const agentUpdate: Record<string, unknown> = { ...sanitized.fields };
    for (const key of sanitized.deletes) agentUpdate[key] = deleteField();

    // The agent doc rides in the first batch; the deadline fan-out fills the rest, chunked to the
    // 500-op cap and committed in sequence.
    const chunks = chunkExtraWrites(extraWrites);
    for (let c = 0; c < chunks.length; c++) {
      const batch = writeBatch(db);
      if (c === 0) batch.update(agentRef, agentUpdate);
      for (const op of chunks[c]) batch.update(op.ref, op.data);
      await batch.commit();
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the agent." };
  }
}
