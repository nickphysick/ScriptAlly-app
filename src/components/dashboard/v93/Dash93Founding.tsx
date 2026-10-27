/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v93 — THE FOUNDING CARD: "YOUR CONTRIBUTIONS" (ref design-refs/dashboard-v93/founding-tiers-how-v92.html).
 *
 * The card no longer takes feedback (that is the sidebar's Give feedback, unchanged); it shows what the writer has
 * contributed. A medallion — the current character inside a progress ring — the level, the tier's line, the stat line,
 * and a ladder of the five tiers: Fledgling 1 · Archivist 3 · Scout 8 · Mentor 15 · QueryHawk 25. "How it works" opens a
 * right-hand panel. The numbers are the server's (`foundingStats/{uid}`, read live by `useFoundingStats`).
 *
 * ⚠️ THE VARIANT IS THE CARD'S OWN HEIGHT, NEVER THE WINDOW'S (a size container, dash93.css): Full ≥270 (the ladder),
 *    Medium 150–269 (no ladder, an 80px medallion), Compact under 150 (one row). Both bodies are in the DOM; exactly one
 *    is displayed, so the hidden one is out of the accessibility tree and every measurement.
 * ⚠️ THE PANEL IS PORTALLED TO `document.body`, so it carries its own colours (no page token reaches it). Focus moves
 *    into it and returns to the button that opened it; ✕, Escape (the shared escape stack) and the dim layer close it.
 * ⚠️ NO GREEN, AND NO "NICK": the app says "us", "we" or "our founder".
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { TIERS, ringFraction, tierIndex, useFoundingStats, type TierKey } from "../../../lib/foundingStats";
import { CARD_BAND, HOW, HOW_LABEL, cardCopy } from "../../../lib/foundingCopy";

/** The tier heads: placeholder crops of existing art until the illustrator draws the tiers. */
export const TIER_HEAD: Record<TierKey, string> = {
  fledgling: "/images/founding/tiers/fledgling-head.png",
  archivist: "/images/founding/tiers/archivist-head.png",
  scout: "/images/founding/tiers/scout-head.png",
  mentor: "/images/founding/tiers/mentor-head.png",
  queryhawk: "/images/founding/tiers/queryhawk-head.png",
};
/** The medallion's drawing: the existing full drawings (the QueryHawk's is the courier, a stand-in); the Fledgling's crop. */
export const TIER_ART: Record<TierKey, string> = {
  fledgling: "/images/founding/tiers/fledgling-head.png",
  archivist: "/images/dash/archivist.png",
  scout: "/images/contact-list-scout.webp",
  mentor: "/images/dash/mentor-leaning.png",
  queryhawk: "/images/dash/courier.png",
};

const C = 2 * Math.PI * 44;

const Medallion: React.FC<{ tier: TierKey | null; fraction: number }> = ({ tier, fraction }) => {
  const key: TierKey = tier ?? "fledgling";
  return (
    <div className={`d93-med${tier ? "" : " is-none"}${key === "fledgling" ? " is-head" : ""}`} data-d93="medallion" data-ring={fraction.toFixed(3)} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#ead9cf" strokeWidth="6" />
        {fraction > 0 && (
          <circle data-d93="ring" cx="50" cy="50" r="44" fill="none" stroke="#a2452a" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(fraction * C).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 50 50)" />
        )}
        <circle cx="50" cy="50" r="38" fill="#fbefe9" />
      </svg>
      <img src={TIER_ART[key]} alt="" draggable={false} />
    </div>
  );
};

const HowButton: React.FC<{ onOpen: (el: HTMLButtonElement) => void; open: boolean; panelId: string }> = ({ onOpen, open, panelId }) => (
  <button type="button" className="d93-how" data-d93="how" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} onClick={(e) => onOpen(e.currentTarget)}>
    <i aria-hidden="true">i</i><span>{HOW_LABEL}</span>
  </button>
);

