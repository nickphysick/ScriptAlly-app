/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEXT-STEP SECTION (Contact list v14 §2; ref design-refs/contact-list-v14.html `.kk-band`). One frame and
 * four states — ready, reopening, gaps, done — chosen by `lib/contactNextStep` from the writer's data. It
 * replaces v13's carousel and always says the most useful next thing to do with your agents for this book.
 *
 * ⚠️ THE CARD IS `AgentCarouselCard`, NOT THE QUICK VIEW (ruling, 7 Oct). The quick view is the modal's own
 * content — an Escape layer whose last step closes the card, a window key listener, a hard-coded heading id —
 * and none of that may run inline on a page. `AgentCarouselCard` is built from the quick view's shared blocks
 * (`AgentCardParts`), so the two cannot fork; it only gains a chip and a button override here.
 *
 * ⚠️ THE FRAME TAKES ITS HEIGHT FROM ITS CONTENT, AND THE CARD IS BOTTOM-ANCHORED 22 ABOVE ITS FOOT. The card's
 * slot ends 12 inside the frame's 10px padding (22 in all) and starts 56 above its own row, so a card taller
 * than the well rises just past the frame's top edge rather than leaving space under itself (the mock's own
 * construction, measured). Where the well's text wraps taller than the card (1280), the frame grows with the
 * well and the card still sits on its foot — the mock does exactly that (reported).
 *
 * ⚠️ EVERY DISCOVER LINK IS GATED ON `DISCOVER_LIVE` (ruling Q4) through the `discoverLive` prop, which the
 * page passes from the one constant. The render tests hold both branches.
 *
 * No pronouns for agents, no appraisal words, and QueryHawk writes nothing for the writer.
 */
import React from "react";
import type { Agent, CommunityAgent } from "../../../types";
import type { AgentFacts } from "../../../lib/contactList";
import type { QcRow } from "../../../lib/qcSummary";
import type { CardAct } from "../../../lib/agentCard";
import type { PersonalGenre } from "../../../lib/genres";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { formatDate } from "../../../lib/dates";
import { daysUntil, dayOf, type NextStep } from "../../../lib/contactNextStep";
import { statedWeeks } from "../../../lib/contactStrip";
import { AgentCarouselCard } from "../card/AgentCarouselCard";

export interface ContactNextStepProps {
  step: NextStep;
  /** the book's title, or null (no manuscript in scope) */
  bookTitle: string | null;
  /** `joinGenres(book)` — "thrillers or crime"; "" when the book has no genre */
  genres: string;
  factsById: ReadonlyMap<string, AgentFacts>;
  qFor: (agentId: string) => QcRow | null;
  genreHit: (genre: string) => boolean;
  personal?: PersonalGenre[];
  todayIso: string;
  /** is the reopen reminder set for this agent */
  reminded: (a: Agent) => boolean;
  /** `DISCOVER_LIVE` — gates every Discover link and the "In Discover" list */
  discoverLive: boolean;
  /** Discover agents who take the book's genres and are open, not already on the list — read only while live */
  discover: readonly CommunityAgent[];
  onOpen: (agentId: string, rect?: DOMRect) => void;
  onAct: (agentId: string, act: CardAct) => void;
  onAdd: (agentId: string, focus: "genres" | "wishlist" | "materials") => void;
  onSeeAll: () => void;
  onOpenHk: () => void;
  onNewAgent: (from?: DOMRect) => void;
  onDiscover: () => void;
  onRemind: (a: Agent) => void;
  onRemindAll: (agents: readonly Agent[]) => void;
  onAddDiscover: (ca: CommunityAgent) => void;
}

const dayShort = (iso: string) => {
  const t = Date.parse(`${dayOf(iso)}T00:00:00`);
  return Number.isFinite(t) ? formatDate(new Date(t), { day: "numeric", month: "short" }) : iso;
};
const tile = (iso: string) => {
  const t = Date.parse(`${dayOf(iso)}T00:00:00`);
  if (!Number.isFinite(t)) return { d: "", m: "" };
  const d = new Date(t);
  return { d: String(d.getDate()), m: formatDate(d, { month: "short" }) };
};
const weeks = (a: Pick<Agent, "responseTimeWeeks">) => { const w = statedWeeks(a); return w ? `~${w} wks` : "Not known"; };
const where = (a: Pick<Agent, "name" | "agency" | "city">) =>
  [(a.name ?? "").trim() ? (a.agency ?? "").trim() : "", (a.city ?? "").trim()].filter(Boolean).join(", ");
