import React, { useState } from "react";
import { useBrand, FONT_PACKAGES, BRAND_PRESETS, FontPackage, BrandKit } from "../lib/brand";
import { 
  Sparkles, 
  RefreshCw, 
  Palette, 
  Type, 
  HelpCircle, 
  Sliders, 
  Eye, 
  Check, 
  Maximize2,
  FileText,
  User,
  Heart,
  ChevronRight,
  Bookmark,
  PlusCircle,
  FilePenLine
} from "lucide-react";

export const BrandStudio: React.FC = () => {
  const {
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    fontPackageId,
    customHeadingFont,
    customBodyFont,
    setPrimaryColor,
    setSecondaryColor,
    setBackgroundColor,
    setTextColor,
    setFontPackageId,
    setCustomHeadingFont,
    setCustomBodyFont,
    applyPreset,
    resetToDefault
  } = useBrand();

  const [notification, setNotification] = useState<string | null>(null);
  const [activeTabSection, setActiveTabSection] = useState<"presets" | "custom" | "fonts">("presets");

  // Selection state for individual font pickers
  const availableDisplayFonts = [
    "Playfair Display", "Lora", "Cormorant Garamond", 
    "Merriweather", "Cinzel", "EB Garamond", "Georgia", "Times New Roman"
  ];
  const availableBodyFonts = [
    "Inter", "Plus Jakarta Sans", "DM Sans", "Outfit", 
    "Verdana", "Arial", "Trebuchet MS", "system-ui"
  ];

  const handleApplyPreset = (preset: BrandKit) => {
    applyPreset(preset);
    showNotice(`Successfully applied "${preset.name}" Brand Kit! Your workspace style is now completely updated.`);
  };

  const handleResetToDefault = () => {
    resetToDefault();
    showNotice("Applied the classic cozy Terracotta ScriptAlly branding.");
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleFontPackageSelect = (pkgId: string) => {
    setFontPackageId(pkgId);
    setCustomHeadingFont("");
    setCustomBodyFont("");
    const pkgName = FONT_PACKAGES.find(p => p.id === pkgId)?.name || "custom";
    showNotice(`Swapped font package to "${pkgName}"! All titles and copy updated consistently.`);
  };

  const currentPkg = FONT_PACKAGES.find(p => p.id === fontPackageId);

  return (
    <div className="w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 py-8 animate-fade-in text-[#3a1c14]">
      {/* Dynamic Success Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border-2 border-emerald-500/30 text-stone-900 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-center gap-3 max-w-sm animate-fade-in-scale">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black text-stone-850">Palette Updated</p>
            <p className="text-[11px] text-stone-600 leading-tight mt-0.5">{notification}</p>
          </div>
        </div>
      )}

      {/* Hero Welcome banner */}
      <div className="bg-white rounded-3xl border border-[#FAF1EF] shadow-[0_4px_12px_rgba(58,28,20,0.02)] p-6 md:p-8 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#7c3a2a]/5 to-[#BA7517]/5 rounded-bl-full pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7c3a2a]/5 border border-[#7c3a2a]/10 text-[#7c3a2a] text-[10px] font-semibold mb-4">
            <Palette className="w-3.5 h-3.5" />
            <span>DESIGN THEATER</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#3a1c14] tracking-tight leading-tight">
            ScriptAlly Brand Room
          </h1>
          <p className="text-sm text-[#3a1c14]/70 mt-3 leading-relaxed">
            Welcome to your visual identity workspace! You do not need any coding or design experience to adapt this platform to your creative taste. Pick from curated editorial presets, customize typography, or pick your distinct brand colors to paint beautiful backgrounds, cards, buttons, and borders.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================================
            LEFT COLUMN (7 SPANS): BRANDE CONFIGURATION PANEL
            ====================================================================== */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EBDCD3] shadow-[0_5px_15px_rgba(58,28,20,0.02)] overflow-hidden">
          {/* Section Selector Tab Headers */}
          <div className="bg-[#FAF1EF] border-b border-[#EBDCD3] p-1.5 flex gap-1">
            <button
              onClick={() => setActiveTabSection("presets")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTabSection === "presets"
                  ? "bg-white text-[#7c3a2a] shadow-sm"
                  : "text-[#3a1c14]/60 hover:bg-white/40 hover:text-[#7c3a2a]"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Brand Kit Presets</span>
            </button>
            <button
              onClick={() => setActiveTabSection("fonts")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTabSection === "fonts"
                  ? "bg-white text-[#7c3a2a] shadow-sm"
                  : "text-[#3a1c14]/60 hover:bg-white/40 hover:text-[#7c3a2a]"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Typography Packages</span>
            </button>
            <button
              onClick={() => setActiveTabSection("custom")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTabSection === "custom"
                  ? "bg-white text-[#7c3a2a] shadow-sm"
                  : "text-[#3a1c14]/60 hover:bg-white/40 hover:text-[#7c3a2a]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Custom Coloring</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* 1. BRANDE KIT PRESETS */}
            {activeTabSection === "presets" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#3a1c14]">Suggested Editorial Themes</h3>
                    <p className="text-[11px] text-stone-500">Pick a complete pre-built look to restyle the entire screen instantly.</p>
                  </div>
                  <button
                    onClick={handleResetToDefault}
                    className="text-[11px] font-mono font-bold text-[#7c3a2a] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BRAND_PRESETS.map((preset) => {
                    const isSelected = 
                      primaryColor.toLowerCase() === preset.primaryColor.toLowerCase() &&
                      backgroundColor.toLowerCase() === preset.backgroundColor.toLowerCase();

                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-4 rounded-xl text-left border transition-all duration-200 relative group flex flex-col justify-between h-40 ${
                          isSelected
                            ? "border-[#7c3a2a] bg-[#FAF1EF]/40 shadow-sm ring-1 ring-[#7c3a2a]/20"
                            : "border-stone-200 bg-white hover:border-[#7c3a2a]/30 hover:shadow-md"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-[#7c3a2a] text-white rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div>
                          <span className="font-serif font-black text-xs block text-[#3a1c14] leading-tight">
                            {preset.name}
                          </span>
                          <p className="text-[10px] text-stone-500 leading-normal mt-1 max-w-[90%]">
                            {preset.desc}
                          </p>
                        </div>

                        {/* Theme preview chips */}
                        <div className="mt-4 pt-3 border-t border-stone-105/70 flex justify-between items-center">
                          <div className="flex gap-1.5">
                            {/* Primary dot */}
                            <div 
                              className="w-5 h-5 rounded-md border border-black/10 shadow-sm flex items-center justify-center text-[8px] font-bold text-white uppercase font-mono"
                              style={{ backgroundColor: preset.primaryColor }}
                              title="Primary color"
                            >
                              P
                            </div>
                            <div 
                              className="w-5 h-5 rounded-md border border-black/10 shadow-sm flex items-center justify-center text-[8px] font-bold text-white uppercase font-mono"
                              style={{ backgroundColor: preset.secondaryColor }}
                              title="Secondary highlight color"
                            >
                              S
                            </div>
                            <div 
                              className="w-5 h-5 rounded-md border border-black/10 shadow-sm flex items-center justify-center text-[8px] font-bold text-stone-700 uppercase font-mono"
                              style={{ backgroundColor: preset.backgroundColor }}
                              title="Background theme"
                            >
                              B
                            </div>
                            <div 
                              className="w-5 h-5 rounded-md border border-black/10 shadow-sm flex items-center justify-center text-[8px] font-bold text-white uppercase font-mono"
                              style={{ backgroundColor: preset.textColor }}
                              title="Dark ink typography color"
                            >
                              T
                            </div>
                          </div>
                          
                          <span className="text-[9px] font-mono text-stone-400 font-semibold group-hover:text-[#7c3a2a]">
                            Apply Style &rarr;
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. TYPOGRAPHY PACKAGES */}
            {activeTabSection === "fonts" && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-stone-100">
                  <h3 className="text-sm font-bold text-[#3a1c14]">Pair Font Packages</h3>
                  <p className="text-[11px] text-stone-500">Pick beautiful font pairs carefully tested for book pitches and layout symmetry.</p>
                </div>

                <div className="space-y-3.5">
                  {FONT_PACKAGES.map((pkg) => {
                    const isSelected = fontPackageId === pkg.id && !customHeadingFont && !customBodyFont;

                    return (
                      <button
                        key={pkg.id}
                        onClick={() => handleFontPackageSelect(pkg.id)}
                        className={`w-full p-4 rounded-xl text-left border transition-all duration-200 flex items-center justify-between ${
                          isSelected
                            ? "border-[#7c3a2a] bg-[#FAF1EF]/40 shadow-sm ring-1 ring-[#7c3a2a]/20"
                            : "border-stone-200 bg-white hover:border-[#7c3a2a]/30 hover:scale-[1.005]"
                        }`}
                      >
                        <div className="flex gap-4 items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-serif font-black shadow-inner bg-[#7c3a2a]/5 text-[#7c3a2a]`}>
                            Aa
                          </div>
                          <div>
                            <span className="text-xs font-bold block text-[#3a1c14]">
                              {pkg.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-1">
                              <span className="font-semibold italic font-serif">
                                Headings: {pkg.displayFont}
                              </span>
                              <span>&middot;</span>
                              <span>
                                Body: {pkg.bodyFont}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="px-2.5 py-0.5 bg-[#7c3a2a]/10 text-[#7c3a2a] border border-[#7c3a2a]/15 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider animate-pulse">
                            Active Pair
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ADVANCED CUSTOM FONT SELECTION */}
                <div className="bg-[#FAF1EF]/30 border-t border-dashed border-[#EBDCD3] pt-5 mt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-[#3a1c14] uppercase tracking-wider">Mix-and-Match Custom Fonts</h4>
                    <p className="text-[10px] text-stone-500 mt-0.5">Need custom freedom? Select any individual Google fonts below to refine typography.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-600 block">Display / Heading Font</label>
                      <select
                        value={customHeadingFont || currentPkg?.displayFont || "Playfair Display"}
                        onChange={(e) => {
                          setCustomHeadingFont(e.target.value);
                          showNotice(`Changed headings styling to "${e.target.value}"!`);
                        }}
                        className="w-full text-xs p-2.5 bg-white border border-[#EBDCD3] rounded-xl focus:border-[#7c3a2a] outline-none"
                      >
                        {availableDisplayFonts.map((fName) => (
                          <option key={fName} value={fName}>{fName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-600 block">Readable Paragraph/Body Font</label>
                      <select
                        value={customBodyFont || currentPkg?.bodyFont || "Inter"}
                        onChange={(e) => {
                          setCustomBodyFont(e.target.value);
                          showNotice(`Changed paragraphs/labels styling to "${e.target.value}"!`);
                        }}
                        className="w-full text-xs p-2.5 bg-white border border-[#EBDCD3] rounded-xl focus:border-[#7c3a2a] outline-none"
                      >
                        {availableBodyFonts.map((fName) => (
                          <option key={fName} value={fName}>{fName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 3. CUSTOM BRANDE COLOUR DIAL */}
            {activeTabSection === "custom" && (
              <div className="space-y-5">
                <div className="pb-2 border-b border-stone-100">
                  <h3 className="text-sm font-bold text-[#3a1c14]">Brand Color Workshop</h3>
                  <p className="text-[11px] text-stone-500">Pick hex codes or drag pickers to adjust individual brand elements to your design layout.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card Color Block 1: Primary Accent */}
                  <div className="p-3 bg-[#FAF1EF]/30 hover:bg-[#FAF1EF]/50 rounded-xl border border-stone-200/60 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block text-stone-850">Primary Branding Accent</span>
                      <span className="text-[9.5px] text-stone-500 block leading-tight mt-0.5">Used on main buttons, badges, lines and headers.</span>
                      <span className="text-[10px] font-mono font-bold mt-1 inline-block text-[#7c3a2a]">{primaryColor}</span>
                    </div>
                    <div className="relative shrink-0 w-12 h-12 rounded-xl border border-stone-250 shadow overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-[2.5]"
                      />
                      <div className="w-full h-full transition-colors" style={{ backgroundColor: primaryColor }} />
                    </div>
                  </div>

                  {/* Card Color Block 2: Highlight Accent */}
                  <div className="p-3 bg-[#FAF1EF]/30 hover:bg-[#FAF1EF]/50 rounded-xl border border-stone-200/60 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block text-stone-850">Highlights &amp; Badges</span>
                      <span className="text-[9.5px] text-stone-500 block leading-tight mt-0.5">Used for active labels, warning states, and gold trims.</span>
                      <span className="text-[10px] font-mono font-bold mt-1 inline-block text-stone-600">{secondaryColor}</span>
                    </div>
                    <div className="relative shrink-0 w-12 h-12 rounded-xl border border-stone-250 shadow overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-[2.5]"
                      />
                      <div className="w-full h-full transition-colors" style={{ backgroundColor: secondaryColor }} />
                    </div>
                  </div>

                  {/* Card Color Block 3: Workspace BG */}
                  <div className="p-3 bg-[#FAF1EF]/30 hover:bg-[#FAF1EF]/50 rounded-xl border border-stone-200/60 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block text-stone-850">Desktop Workspace Base</span>
                      <span className="text-[9.5px] text-stone-500 block leading-tight mt-0.5">Background color applied behind pages.</span>
                      <span className="text-[10px] font-mono font-bold mt-1 inline-block text-stone-650">{backgroundColor}</span>
                    </div>
                    <div className="relative shrink-0 w-12 h-12 rounded-xl border border-stone-250 shadow overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-[2.5]"
                      />
                      <div className="w-full h-full transition-colors" style={{ backgroundColor: backgroundColor }} />
                    </div>
                  </div>

                  {/* Card Color Block 4: Dark Ink Typography */}
                  <div className="p-3 bg-[#FAF1EF]/30 hover:bg-[#FAF1EF]/50 rounded-xl border border-stone-200/60 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block text-stone-850">Dark Typography Ink</span>
                      <span className="text-[9.5px] text-stone-500 block leading-tight mt-0.5">Primary dark color for headings and text.</span>
                      <span className="text-[10px] font-mono font-bold mt-1 inline-block text-stone-650">{textColor}</span>
                    </div>
                    <div className="relative shrink-0 w-12 h-12 rounded-xl border border-stone-250 shadow overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-[2.5]"
                      />
                      <div className="w-full h-full transition-colors" style={{ backgroundColor: textColor }} />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#FAF1EF] border border-[#EBDCD3]/60 rounded-xl text-center text-[10.5px] text-stone-500 italic font-medium leading-relaxed">
                  💡 Tips for beautiful design: Stick to light, high-contrast, off-white, or pastel backdrops to ensure paragraphs are beautiful and easy to read.
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ======================================================================
            RIGHT COLUMN (5 SPANS): HIGH-FIDELITY LIVE PREVIEW CANVAS
            ====================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EBDCD3] shadow-[0_4px_10px_rgba(58,28,20,0.02)] overflow-hidden">
            <div className="bg-[#FAF1EF] border-b border-[#EBDCD3] py-3.5 px-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#7c3a2a]" />
                <h3 className="font-serif text-sm font-bold text-[#3a1c14] tracking-tight">Real-time Sandbox Simulator</h3>
              </div>
              <span className="bg-[#7c3a2a]/10 border border-[#7c3a2a]/15 text-[#7c3a2a] font-mono text-[9px] font-bold py-0.5 px-2 rounded-full uppercase">
                Interactive Mockup
              </span>
            </div>

            {/* Simulated app background canvas container */}
            <div className="p-5" style={{ backgroundColor: backgroundColor }}>
              <div className="bg-white/95 rounded-2xl border border-[#EBDCD3] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-5">
                
                {/* 1. Brand Header */}
                <div className="flex justify-between items-center pb-2.5 border-b border-[#EBDCD3]">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center font-serif text-white font-bold text-xs shadow-sm transition-all duration-300"
                      style={{ backgroundColor: primaryColor }}
                    >
                      S
                    </div>
                    <span className="font-serif text-xs font-bold transition-all duration-300" style={{ color: textColor }}>
                      ScriptAlly App
                    </span>
                  </div>
                  
                  <span 
                    className="rounded-full px-2 py-0.5 text-[8.5px] font-mono font-bold flex items-center gap-1 shrink-0 transition-all duration-300"
                    style={{ backgroundColor: `${secondaryColor}25`, color: secondaryColor, border: `1px solid ${secondaryColor}30` }}
                  >
                    <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: secondaryColor }} />
                    <span>PRESET ACTIVATED</span>
                  </span>
                </div>

                {/* 2. Headline Mockup */}
                <div className="space-y-1">
                  <h3 className="font-serif text-md font-bold tracking-tight transition-all duration-300" style={{ color: textColor }}>
                    Reviewing: The Midnight Manuscript Draft
                  </h3>
                  <p className="text-[10px] text-stone-500 leading-normal">
                    This simulation gives you a live look of how the font pairing matches and how tag accents contrast against paper items.
                  </p>
                </div>

                {/* 3. Component Mockups - Card element */}
                <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#EBDCD3]/60 relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div>
                      <span 
                        className="inline-block text-[8px] font-semibold font-mono tracking-wider uppercase px-2 py-0.5 rounded border border-[#7c3a2a]/15 bg-[#FAF1EF] mb-2 leading-none"
                        style={{ color: primaryColor }}
                      >
                        Science Fiction Novel
                      </span>
                      <h4 className="text-xs font-serif font-black leading-tight text-[#3a1c14] hover:text-[#7c3a2a] transition-all">
                        Evelyn Sterling <span className="font-sans text-[10px] text-stone-400 font-normal">&middot; Agent</span>
                      </h4>
                    </div>
                    <Bookmark className="w-3.5 h-3.5 text-stone-400 self-center" />
                  </div>
                  
                  <p className="text-[10px] italic text-stone-600 mt-2 border-t border-stone-105/60 pt-2 leading-relaxed">
                    "I loved your sample package synopsis, and I would love to make an offer of representation on your manuscript!"
                  </p>
                </div>

                {/* 4. Action Buttons Simulator */}
                <div className="flex gap-2.5 pt-1.5 justify-end">
                  <button 
                    className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold bg-[#7c3a2a] hover:opacity-90 text-white transition-all shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary Button
                  </button>
                  <button 
                    className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold border hover:bg-neutral-50 text-stone-700 transition-all"
                    style={{ borderColor: `${primaryColor}25`, color: primaryColor }}
                  >
                    Border Button
                  </button>
                </div>

              </div>
            </div>

            <div className="p-4 bg-[#FAF1EF] border-t border-[#EBDCD3] text-[10px] text-stone-500 leading-normal text-left flex gap-2">
              <span className="text-amber-600 select-none">⚠️</span>
              <span><strong>Design Preview:</strong> The sandbox simulator is a compact render to demonstrate responsiveness. Changes apply in high density across every tab of your portal in real-time.</span>
            </div>
          </div>

          {/* Quick info panel on Brand Kit Persistence */}
          <div className="bg-white rounded-2xl border border-dashed border-[#EBDCD3] p-5 space-y-3">
            <h4 className="font-serif text-xs font-bold text-[#3a1c14] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#BA7517]" />
              <span>How Consistent Brand Kits Work</span>
            </h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              When you adjust colors or fonts, ScriptAlly compiles your customized branding into standardized **CSS Custom Properties** (often called CSS Variables). 
            </p>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Because the entire application uses these variables for colors and layout styles, everything updates dynamically. These properties are **automatically persisted to your browser**, ensuring your website remains gorgeous, tailored and on-brand each time you come on!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
