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
  Bookmark,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Award,
  Notebook,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Trash2,
  Lock
} from "lucide-react";

export const Manuscripts: React.FC<{ searchQuery: string; onAddManuscript?: () => void }> = ({ searchQuery, onAddManuscript }) => {
  const {
    currentUser,
    manuscripts,
    versions,
    packages,
    addManuscript,
    addVersion,
    addPackage,
    deleteManuscript
  } = useScriptAllyDb();

  const [selMsId, setSelMsId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scriptally_active_manuscript_id");
    }
    return null;
  });
  const [showAddMsForm, setShowAddMsForm] = useState(false);
  const [showAddVerForm, setShowAddVerForm] = useState(false);
  const [showAddPkgForm, setShowAddPkgForm] = useState(false);

  // New manuscript field inputs
  const [msTitle, setMsTitle] = useState("");
  const [msGenre, setMsGenre] = useState("");
  const [msWordCount, setMsWordCount] = useState(85000);
  const [msLogline, setMsLogline] = useState("");
  const [msSynopsis, setMsSynopsis] = useState("");
  const [msError, setMsError] = useState("");

  // New draft version field inputs
  const [verName, setVerName] = useState("");
  const [verDoc, setVerDoc] = useState("");
  const [verNotes, setVerNotes] = useState("");
  const [verError, setVerError] = useState("");

  // New package field inputs
  const [pkgName, setPkgName] = useState("");
  const [pkgQuery, setPkgQuery] = useState("");
  const [pkgSynopsis, setPkgSynopsis] = useState("");
  const [pkgPages, setPkgPages] = useState("");
  const [pkgError, setPkgError] = useState("");

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

  // Get versions and packages scoped to this active manuscript
  const msVersions = activeMs ? versions.filter(v => v.manuscriptId === activeMs.id) : [];
  const msPackages = activeMs ? packages.filter(p => p.manuscriptId === activeMs.id) : [];

  // MS Submit handlers
  const handleCreateMs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle || !msGenre) {
      setMsError("Title and Genre are required fields.");
      return;
    }
    
    // Free Tier checks
    if (currentUser.plan === UserPlan.FREE && manuscripts.length >= 1) {
      setMsError("Free Tier limit reached: You can only configure 1 active manuscript at a time. Upgrade to Pro for unlimited files!");
      return;
    }

    const res = addManuscript({
      title: msTitle,
      genre: msGenre,
      wordCount: msWordCount,
      logline: msLogline,
      synopsisText: msSynopsis
    });

    if (res.success) {
      setShowAddMsForm(false);
      setMsTitle("");
      setMsGenre("");
      setMsWordCount(85000);
      setMsLogline("");
      setMsSynopsis("");
      setMsError("");
      if (res.manuscriptId) {
        setSelMsId(res.manuscriptId);
        localStorage.setItem("scriptally_active_manuscript_id", res.manuscriptId);
      }
    } else {
      setMsError(res.error || "Internal error saving manuscript.");
    }
  };

  const handleCreateVer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selMsId) return;
    if (!verName || !verDoc) {
      setVerError("Version name and document file label are required.");
      return;
    }

    const res = addVersion(selMsId, {
      versionName: verName,
      documentPath: verDoc,
      changeNotes: verNotes
    });

    if (res.success) {
      setShowAddVerForm(false);
      setVerName("");
      setVerDoc("");
      setVerNotes("");
      setVerError("");
    } else {
      setVerError(res.error || "Internal error adding draft version.");
    }
  };

  const handleCreatePkg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selMsId) return;
    if (!pkgName) {
      setPkgError("Package title descriptor is required.");
      return;
    }

    // Free tier checks for bespoke packet submissions
    if (currentUser.plan === UserPlan.FREE && packages.length >= 1) {
      setPkgError("Free Tier gated: Custom submittal packages are limited. Upgrade to Pro for bespoke submission combinations!");
      return;
    }

    const res = addPackage(selMsId, {
      packageName: pkgName,
      queryLetterDetails: pkgQuery,
      synopsisDetails: pkgSynopsis,
      samplePagesDetails: pkgPages
    });

    if (res.success) {
      setShowAddPkgForm(false);
      setPkgName("");
      setPkgQuery("");
      setPkgSynopsis("");
      setPkgPages("");
      setPkgError("");
    } else {
      setPkgError(res.error || "Internal error saving sublist packages.");
    }
  };

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
              onClick={() => {
                if (onAddManuscript) {
                  onAddManuscript();
                } else {
                  setShowAddMsForm(true);
                  setMsError("");
                }
              }}
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
          
          {showAddMsForm ? (
            /* ================= CREATE MANUSCRIPT FORM ================= */
            <div className="space-y-6">
              <div className="border-b border-[#7c3a2a]/15 pb-2">
                <h3 className="font-serif text-xl font-bold text-[#3a1c14]">Configure New Novel Profile</h3>
                <p className="text-[10px] text-stone-500 font-mono uppercase">Setup target metrics and outline materials</p>
              </div>

              {msError && (
                <div className="p-3 bg-[#A32D2D]/10 text-[#A32D2D] text-xs font-semibold rounded flex items-start gap-2">
                  <Lock className="w-4.5 h-4.5 text-[#A32D2D] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{msError}</p>
                </div>
              )}

              <form onSubmit={handleCreateMs} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Novel Title</label>
                    <input
                      type="text"
                      value={msTitle}
                      onChange={(e) => setMsTitle(e.target.value)}
                      placeholder="e.g. The Clockwork Golem"
                      className="w-full text-xs p-2 bg-white rounded border border-[#7c3a2a]/15"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Cohesive Genre</label>
                    <input
                      type="text"
                      value={msGenre}
                      onChange={(e) => setMsGenre(e.target.value)}
                      placeholder="e.g. Steampunk Fantasy"
                      className="w-full text-xs p-2 bg-white rounded border border-[#7c3a2a]/15"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Target Word Count</label>
                    <input
                      type="number"
                      value={msWordCount}
                      onChange={(e) => setMsWordCount(parseInt(e.target.value))}
                      className="w-full text-xs p-2 bg-white rounded border border-[#7c3a2a]/15"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Catchy Logline</label>
                  <textarea
                    value={msLogline}
                    onChange={(e) => setMsLogline(e.target.value)}
                    placeholder="e.g. Standard 1-sentence sales pitch hook describing the conflict"
                    className="w-full text-xs p-2 bg-white rounded border border-[#7c3a2a]/15 min-h-[50px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Extended Synopsis Outline</label>
                  <textarea
                    value={msSynopsis}
                    onChange={(e) => setMsSynopsis(e.target.value)}
                    placeholder="Provide a 1-page condensed narrative synopsis to scope your submission package checklist tracker."
                    className="w-full text-xs p-2 bg-white rounded border border-[#7c3a2a]/15 min-h-[140px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#7c3a2a]/10">
                  <button
                    type="button"
                    onClick={() => setShowAddMsForm(false)}
                    className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-bold font-serif"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-[#7c3a2a] hover:bg-[#7c3a2a]/95 text-white rounded text-xs font-bold leading-none shadow"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            </div>
          ) : activeMs ? (
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
                    {activeMs.notes || activeMs.synopsisText || "No extended profile synopsis formatted yet. Complete the synopsis content to track submittal readiness checklists."}
                  </p>
                </div>
              </div>

              {/* TWO SECMENTS SECTORS: Draft Versions AND Custom Submission Packages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-start">
                
                {/* SECTOR 1: DRAFT SHIELDS DRESS DIRECTORY */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">Draft Versions</span>
                    <button
                      onClick={() => {
                        setShowAddVerForm(true);
                        setVerError("");
                      }}
                      className="p-1 px-2 text-[9px] bg-[#7c3a2a]/10 hover:bg-[#7c3a2a]/15 text-[#7c3a2a] uppercase font-bold rounded flex items-center gap-1 leading-none"
                    >
                      <PlusSquare className="w-3 h-3" />
                      <span>Log Draft</span>
                    </button>
                  </div>

                  {showAddVerForm ? (
                    <form onSubmit={handleCreateVer} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
                      <span className="block text-[9px] text-[#7c3a2a] font-bold uppercase">Log a New draft model</span>
                      {verError && <p className="text-[9px] text-[#A32D2D] italic">{verError}</p>}
                      
                      <input
                        type="text"
                        value={verName}
                        onChange={(e) => setVerName(e.target.value)}
                        placeholder="e.g. Final Polish (incorps beta feedback)"
                        className="w-full text-xs p-2 bg-white rounded border"
                      />
                      <input
                        type="text"
                        value={verDoc}
                        onChange={(e) => setVerDoc(e.target.value)}
                        placeholder="e.g. /Word_Drafts/Golem_Polish_v5.docx"
                        className="w-full text-xs p-2 bg-white rounded border"
                      />
                      <textarea
                        value={verNotes}
                        onChange={(e) => setVerNotes(e.target.value)}
                        placeholder="Notes: trimmed prologue, amplified gothic elements..."
                        className="w-full text-xs p-2 bg-white rounded border min-h-[40px]"
                      />
                      
                      <div className="flex justify-end gap-2 pt-1 border-t">
                        <button
                          type="button"
                          onClick={() => setShowAddVerForm(false)}
                          className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-[9px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2 py-1 bg-[#7c3a2a] text-white rounded text-[9px] font-bold"
                        >
                          Save Draft
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      {msVersions.map(v => (
                        <div key={v.id} className="p-2.5 bg-[#F8F5F0]/50 rounded-lg border border-[#7c3a2a]/5 text-xs">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#3a1c14]">{v.versionName}</span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              {new Date(v.dateCreated).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                          <span className="block text-[10px] text-[#7c3a2a] font-mono truncate mt-0.5">{v.documentPath}</span>
                          {v.changeNotes && (
                            <p className="text-[10px] text-stone-600 mt-1 pb-0.5 line-clamp-2 leading-relaxed">"{v.changeNotes}"</p>
                          )}
                        </div>
                      ))}

                      {msVersions.length === 0 && (
                        <p className="text-center py-6 text-stone-400 text-xs italic">No draft versions logged.</p>
                      )}
                    </div>
                  )}

                </div>

                {/* SECTOR 2: CUSTOM SUBMITTAL PACKAGES */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5 flex-wrap gap-2">
                    <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">Submission Pitch Packs</span>
                    <button
                      onClick={() => {
                        setShowAddPkgForm(true);
                        setPkgError("");
                      }}
                      className="p-1 px-2 text-[9px] bg-[#7c3a2a]/10 hover:bg-[#7c3a2a]/15 text-[#7c3a2a] uppercase font-bold rounded flex items-center gap-1 leading-none"
                    >
                      <PlusSquare className="w-3 h-3" />
                      <span>Log Package</span>
                    </button>
                  </div>

                  {showAddPkgForm ? (
                    <form onSubmit={handleCreatePkg} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
                      <span className="block text-[9px] text-[#7c3a2a] font-bold uppercase">Log a submittal packet combination</span>
                      {pkgError && <p className="text-[9px] text-[#A32D2D] italic">{pkgError}</p>}
                      
                      <input
                        type="text"
                        value={pkgName}
                        onChange={(e) => setPkgName(e.target.value)}
                        placeholder="e.g. Standard UK Query Pkg"
                        className="w-full text-xs p-2 bg-white rounded border"
                      />
                      <input
                        type="text"
                        value={pkgQuery}
                        onChange={(e) => setPkgQuery(e.target.value)}
                        placeholder="Query Letter file description / version code..."
                        className="w-full text-xs p-2 bg-white rounded border"
                      />
                      <input
                        type="text"
                        value={pkgSynopsis}
                        onChange={(e) => setPkgSynopsis(e.target.value)}
                        placeholder="Synopsis draft index (e.g. 1-page condensed v2)..."
                        className="w-full text-xs p-2 bg-white rounded border"
                      />
                      <input
                        type="text"
                        value={pkgPages}
                        onChange={(e) => setPkgPages(e.target.value)}
                        placeholder="First chapters length (e.g. First 3 chapters / 10K words)..."
                        className="w-full text-xs p-2 bg-white rounded border"
                      />

                      <div className="flex justify-end gap-2 pt-1 border-t">
                        <button
                          type="button"
                          onClick={() => setShowAddPkgForm(false)}
                          className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-[9px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2 py-1 bg-[#7c3a2a] text-white rounded text-[9px] font-bold"
                        >
                          Save Packet
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      {msPackages.map(p => (
                        <div key={p.id} className="p-2.5 bg-[#F8F5F0]/50 rounded-lg border border-[#7c3a2a]/5 text-xs space-y-1.5">
                          <div className="flex justify-between items-center text-[#3a1c14]">
                            <span className="font-bold text-xs">{p.packageName}</span>
                            <span className="text-[9px] bg-[#3B6D11]/15 text-[#3B6D11] px-1.5 rounded uppercase font-bold font-mono tracking-tight">{p.status}</span>
                          </div>
                          
                          <div className="text-[10px] text-stone-600 space-y-1 border-t border-stone-200/40 pt-1.5">
                            <div className="flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-[#7c3a2a]" />
                              <span>Query: <strong className="font-semibold">{p.queryLetterDetails || "Standard pitch letter v1"}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-[#7c3a2a]" />
                              <span>Synopsis: <strong className="font-semibold">{p.synopsisDetails || "Full 1-page narrative sync"}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-[#7c3a2a]" />
                              <span>Sample: <strong className="font-semibold">{p.samplePagesDetails || "First 3 chapters / 50 pages"}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {msPackages.length === 0 && (
                        <p className="text-center py-6 text-stone-400 text-xs italic">No pitch submittal packets defined yet.</p>
                      )}
                    </div>
                  )}

                </div>

              </div>
              
              {/* Soft warning guidelines */}
              <div className="flex items-center gap-2 bg-[#F8F5F0] p-3.5 border border-dashed rounded-xl border-[#7c3a2a]/25 text-[11px] leading-relaxed text-[#3a1c14]/80">
                <Bookmark className="w-5 h-5 text-[#7c3a2a] shrink-0" />
                <p>
                  Create comprehensive pitch packets custom-tailored to different agency manuscript wish lists. We'll track submissions and version changes automatically!
                </p>
              </div>

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