const stars = (r: number | undefined) => {
  const n = typeof r === "number" ? r : 0;
  if (!n) return null;
  return <span className="cl14-nl-st" aria-label={`Rated ${n} of 5`}>{"★".repeat(n)}<i aria-hidden="true">{"★".repeat(5 - n)}</i></span>;
};
/** "1 agent" / "N agents" */
const agentsN = (n: number) => `${n} ${n === 1 ? "agent" : "agents"}`;

const Book: React.FC<{ t: string | null }> = ({ t }) => (t ? <i>{t}</i> : <>your book</>);

const Progress: React.FC<{ fill: number; line: React.ReactNode }> = ({ fill, line }) => (
  <div className="cl14-nx-prog" data-cl14="prog">
    <span className="cl14-nx-bar" aria-hidden="true"><i style={{ width: `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%` }} /></span>
    <span>{line}</span>
  </div>
);

/** The ledger row: a blush disc, the name with the writer's stars, agency and city, the one-line wishlist, and
 *  the reply time on the right that becomes the row's action on hover or focus. */
const LedgerRow: React.FC<{
  a: Agent; side: React.ReactNode; action: React.ReactNode; sub?: React.ReactNode; onOpen: (id: string, r?: DOMRect) => void;
  /** in place of the initials disc (the reopening rows' date tile) */
  lead?: React.ReactNode;
  /** the action shows at rest, not only on hover (reopening, gaps) */
  standing?: boolean;
}> = ({ a, side, action, sub, onOpen, lead, standing }) => (
  <li className={`cl14-nl-row${standing ? " cl14-nl-row--act" : ""}`} data-cl14="nl-row" data-agent={a.id} tabIndex={0}
    onClick={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; onOpen(a.id, e.currentTarget.getBoundingClientRect()); }}
    onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); onOpen(a.id, e.currentTarget.getBoundingClientRect()); } }}>
    {lead ?? <span className="cl14-disc" aria-hidden="true">{agentInitials(a)}</span>}
    <div className="cl14-nl-main">
      <div className="cl14-nl-top"><b>{agentPrimary(a)}</b>{stars(a.starRating)}</div>
      {where(a) && <small>{where(a)}</small>}
      {sub ?? ((a.mswlNotes ?? "").trim() ? <p>{(a.mswlNotes ?? "").trim()}</p> : null)}
    </div>
    <div className="cl14-nl-side">{side}{action}</div>
  </li>
);

