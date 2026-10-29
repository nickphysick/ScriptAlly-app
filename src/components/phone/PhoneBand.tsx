/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NAVY BAND (Phone app v2, Part 1C; ref design-refs/phone-app-v2/src/v2.js `bandHead` HV C, `bandRow`; menuv.js
 * `bk()` PH B; app.css `.band` `.bandrow` `.bt` `.ring` `.avring` `.bchip` `.pband`).
 *
 * Every phone page opens in it. Two variants:
 *  - `tab` (Home, Queries, To-do, Agents): the page name in Special Elite — Home's is the greeting, "Afternoon, Alex"
 *    — then round buttons for search, feedback and your initials (the menu); the book chip on its own line beneath
 *    (HV C), which opens the book switcher; then the page's own figure, from the band slot.
 *  - `page` (a page opened from the menu): a back arrow, then search and initials; the big title beneath; no chip.
 *
 * The band's foot is the sheet's top: a 24px page-coloured cap with rounded corners (the ref's `.pband::after`), so the
 * page below reads as a sheet laid over the navy. ⚠️ TEXT ON NAVY IS WHITE — every text node in the band.
 * ⚠️ NO LOGO HERE (ref BRAND A): the hawk and wordmark appear only in the menu's sign-off.
 */
import React from "react";
import { PI } from "./phoneIcons";

export interface PhoneBandProps {
  variant: "tab" | "page";
  /** the page name; on Home, the greeting */
  title: string;
  /** Home's title is the greeting, set a little smaller (ref `.bt` at 22px for the hello) */
  greeting?: boolean;
  /** the book chip's title (tab variant); null hides the chip (no manuscript yet) */
  book?: string | null;
  initials: string;
  onSearch: () => void;
  onFeedback: () => void;
  onMenu: () => void;
  onBook?: () => void;
  onBack?: () => void;
  /** extra round buttons left of search (Queries' eye, Part 3) */
  extra?: React.ReactNode;
  /** the page's key figure, beneath */
  slot?: React.ReactNode;
}

export const PhoneRing: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; pa?: string }> = ({ label, onClick, children, pa }) => (
  <button type="button" className="pa-ring" aria-label={label} onClick={onClick} data-pa={pa}>{children}</button>
);

export const PhoneBand: React.FC<PhoneBandProps> = (p) => {
  const av = (
    <button type="button" className="pa-avring" aria-label="Open menu" aria-haspopup="dialog" onClick={p.onMenu} data-pa="menu-btn">{p.initials}</button>
  );
  if (p.variant === "page") {
    return (
      <header className="pa-band pa-band--page" data-pa="band" data-variant="page">
        <div className="pa-bandrow">
          <PhoneRing label="Back" onClick={() => p.onBack?.()} pa="back">{PI.back}</PhoneRing>
          <span className="pa-grow" />
          <PhoneRing label="Search" onClick={p.onSearch} pa="search-btn">{PI.search}</PhoneRing>
          {av}
        </div>
        <h1 className="pa-bt pa-bt--page" data-pa="band-title">{p.title}</h1>
        {p.slot ? <div className="pa-bandslot" data-pa="band-slot">{p.slot}</div> : null}
      </header>
    );
  }
  return (
    <header className="pa-band" data-pa="band" data-variant="tab">
      <div className="pa-bandrow">
        <div className="pa-bl"><h1 className={`pa-bt${p.greeting ? " pa-bt--hello" : ""}`} data-pa="band-title">{p.title}</h1></div>
        {p.extra}
        <PhoneRing label="Search" onClick={p.onSearch} pa="search-btn">{PI.search}</PhoneRing>
        <PhoneRing label="Send feedback" onClick={p.onFeedback} pa="feedback-btn">{PI.chat}</PhoneRing>
        {av}
      </div>
      {p.book ? (
        <div className="pa-bchipwrap">
          <button type="button" className="pa-bchip" onClick={() => p.onBook?.()} aria-haspopup="dialog" data-pa="book-chip">
            {PI.book}<span className="pa-mt">{p.book}</span>{PI.down}
          </button>
        </div>
      ) : null}
      {p.slot ? <div className="pa-bandslot" data-pa="band-slot">{p.slot}</div> : null}
    </header>
  );
};

/** the greeting's word for the time of day: "Morning", "Afternoon", "Evening" (the dashboard's `salutation`, less "Good") */
export const dayWord = (salutationText: string): string => salutationText.replace(/^Good\s+/, "").replace(/^./, (c) => c.toUpperCase());
