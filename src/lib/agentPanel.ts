/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §F — THE AGENT PANEL's derivations: the door, the where-you-stand card, the index card and
 * the footer. Pure; every word is built from a recorded fact.
 *
 * ⚠️ NOTHING IS INVENTED. A clause whose fact is missing is dropped, never filled: no date means no "on {date}",
 *    no book in scope means no "of {title}", no reply window means no figure. A genre is named only when the
 *    agent's own list holds one of the book's.
 * ⚠️ THE DOOR IS THREE-WAY, AS BUILT (`doorOf`): an Unknown or absent status reads "Not known", never open.
 *    "Closed till {date}" is said only for a recorded date that has not gone by.
 * ⚠️ THE STAND CARD DESCRIBES THE QUERY FOR THE BOOK IN SCOPE (`cardQuery`, the card's own rule: the furthest-
 *    along live query, else the latest close). A live query outranks a shut door; the masthead's top edge says
 *    whether they are taking queries, and this says where yours stands.
 * ⚠️ NO GENDERED PRONOUNS: the agent's first name, or "they".
 */
import type { Agent } from "../types";
import { QueryStatus, SubmissionMethod } from "../types";
import { doorOf, type DoorState } from "./agentList";
import type { AgentFacts } from "./contactList";
import { rowDateLine } from "./contactList";
import { STAGE_NAME, type QcRow } from "./qcSummary";
import { formatDate } from "./dates";
import { genreNoun } from "./genreNoun";
import { hrefFor } from "./quickAdd";
import { mswlLinkOf, wishStamp } from "./agentCard";
import { materialRowsFromAgent } from "./agentMaterials";
import type { DrawerMode } from "./queryActions/drawerStore";
import type { StandCardView, StandPart } from "./standCard";

const DAY = 86_400_000;
const day = (ms: number, nowMs: number): string =>
  formatDate(new Date(ms), new Date(ms).getFullYear() === new Date(nowMs).getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
const daysBetween = (a: number, b: number): number => Math.max(1, Math.round(Math.abs(b - a) / DAY));
const plural = (n: number): string => `${n} day${n === 1 ? "" : "s"}`;

/** the agent's first name; the agency's name when the agent is unnamed */
export const firstNameOf = (a: Pick<Agent, "name" | "agency">): string =>
  (a.name ?? "").trim().split(/\s+/)[0] || (a.agency ?? "").trim() || "this agent";

/* ── the door ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface PanelDoor {
  kind: DoorState;
  /** "Open to queries" · "Closed to queries" · "Closed till 1 Nov" · "Not known" */
  label: string;
  /** the masthead's 5px top edge, and the active tab's underline */
  edge: string;
  /** the pill's 8px dot */
  dot: string;
  /** the recorded reopening day, when it has not gone by */
  till: string | null;
}
export const DOOR_EDGE: Record<DoorState, string> = { open: "#a9bf9f", closed: "#b5aca4", unknown: "#d8cfc2" };

export function panelDoor(a: Pick<Agent, "submissionStatus" | "reopensOn">, nowMs: number): PanelDoor {
  const kind = doorOf(a as Agent);
  const t = a.reopensOn ? Date.parse(a.reopensOn) : NaN;
  const till = kind === "closed" && Number.isFinite(t) && t >= nowMs - DAY ? day(t, nowMs) : null;
  const label = kind === "open" ? "Open to queries" : kind === "closed" ? (till ? `Closed till ${till}` : "Closed to queries") : "Not known";
  return { kind, label, edge: DOOR_EDGE[kind], dot: kind === "open" ? "#6f8f66" : "#8a827b", till };
}

/** the disc is grey when every query to them (for this book) is closed, or when they are closed to queries */
export const discGrey = (x: Pick<AgentFacts, "standing" | "door">): boolean => x.standing.kind === "closed" || x.door === "closed";

/* ── the links on record ──────────────────────────────────────────────────────────────────────────────────── */

export type PanelLink = { key: "website" | "mswl"; label: string; href: string } | { key: "email"; label: string; email: string };
/**
 * Only what is on record. ⚠️ THERE IS NO SUBMISSION-FORM ADDRESS ON AN AGENT (the record has a website, an email
 * and its socials, the MSWL link among them), so "Submission form ↗" is never drawn.
 */
