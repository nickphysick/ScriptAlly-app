/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 Part A (design-refs/submission-packages-v39/, screen 01) — the page header is the Contact
 * list's: the shared title card (`PageHeaderCard`) at the Contact list v25's width, inset and values (pk39.css states
 * them for `.pk39-hd`, copied from contactV25.css / qcv150.css, which name only their own pages). Only the copy, the
 * highlighter's pale Harbour, the art and the Pro stamp are this page's own.
 *
 * ⚠️ WHERE THE REF AND THE CONTACT LIST DIFFER, THE CONTACT LIST WINS (the pack's rule): the ref's `.eh2` was drawn from
 *    a screenshot (a 50px title, a 262px card, art rising out of it); the Contact list's card is 40px, 191.6 tall, and
 *    its art sits inside the card.
 * ⚠️ THE PRO STAMP IS THE ONLY "PRO" ON THE PAGE, and it sells nothing: "Included with your Pro plan". Gating is
 *    unchanged (OPEN TO ALL, D7).
 * ⚠️ THE h1 KEEPS `data-page-title` (the shell's folder tab and the guide read it).
 * The brand-new page keeps v38's promise header (Pk26Hero).
 */
import React from "react";
import { PageHeaderCard } from "../../shared/PageHeaderCard";
import { PACKAGES_HERO } from "../../../lib/packagesPage";

export const PRO_STAMP_TIP = "Included with your Pro plan";

export const Pk39Header: React.FC<{ title: string | null; onNew: () => void; onHow: () => void }> = ({ title, onNew, onHow }) => (
  <header className="pk39-hd" data-pk26="header" data-pk39="header" data-own-header="">
    <PageHeaderCard className="pk39-card" titleId="p6-hdT" data={{ "data-pk39": "hd-card" }}
      titleData={{ "data-page-title": "true", "data-pk39": "title" }}
      title={<span className="hl" data-pk39="hl">Submission packages</span>}
      tag={<span className="pk39-pro" title={PRO_STAMP_TIP} data-pk39="pro">Pro</span>}
      art={`${PACKAGES_HERO.src}?v=${PACKAGES_HERO.version}`}
      body={<>Every package you send{title ? <> with <b>{title}</b></> : null}, and exactly what each agent got.</>}
      primary={{ label: "+ New package", onClick: onNew, data: { "data-pk39": "new" } }}
      secondary={{ label: "How it works", onClick: onHow, data: { "data-pk39": "how" } }} />
  </header>
);
