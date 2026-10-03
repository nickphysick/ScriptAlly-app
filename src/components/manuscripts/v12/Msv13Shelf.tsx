/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPTS v13 — the cards under the hero: the shelf, the version tiles, Recent activity ══
 *
 * Design authority: design-refs/manuscripts/manuscripts-v13.html, rendered at its own default state
 * (Shelf · ink bands). Locks: tests/e2e/manuscriptsV13.measure.ts (M1–M6) + manuscriptShelf.test.ts.
 *
 * ⚠️ EVERY CONTAINER IS `MsCard`, AND ITS HEADER IS THE ANTHRACITE BAND (F2). `PkgBand` was the
 * first candidate and cannot carry it: its colours are `--ppv-*` tokens declared on `.ppv-page`,
 * an ancestor this page does not have, so mounted here every one would resolve to nothing. The
 * band is built here and reported as a merge candidate; the packages page is not touched.
 *
 * ⚠️ PRESENTATIONAL. Every figure arrives derived (lib/manuscriptShelf, lib/manuscriptSummary),
 * every status glyph is StatusDot, and no handler here writes — the page routes each action to the
 * flow that owns it, and every band link goes through the app's navigate bridge.
 */
import React, { useId } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { BookVersion } from "../../../types";
import type { FeedSeg } from "../../../lib/dashFeed";
import { savedOn } from "../../../lib/manuscriptShelf";
import type { ActivityRow, CompRow, MaterialChip, PackageRow, VersionTile } from "../../../lib/manuscriptShelf";

const Glyph: React.FC<{ status: QueryStatus }> = ({ status }) => (
  <span className="msv12-sd" data-msv12-sd="">
    <StatusDot status={status} overrideSize={12} decorative />
  </span>
);

/* ══ the card and its band ════════════════════════════════════════════════════════════════════ */

/** The band's right-hand link — cream on the ink, Special Elite, with the mock's trailing "›". */
export const BandLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" className="msv13-more" data-msv13="band-link" onClick={onClick}>{label}</button>
);

export const MsCard: React.FC<{
  card: "comps" | "materials" | "packages" | "versions" | "activity";
  title: string;
  /** the count pill beside the title; absent draws none (callers pass none at zero, so a "0" never
   *  sits beside the card's own "No … yet") */
  count?: number;
  /** a shelf card — the smaller band, and the mock's 8px under it */
  shelf?: boolean;
  /** a BandLink, or a mono hint */
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ card, title, count, shelf, right, children }) => {
  const hid = useId();
  return (
    <section className={`msv13-card${shelf ? " msv13-card--sum" : ""}`} data-msv13-card={card} aria-labelledby={hid}>
      <div className="msv13-band" data-msv13="band">
        <h2 id={hid}>
          {title}
          {count !== undefined ? <span className="msv13-pill" data-msv13="count">{count}</span> : null}
        </h2>
        {right}
      </div>
      <div className="msv13-cb">{children}</div>
    </section>
  );
};

/* ══ the shelf: comps · materials · packages ══════════════════════════════════════════════════ */

export const ShelfComps: React.FC<{
  rows: CompRow[];
  total: number;
  inLetter: number;
  /** the letter the materials card rings — null when no sent query resolves to one */
  letterName: string | null;
  onOpen: () => void;
}> = ({ rows, total, inLetter, letterName, onOpen }) => (
  <MsCard card="comps" title="Comps" count={total || undefined} shelf right={<BandLink label="Comparable titles" onClick={onOpen} />}>
    {total === 0 ? (
      <p className="msv13-empty">No comps yet.</p>
    ) : (
      <>
        <p className="msv13-fact msv13-fact--comps" data-msv13="comp-fact">
          <b>{inLetter} of {total}</b> {inLetter === 1 ? "is" : "are"} named in{" "}
          {letterName ? <span className="msv13-pn">{letterName}</span> : "your query letter"}.
        </p>
        <div className="msv13-crows">
          {rows.map((r, i) => (
            <div className="msv13-crow" data-msv13="crow" data-off={r.inLetter ? undefined : "1"} key={`${r.comp.title}-${i}`}>
              <span className="msv13-ctab" data-msv13="ctab" aria-hidden="true">{r.initial}</span>
              <span>
                <span className="msv13-ctitle" data-msv13="ctitle">{r.comp.title}</span>
                {r.meta ? <span className="msv13-cmeta">{r.meta}</span> : null}
              </span>
              {r.inLetter ? (
                <span className="msv13-tag msv13-tag--och" data-msv13="ctag">In letter</span>
              ) : (
                <span className="msv13-tag msv13-tag--plain" data-msv13="ctag">Not in letter</span>
              )}
            </div>
          ))}
        </div>
      </>
    )}
  </MsCard>
);

