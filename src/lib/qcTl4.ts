/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.4 — THE PEEK TIMELINE AS ONE POSITIONED TRACK (design-refs/query-centre-v138-4/).
 *
 * Pure: the stops, the x of every marker, the bars, the two label lanes, the durations and the axis, from the query's
 * dated events and a width, with text measured by an injected `measure` (canvas `measureText` in the page; a stub in
 * tests). The component only renders what this returns.
 *
 * ⚠️ MARKERS SIT AT THEIR TRUE DATES and nothing but the 30px minimum spacing moves them: the space it needs is taken
 *    from the single longest gap and the track rescaled, up to four passes. Labels never affect positions.
 * ⚠️ TWO LANES, NEVER A THIRD LINE: above (bottom 16px over the track's centre) and below (top 16px under it); the
 *    drawer is a fixed 120px. Placement by priority (Today, the latest event, dates, older events newest-first), full
 *    size then name only, preferred lane then the other; an older event that does not fit folds into the nearest
 *    labelled event as "+n earlier", a date that does not fit leaves a `title` on its marker.
 * ⚠️ THE AXIS IS ON THE MARKERS' OWN SCALE: a date between two stops is placed by interpolating between their x, so a
 *    tick stays on its true date after the minimum spacing has moved the stops (the reference maps it linearly over the
 *    whole span, which drifts off the markers wherever a gap was squeezed).
 */
import { MONTHS_SHORT } from "./dates";
import { dDays, dayMonYear, gapWords, peekGlyph, peekLate, startOfDay, YOUR_MOVE_STATUSES, type GlyphKey, type PeekEvent } from "./qc138";

export const TL4 = { H: 120, TY: 58, PAD: 14, MIN: 30, LANE: 16, CLEAR: 10, END: 13, DUR: 22, AX_TICK: 7, AX_LAB: 14, AX_EDGE: 20 } as const;

/* the faces the labels are drawn in (Part D) — the measure and the stylesheet must agree. Families are TOKENS
   (`--sp-type`, `--font-mono`), resolved by the measurer at run time: the family names have one owner each
   (marketingTokens' lock), and a second spelling here would be a second place to change. */
export const TL4_FONTS = {
  name: "400 13.5px var(--sp-type)",
  date: "400 12px var(--sp-type)",
  today: "400 12px var(--sp-type)",
  over: "400 12.5px var(--sp-type)",
  note: "500 9.5px var(--font-mono)",
  dur: "400 11.5px var(--sp-type)",
  axis: "400 10.5px var(--sp-type)",
} as const;
/* letter-spacing the canvas does not apply: added per character */
const SPACING = { today: 12 * 0.08, note: 9.5 * 0.06, axis: 10.5 * 0.02 } as const;

export type Tl4Kind = "ev" | "was" | "today" | "due";
export interface Tl4Stop {
  kind: Tl4Kind;
  ms: number;
  /** an event's stage (the latest of a same-day merge that is a status); null for a nudge or holding reply */
  status: string | null;
  /** every event merged into this stop, in order; for a date stop, its one name */
  names: string[];
  glyph: GlyphKey | null;
  /** Today when overdue: "{duration} over" */
  over?: string;
}

/** the stops in date order: the events (same day merged), then Was due + Today, or Today + Reply due / Send by */
export function tl4Stops(events: readonly PeekEvent[], opts: { due: number | null; now: number; closed: boolean; yours: boolean }): Tl4Stop[] {
  const { due, now, closed, yours } = opts;
  const evs = [...events].filter((e) => Number.isFinite(e.ms)).sort((a, b) => a.ms - b.ms);
  const S: Tl4Stop[] = [];
  for (const e of evs) {
    const p = S[S.length - 1];
    if (p && p.kind === "ev" && startOfDay(p.ms) === startOfDay(e.ms)) {
      p.names.push(e.name);
      /* the stage the day ended at; a nudge changes no stage */
      if (e.status) { p.status = e.status; p.glyph = peekGlyph(e.status); }
      continue;
    }
    S.push({ kind: "ev", ms: e.ms, status: e.status ?? null, names: [e.name], glyph: peekGlyph(e.status) });
  }
  if (closed) return S;
  if (peekLate(due, now)) {
    S.push({ kind: "was", ms: due as number, status: null, names: ["Was due"], glyph: null });
    S.push({ kind: "today", ms: now, status: null, names: ["Today"], glyph: null, over: `${gapWords(dDays(due as number, now))} over` });
  } else {
    S.push({ kind: "today", ms: now, status: null, names: ["Today"], glyph: null });
    if (due != null) S.push({ kind: "due", ms: due, status: null, names: [yours ? "Send by" : "Reply due"], glyph: null });
  }
  return S;
}

export type Tl4Bar = { a: number; b: number; cls: "past" | "live" | "over" | "ahead"; court: "you" | "agt" | ""; days: number };
export type Tl4Mark = { i: number; x: number; kind: Tl4Kind; tone: "past" | "last" | ""; title?: string };
export type Tl4Label = {
  i: number; x: number; L: number; R: number; al: "l" | "c" | "r"; lane: "up" | "dn";
  name: string; date: string | null; notes: string[]; title?: string; tone: "past" | "last" | "was" | "date" | "today";
};
export type Tl4Dur = { x: number; text: string; cls: Tl4Bar["cls"]; court: Tl4Bar["court"] };
export type Tl4Axis = { ticks: number[]; labels: { x: number; text: string; yr: boolean }[] };
export interface Tl4Layout { xs: number[]; bars: Tl4Bar[]; marks: Tl4Mark[]; labels: Tl4Label[]; durs: Tl4Dur[]; axis: Tl4Axis }

export type Tl4Measure = (text: string, font: keyof typeof TL4_FONTS) => number;

/** true scale, then the 30px minimum taken from the longest gap, rescaled to fit; up to four passes */
export function tl4Xs(ms: readonly number[], width: number): number[] {
  const { PAD, MIN } = TL4;
  const IW = Math.max(1, width - 2 * PAD);
  if (ms.length === 1) return [PAD];
  const t0 = ms[0], span = Math.max(86_400_000, ms[ms.length - 1] - t0);
  let xs = ms.map((t) => PAD + ((t - t0) / span) * IW);
  for (let k = 0; k < 4; k += 1) {
    let need = 0;
    for (let i = 1; i < xs.length; i += 1) if (xs[i] - xs[i - 1] < MIN - 1e-6) need += MIN - (xs[i] - xs[i - 1]);
    if (!need) break;
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    const big = gaps.indexOf(Math.max(...gaps));
    const nx = [xs[0]];
    for (let i = 1; i < xs.length; i += 1) {
      let g = gaps[i - 1];
      if (g < MIN) g = MIN;
      if (i - 1 === big) g = Math.max(MIN, g - need);
      nx.push(nx[i - 1] + g);
    }
    const sc = IW / (nx[nx.length - 1] - nx[0]);
    xs = nx.map((x) => PAD + (x - nx[0]) * sc);
  }
  return xs;
}

/** a date's x on the markers' own scale: interpolated between the two stops either side of it */
export function tl4XAt(stopsMs: readonly number[], xs: readonly number[], t: number): number {
  if (t <= stopsMs[0]) return xs[0];
  for (let i = 1; i < stopsMs.length; i += 1) {
    if (t <= stopsMs[i]) {
      const span = stopsMs[i] - stopsMs[i - 1];
      return span > 0 ? xs[i - 1] + ((t - stopsMs[i - 1]) / span) * (xs[i] - xs[i - 1]) : xs[i];
    }
  }
  return xs[xs.length - 1];
}

export function tl4Layout(S: readonly Tl4Stop[], width: number, measure: Tl4Measure, nowMs: number): Tl4Layout {
  const { CLEAR, END, AX_EDGE } = TL4;
  const empty: Tl4Layout = { xs: [], bars: [], marks: [], labels: [], durs: [], axis: { ticks: [], labels: [] } };
  if (!S.length || width <= 0) return empty;
  const ms = S.map((s) => s.ms);
  const xs = tl4Xs(ms, width);
  const todayI = S.findIndex((s) => s.kind === "today");
  const lastEv = S.map((s) => s.kind).lastIndexOf("ev");
  const n = S.length;
  const w = (t: string, f: keyof typeof TL4_FONTS) => measure(t, f) + (f in SPACING ? SPACING[f as keyof typeof SPACING] * t.length : 0);

  /* bars: 13px clear of each marker */
  const bars: Tl4Bar[] = [];
  for (let i = 1; i < n; i += 1) {
    const a = xs[i - 1] + END, b = xs[i] - END;
    if (b <= a) continue;
    const days = dDays(S[i - 1].ms, S[i].ms);
    let cls: Tl4Bar["cls"] = "past", court: Tl4Bar["court"] = "";
    if (S[i].kind === "today" && S[i - 1].kind === "was") cls = "over";
    else if (S[i].kind === "today") { cls = "live"; court = S[i - 1].kind === "ev" && !!S[i - 1].status && YOUR_MOVE_STATUSES.includes(S[i - 1].status as string) ? "you" : "agt"; }
    else if (todayI >= 0 && i > todayI) cls = "ahead";
    bars.push({ a, b, cls, court, days });
  }

  const marks: Tl4Mark[] = S.map((s, i) => ({ i, x: xs[i], kind: s.kind, tone: s.kind === "ev" ? (i < lastEv ? "past" : "last") : "" }));

  /* labels: two lanes */
  const lanes: Record<"up" | "dn", { L: number; R: number }[]> = { up: [], dn: [] };
  const free = (lane: "up" | "dn", L: number, R: number, skip?: { L: number; R: number }) =>
    L >= 0 && R <= width && lanes[lane].every((o) => o === skip || R + CLEAR < o.L || L > o.R + CLEAR);
  type Item = { i: number; s: Tl4Stop; name: string; date: string | null; notes: string[]; tone: Tl4Label["tone"]; nameFont: keyof typeof TL4_FONTS; dateFont: keyof typeof TL4_FONTS };
  const items: Item[] = S.map((s, i) => {
    if (s.kind === "ev") {
      const same = s.names.length - 1;
      return { i, s, name: s.names[s.names.length - 1], date: dayMonYear(s.ms, nowMs), notes: same > 0 ? [`+${same} same day`] : [], tone: i < lastEv ? "past" : "last", nameFont: "name", dateFont: "date" };
    }
    if (s.kind === "was") return { i, s, name: "Was due", date: dayMonYear(s.ms, nowMs), notes: [], tone: "was", nameFont: "name", dateFont: "date" };
    if (s.kind === "due") return { i, s, name: s.names[0], date: dayMonYear(s.ms, nowMs), notes: [], tone: "date", nameFont: "name", dateFont: "date" };
    return { i, s, name: "TODAY", date: s.over ?? null, notes: [], tone: "today", nameFont: "today", dateFont: "over" };
  });
  const boxOf = (it: Item, full: boolean, notes: string[]) => {
    const wd = Math.max(w(it.name, it.nameFont), full && it.date ? w(it.date, it.dateFont) : 0, ...notes.map((t) => w(t.toUpperCase(), "note"))) + 8;
    const al: Tl4Label["al"] = it.i === 0 ? "l" : it.i === n - 1 ? "r" : "c";
    const x = xs[it.i];
    let L = al === "l" ? x - 12 : al === "r" ? x + 12 - wd : x - wd / 2;
    /* a centred label near an edge is shifted inside the timeline rather than cut off */
    L = Math.min(Math.max(L, 0), width - wd);
    return { L, R: L + wd, al };
  };
  const rank = (it: Item) => (it.tone === "today" ? 0 : it.i === lastEv ? 1 : it.s.kind !== "ev" ? 2 : 3);
  const order = [...items].sort((a, b) => rank(a) - rank(b) || b.i - a.i);
  const placed = new Map<number, Tl4Label>();
  for (const it of order) {
    const lanesFor: ("up" | "dn")[] = it.tone === "today" || it.s.kind !== "ev" ? ["up", "dn"] : ["dn", "up"];
    let done = false;
    for (const full of [true, false]) {
      const bx = boxOf(it, full, it.notes);
      for (const lane of lanesFor) {
        if (!free(lane, bx.L, bx.R)) continue;
        const box = { L: bx.L, R: bx.R };
        lanes[lane].push(box);
        placed.set(it.i, { i: it.i, x: xs[it.i], L: bx.L, R: bx.R, al: bx.al, lane, name: it.name, date: full ? it.date : null, notes: [...it.notes], title: full || !it.date ? undefined : `${it.name} ${it.date}`, tone: it.tone });
        done = true;
        break;
      }
      if (done) break;
    }
  }
  /* an older event left over folds into the nearest labelled event: "+n earlier" */
  const earlier = new Map<number, number>();
  for (const it of items) {
    if (placed.has(it.i) || it.s.kind !== "ev") continue;
    const host = items.filter((o) => placed.has(o.i) && o.s.kind === "ev").sort((a, b) => Math.abs(xs[a.i] - xs[it.i]) - Math.abs(xs[b.i] - xs[it.i]))[0];
    if (host) earlier.set(host.i, (earlier.get(host.i) ?? 0) + 1);
  }
  for (const [hi, k] of earlier) {
    const lab = placed.get(hi)!;
    lab.notes.push(`+${k} earlier`);
    /* widen the box for the note, kept inside the timeline */
    const need = Math.max(lab.R - lab.L, w(lab.notes[lab.notes.length - 1].toUpperCase(), "note") + 8);
    if (need > lab.R - lab.L) {
      const grow = need - (lab.R - lab.L);
      if (lab.al === "l") lab.R += grow; else if (lab.al === "r") lab.L -= grow; else { lab.L -= grow / 2; lab.R += grow / 2; }
      const sh = Math.min(0, width - lab.R) + Math.max(0, -lab.L);
      lab.L += sh; lab.R += sh;
    }
  }
  /* a date that could not be labelled leaves its name and date on its marker */
  for (const it of items) if (!placed.has(it.i) && it.s.kind !== "ev" && it.tone !== "today") marks[it.i].title = `${it.name} ${it.date ?? ""}`.trim();

  /* durations: centred above the bar, only where the upper lane is free above its middle */
  const durs: Tl4Dur[] = [];
  for (const bar of bars) {
    if (bar.cls === "over") continue;
    const text = gapWords(bar.days);
    const dw = w(text, "dur") + 6;
    const m = (bar.a + bar.b) / 2;
    if (bar.b - bar.a < dw + 8) continue;
    if (!free("up", m - dw / 2, m + dw / 2)) continue;
    lanes.up.push({ L: m - dw / 2, R: m + dw / 2 });
    durs.push({ x: m, text, cls: bar.cls, court: bar.court });
  }

  /* the axis: a tick at every month start; labels where the lower lane is free */
  const axis: Tl4Axis = { ticks: [], labels: [] };
  const t0 = ms[0], t1 = ms[n - 1];
  const spanDays = Math.max(1, (t1 - t0) / 86_400_000);
  const mpx = ((xs[n - 1] - xs[0]) / spanDays) * 30.4375;
  const step = mpx >= 40 ? 1 : mpx >= 14 ? 3 : mpx >= 5 ? 12 : 0;
  if (step && n > 1) {
    const d = new Date(t0); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() + 1);
    for (; d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) {
      const x = tl4XAt(ms, xs, d.getTime());
      axis.ticks.push(x);
      const m = d.getMonth(), yr = m === 0;
      if (!(yr || (step < 12 && m % step === 0))) continue;
      const text = yr ? String(d.getFullYear()) : MONTHS_SHORT[m];
      const aw = w(text, "axis") + 8;
      if (Math.abs(x - xs[0]) < AX_EDGE || Math.abs(x - xs[n - 1]) < AX_EDGE) continue;
      if (!free("dn", x - aw / 2, x + aw / 2)) continue;
      lanes.dn.push({ L: x - aw / 2, R: x + aw / 2 });
      axis.labels.push({ x, text, yr });
    }
  }
  return { xs, bars, marks, labels: [...placed.values()].sort((a, b) => a.i - b.i), durs, axis };
}
