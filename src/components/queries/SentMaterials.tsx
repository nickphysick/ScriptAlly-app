/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SentMaterials — what went with the send, hung under the send rung (drawer cut 2, §2).
 *
 * ⚠️ READ-ONLY BY DESIGN. The retired record view built these pills with popovers, a × each and a
 * ＋ Attach menu; decision 2 moves every materials edit into the ⋯'s mistake branch, so a second
 * editing surface here would be the exact two-homes fault the fork exists to end. Three states,
 * same derivations as before:
 *
 *   PACKAGED — the blue `PackageGroup` strip (parcel slot · PACKAGE seal · chips), one per
 *              package group in the query's own `materialsWanted` marks.
 *   LOOSE    — `LooseMaterials`: a sheets plate and the chips straight on the parchment.
 *   NOTHING  — the dashed prompt, a STATEMENT not a control; §3's desk carries the editor.
 *
 * ⚠️ `base` ARRIVES DERIVED (the page's `baseMaterialsFor`), because the fallback-to-agent rule
 * lives there and is suppressed beside any attachment (D6/D7) and beside a dangling packageId
 * (F-AD) — what an agency usually asks for is not evidence of what went.
 *
 * ⚠️ "Save as package ›" IS IN THE REF AND DELIBERATELY NOT HERE — the packages run retired that
 * control (D7) and a ref does not reinstate a documented decision.
 */
import React from "react";
import { PackageGroup, LooseMaterials } from "../reading-pane/PackageGroup";
import { groupByOrigin, materialName } from "../../lib/packageAttach";
import { formatQueryMaterial } from "../../lib/materials";
import type { Query, QueryMaterial, SubmissionPackage } from "../../types";
import type { QueryPortion } from "../../lib/queryPortion";

export interface SentMaterialsProps {
  query: Pick<Query, "packageId" | "materialsWanted" | "dateSent">;
  /** The page's `baseMaterialsFor` output — fallback rules applied THERE, never here. */
  base: readonly (string | QueryMaterial)[];
  packages: readonly SubmissionPackage[];
  portion: QueryPortion;
  onViewPackages?: () => void;
}

const chip = (key: string, label: string) => (
  <span key={key} className="qc-mchip qpn-chip">{label}</span>
);

export const SentMaterials: React.FC<SentMaterialsProps> = ({ query, base, packages, portion, onViewPackages }) => {
  const sent = (query.materialsWanted ?? []) as (string | QueryMaterial)[];
  const linkedPackage = (query.packageId ? packages.find((pk) => pk.id === query.packageId) : null) ?? null;
  const { groups } = groupByOrigin(sent);

  if (linkedPackage && groups.length) {
    const claimed = new Set(groups.flatMap((g) => g.materials));
    const loosePills = base.filter((it) => !claimed.has(materialName(it)));
    return (
      <>
        {groups.map((g) => (
          <PackageGroup
            key={g.packageId}
            group={g}
            live={packages.find((pk) => pk.id === g.packageId) ?? null}
            sent={sent}
            sentDate={query.dateSent}
            portion={portion}
            onView={onViewPackages}
          >
            {base.filter((it) => claimed.has(materialName(it))).map((it, i) => chip(`g-${i}`, formatQueryMaterial(it)))}
          </PackageGroup>
        ))}
        {loosePills.length > 0 && (
          <LooseMaterials>
            {loosePills.map((it, i) => chip(`l-${i}`, formatQueryMaterial(it)))}
          </LooseMaterials>
        )}
      </>
    );
  }
  if (base.length) {
    return (
      <LooseMaterials>
        {base.map((it, i) => chip(`m-${i}`, formatQueryMaterial(it)))}
      </LooseMaterials>
    );
  }
  return <div className="qpn-whatwent">What went with this query?</div>;
};
