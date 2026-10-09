/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v21 — the page's parts (design-refs/manuscripts/manuscripts-v21.html): the open header,
 * the book card, Recent activity, the versions banner, the stacked deck with its list, the three
 * material doors, and the empty state's previews.
 *
 * PRESENTATIONAL. Every figure arrives derived (lib/manuscriptV21 and the libs it reads), every
 * query-status glyph is `StatusDot`, and nothing here writes: the page routes each action to the flow
 * that owns it.
 *
 * THE OPEN HEADER IS PAGE-LOCAL (`MsOpenHeader`). It copies the Contact list header's values and
 * imports nothing from `components/agents`; the three open headers (Contact list, Query Centre,
 * Manuscripts) are a lift candidate.
 *
 * THE TWO DRAWINGS ARE SWAPPABLE BY FILE: the sheet sets each width, and nothing here depends on a
 * drawing's own size.
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { FeedSeg } from "../../../lib/dashFeed";
import type { QueryLine } from "../../../lib/compsPage";
import { savedOn } from "../../../lib/manuscriptShelf";
import { deckPose, shortDay } from "../../../lib/manuscriptV21";
import type { BookFact, Door, V21ActivityRow, VersionCard } from "../../../lib/manuscriptV21";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import versionsArt from "../../../assets/manuscripts/comps-tray-archivist.png";

const Glyph: React.FC<{ status: QueryStatus; size?: number }> = ({ status, size = 14 }) => (
  <span className="ms21-sd" data-ms21-sd=""><StatusDot status={status} overrideSize={size} decorative /></span>
);

const Say: React.FC<{ say: readonly FeedSeg[] }> = ({ say }) => (
  <>
    {say.map((s, i) => (s.who ? <b key={i}>{s.t}</b> : s.em ? <i key={i}>{s.t}</i> : <React.Fragment key={i}>{s.t}</React.Fragment>))}
  </>
);

/* ══ the open header ══════════════════════════════════════════════════════════════════════════ */

export const MS_HEADER_SUB = "Your book, every version of it, and what goes out with it.";

export const MsOpenHeader: React.FC<{
  title: string;
  sub: string;
  /** the "More manuscripts: coming soon" chip, after the subheader */
  soon?: boolean;
  children: React.ReactNode;
}> = ({ title, sub, soon, children }) => (
  <header className="ms21-hd" data-ms21="header" data-own-header="">
    <div className="ms21-txt" data-ms21="header-text">
      <h1 className="ms21-title" data-probe="title" data-page-title="">{title}</h1>
      <p className="ms21-sub" data-ms21="sub">
        {sub}
        {soon ? <span className="ms21-soon" data-ms21="soon">More manuscripts: coming soon</span> : null}
      </p>
      <div className="ms21-acts">{children}</div>
    </div>
    <div className="ms21-art" data-ms21="header-art" aria-hidden="true"><img src={heroArt} alt="" /></div>
  </header>
);

/* ══ the book card ════════════════════════════════════════════════════════════════════════════ */

const BookIcon = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 3.5h9.5l2.5 2.5v10.5H4z" /><path d="M7 8h6M7 11h6M7 14h4" />
  </svg>
);
const ClockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.6 1.8" />
  </svg>
);

