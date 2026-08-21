/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SetAsidePanel — "Set aside & tags", the board's one door to the two surfaces that went dark.
 *
 * ⚠️ IT EXISTS BECAUSE UNMOUNTING `TaskSettingsSheet` TOOK TWO FEATURES WITH IT. The sheet was the
 * only mount of `TagsSheet` and the only caller of `hiddenItems()`, so retiring it left tag
 * management and the set-aside ledger unreachable on main and on dev — a regression nobody had
 * audited, because the sheet was believed to hold nothing but preferences.
 *
 * ⚠️ ONE DOOR, TWO PANES, RATHER THAN TWO DOORS. Both panes answer the same shape of question —
 * "what have I put out of the way, and how do I get it back" — and the list's tool row already
 * carries two controls. A third and a fourth would make the row a menu bar.
 *
 * ⚠️ RESTORING IS BOARD WORK, WHICH IS WHY THIS IS NOT IN SETTINGS. It needs the item's name, its
 * return date and the context of the list it came from; nobody opens account settings to un-hide a
 * task. The rule mutes came back here with the other two kinds, so there is ONE place for hiding
 * again — splitting them across two surfaces was the "two places to change one thing" fault the
 * old sheet existed to prevent, wearing different clothes.
 *
 * ⚠️ AND IT COMPOSES `AnchoredPanel` RATHER THAN BEING A MODAL. That is the board's established
 * door: the filter menu, the sort menu and the snooze panel all use it, and its `panel` variant is
 * described in its own docblock as the settings surface. The retired alternative —
 * `.cal-dayscrim`/`.cal-daypanel` — has had no CSS since the day modal was removed, so three live
 * modals elsewhere render unstyled today; following that pattern would have made a fourth.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { hiddenItems, HiddenItem } from "../../lib/taskSettings";
import TagsPane from "./TagsSheet";
import "./setAside.css";

type Pane = "aside" | "tags";

/**
 * ⚠️ THE EMPTY STATE IS A REVERSAL, AND IT IS DELIBERATE. The old ledger was a door that HID at
 * zero — "an empty ledger offers no door to open" was locked as a rule. It is inverted here: a
 * door that only appears once you have already set something aside is unfindable at the moment you
 * need it, because the writer looking for it has just hidden something and does not yet know the
 * surface exists. It is always reachable and says plainly when it holds nothing.
 */
export const SET_ASIDE_EMPTY =
  "Nothing set aside. When you snooze or dismiss something, it waits here until you bring it back.";

/** The reassurance the whole surface exists to give — kept verbatim from the retired sheet. */
export const SET_ASIDE_FOOT = "Nothing here is deleted — only set aside.";

export const SetAsidePanel: React.FC = () => {
  const { currentUser, updateUserProfile, upsertTaskFlag, taskFlags, agents, queries } = useScriptAllyDb();
  const [pane, setPane] = useState<Pane>("aside");

  const muted = currentUser?.mutedTaskRules;
  const hidden = hiddenItems(muted, taskFlags, agents, queries, Date.now());

  /**
   * ⚠️ THE RESTORE PATH IS THE RETIRED SHEET'S, UNCHANGED — a rule leaves `mutedTaskRules`, a flag
   * has its `snoozedUntil` unset. No novel write: restoring is the exact inverse of the hiding,
   * and inventing a second way to undo would be a second way to disagree about what hidden means.
   */
  const restore = (item: HiddenItem) => {
    const r = item.restore;
    if ("rule" in r) {
      void updateUserProfile({ mutedTaskRules: (muted ?? []).filter((k) => k !== r.rule) });
    } else {
      void upsertTaskFlag(r.flag, { snoozedUntil: null });
    }
  };

  return (
    <div className="sap">
      <div className="sap-tabs" role="tablist" aria-label="Set aside and tags">
        <button
          type="button" role="tab" id="sap-tab-aside"
          aria-selected={pane === "aside"} aria-controls="sap-pane-aside"
          className={pane === "aside" ? "sap-tab on" : "sap-tab"}
          onClick={() => setPane("aside")}
        >
          Set aside{hidden.length > 0 && <span className="sap-count">{hidden.length}</span>}
        </button>
        <button
          type="button" role="tab" id="sap-tab-tags"
          aria-selected={pane === "tags"} aria-controls="sap-pane-tags"
          className={pane === "tags" ? "sap-tab on" : "sap-tab"}
          onClick={() => setPane("tags")}
        >
          Tags
        </button>
      </div>

      {pane === "aside" ? (
        <div id="sap-pane-aside" role="tabpanel" aria-labelledby="sap-tab-aside" className="sap-body">
          {hidden.length === 0 ? (
            <p className="sap-empty">{SET_ASIDE_EMPTY}</p>
          ) : (
            <>
              {/* ⚠️ ONE ROW GRAMMAR FOR ALL THREE KINDS, because `hiddenItems` already returns one.
                  Its `meta` carries the right words per kind — "MUTED AS A RULE" / "DISMISSED" /
                  "SNOOZED UNTIL 24 Jul" — so the no-date case states what it is instead of showing
                  a date it has not got. `mutedTaskRules` is a bare string[] and records no time;
                  printing one would be a plausible number stating something untrue. */}
              <ul className="sap-list">
                {hidden.map((h) => (
                  <li key={h.id} className={`sap-row sap-row--${h.kind}`}>
                    <span className="sap-rowmain">
                      <span className="sap-label">{h.label}</span>
                      <span className="sap-meta">{h.meta}</span>
                    </span>
                    <button type="button" className="sap-restore" onClick={() => restore(h)}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
              <p className="sap-foot">{SET_ASIDE_FOOT}</p>
            </>
          )}
        </div>
      ) : (
        <div id="sap-pane-tags" role="tabpanel" aria-labelledby="sap-tab-tags" className="sap-body">
          <TagsPane />
        </div>
      )}
    </div>
  );
};

export default SetAsidePanel;
