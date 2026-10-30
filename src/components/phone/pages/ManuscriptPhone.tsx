/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MANUSCRIPT ON A PHONE (Phone app v2, Part 7B; ref design-refs/phone-app-v2/src/msv.js `PAGES.manuscript` at
 * MSH B · MSL B · MSP A, `coverHtml` at COV B). `/manuscripts` below 768px. READ ONLY: editing materials and building
 * packages stay on a computer, and a row opens a read view that says so in one quiet line.
 *
 * ⚠️ IT EDITS NO MANUSCRIPTS FILE AND DERIVES NOTHING OF ITS OWN. The book is the desktop Manuscript page's
 * (`scopedManuscript`), its figures `whereItsBeen` and `queryingSince`, its genre and words `cardGenre`/`wordsOf`, the
 * version `currentBookVersion`. Each package's result is the packages page's `figOf(packageSplit, creditedTo)` — the
 * first answer, ranked only once `MIN_SENDS_FOR_CLAIM` have answered (`labelStatus`) — and a material's "used in" is
 * `materialSplit(...).sent`, the edition-true count the packages page prints. The letter "in use" is `letterInUse`.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { currentBookVersion, letterInUse, materialsOf, queryingSince, scopedManuscript } from "../../../lib/manuscriptSummary";
import { allGenres, cardGenre, sinceDay, whereItsBeen, wordsOf, wordsText } from "../../../lib/manuscriptV27";
import { bookVersionsOf } from "../../../lib/bookVersions";
import { isOlderComp, manuscriptComps } from "../../../lib/comps";
import { buildRows } from "../../../lib/analytics";
import { creditedTo, materialSplit, packageSplit } from "../../../lib/packageReplies";
import { figOf, labelStatus, rankByMore, type Fig } from "../../../lib/packagesV38";
import { ComponentType, type ManuscriptVersion } from "../../../types";
import { usePhoneBandSlot } from "../phoneBandStore";
import { PI } from "../phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import "./pagesPhone.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const usedIn = (n: number) => (n ? `Used in ${n} ${n === 1 ? "query" : "queries"}` : "Not used yet");
/** a package card's heading: the first answers it drew, in the ref's words; never a figure the record does not hold */
export function packageHeading(f: Pick<Fig, "sent" | "more" | "replies">): string {
  if (!f.sent) return "Not sent yet";
  if (f.more) return `${f.more} ${f.more === 1 ? "request" : "requests"} from ${f.sent}`;
  return f.replies ? `No requests from ${f.sent}` : "No replies yet";
}

interface ReadView { title: string; sub?: string | null; body?: string | null }

