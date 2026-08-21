/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackagesOverview — what the Submission packages route lands on: a page-local rail of three
 * registers (Materials · Packages · Tracking) beside a stage carrying the problem statement and the
 * how-it-works infographic.
 * Design authority: design-refs/submission-packages-restructure.html.
 *
 * ⚠️ THIS REPLACES THE TAB STRIP AS THE PAGE'S NAVIGATION, NOT THE EDITORS BEHIND IT. The Workshop
 * and Analytics surfaces are unchanged and still do all the real work; what changed is how you
 * reach them. `+ ADD`, `+ NEW`, the register rows and the Tracking rows all hand off to flows that
 * already existed — this component builds no editor, no composer and no analytics of its own.
 *
 * ⚠️ EVERY STATE HERE IS DERIVED AT READ TIME (D2). Empty versus in-use is `versions.length` and
 * `packages.length`; the infographic's progress is those two plus a count of queries that carry a
 * package. There is no `hasSeenOverview` flag, no stored step, and nothing this page writes.
 *
 * ⚠️ THE ROWS ARE PRESENTATION ONLY — every string they render is built in `lib/packagesOverview.ts`
 * and unit-locked there. A row that formatted its own detail line would be a second place for the
 * register and the analytics view to disagree about a number.
 */
import React from "react";
import { ManuscriptVersion, SubmissionPackage, Query } from "../../types";
import {
  packageRows, packagedQueries, howItWorks, packageTiles, tileFooter,
} from "../../lib/packagesOverview";
import { canBuildPackage } from "../../lib/materialDraft";
import {
  trackingTotals, repliesByPackage, requestsByMaterial, trackingNudge, STAT_CELLS, BarRow,
} from "../../lib/packageTracking";
import "./packagesOverview.css";
import "./packagesFlow.css";

export interface PackagesOverviewProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  /** Injected so every derived date is testable and the component holds no clock. */
  now?: number;
  /** Open the existing materials editor on a blank new material. */
  /** Open the existing materials editor on one material. */
  /** Open a fresh package draft — the same signal the header's `New package` sends. */
  onNewPackage: () => void;
  /** Open one package for editing in the Workshop. */
  onOpenPackage: (id: string) => void;
  /** The nudge's one action: go and log a query, which is where a package gets attached. */
  onLogQuery?: () => void;
}

/**
 * The three steps — copy verbatim from the ref (D7), line art lifted from it unchanged (D8).
 *
 * ⚠️ THE PLATES ARE PLACEHOLDERS AND ARE MARKED AS SUCH. These are the ref's own strokes, drawn
 * dashed and labelled ILLUSTRATION, because the real drawings are a later pass. They are not
 * `manuscriptMarks` — that file is a closed set of five baked illustrations for the manuscript
 * card, and adding provisional line art to it would put placeholders in a finished collection.
 *
 * ⚠️ NO VERDICT WORDS (D7). "Replies land against the package that went out" reports; "the best
 * package" would appraise. The app reports and the writer decides.
 */
