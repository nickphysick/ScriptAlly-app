/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 — A DEV-ONLY REVIEW AID (the `__SA_LH_COUNT` precedent). Its call sites in AgentList test
 * `import.meta.env.MODE !== "production"` first, so a production build folds every read to nothing.
 *
 *   window.__SA_CLP_STATE = "loading" | "error" | "day1"   the list's frame draws that state over the real page
 *   window.__SA_CLP_FIG   = { n, q, y }                     the headline's figures (the header only; nothing else reads it)
 *
 * The CLP12 / CLP2 locks set them with an init script, so the page renders each state without breaking the network.
 */
import type { HeaderFigures } from "./contactV26";

export type ClpForced = "loading" | "error" | "day1";
type W = { __SA_CLP_STATE?: unknown; __SA_CLP_FIG?: unknown };

export function readClpState(): ClpForced | null {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as W).__SA_CLP_STATE;
  return v === "loading" || v === "error" || v === "day1" ? v : null;
}
export function readClpFigures(): HeaderFigures | null {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as W).__SA_CLP_FIG as Partial<HeaderFigures> | undefined;
  return v && typeof v.n === "number" && typeof v.q === "number" && typeof v.y === "number" ? { n: v.n, q: v.q, y: v.y } : null;
}
