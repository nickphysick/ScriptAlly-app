/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TagsPane — tag management, as a pane of the board's "Set aside & tags" panel.
 *
 * ⚠️ IT WAS A MODAL SHEET AND ITS ONLY DOOR WAS `TaskSettingsSheet`, which is retired. When that
 * sheet was unmounted, tag management went with it: you could still put a tag ON a task through
 * the ⋯ menu's picker, but you could no longer rename, recolour or delete a tag you had made.
 * That was unreachable on main and on dev until this pane restored it.
 *
 * ⚠️ STILL NOT A ROUTE. Managing your tags is a detour from the work, not a destination — a route
 * would take the board off screen, put an entry in history, and make the back button the way out
 * of a rename. It is a pane of a panel anchored to the list's own tool row.
 *
 * ⚠️ AND IT IS THE SAME CRUD, REHOUSED RATHER THAN REDESIGNED. Rename normalises and holds
 * uniqueness; recolour stays inside the family palette; delete DETACHES from every item first and
 * then drops the definition, behind an arm-then-confirm. Not one write path changed.
 *
 * ⚠️ DELETE DETACHES, IT NEVER DELETES ITEMS: the id is removed from every task carrying it and
 * then the definition leaves the user doc. The notes and tasks survive whole — losing a note
 * because you retired a label would be the app punishing tidiness.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { TAG_COLOURS, normaliseTagLabel, tagUsageCounts } from "../../lib/todoTags";
import { TagColour } from "../../types";

export const TagsPane: React.FC = () => {
  const { currentUser, updateUserProfile, updateUserTask, userTasks } = useScriptAllyDb();

  const tags = currentUser?.tags ?? [];
  const counts = tagUsageCounts(userTasks);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  /* ⚠️ NO SCROLL LOCK, NO FOCUS CAPTURE AND NO ESCAPE HANDLER HERE ANY MORE. This was a modal
     sheet and owned all three; it is a PANE inside `AnchoredPanel` now, and the panel owns them
     for every pane it holds. A pane keeping its own copy would be the second implementation the
     `useOverlay` extraction exists to prevent, and its Escape would race the panel's. */

  const renameTag = async (id: string) => {
    const label = normaliseTagLabel(renameDraft);
    // uniqueness is the model's rule, enforced at every entrance (todoTags) — restated, not invented
    if (!label || tags.some((t) => t.id !== id && t.label === label)) { setRenaming(null); return; }
    await updateUserProfile({ tags: tags.map((t) => (t.id === id ? { ...t, label } : t)) });
    setRenaming(null);
  };
  const recolourTag = async (id: string, colour: TagColour) => {
    await updateUserProfile({ tags: tags.map((t) => (t.id === id ? { ...t, colour } : t)) });
  };
  const deleteTag = async (id: string) => {
    setArmedDelete(null);
    // detach from every item FIRST, then drop the definition — the items survive whole
    for (const t of userTasks) {
      if (t.tags?.includes(id)) {
        const rest = t.tags.filter((x) => x !== id);
        await updateUserTask(t.id, { tags: rest.length ? rest : null });
      }
    }
    await updateUserProfile({ tags: tags.filter((t) => t.id !== id) });
  };

  return (
    <div className="tdb-tsetgroupwrap">
            <div className="tdb-fband paper">
              <div className="tdb-fbtx">
                <div className="tdb-ffstream off">TAGS</div>
                <div className="tdb-ffq tdb-fbh" id="tdb-tags-heading">Rename, recolour, retire.</div>
                <div className="tdb-fbsub">Deleting a tag detaches it from your notes and tasks — <b>it never deletes them</b>.</div>
              </div>
            </div>
            <div className="tdb-ffbody">
              <div className="tdb-tsetgroup">
                {tags.length === 0 ? (
                  <div className="tdb-tsetempty">
                    No tags yet — they are created where you tag: the composer, an item’s sheet, a card’s ⋯ menu,
                    or the ＋ New tag row in the sidebar.
                  </div>
                ) : (
                  tags.map((t) => (
                    <div key={t.id} className="tdb-tsetrow tdb-tsettag">
                      <span className="tdb-tsettagsw" style={{ background: TAG_PALETTE[t.colour].bg, borderColor: TAG_PALETTE[t.colour].tx }} aria-hidden />
                      {renaming === t.id ? (
                        <input
                          className="tdb-tsettagin"
                          value={renameDraft}
                          autoFocus
                          aria-label={`Rename #${t.label}`}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void renameTag(t.id);
                            if (e.key === "Escape") { e.stopPropagation(); setRenaming(null); }
                          }}
                          onBlur={() => void renameTag(t.id)}
                        />
                      ) : (
                        <button type="button" className="tdb-tsettagl" title="Rename" onClick={() => { setRenaming(t.id); setRenameDraft(t.label); }}>
                          #{t.label}
                        </button>
                      )}
                      <span className="tdb-tsettagct">{counts.get(t.id) ?? 0} {(counts.get(t.id) ?? 0) === 1 ? "item" : "items"}</span>
                      <span className="tdb-tsettagpal" role="group" aria-label={`Colour for #${t.label}`}>
                        {TAG_COLOURS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`tdb-tsettagc${t.colour === c ? " on" : ""}`}
                            style={{ background: TAG_PALETTE[c].bg, borderColor: TAG_PALETTE[c].tx }}
                            aria-label={c}
                            aria-pressed={t.colour === c}
                            onClick={() => void recolourTag(t.id, c)}
                          />
                        ))}
                      </span>
                      {armedDelete === t.id ? (
                        <button type="button" className="tdb-tsettagdel armed" onClick={() => void deleteTag(t.id)}>Sure?</button>
                      ) : (
                        <button type="button" className="tdb-tsettagdel" onClick={() => setArmedDelete(t.id)}>Delete</button>
                      )}
                    </div>
                  ))
                )}
                <div className="tdb-tsetfoot">
                  Colours come from the family palette — the same tones the board’s bands wear, so a tag never
                  introduces a colour the workspace does not already speak.
                </div>
              </div>
            </div>
    </div>
  );
};

export default TagsPane;
