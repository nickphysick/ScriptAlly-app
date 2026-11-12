/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 (design-refs/contact-list-v27/contact-list-v27.html) — THE HEADER: the Query Centre's open header
 * layout (`QcHeader1531`: straight on the page's ground, no card, three columns) with the Contact list's own content.
 *
 *   left    the binoculars bird, mirrored so it faces the title (a placeholder: `CL27_HEADER_ART`)
 *   middle  "{n} agents on file", the rule-flanked "you've queried {q}", then + Add an agent and Discover agents
 *   right   List health, exactly as v26 built it (`ContactHealth26`), on the light ground
 *
 * It renders the Query Centre's own classes (`qc1531-*`); the page root carries `.cl27`, which those rules name beside
 * `.qc151` (`:is(.qc151, .cl27)`, the same specificity), so the two headers cannot drift. contactV27.css holds only the
 * Contact list's differences (the 200px art column, the mirrored bird, List health on the light ground).
 *
 * Contact list principles v1: the title is `clHeadline`'s sentence ("5 need you. 19 not queried yet."), from the same
 * `stand` the rail's Where they stand tiles count; "{n} agents on file · you've queried {q}" sits beneath it.
 * ⚠️ The buttons keep every hook the v26 ones carried (`data-cl26`, `data-cl24`, `data-cl17`), and the add button's ref.
 *
 * Contact list principles v2: List health NUDGED IN — `healthNudge` (lib/contactPrinciples2) from the measured boxes,
 * written to the right column as `--clp2-nudge` (a transform, so the headline's column never changes). Measured on every
 * render, on the header's and the group's resize, and once the fonts are in. Written straight to the element, never to
 * state: a transform moves no layout, so the measurement cannot feed back into itself.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { healthNudge } from "../../../lib/contactPrinciples2";
import type { HeaderFigures } from "../../../lib/contactV26";
import { clHeadline } from "../../../lib/contactPrinciples";
import { ContactHealth26 } from "./ContactHealth26";
import "../../queries/centre/qcv1531.css";
import "./contactV27.css";
import "./contactPrinciples.css";

/** the header's drawing — the existing asset, mirrored in CSS (`.cl27-art img`), for now */
export const CL27_HEADER_ART = "/images/contact/discover-binoculars-bird.webp";

export const ContactHeader27: React.FC<{
  loading: boolean;
  figures: HeaderFigures | null;
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onDiscover?: () => void;
  onOpenHealth: () => void;
  onShowWho: () => void;
}> = ({ loading, figures: f, health, onAdd, addRef, onDiscover, onOpenHealth, onShowWho }) => {
  const h = f ? clHeadline(f) : null;
  const hdRef = useRef<HTMLElement>(null);
  const nudge = useCallback(() => {
    const hd = hdRef.current;
    const rc = hd?.querySelector<HTMLElement>("[data-cl27='health']");
    const block = rc?.querySelector<HTMLElement>("[data-cl26='health']");
    const main = hd?.querySelector<HTMLElement>("[data-cl27='main']");
    if (!hd || !rc || !block || !main) return;
    const applied = new DOMMatrixReadOnly(getComputedStyle(rc).transform === "none" ? undefined : getComputedStyle(rc).transform).m41;
    const b = block.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    /* the headline block's ink: each text node's line boxes, and each button's own box. ⚠️ Never one range over the
       whole block — a range's rects include the border box of every element it contains, and the title's spans the
       column, which reads as "the text reaches the column's edge". */
    let inkR = m.left;
    const rg = document.createRange();
    const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      if (!(t.textContent ?? "").trim()) continue;
      rg.selectNodeContents(t);
      for (const r of rg.getClientRects()) if (r.width > 0) inkR = Math.max(inkR, r.right);
    }
    for (const btn of main.querySelectorAll<HTMLElement>("button")) { const r = btn.getBoundingClientRect(); if (r.width > 0) inkR = Math.max(inkR, r.right); }
    const frame = hd.parentElement?.querySelector<HTMLElement>("[data-cl26='frame']");
    const fr = frame && frame.offsetHeight > 0 ? frame.getBoundingClientRect().right : null;
    const n = healthNudge({ blockL: b.left - applied, blockR: b.right - applied, frameR: fr, inkR, stacked: b.top >= m.bottom - 0.5 });
    rc.style.setProperty("--clp2-nudge", `${n}px`);
  }, []);
  useLayoutEffect(() => { nudge(); });
  useEffect(() => {
    const hd = hdRef.current;
    if (!hd || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => nudge());
    ro.observe(hd);
    if (hd.parentElement) ro.observe(hd.parentElement);
    let live = true;
    void document.fonts?.ready.then(() => { if (live) nudge(); });
    return () => { live = false; ro.disconnect(); };
  }, [nudge]);
  return (
  <header ref={hdRef} className="cl24-hd qc1531-hd cl27-hd" data-cl26="header" data-cl27="header" data-own-header=""
    data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <div className="qc1531-art cl27-art" data-cl27="art" aria-hidden="true">
      <img src={CL27_HEADER_ART} alt="" width={200} draggable={false} />
    </div>
    <div className="qc1531-main" data-cl27="main">
      {/* Contact list principles v1 — the title is a sentence from the writer's own numbers (`clHeadline`), the "need
          you" part in rust; the count moves underneath. Day one says so, with the line beneath in words. */}
      <h1 className="qc1531-t clp-t" data-page-title="true" data-cl26="title" data-cl27="title" data-clp="headline">
        {h ? <>{h.lead ? <><b>{h.lead}</b> </> : null}{h.rest}</> : " "}
      </h1>
      <p className="qc1531-for clp-for" data-cl27="for">
        <i aria-hidden="true" />
        {!f || !h ? <span aria-hidden="true">&nbsp;</span>
          : h.dayOne ? <span className="clp-under">{h.under}</span>
          : <span><b>{f.n}</b> {f.n === 1 ? "agent" : "agents"} on file · <em>you’ve queried</em> <b>{f.q}</b></span>}
        <i aria-hidden="true" />
      </p>
      <div className="qc1531-acts">
        <button type="button" ref={addRef} className="qc1531-b qc1531-b--n" data-cl26="add" data-cl24="add" data-cl17="add" data-cl27="add"
          disabled={loading} onClick={onAdd}>+ Add an agent</button>
        {onDiscover ? (
          <button type="button" className="qc1531-b qc1531-b--g" data-cl26="discover" data-cl24="discover" data-cl27="discover" onClick={onDiscover}>Discover agents</button>
        ) : null}
      </div>
    </div>
    <div className="qc1531-rc cl27-rc" data-cl27="health">
      <ContactHealth26 health={health} onOpenHealth={onOpenHealth} onShowWho={onShowWho} ground="light" />
    </div>
  </header>
  );
};
