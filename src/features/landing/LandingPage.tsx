/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public landing page (the logged-out front door). Self-contained: the only thing it
 * touches outside this folder is the URL hash, which App.tsx watches to swap in the
 * existing Auth screen. It imports no app/auth internals.
 *
 *   Start free → #/signup   (existing Auth, sign-up state)
 *   Sign in    → #/signin   (existing Auth, sign-in state)
 *
 * In-page nav links smooth-scroll within the page and deliberately do NOT change the
 * hash, so the auth deep-links stay the only hash the app reacts to.
 */
import React from "react";
import "./landing.css";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Showcase } from "./Showcase";
import { GoodCompany } from "./GoodCompany";
import { FounderNote } from "./FounderNote";
import { ClosingCTA } from "./ClosingCTA";
import { Footer } from "./Footer";

const goSignUp = () => {
  window.location.hash = "#/signup";
};
const goSignIn = () => {
  window.location.hash = "#/signin";
};
const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

export const LandingPage: React.FC = () => {
  const onFeatures = () => scrollToId("sa-showcase");
  const onPricing = () => scrollToId("sa-closing");

  return (
    <div className="sa-landing">
      <Nav onStart={goSignUp} onSignIn={goSignIn} onFeatures={onFeatures} onPricing={onPricing} />
      <Hero onStart={goSignUp} onHowItWorks={onFeatures} />
      <Showcase />
      <GoodCompany />
      <FounderNote />
      <ClosingCTA onStart={goSignUp} />
      <Footer onFeatures={onFeatures} onPricing={onPricing} onSignIn={goSignIn} />
    </div>
  );
};
