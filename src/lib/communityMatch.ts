/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * communityMatch — the single, shared community-agent ↔ manuscript scorer.
 *
 * The live home of the (now-removed) Discover engine — one engine, consumed by the manuscript-page
 * suggestion panel (ManuscriptAgentSuggestions). The score is out of 75, built from three signals —
 *   • MSWL keyword overlap  (0–40)  tokenised logline + comps against the agent's mswlNotes
 *   • genre alignment       (0–20)
 *   • age-category match     (0–15)
 *
 * Word count is deliberately NOT part of the match: we don't capture what length an agent wants, so
 * there is nothing to match a manuscript's word count against. (The genre/age word-count *placeholder*
 * on the manuscript form is a separate, unrelated concern — see genreWordCountRange() in manuscripts.ts.)
 *
 * `calculateCommunityAgentMatch` returns the full breakdown — including `overlappingWords`, the
 * matched MSWL tokens, so callers can highlight them. `scoreCommunityAgent` adds the total.
 */
import { CommunityAgent, Manuscript } from "../types";

/** The minimum total score (out of 75) for an agent to be surfaced as a suggestion. */
export const MATCH_THRESHOLD = 42;

export interface MatchBreakdown {
  mswlScore: number;
  genreScore: number;
  ageScore: number;
  /** The MSWL keyword tokens that overlapped — lets callers highlight the matched terms. */
  overlappingWords: string[];
  ageMatchedCategory: string;
}

// Matching algorithm — mswl/genre/age scoring preserved exactly as it was inside Discover.tsx.
export const calculateCommunityAgentMatch = (commAgent: CommunityAgent, ms: Manuscript): MatchBreakdown => {
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

  const msAge = (ms.ageCategory || "").trim().toLowerCase();
  const isAgeMatch = genresClean.some(g => g === msAge);
  const ageScore = isAgeMatch ? 15 : 0;
  const matchedAgeCat = isAgeMatch ? ms.ageCategory : "";

  return {
    mswlScore,
    genreScore,
    ageScore,
    overlappingWords: overlapping,
    ageMatchedCategory: matchedAgeCat
  };
};

/** Sum of the three sub-scores — the headline match score out of 75. */
export const totalScore = (b: MatchBreakdown): number =>
  b.mswlScore + b.genreScore + b.ageScore;

/** Convenience: score one community agent against a manuscript, returning total + breakdown. */
export const scoreCommunityAgent = (
  commAgent: CommunityAgent,
  ms: Manuscript,
): { score: number; breakdown: MatchBreakdown } => {
  const breakdown = calculateCommunityAgentMatch(commAgent, ms);
  return { score: totalScore(breakdown), breakdown };
};
