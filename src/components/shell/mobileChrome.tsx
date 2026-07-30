/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * mobileChrome — the shared seam between the shell's mobile chrome and the pages (Mobile Pass 1,
 * ref design-refs/mobile-concept-v1.html).
 *
 * Two things live here:
 *
 *   useIsMobile()        — the ONE JS breakpoint read, matching the CSS law (`md`, 768px, is the
 *                          single mobile/desktop divider). Pages use it only where CSS cannot
 *                          decide alone: which element anchors a popover, whether an editor
 *                          presents as a flip or a push. Node-safe (no matchMedia → false), so
 *                          the string-render specs exercise the desktop path.
 *
 *   MobileChromeContext  — how a PAGE flags a pushed detail screen (query detail, agent editor)
 *                          to the shell. Detail screens drop the tab bar and swap the top bar to
 *                          back/title (or Cancel/Done for an editor) — baked decision 5. Specs
 *                          are registered PER ROUTE KEY so a mounted-but-inactive page (StagePage
 *                          slots never unmount) can never hide another route's tab bar: the shell
 *                          only reads the spec registered under the ACTIVE route.
 *
 * Registration is state the page owns; the shell renders it. Nothing here navigates.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

/** The Tailwind `md` breakpoint — the pass's single divider. Keep in step with mobileShell.css. */
export const MOBILE_MEDIA_QUERY = "(max-width: 767.98px)";

/** True below `md`. Live (re-renders on resize/rotation); false wherever matchMedia is absent. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => setMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

/**
 * A pushed mobile detail screen, as the shell renders it:
 *  - "back":   ‹ {title} at the bar's left; everything else leaves the bar; tab bar hidden.
 *  - "editor": Cancel · {title} · Done — the agent editor's affordance (baked decision 5);
 *              tab bar hidden. Done/Cancel call the page's OWN handlers (the buffered-draft
 *              commit/discard) — the shell adds no semantics of its own.
 */
export type MobileDetailSpec =
  | { kind: "back"; title: string; onBack: () => void }
  | {
      kind: "editor";
      title: string;
      onCancel: () => void;
      onDone: () => void;
      doneLabel?: string;
    };

export interface MobileChromeValue {
  /** Register (or clear, with null) the active detail spec for a route key. */
  setMobileDetail: (routeKey: string, spec: MobileDetailSpec | null) => void;
}

/** Default is a no-op so pages render unchanged outside the shell (labs, string specs). */
export const MobileChromeContext = createContext<MobileChromeValue>({ setMobileDetail: () => {} });

export const useMobileChrome = () => useContext(MobileChromeContext);