export function panelLinks(a: Pick<Agent, "website" | "email" | "socials">): PanelLink[] {
  const out: PanelLink[] = [];
  const site = (a.website ?? "").trim() ? hrefFor(a.website) : null;
  if (site) out.push({ key: "website", label: "Website ↗", href: site });
  const email = (a.email ?? "").trim();
  if (email) out.push({ key: "email", label: "Copy email", email });
  const mswl = mswlLinkOf(a);
  if (mswl) out.push({ key: "mswl", label: "MSWL ↗", href: mswl });
  return out;
}

/* ── where you stand ──────────────────────────────────────────────────────────────────────────────────────── */

export type StandState = "send" | "offer" | "waiting" | "late" | "closed" | "fit" | "none" | "shut";
export interface PanelStand extends Omit<StandCardView, "tone"> {
  state: StandState;
  /** the court's tint, or "plain" (#efe9df) for an agent with no query for this book */
  tone: "you" | "agent" | "closed" | "plain";
}

export interface StandInput {
  agent: Agent;
  facts: Pick<AgentFacts, "standing" | "door">;
  /** the card's own query for the book in scope, or null */
  q: QcRow | null;
  /** the book in scope, or null */
  title: string | null;
  /** the first of the agent's genres that is one of the book's, as stored; null when none is */
  fitGenre: string | null;
  nowMs: number;
}

const t = (text: string): StandPart => ({ text });
const em = (text: string): StandPart => ({ text, em: true });
/** " of *Title*" and its kin: nothing at all when no book is in scope */
const withTitle = (lead: string, title: string | null): StandPart[] => (title ? [t(lead), em(title)] : []);

export function panelStand({ agent, facts, q, title, fitGenre, nowMs }: StandInput): PanelStand {
  const first = firstNameOf(agent);
  const base = { bar: null, links: [] as StandCardView["links"] };

  if (!q || facts.standing.kind === "none") {
    const door = panelDoor(agent, nowMs);
    if (door.kind === "closed") {
      return { ...base, state: "shut", tone: "plain", heading: "Closed to queries", figure: door.till ? `till ${door.till}` : null, past: false,
        paragraph: [t(`${first} isn’t taking queries right now.`)] };
    }
    const notYet: StandPart[] = title ? [t("You haven’t queried them with "), em(title), t(" yet.")] : [t("You haven’t queried them yet.")];
    if (fitGenre) {
      const takes = `${first} takes ${genreNoun(fitGenre)}`;
      return { ...base, state: "fit", tone: "plain", heading: title ? `A fit for ${title}` : "A fit for your book", figure: "Not queried", past: false,
        paragraph: [t(door.kind === "open" ? `${takes} and is open to queries. ` : `${takes}. `), ...notYet] };
    }
    return { ...base, state: "none", tone: "plain", heading: "Not queried yet", figure: null, past: false,
      paragraph: title ? [t(`You haven’t queried ${first} with `), em(title), t(" yet.")] : [t(`You haven’t queried ${first} yet.`)] };
  }

  const left = q.expectedMs != null ? daysBetween(nowMs, q.expectedMs) : null;
  const gone = q.expectedMs != null && q.expectedMs < nowMs;
  const on = (ms: number | null) => (ms != null ? ` on ${day(ms, nowMs)}` : "");

  if (q.court === "offer") {
    return { ...base, state: "offer", tone: "you", heading: `Answer ${first}’s offer`,
      figure: left != null ? `${plural(left)} ${gone ? "over" : "left"}` : null, past: left != null,
      paragraph: [t(`${first} offered to represent `), ...(title ? [em(title)] : [t("your book")]), t(`${on(q.stageStartMs)}.`),
        ...(q.expectedMs != null ? [t(` You said you’d answer by ${day(q.expectedMs, nowMs)}.`)] : [])] };
  }
  if (q.court === "you") {
    const what = q.status === QueryStatus.PARTIAL_REQUESTED ? "partial" : q.status === QueryStatus.FULL_REQUESTED ? "full" : "new version";
    const asked = q.status === QueryStatus.REVISE_RESUBMIT ? `${first} asked for a new version` : `${first} asked for the ${what}`;
    return { ...base, state: "send", tone: "you", heading: `Send ${first} the ${what}`,
      figure: left != null ? `${plural(left)} ${gone ? "over" : "left"}` : null, past: gone,
      paragraph: [t(asked), ...withTitle(" of ", title), t(`${on(q.stageStartMs)}.`),
        ...(q.expectedMs != null ? [t(` They’re expecting it by ${day(q.expectedMs, nowMs)}.`)] : [])] };
  }
  if (q.court === "closed") {
    const heading = q.closedHow === "passed" ? `${first} passed` : q.closedHow === "noReply" ? "Closed, no reply" : q.closedHow === "withdrawn" ? "Withdrawn" : STAGE_NAME[q.status as QueryStatus] ?? String(q.status);
    return { ...base, state: "closed", tone: "closed", heading, figure: day(q.lastMs, nowMs), past: false,
      paragraph: [t("Your query"), ...withTitle(" for ", title), t(` is closed. You can query ${first} again with your next book.`)] };
  }
  /* with the agent */
  if (gone) {
    return { ...base, state: "late", tone: "agent", heading: `${first} is late`, figure: `${plural(left!)} over`, past: true,
      paragraph: [t(`You expected a reply by ${day(q.expectedMs!, nowMs)}.`)] };
  }
  return { ...base, state: "waiting", tone: "agent", heading: `Waiting on ${first}`, figure: left != null ? `${plural(left)} to go` : null, past: false,
    paragraph: [t(`You queried ${first}`), ...withTitle(" with ", title), t(`${on(q.sentMs)}.`),
      ...(q.expectedMs != null ? [t(` You expect a reply by ${day(q.expectedMs, nowMs)}.`)] : [])] };
}

