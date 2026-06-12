/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, AgentSocial, SubmissionStatus } from "../types";
import {
  FormShell,
  FormField,
  BrandInput,
  BrandDropdown,
  SegmentedToggle,
  WeekSlider,
  GenreCombobox,
  Em,
} from "./forms";
import profileAnimation from "../assets/agent-profile-animation.json";

interface AddAgentFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

const GENRES = [
  "Action & adventure", "Children’s", "Commercial fiction", "Contemporary", "Cosy crime",
  "Crime", "Dystopian", "Fantasy", "Historical fiction", "Horror", "Literary fiction",
  "Magical realism", "Memoir", "Middle grade", "Mystery", "Non-fiction", "Picture book",
  "Romance", "Romantasy", "Sci-fi", "Speculative fiction", "Thriller", "Upmarket",
  "Women’s fiction", "Young adult",
];

const SOCIAL_PLATFORMS = ["X / Twitter", "Bluesky", "Instagram", "QueryTracker", "TikTok", "Other"];
const platformOptions = SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p }));

const METHOD_OPTIONS = ["Email", "QueryManager", "Agency form", "Post", "Other"].map((m) => ({
  value: m,
  label: m,
}));

const POLICY_OPTIONS = ["Responds to all", "Only responds if interested", "No response means pass"].map(
  (p) => ({ value: p, label: p })
);

// Agent-fit meanings, indexed 1–5 (bound to the existing starRating field).
const FIT_MEANING = ["Poor fit", "Average fit", "Good fit", "Great fit", "Perfect match"];

interface MaterialsState {
  queryLetter: boolean;
  synopsis: boolean;
  pages: { on: boolean; count: string };
  chapters: { on: boolean; count: string };
  words: { on: boolean; count: string };
  other: { on: boolean; text: string };
}

const initialMaterials = (): MaterialsState => ({
  queryLetter: true,
  synopsis: false,
  pages: { on: true, count: "10" },
  chapters: { on: false, count: "3" },
  words: { on: false, count: "" },
  other: { on: false, text: "" },
});

const initialSocials = (): AgentSocial[] => [{ platform: "X / Twitter", handle: "" }];

