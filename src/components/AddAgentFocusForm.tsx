/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, SubmissionStatus, SubmissionMethod } from "../types";
import { 
  X, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  Mail, 
  Globe, 
  Camera, 
  Link as LinkIcon, 
  AtSign, 
  Star, 
  Bookmark,
  AlertCircle,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AddAgentFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

const ALL_GENRES = [
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
  "Children's",
  "Graphic Novel",
  "Short Stories",
  "Poetry",
  "Humour",
];

const RESPONSE_TIME_OPTIONS = [2, 4, 6, 8, 10, 12, 16, 20];

export const AddAgentFocusForm: React.FC<AddAgentFocusFormProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { addAgent } = useScriptAllyDb();

  // Step wizard flow: 1, 2, 3
  const [step, setStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<Record<number, boolean>>({ 1: true });

  // Step 1 states: Agent details
  const [name, setName] = useState<string>("");
  const [agency, setAgency] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  
  // Socials
  const [twitter, setTwitter] = useState<string>("");
  const [bluesky, setBluesky] = useState<string>("");
  const [instagram, setInstagram] = useState<string>("");
  const [queryTracker, setQueryTracker] = useState<string>("");

  // Sub status
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>(SubmissionStatus.OPEN);
  
  // Genres Looked For: Search states & alternating lists
  const [genreSearch, setGenreSearch] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Step 2 states: Submission guidelines
  const [materialsForm, setMaterialsForm] = useState<{
    queryLetter: boolean;
    synopsis: boolean;
    pages: { selected: boolean; count: number | "" };
    chapters: { selected: boolean; count: number | "" };
    words: { selected: boolean; count: number | "" };
    other: { selected: boolean; value: string };
  }>({
    queryLetter: false,
    synopsis: false,
    pages: { selected: false, count: 10 },
    chapters: { selected: false, count: 3 },
    words: { selected: false, count: 10000 },
    other: { selected: false, value: "" },
  });

  const [submissionMethod, setSubmissionMethod] = useState<string>("Email");
  const [submissionMethodOther, setSubmissionMethodOther] = useState<string>("");

  const [responseTimeWeeks, setResponseTimeWeeks] = useState<number>(6);
  
  // Response Policy states (renamed & expanded)
  const [responsePolicy, setResponsePolicy] = useState<"No response means no" | "Will respond either way" | "Other">("Will respond either way");
  const [responsePolicyOther, setResponsePolicyOther] = useState<string>("");

  const [mswlNotes, setMswlNotes] = useState<string>("");

  // Step 3 states: Notes & rating
  const [starRating, setStarRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState<string>("");

  // Error/Submitting states
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Discard Confirmation Modal
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Reset form states completely when form opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setVisitedSteps({ 1: true });
      setName("");
      setAgency("");
      setEmail("");
      setWebsite("");
      setTwitter("");
      setBluesky("");
      setInstagram("");
      setQueryTracker("");
      setSubmissionStatus(SubmissionStatus.OPEN);
      setGenreSearch("");
      setSelectedGenres([]);
      setMaterialsForm({
        queryLetter: false,
        synopsis: false,
        pages: { selected: false, count: 10 },
        chapters: { selected: false, count: 3 },
        words: { selected: false, count: 10000 },
        other: { selected: false, value: "" },
      });
      setSubmissionMethod("Email");
      setSubmissionMethodOther("");
      setResponseTimeWeeks(6);
      setResponsePolicy("Will respond either way");
      setResponsePolicyOther("");
      setMswlNotes("");
      setStarRating(3);
      setNotes("");
      setFormError(null);
      setIsSubmitting(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  // Escape key close handling
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
    name,
    agency,
    email,
    website,
    twitter,
    bluesky,
    instagram,
    queryTracker,
    selectedGenres,
    materialsForm,
    mswlNotes,
    notes
  ]);

  if (!isOpen) return null;

  const isMaterialsDirty =
    materialsForm.queryLetter ||
    materialsForm.synopsis ||
    materialsForm.pages.selected ||
    materialsForm.chapters.selected ||
    materialsForm.words.selected ||
    materialsForm.other.selected;

  // Form dirtiness assessment
  const isDirty =
    name !== "" ||
    agency !== "" ||
    email !== "" ||
    website !== "" ||
    twitter !== "" ||
    bluesky !== "" ||
    instagram !== "" ||
    queryTracker !== "" ||
    selectedGenres.length > 0 ||
    isMaterialsDirty ||
    mswlNotes !== "" ||
    notes !== "";

  const triggerClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    onClose();
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        setFormError("Agent name is required.");
        return;
      }
      if (!agency.trim()) {
        setFormError("Agency name is required.");
        return;
      }
      setFormError(null);
    }
    if (step === 2) {
      if (materialsForm.pages.selected && (materialsForm.pages.count === "" || materialsForm.pages.count <= 0)) {
        setFormError("Please enter how many Pages are required.");
        return;
      }
      if (materialsForm.chapters.selected && (materialsForm.chapters.count === "" || materialsForm.chapters.count <= 0)) {
        setFormError("Please enter how many Chapters are required.");
        return;
      }
      if (materialsForm.words.selected && (materialsForm.words.count === "" || materialsForm.words.count <= 0)) {
        setFormError("Please enter how many Words are required.");
        return;
      }
      if (materialsForm.other.selected && !materialsForm.other.value.trim()) {
        setFormError("Please explain what 'Other' materials are requested.");
        return;
      }
      if (submissionMethod === "Other" && !submissionMethodOther.trim()) {
        setFormError("Please describe the 'Other' submission method.");
        return;
      }
      if (responsePolicy === "Other" && !responsePolicyOther.trim()) {
        setFormError("Please describe the 'Other' response policy.");
        return;
      }
      setFormError(null);
    }
    const next = step + 1;
    setStep(next);
    setVisitedSteps((prev) => ({ ...prev, [next]: true }));
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const jumpToStep = (target: number) => {
    if (visitedSteps[target] || target < step) {
      setStep(target);
    }
  };

  const toggleGenreTag = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const removeGenreTag = (genre: string) => {
    setSelectedGenres(selectedGenres.filter((g) => g !== genre));
  };

  const starDescriptions: Record<number, string> = {
    1: "Last resort",
    2: "Poor fit",
    3: "Worth a try",
    4: "Strong fit",
    5: "Dream agent",
  };

  // Form Submit Action
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Agent Name is required.");
      setStep(1);
      return;
    }
    if (!agency.trim()) {
      setFormError("Agency is required.");
      setStep(1);
      return;
    }

    // Step 2 validations
    if (materialsForm.pages.selected && (materialsForm.pages.count === "" || materialsForm.pages.count <= 0)) {
      setFormError("Please enter how many Pages are required.");
      setStep(2);
      return;
    }
    if (materialsForm.chapters.selected && (materialsForm.chapters.count === "" || materialsForm.chapters.count <= 0)) {
      setFormError("Please enter how many Chapters are required.");
      setStep(2);
      return;
    }
    if (materialsForm.words.selected && (materialsForm.words.count === "" || materialsForm.words.count <= 0)) {
      setFormError("Please enter how many Words are required.");
      setStep(2);
      return;
    }
    if (materialsForm.other.selected && !materialsForm.other.value.trim()) {
      setFormError("Please explain what 'Other' materials are requested.");
      setStep(2);
      return;
    }
    if (submissionMethod === "Other" && !submissionMethodOther.trim()) {
      setFormError("Please describe the 'Other' submission method.");
      setStep(2);
      return;
    }
    if (responsePolicy === "Other" && !responsePolicyOther.trim()) {
      setFormError("Please describe the 'Other' response policy.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const finalSubmissionMethod = submissionMethod === "Other" ? submissionMethodOther : submissionMethod;
    const finalNoResponseMeansNo = responsePolicy === "No response means no";
    const finalAgentNotes = responsePolicy === "Other" ? responsePolicyOther : "";

    try {
      const result = await addAgent({
        name: name.trim(),
        agency: agency.trim(),
        email: email.trim(),
        website: website.trim(),
        twitter: twitter.trim() || undefined,
        bluesky: bluesky.trim() || undefined,
        instagram: instagram.trim() || undefined,
        notes: notes.trim(),
        genres: selectedGenres,
        mswlNotes: mswlNotes.trim(),
        starRating,
        submissionStatus,
        responseTimeWeeks,
        noResponseMeansNo: finalNoResponseMeansNo,
        agentNotes: finalAgentNotes,
        submissionMethod: finalSubmissionMethod as any,
        materialsWanted: materialsForm as any,
      });

      if (result.success) {
        setIsSubmitting(false);
        onSuccessToast("Agent saved successfully");
        onClose();
      } else {
        setFormError(result.error || "An error occurred while saving the agent.");
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
          Enter agent guidelines to find your perfect publication target.
        </p>

        {/* Main form visual card wrapper */}
        <div
          className="bg-white rounded-[16px] w-[640px] max-w-[90vw] overflow-hidden flex flex-col border-t-[3px] border-t-[#7c3a2a] relative font-sans text-[#3a1c14] focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header block with #7c3a2a background */}
          <div className="bg-[#7c3a2a] p-[16px_24px] text-white flex items-center justify-between relative">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/60 mb-0.5">Database record</p>
              <h2 className="font-serif text-[16px] font-normal text-[#F8F5F0]">Add an agent</h2>
            </div>
            <button
              onClick={triggerClose}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
              title="Close and discard agent details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thin progress bar underneath the header */}
          <div className="w-full h-[3px] bg-[#5a2a1a] relative">
            <motion.div
              className="absolute left-0 top-0 bottom-0 bg-[#c47a5a] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Three-step navigation header tabs */}
          <div className="flex border-b border-stone-200">
            {[1, 2, 3].map((stepNum) => {
              const titles = ["Agent details", "Submission guidelines", "Notes & rating"];
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
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCompleted
                        ? "bg-[#3B6D11] text-white"
                        : isActive
                        ? "bg-[#7c3a2a] text-white"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : stepNum}
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Form scrollable workspace box */}
          <div className="p-6 max-h-[60vh] overflow-y-auto text-left space-y-5">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100 flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: Agent Details */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in" style={{ animationDuration: "180ms" }}>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 select-none">Who are they?</span>
                </div>

                {/* Grid for Name & Agency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                      Agent Name <span className="text-[#CD4E46]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. Juliet Mushens"
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                      Agency <span className="text-[#CD4E46]">*</span>
                    </label>
                    <input
                      type="text"
                      value={agency}
                      onChange={(e) => {
                        setAgency(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. Mushens Entertainment"
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Email and Website */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="juliet@mushens.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                      Website
                    </label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://mushens-entertainment.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Social profiles */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Social Profiles
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono text-xs font-bold text-stone-400 select-none">X</span>
                      <input
                        type="text"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="@handle"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <AtSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={bluesky}
                        onChange={(e) => setBluesky(e.target.value)}
                        placeholder="@handle.bsky.social"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Camera className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@handle"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={queryTracker}
                        onChange={(e) => setQueryTracker(e.target.value)}
                        placeholder="querytracker.net/..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Submission Status */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-2">
                    Submission Status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSubmissionStatus(SubmissionStatus.OPEN)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${
                        submissionStatus === SubmissionStatus.OPEN
                          ? "bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Open to submissions
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionStatus(SubmissionStatus.CLOSED)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${
                        submissionStatus === SubmissionStatus.CLOSED
                          ? "bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Closed
                    </button>
                  </div>
                </div>

                {/* Genres Tags Container */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Genres Looked For
                  </label>
                  
                  {/* Tag-style selection box */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-stone-50 border border-stone-200 rounded-xl min-h-[38px] max-h-[110px] overflow-y-auto text-left">
                    {selectedGenres.length === 0 ? (
                      <span className="text-stone-400 text-xs px-2 py-0.5 select-none italic">
                        No genres selected. Click pills below to select...
                      </span>
                    ) : (
                      selectedGenres.map((genre) => (
                        <span
                          key={genre}
                          className="bg-[#7c3a2a]/10 text-[#7c3a2a] text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 select-none"
                        >
                          {genre}
                          <button
                            type="button"
                            onClick={() => removeGenreTag(genre)}
                            className="hover:bg-[#7c3a2a]/20 rounded-full p-0.5"
                          >
                            <X className="w-2.5 h-2.5 stroke-[2.5]" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Search box beneath */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      placeholder="Search genres..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Wrapping flex row of available genres */}
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2 bg-stone-50/50 rounded-xl border border-stone-200/50">
                    {ALL_GENRES.filter((genre) =>
                      genre.toLowerCase().includes(genreSearch.toLowerCase())
                    ).map((genre, idx) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenreTag(genre)}
                          style={{ borderRadius: "999px" }}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-3.5 py-1.5 cursor-pointer select-none transition-all duration-150 ${
                            isSelected
                              ? "bg-[#7c3a2a] text-white border border-[#7c3a2a]"
                              : idx % 2 === 0
                              ? "bg-[#F5F0EA] text-[#3a1c14] border border-[#F5F0EA] hover:opacity-90"
                              : "bg-[#EBDCD3] text-[#3a1c14] border border-[#EBDCD3] hover:opacity-90"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{genre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Submission Guidelines */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in text-left" style={{ animationDuration: "180ms" }}>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 select-none">What do they want?</span>
                </div>

                {/* Materials Wanted */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Materials Wanted
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMaterialsForm(prev => ({
                          ...prev,
                          queryLetter: !prev.queryLetter
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                        materialsForm.queryLetter
                          ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      Query letter
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaterialsForm(prev => ({
                          ...prev,
                          synopsis: !prev.synopsis
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                        materialsForm.synopsis
                          ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      Synopsis
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaterialsForm(prev => {
                          const isSel = !prev.pages.selected;
                          return {
                            ...prev,
                            pages: { selected: isSel, count: isSel ? 10 : "" }
                          };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                        materialsForm.pages.selected
                          ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      Pages
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaterialsForm(prev => {
                          const isSel = !prev.chapters.selected;
                          return {
                            ...prev,
                            chapters: { selected: isSel, count: isSel ? 3 : "" }
                          };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                        materialsForm.chapters.selected
                          ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      Chapters
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaterialsForm(prev => {
                          const isSel = !prev.words.selected;
                          return {
                            ...prev,
                            words: { selected: isSel, count: isSel ? 10000 : "" }
                          };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                        materialsForm.words.selected
                          ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      Words
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaterialsForm(prev => {
                          const isSel = !prev.other.selected;
                          return {
                            ...prev,
                            other: { selected: isSel, value: "" }
                          };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                        materialsForm.other.selected
                          ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      Other
                    </button>
                  </div>

                  {/* Dynamic conditional inline numbers & texts */}
                  <div className="space-y-3 pt-1">
                    {(materialsForm.pages.selected || materialsForm.chapters.selected || materialsForm.words.selected) && (
                      <div className="flex flex-wrap gap-4 bg-stone-50 p-3 rounded-xl border border-stone-150">
                        {materialsForm.pages.selected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">Pages:</span>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                required
                                value={materialsForm.pages.count}
                                onChange={(e) => setMaterialsForm(prev => ({
                                  ...prev,
                                  pages: { ...prev.pages, count: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }
                                }))}
                                className="w-[105px] pr-12 px-2.5 py-1 text-xs bg-white border border-stone-250 rounded-lg focus:outline-none focus:border-[#7c3a2a]"
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-stone-400 uppercase select-none">pages</span>
                            </div>
                          </div>
                        )}

                        {materialsForm.chapters.selected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">Chapters:</span>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                required
                                value={materialsForm.chapters.count}
                                onChange={(e) => setMaterialsForm(prev => ({
                                  ...prev,
                                  chapters: { ...prev.chapters, count: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }
                                }))}
                                className="w-[125px] pr-[64px] px-2.5 py-1 text-xs bg-white border border-stone-250 rounded-lg focus:outline-none focus:border-[#7c3a2a]"
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-stone-400 uppercase select-none">chapters</span>
                            </div>
                          </div>
                        )}

                        {materialsForm.words.selected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">Words:</span>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                required
                                value={materialsForm.words.count}
                                onChange={(e) => setMaterialsForm(prev => ({
                                  ...prev,
                                  words: { ...prev.words, count: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }
                                }))}
                                className="w-[110px] pr-12 px-2.5 py-1 text-xs bg-white border border-stone-250 rounded-lg focus:outline-none focus:border-[#7c3a2a]"
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-stone-400 uppercase select-none">words</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {materialsForm.other.selected && (
                      <div className="animate-fade-in" style={{ animationDuration: "140ms" }}>
                        <input
                          type="text"
                          required
                          value={materialsForm.other.value}
                          onChange={(e) => setMaterialsForm(prev => ({
                            ...prev,
                            other: { ...prev.other, value: e.target.value }
                          }))}
                          placeholder="Please specify what materials are requested..."
                          className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors text-left"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Method */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Submission Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSubmissionMethod("Email")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        submissionMethod === "Email"
                          ? "bg-[#7c3a2a] text-white border-[#7c3a2a]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionMethod("Online form / Query Manager")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        submissionMethod === "Online form / Query Manager"
                          ? "bg-[#7c3a2a] text-white border-[#7c3a2a]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Online Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionMethod("Other")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        submissionMethod === "Other"
                          ? "bg-[#7c3a2a] text-white border-[#7c3a2a]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Other
                    </button>
                  </div>
                  
                  {submissionMethod === "Other" && (
                    <div className="mt-2 text-left animate-fade-in" style={{ animationDuration: "140ms" }}>
                      <input
                        type="text"
                        required
                        value={submissionMethodOther}
                        onChange={(e) => setSubmissionMethodOther(e.target.value)}
                        placeholder="Please describe the submission method..."
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Response Time (Pill Options) */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Approximate Response Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {RESPONSE_TIME_OPTIONS.map((weeks) => {
                      const label = weeks === 20 ? "20+ weeks" : `${weeks} weeks`;
                      const isSelected = responseTimeWeeks === weeks;
                      return (
                        <button
                          key={weeks}
                          type="button"
                          onClick={() => setResponseTimeWeeks(weeks)}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#7c3a2a] border-[#7c3a2a] text-[#F8F5F0] font-bold"
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-100"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Response Policy */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Response Policy
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setResponsePolicy("No response means no")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        responsePolicy === "No response means no"
                          ? "bg-[#7c3a2a] text-white border-[#7c3a2a]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      No response means no
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponsePolicy("Will respond either way")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        responsePolicy === "Will respond either way"
                          ? "bg-[#BAEB91]/40 border-[#3B6D11]/30 text-[#2B540A]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Will respond either way
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponsePolicy("Other")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        responsePolicy === "Other"
                          ? "bg-[#7c3a2a] text-white border-[#7c3a2a]"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      Other
                    </button>
                  </div>

                  {responsePolicy === "Other" && (
                    <div className="mt-2 text-left animate-fade-in" style={{ animationDuration: "140ms" }}>
                      <input
                        type="text"
                        required
                        value={responsePolicyOther}
                        onChange={(e) => setResponsePolicyOther(e.target.value)}
                        placeholder="Please describe their response policy..."
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7c3a2a] focus:bg-white transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* MSWL Notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500">
                    Manuscript Wishlist Notes (MSWL)
                  </label>
                  <textarea
                    value={mswlNotes}
                    onChange={(e) => setMswlNotes(e.target.value)}
                    placeholder="Paste or type the agent's current MSWL, wishlist tweets, interview quotes, or anything that tells you what they're looking for right now..."
                    className="w-full text-xs p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#7c3a2a] focus:bg-white h-[95px] resize-none leading-relaxed transition-colors text-left"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Notes & Rating */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in" style={{ animationDuration: "180ms" }}>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 select-none">Your take</span>
                </div>

                {/* Star Rating Section */}
                <div className="flex flex-col items-center justify-center p-3.5 bg-stone-50/50 rounded-xl border border-stone-200/60">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = starRating >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setStarRating(star as 1 | 2 | 3 | 4 | 5)}
                          className="p-1 transition-all hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`w-7 h-7 stroke-[2] ${
                              isFilled
                                ? "text-[#BA7517] fill-[#BA7517]"
                                : "text-stone-300 fill-none hover:text-[#BA7517]/60"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-bold text-[#BA7517] mt-2 tracking-wide uppercase">
                    {starRating} star{starRating > 1 ? "s" : ""} — {starDescriptions[starRating]}
                  </span>
                </div>

                {/* Private Notes */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                    Your Private Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you want to remember about this agent — red flags, personal connections, conference meetings, submission history with other writers..."
                    className="w-full text-xs p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#7c3a2a] focus:bg-white h-[90px] resize-none leading-relaxed transition-colors"
                  />
                </div>

                {/* Summary Review Card */}
                <div className="p-4 bg-[#FBF6F4] rounded-xl border border-[#7c3a2a]/10 space-y-2.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#7c3a2a]/75 select-none">Record Preview</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-stone-400 font-mono">Agent Name</p>
                      <p className="font-bold text-[#3a1c14] truncate">{name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-mono">Agency</p>
                      <p className="font-bold text-[#3a1c14] truncate">{agency || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-mono">Submission Status</p>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 uppercase ${
                        submissionStatus === SubmissionStatus.OPEN 
                          ? "bg-[#EAF3DE] text-[#3B6D11]" 
                          : "bg-[#FCEBEB] text-[#A32D2D]"
                      }`}>
                        ● {submissionStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-mono">My Rating</p>
                      <div className="flex items-center text-[#BA7517] gap-0.5 font-bold mt-0.5">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px]">{starRating} — {starDescriptions[starRating]}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-stone-200/50" />

                  <div className="text-xs">
                    <p className="text-[10px] text-stone-400 font-mono mb-1">Targeting Genres</p>
                    {selectedGenres.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedGenres.map(g => (
                          <span key={g} className="bg-stone-100 text-[#3a1c14]/75 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            {g}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="italic text-stone-400">None specified</p>
                    )}
                  </div>

                  <div className="text-xs">
                    <p className="text-[10px] text-stone-400 font-mono mb-1">Expected Deliverables</p>
                    {(() => {
                      const list: string[] = [];
                      if (materialsForm.queryLetter) list.push("Query Letter");
                      if (materialsForm.synopsis) list.push("Synopsis");
                      if (materialsForm.pages.selected) list.push(`Pages (${materialsForm.pages.count || 0})`);
                      if (materialsForm.chapters.selected) list.push(`Chapters (${materialsForm.chapters.count || 0})`);
                      if (materialsForm.words.selected) list.push(`Words (${materialsForm.words.count || 0})`);
                      if (materialsForm.other.selected) list.push(`Other (${materialsForm.other.value || ""})`);
                      if (list.length > 0) {
                        return <p className="font-medium text-stone-600 text-[11px]">{list.join(", ")}</p>;
                      }
                      return <p className="italic text-stone-400">None specified</p>;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Footer area (always visible) */}
          <div className="p-[14px_24px] border-t border-stone-200/90 flex items-center justify-between bg-stone-50 select-none">
            {/* Back action */}
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="px-3.5 py-2 hover:bg-stone-100 flex items-center gap-1 text-xs font-semibold text-stone-500 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}
            </div>

            {/* Cancel/Next Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={triggerClose}
                className="px-3.5 py-2 border border-stone-200 hover:bg-stone-150 hover:text-stone-700 text-stone-500 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white"
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 bg-[#7c3a2a] hover:bg-[#7c3a2a]/95 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer transition-all active:scale-98"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#7c3a2a] hover:bg-[#5f2b1d] text-[#F8F5F0] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving..." : "Save agent"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Discard confirmation dialog panel */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-[60] select-none text-left">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl relative"
            >
              <h3 className="font-serif text-[16px] font-bold text-[#3a1c14] mb-2 leading-tight">Discard this agent?</h3>
              <p className="text-xs text-stone-500 mb-6 font-normal leading-normal">
                You have inputted data on this agent entry. Closing now will permanently discard all details entered. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-1.5 text-stone-600 hover:bg-stone-50 text-xs font-bold rounded-lg cursor-pointer border border-stone-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