export const ContactNextStep: React.FC<ContactNextStepProps> = (p) => {
  const { step, bookTitle, genres } = p;
  const s = step.state;
  const live = p.discoverLive;

  const card = (a: Agent, chip: string, action?: { label: string; onClick: () => void; on?: boolean }) => {
    const f = p.factsById.get(a.id);
    if (!f) return null;
    return (
      <AgentCarouselCard agent={a} facts={f} q={p.qFor(a.id)} genreHit={p.genreHit} personal={p.personal}
        fitWord={genres || null} fits={(a.genres ?? []).some(p.genreHit)}
        onOpen={(id, r) => p.onOpen(id, r)} onAdd={p.onAdd} onAct={p.onAct} chip={chip} action={action} />
    );
  };
  const remindAction = (a: Agent) => {
    const on = p.reminded(a);
    return { label: on ? "✓ Reminder set" : "Remind me", on, onClick: () => p.onRemind(a) };
  };
  const remindButton = (a: Agent) => {
    const on = p.reminded(a);
    return <button type="button" className={`cl14-out cl14-out--sm${on ? " is-on" : ""}`} aria-pressed={on} data-cl14="remind" onClick={() => p.onRemind(a)}>{on ? "✓ Reminder set" : "Remind me"}</button>;
  };
  const addCard = (
    <article className="cl14-addc" data-cl14="addcard">
      <div className="cl14-addc-b"><span className="cl13-acchip">New agent</span></div>
      <div className="cl14-addc-in">
        <span className="cl14-addc-plus" aria-hidden="true">+</span>
        <b>Add an agent</b>
        <p>Paste a link to their agency page and we&rsquo;ll fill in what we can, or add their details yourself.</p>
        <button type="button" className="cl14-go" data-cl14="addcard-go" onClick={(e) => p.onNewAgent(e.currentTarget.getBoundingClientRect())}>Add an agent</button>
      </div>
    </article>
  );

  let title: string, lede: React.ReactNode, prog: React.ReactNode = null, why: React.ReactNode = null, cta: React.ReactNode = null;
  let middle: React.ReactNode = null, side: React.ReactNode = null;

  if (!genres) {
    /* the book has no genre (or no book is in scope): nothing can take it, so the section says what would help */
    title = "Your next step";
    lede = bookTitle
      ? <>Add a genre to <Book t={bookTitle} /> and the agents on your list who take it will show up here.</>
      : <>Choose a manuscript and the agents on your list who take its genres will show up here.</>;
    middle = addCard;
  } else if (s === "ready") {
    const n = step.ready.length, first = step.ready[0], rest = step.ready.slice(1, 4), more = Math.max(0, n - 4);
    title = "Ready to query";
    lede = n === 1
      ? <><b>1 agent</b> on your list takes {genres}, is open to submissions and hasn&rsquo;t seen <Book t={bookTitle} /> yet.</>
      : <><b>{n} agents</b> on your list take {genres}, are open to submissions and haven&rsquo;t seen <Book t={bookTitle} /> yet.</>;
    prog = <Progress fill={step.takers ? step.sent / step.takers : 0}
      line={<>You&rsquo;ve sent it to {step.sent} of the {agentsN(step.takers)} on your list who {step.takers === 1 ? "takes" : "take"} {genres}.</>} />;
    why = "Your highest-rated agents come first. If two share a rating, the one who usually replies sooner goes first.";
    cta = <button type="button" className="cl14-out" data-cl14="see-all" onClick={p.onSeeAll}>See all {n} in the list</button>;
    middle = card(first, "First up");
    side = (
      <>
        <div className="cl14-nl-h"><h3>Next in line</h3><span>sorted by your rating, then reply time</span></div>
        <ol className="cl14-nl" data-cl14="nl">
          {rest.map((a) => (
            <LedgerRow key={a.id} a={a} onOpen={p.onOpen}
              side={<span className="cl14-nl-wk">{weeks(a)}</span>}
              action={<button type="button" className="cl14-go cl14-nl-go" data-cl14="nl-log" onClick={() => p.onAct(a.id, "log")}>Log a query</button>} />
          ))}
        </ol>
        {more > 0 && <button type="button" className="cl14-more" data-cl14="nl-more" onClick={p.onSeeAll}>and {more} more</button>}
      </>
    );
  } else if (s === "reopening") {
    const n = step.reopening.length, first = step.reopening[0], rest = step.reopening.slice(1, 4);
    const allOn = step.reopening.every(p.reminded);
    title = "Reopening soon";
    lede = <>Every open agent who takes {genres} has seen <Book t={bookTitle} />. <b>{n} more</b> {n === 1 ? "opens" : "open"} to submissions again soon.</>;
    prog = <Progress fill={1} line={<>You&rsquo;ve sent it to every agent on your list who takes {genres} and is open right now.</>} />;
    why = "Set a reminder and we’ll let you know the day they reopen, so your query goes in early.";
    cta = (
      <button type="button" className={`cl14-out${allOn ? " is-on" : ""}`} data-cl14="remind-all" aria-pressed={allOn} onClick={() => p.onRemindAll(step.reopening)}>
        {allOn ? (n === 1 ? "✓ Reminder set" : "✓ Reminders set") : n === 1 ? "Remind me" : n === 2 ? "Remind me about both" : `Remind me about all ${n}`}
      </button>
    );
    middle = card(first, `Reopens ${dayShort(first.reopensOn ?? "")}`, remindAction(first));
    side = (
      <>
        {rest.length > 0 && (
          <>
            <div className="cl14-nl-h"><h3>Also reopening</h3><span>soonest first</span></div>
            <ol className="cl14-nl" data-cl14="nl">
              {rest.map((a) => {
                const t = tile(a.reopensOn ?? "");
                const d = daysUntil(a.reopensOn ?? "", p.todayIso);
                return (
                  <LedgerRow key={a.id} a={a} onOpen={p.onOpen} standing
                    lead={<span className="cl14-cal" aria-hidden="true"><b>{t.d}</b><small>{t.m}</small></span>}
                    sub={<p className="cl14-nl-when">Reopens in {d} {d === 1 ? "day" : "days"}</p>}
                    side={null} action={remindButton(a)} />
                );
              })}
            </ol>
          </>
        )}
        {live && <p className="cl14-nx-foot" data-cl14="discover-foot">Don&rsquo;t want to wait? <button type="button" className="cl14-link" onClick={p.onDiscover}>Find more agents in Discover</button></p>}
      </>
    );
  } else if (s === "gaps") {
    const n = step.gaps.length, first = step.gaps[0], rest = step.gaps.slice(1, 4);
    title = "A few more might fit";
    lede = <>You&rsquo;ve sent <Book t={bookTitle} /> to every agent who takes {genres}. <b>{agentsN(n)}</b> on your list {n === 1 ? "has" : "have"} no genres recorded, so we can&rsquo;t tell yet.</>;
    prog = <Progress fill={1} line={<>Sent to all {agentsN(step.takers)} on your list who {step.takers === 1 ? "takes" : "take"} {genres}.</>} />;
    why = <>Add their genres, and anyone who takes {genres} will show up here, ready to query.</>;
    cta = <button type="button" className="cl14-out" data-cl14="open-hk" onClick={p.onOpenHk}>Open Housekeeping</button>;
    middle = card(first, "Genres missing", { label: "Add genres", onClick: () => p.onAdd(first.id, "genres") });
    side = (
      <>
        {rest.length > 0 && (
          <>
            <div className="cl14-nl-h"><h3>Also missing genres</h3></div>
            <ol className="cl14-nl" data-cl14="nl">
              {rest.map((a) => (
                <LedgerRow key={a.id} a={a} onOpen={p.onOpen} side={null} standing
                  action={<button type="button" className="cl14-out cl14-out--sm" data-cl14="add-genres" onClick={() => p.onAdd(a.id, "genres")}>Add genres</button>} />
              ))}
            </ol>
          </>
        )}
        {live && <p className="cl14-nx-foot" data-cl14="discover-foot">Or <button type="button" className="cl14-link" onClick={p.onDiscover}>find more agents in Discover</button></p>}
      </>
    );
  } else {
    const { reading, more, passed } = step.outcomes;
    title = "Every agent queried";
    lede = <><Book t={bookTitle} /> has gone to all <b>{agentsN(step.takers)}</b> on your list who {step.takers === 1 ? "takes" : "take"} {genres}.</>;
    prog = <Progress fill={1} line={<>{reading} {reading === 1 ? "is" : "are"} still reading, {more} asked to see more and {passed} passed.</>} />;
    why = live
      ? <>To keep it moving, add agents you&rsquo;ve found elsewhere, or browse Discover for agents who take {genres}.</>
      : <>To keep it moving, add agents you&rsquo;ve found elsewhere.</>;
    cta = live
      ? <button type="button" className="cl14-out" data-cl14="discover-more" onClick={p.onDiscover}>Discover more agents</button>
      : <button type="button" className="cl14-out" data-cl14="add-agent" onClick={(e) => p.onNewAgent(e.currentTarget.getBoundingClientRect())}>Add an agent</button>;
    middle = addCard;
    const shown = p.discover.slice(0, 3), rest = Math.max(0, p.discover.length - 3);
    side = live && shown.length > 0 ? (
      <>
        <div className="cl14-nl-h"><h3>In Discover</h3><span>take {genres}, open now</span></div>
        <ol className="cl14-nl" data-cl14="nl">
          {shown.map((ca) => (
            <li key={ca.id} className="cl14-nl-row" data-cl14="nl-row">
              <span className="cl14-disc" aria-hidden="true">{agentInitials(ca)}</span>
              <div className="cl14-nl-main">
                <div className="cl14-nl-top"><b>{agentPrimary(ca)}</b></div>
                {where(ca) && <small>{where(ca)}</small>}
                {(ca.genres ?? []).length > 0 && <p>{(ca.genres ?? []).join(", ")}</p>}
              </div>
              <div className="cl14-nl-side">
                <span className="cl14-nl-wk">{weeks(ca)}</span>
                <button type="button" className="cl14-go cl14-nl-go" data-cl14="discover-add" onClick={() => p.onAddDiscover(ca)}>Add to my list</button>
              </div>
            </li>
          ))}
        </ol>
        {rest > 0 && <button type="button" className="cl14-more" data-cl14="discover-rest" onClick={p.onDiscover}>and {rest} more in Discover</button>}
      </>
    ) : null;
  }

  return (
    <div className="cl14-next" data-cl14="next" data-state={genres ? s : "nobook"}>
      <section className="cl14-nx" aria-label="Your next step">
        <div className="cl14-nx-well" data-cl14="well">
          <h2>{title}</h2>
          <p className="cl14-nx-lede">{lede}</p>
          {prog}
          {why && <p className="cl14-nx-why">{why}</p>}
          {cta}
        </div>
        <div className="cl14-nxc" data-cl14="card">{middle}</div>
        <div className="cl14-nx-side" data-cl14="side">{side}</div>
      </section>
    </div>
  );
};
