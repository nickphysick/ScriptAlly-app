/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenActions — the quick actions card (stage 3, 17 Sep; rebuilt for v16, 18 Sep).
 *
 * Three tiles, each an illustration and a name, filling the card's height in equal thirds.
 *
 * ⚠️ NO SUB-TEXT AND NO BUTTON CHROME (the ref, and Nick). A tile is a picture and what it does. The
 * ref's own markup carries a sub-line and hides it; the words were "Request, pass, or R&R" — the kind
 * of explanation that is only read once and then read past for ever.
 *
 * ⚠️ EVERY TILE IS AN EXISTING FLOW, REACHED THE WAY THE SHELL REACHES IT — `invokeCapture`, the same
 * capture contracts the sidebar's New menu uses. The card is a second doorway, never a second door.
 *
 * ⚠️ TWO OF THE THREE PICTURES DO NOT EXIST YET, AND THE TILE SAYS SO RATHER THAN SHRINKING. A dashed
 * square of the same 46px, captioned with the file's subject, holds the space the artwork will take —
 * so the day it lands nothing in this card moves.
 */
import React from "react";
import { invokeCapture } from "../shell/railNav";
import { QUICK_ART, ART_PLACEHOLDER, artUrl } from "../../lib/dashArt";
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { OneScreenPanel } from "./OneScreenPanel";

export const OneScreenActions: React.FC<{
  loading: boolean;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ loading, onNavigate }) => (
  <OneScreenPanel variant="os-qa" probe="quick-actions" loading={loading} skel={["h", "", "", ""]}>
    <div className="os-hd">
      <h3 className="os-cardttl">Quick actions</h3>
    </div>
    <div className="os-qastack">
      {QUICK_ACTIONS.map((a) => {
        const art = QUICK_ART[a.art];
        return (
          <button
            key={a.key}
            type="button"
            className="os-qatile"
            data-action={a.key}
            onClick={() => invokeCapture(a.capture, onNavigate)}
          >
            {art
              ? (
                <img
                  className="os-qaart"
                  src={artUrl(art)}
                  width={art.width}
                  height={art.height}
                  alt=""
                  decoding="async"
                />
              )
              : (
                <span className="os-qaph" aria-hidden="true">{ART_PLACEHOLDER[a.art]}</span>
              )}
            <span className="os-qalab">{a.label}</span>
          </button>
        );
      })}
    </div>
  </OneScreenPanel>
);
