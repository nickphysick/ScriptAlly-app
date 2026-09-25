/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v12 — applying a MaterialModal draft. The SAME two-step the packages page's
 * `saveMaterial` performs (materialDraft's `createPayload`, `db.addVersion`), so a letter made
 * here and a letter made there are the same record by construction. This page only CREATES —
 * editing a material stays the packages register's job.
 */
import type { MaterialDraftResult } from "../../packages/MaterialModal";
import { createPayload } from "../../../lib/materialDraft";
import type { ManuscriptVersion } from "../../../types";

export interface MaterialWriters {
  addVersion: (v: Omit<ManuscriptVersion, "id" | "userId" | "createdDate">) => Promise<string>;
  updateVersion: (id: string, fields: Partial<Record<string, unknown>>) => Promise<void>;
}

export const applyMaterialDraft = async (
  d: MaterialDraftResult,
  manuscriptId: string,
  writers: MaterialWriters,
): Promise<void> => {
  await writers.addVersion(createPayload(d, manuscriptId) as Parameters<MaterialWriters["addVersion"]>[0]);
};
