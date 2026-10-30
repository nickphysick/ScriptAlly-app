/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part I — THE EVENT LOG: what the app records at each first-visit step, for the founder's desk
 * (a later pack). `events/{auto}`: { uid, name, at (server time), path, props }.
 *
 * ⚠️ CREATE-ONLY, BY THE SIGNED-IN OWNER, FOR THEIR OWN UID, AND NOBODY READS IT FROM THE CLIENT (firestore.rules). This
 *    file writes; nothing in the app reads, counts or excludes. That is the founder's desk's job.
 * ⚠️ A WRITE NEVER BLOCKS OR SLOWS THE UI: it is fire-and-forget, Firebase is loaded lazily, and a failed write is
 *    dropped (logged to the console in development only).
 * ⚠️ PROPS ARE NEVER FREE TEXT A WRITER TYPED: only the named keys below, each an enum or a count.
 * ⚠️ EACH EVENT IS RECORDED IN EXACTLY ONE PLACE — the caller named against it in `EVENTS`.
 */
import type { Manuscript, User } from "../types";
import { answerFor, dashPrefsOf, legacyStartOf, type StartPath } from "./dashFirstVisit";

/** Every event, and the one place that records it. */
export const EVENTS = {
  signed_up: "Onboarding.finishOnboarding — set-up finished (the account's sign-up)",
  dashboard_first_seen: "Dash58 — the first loaded dashboard (the tour's one-time decision)",
  path_changed: "Dash58.choose — the answer changed on the dashboard",
  tour_finished: "Dash58.endTour — Got it",
  tour_skipped: "Dash58.endTour — Skip or Escape",
  import_started: "ImportFlow — a fresh review opened",
  import_left: "ImportFlow — the page left while a review was open",
  import_resumed: "ImportFlow.resume — a kept review reopened",
  import_finished: "ImportFlow.handleImport — the import committed",
  first_agent: "db.addAgent — the writer had none before",
  first_query: "db.addQuery — the writer had none before (a logged query; an import records import_finished)",
  first_comp: "db.updateManuscript / updateManuscriptQuiet — the writer's first comparable title on any manuscript",
  first_letter: "db.addVersion — the writer's first query-letter version",
  reminder_answered: "Dash58 — the nudge-email ask answered",
  getting_started_step: "Dash58 — a Getting started row ticks while the dashboard is mounted",
  getting_started_done: "Dash58 — Close this list on the finish line",
  getting_started_hidden: "Dash58 — Hide on the Getting started sheet",
  example_opened: "Dash58 — the example dashboard opened",
  opened_app: "WorkspaceShell — the first app load of a calendar day (Europe/London)",
} as const;
export type EventName = keyof typeof EVENTS;
export const EVENT_NAMES = Object.keys(EVENTS) as EventName[];

export type EventPath = StartPath;
export interface EventProps {
  path?: EventPath;
  from?: EventPath;
  to?: EventPath;
  stop?: number;
  step?: string;
  agents?: number;
  queries?: number;
  answer?: "yes" | "not_now";
}

export interface EventDoc { uid: string; name: EventName; path: EventPath; props: EventProps }

/** The document the app writes, before the server stamps `at`. Props with no value are left out. */
export function buildEvent(uid: string, name: EventName, path: EventPath, props: EventProps = {}): EventDoc {
  const clean: EventProps = {};
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null) (clean as Record<string, unknown>)[k] = v;
  return { uid, name, path, props: clean };
}

/**
 * The writer's path for an event: the sign-up answer for the active manuscript (`answerFor`). ⚠️ "ready" when nothing
 * was ever said — the field is required, and "ready, not querying" is what an account with no answer and no query is.
 */
export function eventPath(user: Pick<User, "queryingStage" | "todoPrefs"> | null | undefined, ms: Pick<Manuscript, "id" | "status"> | null | undefined): EventPath {
  return answerFor({ stage: user?.queryingStage, status: ms?.status, legacy: legacyStartOf(dashPrefsOf(user ?? null), ms?.id ?? null) }) ?? "ready";
}

/** The active manuscript, as the sidebar keeps it (for callers outside the dashboard). */
export function activeManuscriptOf<M extends { id: string }>(manuscripts: readonly M[]): M | null {
  let id: string | null = null;
  try { id = typeof window === "undefined" ? null : window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* private mode */ }
  return manuscripts.find((m) => m.id === id) ?? manuscripts[0] ?? null;
}

/** Record an event. Never awaited, never throws. */
export function logEvent(uid: string | null | undefined, name: EventName, path: EventPath, props: EventProps = {}): void {
  if (!uid) return;
  const ev = buildEvent(uid, name, path, props);
  if (import.meta.env.MODE !== "production" && typeof window !== "undefined") {
    /* dev only: the page's own record of what it sent, for the locks (FV2 I1) — production never builds this */
    const w = window as unknown as { __saEvents?: EventDoc[] };
    (w.__saEvents ??= []).push(ev);
  }
  void (async () => {
    const [{ db }, fs] = await Promise.all([import("./firebase"), import("firebase/firestore")]);
    await fs.addDoc(fs.collection(db, "events"), { ...ev, at: fs.serverTimestamp() });
  })().catch((e) => { if (import.meta.env.MODE !== "production") console.error("[QueryHawk] event not recorded:", name, e); });
}
