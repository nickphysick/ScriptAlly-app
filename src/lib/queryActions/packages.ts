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
import { resolveActivePackage } from "../packageMetrics";
import type { Manuscript } from "../../types";
import { blankSample, sampleName, type Materials, type Sample } from "./sample";

export interface PackageCard {
  id: string;
  name: string;
  ql: boolean;
  syn: boolean;
  /** `Query letter v3` — the version NAME each piece carries, as sent. */
  qlVersion: string | null;
  synVersion: string | null;
  /** The version ids — what `sentVersions` records (§C3). */
  qlId: string | null;
  synId: string | null;
  /** The book version the package tests — the sample's CONTENT (D2); the portion is the query's. */
  bookVersion: string | null;
  /** Free-text other materials, trimmed; null when none. */
  other: string | null;
  /**
   * ⚠️ `edition` IS READ IF THE PACKAGE CARRIES ONE AND IS 1 OTHERWISE (§C5). Package editions are
   * the packages session's model and land in Part B; until then every package is its 1st edition,
   * and nothing on the query side waits for that.
   */
  edition: number;
  /** One line under the name: `Query letter and synopsis`. */
  summary: string;
}

export interface GuidelineAsk { ql: boolean; syn: boolean; sample: Sample; stated: boolean }

/** Live = not retired, by either the status the model has today or the `retiredAt` §C2 adds. */
const isLive = (p: { status?: string; retiredAt?: unknown }) => (p.status ?? "Active") !== "Retired" && !(p as { retiredAt?: unknown }).retiredAt;
const editionOf = (p: object): number => {
  const e = (p as { edition?: unknown }).edition;
  return typeof e === "number" && Number.isInteger(e) && e >= 1 ? e : 1;
};
const versionName = (versions: ManuscriptVersion[], id: string | undefined): string | null => {
  if (!id) return null;
  return versions.find((v) => v.id === id)?.versionName ?? null;
};

