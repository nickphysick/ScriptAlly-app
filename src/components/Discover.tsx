/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { pickableManuscripts } from "../lib/lifecycle";
import { CommunityAgent, Manuscript, Agent } from "../types";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Users,
  Check,
  Plus,
  Sparkles,
  Search,
  ExternalLink,
  BookOpen
} from "lucide-react";

interface DiscoverProps {
  onNavigate?: (tab: string, subPageName?: string) => void;
}

interface MatchBreakdown {
  mswlScore: number;
  genreScore: number;
  ageScore: number;
  wordCountScore: number;
  overlappingWords: string[];
  ageMatchedCategory: string;
  preferredWcRange: { min: number; max: number };
}

interface AgentMatch {
  agent: CommunityAgent;
  score: number;
  manuscript: Manuscript;
  breakdown: MatchBreakdown;
}

export const Discover: React.FC<DiscoverProps> = ({ onNavigate }) => {
  const {
    currentUser,
    agents,
    manuscripts,
    communityAgents,
    addAgent,
  } = useScriptAllyDb();

  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [radarToast, setRadarToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Matching algorithm
  const calculateCommunityAgentMatch = (commAgent: CommunityAgent, ms: Manuscript): MatchBreakdown => {
    const stopWords = new Set([
      'the', 'a', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'an', 'is', 'it', 'its', 'that', 
      'from', 'this', 'as', 'are', 'was', 'were', 'be', 'has', 'have', 'had', 'scouting', 'looking', 'seeks', 
      'seeking', 'wanting', 'wants', 'about', 'some', 'any', 'all', 'into', 'out', 'up', 'down', 'no', 'not', 'but',
      'which', 'who', 'whom', 'their', 'they', 'our', 'what', 'where', 'when', 'how', 'why', 'can', 'will', 'just',
      'drawn', 'particularly', 'interested'
    ]);

    const msLogline = ms.logline;
    const msComparable = ms.comparableTitles;

    const loglineVal = msLogline ? msLogline.trim() : "";
    const comparableVal = msComparable ? msComparable.trim() : "";

    let overlapping: string[] = [];

    const getTokens = (text: string): string[] => {
      if (!text) return [];
      const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const words = cleaned.split(/\s+/);
      const tokens: string[] = [];
      words.forEach(w => {
        const trimmed = w.trim().toLowerCase();
        if (trimmed.length > 2 && !stopWords.has(trimmed)) {
          tokens.push(trimmed);
        }
      });
      return tokens;
    };

    if (loglineVal || comparableVal) {
      const agentTokens = getTokens(commAgent.mswlNotes || "");
      const manuscriptTokens = getTokens(`${loglineVal} ${comparableVal}`);

      const msGenreLower = (ms.genre || "").trim().toLowerCase();
      if (msGenreLower === 'historical fantasy') {
        ['historical', 'fantasy', 'period', 'alternate', 'history'].forEach(token => manuscriptTokens.push(token));
      } else if (msGenreLower === 'literary fiction') {
        ['literary', 'fiction', 'voice', 'character'].forEach(token => manuscriptTokens.push(token));
      } else if (msGenreLower === 'fantasy') {
        ['fantasy', 'magic', 'world', 'building'].forEach(token => manuscriptTokens.push(token));
      } else if (msGenreLower === 'science fiction') {
        ['science', 'fiction', 'speculative', 'future'].forEach(token => manuscriptTokens.push(token));
      }

      const agentSet = new Set(agentTokens.map(t => t.toLowerCase().trim()));
      const msSet = new Set(manuscriptTokens.map(t => t.toLowerCase().trim()));

      const synonymMap: Record<string, string[]> = {
        'clockmaker': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'clockwork': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'mechanical': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'pocket': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'watch': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        '1880': ['victorian', 'british', 'historical', 'period'],
        'london': ['victorian', 'british', 'historical', 'period'],
        'apprentice': ['coming of age', 'debut', 'protagonist'],
        'discovers': ['coming of age', 'debut', 'protagonist'],
        'memories': ['atmospheric', 'literary', 'gothic'],
        'library': ['atmospheric', 'literary', 'gothic']
      };

      msSet.forEach(token => {
        if (agentSet.has(token)) {
          if (!overlapping.includes(token)) {
            overlapping.push(token);
          }
        }
        const syns = synonymMap[token];
        if (syns) {
          syns.forEach(syn => {
            if (agentSet.has(syn)) {
              if (!overlapping.includes(syn)) {
                overlapping.push(syn);
              }
            } else {
              const msNotesLower = (commAgent.mswlNotes || "").toLowerCase();
              if (msNotesLower.includes(syn.toLowerCase())) {
                if (!overlapping.includes(syn)) {
                  overlapping.push(syn);
                }
              }
            }
          });
        }
      });
    }

    const mswlScore = Math.min(overlapping.length * 8, 40);

    const msGenreRaw = (ms.genre || "").trim();
    const msGenreLower = msGenreRaw.toLowerCase();
    const genresClean = (commAgent.genres || []).map(g => g.trim().toLowerCase());
    
    let genreScore = 0;
    const msGenreComponents = msGenreRaw.split(/\s+/).filter(w => w.length > 0);
    const isCompound = msGenreComponents.length > 1;
    
    if (isCompound) {
      if (genresClean.includes(msGenreLower)) {
        genreScore = 20;
      } else {
        const matchingComponents = msGenreComponents.filter(c => {
          const cLower = c.toLowerCase();
          return genresClean.some(g => g === cLower || g.includes(cLower));
        });
        const matchCount = matchingComponents.length;
        if (matchCount >= 2) {
          genreScore = 15;
        } else if (matchCount === 1) {
          genreScore = 8;
        } else {
          genreScore = 0;
        }
      }
    } else {
      const hasExactMatch = genresClean.includes(msGenreLower);
      genreScore = hasExactMatch ? 20 : 0;
    }
    
    const isGenreMatch = genreScore > 0;

    const msAge = (ms.ageCategory || "").trim().toLowerCase();
    const isAgeMatch = genresClean.some(g => g === msAge);
    const ageScore = isAgeMatch ? 15 : 0;
    const matchedAgeCat = isAgeMatch ? ms.ageCategory : "";

    let wordCountScore = 0;
    let minWc = 80000;
    let maxWc = 100000;

    if (isGenreMatch) {
      const msAgeCategoryLower = (ms.ageCategory || "").toLowerCase();
      const msGenreLower = (ms.genre || "").toLowerCase();

      if (msAgeCategoryLower.includes("middle") || msAgeCategoryLower.includes("mg")) {
        minWc = 40000;
        maxWc = 65000;
        if (msGenreLower.includes("fantasy") || msGenreLower.includes("science") || msGenreLower.includes("sci-fi")) {
          minWc = 50000;
          maxWc = 80000;
        }
      } else if (msAgeCategoryLower.includes("young") || msAgeCategoryLower.includes("ya")) {
        minWc = 60000;
        maxWc = 85000;
        if (msGenreLower.includes("fantasy") || msGenreLower.includes("science") || msGenreLower.includes("sci-fi")) {
          minWc = 70000;
          maxWc = 95000;
        }
      } else {
        if (msGenreLower.includes("fantasy") || msGenreLower.includes("science") || msGenreLower.includes("sci-fi")) {
          minWc = 90000;
          maxWc = 120000;
        } else if (msGenreLower.includes("thriller") || msGenreLower.includes("mystery") || msGenreLower.includes("crime")) {
          minWc = 75000;
          maxWc = 95000;
        } else {
          minWc = 80000;
          maxWc = 100000;
        }
      }

      if (genresClean.includes("fantasy") || genresClean.includes("science fiction")) {
        maxWc += 5000;
      }
      if (genresClean.includes("literary fiction") || genresClean.includes("memoir")) {
        maxWc -= 2000;
        minWc -= 2000;
      }

      const wc = ms.wordCount || 0;
      if (wc >= minWc && wc <= maxWc) {
        wordCountScore = 15;
      }
    }

    return {
      mswlScore,
      genreScore,
      ageScore,
      wordCountScore,
      overlappingWords: overlapping,
      ageMatchedCategory: matchedAgeCat,
      preferredWcRange: { min: minWc, max: maxWc }
    };
  };

  // Shelved books aren't query targets, so the radar only matches against active manuscripts.
  const pickableMs = pickableManuscripts(manuscripts);
  const activeRadarManuscript = pickableMs.find(m => m.id === selectedManuscriptId) || pickableMs[0];

  const radarMatches: AgentMatch[] = (communityAgents || [])
    .filter(commAgent => {
      const alreadyHas = agents.some(userAgent => 
        userAgent.name.trim().toLowerCase() === commAgent.name.trim().toLowerCase() &&
        userAgent.agency.trim().toLowerCase() === commAgent.agency.trim().toLowerCase()
      );
      if (alreadyHas) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = commAgent.name.toLowerCase().includes(query);
        const matchesAgency = commAgent.agency?.toLowerCase().includes(query);
        const matchesGenres = (commAgent.genres || []).some(g => g.toLowerCase().includes(query));
        return matchesName || matchesAgency || matchesGenres;
      }

      return true;
    })
    .map(commAgent => {
      if (!activeRadarManuscript) {
        return {
          agent: commAgent,
          score: -1,
          manuscript: null as any,
          breakdown: {
            mswlScore: 0,
            genreScore: 0,
            ageScore: 0,
            wordCountScore: 0,
            overlappingWords: [],
            ageMatchedCategory: "",
            preferredWcRange: { min: 80000, max: 100000 }
          }
        };
      }
      const breakdown = calculateCommunityAgentMatch(commAgent, activeRadarManuscript);
      const score = breakdown.mswlScore + breakdown.genreScore + breakdown.ageScore + breakdown.wordCountScore;

      return {
        agent: commAgent,
        score: score,
        manuscript: activeRadarManuscript,
        breakdown: breakdown
      };
    })
    .filter(match => match.score >= 50 && match.manuscript !== null)
    .sort((a, b) => b.score - a.score);

  const handleOptInAgent = async (match: AgentMatch) => {
    try {
      const result = await addAgent({
        name: match.agent.name,
        agency: match.agent.agency,
        email: match.agent.email,
        website: match.agent.website,
        twitter: match.agent.twitter,
        bluesky: match.agent.bluesky,
        instagram: match.agent.instagram,
        genres: match.agent.genres,
        mswlNotes: match.agent.mswlNotes,
        starRating: match.agent.starRating,
        submissionStatus: match.agent.submissionStatus,
        responseTimeWeeks: match.agent.responseTimeWeeks,
        noResponseMeansNo: match.agent.noResponseMeansNo,
        submissionMethod: match.agent.submissionMethod,
        materialsWanted: match.agent.materialsWanted,
        notes: `Selected and imported as a top MSWL match from ScriptAlly Community Agents collection for manuscript: "${match.manuscript.title}".`
      });

      if (result.success) {
        try {
          await updateDoc(doc(db, "communityAgents", match.agent.id), {
            contributedByCount: increment(1)
          });
        } catch (countErr) {
          console.error("Failed to increment contributedByCount in Firestore:", countErr);
        }

        setRadarToast(`Successfully added "${match.agent.name}" to your agent list!`);
        setTimeout(() => setRadarToast(null), 4000);
      } else {
        alert(result.error || "Failed to add agent.");
      }
    } catch (error) {
      console.error("Error opting in community agent:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#F5F0EA] p-[20px] px-[24px]">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBDCD3]/60 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-[#FAF1EF] text-[#7c3a2a] rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-[#3a1c14] tracking-tight">
                Discover Community Agents
              </h1>
              <span className="bg-[#BA7517]/15 text-[#BA7517] border border-[#BA7517]/25 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase leading-none">
                Live Radar
              </span>
            </div>
            <p className="text-xs text-stone-600 font-light max-w-2xl">
              The Community Radar live-checks global literary agent wishlists at the database level against your active manuscript parameters. Filtered to only recommend agent profiles you have not already logged.
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a08070]" />
            <input
              type="text"
              placeholder="Search community agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#EBDCD3] rounded-xl text-xs text-[#3a1c14] placeholder-[#a08070]/60 outline-none focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 transition-all font-sans"
            />
          </div>
        </div>

        {/* Manuscript Selector Pill Row */}
        {manuscripts && manuscripts.length > 0 && (
          <div className="flex flex-col gap-2 bg-white border border-[#EBDCD3] rounded-2xl p-4 shadow-3xs">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#a08070]">
              Active Manuscript Scanning Anchor
            </span>
            <div className="flex flex-wrap gap-2">
              {pickableMs.map((ms) => {
                const isSelected = activeRadarManuscript?.id === ms.id;
                const displayTitle = ms.title.length > 35 ? ms.title.substring(0, 32) + "..." : ms.title;
                return (
                  <button
                    key={ms.id}
                    onClick={() => setSelectedManuscriptId(ms.id)}
                    style={{
                      backgroundColor: isSelected ? '#7c3a2a' : '#FFFDF9',
                      borderColor: isSelected ? 'transparent' : '#EBDCD3',
                      color: isSelected ? '#ffffff' : '#6a5045',
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border font-sans transition-all cursor-pointer shadow-3xs hover:opacity-95`}
                  >
                    {displayTitle} {isSelected && "⚡"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toast Feedback Banner */}
        <AnimatePresence>
          {radarToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-medium flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{radarToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of matches (Left Column, 2 spans) */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold px-1">
              Top Verified Matches for "{activeRadarManuscript?.title || "Manuscript"}"
            </h5>
            
            <div className="space-y-2.5">
              {radarMatches.length > 0 ? (
                radarMatches.map((match, index) => {
                  const isHovered = hoveredAgentId === match.agent.id || (!hoveredAgentId && index === 0);
                  return (
                    <div 
                      key={match.agent.id} 
                      className={`bg-white border rounded-2xl p-4 hover:border-[#7c3a2a]/40 transition-all cursor-pointer flex justify-between items-center shadow-3xs ${
                        isHovered ? "border-[#7c3a2a] ring-1 ring-[#7c3a2a]/10 bg-[#FAF1EF]/5" : "border-[#EBDCD3]/60"
                      }`}
                      onClick={() => setHoveredAgentId(match.agent.id)}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-[#FAF1EF] text-[#7c3a2a] rounded-xl flex items-center justify-center font-serif text-sm font-black shrink-0 shadow-3xs">
                          {match.agent.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#3a1c14]">{match.agent.name}</p>
                          <p className="text-xs text-stone-500">{match.agent.agency}</p>
                          <div className="flex gap-1.5 mt-1.5">
                            {(match.agent.genres || []).slice(0, 3).map((g, idx) => (
                              <span key={idx} className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                {g}
                              </span>
                            ))}
                            {(match.agent.genres || []).length > 3 && (
                              <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                +{(match.agent.genres || []).length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 shrink-0">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold block">
                          {match.score}% Match
                        </span>
                        <span className="text-[9px] text-stone-400 font-mono">MSWL Score</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white border border-dashed border-[#EBDCD3]/80 rounded-2xl p-12 text-center text-stone-500 max-w-full">
                  <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-medium">No community matches found</p>
                  <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                    {manuscripts.length === 0 
                      ? "Create a manuscript parameter set in Manuscripts page to active live MSWL scan matching." 
                      : "We couldn't scan details matching the search criteria or scoring above equal minimum 50% match requirement."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Match Details Spotlight Card (Right Column) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              {radarMatches.length > 0 ? (
                (() => {
                  const selectedMatch = radarMatches.find(m => m.agent.id === hoveredAgentId) || radarMatches[0];
                  return (
                    <div className="border border-[#BA7517]/25 bg-[#FAF6F0]/70 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[480px]">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#EBDCD3]/40 pb-3">
                          <span className="text-[10px] font-mono uppercase text-[#BA7517] tracking-wider font-bold">
                            Live Match Analysis
                          </span>
                          <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {selectedMatch.score}/100 PTS
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif font-black text-[#3a1c14] text-lg leading-tight">
                            {selectedMatch.agent.name}
                          </h4>
                          <p className="text-xs text-[#7c3a2a] font-mono font-semibold mt-0.5">
                            {selectedMatch.agent.agency}
                          </p>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="text-[11px] text-stone-600 space-y-1.5 bg-white border border-[#EBDCD3]/35 p-3 rounded-xl shadow-3xs">
                          <div className="flex justify-between items-center text-[9px] font-mono pb-1 border-b border-[#EBDCD3]/20 mb-1.5 font-bold text-stone-400">
                            <span>METRIC</span>
                            <span>SCORE ADJ</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Genre alignment</span>
                            <span className="font-mono text-stone-500 font-semibold text-right">
                              {selectedMatch.breakdown.genreScore > 0 ? `+20 pts (${selectedMatch.manuscript.genre})` : "+0 pts (mismatch)"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target age group</span>
                            <span className="font-mono text-stone-500 font-semibold text-right">
                              {selectedMatch.breakdown.ageScore > 0 ? `+15 pts (${selectedMatch.breakdown.ageMatchedCategory})` : "+0 pts"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Word count range check</span>
                            <span className="font-mono text-stone-500 font-semibold text-right">
                              {selectedMatch.breakdown.wordCountScore > 0 
                                ? `+15 pts (${selectedMatch.manuscript.wordCount?.toLocaleString()})` 
                                : `+0 pts (${selectedMatch.breakdown.preferredWcRange.min.toLocaleString()}-${selectedMatch.breakdown.preferredWcRange.max.toLocaleString()} range)`}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span>Keyword overlaps</span>
                            <span className="font-mono text-stone-500 font-semibold text-right max-w-[150px] truncate" title={selectedMatch.breakdown.overlappingWords.length > 0 ? selectedMatch.breakdown.overlappingWords.join(', ') : "None"}>
                              +{selectedMatch.breakdown.mswlScore} pts ({selectedMatch.breakdown.overlappingWords.length} tags)
                            </span>
                          </div>
                        </div>

                        {selectedMatch.agent.mswlNotes && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono uppercase text-stone-400 font-bold block">
                              Active Agent Wishlist Quote
                            </span>
                            <p className="text-xs text-stone-600 leading-relaxed italic bg-white p-3 rounded-xl border border-[#EBDCD3]/30 shadow-3xs">
                              "{selectedMatch.agent.mswlNotes}"
                            </p>
                          </div>
                        )}

                        {/* Meta Attributes */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md capitalize">
                            Source: {selectedMatch.agent.dataSource}
                          </span>
                          <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                            Verified: {new Date(selectedMatch.agent.lastVerifiedDate).toLocaleDateString()}
                          </span>
                          <span className="text-[9px] font-mono bg-[#BA7517]/10 text-[#BA7517] px-2 py-0.5 rounded-md">
                            Added by {selectedMatch.agent.contributedByCount} {selectedMatch.agent.contributedByCount === 1 ? 'user' : 'users'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#EBDCD3]/50 mt-4 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-stone-400 truncate max-w-[140px]">
                          Target: {selectedMatch.manuscript.title}
                        </span>
                        <button 
                          onClick={() => handleOptInAgent(selectedMatch)}
                          className="text-xs bg-[#7c3a2a] hover:bg-[#632e22] text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                          Add to My Agents
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="border border-stone-200 bg-stone-100/30 rounded-2xl p-6 flex items-center justify-center text-center text-xs text-stone-400 italic h-64 shadow-3xs">
                  Spotlight profile inactive. Select an agent card to inspect match breakdown details.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
