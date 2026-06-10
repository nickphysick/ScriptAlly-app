/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { BookOpen, MapPin, Feather, Sparkles, Key, Mail, CheckCircle } from "lucide-react";

export const Auth: React.FC = () => {
  const { login, signup, resetPassword } = useScriptAllyDb();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg("");
    if (!email) {
      setErrorMsg("Please provide an email address.");
      return;
    }

    try {
      if (isLogin) {
        const ok = await login(email, password);
        if (!ok) {
          setErrorMsg("Authentication failed. Please try again.");
        }
      } else {
        if (!name) {
          setErrorMsg("Please enter your name.");
          return;
        }
        const ok = await signup(name, email, password);
        if (!ok) {
          setErrorMsg("Failed to initialize Portfolio account. Check credentials.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An authentication error occurred.");
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg("");
    setInfoMsg("");
    try {
      await resetPassword(email);
      setInfoMsg(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not send a reset link. Please try again.");
    }
  };

  const handleDemoMode = async (plan: "free" | "pro") => {
    try {
      if (plan === "pro") {
        await login("nick.physick@gmail.com", "writerpassword123"); // Seeds pro user
      } else {
        await signup("Aspiring Novice", "novice@writer.com", "writerpassword123"); // Seeds free trialist
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to initialize fast sandbox demo account.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EA] flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Decorative Warm Watercolor Circles / Desk Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#7c3a2a]/5 blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#3a1c14]/5 blur-3xl" />

      {/* Main Card */}
      <div className="relative w-full max-w-4xl bg-[#F8F5F0] rounded-2xl border border-[#7c3a2a]/10 shadow-xl overflow-hidden grid md:grid-cols-12 z-10">
        
        {/* Left Editorial Promo Section */}
        <div className="md:col-span-5 bg-[#3a1c14] text-[#F8F5F0] p-6 md:p-10 flex flex-col justify-between relative">
          {/* Subtle line background */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_bottom,transparent_39px,#f3ede4_40px)] bg-[size:100%_40px]" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-8">
              <span className="p-1.5 bg-[#7c3a2a] rounded text-[#F8F5F0] inline-block font-serif font-bold text-lg">S</span>
              <span className="font-serif font-semibold text-xl tracking-tight text-cream-100">ScriptAlly</span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-3xl font-normal leading-tight mb-4 text-[#F5F0EA]">
              The story <span className="italic">behind</span> the story.
            </h2>
            <p className="text-sm font-light text-[#F5F0EA]/80 leading-relaxed mb-6">
              Ditch the clunky, sterile spreadsheets. ScriptAlly provides writers with a warm, literary stationer's dashboard to organize query submissions, agent profiles, submission versions, and follow-ups.
            </p>

            <div className="space-y-4 pt-4 border-t border-[#F5F0EA]/10">
              <div className="flex items-start gap-2.5 text-xs">
                <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0 mt-0.5" />
                <span>Manage submission metadata, query versions, and active response tracking.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0 mt-0.5" />
                <span>Interactive query logs, journal tracking, and automatic chronological Activities metrics.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <CheckCircle className="w-4 h-4 text-[#3B6D11] shrink-0 mt-0.5" />
                <span>Dynamic notification systems reminding you of nudges and submissions updates.</span>
              </div>
            </div>
          </div>

          <div className="relative mt-8 pt-4 border-t border-[#F5F0EA]/10 text-center md:text-left">
            <span className="text-[10px] uppercase tracking-wider text-[#F5F0EA]/50 font-mono">
              Designed for novelists & essayists
            </span>
          </div>
        </div>

        {/* Right Auth Forms Section */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center">
          
          {/* Header togglers */}
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-serif text-2xl text-[#3a1c14] font-medium">
              {isLogin ? "Welcome back" : "Create writer portfolio"}
            </h3>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }}
              className="text-xs font-medium text-[#7c3a2a] hover:underline"
            >
              {isLogin ? "Need an account? Sign up" : "Already registered? Login"}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 mb-6 rounded bg-[#A32D2D]/10 border border-[#A32D2D]/20 text-xs text-[#A32D2D] font-medium">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 mb-6 rounded bg-[#3B6D11]/10 border border-[#3B6D11]/20 text-xs text-[#3B6D11] font-medium">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#3a1c14]/70 mb-1">YOUR PEN NAME / FULL NAME</label>
                <div className="relative">
                  <Feather className="absolute left-3 top-3 w-4 h-4 text-[#3a1c14]/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lucy Sterling"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded border border-[#7c3a2a]/10 focus:outline-none focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 text-[#3a1c14]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#3a1c14]/70 mb-1">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-[#3a1c14]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@literarydomain.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded border border-[#7c3a2a]/10 focus:outline-none focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 text-[#3a1c14]"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#3a1c14]/70">PASSWORD</label>
                {isLogin && (
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] text-[#7c3a2a]/70 hover:underline">
                    Forgot secret?
                  </button>
                )}
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-[#3a1c14]/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded border border-[#7c3a2a]/10 focus:outline-none focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 text-[#3a1c14]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2 bg-[#7c3a2a] hover:bg-[#7c3a2a]/95 text-white rounded font-serif font-medium shadow-md transition-colors text-sm"
            >
              {isLogin ? "Authenticate Account" : "Init ScriptAlly Portfolio"}
            </button>
          </form>

          {/* Quick Sandbox Demolinks */}
          <div className="mt-8 pt-6 border-t border-[#7c3a2a]/10 text-center">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#3a1c14]/50 mb-3 block">
              ⚡ Sandbox quick-test drives (no registration needed)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDemoMode("pro")}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#7c3a2a]/5 hover:bg-[#7c3a2a]/10 text-xs font-medium text-[#7c3a2a] rounded border border-[#7c3a2a]/10 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-3 h-3" />
                <span>Launch Pro Sandbox</span>
              </button>
              
              <button
                onClick={() => handleDemoMode("free")}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#3a1c14]/5 hover:bg-[#3a1c14]/10 text-xs font-medium text-[#3a1c14] rounded border border-[#3a1c14]/10 transition-all hover:scale-[1.02]"
              >
                <BookOpen className="w-3 h-3" />
                <span>Launch Free limits</span>
              </button>
            </div>
            <p className="mt-4 text-[11px] text-[#3a1c14]/50 leading-relaxed italic">
              Pre-seeded with Lucy Sterling's query log covering "The Book of Lost Clockworks".
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
