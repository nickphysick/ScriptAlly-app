/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgentDrawer — the agent, opened. Read by default; Edit in the footer.
 *
 * ⚠️ IT IS THE SHARED `SlideOver`, NOT A FOURTH DRAWER. That primitive was written naming three
 * unmigrated adopters and mounted by exactly one page; this is its second real mount, and using
 * it is the whole reason it exists. What this file owns is the HEAD, the tabs and the read views —
 * the scrim, the two durations, the Escape listener and the reduced-motion block are not
 * re-implemented here.
 *
 * ⚠️ READ IS THE DEFAULT, AND THE READ VIEW IS THE PEEK PLUS THREE ROWS. `ContactPeek` owns
 * email, submissions page, location, approach-by and socials in all three of its containers; this
 * drawer APPENDS typical response, if-they-don't-reply and the door, and re-implements none of
 * the five. `contactFields.test.tsx` requires the editor's field set and the read view's to be
 * equal in both directions, so a field that can be edited and not seen fails rather than ships.
 *
 * ⚠️ THE CHEVRONS ARE DISABLED WHILE EDITING, AND THAT IS THE RULING RATHER THAN A LIMITATION.
 * Stepping to the next agent mid-edit has exactly two honest outcomes — commit silently, or
 * discard silently — and both are the app deciding something about a writer's work that the
 * writer did not say. A confirm dialogue would be a second Escape-consuming layer inside a drawer
 * that already has one. Save and Cancel are in the footer, one click away, and both are labelled;
 * blocking the step commits nothing and discards nothing, structurally rather than by care.
 *
 * ⚠️ THE DRAFT SURVIVES A TAB SWITCH, and that is why the draft lives with the PAGE rather than
 * here: the tabs are a view onto one buffer, not four forms. Save commits the single
 * `updateAgent(diff)`; Cancel discards and returns to read.
 *
 * ⚠️ WHILE EDITING, THE DRAWER IS THE CONTAINER AND NOTHING ELSE — no head, no tabs, no footer.
 * `AgentEditor` is a COMPLETE form that already owns all three: an identity head with the avatar
 * picker and the star control, its own four tabs, and Done and Discard with the dirty-discard
 * confirmation. Wrapping it in a second set drew the agent's name and avatar twice, stacked two
 * tab rows, and offered two ways to save — and the second tablist was not merely untidy: it made
 * `getByRole("tab", { name: "Materials" })` ambiguous, which is the accessibility tree saying the
 * same thing a strict-mode violation says. Hosting the form WHOLE is one control per job.
 *
 * The chevrons and the door pill go with the head, and nothing is lost: the chevrons are disabled
 * mid-edit by the ruling above, so they were furniture in that state anyway.
 */
import React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { SlideOver } from "../shared/SlideOver";
import { ContactPeek } from "./ContactPeek";
import { Agent } from "../../types";
import { AgentEditorTab } from "../../lib/agentDraft";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { isDoorOpen, wishlistChips } from "../../lib/agentList";
import { materialSlots, slotTip } from "../../lib/agentMaterials";
import { isGenreMatch } from "../../lib/genreMatch";
import { WISHLIST_EMPTY } from "./AgentCard";

const TABS: { key: AgentEditorTab; label: string }[] = [
  { key: "contact", label: "Contact" },
  { key: "wishlist", label: "Wishlist" },
  { key: "materials", label: "Materials" },
  { key: "notes", label: "Notes" },
];

