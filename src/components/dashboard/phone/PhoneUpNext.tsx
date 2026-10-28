/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Up next on the phone (Dashboard on the phone v1, Part C; ref screens 01–03). The first task is the hero, tinted by
 * its kind, with the courier; the next three follow as rows. The list is the desktop task card's own (`dashList`),
 * in its own order, and each card's words come from `taskCardModel` — the sentence the desktop card says.
 *
 * ⚠️ "View task" NEVER COMPLETES A TASK. It calls the dashboard's own `viewTask`, which opens the place the task is
 * done (the query card with its next step, the agent editor, a flow).
 */
import React, { useMemo } from "react";
import { Archive, Bell, ChevronRight, List, Send } from "lucide-react";
import type { ListAction, ListItem, ListPlan } from "../../../lib/dashList";
import { taskCardModel, type TaskCtx } from "../../../lib/dashTaskCard";
import { PHONE_KIND, UP_NEXT_ROWS, phoneKindOf, type PhoneKind } from "../../../lib/dashPhone";
import { DASH_ART, artUrl } from "../../../lib/dashArt";
import { CAUGHT_UP, VIEW_TASK } from "../v71/Dash71Task";

const GLYPH: Record<PhoneKind, typeof Send> = { move: Send, nudge: Bell, close: Archive, house: List };

export const PhoneUpNext: React.FC<{
  loading: boolean;
  plan: ListPlan;
  ctx: TaskCtx;
  onView: (a: ListAction) => void;
  onSeeAll: () => void;
}> = ({ loading, plan, ctx, onView, onSeeAll }) => {
  const labelOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of plan.groups) for (const it of g.items) m.set(it.key, g.label);
    return m;
  }, [plan]);
  const items: ListItem[] = plan.items;
  const models = useMemo(() => items.slice(0, 1 + UP_NEXT_ROWS).map((it) => ({ it, m: taskCardModel(it, labelOf.get(it.key) ?? "", ctx) })), [items, labelOf, ctx]);
  const hero = models[0];
  const rest = models.slice(1);
  const kind = hero ? phoneKindOf(hero.it) : "house";
  const tone = PHONE_KIND[kind];

  return (
    <section className="dm1-sec" data-dm1="upnext" aria-labelledby="dm1-upnext-h">
      <div className="dm1-sechead">
        <h2 id="dm1-upnext-h" className="dm1-h">Up next</h2>
        <button type="button" className="dm1-link" data-dm1="see-all" onClick={onSeeAll}>See all</button>
      </div>
      <div
        className={`dm1-hero${loading ? " is-loading" : ""}`} data-dm1="hero" data-kind={hero ? kind : "none"} data-key={hero?.it.key ?? ""} data-who={hero?.m.who ?? ""}
        data-action={!hero ? "" : hero.m.queryId ? "query" : hero.it.action.kind}
        style={{ background: tone.tint, boxShadow: tone.ring ? `inset 0 0 0 1px ${tone.ring}` : undefined }}
      >
        <img className="dm1-courier" data-dm1="courier" src={artUrl(DASH_ART.courier)} alt="" aria-hidden="true" draggable={false} />
        <div className="dm1-herohead">
          <span className="dm1-kicker" style={{ color: tone.kicker }} data-dm1="kicker">Your next step</span>
          {hero && <span className="dm1-of" data-dm1="of">1 of {items.length}</span>}
        </div>
        {loading ? <p className="dm1-herottl">&nbsp;</p> : hero ? (
          <>
            <p className="dm1-herottl" data-dm1="hero-title">{hero.m.pre}{hero.m.who}{hero.m.post}</p>
            {/* the desktop card's own sentence, and only that: where it has none, the phone states none (the list's
                mono fact line is an uppercase system tag, which the phone does not use) */}
            {hero.m.line && <p className="dm1-heroline" data-dm1="hero-line">{hero.m.line}</p>}
            {hero.m.steps && (
              <ol className="dm1-steps" data-dm1="steps">
                {hero.m.steps.map((s, i) => (
                  <li key={i} className={s.done ? "" : "is-todo"} data-done={s.done ? "1" : "0"}>
                    {i > 0 && <span className="dm1-stepsep" aria-hidden="true">›</span>}
                    <span className="dm1-step">{s.done ? `${s.label} ${s.date}` : s.label}</span>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" className="dm1-view" data-dm1="view-task" onClick={() => onView(hero.it.action)}>{VIEW_TASK}</button>
          </>
        ) : (
          <p className="dm1-heroline" data-dm1="hero-none">{CAUGHT_UP}</p>
        )}
      </div>
      {!loading && rest.length > 0 && (
        <ul className="dm1-group dm1-rows" data-dm1="rows">
          {rest.map(({ it, m }) => {
            const k = phoneKindOf(it);
            const Icon = GLYPH[k];
            const t = PHONE_KIND[k];
            return (
              <li key={it.key}>
                <button type="button" className="dm1-row" data-dm1="row" data-kind={k} data-key={it.key} onClick={() => onView(it.action)}>
                  <span className="dm1-rdisc" style={{ background: t.disc, color: t.glyph }} aria-hidden="true"><Icon /></span>
                  <span className="dm1-rtxt">
                    <span className="dm1-rttl">{m.pre}<b>{m.who}</b>{m.post}</span>
                    {m.line && <span className="dm1-rline">{m.line}</span>}
                  </span>
                  <ChevronRight className="dm1-chev" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
