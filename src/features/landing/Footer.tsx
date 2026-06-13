/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";

interface FooterProps {
  onFeatures: () => void;
  onPricing: () => void;
  onSignIn: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onFeatures, onPricing, onSignIn }) => (
  <footer className="footer">
    <div className="footer-in">
      <div className="footer-logo">
        <span className="mark">S</span>
        <b>ScriptAlly</b>
        <span>· The Literary Querying Companion</span>
      </div>
      <div className="footer-links">
        <button type="button" onClick={onFeatures}>Features</button>
        <button type="button" onClick={onPricing}>Pricing</button>
        <button type="button" onClick={onSignIn}>Sign in</button>
      </div>
      <div style={{ color: "rgba(245,240,234,0.4)" }}>© {new Date().getFullYear()}</div>
    </div>
  </footer>
);
