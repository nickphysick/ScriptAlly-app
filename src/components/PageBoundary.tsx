/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PageBoundary — one page, or one panel, fails on its own (crash reporting v1, Phase 1).
 *
 * The top-level `ErrorBoundary` in App.tsx stays as the last resort. This one sits around each page
 * slot (inside `StagePage`) and around each drawer or dock mounted outside the pages, so a render
 * error shows a fallback in that page's area while the sidebar, the top bar and every other page
 * keep working.
 *
 * ⚠️ PAGES STAY MOUNTED (StagePage toggles `display`), so a crashed page does not go away when the
 * writer leaves it. Two things reset it, and both remount the contents under a new key:
 *  - "Try again";
 *  - leaving the page (`active` going false) or the slot switching route (`name` changing). The
 *    reset happens on the way OUT, so coming back finds a fresh page rather than the old fallback.
 *
 * ⚠️ THE DEV CRASH TRIGGER IS NAMED ONLY BEHIND `MODE !== "production"`, in `crashTrigger` below,
 * so a production build carries none of it (src/test/crashTriggerProd.test.ts). Do not name its
 * query parameter in this file: a licence docblock survives minification.
 *
 * The fallback reuses existing styles: `.sp-card` (primitives.css) for the card and the page
 * header's `.ph-primary` / `.ph-secondary` buttons (pageHeader.css). Layout only is inline.
 */
import React, { Component, Fragment, type ReactNode } from "react";
import { reportBoundaryError } from "../lib/errorReporting";
import { devCrashTrigger, type CrashTrigger } from "../lib/devCrashTrigger";
import { openFeedback } from "../lib/feedbackStore";
import "./notFound.css";

const crashTrigger: CrashTrigger | null = import.meta.env.MODE !== "production" ? devCrashTrigger : null;

/** The dev trigger's probe for a boundary name, or nothing in a production build. */
export function crashProbe(name: string): ReactNode {
  return crashTrigger ? crashTrigger.probe(name) : null;
}

/* Non-workspace v1, Phase 1 — the ref's words (getting-in-v1.html, screen 7). "We've been sent the details" is true
   where the build reports (a DSN on dev and prod, `sentryEnabled`). */
export const PAGE_FALLBACK = {
  heading: "This page hit a problem.",
  body: "The rest of QueryHawk is fine, and nothing you'd saved has been lost. We've been sent the details.",
  retry: "Try again",
  tell: "Tell us what you were doing",
  home: "Go to your Dashboard",
} as const;
export const PORT_ART = { src: "/images/hawk-portrait.webp", width: 160, height: 160 };

export const PANEL_FALLBACK = {
  line: "This panel hit a problem.",
  close: "Close",
  retry: "Try again",
} as const;

interface Props {
  /** The page or panel this boundary wraps; reported with every catch. */
  name: string;
  /** "page" fills the page's area; "panel" is a one-line card over the page. */
  kind?: "page" | "panel";
  /** A page slot's visibility. Leaving a crashed page resets it. */
  active?: boolean;
  /** A panel's own close, for the panel fallback's Close button. */
  onClose?: () => void;
  children?: ReactNode;
}

interface State {
  failed: boolean;
  /** Bumped by every reset; the contents are keyed on it, so a reset remounts them. */
  generation: number;
}

export class PageBoundary extends Component<Props, State> {
  state: State = { failed: false, generation: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info?: { componentStack?: string | null }) {
    reportBoundaryError(error, { boundary: this.props.name, componentStack: info?.componentStack ?? undefined });
  }

  componentDidUpdate(prev: Props) {
    if (!this.state.failed) return;
    const left = prev.active === true && this.props.active === false;
    if (left || prev.name !== this.props.name) this.reset(prev.name);
  }

  /** Clear the failure and remount the contents. */
  reset = (name: string = this.props.name) => {
    crashTrigger?.clear(name);
    this.setState((s) => ({ failed: false, generation: s.generation + 1 }));
  };

  private close = () => {
    this.reset();
    this.props.onClose?.();
  };

  /* A hard navigation: the boundary sits outside any router hook, and a crashed page is the moment to start clean. */
  private home = () => {
    if (typeof window !== "undefined") window.location.assign("/dashboard");
  };

  render() {
    const { name, kind = "page", children } = this.props;
    if (!this.state.failed) {
      return (
        <Fragment key={this.state.generation}>
          {crashProbe(name)}
          {children}
        </Fragment>
      );
    }
    if (kind === "panel") {
      return (
        <div
          className="sp-card"
          role="alert"
          data-boundary-fallback={name}
          style={{
            position: "fixed", right: 24, bottom: 24, zIndex: 95,
            display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 18px",
          }}
        >
          <span style={{ fontSize: 14 }}>{PANEL_FALLBACK.line}</span>
          <button type="button" className="ph-secondary" onClick={this.close}>{PANEL_FALLBACK.close}</button>
          <button type="button" className="ph-primary" onClick={() => this.reset()}>{PANEL_FALLBACK.retry}</button>
        </div>
      );
    }
    return (
      <div className="nf-wrap" data-boundary-fallback={name}>
        <div className="sp-card nf-card" role="alert">
          <img className="nf-art" src={PORT_ART.src} width={PORT_ART.width} height={PORT_ART.height} alt="" />
          <div>
            <h2 className="nf-h">{PAGE_FALLBACK.heading}</h2>
            <p className="nf-lede">{PAGE_FALLBACK.body}</p>
            <div className="nf-acts">
              <button type="button" className="ph-primary" onClick={() => this.reset()}>{PAGE_FALLBACK.retry}</button>
              <button type="button" className="ph-secondary" onClick={() => openFeedback()}>{PAGE_FALLBACK.tell}</button>
            </div>
            <ul className="nf-links">
              <li><button type="button" className="nf-lnk" onClick={this.home}>{PAGE_FALLBACK.home}</button></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
