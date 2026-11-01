/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PublicRoot — the whole of the landing-only build (queryhawk.net). Split v1, phase 4.
 *
 * `main.tsx` imports this INSTEAD of App when `VITE_LANDING_ONLY` is "true", so a production bundle
 * holds the public pages, the founding sign-up and nothing from the workspace. It does what App did
 * on its landing-only branch, and only that:
 *  - `ErrorBoundary`, as App wraps everything in it;
 *  - `BrandProvider`, because its injected rules set the heading and body faces every public page
 *    reads (the marketing sheets restate them where they must win);
 *  - `BrowserRouter`, for `Navigate`, `useLocation` and the pages' own links;
 *  - the path and hash, and the hash clear: a sign-in hash is removed from the address bar, exactly
 *    as App did (`replaceState` fires no hashchange, so one is dispatched);
 *  - `onNavigate` as `navigate(pathFor(...))`. App's four interceptions (log a query, add an agent,
 *    record a response, add a manuscript) open workspace overlays, which this build does not have,
 *    and no public page calls them.
 *
 * Left out, deliberately: `DbProvider` (the public site reads no account; its auth listener drew
 * nothing on a landing-only page), and `ToastProvider` (its container was an empty 0px box here).
 *
 * ⚠️ `App.tsx`'s own LANDING_ONLY branch STAYS. It is what a test, or anything else that renders App
 * with the flag on, still gets; this file is how the production bundle avoids importing App at all.
 */
import React, { useEffect } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { BrandProvider } from "../lib/brand";
import { AUTH_HASH } from "../lib/siteMode";
import { pathFor } from "../lib/pathFor";
import { useHash } from "../lib/useHash";
import { LandingOnlySite } from "./LandingOnlySite";
import "./public.css";

const PublicContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const hash = useHash();
  useEffect(() => {
    if (!AUTH_HASH.test(hash)) return;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [hash]);
  const onNavigate = (tab: string, subPageName?: string) => navigate(pathFor(tab, subPageName));
  return <LandingOnlySite path={path} hash={hash} onNavigate={onNavigate} />;
};

export default function PublicRoot() {
  return (
    <ErrorBoundary>
      <BrandProvider>
        <BrowserRouter>
          <PublicContent />
        </BrowserRouter>
      </BrandProvider>
    </ErrorBoundary>
  );
}
