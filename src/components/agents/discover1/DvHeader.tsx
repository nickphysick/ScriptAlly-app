/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the two-state header (ref design-refs/discover-v1/discover-v1.html).
 *
 *   · POPULATED (the Scout is live): Workspace headers v1 (14 Nov) — the shared navy header (`DvNavyHeader`, below):
 *     the title, "for {book}", Tune the Scout · Share my agents, and on the right the "Picks reviewed" ring with
 *     "How the Scout finds agents". (v1's light header, its eyebrow and its three-row card are gone.)
 *   · EMPTY (coming soon): the navy panel — "The Scout is out looking", the paragraph, Tell me when it's ready · How
 *     the Scout works, and the binoculars bird on its disc.
 *
 * ⚠️ PAGE-LOCAL. The shared LightHeader / EmptyPanel live on the Comparable titles v28 branch, not on main; these are
 *    copies under `dv1-` (lift candidates once that branch lands), and nothing here edits a shared rule.
 * ⚠️ THE RING'S FIGURES ARE THE QUEUE'S OWN (`scoutTally`). With nothing decided there is NO arc element at all — a
 *    zero-length arc with a round cap paints a dot (WsnhRing draws none at 0). With nothing at all the centre is a dash.
 * ⚠️ THE TITLE KEEPS `data-page-title` (the hook the shell reads for "has the title scrolled past?").
 */
import React from "react";
import { WorkspaceNavyHeader, WsnhRing, WsnhWords } from "../../shell/WorkspaceNavyHeader";
import type { ScoutTally } from "../../../lib/scout";
import { considerWords } from "../../../lib/scout";

export const DV_EYEBROW = "— Discover —";
export const DV_ART = { src: "/images/contact/discover-binoculars-bird.png", version: 1 };
export const DV_FACE = { src: "/images/discover/scout-face.webp", version: 1 };

export const ProTag: React.FC = () => <span className="dv1-pro" data-dv1="pro">PRO</span>;

export type HeaderTitle = { kind: "count"; n: number } | { kind: "done" } | { kind: "none" } | { kind: "loading" };

/* Workspace headers v1 (design-refs/workspace-headers-v1, "Discover") — the live page's navy header: "<n> agents to
   consider" for the book; Tune and Share; on the right the "Picks reviewed" ring, "<n> of <n> decided" and the link to
   how the Scout finds agents. The three-row legend beside the ring is gone. Every figure is `scoutTally`'s, as before.
   With nothing to consider yet (no picks, none decided) there is no right block. */
export const dvTitle = (t: HeaderTitle): string => t.kind === "count" ? `${t.n} ${considerWords(t.n)}` : t.kind === "done" ? "You’re up to date"
  : t.kind === "none" ? "Nothing to consider yet" : " ";
export const DvNavyHeader: React.FC<{
  title: HeaderTitle;
  msTitle: string | null;
  tally: ScoutTally | null;
  onTune: () => void;
  onShare: () => void;
  onHow: () => void;
}> = ({ title, msTitle, tally, onTune, onShare, onHow }) => {
  const loading = title.kind === "loading";
  const words = dvTitle(title);
  const right = !loading && tally && title.kind !== "none";
  return (
    <WorkspaceNavyHeader page="discover" art="discover-header" loading={loading}
      title={words}
      forLine={msTitle ? { lead: "for", text: msTitle } : { text: "choose a manuscript in the sidebar" }}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-dv1="tune" disabled={loading} onClick={onTune}>Tune the Scout</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-dv1="share" disabled={loading} onClick={onShare}>Share my agents</button>
      </>}
      right={right ? <>
        <WsnhRing pct={tally.pct} />
        <WsnhWords lead="The Scout’s" name="Picks reviewed"
          sub={tally.total === 0 ? "nothing to decide yet" : <><b data-dv1="hd-decided">{tally.decided}</b> of {tally.total} decided</>}>
          <button type="button" className="wsnh-lnk" data-dv1="how" onClick={onHow}>How the Scout finds agents</button>
        </WsnhWords>
      </> : null}
      bar={{
        title: words,
        aside: right && tally.total > 0 ? <b>{tally.decided} of {tally.total} picks reviewed</b> : null,
        button: { label: "Tune the Scout", onClick: onTune, disabled: loading },
      }} />
  );
};

/** The EMPTY state's header: the navy panel. The rest of the coming-soon page renders as its children. */
export const DvEmptyHeader: React.FC<{
  msTitle: string | null;
  /** the books have not answered yet: the title's span is drawn blank, so it does not arrive late and move the panel */
  titleLoading?: boolean;
  notified: boolean;
  onNotify: () => void;
  onHow: () => void;
  children?: React.ReactNode;
}> = ({ msTitle, titleLoading = false, notified, onNotify, onHow, children }) => (
  <section className="dv1-ae" data-dv1="coming-soon" data-own-header="" aria-label="Discover, before the Scout is live">
    <div className="dv1-aep" data-dv1="panel">
      <div className="dv1-aet">
        <p className="dv1-aek" data-dv1="eyebrow">{DV_EYEBROW}<ProTag /></p>
        <h1 className="dv1-aeh" data-page-title="" data-dv1="title" tabIndex={-1}>The Scout is<br />out looking</h1>
        <p className="dv1-aepp" data-dv1="lede">
          As writers join, their agent lists build one shared catalogue. Every agent in it is checked by hand before the Scout
          brings you the ones who want a book like {titleLoading ? <span className="dv1-mono" data-blank="" aria-hidden="true">your manuscript</span> : msTitle ? <span className="dv1-mono" data-dv1="ms">{msTitle}</span> : "yours"} — with the reasons they fit.
          Nothing joins your contact list without you.
        </p>
        <div className="dv1-aeb">
          <button type="button" className={`dv1-b1${notified ? " is-done" : ""}`} data-dv1="notify" aria-pressed={notified} onClick={onNotify}>
            {notified ? <><svg className="dv1-tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>We’ll tell you</> : "Tell me when it’s ready"}
          </button>
          <button type="button" className="dv1-b2" data-dv1="how" onClick={onHow}>How the Scout works</button>
        </div>
      </div>
      <div className="dv1-aeart" aria-hidden="true">
        <div className="dv1-disc"><img alt="" src={`${DV_ART.src}?v=${DV_ART.version}`} /></div>
      </div>
    </div>
    {children}
  </section>
);
