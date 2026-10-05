/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PARKING A JOURNEY (Agent card v1 §6.3–§6.5; ref design-refs/agent-card-housekeeping-v7.html, the
 * Journey map's Continuity table) — the pure half: what the parked chip says, what a reload keeps,
 * and when a door asks for the journey that is already parked. The store (`drawerStore`) holds the
 * one parked journey; the chip and the drawer both read this.
 *
 * ⚠️ WHAT IS STORED IS THE JOURNEY, NEVER THE DOOR. A request carries the hooks of the surface that
 * opened it — the card it docks, the to-do row that shows its own receipt, the callbacks that tell
 * them — and a parked journey resumes "wherever the writer is now" (Continuity: Resume), where that
 * surface may be long gone. So a park strips them (`bareRequest`) and a resume takes the hooks of
 * whatever asked for it, or of the card open at the time.
 */
import { QueryStatus } from "../../types";
import type { DrawerMode, DrawerPreset, LogAgain, OpenRequest } from "./drawerStore";

/** The reload key (§6.4 names it; the mock's script says `qh.parked`, and the prompt wins). */
export const PARKED_KEY = "qh.parkedJourney";

/** One parked journey: its request (bare), where the shell was, and the journey's own answers. */
export interface ParkedJourney {
  req: OpenRequest;
  /** the step the shell was on, the steps it had opened, and how many there are (review included) */
  step: number;
  seen: number[];
  of: number;
  /** the journey's own `snapshot()` — plain data, so a reload can seed it */
  answers: unknown;
  /** the chip's title ("Send the full"), what starting it is called ("sending the full"), and the agent */
  title: string;
  doing: string;
  name: string;
  /** a journey parked in this tab stays MOUNTED, hidden — false once a reload has dropped it */
  live: boolean;
}

type SendKind = "full" | "partial" | "rr";
const sendKind = (status?: string | null): SendKind =>
  status === QueryStatus.FULL_REQUESTED ? "full" : status === QueryStatus.REVISE_RESUBMIT ? "rr" : "partial";

/** The chip's title — the card's own verbs (the mock's TITLE), never the drawer's review button. */
export function journeyTitle(mode: DrawerMode, status?: string | null): string {
  switch (mode) {
    case "sent": {
      const k = sendKind(status);
      return k === "full" ? "Send the full" : k === "rr" ? "Send the new version" : "Send the partial";
    }
    case "log": return "Log a query";
    case "resp": return "Record a response";
    case "nudge": return "Send a nudge";
    case "offer": return "Answer the offer";
    case "close": return "Close the query";
    case "edit": return "Edit an entry";
    default: {
      const unhandled: never = mode;
      return unhandled;
    }
  }
}

/** What starting it is called, for the clash ask: "…and start recording a response for Ana Reyes." */
export function journeyDoing(mode: DrawerMode, status?: string | null): string {
  switch (mode) {
    case "sent": {
      const k = sendKind(status);
      return k === "full" ? "sending the full" : k === "rr" ? "sending the new version" : "sending the partial";
    }
    case "log": return "logging a query";
    case "resp": return "recording a response";
    case "nudge": return "logging a nudge";
    case "offer": return "answering the offer";
    case "close": return "closing the query";
    case "edit": return "editing an entry";
    default: {
      const unhandled: never = mode;
      return unhandled;
    }
  }
}

/** A door asking for the journey that is already parked resumes it, rather than clashing with it. */
export function sameJourney(a: OpenRequest, b: OpenRequest): boolean {
  return a.mode === b.mode && (a.queryId ?? null) === (b.queryId ?? null)
    && (a.agentId ?? null) === (b.agentId ?? null) && (a.entryId ?? null) === (b.entryId ?? null);
}

/** The request as parked: the journey, without the door's hooks. */
export function bareRequest(req: OpenRequest): OpenRequest {
  const { dock: _dock, receipt: _receipt, onSaved: _saved, onCancel: _cancel, onDock: _ondock, seed: _seed, resume: _resume, ...rest } = req;
  return rest;
}

const forName = (name: string): string => (name ? ` for ${name}` : "");

/** The chip's line under its title: "Jonathan Marsh · step 2 of 5 · nothing lost". */
export function parkedLine(p: Pick<ParkedJourney, "name" | "step" | "of">): string {
  return [p.name || null, `step ${Math.min(p.step + 1, p.of)} of ${p.of}`, "nothing lost"].filter(Boolean).join(" · ");
}

/** ✕ on the chip asks first (the mock's words): "Discard send the full for Jonathan Marsh?" */
export function discardAsk(p: Pick<ParkedJourney, "title" | "name">): string {
  return `Discard ${p.title.toLowerCase()}${forName(p.name)}?`;
}

/** The clash (§6.5): the parked journey's sentence, then the choice. */
export function clashAsk(p: Pick<ParkedJourney, "title" | "name">, next: { doing: string; name: string }): { head: string; sub: string } {
  return {
    head: `${p.title}${forName(p.name)} is half done.`,
    sub: `Finish it first, or put it away and start ${next.doing}${forName(next.name)}.`,
  };
}

/* ── the reload (§6.4): sessionStorage, this tab only ─────────────────────────────────────── */

const MODES: readonly DrawerMode[] = ["log", "resp", "sent", "nudge", "close", "offer", "edit"];

interface Stored {
  v: 1;
  mode: DrawerMode;
  queryId?: string; agentId?: string; manuscriptId?: string; packageId?: string; entryId?: string;
  preset?: DrawerPreset;
  again?: Omit<LogAgain, "sent"> & { sent: string };
  step: number; seen: number[]; of: number;
  answers: unknown;
  title: string; doing: string; name: string;
}

/** What a reload keeps — `{ mode, queryId, agentId, manuscriptId, step, answers }` and the chip's words. */
export function toStored(p: ParkedJourney): string {
  const r = p.req;
  const s: Stored = {
    v: 1, mode: r.mode,
    ...(r.queryId ? { queryId: r.queryId } : {}), ...(r.agentId ? { agentId: r.agentId } : {}),
    ...(r.manuscriptId ? { manuscriptId: r.manuscriptId } : {}), ...(r.packageId ? { packageId: r.packageId } : {}),
    ...(r.entryId ? { entryId: r.entryId } : {}), ...(r.preset ? { preset: r.preset } : {}),
    ...(r.again ? { again: { ...r.again, sent: r.again.sent.toISOString() } } : {}),
    step: p.step, seen: p.seen, of: p.of, answers: p.answers ?? null, title: p.title, doing: p.doing, name: p.name,
  };
  return JSON.stringify(s);
}

/** Back from storage — or null for anything that is not a parked journey this build wrote. */
export function fromStored(raw: string | null | undefined): ParkedJourney | null {
  if (!raw) return null;
  let s: Partial<Stored>;
  try { s = JSON.parse(raw) as Partial<Stored>; } catch { return null; }
  if (!s || s.v !== 1 || !MODES.includes(s.mode as DrawerMode)) return null;
  if (typeof s.step !== "number" || typeof s.of !== "number" || typeof s.title !== "string") return null;
  const again = s.again ? { ...s.again, sent: new Date(s.again.sent) } : undefined;
  if (again && isNaN(again.sent.getTime())) return null;
  const req: OpenRequest = {
    mode: s.mode as DrawerMode,
    ...(s.queryId ? { queryId: s.queryId } : {}), ...(s.agentId ? { agentId: s.agentId } : {}),
    ...(s.manuscriptId ? { manuscriptId: s.manuscriptId } : {}), ...(s.packageId ? { packageId: s.packageId } : {}),
    ...(s.entryId ? { entryId: s.entryId } : {}), ...(s.preset ? { preset: s.preset } : {}),
    ...(again ? { again } : {}),
  };
  return {
    req, step: s.step, seen: Array.isArray(s.seen) ? s.seen.filter((x) => typeof x === "number") : [s.step], of: s.of,
    answers: s.answers ?? null, title: s.title, doing: typeof s.doing === "string" ? s.doing : "", name: typeof s.name === "string" ? s.name : "",
    live: false,
  };
}
