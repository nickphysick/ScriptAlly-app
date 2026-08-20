/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The stat strip — five figures in ONE panel, hairline-divided.
 *
 * ⚠️ ONE PANEL, NOT FIVE CARDS. These are five readings of the same set of queries, so they read
 * as one object with divisions rather than as five things that happen to sit in a row.
 *
 * ⚠️ EVERY CELL RESERVES ITS ILLUSTRATION NOW. The 54px plate is held at final size so the
 * artwork drops in later without a reflow anywhere in the strip.
 */
import React from "react";
import { IllustrationSlot, IllustrationKey } from "./IllustrationSlot";
import { guarded, MIN_SAMPLE, StatSet } from "../../lib/analytics";

export interface StatCell {
  art: IllustrationKey;
  label: string;
  /** The figure, already rendered — a number, a guarded fraction, or an em dash. */
  value: string;
  /** `true` when the value is an `n of d` fraction, which sets in smaller type. */
  fraction?: boolean;
  suffix?: string;
  meaning: string;
  previous?: string | null;
}

/**
 * ⚠️ THE PREVIOUS-PERIOD LINE CARRIES NO DIRECTION. No arrow, no colour, no "improved". A median
 * moving from thirty days to forty-five is a fact about which agents happened to reply this
 * quarter; drawing it as a decline makes the app an assessor of something it cannot see.
 */
export function statCells(
  now: StatSet,
  prev: StatSet | null,
  prevLabel: string | null,
  allTime: boolean,
): StatCell[] {
  const prevLine = (text: string) => (prev && prevLabel ? `${prevLabel}: ${text}` : null);
  const rateGuarded = guarded(now.sent);

  return [
    {
      art: "plane",
      label: "Queries sent",
      value: String(now.sent),
      meaning: allTime ? "Since you started querying" : "In this period",
      previous: prev ? prevLine(`${prev.sent} sent`) : null,
    },
    {
      art: "hourglass",
      label: "Still out",
      value: String(now.open),
      meaning: "Awaiting a first response",
    },
    {
      art: "pages",
      label: "Requests",
      value: String(now.requests),
      meaning: `${now.requests - now.fulls} partial · ${now.fulls} full`,
      previous: prev ? prevLine(String(prev.requests)) : null,
    },
    /* ⚠️ THE GUARD CHANGES THE FIGURE, NOT ITS FOOTNOTE. Under the threshold the big number IS the
       fraction — `4 of 11` — rather than a percentage with a caveat under it that nobody reads. */
    rateGuarded
      ? {
          art: "ratio",
          label: "Request rate",
          value: `${now.requests} of ${now.sent}`,
          fraction: true,
          /* ⚠️ IT STATES THE THRESHOLD RATHER THAN JUDGING THE SAMPLE. "Too few queries" reads as
             a remark about how the writer is going about their submissions; naming the number a
             percentage needs is the same information with nobody appraised. */
          meaning: `A percentage settles at about ${MIN_SAMPLE} queries`,
          previous: prev ? prevLine(`${prev.requests} of ${prev.sent}`) : null,
        }
      : {
          art: "ratio",
          label: "Request rate",
          value: String(now.ratePercent ?? 0),
          suffix: "%",
          meaning: `${now.requests} of ${now.sent} queries`,
          previous: prev
            ? prevLine(guarded(prev.sent) ? `${prev.requests} of ${prev.sent}` : `${prev.ratePercent ?? 0}%`)
            : null,
        },
    {
      art: "clock",
      label: "Median wait",
      /* ⚠️ AN EM DASH, NEVER A ZERO. `0 days` asserts an instant reply; the dash says there is no
         figure yet, which is what "nothing has come back" actually is. */
      value: now.medianReplyDays === null ? "—" : String(now.medianReplyDays),
      suffix: now.medianReplyDays === null ? "" : " days",
      meaning: `${now.responded} ${now.responded === 1 ? "response" : "responses"} · queries only`,
      previous: prev && prev.medianReplyDays !== null ? prevLine(`${prev.medianReplyDays} days`) : null,
    },
  ];
}

export const StatStrip: React.FC<{ cells: StatCell[] }> = ({ cells }) => (
  <div className="an-strip">
    {cells.map((c) => (
      <div className="an-stat" key={c.label}>
        <IllustrationSlot art={c.art} />
        <div className="an-stat-txt">
          <div className="an-stat-k">{c.label}</div>
          <div className={`an-stat-v${c.fraction ? " an-stat-v--frac" : ""}`}>
            {c.value}
            {c.suffix ? <small>{c.suffix}</small> : null}
          </div>
          <div className="an-stat-m">{c.meaning}</div>
          {c.previous ? <div className="an-stat-prev">{c.previous}</div> : null}
        </div>
      </div>
    ))}
  </div>
);
