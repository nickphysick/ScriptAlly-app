/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TagsSheet — tag management in its OWN sheet (board-optimise pack, Phase 5; ref
 * design-refs/board-optimised.html §3, the "Tags" frame).
 *
 * ⚠️ A SHEET OVER THE PAGE, NEVER A ROUTE. Managing your tags is a detour from the work, not a
 * destination: a route would take the board off screen, put an entry in history, and make the
 * back button the way out of a rename. It opens over Task settings, which opened over the page.
 *
 * ⚠️ WHY IT LEFT TASK SETTINGS. Rename/recolour/delete are a different KIND of work from "how
 * the desk behaves" — four fixed behaviours that never grow, beside a list that grows with the
 * writer. Inlined, the sheet was two sheets wearing one heading, and the tag rows pushed the
 * behaviours off the first screen the moment anyone had six tags.
 *
 * ⚠️ DELETE DETACHES, IT NEVER DELETES ITEMS: the id is removed from every task carrying it and
 * then the definition leaves the user doc. The notes and tasks survive whole — losing a note
 * because you retired a label would be the app punishing tidiness.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { lockStageScroll } from "../../lib/stageScroll";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { TAG_COLOURS, normaliseTagLabel, tagUsageCounts } from "../../lib/todoTags";
import { TagColour } from "../../types";

export const TagsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateUserProfile, updateUserTask, userTasks } = useScriptAllyDb();
  const rootRef = useRef<HTMLDivElement>(null);

  const tags = currentUser?.tags ?? [];
  const counts = tagUsageCounts(userTasks);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  /* the journey presentation the other sheets use: capture focus, lock the stage's scroll,
     return focus on close. */
  useLayoutEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    const release = lockStageScroll();
    rootRef.current?.focus();
    return () => { release(); invoker?.focus?.(); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="tdb-ff"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tdb-tags-heading"
      ref={rootRef}
      tabIndex={-1}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.classList.contains("tdb-ff") || t.classList.contains("tdb-ffstage")) onClose();
      }}
    >
      <div className="tdb-ffstage">
        <div className="tdb-ffwrap">
          <div className="tdb-ffsheet tdb-tset">
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
          <button type="button" className="tdb-ffx" aria-label="Back to Task settings" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagsSheet;
