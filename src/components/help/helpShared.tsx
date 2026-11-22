/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — what the home and an article share: dates, the two body marks, what the account has done, the
 * status key drawn by StatusDot, and "ask us" (`askNick`; the name stays).
 * Non-workspace v1, Phase 7 — `checkedDate` (an article's meta line) and `RAIL_KEY` (the home's six statuses).
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { GLOSSARY } from "../../lib/glossary";
import { GUIDE_PAGES, type GuideCounts } from "../../lib/pageChecklist";
import { EMPTY_DRAFT, openFeedback, setFeedbackDraft } from "../../lib/feedbackStore";
import { MONTHS_SHORT } from "../../lib/dates";
import { guidesOf, parseRuns, showDrafts, type HelpArticle } from "../../content/help/model";

declare const __QH_BUILD_DATE__: string | undefined;
export const BUILD = typeof __QH_BUILD_DATE__ !== "undefined" ? __QH_BUILD_DATE__ : undefined;
export const DRAFTS = showDrafts(import.meta.env.MODE);

/** "2026-10-19" → "19 Oct 2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}
/** "2026-10-20" → "20 October 2026" (an article's "Checked" date, design-refs/help-centre-v1) */
export function checkedDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** A body string's two marks: **bold** and `ui` chips. */
export function Runs({ text }: { text: string }) {
  return (
    <>
      {parseRuns(text).map((r, i) =>
        r.t === "b" ? <b key={i}>{r.v}</b> : r.t === "ui" ? <span key={i} className="hc-ui">{r.v}</span> : <React.Fragment key={i}>{r.v}</React.Fragment>,
      )}
    </>
  );
}

/* ── what the account has done ── */

export function useGuideFacts() {
  const db = useScriptAllyDb();
  const user = db.currentUser;
  const counts: GuideCounts = { agents: db.agents?.length ?? 0, queries: db.queries?.length ?? 0 };
  /** a guide item done by a real save or by what is on file (skips do not count here) */
  const itemDone = (page: string, key: string) => !!GUIDE_PAGES.find((g) => g.page === page)?.done(user, counts)[key];
  const articleDone = (a: HelpArticle) => guidesOf(a).some((g) => itemDone(g.page, g.key));
  return { db, user, counts, itemDone, articleDone };
}

/* ── the status key: every status the app shows, drawn by StatusDot ── */

const KEY_GLOSS: Record<string, string> = {
  queried: "sent, waiting",
  partialRequested: "they asked",
  fullRequested: "they asked",
  reviseResubmit: "new version wanted",
  resubmitted: "new version sent",
  signed: "offer accepted",
  closed: "passed, no reply, or withdrawn",
};
export const STATUS_KEY = Object.values(GLOSSARY).filter((e) => e.status);

/** The Help centre home's key (design-refs/help-centre-v1): six statuses, and the ref's three glosses. */
export const RAIL_KEY: readonly { id: string; gloss: string | null }[] = [
  { id: "queried", gloss: "sent, waiting" },
  { id: "partialRequested", gloss: "they asked" },
  { id: "partialSent", gloss: null },
  { id: "fullRequested", gloss: "they asked" },
  { id: "fullSent", gloss: null },
  { id: "closed", gloss: null },
];

/** The key, drawn by StatusDot. With no `rows`, every status the app shows; the home passes `RAIL_KEY`. */
export function StatusKeyList({ rows }: { rows?: readonly { id: string; gloss: string | null }[] }) {
  const list = rows
    ? rows.map((r) => ({ e: STATUS_KEY.find((x) => x.id === r.id)!, gloss: r.gloss })).filter((r) => !!r.e)
    : STATUS_KEY.map((e) => ({ e, gloss: KEY_GLOSS[e.id] ?? null }));
  return (
    <ul className="hc-key" data-hc="key">
      {list.map(({ e, gloss }) => (
        <li key={e.id}>
          <StatusDot status={e.status!} overrideSize={16} decorative />
          <span>{e.title}</span>
          {gloss ? <small>{gloss}</small> : null}
        </li>
      ))}
    </ul>
  );
}

/* ── ask us (askNick): the feedback panel, "Something's confusing", the words already typed ── */
export function askNick(message: string) {
  setFeedbackDraft({ ...EMPTY_DRAFT, kind: "Something's confusing", message });
  openFeedback();
}