export const BookCard: React.FC<{
  title: string;
  authorName: string;
  coverUrl?: string;
  logline: string;
  facts: readonly BookFact[];
  line: QueryLine;
  onEdit: () => void;
  onComps: () => void;
}> = ({ title, authorName, coverUrl, logline, facts, line, onEdit, onComps }) => {
  const hid = useId();
  return (
    <section className="ms21-card ms21-book" data-ms21="book" aria-labelledby={hid}>
      {/* ⚠️ NO UPLOAD IN THIS BUILD: Storage is not wired and no cover flow exists, so the control is
          inert and says so. Wiring it later is one handler. */}
      <button type="button" className="ms21-cover" data-ms21="cover" aria-disabled="true" aria-label="Cover upload coming soon" title="Cover upload coming soon">
        {coverUrl ? (
          <img src={coverUrl} alt="" />
        ) : (
          <>
            <span className="ms21-cover-t">{title}</span>
            <span className="ms21-cover-a">{authorName}</span>
          </>
        )}
        <span className="ms21-cover-add">Cover upload coming soon</span>
      </button>
      <div className="ms21-bk">
        <header className="ms21-h">
          <h2 id={hid}><span className="ms21-ic"><BookIcon /></span>The book</h2>
          <button type="button" className="ms21-ring" data-ms21="edit-details" onClick={onEdit}>Edit details</button>
        </header>
        {logline.trim() ? (
          <p className="ms21-log" data-ms21="logline">{logline}</p>
        ) : (
          <p className="ms21-log ms21-log--none"><button type="button" data-ms21="add-logline" onClick={onEdit}>Add a line about the book.</button></p>
        )}
        <dl className="ms21-dl" data-ms21="facts">
          {facts.map((f) => (
            <div key={f.key} data-ms21-fact={f.key}>
              <dt>{f.label}</dt>
              <dd className={f.key === "version" && !f.muted ? "ms21-ver" : f.muted ? "ms21-mu" : undefined}>
                {f.querying ? <Glyph status={QueryStatus.QUERIED} /> : null}
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="ms21-line" data-ms21="comps-line">
          <span className="ms21-line-k">Your comps line</span>
          {line.kind === "line" ? (
            <p data-ms21="comps-line-text">
              {line.segments.map((s, i) => (s.emphasis ? <i key={i}>{s.text}</i> : <React.Fragment key={i}>{s.text}</React.Fragment>))}
            </p>
          ) : (
            <p data-ms21="comps-line-text"><button type="button" data-ms21="comps-line-link" onClick={onComps}>{line.prompt}</button></p>
          )}
          <span className="ms21-line-src">From Comparable titles</span>
        </div>
      </div>
    </section>
  );
};

/* ══ recent activity ══════════════════════════════════════════════════════════════════════════ */

export const ActivityCard: React.FC<{
  rows: readonly V21ActivityRow[];
  onRow: (r: V21ActivityRow) => void;
  onAll: () => void;
}> = ({ rows, onRow, onAll }) => {
  const hid = useId();
  return (
    <aside className="ms21-card ms21-act" data-ms21="activity" aria-labelledby={hid}>
      <header className="ms21-h"><h2 id={hid}><span className="ms21-ic"><ClockIcon /></span>Recent activity</h2></header>
      {rows.length === 0 ? (
        <p className="ms21-none" data-ms21="activity-none">Nothing yet. Log your first query and it shows up here.</p>
      ) : (
        <ol className="ms21-feed">
          {rows.map((r) => {
            const body = (
              <>
                <span className="ms21-fd" data-ms21="adate">{r.date}</span>
                <span className="ms21-fi">
                  {r.glyph.kind === "status" ? <Glyph status={r.glyph.status} />
                    : r.glyph.kind === "ms" ? <span className="ms21-sq" aria-hidden="true" /> : null}
                </span>
                <span className="ms21-ft">
                  <Say say={r.say} />
                  {r.sub ? <small data-ms21={r.yourMove ? "your-move" : "asub"}>{r.sub}</small> : null}
                </span>
              </>
            );
            return (
              <li key={r.id} className={r.yourMove ? "is-you" : undefined} data-ms21="arow" data-qid={r.queryId ?? ""} data-at={r.at} data-you={r.yourMove ? "" : undefined}>
                {r.queryId ? <button type="button" className="ms21-frow" onClick={() => onRow(r)}>{body}</button> : <div className="ms21-frow">{body}</div>}
              </li>
            );
          })}
        </ol>
      )}
      <button type="button" className="ms21-more" data-ms21="activity-all" onClick={onAll}>Everything in the Query Centre ›</button>
    </aside>
  );
};

/* ══ the banner ═══════════════════════════════════════════════════════════════════════════════ */

export const MsBanner: React.FC<{ big?: boolean; children: React.ReactNode }> = ({ big, children }) => (
  <section className={`ms21-ban${big ? " ms21-ban--big" : ""}`} data-ms21="banner" aria-label="A note"><p>{children}</p></section>
);

/* ══ versions: the copy, the deck, the list ═══════════════════════════════════════════════════ */

const Counts: React.FC<{ c: VersionCard; words?: boolean }> = ({ c, words = true }) => (
  <>
    <span data-ms21="use-queried"><Glyph status={QueryStatus.QUERIED} /><b>{c.queried}</b>{words ? " queried" : null}</span>
    <span data-ms21="use-requested"><Glyph status={QueryStatus.PARTIAL_REQUESTED} /><b>{c.requested}</b>{words ? " requested" : null}</span>
    <span data-ms21="use-sent"><Glyph status={QueryStatus.FULL_SENT} /><b>{c.sent}</b>{words ? " sent on" : null}</span>
  </>
);

const packagesLine = (n: number) => (n > 0 ? `In ${n} package${n === 1 ? "" : "s"}` : "In no packages yet");

/** 48px between stacked cards, 36 below 1440 — the sheet's own breakpoint. */
const useDeckStep = (): number => {
  const read = () => (typeof window !== "undefined" && window.matchMedia("(max-width: 1439.5px)").matches ? 36 : 48);
  const [step, setStep] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1439.5px)");
    const on = () => setStep(mq.matches ? 36 : 48);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return step;
};

export const VersionsSection: React.FC<{
  title: string;
  cards: readonly VersionCard[];
  lede: readonly FeedSeg[];
  onNew: () => void;
  onOpen: (c: VersionCard) => void;
}> = ({ title, cards, lede, onNew, onOpen }) => {
  const hid = useId();
  const listId = useId();
  const step = useDeckStep();
  const [listOpen, setListOpen] = useState(false);
  /* the deck opens on the CURRENT version, and returns to it whenever a version is added */
  const currentIndex = Math.max(0, cards.findIndex((c) => c.current));
  const [focus, setFocus] = useState(currentIndex);
  const ids = cards.map((c) => c.v.id).join("|");
  useEffect(() => { setFocus(currentIndex); }, [ids, currentIndex]);
  const at = Math.min(focus, Math.max(0, cards.length - 1));
  const deckRef = useRef<HTMLDivElement>(null);
  const go = (i: number, refocus = false) => {
    const next = Math.max(0, Math.min(cards.length - 1, i));
    setFocus(next);
    if (refocus) requestAnimationFrame(() => deckRef.current?.querySelector<HTMLElement>(`[data-i="${next}"]`)?.focus());
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1, true); }
  };

  return (
    <section className="ms21-vsec" data-ms21="versions" aria-labelledby={hid}>
      <div className="ms21-vtxt" data-ms21="versions-text">
        <img className="ms21-vart" data-ms21="versions-art" src={versionsArt} alt="" aria-hidden="true" />
        <div className="ms21-vcopy">
          <h2 id={hid}>Versions</h2>
          <p data-ms21="versions-lede"><Say say={lede} /></p>
          <div className="ms21-vacts">
            <button type="button" className="ms21-pill" data-ms21="new-version" onClick={onNew}>+ New version</button>
            {cards.length > 0 ? (
              <button type="button" className="ms21-seeall" data-ms21="see-all" aria-expanded={listOpen} aria-controls={listId} onClick={() => setListOpen((o) => !o)}>
                {listOpen ? "Hide the list" : `See all ${cards.length}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ms21-car" data-ms21="deck-wrap" role="group" aria-roledescription="carousel" aria-label={`Versions of ${title}`} onKeyDown={onKey}>
        <div className="ms21-deck" data-ms21="deck" ref={deckRef}>
          {cards.length === 0 ? <p className="ms21-deck-none">Your saved versions stack up here.</p> : null}
          {cards.map((c, i) => {
            const p = deckPose(i, at, step);
            const front = i === at;
            return (
              <div
                key={c.v.id}
                className={`ms21-vc${c.current ? " is-cur" : ""}${front ? " is-on" : ""}`}
                data-ms21="vcard" data-i={i} data-vid={c.v.id} data-front={front ? "" : undefined}
                role="group" aria-roledescription="slide" aria-label={c.v.name} aria-hidden={!front}
                tabIndex={front ? 0 : -1}
                style={{
                  transform: front ? "none" : `translateX(${p.x}px) translateY(${p.y}px) scale(${p.scale})`,
                  opacity: p.opacity, zIndex: p.z, visibility: p.hidden ? "hidden" : "visible",
                }}
                onClick={front ? undefined : () => go(i)}
              >
                <div className="ms21-vc-bd">
                  <span className="ms21-vc-chip">{c.current ? "Current version" : "Earlier version"}</span>
                  <span className="ms21-vc-sv">Saved {shortDay(c.v.createdDate)}</span>
                </div>
                <div className="ms21-vc-bdy">
                  <div className="ms21-vc-hd">
                    <span className="ms21-vc-cov" aria-hidden="true">{title}</span>
                    <span className="ms21-vc-nm">
                      <b data-ms21="vname">{c.v.name}</b>
                      {c.words ? <small data-ms21="vwords">{c.words}</small> : null}
                    </span>
                  </div>
                  <div className="ms21-vc-lb">What changed</div>
                  <p className="ms21-vc-wl">{c.v.note ?? "No note yet."}</p>
                  <div className="ms21-vc-lb">Queries sent with it</div>
                  <div className="ms21-vc-qs"><Counts c={c} /></div>
                  <div className="ms21-vc-ft">
                    <small data-ms21="vpk">{packagesLine(c.packages)}<br />{c.current ? "Used for new queries" : "Kept for your records"}</small>
                    <button type="button" className="ms21-vc-go" data-ms21="vopen" tabIndex={front ? 0 : -1} onClick={(e) => { e.stopPropagation(); onOpen(c); }}>Open</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {cards.length > 0 ? (
          <div className="ms21-cnav" data-ms21="deck-nav">
            <span className="ms21-dots">
              {cards.map((c, i) => (
                <button type="button" key={c.v.id} className={i === at ? "is-on" : undefined} data-ms21="dot" aria-label={c.v.name} aria-current={i === at ? "true" : undefined} onClick={() => go(i)} />
              ))}
            </span>
            <button type="button" className="ms21-arw" data-ms21="deck-prev" aria-label="Newer version" disabled={at === 0} onClick={() => go(at - 1)}>‹</button>
            <button type="button" className="ms21-arw" data-ms21="deck-next" aria-label="Older version" disabled={at >= cards.length - 1} onClick={() => go(at + 1)}>›</button>
          </div>
        ) : null}
      </div>

      {listOpen ? (
        <div className="ms21-vall" id={listId} data-ms21="version-list">
          <div className="ms21-vlbl" aria-hidden="true">
            <span>Version</span><span>What changed</span><span>Saved</span><span>Queries sent with it</span><span className="ms21-vp">Packages</span><span />
          </div>
          <ol>
            {cards.map((c) => (
              <li key={c.v.id} data-ms21="vrow" data-vid={c.v.id}>
                <span className="ms21-vn">
                  <b><span className="ms21-vnn">{c.v.name}</span>{c.current ? <span className="ms21-cur">Current</span> : null}</b>
                  {c.words ? <small>{c.words}</small> : null}
                </span>
                <span className="ms21-vw">{c.v.note ?? "No note yet."}</span>
                <span className="ms21-vd">{savedOn(c.v.createdDate)}</span>
                <span className="ms21-vq">
                  <span><Glyph status={QueryStatus.QUERIED} size={12} />{c.queried}<span className="ms21-vqt"> queried</span></span>
                  <span><Glyph status={QueryStatus.PARTIAL_REQUESTED} size={12} />{c.requested}<span className="ms21-vqt"> requested</span></span>
                  <span><Glyph status={QueryStatus.FULL_SENT} size={12} />{c.sent}<span className="ms21-vqt"> sent</span></span>
                </span>
                <span className="ms21-vp" data-ms21="vrow-packages">{c.packages > 0 ? `${c.packages} package${c.packages === 1 ? "" : "s"}` : "None"}</span>
                <button type="button" className="ms21-vo" onClick={() => onOpen(c)}>Open</button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
};

/* ══ your materials ═══════════════════════════════════════════════════════════════════════════ */

const DOOR_ICON: Record<Door["key"], React.ReactNode> = {
  comps: <><rect height="12" rx="1" width="4" x="3" y="4" /><rect height="12" rx="1" width="4" x="8" y="4" /><path d="M13.4 5.2l3.4-.9 2.6 10.6-3.4.9z" /></>,
  letters: <><path d="M3 6.5l7 4.5 7-4.5" /><rect height="11" rx="1.6" width="14" x="3" y="4.5" /></>,
  packages: <><path d="M3 6.5l7-3 7 3v7.5l-7 3-7-3z" /><path d="M3 6.5l7 3 7-3M10 9.5v7.5" /></>,
};

export const MaterialDoors: React.FC<{ doors: readonly Door[]; onOpen: (d: Door) => void }> = ({ doors, onOpen }) => {
  const hid = useId();
  return (
    <section className="ms21-band" data-ms21="materials" aria-labelledby={hid}>
      <header className="ms21-bh">
        <h2 id={hid}>Your materials</h2>
        <p>The things you send out with this book. Each one has its own page.</p>
      </header>
      <div className="ms21-doors">
        {doors.map((d) => (
          <button type="button" role="link" className="ms21-door" key={d.key} data-ms21="door" data-door={d.key} onClick={() => onOpen(d)}>
            <span className="ms21-dic">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">{DOOR_ICON[d.key]}</svg>
            </span>
            <span className="ms21-dt">{d.name}</span>
            <span className="ms21-dn"><b data-ms21="door-n">{d.n}</b> {d.unit}</span>
            <span className="ms21-dl2" data-ms21="door-sentence">{d.sentence}</span>
            <span className="ms21-dgo">{d.go} <i aria-hidden="true">→</i></span>
          </button>
        ))}
      </div>
    </section>
  );
};

/* ══ the empty state's previews ═══════════════════════════════════════════════════════════════ */

export const EMPTY_PREVIEWS: readonly { key: "book" | "vers" | "mats"; title: string; body: string }[] = [
  { key: "book", title: "Your book on one page", body: "The pitch, word count, genre and setting, the details agents see first, kept in one place and easy to change." },
  { key: "vers", title: "Every version, tracked", body: "Save each new draft or opening. QueryHawk shows which version went to which agents, and which one gets the requests." },
  { key: "mats", title: "Everything that goes with it", body: "Comps, query letters, synopses and submission packages all belong to a book. Add the book and they have a home." },
];

const Ghost: React.FC<{ kind: "book" | "vers" | "mats" }> = ({ kind }) =>
  kind === "book" ? (
    <div className="ms21-ghost ms21-ghost--book" aria-hidden="true" data-ms21="ghost">
      <span className="g-c" />
      <span className="g-l"><i style={{ width: "70%" }} /><i style={{ width: "92%" }} /><i style={{ width: "55%" }} /><span className="g-g"><i /><i /><i /><i /><i /><i /></span></span>
    </div>
  ) : kind === "vers" ? (
    <div className="ms21-ghost ms21-ghost--vers" aria-hidden="true" data-ms21="ghost">
      <span className="g-v g-v3" /><span className="g-v g-v2" />
      <span className="g-v g-v1"><b /><i style={{ width: "60%" }} /><i style={{ width: "85%" }} /><em><s /><s /><s /></em></span>
    </div>
  ) : (
    <div className="ms21-ghost ms21-ghost--mats" aria-hidden="true" data-ms21="ghost">
      <span className="g-d"><s /><i /></span><span className="g-d"><s /><i /></span><span className="g-d"><s /><i /></span>
    </div>
  );

export const EmptyPreviews: React.FC = () => (
  <div className="ms21-show" data-ms21="previews">
    {EMPTY_PREVIEWS.map((p) => (
      <article className="ms21-sh" key={p.key} data-ms21="preview">
        <Ghost kind={p.key} />
        <h3>{p.title}</h3>
        <p>{p.body}</p>
      </article>
    ))}
  </div>
);
