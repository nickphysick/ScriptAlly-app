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
import React, { useRef } from "react";
import { AlertCircle, Camera, Check } from "lucide-react";
import { AgentDraft, AgentEditorTab, DraftError } from "../../lib/agentDraft";
import { agentInitials } from "../../lib/agentDisplay";
import { compressAgentImage, AgentImageError } from "../../lib/agentImage";

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
}

export const AgentEditor: React.FC<AgentEditorProps> = ({
  draft, onChange, tab, onTab, onDone, error, onImageError, isNew,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

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
          {/* Phase 4 fills contact + wishlist; Phase 5 fills materials + notes. */}
          <p className="agl-placeholder">
            {tab === "contact" && "Contact fields arrive in Phase 4."}
            {tab === "wishlist" && "Wishlist fields arrive in Phase 4."}
            {tab === "materials" && "Materials rows arrive in Phase 5."}
            {tab === "notes" && "Notes arrive in Phase 5."}
          </p>
        </div>
      </div>
    </div>
  );
};
