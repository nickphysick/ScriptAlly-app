/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 — "WHERE TO START" (design-refs/todo-arrival-v1/, "Run-through first", "Where to start sits: On the
 * page", "Waiting line: On", "Lights up with the desk: On"). The desk while no task is open and something needs the
 * writer, drawn on the workspace's own ground: no desk card, no navy bar.
 *   · the heading and today's date;
 *   · the hawk (the desk's own `.tws-mnote`, in the first task's stage colour) with one line from the data, and Start;
 *   · one pile per tray group (lib/todoArrival `runPiles`), its count, title, sub-line and the rows' own glyph discs;
 *   · the waiting line: one disc per task that needs the writer, placed by the day count its tray row shows.
 * Every word and shape is computed in lib/todoArrival (pure, locked); this draws it. Hovering a pile or a disc lights
 * the matching rows in the tray (`onLight`); the page owns that state, so a tray row can light its disc here too.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import {
  hawkLine, lineAxis, lineLabels, linePoints, longDay, runPiles, startLabel, agentFirst, type Pile,
} from "../../../lib/todoArrival";
import { stageVars, wsStage, type WsTask } from "../../../lib/todoWs";

const MENTOR = "/images/todo/mentor.webp";
const ARROW = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
/** the discs a pile shows before "and {n} more" */
export const PILE_DISCS = 5;
/** a tick's words need this much room */
const TICK_GAP_PX = 60;
/** a label's width, estimated from its words at 13.5px (the name semibold, "{n}d" italic) */
const labelWidth = (who: string | null, days: number) => Math.round((who ? who.length * 7.6 + 4 : 0) + String(days).length * 6.8 + 8);

/** what is lit: a pile (its group's rows), or one task (its row and its disc) */
export type RunLight = { src: "pile"; id: string; keys: ReadonlySet<string> } | { src: "task"; key: string; group: string; keys: ReadonlySet<string> } | null;

export interface RunThroughProps {
  now: Date;
  userFirst: string;
  all: readonly WsTask[];
  /** the category sections the tray draws (wsSections(all, "category")) */
  sections: readonly { id: string; tasks: WsTask[] }[];
  /** the first task in the tray's order (Start opens it) */
  first: WsTask | null;
  /** the row's own glyph, as the tray draws it, with `cls` added to its `.tws-av` */
  glyph: (t: WsTask, cls: string) => React.ReactNode;
  onOpen: (key: string) => void;
  lit: RunLight;
  onLight: (l: RunLight) => void;
}

const pileKeys = (p: Pile) => new Set(p.tasks.map((t) => t.key));

export const WsRunThrough: React.FC<RunThroughProps> = ({ now, userFirst, all, sections, first, glyph, onOpen, lit, onLight }) => {
  const piles = runPiles(sections);
  const lead = piles[0]?.tasks[0] ?? null;
  const leadStage = lead ? wsStage(lead) : null;
  const points = linePoints(all, now.getTime());
  /* the line's own width, measured (never the viewport's) */
  const lineRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el) return undefined;
    const put = () => setW(el.clientWidth);
    put();
    const ro = new ResizeObserver(put);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const axis = lineAxis(points);
  /* the axis runs 14px in from each side; a disc's centre is placed by its days along it */
  const PAD = 14;
  const xOf = (d: number) => PAD + (w > 2 * PAD ? (d / axis.max) * (w - 2 * PAD) : 0);
  const placed = points.map((p) => ({ ...p, x: xOf(p.days) }));
  const { labelled, bracket } = lineLabels(placed, (p) => labelWidth(agentFirst(p.task), p.days));
  /* a tick every 30 days; its words only where they have room (every k-th tick, k the smallest that leaves 60px) */
  const tickPx = axis.ticks.length > 1 ? xOf(30) - xOf(0) : Infinity;
  const tickEvery = Math.max(1, Math.ceil(TICK_GAP_PX / Math.max(1, tickPx)));
  const isLit = (key: string) => !!lit && lit.src === "task" && lit.key === key;
  const lightTask = (t: WsTask) => onLight({ src: "task", key: t.key, group: t.group, keys: new Set([t.key]) });
  const off = () => onLight(null);

  return (
    <div className="twa-run" data-twa="run">
      <div className="twa-head" data-twa="head"><h2 className="twa-h">Where to start</h2><em data-twa="date">{longDay(now)}</em></div>
      <div className="twa-top">
        <div className="tws-mnote twa-mnote" data-tws="hawk" data-twa="hawk" data-tws58-stage={leadStage ?? undefined} style={stageVars(leadStage, lead?.query?.status) as React.CSSProperties | undefined}>
          <img src={MENTOR} alt="" /><p data-twa="say">{hawkLine(piles, userFirst, now)}</p>
        </div>
        <div className="twa-go">
          <small className="twa-or">or choose any task from the list</small>
          {first ? <button type="button" className="tws-go" data-twa="start" onClick={() => onOpen(first.key)}>{startLabel(first)} {ARROW}</button> : null}
        </div>
      </div>

      <div className="twa-piles" data-twa="piles" data-n={piles.length}>
        {piles.map((p) => {
          const more = p.tasks.length - PILE_DISCS;
          return (
            <button key={p.id} type="button" className="twa-pile" data-twa-pile={p.id} data-quiet={p.quiet ? "" : undefined}
              data-lit={lit?.src === "pile" && lit.id === p.id ? "" : undefined}
              onClick={() => { if (p.tasks[0]) onOpen(p.tasks[0].key); }}
              onMouseEnter={() => onLight({ src: "pile", id: p.id, keys: pileKeys(p) })} onMouseLeave={off}
              onFocus={() => onLight({ src: "pile", id: p.id, keys: pileKeys(p) })} onBlur={off}>
              <span className="twa-big" data-twa="count">{p.tasks.length}</span>
              <b className="twa-pt">{p.name}</b>
              <span className="twa-sub">{p.sub}</span>
              <span className="twa-discs" aria-hidden="true">
                {p.tasks.slice(0, PILE_DISCS).map((t) => <React.Fragment key={t.key}>{glyph(t, "twa-av")}</React.Fragment>)}
                {more > 0 ? <span className="twa-more">and {more} more</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      {points.length ? (
        <div className="twa-line" data-twa="line">
          <h3 className="twa-lh">How long each has been on your list<span>Agents waiting and nudges. Further right is older.</span></h3>
          <div className="twa-track" ref={lineRef}>
            <span className="twa-axis" aria-hidden="true" />
            {axis.ticks.map((d, i) => (
              <React.Fragment key={d}>
                <span className="twa-tmark" style={{ left: xOf(d) }} aria-hidden="true" />
                {i % tickEvery === 0 ? <span className="twa-tick" style={{ left: xOf(d) }} aria-hidden="true">{d === 0 ? "Today" : `${d} days`}</span> : null}
              </React.Fragment>
            ))}
            {bracket ? (
              <span className="twa-brk" data-twa="bracket" style={{ left: bracket.from - 16, width: bracket.to - bracket.from + 32 }} aria-hidden="true"><span>Waiting on you for pages</span></span>
            ) : null}
            {w > 0 ? placed.map((p) => {
              const who = agentFirst(p.task);
              return (
                <React.Fragment key={p.task.key}>
                  {labelled.has(p.task.key) ? (
                    <span className="twa-lab" style={{ left: p.x }} aria-hidden="true">{who ? <b>{who}</b> : null}{who ? " " : null}<i>{p.days}d</i></span>
                  ) : null}
                  <button type="button" className="twa-dot" data-twa-dot={p.task.key} data-lit={isLit(p.task.key) ? "" : undefined} style={{ left: p.x }}
                    title={`${p.task.title}, ${p.days} ${p.days === 1 ? "day" : "days"}`} aria-label={`${p.task.title}, ${p.days} ${p.days === 1 ? "day" : "days"}`}
                    onClick={() => onOpen(p.task.key)} onMouseEnter={() => lightTask(p.task)} onMouseLeave={off} onFocus={() => lightTask(p.task)} onBlur={off}>
                    {glyph(p.task, "twa-av")}
                  </button>
                </React.Fragment>
              );
            }) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
