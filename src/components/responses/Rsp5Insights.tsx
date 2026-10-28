/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 4 (ref `band` and `showcase`) — WHAT YOUR ANSWERS TELL YOU: the full-width navy band with its three
 * figures, then the three-up showcase (a subject card with a stats card laid over it; the figure as the heading, what
 * it is made of as the line under it).
 *
 * ⚠️ EVERY FIGURE IS lib/responses': `pageCounts`, `typicalWait`, `speedByKind`, `passDepth`, `noteSplit`. Nothing here
 *    counts anything itself.
 * ⚠️ EARLY DAYS (1 to 4 answers, `isEarlyDays`): the band's line says the parts fill in as answers arrive, and the three
 *    showcase items are the "warming up" cards, each showing how many answers it still needs (`WARM_NEED`).
 * ⚠️ THE SHOWCASE IS A PAGE-LOCAL COPY of the packages page's "how they're doing" anatomy (Pk38Results' top three, which
 *    is internal to that page): a lift candidate.
 * ⚠️ D1 — NO PACKAGES: no package figure, chip or Pro tag anywhere here.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import {
  firstNameOf, hasNote, passDepth, noteSplit, pctOf, plural, respDate, speedByKind, typicalWait, WARM_NEED,
  type PageCounts, type RespItem,
} from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { STEP_WORD } from "./RspCarousel";

type Item = RespItem<QcRow>;
export type InsightGo = "timing" | "wall" | "words";

/** the band's three figures, or "–" where there is nothing to divide by */
export function bandFigures(c: PageCounts, items: readonly Item[]): { replied: string; more: string; wait: string } {
  const p = (a: number) => { const v = pctOf(a, c.sent); return v == null ? "–" : `${v}%`; };
  const w = typicalWait(items);
  return { replied: p(c.replies), more: p(c.more), wait: w == null ? "–" : `${w} days` };
}

export const Rsp5Band: React.FC<{ counts: PageCounts; items: readonly Item[]; few: boolean }> = ({ counts, items, few }) => {
  const f = bandFigures(counts, items);
  return (
    <section className="rsp5-band" data-rsp5="band" data-rsp5-sec="insights" aria-labelledby="rsp5-band-h">
      <span className="rsp5-art rsp5-art--band" aria-hidden="true">Art: the Archivist sorting replies into piles</span>
      <div>
        <h2 id="rsp5-band-h" className="rsp5-bandh">What your answers tell you</h2>
        <p data-rsp5="band-line">{few
          ? "These fill in as answers arrive. Each one shows what it will tell you, and how many answers it needs first."
          : "Patterns across every answer so far: when they come, how quickly requests arrive, and how far the passes read."}</p>
      </div>
      <div className="rsp5-bstats">
        <div className="rsp5-bs" data-rsp5="band-fig" data-k="replied"><b>{f.replied}</b><span>of agents queried have replied</span></div>
        <div className="rsp5-bs" data-rsp5="band-fig" data-k="more"><b>{f.more}</b><span>asked to read more</span></div>
        <div className="rsp5-bs" data-rsp5="band-fig" data-k="wait"><b>{f.wait}</b><span>is your typical wait for a reply</span></div>
      </div>
    </section>
  );
};

/* ── the showcase ── */
interface Bar { label: string; value: number | null; text: string }
const Over: React.FC<{ title: string; bars: Bar[] }> = ({ title, bars }) => {
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0));
  return (
    <div className="rsp5-over" data-rsp5="show-over">
      <h4>{title}</h4>
      {bars.map((b, k) => (
        <div key={b.label} className={`rsp5-brow${k === 0 ? " is-top" : ""}`}>
          <span className="rsp5-nm">{b.label}</span>
          <span className="rsp5-tr"><i style={{ width: `${Math.round(((b.value ?? 0) / max) * 100)}%` }} /></span>
          <span className="rsp5-v">{b.text}</span>
        </div>
      ))}
    </div>
  );
};
const Go: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" className="rsp5-go" data-rsp5="show-go" onClick={onClick}>{label} {"→"}</button>
);

const Warm: React.FC<{ title: string; line: string; got: number }> = ({ title, line, got }) => (
  <div className="rsp5-sh" data-rsp5="warm">
    <div className="rsp5-warm">
      <b>{title}</b>
      <span>{line}</span>
      <div className="rsp5-pb" aria-hidden="true">{Array.from({ length: WARM_NEED }, (_, i) => <i key={i} className={i < got ? "is-on" : undefined} />)}</div>
      <span data-rsp5="warm-need">{got} of {WARM_NEED} answers needed. {WARM_NEED - got} more and this fills in.</span>
    </div>
  </div>
);

