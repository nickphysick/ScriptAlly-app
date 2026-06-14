/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Manuscript, ManuscriptVersion, SubmissionPackage, UserPlan } from "../types";
import {
  FileText,
  Activity,
  PlusSquare,
  ChevronRight,
  TrendingUp,
  Award,
  Notebook,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Trash2
} from "lucide-react";

export const Manuscripts: React.FC<{ searchQuery: string; onAddManuscript?: () => void }> = ({ searchQuery, onAddManuscript }) => {
  const {
    currentUser,
    manuscripts,
    versions,
    packages,
    deleteManuscript
  } = useScriptAllyDb();

  const [selMsId, setSelMsId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scriptally_active_manuscript_id");
    }
    return null;
  });
  // Select initial manuscript on mount
  useEffect(() => {
    const saved = localStorage.getItem("scriptally_active_manuscript_id");
    if (saved && manuscripts.some(m => m.id === saved)) {
      setSelMsId(saved);
    } else if (manuscripts.length > 0 && !selMsId) {
      setSelMsId(manuscripts[0].id);
      localStorage.setItem("scriptally_active_manuscript_id", manuscripts[0].id);
    }
  }, [manuscripts, selMsId]);

  if (!currentUser) return null;

  // Search filter
  const filteredManuscripts = manuscripts.filter(m => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;
    return (
      m.title.toLowerCase().includes(term) ||
      m.genre.toLowerCase().includes(term) ||
      m.logline.toLowerCase().includes(term)
    );
  });

  const activeMs = manuscripts.find(m => m.id === selMsId);

  // (Removed in the @types/react migration: handleCreateMs / handleCreateVer / handleCreatePkg —
  //  the dead/broken inline add-form submit handlers for the now-removed inline version/package UI.)

  return (
    <div className="min-h-screen bg-[#F5F0EA] pb-12 font-sans">
      <div className="w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: MANUSCRIPTS DIRECTORY SELECTOR (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#F8F5F0] rounded-2xl border border-[#7c3a2a]/10 p-4 shadow-sm flex flex-col space-y-4">
          
          <div className="flex justify-between items-center pb-2 border-b border-[#7c3a2a]/15">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#3a1c14]">Submission Packages & Drafts</h2>
              <p className="text-[10px] text-stone-500 font-mono uppercase">Compile drafts and submission packets</p>
            </div>

            <button
              onClick={() => onAddManuscript?.()}
              className="p-1 px-2.5 bg-[#7c3a2a] hover:bg-[#7c3a2a]/95 text-white text-[10px] uppercase font-bold rounded flex items-center gap-1 shadow-sm"
            >
              <PlusSquare className="w-3.5 h-3.5" />
              <span>New Manuscript</span>
            </button>
          </div>

          {/* List of Manuscripts */}
          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
            {filteredManuscripts.map((m) => {
              const isSelected = selMsId === m.id;
              const vCount = versions.filter(v => v.manuscriptId === m.id).length;
              const pCount = packages.filter(p => p.manuscriptId === m.id).length;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelMsId(m.id);
                    localStorage.setItem("scriptally_active_manuscript_id", m.id);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-white border-[#7c3a2a]/30 border-l-4 border-l-[#7c3a2a] shadow-sm"
                      : "bg-[#F8F5F0]/50 border-stone-100 hover:bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#7c3a2a]/5 text-[#7c3a2a] flex items-center justify-center shrink-0">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#3a1c14] truncate max-w-[150px] leading-snug">{m.title}</h4>
                        <p className="text-[10px] text-[#7c3a2a] font-medium leading-none mt-0.5">{m.genre}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-stone-400 font-semibold">
                      {m.wordCount.toLocaleString()} wds
                    </span>
                  </div>

                  <p className="text-[10px] leading-normal text-[#3a1c14]/75 mt-2 italic line-clamp-2">
                    "{m.logline || "No logline outlined yet."}"
                  </p>

                  <div className="mt-3.5 pt-2 border-t border-stone-50 flex gap-4 text-[9px] text-[#3a1c14]/65 font-medium">
                    <span>{vCount} Draft Versions</span>
                    <span>&bull;</span>
                    <span>{pCount} Custom Packets</span>
                  </div>
                </div>
              );
            })}

            {filteredManuscripts.length === 0 && (
              <p
                onClick={() => onAddManuscript?.()}
                className="text-center py-12 text-[#3a1c14]/40 hover:text-[#7c3a2a] cursor-pointer text-xs italic"
              >
                Archives empty. Click "New Manuscript" to build one!
              </p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: MANUSCRIPT DETAILED EDITING WORKSPACE (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#7c3a2a]/10 shadow-sm overflow-hidden flex flex-col justify-between p-6">
          
          {activeMs ? (
            /* ================= DETAILED MANUSCRIPT READOUT WORKSPACE ================= */
            <div className="space-y-6">
              
              {/* Brief profile cover banner */}
              <div className="pb-4 border-b border-stone-100 flex justify-between items-start">
                <div>
                  <span className="py-0.5 px-2 bg-[#7c3a2a]/5 text-[#7c3a2a] text-[9px] font-bold uppercase rounded border border-[#7c3a2a]/10">
                    Active Novel Profile
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-[#3a1c14] mt-2 leading-tight">
                    {activeMs.title}
                  </h2>
                  <p className="text-xs text-[#3a1c14]/65 leading-normal mt-1 italic">&ldquo;{activeMs.logline}&rdquo;</p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs text-[#7c3a2a] font-bold bg-[#7c3a2a]/5 py-1 px-2.5 rounded-lg border border-[#7c3a2a]/10">
                    {activeMs.wordCount.toLocaleString()} words
                  </span>
                  <span className="block text-[9px] text-stone-400 font-mono mt-1">GENRE: {activeMs.genre}</span>
                </div>
              </div>

              {/* Extended Synopsis Drawer block */}
              <div>
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest block mb-1">Synopsis Outline</span>
                <div className="p-4 bg-[#F8F5F0] border rounded-xl border-[#7c3a2a]/10 max-h-[150px] overflow-y-auto">
                  <p className="text-xs text-[#3a1c14]/80 whitespace-pre-wrap leading-relaxed font-light">
                    {activeMs.notes || "No extended profile synopsis formatted yet. Complete the synopsis content to track submittal readiness checklists."}
                  </p>
                </div>
              </div>

              {/* Inline draft-version + submission-package management removed (@types/react migration):
                  the add forms never functioned (wrong call signatures + schema-mismatched fields) and
                  their list displays only rendered fields those broken forms would have written. No
                  working path to manage versions/packages remains here — flagged, no replacement built. */}

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-stone-400 italic">
              <FolderOpen className="w-12 h-12 text-[#7c3a2a]/20 mx-auto mb-2" />
              Select a Novel profile from the manuscript base column on the left to organize draft versions and bespoke submission packets.
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
