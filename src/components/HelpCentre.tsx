/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 (design-refs/help-system-v1, the Help Centre and Article views, screens 13 and 14).
 *
 *   /help           search first ("/" focuses it), "People often ask", the writer's page guides as cards, the six
 *                   areas, and a rail: the Status key with the real rings, What's new, "Still stuck?".
 *   /help/{slug}    one article: the area's other articles on the left, "Show me in the app" where a guide item teaches
 *                   it, steps, a tip, "Did this help?", related articles on the right.
 *
 * Non-workspace v1, Phase 7 (design-refs/help-centre-v1.html, the Redesign view): the home and the article are rebuilt
 * from the ref (help/HelpHome, help/HelpArticlePage). PUBLISHED ARTICLES ONLY: a draft's slug, or one that names no
 * article, shows the not-found screen (`NotFoundCard`) where it used to go to /help. The page is the same component in
 * both shells — signed in inside AppShell (App renders HelpRoute), signed out inside MarketingShell (App's
 * `readableSignedOut` branch) — and reads `currentUser` to leave out what needs an account.
 *
 * ⚠️ RETIRED with this file: the FAQ topics, the cheat sheet, the burgundy pill tabs and the shortcuts button (the "?"
 *    in the bar opens the Help menu).
 * ⚠️ "SHOW ME" NEVER TICKS. It navigates and asks the page's guide to spotlight the item (`requestGuideStep`); only the
 *    writer's own action on that page marks it done.
 * ⚠️ brand.tsx names a family on bare h1/h2/h3 and span at runtime, so the faces here are stated with two classes and
 *    `!important` in helpCentre.css, the house claw-back.
 */
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./helpCentre.css";
import { helpSlugOf } from "../lib/helpPath";
import { pathFor } from "../lib/pathFor";
import { useScriptAllyDb } from "../lib/db";
import { articleBySlug } from "../content/help/articles";
import { HelpHome } from "./help/HelpHome";
import { ArticlePage } from "./help/HelpArticlePage";
import { NotFoundCard } from "./NotFoundCard";

/* ════════════════════════════ the route ════════════════════════════ */

export function HelpCentre(): React.ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useScriptAllyDb();
  const slug = helpSlugOf(pathname);
  if (slug) {
    const a = articleBySlug(slug);
    if (!a) {
      return currentUser
        ? <NotFoundCard onNavigate={(tab) => navigate(pathFor(tab))} />
        : <NotFoundCard onNavigate={(tab) => navigate(pathFor(tab))} publicShell onGoPath={(p) => navigate(p)} />;
    }
    return <ArticlePage a={a} />;
  }
  return <HelpHome />;
}
