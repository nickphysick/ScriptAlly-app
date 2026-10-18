/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — "The Scout's picks": the lead card on its slate band, the "Coming up" queue, the keys, and the done
 * and none views (ref design-refs/discover-v1/discover-v1.html).
 *
 * ⚠️ EVERY LINE ON THE LEAD CARD IS A FIELD OR THE SCORER'S OWN OUTPUT. Absent text facts are left out (a wish-list
 *    block with no wish list is not drawn); community figures follow decision 5 (a zero clause goes).
 * ⚠️ THE FACTS REFLOW ON THE CARD'S OWN WIDTH (`container: dv1lead`), never the viewport — lock C1.
 * ⚠️ THE KEYS ARE REGISTERED (lib/shortcuts, scope "Discover") AND BOUND ONCE, HERE. They stand down in a field, over
 *    a modal, and while any escape-stack layer is open (the Tune drawer, the passed list, the query drawer) — lock C3.
 * ⚠️ THE FLAG AND EVERY ARROW ARE DRAWN — flag-icons' SVG and inline paths — never typed characters.
 */
import React, { useEffect, useRef } from "react";
import { SubmissionStatus, type CommunityAgent, type Manuscript } from "../../../types";
import { highlightSegments } from "../../../lib/discoverAgents";
import { communityLine, LENS_PHRASE, pickReasons, type DiscoverPrefs, type ScoutPick } from "../../../lib/scout";
import { agentInitials } from "../../../lib/agentDisplay";
import { countryName, flagFor } from "../../../lib/territory";
import { formatDate } from "../../../lib/dates";
import { bookGenreHit, bookGenres } from "../../../lib/genreMatch";
import { escapeDepth } from "../../../lib/escapeStack";
import { matchesShortcut, shortcutBlocked, SHORTCUTS } from "../../../lib/shortcuts";
import { DV_FACE } from "./DvHeader";
import "flag-icons/css/flag-icons.min.css";

export type DecideKind = "add" | "pass" | "skip";
export interface Leaving { id: string; kind: DecideKind }

const Ico = {
  shield: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 4.6 3.4 8.2 8 9 4.6-.8 8-4.4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  clock: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  mail: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  mute: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="m16 9 5 6M21 9l-5 6" /></svg>,
  doc: <svg viewBox="0 0 12 14" aria-hidden="true"><path d="M1.5 1h6l3 3v9h-9z" /><path d="M3.5 7h5M3.5 9.5h5" /></svg>,
  out: <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" /></svg>,
};