/** Display-only amber stars — an UNRATED agent shows none, never five hollow. */
const Stars: React.FC<{ rating?: number }> = ({ rating }) => {
  if (!rating || rating < 1) return null;
  return (
    <span className="agl-stars" aria-label={`${rating} of 5 — fit`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"
            fill={i <= rating ? "#BA7517" : "none"} stroke={i <= rating ? "#BA7517" : "#c9bda9"} strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
};

const DRow: React.FC<{ field: string; label: string; children: React.ReactNode }> = ({ field, label, children }) => (
  <div className="agl-prow" data-field={field}>
    <span className="agl-pk">{label}</span>
    <span className="agl-pv">{children}</span>
  </div>
);

/**
 * The three rows the peek has no business with. Appended, never folded into it: the peek is
 * "how to reach them" and these are "what to expect", and the peek renders in two containers
 * that have no room for them.
 */
const ContactExtras: React.FC<{ agent: Agent }> = ({ agent }) => {
  const weeks = agent.responseTimeWeeks;
  const nrn = agent.noResponseMeansNo;
  return (
    <>
      <DRow field="responseTimeWeeks" label="Typical response">
        {weeks && weeks > 0
          ? `About ${weeks} ${weeks === 1 ? "week" : "weeks"}`
          : <span className="agl-pnone">Not stated</span>}
      </DRow>
      {/* ⚠️ THREE STATES, AND UNSET IS ONE OF THEM. Absent is not "they reply either way" — it is
          that nobody has said, and the editor's third radio writes exactly that. */}
      <DRow field="noResponseMeansNo" label="If they don’t reply">
        {nrn === true ? "Treat it as a pass"
          : nrn === false ? "They reply either way"
          : <span className="agl-pnone">Not stated</span>}
      </DRow>
      <DRow field="submissionStatus" label="Their door">
        {isDoorOpen(agent) ? "Open to queries" : "Closed to queries"}
      </DRow>
    </>
  );
};

export interface AgentDrawerProps {
  agent: Agent | null;
  open: boolean;
  tab: AgentEditorTab;
  onTab: (t: AgentEditorTab) => void;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  /** Step to the previous/next agent in the list's own order. Null at the ends — never wraps. */
  onStep: (delta: -1 | 1) => void;
  canStepBack: boolean;
  canStepOn: boolean;
  /** Position in the list, for the footer's "n of m". */
  position: { index: number; total: number } | null;
  /** The genre to tint, already normalised — null means no claim. */
  matchGenre: string | null;
  /** The editor, mounted by the page so the draft outlives a tab switch. */
  editor: React.ReactNode;
  /** Log a query against this agent. */
  onLogQuery: (agent: Agent) => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  agent, open, tab, onTab, editing, onEdit, onClose,
  onStep, canStepBack, canStepOn, position, matchGenre, editor, onLogQuery,
}) => {
  /* ⚠️ ARROWS STEP ONLY WHEN A STEP IS ALLOWED, and the guard is the same expression the buttons
     read — one derivation, so the keyboard and the chevrons cannot disagree about whether the
     drawer is navigable. Skipped while an editable has focus, or typing a `w` would move you. */
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (editing) return;
      const back = e.key === "ArrowUp";
      if (back ? !canStepBack : !canStepOn) return;
      e.preventDefault();
      onStep(back ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editing, canStepBack, canStepOn, onStep]);

  if (!agent) return null;
  const openDoor = isDoorOpen(agent);
  const name = agentPrimary(agent);
  const { shown } = wishlistChips(agent, 99);
  const mswl = (agent.mswlNotes || "").trim();
  const slots = materialSlots(agent.materialsWanted);

  return (
    <SlideOver open={open} onClose={onClose} label={`${name} — contact record`} width={580} fullBleedBelowMd>
      {editing ? (
        /* THE FORM, WHOLE — see the header. It brings its own head, tabs, Done and Discard. */
        <div className="agl-dedit">{editor}</div>
      ) : (
        <>
          <div className={`agl-dhead ${openDoor ? "s-open" : "s-shut"}`}>
            <div className="agl-dtop">
              <button type="button" className="agl-cbtn" onClick={onClose} aria-label="Close">
                <X width={12} height={12} aria-hidden="true" />
              </button>
              <span className="agl-doorpill">{openDoor ? "Open to queries" : "Closed to queries"}</span>
              <span className="agl-sp" />
              <button type="button" className="agl-cbtn" onClick={() => onStep(-1)} disabled={!canStepBack} aria-label="Previous agent">
                <ChevronLeft width={12} height={12} aria-hidden="true" />
              </button>
              <button type="button" className="agl-cbtn" onClick={() => onStep(1)} disabled={!canStepOn} aria-label="Next agent">
                <ChevronRight width={12} height={12} aria-hidden="true" />
              </button>
            </div>
            <div className="agl-dwho">
              <div className="agl-av agl-av-lg">
                {agent.image ? <img src={agent.image} alt="" /> : <div className="ini">{agentInitials(agent)}</div>}
              </div>
              <div className="agl-whotx">
                {/* the head IS the name and agency row — the read view does not repeat them below */}
                <div className="agl-dname" data-field="name">{name}</div>
                <div className="agl-agency" data-field="agency">{agentSecondary(agent)}</div>
                <div className="agl-dstars"><Stars rating={agent.starRating} /></div>
              </div>
            </div>
          </div>

          <div className="agl-dtabs" role="tablist" aria-label="Agent record">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                className={`agl-dtab${tab === t.key ? " on" : ""}`} onClick={() => onTab(t.key)}>{t.label}</button>
            ))}
          </div>

          <div className="agl-dbody" role="tabpanel">
            {tab === "contact" && <ContactPeek agent={agent} variant="drawer" append={<ContactExtras agent={agent} />} />}

            {tab === "wishlist" && (
              <div className="agl-dsect">
                <span className="agl-slab">Genres sought</span>
                <div className="agl-chips">
                  {shown.length
                    ? shown.map((g) => <span className={`agl-chip${isGenreMatch(g, matchGenre) ? " agl-chip-match" : ""}`} key={g}>{g}</span>)
                    : <span className="agl-absent">No genres recorded.</span>}
                </div>
                <span className="agl-slab agl-slab-gap">Manuscript wishlist</span>
                {mswl ? <p className="agl-dmswl">{mswl}</p> : <p className="agl-absent">{WISHLIST_EMPTY}</p>}
              </div>
            )}

            {tab === "materials" && (
              <div className="agl-dsect">
                <span className="agl-slab">What they ask for with a query</span>
                {slots.map((s) => (
                  <DRow key={s.key} field={`material-${s.key}`} label={s.name}>
                    {s.asked ? (s.detail ?? s.name) : <span className="agl-pnone">Not asked for</span>}
                  </DRow>
                ))}
              </div>
            )}

            {/* ⚠️ NOTES IS THE EDITOR EVEN IN READ, and that is the store rather than a shortcut:
                notes live in a subcollection with a composer, and there is no read-only rendering
                of them anywhere in the app. It is the same element the edit mode hosts. */}
            {tab === "notes" && <div className="agl-dsect agl-dnotes">{editor}</div>}
          </div>

          <div className="agl-dfoot">
            {openDoor ? (
              <button type="button" className="agl-btn agl-btn-dark" onClick={() => onLogQuery(agent)}>Log query</button>
            ) : (
              <button type="button" className="agl-btn" disabled title="Closed for submissions at the moment">Log query</button>
            )}
            <button type="button" className="agl-btn agl-btn-ghost" onClick={onEdit}>Edit</button>
            <span className="agl-sp" />
            {position && <span className="agl-dpos">{position.index + 1} of {position.total}</span>}
          </div>
        </>
      )}
    </SlideOver>
  );
};
