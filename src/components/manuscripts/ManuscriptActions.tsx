/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPT'S ⋯ — lifecycle, and the three fields with no inline editor ════════════════
 *
 * ⚠️ IT LEFT THE HERO AND IT DID NOT LEAVE THE PAGE. Amendment 2 retires the hero's action cluster
 * — Send a query and Query Centre go with it, and the rail's collapsed primary is the page's one
 * call to action now. This is the third member of that cluster and it could not go with them:
 * shelve, reactivate and the guarded delete have NO other surface, and since "Edit details" left
 * the plate, STATUS, SHELVED REASON and NOTES reach their form through here too. Dropping it to
 * match a mockup would be a functional regression wearing a design decision's clothes.
 *
 * ⚠️ AND IT COULD NOT GO IN THE MASTHEAD, WHICH IS WHERE THE BRIEF PUT THE OTHER RELOCATION.
 * `PageHeader variant="workspace"` THROWS when handed an action, a slot, a toolbar or an overflow
 * menu — a deliberate guard, with a reason in its own message: the masthead holds no actions,
 * because they belong in the page's control row, which is the element that anchors once the
 * masthead has gone. So it lives in the control row, where it pins with the slab.
 */
import React, { useState } from "react";
import { MoreHorizontal, Archive, Trash2, Pencil } from "lucide-react";

export interface ManuscriptActionsProps {
  shelved: boolean;
  onEditDetails: () => void;
  onShelveToggle: () => void;
  onDelete: () => void;
}

export const ManuscriptActions: React.FC<ManuscriptActionsProps> = ({
  shelved, onEditDetails, onShelveToggle, onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
            <div style={{ position: "relative" }}>
      <button
        type="button"
        className="msv-btn sm"
        title="More actions"
        aria-label="More actions"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        style={{ padding: "6.5px 9px" }}
      >
        <MoreHorizontal />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-[34px] z-40 bg-white border border-[#e8e0d8] rounded-[11px] shadow-[0_12px_30px_rgba(58,28,20,0.16)] p-1.5 min-w-[186px]">
            {/*
              ⚠️ "EDIT DETAILS" LIVES HERE NOW, and this is a deliberate deviation from
              "the button disappears". It disappears FROM THE PLATE, which is what the
              reframe was about — but three fields have no inline editor and no other
              surface on this page: STATUS, SHELVED REASON and NOTES. Deleting the form
              outright would strand them, which is a functional regression wearing a design
              decision's clothes. Status leaves this form when Phase 6's decision sheet
              lands; the other two need a home before the form can go.
            */}
            <button
              onClick={() => { setMenuOpen(false); onEditDetails(); }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              Edit details…
            </button>
            <div className="h-px bg-[#f0eae2] my-1 mx-1" />
            <button
              onClick={() => { setMenuOpen(false); onShelveToggle(); }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              {shelved ? "Reactivate" : "Shelve"}
            </button>
            <div className="h-px bg-[#f0eae2] my-1 mx-1" />
            <button
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#a8442f] hover:bg-[rgba(168,68,47,0.08)] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              Delete…
            </button>
          </div>
        </>
      )}
    </div>
  );
};
