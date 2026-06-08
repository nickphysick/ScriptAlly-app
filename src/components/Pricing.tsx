/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan } from "../types";
import {
  CheckCircle,
  Sparkles,
  Award,
  Lock,
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  Download,
  AlertCircle
} from "lucide-react";

export const Pricing: React.FC = () => {
  const {
    currentUser,
    manuscripts,
    queries,
    agents,
    packages,
    upgradeToPro,
    downgradeToFree
  } = useScriptAllyDb();

  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  if (!currentUser) return null;

  const isPro = currentUser.plan === UserPlan.PRO;

  // Track thresholds for free limit charts visualizer
  const msCount = manuscripts.length;
  const agCount = agents.length;
  const qCount = queries.length;

  const handleUpgradeToggle = () => {
    if (isPro) {
      downgradeToFree();
    } else {
      upgradeToPro();
      setSimulatedSuccess(true);
      setTimeout(() => setSimulatedSuccess(false), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EA] pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-10 space-y-10">
        
        {/* PAGE HEADER */}
        <div className="text-center space-y-3">
          <span className="py-1 px-3 bg-[#e8b4a8]/35 text-[#7c3a2a] text-xs font-bold uppercase rounded-full tracking-wider font-mono">
            ScriptAlly Plans &amp; Tiers
          </span>
          <h1 className="font-serif text-3xl md:text-5xl text-[#3a1c14] tracking-tight">
            Select your querying setup
          </h1>
          <p className="text-xs text-[#3a1c14]/75 max-w-lg mx-auto leading-relaxed">
            Choose the plan that matches your writing rhythm. Scale from single manuscripts up to robust, multi-book submission campaigns.
          </p>
        </div>

        {/* DEMO UPGRADE SUCCESS TOAST banner */}
        {simulatedSuccess && (
          <div className="bg-[#3B6D11]/10 border border-[#3B6D11]/30 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
            <div className="w-8 h-8 rounded-full bg-[#3B6D11]/20 text-[#3B6D11] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#3B6D11]">🎉 ScriptAlly Pro Account Activated!</p>
              <p className="text-xs text-[#3a1c14]/75">Your workspace limits have been unlocked. Log unlimited manuscripts, packages, and agents instantly.</p>
            </div>
          </div>
        )}

        {/* COHESIVE COMPARATIVE PLAN CARDS CAROUSEL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* PLAN 1: SANDBOX FREE TIER */}
          <div className={`bg-[#F8F5F0] rounded-2xl border p-6 flex flex-col justify-between shadow-sm relative ${
            !isPro ? "border-2 border-[#7c3a2a] ring-4 ring-[#7c3a2a]/5" : "border-[#7c3a2a]/10"
          }`}>
            {!isPro && (
              <span className="absolute top-4 right-4 bg-[#7c3a2a] text-white text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full font-mono">
                CURRENT PLAN
              </span>
            )}
            
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-700">Manuscript Sandbox</h3>
                <p className="text-xs text-stone-500">Perfect for exploring early agent queries.</p>
              </div>

              <div className="flex items-baseline gap-1 py-1.5 border-y border-stone-100">
                <span className="font-serif text-3xl font-bold text-stone-800">$0</span>
                <span className="text-xs text-stone-400">/ forever free</span>
              </div>

              {/* Threshold limits checker bars */}
              <div className="space-y-3 pt-2">
                <span className="block text-[10px] uppercase font-bold tracking-wide text-stone-400 font-mono">Free Tier Allocations</span>
                
                {/* Manuscript: Max 1 */}
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-stone-600 mb-1">
                    <span>Manuscripts ({msCount} / 1)</span>
                    <span>{msCount >= 1 ? "100% full" : "Available"}</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded overflow-hidden">
                    <div
                      style={{ width: `${Math.min((msCount / 1) * 100, 100)}%` }}
                      className={`h-full ${msCount >= 1 ? "bg-[#A32D2D]" : "bg-[#7c3a2a]"}`}
                    />
                  </div>
                </div>

                {/* Agents: Max 5 */}
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-stone-600 mb-1">
                    <span>Target Agents ({agCount} / 5)</span>
                    <span>{Math.round((agCount / 5) * 100)}% utilization</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded overflow-hidden">
                    <div
                      style={{ width: `${Math.min((agCount / 5) * 100, 100)}%` }}
                      className={`h-full ${agCount >= 5 ? "bg-[#A32D2D]" : "bg-[#7c3a2a]"}`}
                    />
                  </div>
                </div>

                {/* Queries Log: Max 10 */}
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-stone-600 mb-1">
                    <span>Queries Logs ({qCount} / 10)</span>
                    <span>{Math.round((qCount / 10) * 100)}% utilization</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded overflow-hidden">
                    <div
                      style={{ width: `${Math.min((qCount / 10) * 100, 100)}%` }}
                      className={`h-full ${qCount >= 10 ? "bg-[#A32D2D]" : "bg-[#7c3a2a]"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Core free details checklist */}
              <ul className="text-xs text-stone-600 space-y-2 pt-4">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-stone-400" />
                  <span>1 Dedicated Novel database grid</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-stone-400" />
                  <span>Manage index of up to 5 agents</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-stone-400" />
                  <span>Up to 10 logged query letters dispatches</span>
                </li>
                <li className="flex items-center gap-1.5 text-stone-400 italic">
                  <Lock className="w-3.5 h-3.5" />
                  <span>No custom submittal pitch packs</span>
                </li>
              </ul>
            </div>

            {isPro && (
              <button
                onClick={handleUpgradeToggle}
                className="mt-8 w-full py-2 border border-stone-300 font-bold text-stone-700 hover:bg-stone-50 rounded text-xs leading-none"
              >
                Downgrade to Sandbox
              </button>
            )}
          </div>

          {/* PLAN 2: SCRIPTALLY PRO COHESIVE ACCENTS */}
          <div className={`bg-white rounded-2xl border p-6 flex flex-col justify-between shadow-md relative ${
            isPro ? "border-2 border-[#7c3a2a] ring-4 ring-[#7c3a2a]/5" : "border-[#7c3a2a]/15"
          }`}>
            {isPro && (
              <span className="absolute top-4 right-4 bg-[#7c3a2a] text-white text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full font-mono">
                ACTIVE PRO MEMBER
              </span>
            )}
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1 bg-[#BA7517]/10 text-[#BA7517] font-semibold text-[9px] rounded py-0.5 px-2 uppercase tracking-wide inline-block mb-1 font-mono">
                  <Sparkles className="w-3 h-3 fill-current inline" />
                  <span>AUTHOR COMPANION</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#3a1c14]">ScriptAlly Pro</h3>
                <p className="text-xs text-stone-500">The complete toolsuite for active querying fiction authors.</p>
              </div>

              <div className="flex items-baseline gap-1 py-1.5 border-y border-stone-100">
                <span className="font-serif text-3xl font-bold text-[#7c3a2a]">$9</span>
                <span className="text-xs text-stone-400">/ user per month</span>
              </div>

              {/* Unlocked lists detail text list */}
              <div className="bg-[#BA7517]/5 p-4 rounded-xl border border-[#BA7517]/10 space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-[#BA7517] font-bold block font-mono">Pro Unlocked features</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-700">
                  <div className="flex items-center gap-1 font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-[#7c3a2a]" />
                    <span>Unlimited Novels</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Download className="w-3.5 h-3.5 text-[#7c3a2a]" />
                    <span>Instant CSV Exports</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#7c3a2a]" />
                    <span>Custom Packages</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-[#7c3a2a]" />
                    <span>Prioritized Nudges</span>
                  </div>
                </div>
              </div>

              {/* Core Pro checklists details */}
              <ul className="text-xs text-[#3a1c14]/85 space-y-2 pt-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0" />
                  <span>Configure unlimited active manuscripts &amp; synopsis drafts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0" />
                  <span>Track custom submittal pitch package files variations</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0" />
                  <span>Unlimited agents list base entries</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0" />
                  <span>Detailed response notifications timelines</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0" />
                  <span>Interactive CSV data backups &amp; downloads</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleUpgradeToggle}
              className={`mt-8 w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow ${
                isPro 
                  ? "bg-stone-100 hover:bg-stone-200 text-stone-700" 
                  : "bg-gradient-to-r from-[#BA7517] to-[#7c3a2a] text-white"
              }`}
            >
              <span>{isPro ? "Switch to Sandbox" : "Activate Pro account now"}</span>
              {!isPro && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* ACCOUNT LIMITS NOTICE BOX */}
        <div className="bg-stone-100/60 p-4 border rounded-2xl border-[#7c3a2a]/10 flex gap-3 text-xs leading-relaxed text-[#3a1c14]/75">
          <AlertCircle className="w-5 h-5 text-[#7c3a2a] shrink-0 mt-0.5" />
          <p>
            This pricing dashboard page demonstrates of the ScriptAlly application gating capabilities. You can instantly transition your current user account between the <strong className="font-semibold">Free Sandbox</strong> mode and <strong className="font-semibold">Pro tier</strong> with simulated triggers!
          </p>
        </div>

      </div>
    </div>
  );
};
