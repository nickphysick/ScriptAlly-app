/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32 §B: the striped band — one sent letter whose comps were never chosen (`noticeOf`, the one with
 * the most queries), built as the Dashboard's Founding writer band: white rim, blush stripes, a disc, a white pill
 * (the ref's `.hband`, `.hdisc`, `.hpill`). Its pill opens the picker on that letter.
 */
import React from "react";
import type { Notice } from "../../../lib/compsShelf";
import { Ic32 } from "./marks32";

export const CompsBand32: React.FC<{ notice: Notice; onChoose: (letterId: string) => void }> = ({ notice, onChoose }) => (
  <div className="cp32-band" data-cp="notice" data-letter={notice.letterId} role="note">
    <div className="cp32-band-in">
      <span className="cp32-bdisc" aria-hidden="true"><Ic32 n="mail" /></span>
      <b data-cp="notice-letter">{notice.name}</b>
      <i aria-hidden="true" />
      <p data-cp="notice-line">You sent {notice.queries} {notice.queries === 1 ? "query" : "queries"} with this letter. Which comps did it mention?</p>
      <button type="button" className="cp32-pill" data-cp="notice-log" data-cx-key="notice-log" onClick={() => onChoose(notice.letterId)}>
        <Ic32 n="pen" size={15} />Choose its comps
      </button>
    </div>
  </div>
);
