/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The example the Analytics empty state shows — a small, invented querying history for a book that
 * does not exist, run through the REAL `analyticsModel`.
 *
 * ⚠️ IT IS INPUT, NEVER OUTPUT. The empty state's funnel, reply chart and story rail are the page's
 * own components drawing figures the page's own derivation produced from these queries — so the
 * example cannot show a shape the real page could not, and it is tagged "Example" wherever it
 * renders. Nothing here is written anywhere.
 *
 * ⚠️ AGENT NAMES ARE INVENTED AND GENDER-NEUTRAL, and the book is not a real one.
 */
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../types";
import { AnalyticsModel, analyticsModel } from "./analyticsModel";

const DAY = 86400000;

export function exampleModel(nowMs: number): AnalyticsModel {
  const ago = (n: number) => new Date(nowMs - n * DAY).toISOString();
  const agents: Agent[] = [
    ["ex-a1", "R. Ayres", "Ayres & Colt", 6],
    ["ex-a2", "J. Bell", "Bell Literary", 8],
    ["ex-a3", "S. Cheng", "Dunhill Literary", 4],
    ["ex-a4", "M. Duarte", "Duarte Agency", 8],
    ["ex-a5", "A. Hollis", "The Hollis Agency", 10],
    ["ex-a6", "K. Okonjo", "Marsh & Okonjo", 4],
    ["ex-a7", "T. Reeve", "Reeve Partners", 6],
    ["ex-a8", "L. Usher", "Usher & Pike", 8],
  ].map(([id, name, agency, w]) => ({ id, userId: "ex", name, agency, email: "", website: "", responseTimeWeeks: w }) as unknown as Agent);

  const walks: [string, number, [QueryStatus, number][]][] = [
    ["ex-a1", 300, [[QueryStatus.PARTIAL_REQUESTED, 256], [QueryStatus.PARTIAL_SENT, 252], [QueryStatus.REJECTED, 200]]],
    ["ex-a2", 290, [[QueryStatus.REJECTED, 220]]],
    ["ex-a3", 280, [[QueryStatus.PARTIAL_REQUESTED, 266], [QueryStatus.PARTIAL_SENT, 262], [QueryStatus.FULL_REQUESTED, 230], [QueryStatus.FULL_SENT, 226]]],
    ["ex-a4", 250, [[QueryStatus.NO_RESPONSE, 150]]],
    ["ex-a5", 240, [[QueryStatus.FULL_REQUESTED, 190], [QueryStatus.FULL_SENT, 187], [QueryStatus.OFFER, 120]]],
    ["ex-a6", 120, [[QueryStatus.FULL_REQUESTED, 99], [QueryStatus.FULL_SENT, 96]]],
    ["ex-a7", 110, [[QueryStatus.REJECTED, 40]]],
    ["ex-a8", 100, [[QueryStatus.PARTIAL_REQUESTED, 64]]],
    ["ex-a2", 60, []],
    ["ex-a4", 45, []],
    ["ex-a7", 30, []],
  ];
  const queries: Query[] = [];
  const activities: Activity[] = [];
  walks.forEach(([agentId, sent, steps], i) => {
    const id = `ex-q${i + 1}`;
    const last = steps.length ? steps[steps.length - 1][0] : QueryStatus.QUERIED;
    queries.push({ id, userId: "ex", manuscriptId: "ex-ms", agentId, packageId: "", status: last, dateSent: ago(sent),
      personalisationNotes: "", sendMethod: "Email" } as unknown as Query);
    const rung = (s: QueryStatus, d: number, k: number) => activities.push({ id: `${id}-${k}`, userId: "ex", queryId: id,
      manuscriptId: "ex-ms", activityType: ActivityType.STATUS_CHANGED, description: "", date: ago(d), details: "",
      resultingStatus: s } as unknown as Activity);
    rung(QueryStatus.QUERIED, sent, 0);
    steps.forEach(([s, d], k) => rung(s, d, k + 1));
  });
  return analyticsModel({ queries, activities, agents, range: "all", nowMs });
}
