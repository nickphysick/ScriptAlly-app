/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles — the single editing home for a manuscript's comps, promoted to its own
 * sub-page under Manuscripts (route /manuscripts/comps; reached from the rail and from each
 * plate's MANAGE → link). Reference: design-refs/manuscripts-page-v2.html (the "view-comps" panel).
 *
 * Move-and-recompose, not rewrite: the panel (pitch block + shelf grid + suggestions) is the v1
 * comps panel lifted wholesale — CompShelf and SuggestionsSection are unchanged, and the add/remove
 * writes go through the same updateManuscript path (a first write on a legacy-string doc converts
 * it to the structured array). The active manuscript is the shared scriptally_active_manuscript_id
 * key, so navigating in from a plate lands on the right book.
 */
import React, { useState, useEffect } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { CompTitle } from "../../types";
import { Plus } from "lucide-react";
import { ChromeSlab } from "../shell/ChromeSlab";
import { CompShelf } from "./CompShelf";
import { SuggestionsSection } from "./SuggestionsSection";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { manuscriptComps, withCompAdded, withCompRemoved } from "../../lib/comps";
import { isProUser } from "../../lib/suggestComps";
import "./manuscripts.css";

/** Shared with the overview + the Package Builder — the section's single active-manuscript pointer. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

interface ComparableTitlesPageProps {
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}

export const ComparableTitlesPage: React.FC<ComparableTitlesPageProps> = ({ onNavigate }) => {
  const { currentUser, manuscripts, updateManuscript } = useScriptAllyDb();

  const [selectedMsId, setSelectedMsId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_MS_KEY)
  );

  // Active books first, shelved sink to the end — the same spine ordering the overview uses.
  const ordered = [...manuscripts].sort(
    (a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b))
  );

  // Keep the selection valid: fall back to the first spine when the stored id is gone.
  useEffect(() => {
    if (ordered.length === 0) {
      if (selectedMsId !== null) setSelectedMsId(null);
      return;
    }
    if (!selectedMsId || !ordered.some((m) => m.id === selectedMsId)) {
      setSelectedMsId(ordered[0].id);
    }
  }, [manuscripts]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setSelectedMsId(id);
    localStorage.setItem(ACTIVE_MS_KEY, id);
  };

  const activeMs = selectedMsId ? manuscripts.find((m) => m.id === selectedMsId) : null;
  const msComps = activeMs ? manuscriptComps(activeMs) : [];

  // Comp writes — the ONLY comp-editing path (byte-identical to the v1 overview handlers).
  const addComp = async (c: CompTitle) => {
    if (!activeMs) return;
    await updateManuscript(activeMs.id, { comps: withCompAdded(msComps, c) });
  };
  const removeComp = async (index: number) => {
    if (!activeMs) return;
    await updateManuscript(activeMs.id, { comps: withCompRemoved(msComps, index) });
  };

  return (
    <div className="msv1">
      <ChromeSlab
        onNavigate={onNavigate}
        title="Comparable titles"
        meta={
          activeMs
            ? `THE ‘X MEETS Y’ OF YOUR PITCH`
            : manuscripts.length === 0
              ? "NO MANUSCRIPTS YET"
              : ""
        }
        style={{ margin: "-18px -26px 18px" }}
        tools={
          <button
            type="button"
            className="msv-btn"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
          >
            <Plus />
            Add manuscript
          </button>
        }
      />
      <div className="msv-wrap">
        {/* spine switcher — comps page navigator; only when >1 manuscript */}
        {manuscripts.length > 1 && (
          <div className="msv-spines">
            {ordered.map((m) => {
              const sp = isShelvedPresentation(m);
              const n = manuscriptComps(m).length;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`msv-spine${m.id === selectedMsId ? " on" : ""}${sp ? " shelved" : ""}`}
                  onClick={() => selectMs(m.id)}
                >
                  <span className="msv-spine-t">{m.title}</span>
                  <span className="msv-spine-c">
                    {sp ? "SHELVED" : `${n} ${n === 1 ? "COMP" : "COMPS"}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!activeMs ? (
          <div className="msv-panel">
            <div className="msv-empty">
              <div className="msv-qm">No manuscript to compare yet.</div>
              <span className="msv-lab">ADD A MANUSCRIPT TO BUILD ITS COMP SHELF</span>
              <div>
                <button
                  type="button"
                  className="msv-btn"
                  onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
                >
                  <Plus />
                  Add manuscript
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="msv-panel">
            <div className="msv-band">
              <h3>Comparable titles — {activeMs.title}</h3>
              <span className="msv-lab">THE &lsquo;X MEETS Y&rsquo; OF YOUR PITCH</span>
            </div>
            <CompShelf
              comps={msComps}
              currentYear={new Date().getFullYear()}
              onAdd={addComp}
              onRemove={removeComp}
            />
            <SuggestionsSection
              msId={activeMs.id}
              manuscriptTitle={activeMs.title}
              ageCategory={activeMs.ageCategory}
              genre={activeMs.genre}
              logline={activeMs.logline || ""}
              shelfTitles={msComps.map((c) => c.title)}
              isPro={isProUser(currentUser)}
              currentYear={new Date().getFullYear()}
              onAddToShelf={addComp}
              onUpgrade={() => onNavigate?.("plans")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
