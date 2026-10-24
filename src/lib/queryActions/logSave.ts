/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LOG SAVE — moved out of LogJourney's commit (D1) for Query Centre v149, so the journey and the query card's
 * "+ Log a query" (D1 in the card) write one payload through one `addQuery`. How the materials were recorded is
 * frozen here and never read back from a live package (§C3).
 *
 * `logDefaults` is the journey's own opening answers once an agent is chosen: their usual reply window (8 weeks when
 * they state none), and if nothing comes back, a nudge a week after it — or "close it" where no response means no.
 */
import type { useScriptAllyDb } from "../db";
import { SubmissionMethod, type Agent, type QueryMaterial } from "../../types";
import { addDays, dayIso, reminderAnchors } from "./dates";
import { sentPieces, summaryWith, type PackageCard } from "./packages";
import type { Materials } from "./sample";

type Db = ReturnType<typeof useScriptAllyDb>;
export type IfNo = "nudge" | "close" | "nothing";
export const IF_NO_STORED: Record<IfNo, string> = {
  nudge: "Remind me to nudge",
  close: "Mark as no response automatically",
  nothing: "Do nothing",
};

/** Materials → the query's stored `materialsWanted`, the shape the rest of the app reads. */
export function materialsToQuery(m: Materials): (string | QueryMaterial)[] {
  const out: (string | QueryMaterial)[] = [];
  if (m.ql) out.push("Query Letter");
  if (m.syn) out.push("Synopsis");
  if (m.s.unit !== "none") out.push({ material: "Sample Pages", type: m.s.unit, quantity: m.s.amt });
  return out;
}

export interface PieceVersions { qlId: string | null; synId: string | null; qlVersion: string | null; synVersion: string | null; bookVersion: string | null; other: string | null }

export interface LogPlan {
  id: string;
  manuscriptId: string;
  agent: Agent;
  sent: Date;
  via: SubmissionMethod;
  /** the package chosen, or null when chosen individually */
  pkCard: PackageCard | null;
  mat: Materials;
  pieceV: PieceVersions;
  /** a package the individual send started from, with what changed (the journey's "based on"); null for none */
  basedOn: { pk: PackageCard; changes: string[] } | null;
  expect: Date;
  /** the writer moved the reply date off the agent's usual */
  writerExpected: boolean;
  ifNo: IfNo;
  nudgeDate: Date | null;
  requery: boolean;
  /** "no response means no" as answered, when it differs from the agent's record */
  nrmnOverride: boolean | null;
}

export function logDefaults(agent: Agent, sent: Date): Pick<LogPlan, "expect" | "writerExpected" | "ifNo" | "nudgeDate" | "nrmnOverride"> {
  const wks = agent.responseTimeWeeks && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;
  const expect = addDays(sent, (wks ?? 8) * 7);
  const ifNo: IfNo = agent.noResponseMeansNo ? "close" : "nudge";
  const nudgeDate = ifNo === "nudge" ? reminderAnchors(expect, [["week", "A week later", 7]])[0].d : null;
  return { expect, writerExpected: !wks, ifNo, nudgeDate, nrmnOverride: null };
}

/** The pieces going out, and their versions: a package's own, or the current letter and synopsis chosen individually. */
export function pieceVersions(pkCard: PackageCard | null, mat: Materials, qlV: { id: string; versionName?: string | null } | null | undefined, synV: { id: string; versionName?: string | null } | null | undefined): PieceVersions {
  return pkCard
    ? { qlId: pkCard.qlId, synId: pkCard.synId, qlVersion: pkCard.qlVersion, synVersion: pkCard.synVersion, bookVersion: pkCard.bookVersion, other: pkCard.other }
    : { qlId: mat.ql ? qlV?.id ?? null : null, synId: mat.syn ? synV?.id ?? null : null, qlVersion: mat.ql ? qlV?.versionName ?? null : null, synVersion: mat.syn ? synV?.versionName ?? null : null, bookVersion: null, other: null };
}

export function logPayload(p: LogPlan): { payload: Record<string, unknown>; summary: string } {
  const pieces = sentPieces(p.mat, p.pieceV);
  const summary = summaryWith(pieces, p.pkCard?.name ?? null, !p.pkCard && p.basedOn && p.basedOn.changes.length ? p.basedOn.pk.name : null);
  const versionIds = [p.pieceV.qlId, p.pieceV.synId].filter((x): x is string => !!x);
  const record: Record<string, unknown> = p.pkCard
    ? { sentHow: "package", sentPackageId: p.pkCard.id, sentPackageEdition: p.pkCard.edition, sentPackageName: p.pkCard.name }
    : { sentHow: "individual", ...(p.basedOn && p.basedOn.changes.length ? { basedOnPackageId: p.basedOn.pk.id, basedOnPackageEdition: p.basedOn.pk.edition, sentChanges: p.basedOn.changes } : {}) };
  const payload: Record<string, unknown> = {
    id: p.id,
    manuscriptId: p.manuscriptId,
    agentId: p.agent.id,
    /* kept in step with sentPackageId for older readers — empty when not a package (§C3) */
    packageId: p.pkCard ? p.pkCard.id : "",
    materialsWanted: materialsToQuery(p.mat),
    personalisationNotes: "",
    sendMethod: p.via,
    dateSent: dayIso(p.sent),
    ifNoResponse: IF_NO_STORED[p.ifNo],
    ...record,
    sentMaterials: summary,
    sentVersions: versionIds,
    ...(p.nudgeDate ? { nudgeDate: dayIso(p.nudgeDate) } : {}),
    ...(p.writerExpected ? { writerExpectedDate: dayIso(p.expect), writerExpectedSetAt: new Date().toISOString() } : {}),
    ...(p.requery ? { requery: true } : {}),
    ...(p.nrmnOverride != null ? { nrmnOverride: p.nrmnOverride } : {}),
  };
  return { payload, summary };
}

export async function saveLog(db: Db, p: LogPlan): Promise<void> {
  const { payload, summary } = logPayload(p);
  const res = await db.addQuery(payload as never, false, { eventKey: p.requery ? "requery_sent" : "query_sent", details: summary, stampPackage: !!p.pkCard });
  if (!res.success) throw new Error(res.error || "Couldn't log the query");
  /* "Close it" is the app's existing auto-close, which fires from `responseDeadline` — so the writer's choice writes
     that date, and only that choice does. */
  if (p.ifNo === "close") await db.updateQuery(p.id, { responseDeadline: dayIso(p.expect) });
}
