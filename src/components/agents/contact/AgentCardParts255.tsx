/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.5 (design-refs/contact-list-v25-5/) — the agent card's Profile and History, as pieces the panel
 * card and the full-screen wide card both draw:
 *
 *   HowWorks     A1 — the reply scale (twelve blocks) and two tiles: Taking queries · How they take queries
 *   Reach        A2 — the contact rows: email, website, submission form, social; a missing one is a dashed "+ Add"
 *   YouAndStory  B  — the query story: per query, its book, the waiting bar while waiting, the timeline and the
 *                     writer's next step; the dashed "You haven't queried {first} yet." panel when there is none
 *
 * Nothing about your query is on Profile; History holds all of it.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { SubmissionMethod } from "../../../types";
import { hrefFor } from "../../../lib/quickAdd";
import { MONTHS_SHORT } from "../../../lib/dates";
import { FORM_PLATFORM } from "../../../lib/cardDraft";
import { replyScale, SCALE_BLOCKS, waitWords, type StoryBlock } from "../../../lib/contactStory255";
import { InlineContact, InlineReplies } from "../card/InlineEdits";
import { socialOf } from "./ContactFilters24";
import { NQ_RING } from "./ContactSheet24";
import type { AgentCard24Props, CardEdit } from "./AgentCard24";
import "./contactV255.css";

const svg = (d: React.ReactNode, size = 18) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const IC255 = {
  clock: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  at: svg(<><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></>),
  doc: svg(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>),
  mail: svg(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></>, 17),
  web: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>, 17),
  form: svg(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>, 17),
  at17: svg(<><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></>, 17),
};
const copy = (text: string) => { void navigator.clipboard?.writeText(text).catch(() => {}); };
const monthOf = (v: unknown): string | null => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? MONTHS_SHORT[new Date(t).getMonth()] : null;
};

export const Sec255: React.FC<{ icon: React.ReactNode; title: string; right?: React.ReactNode; k: string; children: React.ReactNode }> = ({ icon, title, right, k, children }) => (
  <section className="cl255-sec" data-cl255="section" data-k={k}>
    <h4 className="cl255-h">{icon}<span>{title}</span>{right ? <em className="cl255-hr" data-cl255="heard">{right}</em> : null}</h4>
    {children}
  </section>
);

/* ── A1 · How {first} works ───────────────────────────────────────────────────────────────────────────────── */
const METHOD: Partial<Record<string, { words: string; form: boolean }>> = {
  [SubmissionMethod.EMAIL]: { words: "By email", form: false },
  [SubmissionMethod.ONLINE_FORM]: { words: "Online form", form: true },
  [SubmissionMethod.QUERY_MANAGER]: { words: "QueryManager", form: true },
  [SubmissionMethod.POST]: { words: "By post", form: false },
};
export const HowWorks: React.FC<{ p: AgentCard24Props; ed: CardEdit; first: string }> = ({ p, ed, first }) => {
  const a = p.x.agent;
  const k = p.edit;
  const sc = replyScale(a);
  const door = p.x.door;
  const checked = monthOf(a.lastCheckedDate);
  const reopens = monthOf(a.reopensOn);
  const method = METHOD[String(a.submissionMethod ?? "")] ?? null;
  const openReplies = () => (k ? ed.setInline("replies") : p.onEdit("work", "reply"));
  return (
    <Sec255 icon={IC255.clock} title={`How ${first} works`} k="how">
      {k && ed.inline === "replies" ? <InlineReplies draft={k.draft} first={first} save={k.save} onDone={() => ed.setInline(null)} />
        : sc ? (
          <button type="button" className="cl255-w cl255-scale" data-cl255="scale" data-filled={sc.filled} onClick={openReplies} aria-label={`${sc.bold}. Change`}>
            <span className="cl255-bar" aria-hidden="true">{Array.from({ length: SCALE_BLOCKS }, (_, i) => <i key={i} className={i < sc.filled ? "f" : undefined} data-cl255="block" />)}</span>
            <span className="cl255-sc" aria-hidden="true"><span>1 wk</span><span>12 wks</span></span>
            <span className="cl255-cap"><b>{sc.bold}</b>{sc.policy ? <> · <i>{sc.policy}</i></> : null}</span>
          </button>
        ) : (
          <button type="button" className="cl255-w cl255-scale cl255-mt" data-cl255="scale" data-filled={0} onClick={openReplies}>Reply time not known yet</button>
        )}
      <div className="cl255-tiles">
        <button type="button" className="cl255-tile" data-cl255="tile" data-k="door" data-door={door} onClick={() => ed.openAt("work", "door")}>
          <span className={`cl255-dch ${door}`}><i aria-hidden="true" />{door === "open" ? "Open to queries" : door === "closed" ? "Closed to queries" : "Not known"}</span>
          {door === "open" && checked ? <small>checked {checked}</small> : door === "closed" && reopens ? <small>reopens {reopens}</small> : null}
        </button>
        <button type="button" className="cl255-tile" data-cl255="tile" data-k="method" onClick={() => ed.openAt("work", "method")}>
          <span className="cl255-hw">{method?.form ? IC255.form : IC255.mail}{method ? method.words : "Not known"}</span>
          <small>how they take queries</small>
        </button>
      </div>
    </Sec255>
  );
};

/* ── A2 · Reach {first} ───────────────────────────────────────────────────────────────────────────────────── */
type ReachKey = "email" | "website" | "form" | "social";
const formOf = (a: AgentCard24Props["x"]["agent"]): string =>
  ((a.socials ?? []).find((s) => (s.platform ?? "").trim().toLowerCase() === FORM_PLATFORM.toLowerCase())?.handle ?? "").trim();