export const Rsp5Showcase: React.FC<{ items: readonly Item[]; answered: number; few: boolean; nowMs: number; onGo: (to: InsightGo) => void }> = ({ items, answered, few, nowMs, onGo }) => {
  if (few) {
    return (
      <div className="rsp5-show" data-rsp5="showcase" data-few="">
        <Warm title="How quickly they answered" line="How long requests took to arrive compared with passes and quiet closes." got={answered} />
        <Warm title="How far the passes read" line="Whether passes came at the query, or after an agent had read your pages." got={answered} />
        <Warm title="Notes that came with a pass" line="How many passes came with a personal note. You can read every note further down the page." got={answered} />
      </div>
    );
  }
  const sp = speedByKind(items);
  const days = (v: number | null) => (v == null ? "–" : `${v}d`);
  const q = sp.quickest;
  const depth = passDepth(items);
  const notes = noteSplit(items);
  const notePasses = items.filter((i) => i.group === "passed" && hasNote(i)).sort((a, b) => (b.answerMs ?? 0) - (a.answerMs ?? 0));
  const ex = notePasses[0] ?? null;
  const rr = items.find((i) => i.answer === "rr" && hasNote(i));
  const speedHead = sp.more != null && sp.passed != null ? `Requests came in ${sp.more} days, passes in ${sp.passed}`
    : sp.more != null ? `Requests came in ${sp.more} days` : sp.passed != null ? `Passes came in ${sp.passed} days` : "No first answers dated yet";
  const read = depth.partial + depth.full;
  const firstSentence = (t: string) => { const k = t.indexOf(". "); return k < 0 ? t : `${t.slice(0, k)}.`; };
  return (
    <div className="rsp5-show" data-rsp5="showcase">
      <div className="rsp5-sh" data-rsp5="show" data-k="speed">
        <div className="rsp5-stage">
          <div className="rsp5-subj">
            <div className="rsp5-hd rsp5-hd--bl">
              <span className="rsp5-ico">{q ? <StatusDot status={q.first.status} overrideSize={16} decorative /> : null}</span>
              {q ? q.item.row.agentName : "Your first answers"}
            </div>
            <div className="rsp5-bd">
              {q && q.item.queriedMs != null ? <div className="rsp5-mrow"><StatusDot status={QueryStatus.QUERIED} overrideSize={14} decorative />Queried {respDate(q.item.queriedMs, nowMs)}</div> : null}
              {q ? <div className="rsp5-mrow"><StatusDot status={q.first.status} overrideSize={14} decorative />{STEP_WORD[q.first.status]} {respDate(q.first.ms, nowMs)}</div> : null}
              {q ? <div className="rsp5-mrow rsp5-mrow--note">Your quickest request: {plural(q.first.days, "day", "days")}</div> : null}
            </div>
          </div>
          <Over title="Typical wait for each kind" bars={[
            { label: "Requests", value: sp.more, text: days(sp.more) },
            { label: "Passes", value: sp.passed, text: days(sp.passed) },
            { label: "Closed, no reply", value: sp.noReply, text: days(sp.noReply) },
          ]} />
        </div>
        <h3 data-rsp5="show-h">{speedHead}</h3>
        <p>The typical wait from querying to each kind of first answer.{sp.noReply != null ? ` Agents who closed with no reply did so after ${sp.noReply} days, usually when their stated time ran out.` : ""}</p>
        <Go label="See how long agents took" onClick={() => onGo("timing")} />
      </div>

      <div className="rsp5-sh" data-rsp5="show" data-k="depth">
        <div className="rsp5-stage">
          <div className="rsp5-subj">
            <div className="rsp5-hd rsp5-hd--cl"><span className="rsp5-ico"><StatusDot status={QueryStatus.REJECTED} overrideSize={16} decorative /></span>{plural(depth.total, "pass", "passes")}</div>
            <div className="rsp5-bd">
              <div className="rsp5-mrow"><StatusDot status={QueryStatus.QUERIED} overrideSize={14} decorative />Passed on the query</div>
              <div className="rsp5-mrow"><StatusDot status={QueryStatus.PARTIAL_SENT} overrideSize={14} decorative />Passed after the partial</div>
              <div className="rsp5-mrow"><StatusDot status={QueryStatus.FULL_SENT} overrideSize={14} decorative />Passed after the full</div>
            </div>
          </div>
          <Over title="Where the passes came" bars={[
            { label: "At the query", value: depth.query, text: String(depth.query) },
            { label: "After the partial", value: depth.partial, text: String(depth.partial) },
            { label: "After the full", value: depth.full, text: String(depth.full) },
          ]} />
        </div>
        <h3 data-rsp5="show-h">{read} of {plural(depth.total, "pass", "passes")} came after reading pages</h3>
        <p>{depth.query} {depth.query === 1 ? "agent" : "agents"} passed on the query letter alone. {depth.partial} passed after a partial and {depth.full} after the full manuscript.</p>
        <Go label="See every pass" onClick={() => onGo("wall")} />
      </div>

      <div className="rsp5-sh" data-rsp5="show" data-k="notes">
        <div className="rsp5-stage">
          <div className="rsp5-subj">
            <div className="rsp5-hd rsp5-hd--bl"><span className="rsp5-ico rsp5-ico--q">{"“"}</span>{ex ? ex.row.agentName : "No notes yet"}</div>
            <div className="rsp5-bd">{ex?.note ? <p className="rsp5-quote rsp5-quote--sm">{firstSentence(ex.note)}</p> : null}</div>
          </div>
          <Over title="Passes with a note" bars={[
            { label: "With a note", value: notes.withNote, text: String(notes.withNote) },
            { label: "Form reply", value: notes.form, text: String(notes.form) },
          ]} />
        </div>
        <h3 data-rsp5="show-h">{notes.withNote} of {plural(notes.total, "pass", "passes")} came with a note</h3>
        <p>Agents who wrote back personally, in their own words. Every note is collected below{rr ? `, with the revision request from ${firstNameOf(rr.row.agentName)}` : ""}.</p>
        <Go label="Read them" onClick={() => onGo("words")} />
      </div>
    </div>
  );
};