export function packagesFor(manuscriptId: string, packages: SubmissionPackage[] | undefined, versions: ManuscriptVersion[] | undefined, bookVersions?: { id: string; name: string }[]): PackageCard[] {
  try {
    const vs = versions ?? [];
    const bvs = bookVersions ?? [];
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
          qlId: p.queryLetterVersionId || null,
          synId: syn ? p.synopsisVersionId : null,
          bookVersion: (p.bookVersionId && bvs.find((b) => b.id === p.bookVersionId)?.name) || null,
          other: p.otherMaterials?.trim() || null,
          edition: editionOf(p),
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

/** The manuscript's "used for new queries" package — through `resolveActivePackage`, the packages page's own reader, so the two cannot disagree. */
export function activePackageId(manuscript: Manuscript | null | undefined, packages: SubmissionPackage[] | undefined): string | null {
  try { return resolveActivePackage(manuscript, packages ?? [])?.id ?? null; } catch { return null; }
}

/**
 * WHICH OPTION STEP 2 OPENS ON (§A1, Nick's ruling) — first match wins, and each must be LIVE on
 * this manuscript: (1) an explicit `packageId`, (2) `again.pkg`, (3) the manuscript's "used for new
 * queries" package. Any hit means package; none means individually.
 *
 * ⚠️ A GUIDELINE MATCH IS DELIBERATELY NOT AN ARGUMENT. It shows its MATCHES tag and is only ever
 * the selection when the writer asks for a package and none of the three applies — see `packageToAttach`.
 */
export function openingPackage(live: PackageCard[], explicitId: string | null | undefined, againId: string | null | undefined, activeId: string | null | undefined): string | null {
  for (const id of [explicitId, againId, activeId]) if (id && live.some((p) => p.id === id)) return id;
  return null;
}

/**
 * STEP 2'S OPENING CHOICE, WITH "LOG ANOTHER" (Nick, 28 Sep): the order stays explicit preset, then
 * `again`, then the default — but `again` is taken WHICHEVER WAY it was recorded. A repeat of an
 * individual log opens on individually with the same pieces, even when the manuscript has a "used
 * for new queries" package; a repeat of a package log opens on that package if it is still live.
 */
export function openingChoice(live: PackageCard[], explicitId: string | null | undefined, again: { how?: "package" | "individual"; pkg?: string } | null | undefined, activeId: string | null | undefined): { how: "package" | "individual"; pkg: string | null } {
  if (explicitId && live.some((p) => p.id === explicitId)) return { how: "package", pkg: explicitId };
  if (again) {
    const how = again.how ?? (again.pkg && again.pkg !== "custom" ? "package" : "individual");
    if (how === "individual") return { how: "individual", pkg: null };
    if (again.pkg && live.some((p) => p.id === again.pkg)) return { how: "package", pkg: again.pkg };
  }
  if (activeId && live.some((p) => p.id === activeId)) return { how: "package", pkg: activeId };
  return { how: "individual", pkg: null };
}

/** What "Attach a submission package" selects when the writer switches to it: the order, then a match, then the first. */
export function packageToAttach(live: PackageCard[], ordered: string | null, ask: GuidelineAsk | null): string | null {
  if (ordered && live.some((p) => p.id === ordered)) return ordered;
  return (ask && live.find((p) => packageMatches(p, ask))?.id) || live[0]?.id || null;
}

/* ---------- what was sent (§C3) ---------- */

/** One row of "what you sent": the piece, and the value it went with. */
export interface SentPiece { key: "ql" | "syn" | "sample" | "other"; label: string; value: string }

/**
 * The pieces, as they went. The sample's CONTENT is the book version and its PORTION is the query's
 * (D2), so the sample row reads `first 3 chapters · Fast-paced opening`.
 */
/** A version named after its own piece ("Query letter v3", "Synopsis, 2 pages") reads as its remainder ("v3", "2 pages"). */
export function bareVersion(label: string, name: string | null | undefined): string {
  const n = String(name ?? "").trim();
  const low = n.toLowerCase(), l = label.toLowerCase();
  const rest = low.startsWith(l) ? n.slice(label.length).replace(/^[\s,:·–-]+/, "").trim() : n;
  return rest || n;
}

export function sentPieces(m: Materials, v: { qlVersion: string | null; synVersion: string | null; bookVersion: string | null; other: string | null }): SentPiece[] {
  const out: SentPiece[] = [];
  if (m.ql) out.push({ key: "ql", label: "Query letter", value: bareVersion("Query letter", v.qlVersion) });
  if (m.syn) out.push({ key: "syn", label: "Synopsis", value: bareVersion("Synopsis", v.synVersion) });
  const portion = m.s.unit !== "none" ? sampleName(m.s) : "";
  if (portion || v.bookVersion) out.push({ key: "sample", label: "Sample", value: [portion, v.bookVersion].filter(Boolean).join(" · ") });
  if (v.other) out.push({ key: "other", label: "Also", value: v.other });
  return out;
}

/**
 * THE READABLE SUMMARY (`sentMaterials`) — `Query letter v3 · Synopsis v2 · first 3 chapters ·
 * Fast-paced opening`. A frozen record, written once and never re-derived from a live package.
 * `piecesOf` reads it back into rows, so the format is owned here and nowhere else.
 */
export function summaryOf(pieces: SentPiece[]): string {
  return pieces.map((p) => (p.key === "sample" ? p.value : p.key === "other" ? `Also: ${p.value}` : `${p.label}${p.value ? ` ${p.value}` : ""}`)).join(" · ");
}

/**
 * ⚠️ THE FROZEN NAME RIDES IN THE SUMMARY, BECAUSE §C3 HAS NO FIELD FOR IT. LP6 requires a query
 * to keep the package's name as it was on the day, after any rename, and a new field would take
 * the rules beyond the Part C set (a §S stop). So the summary carries it as a prefix —
 * `Standard package: …` for a package, `Based on Standard: …` for based-on — and `readSummary`
 * is the one parser. Flagged for the contract.
 */
export function summaryWith(pieces: SentPiece[], pkgName: string | null, basedOnName: string | null): string {
  const body = summaryOf(pieces);
  if (pkgName) return `${pkgName} package: ${body}`;
  if (basedOnName) return `Based on ${basedOnName}: ${body}`;
  return body;
}

export function readSummary(summary: string | null | undefined): { packageName: string | null; basedOnName: string | null; pieces: SentPiece[] } {
  const s = String(summary ?? "");
  const pk = / package: /.exec(s);
  if (pk && !s.startsWith("Based on ")) return { packageName: s.slice(0, pk.index), basedOnName: null, pieces: piecesOf(s.slice(pk.index + pk[0].length)) };
  const bo = /^Based on (.+?): /.exec(s);
  if (bo) return { packageName: null, basedOnName: bo[1], pieces: piecesOf(s.slice(bo[0].length)) };
  return { packageName: null, basedOnName: null, pieces: piecesOf(s) };
}

export function piecesOf(summary: string | null | undefined): SentPiece[] {
  const whole = String(summary ?? "").trim();
  /* v1's older one-line form — "Query letter, synopsis and first 3 chapters" — has no separators to
     split on; it is read as one row rather than mis-split into a letter whose version is a list. */
  if (whole && !whole.includes(" · ") && (whole.includes(", ") || / and /.test(whole))) {
    return [{ key: "other", label: "What went", value: whole }];
  }
  const segs = whole.split(" · ").map((x) => x.trim()).filter(Boolean);
  const out: SentPiece[] = [];
  const sample: string[] = [];
  for (const seg of segs) {
    const ql = /^query letter\b\s*(.*)$/i.exec(seg);
    const syn = /^synopsis\b\s*(.*)$/i.exec(seg);
    const also = /^also:\s*(.*)$/i.exec(seg);
    if (ql) out.push({ key: "ql", label: "Query letter", value: ql[1] });
    else if (syn) out.push({ key: "syn", label: "Synopsis", value: syn[1] });
    else if (also) out.push({ key: "other", label: "Also", value: also[1] });
    else sample.push(seg);
  }
  if (sample.length) out.splice(out.findIndex((p) => p.key === "other") < 0 ? out.length : out.findIndex((p) => p.key === "other"), 0, { key: "sample", label: "Sample", value: sample.join(" · ") });
  return out;
}

/** The pieces that decide an edition's identity on the query side: which letter, which synopsis, what else. */
export interface PieceIds { qlId: string | null; synId: string | null; other: string | null }

/**
 * "BASED ON" (§A2) — how the individual pieces differ from the package the writer started from.
 * The sample's portion is NOT a difference: it is the agent's to set (D2), and a package never
 * states one. Empty = no change, which makes it an exact match rather than "based on".
 */
export function piecesChanged(base: PackageCard, now: PieceIds & { qlVersion: string | null; synVersion: string | null }): string[] {
  const out: string[] = [];
  const v = (label: string, id: string | null, name: string | null) => (id ? bareVersion(label, name) || "a version" : "none");
  if (base.qlId !== now.qlId) out.push(`Query letter: ${v("Query letter", base.qlId, base.qlVersion)} → ${v("Query letter", now.qlId, now.qlVersion)}`);
  if (base.synId !== now.synId) out.push(`Synopsis: ${v("Synopsis", base.synId, base.synVersion)} → ${v("Synopsis", now.synId, now.synVersion)}`);
  if ((base.other ?? null) !== (now.other ?? null)) out.push(`Also: ${base.other ?? "none"} → ${now.other ?? "none"}`);
  return out;
}

/** A live package whose pieces are EXACTLY these — the review's "This is exactly your ‹name› package" (LP8). */
export function exactPackage(live: PackageCard[], now: PieceIds): PackageCard | null {
  return live.find((p) => p.qlId === now.qlId && p.synId === now.synId && (p.other ?? null) === (now.other ?? null)) ?? null;
}

/* ---------- correcting what was sent (§A4) ---------- */

/** One edition that could have gone out on a given day — a row in the correction's package list. */
export interface EditionChoice extends PackageCard { retired: boolean; key: string }

/**
 * EVERY EDITION THAT EXISTED ON THE QUERY'S DATE, RETIRED PACKAGES INCLUDED (§A4) — "because that's
 * what could have gone out that day". An edition existed if it had started by then; a later edition
 * of the same package is not offered, and a superseded one still is.
 *
 * ⚠️ UNTIL PART B, A PACKAGE IS ITS 1ST EDITION, STARTED ON ITS createdDate (§C5). When the model
 * carries `editions`, each `{ n, startedAt }` is read here instead; the pieces of a past edition are
 * then that edition's own record, which is Part B's to supply — until it does, an edition's pieces
 * are the package's live ones, which for a 1st edition is the same thing.
 */
export function editionsOn(manuscriptId: string, dayIso: string, packages: SubmissionPackage[] | undefined, versions: ManuscriptVersion[] | undefined, bookVersions?: { id: string; name: string }[]): EditionChoice[] {
  const day = dayIso.slice(0, 10);
  const all = (packages ?? []).filter((p) => p && p.manuscriptId === manuscriptId);
  const cards = new Map(packagesFor(manuscriptId, all.map((p) => ({ ...p, status: "Active", retiredAt: undefined } as SubmissionPackage)), versions, bookVersions).map((c) => [c.id, c]));
  const out: EditionChoice[] = [];
  for (const p of all) {
    const card = cards.get(p.id);
    if (!card) continue;
    const retired = !isLive(p);
    const eds = (p as { editions?: { n?: unknown; startedAt?: unknown }[] }).editions;
    const list = Array.isArray(eds) && eds.length
      ? eds.map((e) => ({ n: typeof e.n === "number" ? e.n : 1, start: String(e.startedAt ?? "").slice(0, 10) }))
      : [{ n: 1, start: String(p.createdDate ?? "").slice(0, 10) }];
    for (const e of list) {
      if (e.start && e.start > day) continue;
      out.push({ ...card, edition: e.n, retired, key: `${p.id}#${e.n}` });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.edition - b.edition);
}