const siteLabel = (w?: string) => (w || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || null;
const siteHref = (w: string) => (/^https?:\/\//i.test(w.trim()) ? w.trim() : `https://${w.trim()}`);
const checked = (iso: string) => formatDate(iso, { day: "numeric", month: "short" });
const join = (xs: React.ReactNode[]) => xs.flatMap((x, i) => (i === 0 ? [x] : [i === xs.length - 1 ? " and " : ", ", x]));

/** The queue's foot sentence — it states the switches actually on, never a fixed list. */
export function leftOutLine(p: DiscoverPrefs): string | null {
  const parts: string[] = [];
  if (p.notOnList) parts.push("agents already on your list");
  if (p.openOnly) parts.push("agencies closed to queries");
  if (p.ukIreland) parts.push("agents outside the UK and Ireland");
  if (!parts.length) return null;
  const s = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${s[0].toUpperCase()}${s.slice(1)} are left out.`;
}

const FitTag: React.FC<{ p: ScoutPick; className?: string }> = ({ p, className = "" }) => (
  <span className={`dv1-fit${p.fit === "possible" ? " poss" : ""} ${className}`} data-dv1="fit">{p.fit === "possible" ? "Possible fit" : "Strong fit"}</span>
);

const LeadCard: React.FC<{
  p: ScoutPick; idx: number; total: number; manuscript: Manuscript | null; leaving: Leaving | null; busy: boolean;
  onDecide: (k: DecideKind) => void;
}> = ({ p, idx, total, manuscript, leaving, busy, onDecide }) => {
  const a: CommunityAgent = p.agent;
  const r = pickReasons(p, manuscript);
  const book = bookGenres(manuscript);
  const hit = bookGenreHit(book);
  const co = communityLine(r);
  const flag = flagFor(a.country);
  const place = a.city || countryName(a.country) || null;
  const site = siteLabel(a.website);
  const segs = a.mswlNotes ? highlightSegments(a.mswlNotes, p.breakdown.overlappingWords) : [];
  const mats = (a.materialsWanted || []).filter((m) => typeof m === "string" && m.trim());
  const genre = r.genreHits.find((g) => book[0] && g.toLowerCase() === book[0].toLowerCase()) ?? r.genreHits[0] ?? null;
  const stamped = leaving && leaving.id === a.id && leaving.kind !== "skip" ? leaving.kind : null;
  const out = leaving && leaving.id === a.id;
  return (
    <article className={`dv1-lead${out ? " is-out" : ""}${leaving?.kind === "skip" && out ? " is-skip" : ""}`} data-dv1="lead" data-id={a.id} aria-labelledby="dv1LeadN">
      <div className="dv1-band" data-dv1="band">
        <span className="dv1-pk" data-dv1="pick-n">Pick {idx} of {total}</span>
        <FitTag p={p} />
        <span className="dv1-sp" />
        {a.submissionStatus === SubmissionStatus.OPEN ? <span className="dv1-door"><i />Open to queries</span>
          : a.submissionStatus === SubmissionStatus.CLOSED ? <span className="dv1-door shut"><i />Closed to queries</span> : null}
        {a.lastVerifiedDate ? <span className="dv1-ver" data-dv1="checked">{Ico.shield}Checked {checked(a.lastVerifiedDate)}</span> : null}
      </div>
      <div className={`dv1-stamp${stamped ? " on" : ""}${stamped === "pass" ? " pass" : ""}`} data-dv1="stamp" aria-hidden={!stamped}>
        {stamped === "add" ? "Added to your list" : stamped === "pass" ? "Not for me" : ""}
      </div>
      <div className="dv1-body">
        <div className="dv1-who">
          <span className="dv1-av" aria-hidden="true">{agentInitials(a)}</span>
          <div className="dv1-id">
            <h3 className="dv1-nm" id="dv1LeadN" data-dv1="lead-name">{a.name || a.agency}</h3>
            {a.name && a.agency ? <p className="dv1-ag">{a.agency}</p> : null}
            <div className="dv1-meta">
              {place ? <span>{flag ? <i className={`dv1-flag ${flag}`} aria-hidden="true" /> : null}{place}</span> : null}
              {(a.responseTimeWeeks || 0) > 0 ? <span>{Ico.clock}Replies in ~{a.responseTimeWeeks} weeks</span> : null}
              {a.submissionMethod ? <span>{Ico.mail}{a.submissionMethod}</span> : null}
              {a.noResponseMeansNo ? <span>{Ico.mute}No reply means no</span> : null}
            </div>
          </div>
          {site ? <a className="dv1-site" href={siteHref(a.website)} target="_blank" rel="noopener noreferrer">{site}{Ico.out}</a> : null}
        </div>
        <div className="dv1-why" data-dv1="why">
          <h4><img alt="" src={`${DV_FACE.src}?v=${DV_FACE.version}`} />Why the Scout picked them</h4>
          <ul>
            {genre ? <li>Takes <b>{genre}</b> — {book[0] && genre.toLowerCase() === book[0].toLowerCase() ? `the genre of ${manuscript?.title ?? "your book"}` : `one of the genres of ${manuscript?.title ?? "your book"}`}</li> : null}
            {r.words.length ? <li>Wish list mentions {join(r.words.map((w) => <b key={w}>{w}</b>))}</li>
              : p.fit === "possible" ? <li>No wish-list overlap found — a genre fit only, so it’s a possible rather than a strong one</li>
              : <li>Wish list overlaps on genre words only</li>}
            {co ? <li className="co" data-dv1="community">{co.lists ? <>On <b>{co.lists}</b> here</> : null}{co.lists && co.queried ? " · " : null}{co.queried ? (co.lists ? co.queried : `${co.queried[0].toUpperCase()}${co.queried.slice(1)}`) : null}</li> : null}
          </ul>
        </div>
        <div className="dv1-facts" data-dv1="facts">
          {a.genres?.length ? <div className="dv1-fg"><h5>Genres sought</h5><div className="dv1-chips">{a.genres.map((g) => <span key={g} className={hit(g) ? "hit" : ""}>{g}</span>)}</div></div> : null}
          {segs.length ? <div className="dv1-wish"><h5>Manuscript wish list</h5><p className="dv1-quote">{segs.map((s, i) => (s.hit ? <b key={i}>{s.text}</b> : <React.Fragment key={i}>{s.text}</React.Fragment>))}</p></div> : null}
          {mats.length ? <div className="dv1-fm"><h5>Materials requested</h5><div className="dv1-chips dv1-mats">{mats.map((m) => <span key={m}>{Ico.doc}{m}</span>)}</div></div> : null}
        </div>
        <div className="dv1-acts">
          <button type="button" className="dv1-b p dv1-lg" data-dv1="add" disabled={busy} onClick={() => onDecide("add")}>+ Add to contact list</button>
          <button type="button" className="dv1-b g dv1-lg" data-dv1="pass" disabled={busy} onClick={() => onDecide("pass")}>Not for me</button>
          <button type="button" className="dv1-b r" data-dv1="skip" disabled={busy} onClick={() => onDecide("skip")}>Skip for now</button>
          <span className="dv1-sp" />
          <span className="dv1-keyc" aria-hidden="true"><kbd>A</kbd><kbd>N</kbd><kbd>S</kbd></span>
        </div>
      </div>
    </article>
  );
};

export const DvPicks: React.FC<{
  queue: ScoutPick[];
  view: "live" | "done" | "none";
  manuscript: Manuscript | null;
  prefs: DiscoverPrefs;
  lens: keyof typeof LENS_PHRASE;
  skipped: readonly string[];
  passedCount: number;
  leaving: Leaving | null;
  pickIdx: number;
  pickTotal: number;
  onDecide: (k: DecideKind) => void;
  onLead: (id: string) => void;
  onTune: () => void;
  onHow: (step?: number) => void;
  onPassed: () => void;
  onShare: () => void;
}> = (p) => {
  const lead = p.queue[0] ?? null;
  const rest = p.queue.slice(1);
  const busy = !!p.leaving;
  const genre = bookGenres(p.manuscript)[0] ?? null;

  /* ── the keys: read through the registry, bound once ── */
  const live = useRef(p);
  live.current = p;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = live.current;
      if (c.view !== "live" || !c.queue.length || c.leaving) return;
      if (shortcutBlocked(e) || escapeDepth() > 0) return;
      let handled = true;
      if (matchesShortcut(SHORTCUTS.discoverAdd, e)) c.onDecide("add");
      else if (matchesShortcut(SHORTCUTS.discoverPass, e)) c.onDecide("pass");
      else if (matchesShortcut(SHORTCUTS.discoverSkip, e)) c.onDecide("skip");
      else if (matchesShortcut(SHORTCUTS.discoverNext, e)) { if (c.queue[1]) c.onLead(c.queue[1].agent.id); }
      else if (matchesShortcut(SHORTCUTS.discoverPrev, e)) { if (c.queue.length > 1) c.onLead(c.queue[c.queue.length - 1].agent.id); }
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const left = leftOutLine(p.prefs);
  return (
    <section className="dv1-sec" data-dv1="picks" aria-labelledby="dv1PicksH">
      <div className="dv1-sh">
        <h2 id="dv1PicksH"><img className="dv1-face" alt="" src={`${DV_FACE.src}?v=${DV_FACE.version}`} />The Scout’s picks</h2>
        <span className="dv1-tag" data-dv1="picks-tag">{p.view === "live" ? `${p.queue.length} to review` : p.view === "done" ? "none to review" : "none yet"}</span>
        <span className="dv1-sp" />
        <button type="button" className="dv1-lens" data-dv1="lens" onClick={p.onTune}>Ranked by <b>{LENS_PHRASE[p.lens]}</b> · <u>change</u></button>
      </div>

      {p.view === "live" && lead ? (
        <div className="dv1-live">
          <div className="dv1-trust" data-dv1="trust">
            {Ico.shield}
            <span><b>Every pick is checked by hand before the Scout brings it:</b> a real agency, currently open to queries, never a reading fee. Last checked dates are on each card.</span>
            <span className="dv1-sp" />
            <button type="button" className="dv1-lnk" data-dv1="how-verify" onClick={() => p.onHow(1)}>How verification works</button>
          </div>
          <div className="dv1-tray" data-dv1="tray">
            <LeadCard key={lead.agent.id} p={lead} idx={p.pickIdx} total={p.pickTotal} manuscript={p.manuscript} leaving={p.leaving} busy={busy} onDecide={p.onDecide} />
            <aside className="dv1-queue" aria-label="Coming up" data-dv1="queue">
              <div className="dv1-qh">Coming up<small data-dv1="queue-n">{rest.length ? `${rest.length} more` : "none"}</small></div>
              {rest.length ? rest.map((q) => (
                <button key={q.agent.id} type="button" className="dv1-qrow" data-dv1="queue-row" data-id={q.agent.id} disabled={busy} onClick={() => p.onLead(q.agent.id)}>
                  <span className={`av${q.fit === "possible" ? " poss" : ""}`} aria-hidden="true">{agentInitials(q.agent)}</span>
                  <span className="who"><b>{q.agent.name || q.agent.agency}</b><small>{[q.agent.name ? q.agent.agency : null, q.agent.city].filter(Boolean).join(" · ")}</small></span>
                  {p.skipped.includes(q.agent.id) ? <span className="dv1-fit skip">Skipped</span> : <FitTag p={q} />}
                </button>
              )) : <div className="dv1-qempty">This is the last one for now.</div>}
              <div className="dv1-qf">Ranked by <b>{LENS_PHRASE[p.lens]}</b>.{left ? ` ${left}` : ""} <button type="button" className="dv1-lnk" onClick={p.onTune}>Tune the Scout</button></div>
            </aside>
          </div>
          <div className="dv1-keys" data-dv1="keys"><span><kbd>A</kbd>Add to contact list</span><span><kbd>N</kbd>Not for me</span><span><kbd>S</kbd>Skip for now</span><span><kbd>J</kbd><kbd>K</kbd>Next and previous</span></div>
        </div>
      ) : p.view === "done" ? (
        <div className="dv1-done" data-dv1="done">
          <div>
            <h3>You’ve reviewed every pick.</h3>
            <p>The Scout brings more as the catalogue grows{genre ? ` in ${genre}` : ""}. You’ll see them here.</p>
            <div className="b">
              {p.passedCount > 0 ? <button type="button" className="dv1-b g" data-dv1="look-again" onClick={p.onPassed}>Look again at the {p.passedCount} you passed on</button> : null}
              <button type="button" className="dv1-b r" onClick={p.onTune}>Tune the Scout</button>
            </div>
          </div>
          <img alt="" src={`${DV_FACE.src}?v=${DV_FACE.version}`} />
        </div>
      ) : (
        <div className="dv1-done dv1-none" data-dv1="none">
          <div>
            <h3>Nothing to bring you yet.</h3>
            {p.manuscript
              ? <p>The catalogue is still growing{genre ? ` in ${genre}` : ""}. None of its verified agents fits what the Scout is looking for right now. It checks again as agents reopen and new ones are verified.</p>
              : <p>Choose a manuscript in the sidebar and the Scout looks for agents who want a book like it.</p>}
            <div className="b">
              <button type="button" className="dv1-b g" data-dv1="widen" onClick={p.onTune}>Widen what the Scout looks for</button>
              <button type="button" className="dv1-b r" onClick={p.onShare}>Share my agents</button>
            </div>
          </div>
          <img alt="" src={`${DV_FACE.src}?v=${DV_FACE.version}`} />
        </div>
      )}
    </section>
  );
};
