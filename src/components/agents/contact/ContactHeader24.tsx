/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 Part A (design-refs/contact-list-v25/, screen 01) — the header: the shared title card
 * (`PageHeaderCard`) as the Query Centre v150 renders it (22/36/24 padding, the 40px title with the highlighter, the
 * art box 160 × 140), with the Contact list's own powder-blue highlighter. "At a glance" rides in as `children`.
 *
 * ⚠️ v24's List-health banner and its view row (the chips and Find) are RETIRED: their jobs moved to At a glance (the
 *    List health card opens Housekeeping; three cards filter) and Find is the navy bar's own search well.
 * ⚠️ THE `h1` KEEPS `data-page-title` (the shell's folder tab and the guide read it).
 * ⚠️ The card's v150 values are the Query Centre's own rules (qcv150.css), their selectors widened to `.cl25-hd`.
 */
import React from "react";
import { PageHeaderCard } from "../../shared/PageHeaderCard";
import "../../queries/centre/qcv149.css";
import "../../queries/centre/qcv150.css";
import "./contactV24.css";
import "./contactV25.css";

export const CONTACT_ART = "/images/contact-list-archivist.webp";

export const ContactHeader25: React.FC<{
  loading: boolean;
  msTitle: string | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onDiscover?: () => void;
  children?: React.ReactNode;
}> = ({ loading, msTitle, onAdd, addRef, onDiscover, children }) => (
  <header className="cl24-hd cl25-hd" data-cl24="header" data-cl25="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <PageHeaderCard className="cl24-card cl25-card" titleId="cl24T" data={{ "data-cl24": "hd-card", "data-cl25": "card" }}
      titleData={{ "data-page-title": "true", "data-cl24": "title" }}
      title={<span className="hl" data-cl25="hl">Contact list</span>} art={CONTACT_ART}
      body={<>Every agent you might query{msTitle ? <> with <b data-cl24="ms">{msTitle}</b></> : null}, and how to reach them.</>}
      primary={{ label: "+ Add an agent", onClick: onAdd, disabled: loading, buttonRef: addRef, data: { "data-cl24": "add", "data-cl17": "add" } }}
      secondary={onDiscover ? { label: "Discover agents", onClick: onDiscover, data: { "data-cl24": "discover" } } : undefined} />
    {children}
  </header>
);
