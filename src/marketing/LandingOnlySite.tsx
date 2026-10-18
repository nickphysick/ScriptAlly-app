/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The public site, and the landing-only site built on it.
 *
 * `MarketingPage` is the ONE switch from a public path to its page. Both the whole app's public tier
 * and the landing-only site render through it, so a new public page cannot be added to one and
 * missed by the other.
 *
 * `landingDecision` is the whole of the landing-only rule, kept pure so it is locked without a DOM:
 * a public path with no sign-in hash renders; anything else goes to `/`.
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { AUTH_HASH } from "../lib/siteMode";
import { MARKETING_PATHS } from "./routeTiers";
import { MarketingShell } from "./MarketingShell";
import { MarketingNavUser } from "./marketingNav";
import { Landing } from "./Landing";
import { PricingPage } from "./PricingPage";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";
import { FoundersPage } from "./FoundersPage";
import { LegalPage } from "./LegalPage";

type Navigate = (tab: string, subPageName?: string) => void;

export const MarketingPage: React.FC<{ path: string; onNavigate: Navigate }> = ({ path, onNavigate }) =>
  path === "/pricing" ? <PricingPage onNavigate={onNavigate} />
  : path === "/about" ? <AboutPage onNavigate={onNavigate} />
  : path === "/contact" ? <ContactPage onNavigate={onNavigate} />
  : path === "/founders" ? <FoundersPage onNavigate={onNavigate} />
  : path === "/terms" ? <LegalPage doc="terms" onNavigate={onNavigate} />
  : path === "/privacy" ? <LegalPage doc="privacy" onNavigate={onNavigate} />
  : <Landing onNavigate={onNavigate} />;

/**
 * "page": render this public path. "home": go to `/`.
 * A workspace path, an unknown path and any sign-in hash all go home: nothing the app holds
 * behind sign-in is offered, not even the sign-in screen.
 */
export const landingDecision = (path: string, hash: string): "page" | "home" =>
  MARKETING_PATHS.has(path) && !AUTH_HASH.test(hash) ? "page" : "home";

/**
 * The landing-only site. App renders this INSTEAD of everything else, ahead of the auth check, so a
 * visitor never sees a sign-in screen, the boot splash or the workspace, not even for a frame.
 *
 * `user` is always null here. A stale signed-in session in someone's browser still sees the public
 * site as a stranger does, with no "Open dashboard". Nobody is signed out; the app is simply not
 * rendered.
 */
export const LandingOnlySite: React.FC<{ path: string; hash: string; onNavigate: Navigate }> = ({ path, hash, onNavigate }) => {
  const anon: MarketingNavUser | null = null;
  if (landingDecision(path, hash) === "home" && path !== "/") return <Navigate to="/" replace />;
  /* On `/` with a sign-in hash the page renders, and App clears the hash in an effect. A second
     redirect to the same place would loop, because history.replaceState fires no hashchange. */
  return (
    <MarketingShell user={anon} onNavigate={onNavigate} path={MARKETING_PATHS.has(path) ? path : "/"}>
      <MarketingPage path={MARKETING_PATHS.has(path) ? path : "/"} onNavigate={onNavigate} />
    </MarketingShell>
  );
};
