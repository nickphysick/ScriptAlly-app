/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactAddCard — adding an agent (v11 §8). The pop-up's own chassis (slate band, 520 card,
 * `max-height: calc(100vh − 32px)`) around the SAME `ContactAgentForm` the edit face renders —
 * §7.3's whole point, so the two can never drift — plus the three things only the add card has:
 * the start-from-a-link panel, the duplicate check, and the disabled-until rule.
 *
 * ⚠️ FILL IN IS DELIBERATELY NOT RENDERED (§8.3). Nothing in the app fetches and reads a web
 * page client-side (the P0 report's sweep: the only fetchers are the waitlist client and the
 * server-side functions), so a FILL IN button would be a control that cannot act — the inert
 * family. The link FIELD is built and saves to the agent's `website`; `FromLinkTag` and
 * `FilledCountLine` below are the follow-up's components, exported and mounted nowhere.
 *
 * ⚠️ THE DUPLICATE CHECK BLOCKS, AND OPEN CARD IS THE WAY THROUGH (§8.2): a name matching an
 * agent already on the list (case-insensitive, trimmed — `findDuplicateAgent`) shows the blush
 * line and disables Add; OPEN CARD closes this and opens that agent's pop-up, because the right
 * fix for "they already exist" is their record, not a second one.
 *
 * ⚠️ TYPING NEVER RE-RENDERS THE FORM (§8.2/§11.9) — the same law the edit face carries: the
 * draft lives here, the form's inputs are controlled, and the disc, the duplicate line and the
 * Add button update in place. §11.9 holds the focused element to be the SAME NODE across a
 * keystroke, on the rendered page.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent } from "../../../types";
import { ContactDraft, emptyContactDraft } from "../../../lib/contactEdit";
import { findDuplicateAgent } from "../../../lib/contactList";
import { ContactAgentForm } from "./ContactAgentForm";

/* ── §8.3's parked components — the reader's dress, mounted nowhere until it exists ────────── */

/** The tag a section filled from a link wears until it is edited (§8.3 — unused, deliberate). */
export const FromLinkTag: React.FC = () => (
  <span className="clv-fromlink" data-clv="fromlink">FROM LINK</span>
);

/** The count line under the link panel once a page has been read (§8.3 — unused, deliberate). */
export const FilledCountLine: React.FC<{ n: number }> = ({ n }) => (
  <div className="clv-filledline" data-clv="filledline">
    Filled {n} field{n === 1 ? "" : "s"} from the page. Check them before you add.
  </div>
);

export interface ContactAddCardProps {
  /** which field opens focused: the hero card's body → name; its paste strip → link (§3.4) */
  focus: "name" | "link";
  agents: readonly Agent[];
  msGenre: string | null;
  genrePool: string[];
  onClose: () => void;
  /** the write — the page owns the db call; the card owns the draft */
  onCreate: (draft: ContactDraft, link: string) => Promise<{ ok: boolean; error?: string }>;
  /** OPEN CARD on the duplicate line — closes this, opens that agent's pop-up */
  onOpenAgent: (id: string) => void;
}

export const ContactAddCard: React.FC<ContactAddCardProps> = ({
  focus, agents, msGenre, genrePool, onClose, onCreate, onOpenAgent,
}) => {
  const [draft, setDraft] = useState<ContactDraft>(emptyContactDraft);
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement | null>(null);

  /* the opening focus — preventScroll, the house rule, though a centred card has nowhere to go.
     The name field is queried off the rendered card rather than ref-threaded through the form
     for one call site. */
  useEffect(() => {
    const el = focus === "link" ? linkRef.current : (document.querySelector('[data-clv="addcard"] [data-clv="f-name"]') as HTMLInputElement | null);
    el?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Escape closes — one capture handler; the country picker's own capture consumes its first */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onClose]);

  const dup = useMemo(() => findDuplicateAgent(draft.name, agents), [draft.name, agents]);
  const ready = draft.name.trim().length > 0 && draft.agency.trim().length > 0 && !dup && !saving;

  const add = useCallback(async () => {
    if (!ready) return;
    setSaving(true);
    setError(null);
    const res = await onCreate(draft, link.trim());
    setSaving(false);
    if (!res.ok) setError(res.error ?? "Couldn't add the agent.");
    /* on ok the page closes this card and rings the new row (§8.4) */
  }, [ready, draft, link, onCreate]);

  return createPortal(
    <div
      className="clv-ov clv-ov--edit"
      data-clv="add-ov"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <article className="clv-ac clv-pcard clv-pcard--edit" data-clv="addcard" role="dialog" aria-modal="true" aria-label="New agent">
        <div className="clv-frame">
          <div className="clv-ac-band clv-pband clv-pband--slate">
            <span className="clv-addttl">New agent</span>
            <button type="button" className="clv-ib" data-clv="close" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="clv-pscroll" data-clv="pbody">
            <ContactAgentForm
              draft={draft}
              onDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
              msGenre={msGenre}
              genrePool={genrePool}
              focusSection={null}
              linkPanel={
                <div className="clv-lpanel" data-esec="link">
                  <span className="clv-lpanel-k">Start from a link</span>
                  <input
                    ref={linkRef}
                    className="clv-fin clv-fin--mono"
                    value={link}
                    placeholder="Agency page, MSWL or QueryTracker"
                    aria-label="Agency page, MSWL or QueryTracker"
                    data-clv="f-link"
                    onChange={(e) => setLink(e.target.value)}
                  />
                  {/* FILL IN deliberately absent — see the header note; the link saves to website */}
                </div>
              }
              duplicate={dup ? (
                <div className="clv-dup" data-clv="dup" role="status">
                  <span>{(dup.name ?? "").trim() || dup.agency} is already on your list</span>
                  <button type="button" className="clv-dup-open" data-clv="dup-open" onClick={() => onOpenAgent(dup.id)}>
                    OPEN CARD
                  </button>
                </div>
              ) : null}
            />
          </div>
          <div className="clv-ffoot2">
            <span className="clv-hint" data-clv="add-hint">{error ?? "Only a name and agency are needed now"}</span>
            <button type="button" className="clv-cx" onClick={onClose}>Cancel</button>
            <button type="button" className="clv-done" data-clv="add-save" disabled={!ready} onClick={() => void add()}>
              Add agent
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
};
