/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Top-level error boundary: a render error anywhere in the tree shows a recoverable fallback
 * instead of a blank white screen. It's a passthrough in normal operation (only React render
 * errors trigger it), so wrapping the app with it cannot break the working app. (Previously
 * blocked on the missing React types — class components couldn't type-check.)
 */
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

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

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F0EA",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#3a1c14", marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "rgba(58,28,20,0.7)", marginBottom: 20, lineHeight: 1.5 }}>
            The page hit an unexpected error. Your data is safe — reloading usually fixes it.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "#7c3a2a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
