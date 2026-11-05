/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part C (screen 01) — the header: a thin navy panel, as the Contact list's and Dashboard v2's.
 * On the left, "Your packages" in the typewriter with the Pro tag, over ONE serif line naming the active manuscript;
 * on the right, How it works and + New package. No art (the Archivist stands pinned bottom-right).
 * v42 Part B: the batch strip is retired (the stat tiles tag the current batch), so the panel always closes under its
 * subheader.
 */
import React from "react";
import { HEADER_TITLE, headerSub } from "../../../lib/packagesV41";

export const Pk41Header: React.FC<{ title: string | null; onNew: () => void; onHow: () => void }> = ({ title, onNew, onHow }) => {
  const sub = headerSub(title);
  return (
    <header className="p41-hd" data-pk26="header" data-pk41="header" data-own-header="">
      <div className="p41-hd-t">
        <h1 className="p41-ttl" data-page-title="true" data-pk41="title">{HEADER_TITLE} <em className="p41-pro" data-pk41="pro">Pro</em></h1>
        <p className="p41-sub" data-pk41="sub">{sub.lead}{sub.title ? <b>{sub.title}</b> : null}{sub.tail}</p>
      </div>
      <div className="p41-hd-a">
        <button type="button" className="p41-pb2" data-pk41="how" onClick={onHow}>How it works</button>
        <button type="button" className="p41-pb1" data-pk41="new" onClick={onNew}>+ New package</button>
      </div>
    </header>
  );
};
