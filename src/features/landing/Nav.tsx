/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Floating pill nav for the landing page. Condenses (shadow/opacity) on scroll.
 */
import React, { useEffect, useState } from "react";

interface NavProps {
  onStart: () => void;
  onSignIn: () => void;
  onFeatures: () => void;
  onPricing: () => void;
}

export const Nav: React.FC<NavProps> = ({ onStart, onSignIn, onFeatures, onPricing }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-logo">
        <span className="mark">S</span> Script<em>Ally</em>
      </div>
      <div className="nav-links">
        <button type="button" onClick={onFeatures}>Features</button>
        <button type="button" onClick={onPricing}>Pricing</button>
        <button type="button" onClick={onSignIn}>Sign in</button>
      </div>
      <button type="button" className="nav-cta" onClick={onStart}>Start free</button>
    </nav>
  );
};
