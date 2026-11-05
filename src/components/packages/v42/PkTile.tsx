/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the package's icon tile, and the version disc's number. Moved here from v41's Pk41Batch.tsx
 * when the batch strip was retired (v42 Part A); Results and the stat tiles read them. v42 Part E: the tile is navy
 * with a cream glyph for every package (its stored colour is kept and never shown — `pcStyle` paints navy).
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { pcStyle } from "../../../lib/packagesV39";
import { Pic } from "../v26/icons";
import type { Pk26Model } from "../v26/usePk26Model";

export const PkTile: React.FC<{ p: SubmissionPackage; cls?: string }> = ({ p, cls = "" }) => (
  <span className={`p41-ic${cls ? ` ${cls}` : ""}`} style={pcStyle(p)} aria-hidden="true" data-pk42="icon"><Pic ic={iconOf(p)} cls="p41-pic" /></span>
);

/** The version disc's number, as everywhere on this page ("O" for the original). */
export const vnumOf = (model: Pk26Model, id: string | undefined) => {
  const v = id ? model.versionRows.find((x) => x.id === id) ?? null : null;
  return v ? { name: v.name, num: v.original ? "O" : String(v.num) } : null;
};
