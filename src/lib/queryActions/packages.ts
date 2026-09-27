/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE ADAPTER BETWEEN THE QUERY DRAWER AND SUBMISSION PACKAGES (brief P3). Nothing else in the
 * drawer imports a package type: the packages page and its data model belong to another session,
 * and if that model moves, this file is the only thing that has to follow it.
 *
 * What a package can say today (checked with the packages session, 27 Sep): a query letter
 * (required), a synopsis (`""` = none) and free-text "other" materials. **A package does not state a
 * sample size** — `samplePagesVersionId` is always `""` — so a package sets the letter and the
 * synopsis and leaves the sample as the writer (or the agent's guidelines) set it.
 *
 * ⚠️ FAILS SOFT, NEVER LOUD. A package model that is mid-change reads as "no packages", and the
 * drawer falls back to Custom materials — the ticks and the sample control. A missing card is a
 * CHECK-level absence, never a reason the writer cannot log a query.
 */
import type { Agent, ManuscriptVersion, SubmissionPackage } from "../../types";
import { ComponentType } from "../../types";
import { materialRowsFromAgent } from "../agentMaterials";
import { blankSample, materialsName, type Materials, type Sample } from "./sample";

export interface PackageCard {
  id: string;
  name: string;
  ql: boolean;
  syn: boolean;
  /** `Query letter v3` — the version NAME each piece carries, as sent. */
  qlVersion: string | null;
  synVersion: string | null;
  /** One line under the name: `Query letter and synopsis`. */
  summary: string;
}

export interface GuidelineAsk { ql: boolean; syn: boolean; sample: Sample; stated: boolean }

const isLive = (p: { status?: string }) => (p.status ?? "Active") !== "Retired";
const versionName = (versions: ManuscriptVersion[], id: string | undefined): string | null => {
  if (!id) return null;
  return versions.find((v) => v.id === id)?.versionName ?? null;
};

export function packagesFor(manuscriptId: string, packages: SubmissionPackage[] | undefined, versions: ManuscriptVersion[] | undefined): PackageCard[] {
  try {
    const vs = versions ?? [];
    return (packages ?? [])
      .filter((p) => p && p.manuscriptId === manuscriptId && isLive(p))
      .map((p) => {
        const syn = !!p.synopsisVersionId;
        const parts = ["Query letter", ...(syn ? ["synopsis"] : []), ...(p.otherMaterials?.trim() ? [p.otherMaterials.trim()] : [])];
        return {
          id: p.id,
          name: p.packageName || "Untitled package",
          ql: !!p.queryLetterVersionId,
          syn,
          qlVersion: versionName(vs, p.queryLetterVersionId),
          synVersion: syn ? versionName(vs, p.synopsisVersionId) : null,
          summary: parts.length > 2 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join(" and "),
        };
      });
  } catch {
    return [];
  }
}

/** The newest live version of a piece for this manuscript — what "CURRENT" means on a tick. */
export function currentVersion(manuscriptId: string, versions: ManuscriptVersion[] | undefined, type: ComponentType): ManuscriptVersion | null {
  const list = (versions ?? []).filter((v) => v.manuscriptId === manuscriptId && v.componentType === type && isLive(v));
  if (!list.length) return null;
  return [...list].sort((a, b) => String(b.createdDate ?? "").localeCompare(String(a.createdDate ?? "")))[0];
}

/** What an agent asks for, from their stored materials — `stated` false when they list nothing. */
export function guidelineAsk(agent: Agent | null | undefined): GuidelineAsk {
  const rows = materialRowsFromAgent(agent?.materialsWanted ?? []);
  const ql = !!rows.find((r) => r.key === "queryLetter" && r.on);
  const syn = !!rows.find((r) => r.key === "synopsis" && r.on);
  const sr = rows.find((r) => r.key === "sample" && r.on);
  let sample: Sample = { ...blankSample(), unit: "none" };
  if (sr && sr.kind === "qty") {
    const amt = parseInt(String(sr.amount ?? "").replace(/,/g, ""), 10);
    const unit = sr.unit === "Pages" ? "pages" : sr.unit === "Words" ? "words" : "chapters";
    sample = { unit, amt: Number.isFinite(amt) && amt > 0 ? amt : unit === "pages" ? 10 : unit === "words" ? 5000 : 3, from: 1, sect: false, fu: null };
  }
  return { ql, syn, sample, stated: ql || syn || sample.unit !== "none" };
}

/** A package matches an agent when its letter and synopsis are exactly what they ask for. */
export function packageMatches(p: PackageCard, ask: GuidelineAsk): boolean {
  return ask.stated && p.ql === ask.ql && p.syn === ask.syn;
}

/**
 * THE SENT SNAPSHOT (brief P4) — what went out, as it went out, so a package edited, renamed or
 * deleted later cannot change a query's history. Flat on purpose: nested maps are denied by the
 * nested-allowlist rule.
 */
export interface SentSnapshot { sentPackageId: string; sentMaterials: string; sentVersions: string[] }
export function sentSnapshot(p: PackageCard | null, m: Materials, qlVersion: string | null, synVersion: string | null): SentSnapshot {
  const versions: string[] = [];
  if (m.ql && (p?.qlVersion || qlVersion)) versions.push(`Query letter · ${p?.qlVersion || qlVersion}`);
  if (m.syn && (p?.synVersion || synVersion)) versions.push(`Synopsis · ${p?.synVersion || synVersion}`);
  return {
    sentPackageId: p?.id ?? "",
    sentMaterials: `${p ? `${p.name} package: ` : ""}${materialsName(m)}`,
    sentVersions: versions,
  };
}
