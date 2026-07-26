/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the editor FACE (design authority: design-refs/agent-list-mockup.html).
 *
 * Phase 3 ships the shell: header (avatar-as-uploader, name, clickable stars + tooltip, Done),
 * the four underline tabs, the pink error strip that routes to the offending tab, and the buffered
 * draft plumbing. Tab CONTENT arrives in Phase 4 (Contact / Wishlist) and Phase 5 (Materials /
 * Notes) — the placeholders below are the only thing those phases replace.
 *
 * Buffered editing (decision 1): this component never writes. It mutates the draft its parent owns
 * and calls `onDone`, which validates, diffs and commits ONE update. Escape discards.
 */
import React, { useRef, useState } from "react";
import { AlertCircle, Camera, Check } from "lucide-react";
import { AgentDraft, AgentEditorTab, DraftError, nrnState, nrnSubtitle } from "../../lib/agentDraft";
import { agentInitials } from "../../lib/agentDisplay";
import { compressAgentImage, AgentImageError } from "../../lib/agentImage";
import { AgentCountryPicker } from "./AgentCountryPicker";
import { SubmissionMethod } from "../../types";

/** Decision 9's platform list — deliberately its own, not agentOptions.SOCIAL_PLATFORMS. */
const PLATFORMS = [
  "X (Twitter)", "Instagram", "Bluesky", "Threads", "TikTok",
  "Facebook", "LinkedIn", "YouTube", "Substack", "Other",
];

const TABS: { key: AgentEditorTab; label: string }[] = [
  { key: "contact", label: "Contact" },
  { key: "wishlist", label: "Wishlist" },
  { key: "materials", label: "Materials" },
  { key: "notes", label: "Notes" },
];

interface AgentEditorProps {
  draft: AgentDraft;
  /** Patch the draft in place — the parent holds it; nothing here touches Firestore. */
  onChange: (patch: Partial<AgentDraft>) => void;
  tab: AgentEditorTab;
  onTab: (tab: AgentEditorTab) => void;
  /** Validate + diff + commit the single write. */
  onDone: () => void;
  /** The blocking validation result, if Done has been refused. */
  error: DraftError | null;
  /** Surfaces an image-rejection message through the same strip. */
  onImageError: (message: string) => void;
  isNew: boolean;
  /** Drives the response-time caution — true when this agent has any non-terminal query. */
  hasActiveQueries: boolean;
}