const STEPS = [
  {
    n: 1,
    title: "Add your materials",
    body: (
      <>
        Versions of your <strong>covering letter, synopsis and sample pages</strong> — written here
        or pasted in. Most writers keep two or three of each.
      </>
    ),
    art: (
      <svg viewBox="0 0 64 64" fill="none" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
        <rect x="10" y="14" width="28" height="38" rx="2" />
        <path d="M16 22h16M16 28h16M16 34h10" />
        <rect x="24" y="10" width="28" height="38" rx="2" fill="var(--pkg-card)" />
        <path d="M30 18h16M30 24h16M30 30h12M30 36h16M30 42h8" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Arrange them into packages",
    body: (
      <>
        Pick one of each and give the combination a name. Build as many as you like, then{" "}
        <strong>attach a package when you log a query</strong>.
      </>
    ),
    art: (
      <svg viewBox="0 0 64 64" fill="none" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M32 8l20 10v18L32 46 12 36V18L32 8z" />
        <path d="M32 24l20-6M32 24v22M32 24L12 18" />
        <path d="M22 13l20 10" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Track what comes back",
    body: (
      <>
        Replies land against the package that went out. Tracking shows{" "}
        <strong>which materials sit behind each response and request</strong> — reported, not
        guessed.
      </>
    ),
    art: (
      <svg viewBox="0 0 64 64" fill="none" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
        <path d="M10 52h44M10 52V14" />
        <rect x="17" y="36" width="7" height="16" />
        <rect x="29" y="26" width="7" height="26" />
        <rect x="41" y="18" width="7" height="34" />
        <path d="M18 30c8-4 14-10 30-14" strokeDasharray="2 3" />
      </svg>
    ),
  },
] as const;

/** One rail panel: sage head, mono label, derived count chip, optional outlined action. */
const Panel: React.FC<{
  label: string;
  chip?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  children: React.ReactNode;
}> = ({ label, chip, action, children }) => (
  <section className="pkgo-panel">
    <div className="pkgo-head">
      <span className="pkgo-lbl">{label}</span>
      <span className="pkgo-meta">
        {chip !== undefined && <span className="pkgo-chip">{chip}</span>}
        {action && (
          <button type="button" className="pkgo-add" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </button>
        )}
      </span>
    </div>
    <div className="pkgo-body">{children}</div>
  </section>
);

/**
 * The empty state — dashed, because dashed means provisional (D6).
 *
 * ⚠️ `onClick` IS OPTIONAL AND ITS ABSENCE CHANGES THE ELEMENT, not just the cursor. Tracking's
 * empty note explains what will happen; it is not an invitation, because there is nothing to click
 * — you make a reply arrive by sending a query, not by pressing this. So it renders as a plain
 * `div` with no pointer and no hover, rather than a button that does nothing.
 */
const Ghost: React.FC<{
  title?: string;
  sub: React.ReactNode;
  onClick?: () => void;
  /** D4's locked state — explanation only, muted title, nothing to press. */
  locked?: boolean;
  /** The tinted "this is the next thing to do" treatment. */
  next?: boolean;
}> = ({ title, sub, onClick, locked, next }) =>
  onClick ? (
    <button type="button" className={`pkgo-ghost${next ? " pkgo-ghost--next" : ""}`} onClick={onClick}>
      {title && <span className="pkgo-gtitle">{title}</span>}
      <span className="pkgo-gsub">{sub}</span>
    </button>
  ) : (
    <div className={`pkgo-ghost ${locked ? "pkgo-ghost--locked" : "pkgo-ghost--inert"}`}>
      {title && <span className="pkgo-gtitle">{title}</span>}
      <span className="pkgo-gsub">{sub}</span>
    </div>
  );

/**
 * One dashboard panel — the rail's chassis reused, holding a key and a stack of layered bars.
 *
 * ⚠️ THE BARS ARE LAYERED, AND THE KEY NAMES BOTH HALVES. The sage bar sits inside the pink one, so
 * "came back" reads as a subset of "went out" rather than a rival quantity — which is what keeps
 * this a picture of volume instead of an unstated percentage.
 */
const BarPanel: React.FC<{ label: string; backLabel: string; rows: BarRow[] }> = ({ label, backLabel, rows }) => (
  <section className="pkgo-panel">
    <div className="pkgo-head"><span className="pkgo-lbl">{label}</span></div>
    <div className="pkgo-body">
      <div className="pkgf-barkey">
        <span><i className="pkgf-sw" style={{ background: "var(--pkgo-pink-band)" }} />Sent</span>
        <span><i className="pkgf-sw" style={{ background: "var(--pkgo-sage-deep)" }} />{backLabel}</span>
      </div>
      <div className="pkgf-dashrows">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="pkgf-drow-top">
              <span className="pkgf-drname">
                {r.eyebrow && <span className="pkgf-dreyebrow">{r.eyebrow}</span>}
                {r.name}
              </span>
              <span className="pkgf-drmeta">{r.meta}</span>
            </div>
            <div className="pkgf-bar">
              <div className="pkgf-bsent" style={{ width: `${r.sentPct}%` }}>
                <div className="pkgf-bin" style={{ width: `${r.inPct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const PackagesOverview: React.FC<PackagesOverviewProps> = ({
  versions, packages, queries, now = Date.now(),
  onNewPackage, onOpenPackage, onLogQuery,
}) => {
  const pkgs = packageRows(packages, versions, queries);
  const live = packagedQueries(packages, queries).length;
  const steps = howItWorks(versions.length, packages.length, live);
  /* D4's gate, derived — never a stored flag. */
  const unlocked = canBuildPackage(versions);
  const tiles = packageTiles(packages, versions, queries);

  /**
   * ⚠️ THE RAIL'S PACKAGE ROWS ARE AN INDEX OF THE GRID, NOT A SECOND LIST OF PACKAGES (D7). Clicking
   * one scrolls its tile into view and flashes it; it does NOT open the builder. Two surfaces that
   * both opened the editor would make the rail a duplicate control rather than a way of finding
   * something — and the tile itself is what opens the builder.
   */
  const totals = trackingTotals(packages, queries);
  const nudge = trackingNudge(packages, queries);
  const byPackage = repliesByPackage(packages, queries);
  const byMaterial = requestsByMaterial(packages, versions, queries);

  const tileRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [flashed, setFlashed] = React.useState<string | null>(null);
  const jumpToTile = (id: string) => {
    tileRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setFlashed(id);
    window.setTimeout(() => setFlashed((cur) => (cur === id ? null : cur)), 1300);
  };

  return (
    <div className="pkgo-grid">
      <aside className="pkgo-rail" aria-label="Registers">
        {/* ⚠️ THE MATERIALS PANEL IS RETIRED (D1, broadsheet Phase 2). Materials are now a full
            band on the stage — three type columns of sheets, each carrying its own source and usage
            line. A rail register listing the same materials beside it would be a second index of one
            thing, and the day the two disagree nothing in the app says which is the answer. The
            band's `+ ADD` and its per-column ghosts are the entry points; both open the same modal
            this panel opened. */}
        <Panel
          label="Packages"
          chip={String(packages.length)}
          /* ⚠️ DISABLED IN LOCKSTEP WITH THE HEADER'S `New package` (D4) — they are the same decision
             rendered twice, so they read the same boolean rather than each deciding for itself. */
          action={{ label: "+ NEW", onClick: onNewPackage, disabled: !unlocked }}
        >
          {pkgs.length === 0 ? (
            unlocked ? (
              <Ghost
                title="Build a package"
                sub="Pick one of each material and name the combination."
                onClick={onNewPackage}
                next
              />
            ) : (
              /* ⚠️ PURE EXPLANATION — no buttons, nothing clickable (D4). Copy verbatim per D12. */
              <Ghost
                locked
                title="No packages yet"
                sub={<>
                  A package is a covering letter, a synopsis and — if you want one — a sample,
                  bundled under a name.<br /><br />
                  You'll be able to build one once you've added a covering letter and a synopsis to
                  your materials.
                </>}
              />
            )
          ) : (
            <div className="pkgo-reg">
              {pkgs.map((p) => (
                <button key={p.id} type="button" className="pkgo-row" onClick={() => jumpToTile(p.id)}>
                  <span className="pkgo-name">{p.name}</span>
                  {/* ⚠️ THE COMPOSITION LINE IS GONE FROM THE RAIL (D7). It lives on the tile now, in
                      three labelled rows; repeating it here made the rail a small copy of the grid
                      rather than an index of it. Name and send state are what you scan for. */}
                  <span className="pkgo-detail">{p.sentLine}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* ⚠️ THE TRACKING RAIL PANEL IS RETIRED (D9). The rail is Materials + Packages — the two
            things you MAKE. Tracking is what came back, it now has a whole dashboard on the stage,
            and a third rail panel summarising it made the rail half index and half readout. Its
            route into the old AnalyticsTab goes with it: nothing on this page reaches that component
            any more, though it stays on disk and stays mounted by `#/pkg-lab`. */}
      </aside>

      <div className="pkgo-stage">
        {/* ⚠️ TWO STATES, DERIVED FROM THE DATA (D6). No package → the onboarding stage; any package
            → the working one. There is no stored "has onboarded" flag, so deleting your last package
            takes you back to the explanation, which is the honest thing for a page whose whole job
            is to describe what packages are. */}
        {packages.length > 0 ? (
          <>
            <section>
              <div className="pkgf-workhead">
                <h2>Your packages</h2>
                <span className="pkgf-worktag">
                  {packages.length} {packages.length === 1 ? "package" : "packages"}
                </span>
              </div>
              <div className="pkgf-tiles">
                {tiles.map((t) => {
                  const foot = tileFooter(t);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-tile={t.id}
                      ref={(el) => { tileRefs.current[t.id] = el; }}
                      className={`pkgf-tile${flashed === t.id ? " pkgf-tile--flash" : ""}`}
                      onClick={() => onOpenPackage(t.id)}
                    >
                      <h4>{t.name}</h4>
                      <div className="pkgf-slots">
                        {t.slots.map((sl) => (
                          <span key={sl.label} className="pkgf-slot">
                            <span className="pkgf-slt">{sl.label}</span>
                            <span className={`pkgf-sln${sl.name ? "" : " pkgf-sln--none"}`}>
                              {sl.name ?? "Not included"}
                            </span>
                          </span>
                        ))}
                      </div>
                      <div className="pkgf-tfoot">
                        {"idle" in foot ? (
                          <span className="pkgf-idle">{foot.idle}</span>
                        ) : (
                          <>
                            <span className="pkgf-out">{foot.out}</span>
                            <span className="pkgf-in">{foot.replied}</span>
                            <span className="pkgf-in">{foot.requests}</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
                {/* The ghost tile is last, and it is the only way to add from the grid. */}
                <button type="button" className="pkgf-tile pkgf-tile--ghost" onClick={onNewPackage}>
                  <span>
                    <span className="pkgo-gtitle">Build another package</span>
                    <span className="pkgo-gsub" style={{ display: "block" }}>
                      A different letter, a different length of synopsis.
                    </span>
                  </span>
                </button>
              </div>
            </section>
            {/* ── the tracking dashboard (D8) ── */}
            <section>
              <div className="pkgf-workhead">
                <h2>Tracking</h2>
                <span className="pkgf-worktag">Reported, not guessed</span>
              </div>
              {nudge ? (
                <>
                  {/* ⚠️ PRE-SENT: a nudge naming the FIRST package, then two dashed ghosts saying what
                      will appear. Ghosts rather than empty panels, because an axis with no bars reads
                      as a broken chart while a dashed note reads as "not yet". */}
                  <div className="pkgf-nudge">
                    Attach <strong>{nudge.packageName}</strong> when you log your next query — replies
                    land back here against it.
                    {onLogQuery && (
                      <button type="button" className="pkgf-nudgelink" onClick={onLogQuery}>
                        Log a query ›
                      </button>
                    )}
                  </div>
                  <div className="pkgf-dashghosts">
                    <div className="pkgo-ghost pkgo-ghost--inert">
                      <span className="pkgo-gtitle" style={{ color: "var(--pkg-muted)", fontStyle: "normal" }}>
                        Replies by package
                      </span>
                      <span className="pkgo-gsub">Appears once a package goes out with a query.</span>
                    </div>
                    <div className="pkgo-ghost pkgo-ghost--inert">
                      <span className="pkgo-gtitle" style={{ color: "var(--pkg-muted)", fontStyle: "normal" }}>
                        Requests by material
                      </span>
                      <span className="pkgo-gsub">Shows which materials sit behind each request.</span>
                    </div>
                  </div>
                </>
              ) : totals.sent > 0 ? (
                <>
                  <div className="pkgf-statstrip">
                    {STAT_CELLS.map((c) => (
                      <div key={c.key} className="pkgf-stat">
                        <div className="pkgf-statn">{totals[c.key]}</div>
                        <div className="pkgf-statl">
                          <span className={`pkgf-dir pkgf-dir--${c.direction}`}>{c.dir}</span>
                          {c.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pkgf-dashgrid">
                    <BarPanel label="Replies by package" backLabel="Replied" rows={byPackage} />
                    <BarPanel label="Requests by material" backLabel="Requested" rows={byMaterial} />
                  </div>
                </>
              ) : null}
            </section>
          </>
        ) : (
        <>
        {/* ⚠️ THE PROBLEM STATEMENT IS THE OLD `.pkgw-strip`, PROMOTED — not a second pitch. The
            page used to carry this same sentence as a thin strip above the tab row; the ref makes
            it the stage's opening card, so the strip is removed rather than left to say the same
            thing twice. Copy is the ref's, verbatim (D7). */}
        <section className="pkgo-prob">
          <p className="pkgo-hand">Fed up of guessing which materials are landing with agents?</p>
          <p className="pkgo-probsub">
            Every package keeps its own scorecard. ScriptAlly records{" "}
            <strong>which letter, synopsis and pages went to each agent</strong> — so the answer sits
            on the page, not in your head.
          </p>
        </section>

        <section>
          <div className="pkgo-hiwhead">
            <h2>How it works</h2>
            <span className="pkgo-hiwtag">Three steps</span>
          </div>
          {/* ⚠️ THE INFOGRAPHIC DOUBLES AS PROGRESS (D3) AND READS THE SAME COUNTS THE RAIL DOES.
              `steps` comes from `howItWorks(versions.length, packages.length, live)` — the very
              numbers the chips above render — so the stage cannot claim "2 BUILT" beside a register
              listing three. One derivation, two surfaces. */}
          <div className="pkgo-steps">
            {STEPS.map((s, i) => {
              const state = steps[i];
              return (
                <article key={s.n} className={`pkgo-step${state.live ? " pkgo-step--live" : ""}`}>
                  <div className="pkgo-eyebrow">
                    <span className={`pkgo-num${state.done ? " pkgo-num--done" : ""}`}>{s.n}</span>
                    {state.tick && (
                      <span className={`pkgo-tick${state.live ? " pkgo-tick--live" : ""}`}>{state.tick}</span>
                    )}
                  </div>
                  {/* D8 — the illustrations are not drawn yet, and the plate says so rather than
                      pretending. Dashed is this page's provisional grammar. */}
                  <div className="pkgo-plate">
                    {s.art}
                    <span className="pkgo-platelbl">Illustration</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </article>
              );
            })}
          </div>
        </section>
        </>
        )}
      </div>
    </div>
  );
};
