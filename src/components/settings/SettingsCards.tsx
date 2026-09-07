/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The stacked-cards chassis (ref design-refs/settings-mode-stacked-cards-v2.html: `.card`, `.ch`,
 * `.cb`, `.row`, `.cf`, `.ttl`).
 *
 * ⚠️ `MountPanel` WAS CHECKED FOR EXTENSION FIRST, AND IT IS GENUINELY A DIFFERENT OBJECT. MountPanel
 * is three nested layers — a parchment panel whose even 6px padding IS its rim, an inner 1px
 * burgundy frame that provides the clipping context, and a drop shadow. The ref's settings card is
 * ONE layer: a 1px hairline, a 12px radius, no rim and NO SHADOW. Every defining feature of
 * MountPanel is a thing this card removes, so a `flat` prop would be a component that can be told
 * to stop being itself — which is how a shared primitive becomes two components sharing a file.
 * MountPanel is untouched and still carries every other card in the app.
 *
 * ⚠️ AND THE SAGE BAND GOES WITH IT. `SectionCard` wore a sage gradient header with the section's
 * name and sub-line; the card's heading is now plain Playfair INSIDE the card. The band said "this
 * is a section of settings" — a thing the page title and the rail's selected row now both say, so
 * a third statement of it was the loudest element on screen carrying the least information.
 */
import React from "react";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import "./settingsCards.css";

/**
 * The page's title block — the section's name and one line about it.
 *
 * ⚠️ THE DESCRIPTION IS THE SECTION'S OWN, from `sectionBands`, never written at the call site.
 * That table already holds one sentence per section; a second written into the page would be the
 * same fact in two places, and the failure is a title that describes a section the card beneath it
 * does not.
 */
export const SettingsTitle: React.FC<{ name: string; description: string }> = ({ name, description }) => (
  <div className="sc-ttl">
    {/* ⚠️ `role="heading"` ON A `<div>`-FREE `<h1>`: it is a real heading element, because this is
        the first thing in the panel and the page has no other. The rail's "Settings" is chrome. */}
    <h1 className="sc-ttl-h">{name}</h1>
    <p className="sc-ttl-d">{description}</p>
  </div>
);

export interface SettingsCardProps {
  /** The Playfair line inside the card. */
  heading: string;
  /** An optional sentence under the heading — what the whole card is for. */
  blurb?: string;
  /** The tinted foot strip's note. Rendered with `action` if either is present. */
  note?: React.ReactNode;
  /** The foot strip's control — the Save button on a card holding explicit-save text. */
  action?: React.ReactNode;
  /** The deletion card only. Warms the hairline and the heading; it does not fill. */
  danger?: boolean;
  headingId?: string;
  children: React.ReactNode;
}

/**
 * One flat card per concern.
 *
 * ⚠️ `overflow: hidden` IS WHAT LETS THE FOOT STRIP MEET THE CORNERS. The strip is a tinted fill
 * running the card's full width; without the clip it squares off against a 12px radius, which reads
 * as a rendering fault rather than as a decision. The card carries no shadow, so the clip costs
 * nothing else.
 *
 * ⚠️ DANGER IS A HAIRLINE AND AN INK, NEVER A FILL. A filled warning card at the foot of Your data
 * shouts at a reader who came to download a copy of their work. The quiet-versus-loud rule the
 * shell's notification desk already states, applied to the one card that could be tempted.
 */
export const SettingsCard: React.FC<SettingsCardProps> = ({
  heading, blurb, note, action, danger, headingId, children,
}) => (
  <section className={`sc-card${danger ? " sc-card--danger" : ""}`}>
    <div className="sc-ch">
      <h2 className="sc-ch-h" id={headingId}>{heading}</h2>
      {blurb && <p className="sc-ch-p">{blurb}</p>}
    </div>
    <div className="sc-cb">{children}</div>
    {(note || action) && (
      <div className="sc-cf">
        <span className="sc-cf-note">{note}</span>
        {action}
      </div>
    )}
  </section>
);

export interface SettingsRowProps {
  label: string;
  /** The one explanation line. Absent where the label is self-evident. */
  description?: React.ReactNode;
  /** Right-hand control column. Omitted on a `full` row. */
  control?: React.ReactNode;
  /**
   * A row with no control column — identity, prose, a note, a list.
   *
   * ⚠️ IT IS A PROP RATHER THAN A SECOND COMPONENT because the two share the hairline and the
   * padding, which is the whole of the row's contract. Two components would be two places to change
   * a rule that is about the space BETWEEN rows.
   */
  full?: boolean;
  children?: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ label, description, control, full, children }) => (
  <div className={`sc-row${full ? " sc-row--full" : ""}`}>
    <div className="sc-row-l">
      <div className="sc-lbl">{label}</div>
      {description && <div className="sc-dsc">{description}</div>}
      {full && children}
    </div>
    {!full && <div className="sc-ctl">{control}</div>}
  </div>
);

/**
 * A full-width row carrying prose and nothing else — a retention statement, a limitation.
 *
 * ⚠️ IT TAKES NO LABEL, WHICH IS THE POINT. `SettingsRow` with an empty label would render an empty
 * `.sc-lbl` and the rhythm would open a gap above every note; a paragraph that is the whole row is a
 * different shape from a labelled row that happens to have no control.
 */
export const SettingsNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sc-row sc-row--full"><p className="sc-note">{children}</p></div>
);

/**
 * Identity — the 48px monogram, the name and the email.
 *
 * ⚠️ IT APPEARS EXACTLY ONCE IN THE APP'S SETTINGS, at the top of Profile. It used to be an
 * illustrated header repeated above every section, so the only thing on screen that could have held
 * still while you navigated was the thing that moved most — and the rail already says which section
 * you are in. Identity is a FACT ABOUT YOU and belongs in the section about you.
 *
 * ⚠️ THE INITIALS COME FROM `initialsOf`, the same helper the shell's own avatar reads. A settings
 * page whose monogram could disagree with the same person's monogram four centimetres away in the
 * sidebar is the fault a shared helper exists to foreclose.
 */
export const IdentityRow: React.FC<{ name: string; email: string }> = ({ name, email }) => (
  <div className="sc-row sc-row--full">
    <div className="sc-id">
      <span className="sc-id-av" aria-hidden="true">{initialsOf(name || email)}</span>
      <div className="sc-id-t">
        <b className="sc-id-n">{name || "Your account"}</b>
        <span className="sc-id-m">{email}</span>
      </div>
    </div>
  </div>
);
