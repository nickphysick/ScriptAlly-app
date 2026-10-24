/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2.2 — the page before any version is saved (design-refs/versions-v2-2, S34–S36; the mock's `.ev` and `.ev2`).
 *
 * "No versions yet" in a hairline container: one line (it names the queries already out, if any), then a preview of the
 * list in the real list's four columns, where the Original row stands for the version the first save creates and the
 * dashed row opens that first save. Under it, the comparisons note and the shared EXAMPLE tiles.
 *
 * ⚠️ IT REPLACES THE THREE-STEP EMPTY STATE, whose step 1 ("Save the manuscript as it stands") contradicted the Original
 *    model: the first save makes Original for you, and the writer's first version is a change to it.
 * ⚠️ "5" IS MIN_SENT_FOR_RATE, the one threshold every rate on the page reads.
 */
import React from "react";
import type { Manuscript } from "../../types";
import { MIN_SENT_FOR_RATE } from "../../lib/versionsV2";
import { commas } from "./v2Bits";
import { ExampleTiles } from "./V2Warming";

export const V2Empty: React.FC<{ ms: Manuscript; out: number; disabled: boolean; onFirst: () => void }> = ({ ms, out, disabled, onFirst }) => (
  <>
    <section className="cx-sec first is-fresh ev" aria-labelledby="msVH0" data-vv2="empty">
      <div className="ev-hd">
        <h2 id="msVH0">No versions yet</h2>
        <p id="evSub" data-vv2="ev-sub">{out
          ? <>You’ve already sent <b>{out} {out === 1 ? "query" : "queries"}</b>. When you save your first version, we’ll count {out === 1 ? "it" : "them"} towards your Original. If any went out differently, it’s easy to change.</>
          : "Your list will start with two: your original manuscript, and your first change to it."}</p>
      </div>
      <div className="ev-list">
        <div className="ev-h"><span>Version</span><span>What changed</span><span className="r">Words</span><span className="r">Queries sent</span></div>
        <div className="ev-r orig" data-vv2="ev-orig">
          <span className="ev-id">
            <span className="ev-n"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 5.5c3-1 6-1 9 1v13c-3-2-6-2-9-1z M21 5.5c-3-1-6-1-9 1v13c3-2 6-2 9-1z" strokeLinejoin="round" /></svg></span>
            <span><b>Original</b><small>Created for you when you save</small></span>
          </span>
          <span className="ev-ch">Your manuscript as you first sent it. Every other version traces back here.</span>
          <span className="ev-w">{ms.wordCount > 0 ? commas(ms.wordCount) : "—"}<small>from manuscript</small></span>
          <span className="ev-q" data-vv2="ev-q">{out ? <><b>{out}</b><small>already out · they’ll count here</small></> : <em>None yet</em>}</span>
        </div>
        <button type="button" className="ev-r add" data-vv2="first" disabled={disabled} onClick={onFirst}>
          <span className="ev-id"><span className="ev-n p">+</span><span><b>Your first version</b><small>Starts from Original</small></span></span>
          <span className="ev-ch"><span className="ev-pill">e.g. Cut the prologue</span><span className="ev-pill">Opens on the ferry at dawn</span></span>
          <span className="ev-cta">+ Save your first version</span>
        </button>
      </div>
      <p className="ev-foot">A version is the same story told a different way. A new book is a new manuscript.</p>
    </section>
    <section className="cx-sec is-fresh ev2" aria-labelledby="evTH" data-vv2="compare-note">
      <div className="ev2-hd">
        <span className="ev2-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" strokeLinecap="round" /></svg></span>
        <div>
          <p className="oh-k">Tracking &amp; performance</p>
          <h2 id="evTH">Your versions, compared, right here</h2>
          <p>Once two versions have each gone out with {MIN_SENT_FOR_RATE} queries, this page shows which one gets agents asking for more.</p>
        </div>
      </div>
      <ExampleTiles />
    </section>
  </>
);
