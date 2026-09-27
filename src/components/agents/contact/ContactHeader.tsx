/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's pieces of the shared full header (page header v2 §4; ref
 * design-refs/page-header/contact-list-header-v5.html): the intro sentence and the quick-add card
 * "+ Add an agent" drops beneath the actions. The header itself is `PageHeader variant="full"` —
 * the same component, the same frame and the same rule as the Query Centre's.
 *
 * ⚠️ THE v11 HERO IS RETIRED WITH ITS PLACEMENT MACHINERY. `ContactHero`, `heroLayout`, `place()`
 * and the blank card drawn over the Archivist's art are gone: the card no longer sits in the
 * drawing, so there is nothing to solve a layout chain for. The drawing is the hawk alone,
 * cropped from the same source (`scripts/crop-contact-hawk.mjs`), standing on the rule.
 */
import React, { useEffect, useRef } from "react";
import type { HeroFacts } from "../../../lib/contactList";

/** The hawk, cropped from `/images/contact/hero-archivist.png` with the drawn card removed. */
export const CONTACT_HAWK = { src: "/images/contact/contact-hawk.webp", version: "1", width: 389, height: 344 };

/**
 * The intro, in runs from the one derivation — the manuscript's title in the typewriter face and
 * full ink, the counts in the serif at 600. Only the clauses the data has are stated.
 */
export const ContactIntro: React.FC<{ f: HeroFacts }> = ({ f }) => (
  <>
    {f.total} agent{f.total === 1 ? "" : "s"} on file{f.msTitle ? <> for <span className="ph-ms">{f.msTitle}</span></> : null}.
    {f.genre ? (
      <>
        {" "}<strong>{f.want} of them</strong> want {f.genre}, and <strong>{f.fresh} of those</strong> you haven&rsquo;t queried yet.
      </>
    ) : null}
  </>
);

export interface ContactQuickAddProps {
  /** Opens the real add card, with the name field focused or the link field focused. */
  onOpen: (focus: "name" | "link") => void;
  onClose: () => void;
  /** The "+ Add an agent" button: a press on it is not an outside press (it toggles). */
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * The quick-add card: 340px, 10px below the actions, over the page. Its fields are placeholders,
 * never values — clicking into it opens `ContactAddCard`, as the blank card did.
 *
 * ⚠️ DISMISSAL IS A `pointerdown` CAPTURE plus Escape, the switcher's idiom. The anchor counts as
 * inside, or its own click would close the card on the press and re-open it on the click.
 */
export const ContactQuickAdd: React.FC<ContactQuickAddProps> = ({ onOpen, onClose, anchorRef }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    goRef.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      anchorRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  return (
    <div className="clv-qa" data-clv="quickadd" role="group" aria-label="Add new agent" ref={rootRef}>
      <button type="button" className="clv-qa-go" ref={goRef} onClick={() => onOpen("name")}>
        <span className="clv-qa-hd">Add new agent</span>
        <span className="clv-qa-bd">
          <span className="clv-qa-nm"><i aria-hidden="true" /><b>Agent&rsquo;s name</b></span>
          <span className="clv-qa-f">Agency</span>
          <span className="clv-qa-f">Location · reply time</span>
          <span className="clv-qa-f">Genres sought</span>
          <span className="clv-qa-f">Materials requested</span>
        </span>
      </button>
      <span className="clv-qa-ln">
        <span>Or paste a link</span>
        <button type="button" onClick={() => onOpen("link")}>Fill in</button>
      </span>
    </div>
  );
};
