/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The welcome page's two calls: trade the reference for the writer's number, and send the three
 * quick answers.
 *
 * ⚠️ JSON OR NOTHING. A route that isn't wired comes back as the SPA's own page, 200 text/html
 * (see waitlist.ts), so a response is only believed when it is JSON. Either failure leaves the page
 * in the same state without a number, never an error screen.
 */
import type { WelcomeData, AnswerKey } from "./welcomeCopy";

const TIMEOUT_MS = 8000;

const call = async (url: string, init?: RequestInit): Promise<Record<string, unknown> | null> => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    const body = await res.json().catch(() => null);
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
};

const posInt = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : undefined);

/** The writer's number and date for a reference, or null if it can't be had. */
export const fetchWelcome = async (ref: string): Promise<WelcomeData | null> => {
  const body = await call(`/api/waitlist/welcome?r=${encodeURIComponent(ref)}`);
  if (!body || body.ok !== true) return null;
  const confirmedOn = typeof body.confirmedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.confirmedOn) ? body.confirmedOn : undefined;
  return { foundingNumber: posInt(body.foundingNumber), reserveNumber: posInt(body.reserveNumber), confirmedOn };
};

/** Sends the three answers. True only when the server says it stored them. */
export const postAnswers = async (ref: string, answers: Record<AnswerKey, string>): Promise<boolean> => {
  const body = await call("/api/waitlist/welcome/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r: ref, ...answers }),
  });
  return body?.ok === true;
};
