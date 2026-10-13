/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §A — the page's header: the shared panel header's TITLE kind ("Every agent, in one place"), one
 * line naming the book, two buttons and the disc. Until v16 this file drew a hero number, a stamp and a row of faces;
 * the "At a glance" strip carries those facts now.
 *
 * ⚠️ THE TITLE KEEPS `data-page-title` (the shared panel sets it), the hook anything asking "has the page's title
 * scrolled past?" reads.
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