export const AgentEditor: React.FC<AgentEditorProps> = ({
  draft, onChange, tab, onTab, onDone, error, onImageError, isNew, hasActiveQueries,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [genreInput, setGenreInput] = useState("");
  const [socPlatform, setSocPlatform] = useState(PLATFORMS[0]);
  const [socHandle, setSocHandle] = useState("");

  const addGenre = () => {
    const g = genreInput.trim();
    if (!g || draft.genres.includes(g)) { setGenreInput(""); return; }
    onChange({ genres: [...draft.genres, g] });
    setGenreInput("");
  };
  const addSocial = () => {
    const h = socHandle.trim();
    if (!h) return;
    onChange({ socials: [...draft.socials, { platform: socPlatform, handle: h }] });
    setSocHandle("");
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange({ image: await compressAgentImage(file) });
    } catch (e) {
      onImageError(e instanceof AgentImageError ? e.message : "That image couldn't be used.");
    }
  };

  return (
    <div className="agl-acard">
      <div className="agl-ehead">
        <div
          className="agl-av"
          role="button"
          tabIndex={0}
          title="Change photo"
          aria-label="Change photo"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
        >
          {draft.image ? <img src={draft.image} alt="" /> : <div className="ini">{agentInitials(draft)}</div>}
          <span className="cam" aria-hidden="true"><Camera width={15} height={15} /></span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }}
        />

        <div className="agl-ewho">
          <div className="agl-epre">{isNew ? "New agent" : "Editing"}</div>
          <div className="agl-ename">{draft.name.trim() || "Unnamed agent"}</div>
          <div className="agl-estars">
            <span className="agl-startip">How good a fit is this agent for you?</span>
            <span className="agl-stars clickable" role="radiogroup" aria-label="Fit rating">
              {[1, 2, 3, 4, 5].map((i) => {
                const on = !!draft.starRating && i <= draft.starRating;
                return (
                  <svg
                    key={i}
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    role="radio"
                    aria-checked={draft.starRating === i}
                    aria-label={`${i} of 5`}
                    tabIndex={0}
                    onClick={() => onChange({ starRating: i as 1 | 2 | 3 | 4 | 5 })}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange({ starRating: i as 1 | 2 | 3 | 4 | 5 }); } }}
                  >
                    <path
                      d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"
                      fill={on ? "#BA7517" : "transparent"}
                      stroke={on ? "#BA7517" : "#c9bda9"}
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                    />
                  </svg>
                );
              })}
            </span>
          </div>
        </div>

        <button type="button" className="agl-done" onClick={onDone} title="Done" aria-label="Done">
          <Check width={14} height={14} aria-hidden="true" />
        </button>
      </div>

      <div className="agl-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`agl-tab${tab === t.key ? " on" : ""}`}
            onClick={() => onTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="agl-panes">
        {error && (
          <div className="agl-errstrip" role="alert">
            <AlertCircle width={14} height={14} aria-hidden="true" />
            <span>{error.msg}</span>
          </div>
        )}
        <div className="agl-pane" key={tab} role="tabpanel">
          {tab === "contact" && (
            <>
              {/* the door — mockup fills the active segment INK (the band drives the switch below) */}
              <div className="agl-door" role="group" aria-label="Submission status">
                <button type="button" className={draft.open ? "on" : ""} aria-pressed={draft.open} onClick={() => onChange({ open: true })}>
                  Open to queries
                </button>
                <button type="button" className={!draft.open ? "on" : ""} aria-pressed={!draft.open} onClick={() => onChange({ open: false })}>
                  Closed to queries
                </button>
              </div>

              <div className="agl-row2">
                <div className="agl-field">
                  <label className="agl-label" htmlFor="agl-name">Agent name</label>
                  <input id="agl-name" type="text" className="agl-in" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} />
                </div>
                <div className="agl-field">
                  <label className="agl-label" htmlFor="agl-agency">Agency</label>
                  <input id="agl-agency" type="text" className="agl-in" value={draft.agency} onChange={(e) => onChange({ agency: e.target.value })} />
                </div>
              </div>

              <div className="agl-field">
                <label className="agl-label" htmlFor="agl-email">Email</label>
                <input id="agl-email" type="text" className="agl-in" value={draft.email} placeholder="name@agency.co.uk" onChange={(e) => onChange({ email: e.target.value })} />
              </div>

              {/* Location — a real, rules-validated field. Country goes through the constrained
                  ISO picker (free text would produce writes isKnownCountry rejects); city is plain. */}
              <div className="agl-row2">
                <div className="agl-field">
                  <label className="agl-label" htmlFor="agl-country">Country</label>
                  <AgentCountryPicker id="agl-country" value={draft.country} onChange={(next) => onChange({ country: next })} />
                </div>
                <div className="agl-field">
                  <label className="agl-label" htmlFor="agl-city">City</label>
                  <input id="agl-city" type="text" className="agl-in" value={draft.city} placeholder="London" onChange={(e) => onChange({ city: e.target.value })} />
                </div>
              </div>

              <div className="agl-field">
                <label className="agl-label" htmlFor="agl-site">Submissions page</label>
                <input id="agl-site" type="text" className="agl-in" value={draft.website} placeholder="https://…" onChange={(e) => onChange({ website: e.target.value })} />
              </div>

              <div className="agl-row2">
                <div className="agl-field">
                  <label className="agl-label" htmlFor="agl-weeks">Typical response (weeks)</label>
                  <input
                    id="agl-weeks"
                    type="text"
                    className="agl-in"
                    inputMode="numeric"
                    value={draft.responseWeeks}
                    placeholder="Leave blank if unknown"
                    onChange={(e) => onChange({ responseWeeks: e.target.value })}
                  />
                  {/* revealed by :focus-within, and only when queries are actually in flight */}
                  {hasActiveQueries && (
                    <p className="agl-caution">
                      You have live queries with this agent — changing this alters when they'll show as overdue.
                    </p>
                  )}
                </div>
                <div className={`agl-field agl-nrn ${nrnState(draft.noResponseMeansNo)}`}>
                  <label className="agl-label">No response means no</label>
                  <div className="ctlrow">
                    <button
                      type="button"
                      className={`agl-sw${draft.noResponseMeansNo ? " on" : ""}`}
                      role="switch"
                      aria-checked={!!draft.noResponseMeansNo}
                      aria-label="No response means no"
                      onClick={() => onChange({ noResponseMeansNo: !draft.noResponseMeansNo })}
                    />
                    <p className="subl">{nrnSubtitle(draft.noResponseMeansNo)}</p>
                  </div>
                </div>
              </div>

              <div className="agl-field">
                <label className="agl-label" htmlFor="agl-method">Submission method</label>
                <select
                  id="agl-method"
                  className="agl-in"
                  value={draft.submissionMethod}
                  onChange={(e) => onChange({ submissionMethod: e.target.value as SubmissionMethod | "Other" })}
                >
                  <option value={SubmissionMethod.EMAIL}>Email</option>
                  <option value={SubmissionMethod.ONLINE_FORM}>Online Form</option>
                  <option value="Other">Other</option>
                </select>
                {draft.submissionMethod === "Other" && (
                  <div className="agl-method-other">
                    <input
                      type="text"
                      className="agl-in"
                      value={draft.methodOther}
                      placeholder="Describe how they take submissions"
                      onChange={(e) => onChange({ methodOther: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <label className="agl-label">Social media</label>
              <div className="agl-soc-list">
                {draft.socials.length ? (
                  draft.socials.map((sc, i) => (
                    <div className="agl-soc-row" key={`${sc.platform}-${i}`}>
                      <span className="plat">{sc.platform}</span>
                      <span className="hnd">{sc.handle}</span>
                      <button
                        type="button"
                        className="agl-x"
                        aria-label={`Remove ${sc.platform}`}
                        onClick={() => onChange({ socials: draft.socials.filter((_, j) => j !== i) })}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="agl-none">None added yet.</span>
                )}
              </div>
              <div className="agl-soc-add">
                <select className="agl-in" value={socPlatform} onChange={(e) => setSocPlatform(e.target.value)} aria-label="Platform">
                  {PLATFORMS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                </select>
                <input
                  type="text"
                  className="agl-in"
                  value={socHandle}
                  placeholder="@handle or URL"
                  aria-label="Handle or URL"
                  onChange={(e) => setSocHandle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSocial(); } }}
                />
                <button type="button" className="agl-btn agl-btn-ghost agl-btn-sm" onClick={addSocial}>Add</button>
              </div>
            </>
          )}

          {tab === "wishlist" && (
            <>
              <p className="agl-pane-sub">What they've said they're looking for. Genres show on the card face.</p>
              <label className="agl-label">Genres &amp; categories</label>
              <div className="agl-editables">
                {draft.genres.length ? (
                  draft.genres.map((g, i) => (
                    <span className="agl-echip" key={`${g}-${i}`}>
                      <span>{g}</span>
                      <button
                        type="button"
                        className="agl-x"
                        aria-label={`Remove ${g}`}
                        onClick={() => onChange({ genres: draft.genres.filter((_, j) => j !== i) })}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="agl-none">Nothing added yet.</span>
                )}
              </div>
              <div className="agl-add-row">
                <input
                  type="text"
                  className="agl-in"
                  value={genreInput}
                  placeholder="Add a genre and press enter"
                  aria-label="Add a genre"
                  onChange={(e) => setGenreInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGenre(); } }}
                />
                <button type="button" className="agl-btn agl-btn-ghost agl-btn-sm" onClick={addGenre}>Add</button>
              </div>
              <div className="agl-field">
                <label className="agl-label" htmlFor="agl-mswl">Manuscript wish list</label>
                <textarea
                  id="agl-mswl"
                  className="agl-in"
                  rows={4}
                  value={draft.mswlNotes}
                  placeholder="Paste or paraphrase what they've said they want…"
                  onChange={(e) => onChange({ mswlNotes: e.target.value })}
                />
                <p className="agl-hint">their words are more useful than your summary</p>
              </div>
            </>
          )}

          {tab === "materials" && <p className="agl-placeholder">Materials rows arrive in Phase 5.</p>}
          {tab === "notes" && <p className="agl-placeholder">Notes arrive in Phase 5.</p>}
        </div>
      </div>
    </div>
  );
};