/* ── the index card ───────────────────────────────────────────────────────────────────────────────────────── */

export type IndexKey = "wishlist" | "genres" | "method" | "reply" | "materials" | "queries";
/** which of the editor's tabs and fields a missing answer's "+ Add" opens */
export const INDEX_EDIT: Record<Exclude<IndexKey, "queries">, { tab: "who" | "want" | "work"; focus: "wishlist" | "genres" | "method" | "reply" | "materials" }> = {
  wishlist: { tab: "want", focus: "wishlist" },
  genres: { tab: "want", focus: "genres" },
  method: { tab: "work", focus: "method" },
  reply: { tab: "work", focus: "reply" },
  materials: { tab: "want", focus: "materials" },
};
export const INDEX_LABEL: Record<IndexKey, string> = { wishlist: "Looking for", genres: "Genres", method: "Takes queries", reply: "Replies", materials: "Send them", queries: "Your queries" };
export const INDEX_ADD: Record<Exclude<IndexKey, "queries">, string> = {
  wishlist: "+ Add their wishlist", genres: "+ Add genres", method: "+ Add how they take queries", reply: "+ Add their reply time", materials: "+ Add what they ask for",
};

export interface IndexRow {
  key: IndexKey;
  label: string;
  /** null: nothing on record — the row shows its "+ Add" */
  answer: string | null;
  /** a small italic line under the answer */
  note?: string | null;
  /** Genres only */
  chips?: { label: string; hit: boolean }[];
}

