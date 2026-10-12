/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 §2, v15.3 §2–3 — THE OPEN HEADER: no card, no band, no container. A two-column grid on the page —
 * the text block (the HERO NUMBER: the count large with "agents on file" beside it; one line under it; a row of agent
 * FACES coloured by query status, with a key; two buttons) and the flying hawk to its right, the two centred against
 * each other — closed by a hairline.
 *
 * ⚠️ THE FACES ARE `aria-hidden`; THE KEY IS THE TEXT. A disc is a pointer shortcut into that agent's card and carries
 * a tooltip; the key's three counts (every agent, never the discs shown) are what a reader is told.
 * ⚠️ THE ROW NEVER PUSHES INTO THE DRAWING: it is measured against the room the text block has (the header, less the
 * drawing and the column gap) and discs are dropped FROM THE END until it fits — never the key. The reading is of the
 * header's own width, which dropping a disc cannot move, so the answer cannot feed back into the question.
 *
 * ⚠️ PAGE-LOCAL, NOT `PageHeader` (ruling 8): the shared header has no hero-number typewriter title, no form without an
 * eyebrow, and no drawing in the flow beside the text. `/agents` therefore sits in the e2e censuses' own-header
 * list (`tests/e2e/plateRoutes.ts` OWN_HEADER_ROUTES), not the band or compact lists.
 *
 * ⚠️ THE TITLE KEEPS `data-page-title`, the hook the shared header gives every page title, so anything that asks
 * "has the page's title scrolled past?" finds this one too.
 *
 * ⚠️ THE ART IS SWAPPABLE BY FILE: no version query and no size the layout depends on — the sheet sets the width,
 * and the attributes only carry the drawing's ratio (a 2× export keeps it).
 */
import React from "react";
import { PanelHeader } from "../../shell/PanelHeader";
import "../../shell/headerPanel.css";
import "./contactV15.css";
import "./contactV16.css";

/**
 * THE DESK'S THREE ILLUSTRATIONS (header panel v2, Part D) — SLOTS, EMPTY UNTIL THE ARTIST'S FILES ARRIVE. Each badge
 * card's strip holds a 76 × 56 (60 × 50) box: a dashed placeholder reading "Art to come" while its slot is `null`, and
 * the image in the same box, with no dashes, once it is set. No layout change either way.
 */
export interface ContactArt { src: string; width: number; height: number }
export const CONTACT_DESK_ART_WEEK: ContactArt | null = null;
export const CONTACT_DESK_ART_QUERIED: ContactArt | null = null;
export const CONTACT_DESK_ART_PROFILES: ContactArt | null = null;

/** v16 §A — the header's fixed title, broken after the comma, and its accessible name */
export const CONTACT_HEADER_TITLE = "Every agent, in one place";
/** v16 §A — the disc's drawing: the hawk carrying an agent card, on its own ground (the sheet draws the disc) */
export const CONTACT_DISC_HAWK = { src: "/images/contact/contact-disc-hawk.webp", version: 1 };

/**
 * Contact list v16 §A — THE TITLE PANEL (the shared panel header's title kind, as Query Centre v137's). The hero
 * number, the stamp and the faces are gone from here: the "At a glance" strip carries them.
 *
 * ⚠️ THE SUBLINE NAMES THE BOOK ONLY WHEN ONE IS IN SCOPE; with none it says "your agents" and names nothing.
 * ⚠️ THE DISC IS THE SHEET'S (contactV16.css), NOT THE FILE'S: 236 (196), #f4f1ec, clipping a drawing 118% of its
 *    width, shifted 6% left. `aria-hidden` (the panel's art slot).
 */
export const ContactOpenHeader: React.FC<{
  /** true while the page settles: the panel holds its shape and its buttons are inert */
  loading: boolean;
  /** the manuscript in scope, or null */
  msTitle: string | null;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** opens Discover; omitted when the route cannot be taken, and the button is then not drawn */
  onDiscover?: () => void;
}> = ({ loading, msTitle, addRef, onAdd, onDiscover }) => (
  <PanelHeader
    kind="title" className="cl15-hd cl16-hd" attrs={{ "data-cl15": "header", "data-cl16": "header", "data-own-header": "" }}
    title={<span aria-label={CONTACT_HEADER_TITLE}><span aria-hidden="true">Every agent,<br />in one place</span></span>}
    sub={<span data-cl16="sub">{msTitle
      ? <>Find, compare and keep track of the agents for <i className="cl16-ms" data-cl16="ms">{msTitle}</i>.</>
      : "Find, compare and keep track of your agents."}</span>}
    loading={loading}
    primary={{ label: "+ Add an agent", onClick: onAdd, btnRef: addRef, attrs: { "data-cl15": "add" } }}
    secondary={onDiscover ? { label: "Discover agents", onClick: onDiscover, attrs: { "data-cl16": "discover" } } : undefined}
    art={<span className="cl16-disc" data-cl16="disc"><img data-cl16="disc-art" alt="" src={`${CONTACT_DISC_HAWK.src}?v=${CONTACT_DISC_HAWK.version}`} /></span>}
  />
);
