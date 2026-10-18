/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founding card — the moment of the welcome page (Direction A of the founding-welcome mock).
 *
 * ⚠️ NO NAME ON THE CARD. We don't collect one, so the mock's name line carries the date the writer
 * confirmed instead. The only number is their own stored founding (or reserve) number.
 *
 * ⚠️ THE CARD'S SIZE NEVER DEPENDS ON ITS DATA. Its box is fixed by `aspect-ratio`, and while the
 * number is on its way every slot keeps its line, so the card does not move when the data lands.
 */
import React from "react";
import type { WelcomeKind, WelcomeData } from "./welcomeCopy";
import { ordinal, padNumber, splitDate } from "./welcomeCopy";

export const FoundingCard: React.FC<{ kind: WelcomeKind; data: WelcomeData | null; loading?: boolean }> = ({ kind, data, loading }) => {
  const variant = kind === "waiting" ? "reserve" : kind === "expired" || kind === "unknown" ? "ghost" : "founding";
  const date = splitDate(data?.confirmedOn);
  const n = variant === "founding" ? data?.foundingNumber : variant === "reserve" ? data?.reserveNumber : undefined;

  const kindLabel = variant === "reserve" ? ["Waiting", "list"] : ["Founding", "Writer"];
  const noLabel = variant === "reserve" ? "Reserve" : "No.";
  const big = loading ? " " : variant === "ghost" ? "—"
    : n ? (variant === "reserve" ? ordinal(n) : padNumber(n)) : "—";
  const seal = variant === "ghost" ? ["Not yet", "held"]
    : [variant === "reserve" ? "Reserve" : "Confirmed", ...(date ? [`${date.day} ${date.mon}`, date.year] : [])];
  const right = variant === "reserve" ? (n ? "in line" : "On the reserve list") : "of 100";

  return (
    <div
      className={`mk-wel-card mk-wel-card--${variant} mk-wel-cardin${loading ? " is-loading" : ""}`}
      data-card={variant}
      role="img"
      aria-label={
        variant === "ghost" ? "Founding card: no place held yet"
        : variant === "reserve" ? `Reserve card${n ? `: ${ordinal(n)} in line` : ""}`
        : `Founding card${n ? `: Founding Writer number ${n} of 100` : ""}`
      }
    >
      <div className="mk-wel-cardtop" aria-hidden="true">
        <div className="mk-wel-cardbrand"><i>Q</i>QueryHawk</div>
        <div className="mk-wel-cardkind">{kindLabel[0]}<br />{kindLabel[1]}</div>
      </div>
      <div className="mk-wel-cardno" aria-hidden="true">
        <span>{noLabel}</span>
        <b data-probe="card-number">{big}</b>
      </div>
      <div className="mk-wel-seal mk-wel-stampin" aria-hidden="true">
        {seal.map((l, i) => <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>)}
      </div>
      <div className="mk-wel-cardline" aria-hidden="true">
        <span>{date && variant !== "ghost" ? `${date.day} ${date.month} ${date.year}` : " "}</span>
        <span>{right}</span>
      </div>
    </div>
  );
};
