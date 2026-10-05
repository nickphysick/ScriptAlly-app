/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card in the carousel's dress (Contact list v13 §4; ref design-refs/contact-list-v13.html
 * `.ac`): a slate band with the standing and the stars, the identity, then genres sought, the
 * wishlist and what they want you to send — torn slips for missing parts — and a foot with the door,
 * the fit and the one next step.
 *
 * ⚠️ NOT A SECOND AGENT CARD (ruling Q2). The identity and the three blocks are `AgentCardParts`, the
 * quick view's own; this file arranges them and adds a band and a foot. It holds no state, takes no
 * Escape layer and binds no keys, so eight of them on a page cost nothing.
 * ⚠️ IT CARRIES NO `data-ac` MARKER. Those are the open card's probes, read unscoped by the agent card's
 * suites; this card's blocks are namespaced `data-cl13-blk` and its own parts `data-cl13`.
 * ⚠️ EVERY FACT IS lib/agentCard's — the standing (`queryTone`), the next step (`primaryFor`), the
 * reply line — so a carousel card cannot disagree with the quick view it opens.
 */
import React, { useMemo } from "react";
import type { Agent } from "../../../types";
import type { AgentFacts } from "../../../lib/contactList";
import type { QcRow } from "../../../lib/qcSummary";
import { type CardAct, materialChips, primaryFor, queryTone } from "../../../lib/agentCard";
import { genreLabel, type PersonalGenre } from "../../../lib/genres";
import { formatDate } from "../../../lib/dates";
import { CardIdentity, GenresBlock, MaterialsBlock, WishlistBlock } from "./AgentCardParts";

/** "1 Nov" — the reopening date as the band and the foot say it */
const day = (iso: string) => {
  const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isFinite(t) ? formatDate(new Date(t), { day: "numeric", month: "short" }) : iso;
};

/** The carousel's button is the row's tray's: the same act, in a compact label */
const SHORT: Partial<Record<CardAct, string>> = { remind: "Remind me" };

export interface AgentCarouselCardProps {
  agent: Agent;
  facts: AgentFacts;
  q: QcRow | null;
  genreHit: (g: string) => boolean;
  personal?: PersonalGenre[];
  /** "thrillers" — the manuscript's genre as the foot says it; null when none is in scope */
  fitWord: string | null;
  /** the agent takes the manuscript's genre */
  fits: boolean;
  onOpen: (agentId: string, rect: DOMRect) => void;
  /** a torn slip's Add: the card's editor at that field (the row's slips do the same) */
  onAdd: (agentId: string, focus: "genres" | "wishlist" | "materials") => void;
  onAct: (agentId: string, act: CardAct) => void;
}

export const AgentCarouselCard: React.FC<AgentCarouselCardProps> = ({ agent, facts, q, genreHit, personal, fitWord, fits, onOpen, onAdd, onAct }) => {
  const tone = queryTone(facts, q);
  const primary = primaryFor(facts, q);
  const reopens = (agent.reopensOn ?? "").trim();
  const shut = facts.door === "closed";
  const chip = shut && !q && reopens ? `Closed till ${day(reopens)}` : tone.label;
  const rating = typeof agent.starRating === "number" ? agent.starRating : 0;
  const genres = useMemo(
    () => (agent.genres ?? []).map((g) => genreLabel(g, personal)).sort((a, b) => Number(genreHit(b)) - Number(genreHit(a))),
    [agent.genres, genreHit, personal],
  );
  const mats = useMemo(() => materialChips(agent.materialsWanted as string[] | undefined), [agent.materialsWanted]);
  const w = agent.responseTimeWeeks;
  const sub = [
    (agent.name ?? "").trim() ? (agent.agency ?? "").trim() : "",
    (agent.city ?? "").trim(),
    typeof w === "number" && w > 0 ? `replies in ~${w} wks` : "",
  ].filter(Boolean).join(" · ");

  /* the card opens the agent card; anything inside it that is itself a control keeps its own job */
  const open = (e: React.SyntheticEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button, a") && e.target !== e.currentTarget) return;
    onOpen(agent.id, e.currentTarget.getBoundingClientRect());
  };

  return (
    <article
      className="ac cl13-ac" data-cl13="ccard" data-agent={agent.id} tabIndex={0}
      aria-label={`${agent.name?.trim() || agent.agency?.trim() || "Agent"}: open their card`}
      onClick={open}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(e); } }}
    >
      <div className="cl13-acb" data-cl13="cband">
        <span className="cl13-acchip" data-cl13="ctone">{chip}</span>
        <span className="cl13-acst" aria-label={rating ? `Rated ${rating} of 5` : "Not rated"}>
          {"★".repeat(rating)}<span aria-hidden="true">{"★".repeat(5 - rating)}</span>
        </span>
      </div>
      <CardIdentity agent={agent} className="cl13-ach" probe="cl13">
        {sub && <small className="cl13-acsub">{sub}</small>}
      </CardIdentity>
      <GenresBlock genres={genres} genreHit={genreHit} onAdd={() => onAdd(agent.id, "genres")} probe="cl13" />
      <WishlistBlock wish={(agent.mswlNotes ?? "").trim()} onAdd={() => onAdd(agent.id, "wishlist")} probe="cl13" />
      <MaterialsBlock mats={mats} label="Wants you to send" onAdd={() => onAdd(agent.id, "materials")} probe="cl13" />
      <div className="cl13-acf" data-cl13="cfoot">
        <small>
          {shut ? (reopens ? `Reopens ${day(reopens)}` : "Closed to queries") : "Open to queries"}
          {fits && fitWord ? <><br />Fits {fitWord}</> : null}
        </small>
        {primary.act !== "qc" && (
          <button
            type="button" className="cl13-acgo" data-cl13="cgo" data-act={primary.act}
            onClick={(e) => { e.stopPropagation(); onAct(agent.id, primary.act); }}
          >{SHORT[primary.act] ?? primary.label}</button>
        )}
      </div>
    </article>
  );
};
