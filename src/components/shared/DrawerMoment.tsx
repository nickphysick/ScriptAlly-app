/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 Part F (design-refs/contact-list-v25/, screens 07 and 08; header A) — THE DRAWER'S MOMENT: a cream
 * panel at the top of the first step of "+ Log a query" and of "Record a response" with no query open, a drawing at its
 * bottom left, a title in the typewriter and one line.
 *
 *   log      "Another one, out into the world."  ·  "This will be query no. {n} for {title}. Who’s it going to?"
 *   record   "Someone wrote back."  ·  "Whatever they said, it’s an answer, and every answer tells you something. Let’s get it down."
 *
 * ⚠️ ONE COMPONENT, EVERY HOST: the Query Centre's own flows (QcLogFlow149, QcWhoReplied149) and the query drawer's
 *    log journey and query picker (what the Contact list and every other page open) all draw this.
 * ⚠️ FIRST STEP ONLY: a host drops it the moment an agent is chosen; it scrolls with the step's body.
 * ⚠️ n IS THE QUERIES ALREADY LOGGED FOR THE MANUSCRIPT, PLUS ONE. With no manuscript the line is "Who’s it going to?".
 */
import React from "react";
import "./drawerMoment.css";

export const MOMENT_ART = { log: "/images/qc/courier-cutout.png", record: "/images/query-centre/desk-hawk.webp" } as const;

export type DrawerMomentProps = { kind: "log"; n: number; title: string | null } | { kind: "record" };

export const DrawerMoment: React.FC<DrawerMomentProps> = (p) => (
  <div className={`dmo dmo--${p.kind}`} data-dmo={p.kind} data-n={p.kind === "log" ? p.n : undefined}>
    <img className="dmo-art" src={MOMENT_ART[p.kind]} alt="" aria-hidden="true" />
    {p.kind === "log" ? (
      <>
        <h3 className="dmo-t" data-dmo="title">Another one, out into the world.</h3>
        <p className="dmo-l" data-dmo="line">
          {p.title ? <>This will be query <b data-dmo="no">no. {p.n}</b> for <b data-dmo="book">{p.title}</b>. </> : null}Who’s it going to?
        </p>
      </>
    ) : (
      <>
        <h3 className="dmo-t" data-dmo="title">Someone wrote back.</h3>
        <p className="dmo-l" data-dmo="line">Whatever they said, it’s an answer, and every answer tells you something. Let’s get it down.</p>
      </>
    )}
  </div>
);
