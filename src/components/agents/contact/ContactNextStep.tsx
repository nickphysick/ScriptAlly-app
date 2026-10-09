/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEXT-STEP SECTION (Contact list v15 §4, §4a; v14 §2). Three states — ready, reopening, all queried — chosen
 * by `lib/contactNextStep` from the writer's data. It always says the most useful next thing to do with your
 * agents for this book. v14's fourth state (the agents with no genres recorded) is retired: those agents are
 * ready now, by the one ready rule the section, the pill and See all share.
 *
 * ⚠️ THE LAYOUT IS `shell/featureStage` (§4a): the text straight on the page, the agent card floating over the left
 * edge of a white panel, and the list in the panel. In the ready state the list is PICKABLE: a click (or Enter /
 * Space on the focused row) puts that agent on the card, which reads "First up" for the first and "Next up" for
 * any other. The first agent is picked on load.
 *
 * ⚠️ THE CARD IS `AgentCarouselCard`, NOT THE QUICK VIEW (ruling, 7 Oct). The quick view is the modal's own
 * content — an Escape layer whose last step closes the card, a window key listener, a hard-coded heading id —
 * and none of that may run inline on a page. `AgentCarouselCard` is built from the quick view's shared blocks
 * (`AgentCardParts`), so the two cannot fork; it only gains a chip and a button override here.
 *
 * ⚠️ EVERY DISCOVER LINK IS GATED ON `DISCOVER_LIVE` (ruling Q4) through the `discoverLive` prop, which the
 * page passes from the one constant. The render tests hold both branches. While it is off, the all-queried state's
 * panel is the COMING-SOON panel (v15.2 §3): a plum header strip with the title and a "Coming soon" chip, one sentence,
 * three feature rows, "Tell me when it's ready" (which stores the request on the writer's profile), and the binoculars
 * bird at the panel's bottom right. The day the constant is true, v14's "In Discover" list takes the panel.
 *
 * ⚠️ THE ADD CARD SHOWS A GHOST OF A FILLED AGENT CARD (v15.2 §3b) above its title: shapes only, `aria-hidden`, naming
 * nobody. In the all-queried state the card only just tucks over the panel (44; 36 below 1440) — the sheet does that.
 *
 * ⚠️ THE COMING-SOON HEADER IS ITS OWN ELEMENT, NOT `FeaturePanelHead`, so no rule about the list's header note can
 * reach its chip: the chip shows at every width.
 *
 * No pronouns for agents, no appraisal words, and QueryHawk writes nothing for the writer.
 */
import React, { useState } from "react";
import type { Agent, CommunityAgent } from "../../../types";
import type { AgentFacts } from "../../../lib/contactList";
import type { QcRow } from "../../../lib/qcSummary";
import type { CardAct } from "../../../lib/agentCard";
import type { PersonalGenre } from "../../../lib/genres";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { formatDate } from "../../../lib/dates";
import { daysUntil, dayOf, genresUnknown, type NextStep } from "../../../lib/contactNextStep";
import { statedWeeks } from "../../../lib/contactStrip";
import { AgentCarouselCard } from "../card/AgentCarouselCard";
import { FeatureList, FeaturePanelHead, FeatureStage, type FeatureRow } from "../../shell/featureStage/FeatureStage";

export interface ContactNextStepProps {
  step: NextStep;
  /** a manuscript is in scope (with none, "this book" names nothing and the section says so) */
  hasBook: boolean;
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
  /** the writer asked to be told when Discover opens (`notifyPrefs.discover`), and the toggle that stores it */
  notifyDiscover: boolean;
  onNotifyDiscover: () => void;
  /** Discover agents who take the book's genres and are open, not already on the list — read only while live */
  discover: readonly CommunityAgent[];
  onOpen: (agentId: string, rect?: DOMRect) => void;
  onAct: (agentId: string, act: CardAct) => void;
  onAdd: (agentId: string, focus: "genres" | "wishlist" | "materials") => void;
  onSeeAll: () => void;
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
const weeks = (a: Pick<Agent, "responseTimeWeeks">) => { const w = statedWeeks(a); return w ? `~${w} wks` : "—"; };
/** the line under a row's name: the agency (the city where the agency IS the name) */
const where = (a: Pick<Agent, "name" | "agency" | "city">) => ((a.name ?? "").trim() ? (a.agency ?? "").trim() : (a.city ?? "").trim());
/** "1 agent" / "N agents" */
const agentsN = (n: number) => `${n} ${n === 1 ? "agent" : "agents"}`;
/** how many rows the panel lists (§4a) */
export const LIST_ROWS = 5;

/** the binoculars bird on a branch (523 × 512, transparent, cropped tight): 2× its largest drawn size */
export const DISCOVER_BIRD = { src: "/images/contact/discover-binoculars-bird.png", width: 523, height: 512 };
const FI = { viewBox: "0 0 20 20", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
/** what Discover will do, while it is coming soon (v15.2 §3d): a filter, an open door, a page with lines */
export const DISCOVER_FEATURES: readonly { title: string; line: string; icon: React.ReactNode }[] = [
  { title: "By genre", line: "Only agents who take what you write.",
    icon: <svg {...FI} strokeLinecap="round"><path d="M3 5h14M6 10h8M8.5 15h3" /></svg> },
  { title: "Open now", line: "See who’s accepting submissions today.",
    icon: <svg {...FI} strokeLinejoin="round"><path d="M4 17V4.5h8.5V17" /><path d="M12.5 4.5l3.5 1.5v11l-3.5-1.5" /><circle cx="10.4" cy="11" r=".9" fill="currentColor" stroke="none" /></svg> },
  { title: "Their wishlist", line: "What they want, and what to send.",
    icon: <svg {...FI} strokeLinecap="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7.5h4M8 10.5h4M8 13.5h2.5" /></svg> },
];

const Book: React.FC<{ t: string | null }> = ({ t }) => (t ? <i>{t}</i> : <>your book</>);
const Disc: React.FC<{ a: Parameters<typeof agentInitials>[0] }> = ({ a }) => <span className="cl14-disc">{agentInitials(a)}</span>;

export const ContactNextStep: React.FC<ContactNextStepProps> = (p) => {
  const { step, bookTitle, genres } = p;
  const s = step.state;
  const live = p.discoverLive;
  /* the ready state's pick: the first agent until the writer picks another; a pick that has left the list falls back */
  const [pick, setPick] = useState<string | null>(null);

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
      {/* v15.2 §3b — a ghost of a filled agent card: shapes only, nobody's name */}
      <div className="cl15-gh" data-cl15="ghost" aria-hidden="true">
        <div className="cl15-gh-id"><i className="cl15-gh-disc" /><span><i className="cl15-gh-l is-60" /><i className="cl15-gh-l is-40 is-s" /></span></div>
        <i className="cl15-gh-cap" />
        <span className="cl15-gh-chips"><i /><i /></span>
        <i className="cl15-gh-cap" />
        <i className="cl15-gh-l is-90 is-s" />
        <i className="cl15-gh-l is-70 is-s" />
      </div>
      <div className="cl14-addc-in">
        <b>Add an agent</b>
        <p>Paste a link to their agency page and we&rsquo;ll fill in what we can, or add their details yourself.</p>
        <button type="button" className="cl14-go" data-cl14="addcard-go" onClick={(e) => p.onNewAgent(e.currentTarget.getBoundingClientRect())}>Add an agent</button>
      </div>
    </article>
  );

  let title: string, sentence: React.ReactNode, extra: React.ReactNode = null, action: React.ReactNode = null;
  let middle: React.ReactNode = null, cardKey = "add", panel: React.ReactNode | null = null, compact = false;
  let panelClass: string | undefined;

  if (!p.hasBook) {
    /* no manuscript is in scope: "this book" names nothing, so the section says what would help */
    title = "Your next step";
    sentence = <>Choose a manuscript and the agents on your list who haven&rsquo;t seen it yet will show up here.</>;
    middle = addCard;
  } else if (s === "ready") {
    const n = step.ready.length, u = step.unknown;
    const shown = step.ready.slice(0, LIST_ROWS), more = Math.max(0, n - LIST_ROWS);
    const at = Math.max(0, shown.findIndex((a) => a.id === pick));
    const cur = shown[at];
    title = "Ready to query";
    sentence = (
      <>
        <b>{agentsN(n)}</b> {n === 1 ? "is" : "are"} open and {n === 1 ? "hasn’t" : "haven’t"} seen <Book t={bookTitle} /> yet.
        {u > 0 && <> <b>{u}</b> {u === 1 ? "has" : "have"} no genres recorded.</>}
      </>
    );
    action = <button type="button" className="fs-go" data-cl14="see-all" onClick={p.onSeeAll}>See all {n} in the list</button>;
    middle = card(cur, at === 0 ? "First up" : "Next up");
    cardKey = cur.id;
    const rows: FeatureRow[] = shown.map((a) => ({
      id: a.id, lead: <Disc a={a} />, name: agentPrimary(a),
      sub: genresUnknown(a) ? "Genres not recorded" : where(a),
      side: <span className="fs-wk">{weeks(a)}</span>,
    }));
    panel = (
      <>
        <FeaturePanelHead title="Next in line" note="best fit first" />
        <FeatureList rows={rows} picked={cur.id} onPick={setPick} />
        {more > 0 && <button type="button" className="fs-more" data-cl14="nl-more" onClick={p.onSeeAll}>and {more} more</button>}
      </>
    );
  } else if (s === "reopening") {
    const n = step.reopening.length, first = step.reopening[0], rest = step.reopening.slice(1, LIST_ROWS);
    const allOn = step.reopening.every(p.reminded);
    title = "Reopening soon";
    sentence = <>Everyone open on your list has seen <Book t={bookTitle} />. <b>{n} more</b> {n === 1 ? "opens" : "open"} to submissions again soon.</>;
    action = (
      <button type="button" className={`fs-go${allOn ? " is-on" : ""}`} data-cl14="remind-all" aria-pressed={allOn} onClick={() => p.onRemindAll(step.reopening)}>
        {allOn ? (n === 1 ? "✓ Reminder set" : "✓ Reminders set") : n === 1 ? "Remind me" : n === 2 ? "Remind me about both" : `Remind me about all ${n}`}
      </button>
    );
    middle = card(first, `Reopens ${dayShort(first.reopensOn ?? "")}`, remindAction(first));
    cardKey = first.id;
    const rows: FeatureRow[] = rest.map((a) => {
      const t = tile(a.reopensOn ?? "");
      const d = daysUntil(a.reopensOn ?? "", p.todayIso);
      return {
        id: a.id, lead: <span className="cl14-cal"><b>{t.d}</b><small>{t.m}</small></span>, name: agentPrimary(a),
        sub: <>Reopens in {d} {d === 1 ? "day" : "days"}</>, action: remindButton(a),
      };
    });
    const foot = live ? <p className="cl14-nx-foot" data-cl14="discover-foot">Don&rsquo;t want to wait? <button type="button" className="cl14-link" onClick={p.onDiscover}>Find more agents in Discover</button></p> : null;
    panel = rows.length || foot ? (
      <>
        {rows.length > 0 && <><FeaturePanelHead title="Also reopening" note="soonest first" /><FeatureList rows={rows} picked={null} /></>}
        {foot}
      </>
    ) : null;
  } else {
    /* ALL QUERIED — every agent on the list is accounted for: queried + don't take the genre + closed to
       submissions = N (lib/contactNextStep), and the split line's parts sum to queried. */
    const { reading, asked, passed, withdrawn } = step.outcomes;
    const N = step.total, m = step.mismatches, c = step.closed;
    title = "You’ve queried all your agents";
    compact = true;
    sentence = step.queried === N
      ? <><Book t={bookTitle} /> has gone to {N === 1 ? <>the <b>1 agent</b></> : <>all <b>{N} agents</b></>} on your list.</>
      : <><Book t={bookTitle} /> has gone to <b>{step.queried} of your {agentsN(N)}</b>.</>;
    const notes = [
      m > 0 && genres ? `The other ${m} ${m === 1 ? "doesn’t" : "don’t"} take ${genres}.` : "",
      c > 0 ? `${c} ${c === 1 ? "is" : "are"} closed to submissions.` : "",
    ].filter(Boolean);
    extra = (
      <>
        <p className="cl15-nx-split" data-cl15="split">{reading} reading · {asked} asked for more · {passed} passed{withdrawn > 0 ? <> · {withdrawn} withdrawn</> : null}</p>
        {notes.length > 0 && <p className="cl15-nx-note" data-cl15="note">{notes.join(" ")}</p>}
      </>
    );
    middle = addCard;
    const shown = p.discover.slice(0, 3), rest = Math.max(0, p.discover.length - 3);
    panel = live && shown.length > 0 ? (
      <>
        <FeaturePanelHead title="In Discover" note={<>take {genres}, open now</>} />
        <FeatureList picked={null} rows={shown.map((ca) => ({
          id: ca.id, lead: <Disc a={ca} />, name: agentPrimary(ca), sub: where(ca),
          side: <span className="fs-wk">{weeks(ca)}</span>,
          action: <button type="button" className="cl14-go" data-cl14="discover-add" onClick={() => p.onAddDiscover(ca)}>Add to my list</button>,
        }))} />
        {rest > 0 && <button type="button" className="fs-more" data-cl14="discover-rest" onClick={p.onDiscover}>and {rest} more in Discover</button>}
      </>
    ) : live ? null : (
      <div className="cl15-dt" data-cl15="discover-soon">
        <div className="cl15-dt-h" data-cl15="discover-head">
          <h3 className="cl15-dt-t">Discover agents</h3>
          <span className="cl15-dt-soon" data-cl15="discover-chip">Coming soon</span>
        </div>
        <div className="cl15-dt-body">
          <div className="cl15-dt-copy">
            <p className="cl15-dt-p" data-cl15="discover-lede">Find new agents and add them to your list in one click.</p>
            <ul className="cl15-dt-f" data-cl15="discover-features">
              {DISCOVER_FEATURES.map((f) => (
                <li key={f.title}><span className="cl15-dt-i" aria-hidden="true">{f.icon}</span><b>{f.title}</b><small>{f.line}</small></li>
              ))}
            </ul>
            <button type="button" className={`cl15-dt-btn${p.notifyDiscover ? " is-on" : ""}`} data-cl15="discover-notify" aria-pressed={p.notifyDiscover} onClick={p.onNotifyDiscover}>
              {p.notifyDiscover ? "✓ We\u2019ll let you know" : "Tell me when it\u2019s ready"}
            </button>
          </div>
          <div className="cl15-dt-fig" aria-hidden="true">
            <img className="cl15-dt-bird" data-cl15="discover-bird" src={DISCOVER_BIRD.src} width={DISCOVER_BIRD.width} height={DISCOVER_BIRD.height} alt="" />
          </div>
        </div>
      </div>
    );
    if (!live) panelClass = "cl15-dtp";
  }

  return (
    <div className="cl14-next" data-cl14="next" data-state={p.hasBook ? s : "nobook"}>
      <FeatureStage probe="next" state={p.hasBook ? s : "nobook"} label="Your next step"
        title={title} titleSize={compact ? "compact" : "default"} sentence={sentence} extra={extra} action={action}
        card={middle} cardClass="cl14-nxc" cardKey={cardKey} panel={panel} panelClass={panelClass} />
    </div>
  );
};