export const ShelfMaterials: React.FC<{
  letters: { n: number; word: string };
  synopses: { n: number; word: string };
  chips: MaterialChip[];
  /** the writer's own `otherMaterials` lines across this book's live packages */
  others: { label: string }[];
  onOpen: () => void;
}> = ({ letters, synopses, chips, others, onOpen }) => (
  <MsCard card="materials" title="Materials" shelf right={<BandLink label="All materials" onClick={onOpen} />}>
    {letters.n + synopses.n + others.length === 0 ? (
      <p className="msv13-empty">No materials yet.</p>
    ) : (
      <>
        <p className="msv13-fact" data-msv13="mat-fact"><b>{letters.n}</b> {letters.word}, <b>{synopses.n}</b> {synopses.word}.</p>
        <div className="msv13-papers">
          {chips.map((c) => (
            <div className={`msv13-paper${c.lead ? " msv13-paper--lead" : ""}`} data-msv13="paper" data-lead={c.lead ? "1" : undefined} key={c.id}>
              <span className="msv13-pname">{c.name}</span>
              <span className="msv13-cm">{c.meta}</span>
            </div>
          ))}
          {others.map((o) => (
            <div className="msv13-paper" data-msv13="paper-other" key={o.label}>
              <span className="msv13-pname">{o.label}</span>
              <span className="msv13-cm">Other material</span>
            </div>
          ))}
        </div>
      </>
    )}
  </MsCard>
);

export const ShelfPackages: React.FC<{
  pro: boolean;
  /** live packages on this book — the pill */
  total: number;
  fact: { queries: number; packages: number };
  rows: PackageRow[];
  onOpen: () => void;
}> = ({ pro, total, fact, rows, onOpen }) => (
  <MsCard card="packages" title="Packages" count={pro && total > 0 ? total : undefined} shelf right={<BandLink label="All packages" onClick={onOpen} />}>
    {!pro ? (
      /* ⚠️ NO PRICE (the v12 teaser's rule) — the product states none. PACKAGES_OPEN_TO_ALL makes
         this unreachable today; it is the honest text for the day the gate closes again. */
      <p className="msv13-empty">Bundle a letter, a synopsis and a sample into a package. Part of Pro.</p>
    ) : total === 0 ? (
      <p className="msv13-empty">No packages yet.</p>
    ) : (
      <>
        <p className="msv13-fact" data-msv13="pkg-fact">
          {fact.queries === 0 ? (
            <>No queries sent with a package.</>
          ) : (
            <><b>{fact.queries}</b> {fact.queries === 1 ? "query" : "queries"} sent across {fact.packages} {fact.packages === 1 ? "package" : "packages"}.</>
          )}
        </p>
        {rows.map((r) => (
          <div className="msv13-pkgrow" data-msv13="pkgrow" data-unsent={!r.active && r.sent === 0 ? "1" : undefined} key={r.pkg.id}>
            <span className="msv13-mk" aria-hidden="true" />
            <span>{r.pkg.packageName}</span>
            {r.active ? (
              <span className="msv13-tag msv13-tag--och">Used for new queries</span>
            ) : r.sent > 0 ? (
              <span className="msv13-psent">{r.sent} sent</span>
            ) : (
              <span className="msv13-tag msv13-tag--plain">Not sent</span>
            )}
          </div>
        ))}
      </>
    )}
  </MsCard>
);

/* ══ the version tiles ════════════════════════════════════════════════════════════════════════ */

