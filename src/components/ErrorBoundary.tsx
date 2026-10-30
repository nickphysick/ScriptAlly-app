/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Top-level error boundary: a render error anywhere in the tree shows a recoverable fallback
 * instead of a blank white screen. It's a passthrough in normal operation (only React render
 * errors trigger it), so wrapping the app with it cannot break the working app. (Previously
 * blocked on the missing React types — class components couldn't type-check.)
 *
 * Phone last screens v1 (30 Oct; board row 3, 3B): the fallback is full-screen shell ink at every
 * width — the one deliberate desktop change in that pack — with the illustration spot (placeholder),
 * "Something went wrong." in the typewriter face, Reload (blush), Go to Home (outlined) and
 * "Tell us what happened".
 *
 * ⚠️ THE FEEDBACK PANEL CANNOT OPEN FROM HERE. This boundary wraps the whole app, so when it shows,
 * the shell (which mounts the one feedback panel and subscribes to `openFeedback`) is gone. The link
 * goes to `/contact` instead, as a full page load.
 *
 * A class component, so no hooks: Go to Home pushes `/dashboard` into history, tells the router (it
 * listens for `popstate`), and resets the boundary.
 */
import { Component, type ReactNode } from "react";
import "./errorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export const ERROR_TITLE = "Something went wrong.";
export const ERROR_TEXT = "This page hit an error. Your queries and notes are safe. Reloading usually fixes it.";
export const ERROR_FEEDBACK_HREF = "/contact";

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Log only the message (no PII), consistent with handleFirestoreError.
    console.error("UI error boundary caught:", error instanceof Error ? error.message : String(error));
  }

  private handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  private handleHome = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", "/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="eb-page" role="alert" data-eb="page">
        <div className="eb-in">
          <span className="eb-ph" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 4 3-3 4 5" /><circle cx="16" cy="8" r="2" /></svg>
          </span>
          <h1 className="eb-h">{ERROR_TITLE}</h1>
          <p className="eb-p">{ERROR_TEXT}</p>
          <button type="button" className="eb-btn eb-btn--reload" onClick={this.handleReload} data-eb="reload">Reload</button>
          <button type="button" className="eb-btn eb-btn--home" onClick={this.handleHome} data-eb="home">Go to Home</button>
          <a className="eb-tell" href={ERROR_FEEDBACK_HREF} data-eb="tell">Tell us what happened</a>
        </div>
      </div>
    );
  }
}

/** Dev-only: `#/throw-lab` renders this inside the boundary so the fallback can be measured (PLS1 L3). */
export function ThrowLab(): ReactNode {
  /* Reads the hash at render, so Go to Home (which clears it) can recover. */
  if (typeof window !== "undefined" && window.location.hash.startsWith("#/throw-lab")) throw new Error("throw-lab: a forced render error");
  return null;
}