export const Reach: React.FC<{ p: AgentCard24Props; ed: CardEdit; first: string }> = ({ p, ed, first }) => {
  const a = p.x.agent;
  const k = p.edit;
  const vals: Record<ReachKey, string> = {
    email: (a.email ?? "").trim(), website: (a.website ?? "").trim(),
    form: k ? k.draft.form.trim() : formOf(a), social: socialOf(a),
  };
  const ICON: Record<ReachKey, React.ReactNode> = { email: IC255.mail, website: IC255.web, form: IC255.form, social: IC255.at17 };
  const ADD: Record<ReachKey, string> = { email: "+ Add email", website: "+ Add website", form: "+ Add submission form", social: "+ Add social" };
  const FOCUS: Record<ReachKey, "email" | "website" | "mswl"> = { email: "email", website: "website", form: "website", social: "mswl" };
  const add = (key: ReachKey) => () => (k ? ed.setInline(key) : p.onEdit("who", FOCUS[key]));
  const keys: ReachKey[] = ["email", "website", "form", "social"];
  return (
    <Sec255 icon={IC255.at} title={`Reach ${first}`} k="reach">
      <div className="cl255-rows">
        {keys.map((key) => {
          if (k && ed.inline === key) return <div key={key} className="cl255-edit" data-cl255="reach-edit" data-k={key}><InlineContact k={key} draft={k.draft} save={k.save} onDone={() => ed.setInline(null)} /></div>;
          const v = vals[key];
          if (!v) {
            return (
              <button key={key} type="button" className="cl255-r cl255-r--mt" data-cl255="reach" data-k={key} data-missing="" onClick={add(key)}>
                <span className="cl255-d" aria-hidden="true">{ICON[key]}</span><span className="cl255-v">{ADD[key]}</span>
              </button>
            );
          }
          const shown = key === "website" ? v.replace(/^https?:\/\//, "").replace(/\/$/, "") : key === "form" ? FORM_PLATFORM : v;
          const href = key === "email" ? null : hrefFor(v);
          return href ? (
            <a key={key} className="cl255-r" data-cl255="reach" data-k={key} href={href} target="_blank" rel="noreferrer noopener" aria-label={`Open ${shown}`}>
              <span className="cl255-d" aria-hidden="true">{ICON[key]}</span><span className="cl255-v">{shown}</span><span className="cl255-a">Open</span>
            </a>
          ) : (
            <button key={key} type="button" className="cl255-r" data-cl255="reach" data-k={key} onClick={() => copy(v)} aria-label={`Copy ${shown}`}>
              <span className="cl255-d" aria-hidden="true">{ICON[key]}</span><span className="cl255-v">{shown}</span><span className="cl255-a">Copy</span>
            </button>
          );
        })}
      </div>
    </Sec255>
  );
};

/* ── B · You and {first}: the query story ─────────────────────────────────────────────────────────────────── */
const NEXT_RING = <i className="cl255-nx" aria-hidden="true" />;
export const YouAndStory: React.FC<{ blocks: readonly StoryBlock[]; heard: string | null; first: string; onOpenQuery: (id: string) => void }> = ({ blocks, heard, first, onOpenQuery }) => (
  <Sec255 icon={IC255.doc} title={`You and ${first}`} right={blocks.length ? heard : null} k="you-and">
    {blocks.length ? blocks.map((b) => {
      const ww = b.wait ? waitWords(b.wait, first) : null;
      return (
        <div key={b.id} className="cl255-blk" data-cl255="block" data-id={b.id}>
          {b.book ? <button type="button" className="cl255-bk" data-cl255="book" onClick={() => onOpenQuery(b.id)}>{b.book}</button> : null}
          {b.wait && ww ? (
            <div className="cl255-w cl255-wait" data-cl255="wait" data-weeks={b.wait.weeks} data-past={b.wait.past} data-blocks={b.wait.blocks.length}>
              {b.wait.blocks.length ? <span className="cl255-bar wt" aria-hidden="true">{b.wait.blocks.map((x, i) => <i key={i} className={x === "empty" ? undefined : x} data-cl255="wblock" data-b={x} />)}</span> : null}
              <span className={`cl255-cap${b.wait.blocks.length ? "" : " solo"}`}><b>{ww.bold}</b> since you sent it{ww.rest ? <> · {ww.late ? <>past {first}’s usual <b className="late">{b.wait.reply}</b></> : <i>{ww.rest}</i>}</> : null}</span>
            </div>
          ) : null}
          <ol className="cl255-tl" data-cl255="timeline">
            {b.rows.map((r) => r.kind === "step" ? (
              <li key={r.key} className={r.current ? "cur" : undefined} data-cl255="step" data-status={r.status} data-date={r.date}>
                <span className="g"><StatusDot status={r.status} overrideSize={16} /></span><b>{r.label}</b><em>{r.date}</em>
              </li>
            ) : r.kind === "nudge" ? (
              <li key={r.key} className="nd" data-cl255="nudge" data-date={r.date}><span className="g"><i className="cl255-dot" aria-hidden="true" /></span><b>{r.label}</b><em>{r.date}</em></li>
            ) : r.kind === "quote" ? (
              <li key={r.key} className="qt" data-cl255="quote"><span className="g" /><q>{r.text}</q></li>
            ) : (
              <li key={r.key} className="nx" data-cl255="next" data-date={r.date}><span className="g">{NEXT_RING}</span><b>{r.label}</b><em>{r.date}</em></li>
            ))}
          </ol>
        </div>
      );
    }) : (
      <div className="cl255-none" data-cl255="not-queried">
        <span className="cl255-nqg" aria-hidden="true">{NQ_RING}</span>
        <span><b>You haven’t queried {first} yet.</b><small>When you do, every step lands here.</small></span>
      </div>
    )}
  </Sec255>
);