export const HowPanel: React.FC<{ open: boolean; onClose: () => void; id: string; titleId: string }> = ({ open, onClose, id, titleId }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageDrawer);
  useEffect(() => { if (open) requestAnimationFrame(() => closeRef.current?.focus()); }, [open]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className={`d93-dim${open ? " on" : ""}`} data-d93="dim" onClick={onClose} aria-hidden="true" />
      <aside className={`d93-panel${open ? " on" : ""}`} id={id} data-d93="panel" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-hidden={!open} inert={!open}>
        <header className="d93-ph">
          <div><div className="d93-pkick">{HOW.kicker}</div><h2 className="d93-ptitle" id={titleId}>{HOW.title}</h2></div>
          <button type="button" className="d93-px" data-d93="close" aria-label="Close" ref={closeRef} onClick={onClose}>✕</button>
        </header>
        <div className="d93-pb">
          <p className="d93-lead">{HOW.lead[0]}<b>{HOW.lead[1]}</b>{HOW.lead[2]}</p>
          <h3 className="d93-ph3">{HOW.flock}</h3>
          <ol className="d93-flock" data-d93="flock">
            {TIERS.map((t) => (
              <li key={t.key}>
                <span className="d93-fhd"><img src={TIER_HEAD[t.key]} alt="" /></span>
                <b>{t.name}</b><small>{t.min}+ contributions</small><em>{t.line}</em>
              </li>
            ))}
          </ol>
          <h3 className="d93-ph3">{HOW.counts}</h3>
          <table className="d93-counts" data-d93="counts"><tbody>
            {HOW.rows.map((r) => <tr key={r}><td>{r}</td><td>1</td></tr>)}
            <tr className="is-bonus"><td>{HOW.bonus}</td><td>+3</td></tr>
          </tbody></table>
          <h3 className="d93-ph3">{HOW.rules}</h3>
          <ul className="d93-fair" data-d93="fair">{HOW.fair.map((f) => <li key={f.b}><b>{f.b}</b>{f.t}</li>)}</ul>
          <p className="d93-pfoot">{HOW.footBefore}<b>{HOW.footLink}</b>{HOW.footAfter}</p>
        </div>
      </aside>
    </>,
    document.body,
  );
};

export const Dash93Founding: React.FC<{ loading: boolean; uid: string | null }> = ({ loading, uid }) => {
  const { loading: statsLoading, stats } = useFoundingStats(uid);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const panelId = `${id}-how`, titleId = `${id}-how-h`, bandId = `${id}-band`;
  const onOpen = (el: HTMLButtonElement) => { opener.current = el; setOpen(true); };
  const onClose = () => { setOpen(false); requestAnimationFrame(() => opener.current?.focus()); };

  if (loading || statsLoading) {
    return (
      <section className="d93-fw is-loading d58-skcard" data-sk="card" data-d58="panel" data-d71="fw" data-loading="1" aria-hidden="true">
        <div className="d93-frame"><div className="d93-band"><span>{CARD_BAND}</span></div><div className="d93-full" /></div>
      </section>
    );
  }

  const copy = cardCopy(stats);
  const at = tierIndex(stats.tier);
  const fraction = ringFraction(stats);
  return (
    <section
      className="d93-fw" data-d58="panel" data-d71="fw" data-loading="0" data-tier={stats.tier ?? "none"} data-contributions={stats.contributions}
      data-waiting={stats.waiting} aria-labelledby={bandId}
    >
      <div className="d93-frame">
        <div className="d93-band" data-d93="band"><span id={bandId} data-d93="band-title">{CARD_BAND}</span></div>

        {/* ── Full and Medium (150px of card and over) ── */}
        <div className="d93-full" data-d93="full">
          <div className="d93-top">
            <Medallion tier={stats.tier} fraction={fraction} />
            <div className="d93-mt">
              <div className="d93-krow">
                <span className="d93-kick" data-d93="kicker">{copy.kicker}</span>
                <HowButton onOpen={onOpen} open={open} panelId={panelId} />
              </div>
              <h3 className="d93-ttl" data-d93="title">{copy.title}</h3>
              <p className="d93-blurb" data-d93="line">{copy.line}</p>
              {copy.stat.length > 0 && (
                <p className="d93-stat" data-d93="stat">
                  {copy.stat.map((r, i) => (r.b ? <b key={i} className={r.rust ? "is-rust" : undefined}>{r.t}</b> : <React.Fragment key={i}>{r.t}</React.Fragment>))}
                </p>
              )}
            </div>
          </div>
          <ol className="d93-lad" data-d93="ladder">
            {TIERS.map((t, i) => {
              const st = at < 0 ? "future" : i < at ? "done" : i === at ? "you" : "future";
              return (
                <li key={t.key} className={`is-${st}`} data-d93="rung" data-state={st} aria-current={st === "you" ? "step" : undefined}>
                  <span className="d93-hd"><img src={TIER_HEAD[t.key]} alt="" draggable={false} /></span>
                  <b>{t.name}</b><small>{t.min}+</small>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── Compact (under 150px of card): one row ── */}
        <div className="d93-compact" data-d93="compact">
          <span className={`d93-chd${at < 0 ? " is-none" : ""}`} aria-hidden="true"><img src={TIER_HEAD[stats.tier ?? "fledgling"]} alt="" draggable={false} /></span>
          <p className="d93-cline" data-d93="compact-line">{copy.compact}{stats.waiting > 0 ? ` · ${stats.waiting} waiting` : ""}</p>
          <HowButton onOpen={onOpen} open={open} panelId={panelId} />
        </div>
      </div>
      <HowPanel open={open} onClose={onClose} id={panelId} titleId={titleId} />
    </section>
  );
};
