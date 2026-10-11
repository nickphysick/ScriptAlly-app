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
import { FACE_ORDER, FACE_WORDS, type FacesModel } from "../../../lib/contactFaces";
import "../../shell/headerPanel.css";
import "./contactV15.css";

/** the header's drawing: a flying hawk carrying an agent card, facing left, transparent */
export const CONTACT_HEADER_HAWK = { src: "/images/contact/contact-header-hawk.png", width: 576, height: 383 };

/**
 * THE DESK'S THREE ILLUSTRATIONS (header panel v2, Part D) — SLOTS, EMPTY UNTIL THE ARTIST'S FILES ARRIVE. Each badge
 * card's strip holds a 76 × 56 (60 × 50) box: a dashed placeholder reading "Art to come" while its slot is `null`, and
 * the image in the same box, with no dashes, once it is set. No layout change either way.
 */
export interface ContactArt { src: string; width: number; height: number }
export const CONTACT_DESK_ART_WEEK: ContactArt | null = null;
export const CONTACT_DESK_ART_QUERIED: ContactArt | null = null;
export const CONTACT_DESK_ART_PROFILES: ContactArt | null = null;

export const CONTACT_HEADER_SUB = "Your agent data underpins everything. Collate and manage it here.";

/** the banner above the list (v15.2 §4) — exact */
export const CONTACT_BANNER_LINE = "Your agent will be the one who champions your words.";

/** "{N} agents on file" — one agent is "1 agent on file" */
export const onFileTitle = (n: number): string => `${n} agent${n === 1 ? "" : "s"} on file`;

export const ContactOpenHeader: React.FC<{
  /** the living count; null while the page settles (the title holds its shape, painted over) */
  count: number | null;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** scrolls to the list and puts the caret in its Find field (v15.2 §5) */
  onViewAll: () => void;
  /** the faces and their key (v15.3 §3); null while the page settles */
  faces?: FacesModel | null;
  /** a disc opens that agent's card */
  onOpenAgent?: (id: string) => void;
}> = ({ count, addRef, onAdd, onViewAll, faces = null }) => {
  const loading = count === null;
  const n = count ?? 0;
  /* HEADER v3 (10 Oct): the shared panel header, as a NUMBER page — the count, "agents on file", the page's intro,
     the two buttons and the hawk. The stamp and the faces row are gone from every header; the faces' three counts
     stay as one sentence a screen reader reads, and the faces data still feeds the desk. */
  return (
    <PanelHeader
      kind="number" className="cl15-hd" attrs={{ "data-cl15": "header", "data-own-header": "" }}
      number={loading ? null : n} words={n === 1 && !loading ? "agent on file" : "agents on file"} loading={loading}
      sub={CONTACT_HEADER_SUB}
      said={!loading && faces ? <span data-cl15="faces-said">{FACE_ORDER.filter((st) => faces.counts[st] > 0).map((st) => `${faces.counts[st]} ${FACE_WORDS[st].key}`).join(", ")}.</span> : undefined}
      primary={{ label: "+ Add an agent", onClick: onAdd, btnRef: addRef, attrs: { "data-cl15": "add" } }}
      secondary={{ label: "View all agents", onClick: onViewAll, attrs: { "data-cl15": "view-all" } }}
      art={<img data-cl15="header-art" src={CONTACT_HEADER_HAWK.src} width={CONTACT_HEADER_HAWK.width} height={CONTACT_HEADER_HAWK.height} alt="" />}
    />
  );
};
