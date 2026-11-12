/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v155 (design-refs/query-centre-v155.html) — the list's states: one white panel that the quiet state
 * ("Nothing needs you today.") and day one ("No queries yet.") both draw, at the top of the list column.
 *
 * ⚠️ NO ILLUSTRATION AND NO FILLED BUTTON IN THE PANEL: the header's armchair hawk is the page's one illustration and its
 *    "+ Log a query" the page's one filled button. Day one's two doors are links in the sentence.
 * ⚠️ THE WORDS ARE lib/qc155's, so a test of the copy is a test of what renders.
 */
import React from "react";
import { FIRST_BODY_155, FIRST_HEAD_155, QUIET_HEAD_155 } from "../../../lib/qc155";
import { pathFor } from "../../../lib/pathFor";
import { TEMPLATE_HREF } from "../QueryEmptyCard";
import "./qcv155.css";

/** the shared panel: a heading and one paragraph */
export const Panel155: React.FC<{ kind: "quiet" | "first"; head: string; children: React.ReactNode }> = ({ kind, head, children }) => (
  <div className="qc155-panel" data-qc155="panel" data-kind={kind}>
    <h2 className="qc155-h">{head}</h2>
    <p className="qc155-p">{children}</p>
  </div>
);

/** §2 — no queries yet: the panel alone in the list. Smart import is the Import page (an SPA move, with the real path
 *  for a new tab); the template is the same download the import flow accepts back. */
export const FirstPanel155: React.FC<{ onImport: () => void }> = ({ onImport }) => (
  <Panel155 kind="first" head={FIRST_HEAD_155}>
    {FIRST_BODY_155.lead}
    <a href={pathFor("import")} data-qc155="import" onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onImport(); }}>{FIRST_BODY_155.importLink}</a>
    {FIRST_BODY_155.mid}
    <a href={TEMPLATE_HREF} download data-qc155="template">{FIRST_BODY_155.templateLink}</a>
    {FIRST_BODY_155.tail}
  </Panel155>
);

/** §1 — nothing needs you: the panel above the first group; the list carries on beneath it */
export const QuietPanel155: React.FC<{ body: string }> = ({ body }) => (
  <Panel155 kind="quiet" head={QUIET_HEAD_155}>{body}</Panel155>
);

/** §3 — loading: placeholders in the card grid's shape, two groups (2 cards, then 6). Hidden from screen readers; the
 *  list around it is `aria-busy`. No words and no spinner. */
const SK_GROUPS = [2, 6] as const;
export const Skeleton155: React.FC = () => (
  <div className="qc155-sk" data-qc155="skeleton" aria-hidden="true">
    {SK_GROUPS.map((n, g) => (
      <React.Fragment key={g}>
        <div className="qc155-skh" data-qc155="sk-head" />
        <div className="qc154-grid qc155-skg" data-qc155="sk-grid">
          {Array.from({ length: n }, (_, i) => <div key={i} className="qc155-skc" data-qc155="sk-card" />)}
        </div>
      </React.Fragment>
    ))}
  </div>
);
