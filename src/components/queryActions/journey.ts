/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What a journey hands the drawer's shell: its steps, each step's guard, the consequences of saving,
 * and the save itself. The shell owns everything else — which step shows, the stepper, the review,
 * the footer — so every journey steps, reviews and saves the same way.
 *
 * THE THREE LEVELS (brief §C): a BLOCK means the record would be wrong and stops Next on its step
 * and the save on the review; a CHECK is unusual but the writer's call and stops nothing; a
 * SUGGESTED step is a default the writer has not opened, and its dot stays hollow until they do.
 */
import type React from "react";
import type { PlanSpec } from "./controls";

export type GuardLevel = "block" | "check";
export interface Guard { level: GuardLevel; msg: string }

export interface JourneyStep {
  /** Stepper label, step heading and review row label. */
  title: string;
  /** The review row's value. */
  summary: string;
  guard?: Guard | null;
  /** The step draws its own warning note, so the shell adds no WORTH A LOOK. */
  ownWarn?: boolean;
  body: React.ReactNode;
  /** A plan drawn at the foot of the step; the review moves the last one below the answers. */
  plan?: PlanSpec;
}

export interface SaveLine { text: React.ReactNode; dot?: string }

export interface SaveOutcome {
  queryId: string | null;
  message: string;
  sub: string;
  /** The query ids whose documents the save touched — the undo snapshot's scope. */
  touched: string[];
  /** "Log another" (D1 only). */
  again?: () => void;
}

export interface JourneyView {
  eyebrow: string;
  title: string;
  /** Review verb: log · save · schedule · close · accept · decline. */
  verb: string;
  /** The same verb in the past: logged · saved · scheduled · closed · accepted · declined. */
  verbDone: string;
  /** The action button on the review. */
  button: string;
  /** False until the journey has enough to have steps (an agent chosen, a response picked). */
  ok: boolean;
  steps: JourneyStep[];
  /** The NEXT note shown under step 1 while `ok` is false. */
  preNote?: React.ReactNode;
  saves: SaveLine[];
  /** The agent card under the title. */
  who?: React.ReactNode;
  /** The writer has entered something — a scrim click shakes rather than closes. */
  dirty: boolean;
  /** Closing asks first ("Discard this query?") — Log a query once an agent is chosen. */
  guardDiscard?: boolean;
  /** Snapshot scope before the save, and the save. */
  touched: () => string[];
  commit: () => Promise<SaveOutcome>;
}

export type StepState = "cur" | "done" | "auto" | "chk" | "blk";