/** how they take queries, in the panel's words; anything unrecognised says nothing */
export function methodAnswer(m: string | undefined | null): string | null {
  const v = (m ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (v === SubmissionMethod.EMAIL.toLowerCase()) return "By email";
  if (v === "querymanager") return "Through QueryManager";
  if (v === "onlineform" || v === "agencyform") return "Through their submission form";
  if (v === SubmissionMethod.POST.toLowerCase()) return "By post";
  return null;
}

export interface IndexInput {
  agent: Agent;
  /** the agent's genres as shown (labels), with whether each is one of the book's */
  genres: { label: string; hit: boolean }[];
  /** the titles of the books this agent has been queried with, most recent first, without repeats */
  queried: string[];
  nowMs: number;
}

export function panelIndex({ agent, genres, queried, nowMs }: IndexInput): IndexRow[] {
  const wish = (agent.mswlNotes ?? "").trim();
  const w = agent.responseTimeWeeks;
  const weeks = typeof w === "number" && w > 0 ? w : null;
  const mats = materialRowsFromAgent(agent.materialsWanted).filter((r) => r.on).map((r) => materialWords(r));
  const nrn = agent.noResponseMeansNo === true ? "No reply means no" : agent.noResponseMeansNo === false ? "They reply to every query" : null;
  const stamp = wish && agent.mswlCheckedAt ? wishStamp(agent.mswlCheckedAt, nowMs) : null;
  const list = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const NUM = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  return [
    { key: "wishlist", label: INDEX_LABEL.wishlist, answer: wish ? `“${wish}”` : null, note: stamp },
    { key: "genres", label: INDEX_LABEL.genres, answer: genres.length ? genres.map((g) => g.label).join(", ") : null, chips: genres },
    { key: "method", label: INDEX_LABEL.method, answer: methodAnswer(agent.submissionMethod) },
    { key: "reply", label: INDEX_LABEL.reply, answer: weeks ? `In about ${weeks} week${weeks === 1 ? "" : "s"}` : null, note: weeks ? nrn : null },
    { key: "materials", label: INDEX_LABEL.materials, answer: mats.length ? mats.join(" · ") : null },
    { key: "queries", label: INDEX_LABEL.queries, answer: queried.length === 0 ? "None yet" : `${NUM[queried.length] ?? String(queried.length)}, for ${list(queried)}`, chips: undefined },
  ];
}

/** one material as the card says it: "Query letter", "Synopsis · 2 pages", "First 10 pages" */
export function materialWords(r: ReturnType<typeof materialRowsFromAgent>[number]): string {
  if (r.key === "sample") {
    const n = parseInt(r.amount, 10);
    return Number.isFinite(n) && n > 0 ? `First ${r.amount} ${r.unit.toLowerCase()}` : "Opening sample";
  }
  if (r.key === "synopsis") return r.pages ? `Synopsis · ${r.pages} page${String(r.pages) === "1" ? "" : "s"}` : "Synopsis";
  if (r.key === "other") return (r.text ?? "").trim() || "Other";
  return r.name;
}

/* ── the footer ───────────────────────────────────────────────────────────────────────────────────────────── */

export type PanelAct = { kind: "journey"; mode: DrawerMode } | { kind: "edit" };
export interface PanelFoot {
  /** the query's stage, "Not queried yet", or "Closed to queries" */
  status: string;
  /** e.g. "Send by 30 Sep · 5d left", or "Ready when you are" */
  detail: string | null;
  /** rust: it is the writer's move, or a date has gone by */
  hot: boolean;
  primary: { label: string; act: PanelAct };
  /** "Edit profile" beside the primary: false when it IS the primary */
  editSecondary: boolean;
}

export function panelFoot(agent: Agent, facts: Pick<AgentFacts, "standing" | "door">, q: QcRow | null, nowMs: number): PanelFoot {
  const edit: PanelFoot["primary"] = { label: "Edit profile", act: { kind: "edit" } };
  if (!q || facts.standing.kind === "none") {
    if (facts.door === "closed") {
      const till = panelDoor(agent, nowMs).till;
      return { status: "Closed to queries", detail: till ? `Reopens ${till}` : null, hot: false, primary: edit, editSecondary: false };
    }
    return { status: "Not queried yet", detail: "Ready when you are", hot: false, primary: { label: "Log a query", act: { kind: "journey", mode: "log" } }, editSecondary: true };
  }
  const line = rowDateLine(q, nowMs);
  const status = STAGE_NAME[q.status as QueryStatus] ?? String(q.status);
  const detail = line?.text ?? null;
  if (q.court === "closed") return { status, detail, hot: false, primary: edit, editSecondary: false };
  if (q.court === "offer") return { status, detail, hot: true, primary: { label: "Record your answer", act: { kind: "journey", mode: "offer" } }, editSecondary: true };
  if (q.court === "you") {
    const label = q.status === QueryStatus.PARTIAL_REQUESTED ? "Mark partial sent" : q.status === QueryStatus.FULL_REQUESTED ? "Mark full sent" : "Mark new version sent";
    return { status, detail, hot: true, primary: { label, act: { kind: "journey", mode: "sent" } }, editSecondary: true };
  }
  return { status, detail, hot: q.pastExpected, primary: { label: "Record a response", act: { kind: "journey", mode: "resp" } }, editSecondary: true };
}
