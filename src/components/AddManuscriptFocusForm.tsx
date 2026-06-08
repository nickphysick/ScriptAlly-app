/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { ManuscriptStatus, UserPlan } from "../types";
import { 
  X, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  Book, 
  ChevronDown, 
  AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AddManuscriptFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

// Predefined genre list from Add agent form
const PREDEFINED_GENRES = [
  "Literary Fiction", 
  "Commercial Fiction", 
  "Historical Fiction", 
  "Fantasy", 
  "Science Fiction", 
  "Horror", 
  "Romance", 
  "Thriller", 
  "Mystery", 
  "Crime", 
  "Young Adult", 
  "Middle Grade", 
  "Memoir", 
  "Non-fiction", 
  "Narrative Non-fiction", 
  "Children's"
];

// Predefined age categories
const AGE_CATEGORIES = [
  "Picture Book",
  "Early Reader",
  "Middle Grade",
  "Young Adult",
  "Adult"
];

export const AddManuscriptFocusForm: React.FC<AddManuscriptFocusFormProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const {
    currentUser,
    manuscripts,
    addManuscript
  } = useScriptAllyDb();

  // Wizard Tab Step (1, 2, 3)
  const [step, setStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<Record<number, boolean>>({ 1: true });

  // Step 1: Basics States
  const [title, setTitle] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [genreInput, setGenreInput] = useState<string>("");
  const [showGenreSuggestions, setShowGenreSuggestions] = useState<boolean>(false);
  const [ageCategory, setAgeCategory] = useState<string>("Adult");
  const [wordCount, setWordCount] = useState<number>(80000);

  // Step 2: About the Story States
  const [logline, setLogline] = useState<string>("");
  const [compInput, setCompInput] = useState<string>("");
  const [comparableTitlesList, setComparableTitlesList] = useState<string[]>([]);
  const [synopsis, setSynopsis] = useState<string>("");

  // Step 3: Status & Notes States
  const [msStatus, setMsStatus] = useState<ManuscriptStatus>(ManuscriptStatus.DRAFTING);
  const [shelvedReason, setShelvedReason] = useState<string>("");

  // Errors and Submitting
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Scroll preservation
  const scrollPositionRef = useRef<number>(0);
  const genreDropdownRef = useRef<HTMLDivElement>(null);

  // Reset form state on open
  useEffect(() => {
    if (isOpen) {
      scrollPositionRef.current = window.scrollY;
      setStep(1);
      setVisitedSteps({ 1: true });
      setTitle("");
      setGenre("");
      setGenreInput("");
      setAgeCategory("Adult");
      setWordCount(80000);
      setLogline("");
      setCompInput("");
      setComparableTitlesList([]);
      setSynopsis("");
      setMsStatus(ManuscriptStatus.DRAFTING);
      setShelvedReason("");
      setFormError(null);
      setIsSubmitting(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  // Click outside to close genre dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target as Node)) {
        setShowGenreSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key handler to close or show discard dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        triggerClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    title,
    genreInput,
    ageCategory,
    wordCount,
    logline,
    comparableTitlesList,
    synopsis,
    msStatus,
    shelvedReason
  ]);

  if (!isOpen) return null;

  // Check if any fields have been modified for discard confirmation
  const isDirty = 
    title !== "" ||
    genreInput !== "" ||
    ageCategory !== "Adult" ||
    wordCount !== 80000 ||
    logline !== "" ||
    comparableTitlesList.length > 0 ||
    synopsis !== "" ||
    msStatus !== ManuscriptStatus.DRAFTING ||
    shelvedReason !== "";

  const triggerClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        setFormError("A manuscript title is required to continue.");
        return;
      }
      const activeGenre = genreInput.trim();
      if (!activeGenre) {
        setFormError("Please enter or select a genre.");
        return;
      }
      setGenre(activeGenre);
      setFormError(null);
    }
    const next = step + 1;
    setStep(next);
    setVisitedSteps(prev => ({ ...prev, [next]: true }));
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const jumpToStep = (target: number) => {
    if (visitedSteps[target] || target < step) {
      if (step === 1 && !title.trim()) {
        setFormError("A manuscript title is required.");
        return;
      }
      setStep(target);
    }
  };

  // Genre filtering and selection
  const filteredGenres = PREDEFINED_GENRES.filter(g => 
    g.toLowerCase().includes(genreInput.toLowerCase())
  );

  const selectGenreOption = (selectedGenre: string) => {
    setGenreInput(selectedGenre);
    setGenre(selectedGenre);
    setShowGenreSuggestions(false);
    setFormError(null);
  };

  // Comparable titles Tags additions
  const handleCompKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = compInput.trim();
      if (value) {
        // Prevent duplicates
        if (!comparableTitlesList.includes(value)) {
          setComparableTitlesList([...comparableTitlesList, value]);
        }
        setCompInput("");
      }
    }
  };

  const removeCompTag = (tag: string) => {
    setComparableTitlesList(comparableTitlesList.filter(t => t !== tag));
  };

  // Calculate dynamic feedback notes for step 1 word count
  const wordCountFeedback = (() => {
    if (!genreInput.trim()) {
      return {
        text: "Please select a genre to evaluate standard length expectations.",
        style: "text-stone-400 font-normal py-0.5 text-[11px]"
      };
    }

    if (wordCount > 120000) {
      return {
        text: "This may be considered long. Some agents are cautious about debut novels over 100,000 words.",
        style: "text-[#BA7517] font-medium py-0.5 text-[11px]"
      };
    }

    const isAdult = ageCategory === "Adult";
    const selectedGenreLower = genreInput.toLowerCase();
    const isFiction = !selectedGenreLower.includes("non-fiction") && !selectedGenreLower.includes("memoir");

    if (isAdult && isFiction) {
      if (wordCount < 50000 && wordCount > 0) {
        return {
          text: "This is shorter than typical for Adult Fiction. Most agents expect 70,000–100,000 words.",
          style: "text-[#BA7517] font-medium py-0.5 text-[11px]"
        };
      }
      if (wordCount >= 70000 && wordCount <= 100000) {
        return {
          text: "This falls within the standard range for Adult Fiction.",
          style: "text-[#3B6D11] font-semibold py-0.5 text-[11px]"
        };
      }
    }

    return null;
  })();

  // Character limit calculations for the logline
  const loglineCharCount = logline.length;
  const loglineCountColor = loglineCharCount > 300 
    ? "text-red-600 font-bold" 
    : loglineCharCount > 200 
      ? "text-[#BA7517] font-bold" 
      : "text-stone-400 font-medium";

  // Helper to extract first sentence of logline for review card
  const getFirstSentence = (text: string) => {
    if (!text) return "";
    const cleaned = text.trim();
    const endingIndexes = [cleaned.indexOf("."), cleaned.indexOf("?"), cleaned.indexOf("!")].filter(i => i > -1);
    if (endingIndexes.length === 0) {
      return cleaned.length > 80 ? cleaned.slice(0, 80) + "..." : cleaned;
    }
    const earliestEnd = Math.min(...endingIndexes);
    const sentence = cleaned.slice(0, earliestEnd + 1);
    return sentence;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setFormError("Title is a required field.");
      setStep(1);
      return;
    }

    const finalGenre = genreInput.trim() || genre;
    if (!finalGenre) {
      setFormError("Genre is a required field.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Free Tier limits check
    if (currentUser?.plan === UserPlan.FREE && manuscripts.length >= 1) {
      setFormError("Free Tier limit reached: You can only configure 1 active manuscript profile. Upgrade to Pro for unlimited additions!");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        genre: finalGenre,
        ageCategory,
        wordCount,
        logline: logline.trim(),
        comparableTitles: comparableTitlesList.join(", "),
        notes: synopsis.trim(), // Stored in notes field on DB per instructions
        status: msStatus,
        ...(msStatus === ManuscriptStatus.SHELVED ? { shelvedReason: shelvedReason.trim() } : {})
      };

      const result = await addManuscript(payload);

      if (result.success) {
        setIsSubmitting(false);
        onSuccessToast("Manuscript saved successfully");
        onClose();
        
        // Restore scroll position after animation or modal closes
        setTimeout(() => {
          window.scrollTo({ top: scrollPositionRef.current, behavior: "instant" });
        }, 50);
      } else {
        setFormError(result.error || "An database error occurred while saving.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            triggerClose();
          }
        }}
        style={{ animationDuration: "200ms" }}
      >
        <p className="text-center italic text-[#F8F5F0]/45 text-[12px] mb-3 select-none tracking-wide">
          Your book's story profiles start here. Simple and distraction-free.
        </p>

        {/* Main interactive form card context */}
        <div 
          className="bg-white rounded-[16px] w-[640px] max-w-[90vw] overflow-hidden flex flex-col border-t-[3px] border-t-[#7c3a2a] relative font-sans text-[#3a1c14] focus:outline-none shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Burgundy accent title header */}
          <div className="bg-[#7c3a2a] p-[16px_24px] text-white flex items-center justify-between relative">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/60 mb-0.5">New entry</p>
              <h2 className="font-serif text-[16px] font-normal text-[#F8F5F0]">Add manuscript</h2>
            </div>
            <button 
              onClick={triggerClose}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
              title="Close and discard form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thin progress line HUD */}
          <div className="w-full h-[3px] bg-[#5a2a1a] relative">
            <motion.div 
              className="absolute left-0 top-0 bottom-0 bg-[#c47a5a] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Three-step step wizard switcher tab bar */}
          <div className="flex border-b border-stone-200">
            {[1, 2, 3].map((stepNum) => {
              const titles = ["The basics", "About the book", "Status & notes"];
              const label = titles[stepNum - 1];
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              const canClick = visitedSteps[stepNum] || stepNum < step;

              return (
                <button
                  key={stepNum}
                  onClick={() => canClick && jumpToStep(stepNum)}
                  disabled={!canClick}
                  className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 border-b-2 text-xs font-semibold select-none transition-all ${
                    isActive 
                      ? "border-b-[#7c3a2a] text-[#7c3a2a]" 
                      : "border-b-transparent text-stone-400"
                  } ${canClick ? "cursor-pointer hover:bg-[#FAF1EF]/30" : "cursor-not-allowed"}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted 
                      ? "bg-[#3B6D11] text-white" 
                      : isActive 
                        ? "bg-[#7c3a2a] text-white" 
                        : "bg-stone-100 text-stone-500"
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : stepNum}
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable form sections box */}
          <div className="p-6 max-h-[60vh] overflow-y-auto text-left space-y-5">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5 border border-red-200 animate-pulse">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{formError}</p>
              </div>
            )}

            {/* STEP 1: The Basics UI */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-1">
                  <p className="text-[10px] text-stone-400 uppercase font-mono font-bold tracking-wider">
                    Tell us about your manuscript
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">Manuscript Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. The Clockwork Golem"
                    className="w-full text-[15px] font-serif p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] font-medium"
                    required
                  />
                </div>

                {/* Genre Row as described */}
                <div className="grid grid-cols-1 gap-4" ref={genreDropdownRef}>
                  <div className="space-y-1 relative">
                    <label className="block text-xs font-bold text-stone-700">Cohesive Genre <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        value={genreInput}
                        onChange={(e) => {
                          setGenreInput(e.target.value);
                          setGenre(e.target.value);
                          setShowGenreSuggestions(true);
                          if (formError) setFormError(null);
                        }}
                        onFocus={() => setShowGenreSuggestions(true)}
                        placeholder="Search standard genre or enter custom..."
                        className="w-full text-xs p-2.5 pr-10 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGenreSuggestions(!showGenreSuggestions)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-[#7c3a2a]"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showGenreSuggestions && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-xl z-20"
                        >
                          {filteredGenres.length === 0 ? (
                            <div 
                              onClick={() => {
                                setShowGenreSuggestions(false);
                              }}
                              className="p-2.5 text-xs text-stone-500 italic hover:bg-stone-50 cursor-pointer"
                            >
                              Using custom genre: "{genreInput}"
                            </div>
                          ) : (
                            filteredGenres.map((g) => (
                              <div
                                key={g}
                                onClick={() => selectGenreOption(g)}
                                className="p-2.5 hover:bg-[#FAF1EF] hover:text-[#7c3a2a] cursor-pointer text-xs font-medium border-b border-stone-50 last:border-0"
                              >
                                {g}
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Age Category Row as described */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">Age Category</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AGE_CATEGORIES.map((cat) => {
                      const isSelected = ageCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setAgeCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected 
                              ? "bg-[#7c3a2a] text-white shadow-sm border border-transparent" 
                              : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Word Count Row as described */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">Word Count</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="80,000"
                      value={wordCount === 0 ? "" : wordCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setWordCount(isNaN(val) ? 0 : val);
                      }}
                      className="w-full text-xs p-2.5 pr-14 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                    <span className="absolute right-3.5 top-3 text-[11px] font-mono font-medium text-stone-400 select-none pointer-events-none">
                      words
                    </span>
                  </div>

                  {/* Contextual expectations messages display */}
                  {wordCountFeedback && (
                    <div className="mt-1.5 flex items-start gap-1 pb-1">
                      <p className={wordCountFeedback.style}>{wordCountFeedback.text}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: About the book Story Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-1">
                  <p className="text-[10px] text-stone-400 uppercase font-mono font-bold tracking-wider">
                    The story
                  </p>
                </div>

                {/* Logline Textarea */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="block text-xs font-bold text-stone-700">Logline</label>
                    <span className={`text-[10px] font-mono ${loglineCountColor}`}>
                      {loglineCharCount} chars
                    </span>
                  </div>
                  <textarea
                    value={logline}
                    onChange={(e) => setLogline(e.target.value)}
                    placeholder="One or two sentences that capture the core premise, protagonist, conflict and stakes. This is what you'd say if you had 30 seconds in a lift with an agent."
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[72px]"
                  />
                  <p className="text-[10px] text-stone-400 font-medium">Aim for under 200 characters</p>
                </div>

                {/* Comps Tag-style component as described */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">Comparable titles (comps)</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-stone-50 border border-stone-200 rounded-xl min-h-[38px] max-h-[110px] overflow-y-auto">
                    {comparableTitlesList.map((tag) => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center gap-1 text-[11px] bg-[#FAF1EF] border border-[#7c3a2a]/20 text-[#7c3a2a] px-2 py-0.5 rounded-full font-medium"
                      >
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => removeCompTag(tag)}
                          className="hover:bg-red-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={compInput}
                      onChange={(e) => setCompInput(e.target.value)}
                      onKeyDown={handleCompKeyDown}
                      placeholder={comparableTitlesList.length === 0 ? "Type comps and press Enter or comma..." : "Add more..."}
                      className="bg-transparent border-none outline-none focus:ring-0 text-xs p-0.5 flex-1 min-w-[120px]"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 font-medium leading-relaxed">
                    Add 2–3 published books from the last 3–5 years that share tone, genre or audience with your manuscript.
                  </p>
                </div>

                {/* Short Synopsis optional textarea */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Short synopsis <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="A brief overview of your manuscript's plot, arc and ending. Agents use this to get a sense of the full story — don't be afraid to include spoilers."
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[120px]"
                  />
                  <p className="text-[10px] text-stone-400 font-medium leading-relaxed">
                    This is for your own records. You'll be able to upload your formatted synopsis separately in submission packages.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Status & notes */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="mb-1">
                  <p className="text-[10px] text-stone-400 uppercase font-mono font-bold tracking-wider">
                    Where are you with it?
                  </p>
                </div>

                {/* Main selectable status options list */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-stone-700">Manuscript status</label>
                  
                  <div className="space-y-2">
                    {[
                      {
                        status: ManuscriptStatus.DRAFTING,
                        name: "Drafting",
                        accentClass: "border-l-stone-400",
                        activeBg: "bg-stone-50 border-stone-300",
                        inactiveBg: "border-stone-200 bg-[#F8F5F0]/30 hover:bg-stone-50/50",
                        desc: "Still writing the first draft."
                      },
                      {
                        status: ManuscriptStatus.REVISING,
                        name: "Revising",
                        accentClass: "border-l-[#BA7517]",
                        activeBg: "bg-[#FDFBF7] border-amber-200",
                        inactiveBg: "border-stone-200 bg-[#F8F5F0]/30 hover:bg-stone-50/50",
                        desc: "First draft complete, working through edits."
                      },
                      {
                        status: ManuscriptStatus.READY_TO_QUERY,
                        name: "Ready to query",
                        accentClass: "border-l-[#3B6D11]",
                        activeBg: "bg-[#EAF3DE]/20 border-[#3B6D11]/30",
                        inactiveBg: "border-stone-200 bg-[#F8F5F0]/30 hover:bg-stone-50/50",
                        desc: "Polished and ready to send to agents."
                      },
                      {
                        status: ManuscriptStatus.QUERYING,
                        name: "Querying",
                        accentClass: "border-l-[#7c3a2a]",
                        activeBg: "bg-[#FAF1EF] border-[#7c3a2a]/20",
                        inactiveBg: "border-stone-200 bg-[#F8F5F0]/30 hover:bg-stone-50/50",
                        desc: "Currently sending to agents."
                      },
                      {
                        status: ManuscriptStatus.SHELVED,
                        name: "Shelved",
                        accentClass: "border-l-stone-400/50",
                        activeBg: "bg-stone-50/60 border-stone-300/60",
                        inactiveBg: "border-stone-200 bg-[#F8F5F0]/30 hover:bg-stone-50/50",
                        desc: "Not actively pursuing this project right now."
                      }
                    ].map((opt) => {
                      const isSelected = msStatus === opt.status;
                      return (
                        <div
                          key={opt.status}
                          onClick={() => setMsStatus(opt.status)}
                          className={`p-3 rounded-xl border border-l-[3px] ${opt.accentClass} ${
                            isSelected ? opt.activeBg : opt.inactiveBg
                          } cursor-pointer transition-all flex flex-col justify-center`}
                        >
                          <p className="text-[12px] font-bold text-stone-900">{opt.name}</p>
                          <p className="text-[10px] text-stone-500 mt-0.5 leading-normal">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Show Shelved Reason if Shelved */}
                <AnimatePresence>
                  {msStatus === ManuscriptStatus.SHELVED && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="block text-xs font-bold text-stone-700">
                        Reason for shelving <span className="text-stone-400 font-normal text-[10px]">(optional)</span>
                      </label>
                      <textarea
                        value={shelvedReason}
                        onChange={(e) => setShelvedReason(e.target.value)}
                        placeholder="e.g. Stepping back to revise, market conditions, starting a new project..."
                        className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[64px]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Warm Sand Summary Review card layout as specified */}
                <div className="bg-[#FBF6F4] border border-[#7c3a2a]/15 rounded-xl p-4 space-y-2.5 shadow-sm">
                  <div className="flex justify-between items-baseline border-b border-[#7c3a2a]/10 pb-1.5">
                    <p className="text-[9px] uppercase font-bold text-stone-400 tracking-wide">Summary Preview</p>
                    <span className="text-[10px] bg-[#7c3a2a]/10 text-[#7c3a2a] font-bold rounded-full px-2.5 py-0.5">
                      {msStatus}
                    </span>
                  </div>

                  <div className="space-y-1 text-left">
                    <h3 className="font-serif text-[15px] font-normal text-[#3a1c14] leading-tight break-words">
                      {title || "Untitled Masterpiece"}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {genreInput && (
                        <span className="text-[9px] font-bold bg-[#7c3a2a]/5 text-[#7c3a2a] py-0.5 px-2 rounded-full border border-[#7c3a2a]/10">
                          {genreInput}
                        </span>
                      )}
                      
                      {ageCategory && (
                        <span className="text-[9px] font-bold bg-stone-100 text-stone-600 py-0.5 px-2 rounded-full">
                          {ageCategory}
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-stone-400 font-semibold ml-auto">
                        {wordCount.toLocaleString()} words
                      </span>
                    </div>

                    {logline && (
                      <p className="text-[10px] leading-normal text-[#3a1c14]/75 mt-2 italic font-serif">
                        "{getFirstSentence(logline)}..."
                      </p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Form back cancel save buttons actions footer */}
          <div className="p-4 px-6 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            {/* Back indicator button */}
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBackStep}
                className="px-4 py-2 hover:bg-stone-100 rounded-xl text-stone-600 text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div /> // spacer
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerClose}
                className="px-4 py-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-bold cursor-pointer select-none"
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 bg-[#7c3a2a] hover:bg-[#7c3a2a]/95 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none shadow-sm"
                >
                  <Book className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Save manuscript"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Discard confirmation dialog popup modal */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in" style={{ animationDuration: "150ms" }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 text-left"
            >
              <h3 className="font-serif text-[15px] font-bold text-stone-900 mb-2">Unsaved changes</h3>
              <p className="text-xs text-stone-500 leading-relaxed mb-4">
                You have started detailing this manuscript profile. Discarding will lose all changes.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Keep editing
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Discard anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
