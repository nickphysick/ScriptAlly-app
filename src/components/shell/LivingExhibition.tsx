/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE EXHIBITION (living headers §4): a labelled band showing what an empty page will look like once
 * it has something in it — the page's OWN components, fed a sample constant, fading out at the foot.
 *
 * ⚠️ IT MUST NEVER BE MISTAKEN FOR THE WRITER'S DATA, AND NEVER BE INTERACTED WITH. So the band is
 * `inert` (nothing inside is focusable, clickable or in the tab order), `aria-hidden`, and
 * `pointer-events: none`. What goes inside is the page's business, and the page's constant is the
 * only thing it may read — no fetch, no subscription, no store.
 */
import React from "react";
import "./livingExhibit.css";

export const LivingExhibition: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="lh-exw" data-lh="exhibition">
    <div className="lh-exl" aria-hidden="true">{label}</div>
    <div className="lh-exb" data-lh="band" aria-hidden="true" inert>
      {children}
    </div>
  </div>
);