export const ManuscriptPhone: React.FC = () => {
  const { manuscripts, queries, activities, agents, packages, versions, currentUser } = useScriptAllyDb();
  const location = useLocation();
  const [read, setRead] = useState<ReadView | null>(null);
  const m = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { stored = null; }
    const ms = scopedManuscript(manuscripts, stored);
    if (!ms) return null;
    const nowMs = Date.now();
    const msQueries = queries.filter((q) => q.manuscriptId === ms.id);
    const rowsById = new Map(buildRows(msQueries, activities, agents, nowMs).map((r) => [r.id, r]));
    const msPkgs = packages.filter((p) => p.manuscriptId === ms.id);
    const live = msPkgs.filter((p) => p.status !== "Retired");
    const name = (id: string | undefined | null) => (id ? versions.find((v) => v.id === id)?.versionName ?? null : null);
    const items = live.map((p) => ({ id: p.id, name: p.packageName, p, f: figOf(packageSplit(p, msQueries, rowsById), creditedTo(p.id, msQueries), rowsById) }));
    const ranked = rankByMore(items);
    const ordered = [...ranked, ...items.filter((i) => !ranked.includes(i))];
    const inUse = letterInUse(msPkgs, msQueries);
    const mat = (v: ManuscriptVersion, kind: "letter" | "synopsis") => materialSplit(v.id, kind, msPkgs, msQueries, rowsById).sent;
    const book = currentBookVersion(ms);
    return {
      ms, nowMs, been: whereItsBeen(msQueries, activities, agents, nowMs), since: sinceDay(queryingSince(msQueries)),
      book, live,
      pkgs: ordered.map((i) => ({ ...i, contents: [name(i.p.queryLetterVersionId), name(i.p.synopsisVersionId), name(i.p.samplePagesVersionId)].filter(Boolean).join(" · ") })),
      letters: materialsOf(ms.id, ComponentType.QUERY_LETTER, versions).map((v) => ({ v, n: mat(v, "letter"), current: v.id === inUse })),
      synopses: materialsOf(ms.id, ComponentType.SYNOPSIS, versions).map((v) => ({ v, n: mat(v, "synopsis") })),
      samples: [...materialsOf(ms.id, ComponentType.SAMPLE_PAGES, versions), ...materialsOf(ms.id, ComponentType.FULL_MANUSCRIPT, versions)],
      bookVersions: bookVersionsOf(ms).map((b) => ({ b, n: materialSplit(b.id, "version", msPkgs, msQueries, rowsById).sent, current: b.id === book?.id })),
      comps: manuscriptComps(ms),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stored book is the switch's signal
  }, [manuscripts, queries, activities, agents, packages, versions, location.key]);

  /* the menu's Materials and Comparable titles tiles land on their sections */
  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const t = window.setTimeout(() => document.querySelector<HTMLElement>(`[data-pa="manuscript"] #${CSS.escape(id)}`)?.scrollIntoView({ block: "start" }), 120);
    return () => window.clearTimeout(t);
  }, [location.key, location.hash, !!m]);

  const author = (currentUser?.name ?? "").trim();
  const ms = m?.ms;
  usePhoneBandSlot("/manuscripts", ms ? (
    <div className="pa-msband" data-pa="ms-band">
      {ms.coverUrl
        ? <img className="pa-cov pa-covimg" src={ms.coverUrl} alt="" data-pa="ms-cover" />
        : <div className="pa-cov" data-pa="ms-cover" aria-hidden="true"><i className="pa-covsp" /><span className="pa-covt">{ms.title}</span><i className="pa-covrl" />{author ? <span className="pa-cova">{author}</span> : null}</div>}
      <div className="pa-msinfo">
        <div className="pa-mst" data-pa="ms-title">{ms.title}</div>
        <div className="pa-msfacts" data-pa="ms-facts">
          {[ms.ageCategory, cardGenre(ms)].filter(Boolean).join(" · ")}
          <br />
          {[wordsOf(ms) ? `${wordsText(wordsOf(ms))} words` : null, m!.book?.name ?? null].filter(Boolean).join(" · ")}
        </div>
        {m!.since ? <div className="pa-mssince" data-pa="ms-since">Querying since {m!.since}</div> : null}
      </div>
    </div>
  ) : null, [ms?.id, ms?.title, ms?.coverUrl, author, m?.since, m?.book?.name, ms?.wordCount, ms?.genre, ms?.ageCategory]);

  if (!m || !ms) return <div className="pa-pg" data-pa="manuscript"><div className="pa-pgbody"><p className="pa-pgnone">No manuscript yet.</p></div></div>;
  const pitch = (ms.elevatorPitch ?? ms.logline ?? "").trim();
  const open = (v: ReadView) => setRead(v);

  return (
    <div className="pa-pg" data-pa="manuscript">
      <div className="pa-pgbody">
        <div className="pa-grid3" data-pa="ms-stats">
          <div className="pa-mini"><span className="pa-num" data-pa="ms-sent">{m.been.sent}</span><span className="pa-sub">{m.been.sent === 1 ? "query" : "queries"}</span></div>
          <div className="pa-mini"><span className="pa-num" data-pa="ms-more">{m.been.askedForMore}</span><span className="pa-sub">{m.been.askedForMore === 1 ? "request" : "requests"}</span></div>
          <div className="pa-mini"><span className="pa-num" data-pa="ms-pkgn">{m.live.length}</span><span className="pa-sub">{m.live.length === 1 ? "package" : "packages"}</span></div>
        </div>

        {pitch ? (
          <div className="pa-card pa-mspitch" data-pa="ms-pitch">
            <div className="pa-sub pa-msk">Your pitch</div>
            <p>{pitch}</p>
          </div>
        ) : null}

        <div className="pa-shd"><h2 className="pa-h2">Packages</h2><span className="pa-shn">{m.pkgs.length}</span></div>
        {m.pkgs.length ? (
          <div className="pa-hscroll" data-pa="ms-pkgs">
            {m.pkgs.map((i, n) => (
              <button key={i.id} type="button" className={`pa-pkw${n === 0 ? " is-lead" : ""}`} data-pa="ms-pkg" data-id={i.id} data-ranked={i.f.ranked ? "1" : "0"}
                onClick={() => open({ title: i.name, sub: i.contents, body: labelStatus(i.f, false) })}>
                <span className="pa-card pa-pkback">{PI.box}<b>{i.name}</b></span>
                <span className="pa-card pa-pkres">
                  <span className="pa-num pa-pkh" data-pa="ms-pkg-head">{packageHeading(i.f)}</span>
                  {i.contents ? <span className="pa-sub pa-pkc">{i.contents}</span> : null}
                  <span className="pa-sub pa-pkst" data-pa="ms-pkg-status">{labelStatus(i.f, false)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : <p className="pa-pgnone">No packages yet.</p>}

        <div className="pa-shd" id="materials"><h2 className="pa-h2">Query letters</h2><span className="pa-shn">{m.letters.length}</span></div>
        {m.letters.length ? (
          <div className="pa-group" data-pa="ms-letters">
            {m.letters.map(({ v, n, current }) => (
              <button key={v.id} type="button" className="pa-li" data-pa="ms-letter" data-id={v.id} data-n={n} onClick={() => open({ title: v.versionName, sub: usedIn(n), body: v.contentDraft })}>
                <span className="pa-ico">{PI.doc}</span>
                <span className="pa-lt">{v.versionName}<span className="pa-sub">{[usedIn(n), current ? "in use" : null].filter(Boolean).join(" · ")}</span></span>
                <span className="pa-chev">{PI.chev}</span>
              </button>
            ))}
          </div>
        ) : <p className="pa-pgnone">No query letters yet.</p>}

        <div className="pa-shd"><h2 className="pa-h2">Synopses and samples</h2></div>
        {m.synopses.length || m.samples.length ? (
          <div className="pa-group" data-pa="ms-samples">
            {m.synopses.map(({ v, n }) => (
              <button key={v.id} type="button" className="pa-li" data-pa="ms-synopsis" data-id={v.id} onClick={() => open({ title: v.versionName, sub: usedIn(n), body: v.contentDraft })}>
                <span className="pa-ico">{PI.note}</span><span className="pa-lt">{v.versionName}<span className="pa-sub">{usedIn(n)}</span></span><span className="pa-chev">{PI.chev}</span>
              </button>
            ))}
            {m.samples.map((v) => (
              <button key={v.id} type="button" className="pa-li" data-pa="ms-sample" data-id={v.id} onClick={() => open({ title: v.versionName, sub: v.componentType, body: v.contentDraft })}>
                <span className="pa-ico">{v.componentType === ComponentType.FULL_MANUSCRIPT ? PI.book : PI.pages}</span><span className="pa-lt">{v.versionName}</span><span className="pa-chev">{PI.chev}</span>
              </button>
            ))}
          </div>
        ) : <p className="pa-pgnone">No synopses or samples yet.</p>}

        <div className="pa-shd"><h2 className="pa-h2">Versions</h2></div>
        <div className="pa-prostrip" data-pa="ms-pro"><span className="pa-lock">Pro</span><span>Included for founding writers during the beta.</span></div>
        {m.bookVersions.length ? (
          <div className="pa-group pa-mt10" data-pa="ms-versions">
            {m.bookVersions.map(({ b, n, current }) => (
              <button key={b.id} type="button" className="pa-li" data-pa="ms-version" data-id={b.id} onClick={() => open({ title: b.name, sub: current ? "Current" : null, body: b.note ?? null })}>
                <span className="pa-ico">{current ? PI.check : PI.book}</span>
                <span className="pa-lt">{b.name}<span className="pa-sub">{[current ? "Current" : null, n ? `in ${n} ${n === 1 ? "query" : "queries"}` : "Not queried"].filter(Boolean).join(" · ")}</span></span>
                <span className="pa-chev">{PI.chev}</span>
              </button>
            ))}
          </div>
        ) : <p className="pa-pgnone">No versions yet.</p>}

        <div className="pa-shd" id="comps"><h2 className="pa-h2">Comparable titles</h2><span className="pa-shn">{m.comps.length}</span></div>
        {m.comps.length ? (
          <div className="pa-group" data-pa="ms-comps">
            {m.comps.map((c, k) => (
              <button key={`${c.title}-${k}`} type="button" className="pa-li" data-pa="ms-comp" onClick={() => open({ title: c.title, sub: [c.author, c.year].filter(Boolean).join(" · ") || null, body: c.note ?? null })}>
                <span className="pa-ico">{PI.book}</span>
                <span className="pa-lt">{c.title}{c.author || c.year ? <span className="pa-sub">{[c.author, c.year].filter(Boolean).join(" · ")}</span> : null}</span>
                {isOlderComp(c.year, new Date(m.nowMs).getFullYear()) ? <span className="pa-rt">Older than five years</span> : null}
              </button>
            ))}
          </div>
        ) : <p className="pa-pgnone">No comparable titles yet.</p>}

        <div className="pa-shd"><h2 className="pa-h2">Details</h2></div>
        <div className="pa-group" data-pa="ms-details">
          {[["Age category", ms.ageCategory], ["Genre", allGenres(ms)], ["Word count", wordsOf(ms) ? wordsText(wordsOf(ms)) : null], ["Current version", m.book?.name ?? null]]
            .filter(([, v]) => !!v).map(([k, v]) => (
              <div key={k as string} className="pa-li pa-kv"><span className="pa-lt pa-k">{k}</span><span className="pa-rt pa-v">{v}</span></div>
            ))}
        </div>
      </div>
      <MobileSheet open={!!read} onClose={() => setRead(null)} ariaLabel={read?.title ?? "Read"} pa={{ height: "auto", white: true, className: "pa-readsheet" }}>
        {read ? (
          <div className="pa-read" data-pa="ms-read">
            <h2 className="pa-h2">{read.title}</h2>
            {read.sub ? <p className="pa-sub">{read.sub}</p> : null}
            {read.body?.trim() ? <div className="pa-readbody">{read.body}</div> : null}
            <p className="pa-sub pa-readfoot" data-pa="ms-read-foot">Edit on a computer.</p>
          </div>
        ) : null}
      </MobileSheet>
    </div>
  );
};

