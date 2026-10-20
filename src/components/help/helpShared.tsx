/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — what the home and an article share: dates, the two body marks, what the account has done, the
 * status key drawn by StatusDot, and "ask Nick".
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
/** "2026-10-19" → "19 OCT" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1].toUpperCase()}`;
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

export function StatusKeyList() {
  return (
    <ul className="hc-key" data-hc="key">
      {STATUS_KEY.map((e) => (
        <li key={e.id}>
          <StatusDot status={e.status!} overrideSize={16} decorative />
          <span>{e.title}</span>
          {KEY_GLOSS[e.id] ? <small>{KEY_GLOSS[e.id]}</small> : null}
        </li>
      ))}
    </ul>
  );
}

/* ── ask Nick: the feedback panel, "Something's confusing", the words already typed ── */
export function askNick(message: string) {
  setFeedbackDraft({ ...EMPTY_DRAFT, kind: "Something's confusing", message });
  openFeedback();
}