export const VersionTiles: React.FC<{
  tiles: VersionTile[];
  onOpen: (v: BookVersion) => void;
  onNew: () => void;
}> = ({ tiles, onOpen, onNew }) => (
  <MsCard
    card="versions" title="Versions" count={tiles.length || undefined}
    right={<span className="msv13-hint">Newest first · queried, requested, sent</span>}
  >
    <div className="msv13-vlist">
      {tiles.map((t) => (
        <button
          type="button"
          className={`msv13-vtile${t.current ? " msv13-vtile--cur" : ""}`}
          data-msv13-vtile="" data-vid={t.v.id} key={t.v.id}
          title="Rename this version or change its note"
          onClick={() => onOpen(t.v)}
        >
          <span className="msv13-vt">
            <span className="msv13-vmk" aria-hidden="true" />
            <span className="msv13-vn" data-msv13="vname">{t.v.name}</span>
            {t.current ? <span className="msv13-tag msv13-tag--ms" data-msv13="current-tag">Current</span> : null}
          </span>
          <span className="msv13-vd">{t.v.note ?? "No note yet."}</span>
          {/* ⚠️ NO WORD COUNT: a book version carries none (BookVersion has no field for it), so the
              mock's "· 50,000 words" is omitted rather than restated from the manuscript (v12's rule) */}
          <span className="msv13-vm">Saved {savedOn(t.v.createdDate)}</span>
          <span
            className="msv13-use"
            title={`${t.queried} queried · ${t.requested} requested · ${t.sent} sent${t.closed > 0 ? ` · ${t.closed} closed` : ""}`}
          >
            <span data-msv13="use-queried"><Glyph status={QueryStatus.QUERIED} />{t.queried}</span>
            <span data-msv13="use-requested"><Glyph status={QueryStatus.PARTIAL_REQUESTED} />{t.requested}</span>
            <span data-msv13="use-sent"><Glyph status={QueryStatus.FULL_SENT} />{t.sent}</span>
            <span className="msv13-pk" data-msv13="use-pk">
              {t.packages > 0 ? `${t.packages} package${t.packages === 1 ? "" : "s"}` : "no packages"}
            </span>
          </span>
        </button>
      ))}
      <button type="button" className="msv13-vtile msv13-vtile--new" data-msv13-vtile="new" onClick={onNew}>
        <span className="msv13-plus" aria-hidden="true">+</span>New version
      </button>
    </div>
  </MsCard>
);

/* ══ recent activity ══════════════════════════════════════════════════════════════════════════ */

const Say: React.FC<{ say: FeedSeg[] }> = ({ say }) => (
  <>
    {say.map((s, i) =>
      s.who ? <b key={i}>{s.t}</b> : s.em ? <span className="msv13-em" key={i}>{s.t}</span> : <React.Fragment key={i}>{s.t}</React.Fragment>,
    )}
  </>
);

export const RecentActivity: React.FC<{
  rows: ActivityRow[];
  /** every row that would render — past the seven drawn, the link names the full log */
  total: number;
  onOpen: () => void;
}> = ({ rows, total, onOpen }) => (
  <MsCard
    card="activity" title="Recent activity"
    right={<BandLink label={total > rows.length ? "All activity in the Query Centre" : "Query Centre"} onClick={onOpen} />}
  >
    {rows.length === 0 ? (
      <p className="msv13-empty">Nothing yet. Log your first query and it shows up here.</p>
    ) : (
      <div className="msv13-alist">
        {rows.map((r) => (
          <div
            className="msv13-arow" data-msv13="arow" key={r.id}
            data-qid={r.queryId ?? ""} data-ms={r.manuscriptId} data-at={r.at}
          >
            <span className="msv13-ad" data-msv13="adate">{r.date}</span>
            <span className="msv13-ai">
              {r.glyph.kind === "status" ? <Glyph status={r.glyph.status} />
                : r.glyph.kind === "ms" ? <span className="msv13-aims" aria-hidden="true" /> : null}
            </span>
            <span className="msv13-at">
              <Say say={r.say} />
              {r.sub ? <span className="msv13-sub">{r.sub}</span> : null}
            </span>
          </div>
        ))}
      </div>
    )}
  </MsCard>
);