export const AddAgentFocusForm: React.FC<AddAgentFocusFormProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { addAgent } = useScriptAllyDb();

  // Who are they?
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [socials, setSocials] = useState<AgentSocial[]>(initialSocials);

  // What they want
  const [mswlNotes, setMswlNotes] = useState("");
  const [genres, setGenres] = useState<string[]>([]);

  // How they submit
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>(SubmissionStatus.OPEN);
  const [responseTimeWeeks, setResponseTimeWeeks] = useState(8);
  const [submissionMethod, setSubmissionMethod] = useState("Email");
  const [materials, setMaterials] = useState<MaterialsState>(initialMaterials);
  const [responsePolicy, setResponsePolicy] = useState("Only responds if interested");

  // Your take
  const [starRating, setStarRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset every field when the form (re)opens.
  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setAgency("");
    setEmail("");
    setWebsite("");
    setSocials(initialSocials());
    setMswlNotes("");
    setGenres([]);
    setSubmissionStatus(SubmissionStatus.OPEN);
    setResponseTimeWeeks(8);
    setSubmissionMethod("Email");
    setMaterials(initialMaterials());
    setResponsePolicy("Only responds if interested");
    setStarRating(4);
    setHoverStar(null);
    setNotes("");
    setFormError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const isDirty =
    name !== "" ||
    agency !== "" ||
    email !== "" ||
    website !== "" ||
    mswlNotes !== "" ||
    notes !== "" ||
    genres.length > 0 ||
    socials.some((s) => s.handle.trim() !== "");

  const toggleMat = <K extends keyof MaterialsState>(key: K) =>
    setMaterials((prev) => {
      const cur = prev[key];
      if (typeof cur === "boolean") return { ...prev, [key]: !cur };
      return { ...prev, [key]: { ...cur, on: !(cur as { on: boolean }).on } } as MaterialsState;
    });

  const updateSocial = (i: number, patch: Partial<AgentSocial>) =>
    setSocials((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSocialRow = () => setSocials((prev) => [...prev, { platform: "", handle: "" }]);
  const removeSocialRow = (i: number) => setSocials((prev) => prev.filter((_, idx) => idx !== i));

  // Build the display-friendly materialsWanted string[] from the chip selections.
  const buildMaterials = (): string[] => {
    const out: string[] = [];
    if (materials.queryLetter) out.push("Query letter");
    if (materials.synopsis) out.push("Synopsis");
    if (materials.pages.on) out.push(materials.pages.count ? `First ${materials.pages.count} pages` : "Sample pages");
    if (materials.chapters.on)
      out.push(materials.chapters.count ? `First ${materials.chapters.count} chapters` : "Chapters");
    if (materials.words.on) {
      const digits = materials.words.count.replace(/\D/g, "");
      out.push(digits ? `${Number(digits).toLocaleString("en-US")} words` : "Word count");
    }
    if (materials.other.on && materials.other.text.trim()) out.push(materials.other.text.trim());
    return out;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError("Agent name is required.");
      return;
    }
    if (!agency.trim()) {
      setFormError("Agency is required.");
      return;
    }
    if (materials.pages.on && !materials.pages.count.trim()) {
      setFormError("Enter how many sample pages they want.");
      return;
    }
    if (materials.chapters.on && !materials.chapters.count.trim()) {
      setFormError("Enter how many chapters they want.");
      return;
    }
    if (materials.words.on && !materials.words.count.replace(/\D/g, "")) {
      setFormError("Enter the word count they want.");
      return;
    }
    if (materials.other.on && !materials.other.text.trim()) {
      setFormError("Describe the 'Other' materials they want.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Keep only filled social rows; mirror the known platforms into the discrete fields so the
    // agent-database display keeps working untouched.
    const filledSocials = socials.filter((s) => s.handle.trim() && s.platform);
    const firstHandle = (platform: string) =>
      filledSocials.find((s) => s.platform === platform)?.handle.trim();

    const payload: Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate"> = {
      name: name.trim(),
      agency: agency.trim(),
      email: email.trim(),
      website: website.trim(),
      twitter: firstHandle("X / Twitter"),
      bluesky: firstHandle("Bluesky"),
      instagram: firstHandle("Instagram"),
      socials: filledSocials.length
        ? filledSocials.map((s) => ({ platform: s.platform, handle: s.handle.trim() }))
        : undefined,
      genres,
      mswlNotes: mswlNotes.trim(),
      starRating,
      submissionStatus,
      responseTimeWeeks,
      noResponseMeansNo: responsePolicy === "No response means pass",
      // No discrete responsePolicy field on the model — preserve the chosen label here so the
      // distinction between "Responds to all" and "Only responds if interested" survives.
      agentNotes: responsePolicy,
      submissionMethod: submissionMethod as Agent["submissionMethod"],
      materialsWanted: buildMaterials(),
      notes: notes.trim(),
    };

    try {
      const result = await addAgent(payload);
      if (result.success) {
        onSuccessToast("Agent saved successfully");
        onClose();
      } else {
        setFormError(result.error || "An error occurred while saving the agent.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fitShown = hoverStar ?? starRating;

  return (
    <FormShell
      preLabel="Building your list"
      name={<>Add an <Em>agent</Em></>}
      subLine="The right agent is out there — let's get them on your radar"
      avatarIcon={
        <span className="sa-aa-avatar">
          <span className="sa-aa-disc">
            <Lottie animationData={profileAnimation} loop autoplay style={{ width: 34, height: 34 }} />
          </span>
          <span className="sa-aa-plus" aria-hidden="true">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
        </span>
      }
      buttonLabel="Save agent"
      onSubmit={() => void handleSubmit()}
      submitting={isSubmitting}
      onClose={onClose}
      dirty={isDirty}
    >
      {/* ── Who are they? ───────────────────────────────────────────── */}
      <div className="sa-section first">Who are they?</div>

      <div className="sa-row2">
        <FormField label="Agent name">
          <BrandInput
            className="sa-strong"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Margaret Holloway"
          />
        </FormField>
        <FormField label="Agency">
          <BrandInput
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder="e.g. Pemberton Literary"
          />
        </FormField>
      </div>

      <div className="sa-row2">
        <FormField label={<>Email <span className="sa-opt">optional</span></>}>
          <BrandInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@agency.com"
          />
        </FormField>
        <FormField label={<>Website <span className="sa-opt">optional</span></>}>
          <BrandInput
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="agency.com"
          />
        </FormField>
      </div>

      <FormField label={<>Social handles <span className="sa-opt">optional</span></>}>
        <div>
          {socials.map((s, i) => (
            <div className="sa-aa-soc-row" key={i}>
              <BrandDropdown
                value={s.platform}
                options={platformOptions}
                placeholder="Platform"
                onChange={(v) => updateSocial(i, { platform: v })}
              />
              <BrandInput
                className="sa-aa-soc-url"
                value={s.handle}
                onChange={(e) => updateSocial(i, { handle: e.target.value })}
                placeholder="profile URL or @handle"
              />
              <button
                type="button"
                className="sa-aa-soc-x"
                aria-label="Remove social handle"
                onClick={() => removeSocialRow(i)}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="sa-aa-add-soc" onClick={addSocialRow}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add social handle
          </button>
        </div>
      </FormField>

      {/* ── What they want ──────────────────────────────────────────── */}
      <div className="sa-section">What they want</div>

      <FormField label="Manuscript wish list">
        <textarea
          className="sa-input sa-textarea"
          value={mswlNotes}
          onChange={(e) => setMswlNotes(e.target.value)}
          placeholder="Literary fiction with dark psychological themes, upmarket book-club novels, voice-driven memoir…"
        />
      </FormField>

      <FormField label="Genres">
        <GenreCombobox options={GENRES} value={genres} onChange={setGenres} />
      </FormField>

      {/* ── How they submit ─────────────────────────────────────────── */}
      <div className="sa-section">How they submit</div>

      <FormField label="Submission status">
        <SegmentedToggle<SubmissionStatus>
          ariaLabel="Submission status"
          value={submissionStatus}
          options={[
            { value: SubmissionStatus.OPEN, label: "Open" },
            { value: SubmissionStatus.CLOSED, label: "Closed" },
          ]}
          onChange={setSubmissionStatus}
        />
      </FormField>

      <WeekSlider value={responseTimeWeeks} onChange={setResponseTimeWeeks} />

      <FormField label="Submission method">
        <BrandDropdown value={submissionMethod} options={METHOD_OPTIONS} onChange={setSubmissionMethod} />
      </FormField>

      <FormField label="Materials wanted">
        <div className="sa-aa-chips">
          <div className={`sa-aa-chip${materials.queryLetter ? " on" : ""}`} onClick={() => toggleMat("queryLetter")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMat("queryLetter"); } }}>Query letter</div>
          <div className={`sa-aa-chip${materials.synopsis ? " on" : ""}`} onClick={() => toggleMat("synopsis")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMat("synopsis"); } }}>Synopsis</div>
          <div className={`sa-aa-chip${materials.pages.on ? " on" : ""}`} onClick={() => toggleMat("pages")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMat("pages"); } }}>Sample pages</div>
          <div className={`sa-aa-chip${materials.chapters.on ? " on" : ""}`} onClick={() => toggleMat("chapters")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMat("chapters"); } }}>Chapters</div>
          <div className={`sa-aa-chip${materials.words.on ? " on" : ""}`} onClick={() => toggleMat("words")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMat("words"); } }}>Word count</div>
          <div className={`sa-aa-chip${materials.other.on ? " on" : ""}`} onClick={() => toggleMat("other")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMat("other"); } }}>Other</div>
        </div>
        {(materials.pages.on || materials.chapters.on || materials.words.on || materials.other.on) && (
          <div className="sa-aa-mat-details">
            {materials.pages.on && (
              <label className="sa-aa-mat-d">
                First
                <input
                  inputMode="numeric"
                  value={materials.pages.count}
                  onChange={(e) => setMaterials((p) => ({ ...p, pages: { ...p.pages, count: e.target.value.replace(/\D/g, "") } }))}
                />
                pages
              </label>
            )}
            {materials.chapters.on && (
              <label className="sa-aa-mat-d">
                First
                <input
                  inputMode="numeric"
                  value={materials.chapters.count}
                  onChange={(e) => setMaterials((p) => ({ ...p, chapters: { ...p.chapters, count: e.target.value.replace(/\D/g, "") } }))}
                />
                chapters
              </label>
            )}
            {materials.words.on && (
              <label className="sa-aa-mat-d">
                <input
                  className="wide"
                  inputMode="numeric"
                  placeholder="85,000"
                  value={materials.words.count}
                  onChange={(e) => setMaterials((p) => ({ ...p, words: { ...p.words, count: e.target.value } }))}
                />
                words
              </label>
            )}
            {materials.other.on && (
              <label className="sa-aa-mat-d">
                <input
                  className="other-in"
                  placeholder="Other materials — comp titles, pitch, first line…"
                  value={materials.other.text}
                  onChange={(e) => setMaterials((p) => ({ ...p, other: { ...p.other, text: e.target.value } }))}
                />
              </label>
            )}
          </div>
        )}
      </FormField>

      <FormField label="Response policy">
        <BrandDropdown value={responsePolicy} options={POLICY_OPTIONS} onChange={setResponsePolicy} />
      </FormField>

      {/* ── Your take ───────────────────────────────────────────────── */}
      <div className="sa-section">Your take</div>

      <FormField label="Agent fit">
        <div className="sa-aa-fit-q">How good a match are they for you?</div>
        <div className="sa-aa-fit-rate">
          <div className="sa-aa-stars" onMouseLeave={() => setHoverStar(null)} role="radiogroup" aria-label="Agent fit">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={starRating === v}
                aria-label={`${v} — ${FIT_MEANING[v - 1]}`}
                className={`sa-aa-star${fitShown >= v ? " on" : ""}`}
                onMouseEnter={() => setHoverStar(v)}
                onClick={() => setStarRating(v as 1 | 2 | 3 | 4 | 5)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 2.2l2.95 6.32 6.85.86-5.05 4.74 1.32 6.78L12 18.4l-6.07 3.3 1.32-6.78L2.2 9.38l6.85-.86z" />
                </svg>
              </button>
            ))}
          </div>
          <span className="sa-aa-fit-meaning">{FIT_MEANING[fitShown - 1]}</span>
        </div>
        <div className="sa-aa-fit-note">
          This field is subjective, but can be a useful metric as you build your contact list.
        </div>
      </FormField>

      <FormField label={<>Private notes <span className="sa-opt">only you see these</span></>}>
        <textarea
          className="sa-input sa-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Met at a conference, prefers a short query, championed a debut similar to mine…"
        />
      </FormField>

      {formError && <div className="sa-error">{formError}</div>}
    </FormShell>
  );
};
