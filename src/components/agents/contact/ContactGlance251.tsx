/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 Part A (design-refs/contact-list-v25-1/, screens 01 and 02) — "At a glance" as ONE ledger card:
 * a white card split into four cells by hairlines (List health · Not queried · Querying · Closed). Replaces v25 B's
 * four tinted-head cards on the Contact list; the Query Centre's QcStatCards150 (and shared/GlanceCards) are untouched.
 *
 *   row 1   a 10px swatch and the label (Special Elite 17); List health puts "{n} gaps →" at the right
 *   row 2   the count (Special Elite 44, 36 at ≤1440 of window) on the left; on the right the ring (List health) or
 *           the faces in each agent's state colours, then "+N"
 *
 * ⚠️ THE FIGURES ARE v25's `glanceCards` (lib/contactV25), unchanged. A face's colours are its agent's `stand`, looked up
 *    by the page (Querying mixes Your move and With the agent).
 * ⚠️ THE FACES SHOWN ARE CUT TO EACH CELL'S MEASURED ROOM (and to three at a window of 1440 or less), and "+N" grows to
 *    match: shown + N is always the count.
 * ⚠️ List health OPENS HOUSEKEEPING; it never filters and is never pressed (no `aria-pressed`).
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { HealthRing } from "./ContactLightHeader";
import { gapsWord, type GlanceCardModel, type GlanceKey } from "../../../lib/contactV25";
import type { SetKey } from "../../../lib/contactV24";
import type { GlanceFoot } from "../../../lib/contactV256";
import "./contactV251.css";
import "./contactV256.css";

const SWATCH: Record<GlanceKey, string> = { health: "you", none: "none", querying: "agent", closed: "closed" };
const agentsN = (n: number) => `${n} ${n === 1 ? "agent" : "agents"}`;

export const ContactGlance251: React.FC<{
  cards: GlanceCardModel[];
  /** the pressed filtering cell, or null */
  pressed: GlanceKey | null;
  onCard: (k: GlanceKey) => void;
  /** false while the list settles: no figure, nothing pressable */
  ready: boolean;
  /** an agent's set, for the colours of their face */
  standOf: (agentId: string) => SetKey | null;
  /** v25.6 B — the foot line under each cell (lib/contactV256 `glanceFeet`); a cell whose foot is null has none */
  feet?: Partial<Record<GlanceKey, GlanceFoot | null>>;
}> = ({ cards, pressed, onCard, ready, standOf, feet }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const read = () => {
      const out: Record<string, number> = {};
      const narrow = window.innerWidth <= 1440;
      el.querySelectorAll<HTMLElement>("[data-cl251='cell']").forEach((c) => {
        const row = c.querySelector<HTMLElement>("[data-cl251='row2']"), n = c.querySelector<HTMLElement>("[data-cl251='count']");
        if (!row || !n) return;
        const d = narrow ? 24 : 28;
        /* the row's room: its width less the count, a gap and the "+N" (about 30) */
        const avail = row.clientWidth - n.offsetWidth - 14 - 30;
        const fit = Math.max(1, Math.floor((avail - d) / (d - 3)) + 1);
        out[c.dataset.k!] = narrow ? Math.min(3, fit) : fit;
      });
      setRoom((r) => (JSON.stringify(r) === JSON.stringify(out) ? r : out));
    };
    read();
    window.addEventListener("resize", read);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => { window.removeEventListener("resize", read); ro?.disconnect(); };
  }, [cards]);

  return (
    <section className="cl251-glance" data-cl251="glance" aria-labelledby="cl251-gh">
      <h3 id="cl251-gh" className="cl251-gh" data-cl251="glance-title">At a glance</h3>
      <div className="cl251-led" data-cl251="ledger" ref={cardRef} aria-busy={!ready || undefined}>
        {cards.map((c) => {
          const health = c.key === "health";
          const on = !health && pressed === c.key;
          const fit = room[c.key] ?? c.faces.length;
          const faces = c.faces.slice(0, Math.min(c.faces.length, fit));
          const more = c.total - faces.length;
          return (
            <button key={c.key} type="button" className={`cl251-cell cl251-cell--${c.key}${health ? " cl256-navy" : ""}`} data-cl251="cell" data-k={c.key} data-on={on ? "" : undefined}
              aria-pressed={health ? undefined : on} disabled={!ready}
              aria-label={health
                ? `List health: ${c.count}%. ${c.gaps ? `${gapsWord(c.gaps)} to fill. ` : ""}Open Housekeeping`
                : `${c.label}: ${agentsN(c.count)}. ${on ? "Showing only these; press to show all" : "Show only these"}`}
              onClick={() => onCard(c.key)}>
              <span className="cl251-r1" data-cl251="label-row">
                <i className={`qc149-sw cl24-sw--${SWATCH[c.key]} cl251-sw`} aria-hidden="true" />
                <b data-cl251="label">{c.label}</b>
              </span>
              <span className="cl251-r2" data-cl251="row2">
                <span className="cl251-n" data-cl251="count">{ready ? (health ? `${c.count}%` : c.count) : ""}</span>
                {health ? (
                  <span className="cl251-ring" data-cl251="ring" aria-hidden="true"><HealthRing pct={ready ? c.count : null} on="navy" /></span>
                ) : (
                  <span className="cl251-faces" data-cl251="faces" data-n={faces.length} data-more={more}>
                    {faces.map((f) => (
                      <span key={f.key} className={`cl24-dsc cl24-dsc--${standOf(f.key) ?? "none"} cl251-face`} title={f.title} aria-hidden="true">{f.initials}</span>
                    ))}
                    {more > 0 ? <i className="cl251-more" data-cl251="more">+{more}</i> : null}
                  </span>
                )}
              </span>
              {/* v25.6 B — the foot line: italic serif with its number in the typewriter; List health's in the light rust */}
              {ready && feet?.[c.key] ? (
                <span className={`cl256-ft${health ? " go" : ""}`} data-cl256="foot" data-k={c.key} data-n={feet[c.key]!.n}>
                  <b>{feet[c.key]!.n}</b> {feet[c.key]!.words}{health ? " →" : ""}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
