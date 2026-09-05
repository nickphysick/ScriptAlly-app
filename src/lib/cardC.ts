/**
 * ══ CARD C — THE CLICK CARD'S MODEL (v65 §C; ref hover-card-by-type.html) ══════════════════════
 *
 * One card everywhere — band, name, fact, a gauge, three counters, the last note, the action —
 * with the GAUGE'S TWO ENDS and the THREE COUNTERS chosen per bar type. Nothing is invented:
 * every number is one the pages already show, and a number the data cannot state is a DASH,
 * never a guess (the ref's own rule 3).
 *
 * ⚠️ PURE, AND IN DAY-FLOATS. The page resolves dates to labels ("sent 26 Aug") and hands the
 * arithmetic down as day offsets — the same numbers the bars are painted from, so the gauge and
 * the bar cannot disagree about where today is.
 *
 * ⚠️ THE GAUGE'S TWO REGIMES (the ref's rule 2, plus its own two drawn cases): a MODEST overrun
 * (today past the end by ≤ a quarter of the window) keeps the track as start → end and OVERHANGS
 * in rose; a LONG one (the silences) rescales the track to start → today and fills sand past the
 * expected mark — the ref draws exactly these two (`left:100%;width:8%` and `left:22%;width:78%`).
 * No end date: the bar is simply the elapsed time, today at its tip. A finished stage has no
 * today marker at all.
 */

export type CardKind =
  | "waiting" | "passed" | "moveDated" | "moveUndated"
  | "offer" | "quiet" | "ghost" | "task" | "closed";

export interface CardCFacts {
  kind: CardKind;
  /** day-floats on the board's own scale — only differences are read */
  start: number;
  end: number | null;
  today: number;
  /** the page-resolved end labels; the builder decorates, never invents */
  startLab: string;
  endLab: string;
  /** counter context — `null` renders a dash, never a guess */
  eyebrowDays: number;
  nudges: number | null;
  totalDays: number | null;
  windowDays?: number | null;
  othersToNudge?: number | null;
  stageIdx?: number;
  stageCount?: number;
  rolled?: number | null;
  daysOpen?: number | null;
  outcome?: string;
}

export interface GaugeModel {
  fillPct: number;
  overPct: number;
  /** rose for a passed date, sand for a long silence, null where nothing overruns */
  overTone: "rose" | "sand" | null;
  /** null = a finished stage — no today marker (the ref's rule 2) */
  todayPct: number | null;
  startLab: string;
  endLab: string;
  endOver: boolean;
}
export interface CounterModel { v: string; label: string; rose?: boolean }
export interface CardCModel { gauge: GaugeModel; counters: [CounterModel, CounterModel, CounterModel] }

const pct = (n: number) => Math.round(n * 1000) / 10;
const dash = (n: number | null | undefined, label: string, rose = false): CounterModel =>
  ({ v: n == null ? "—" : String(n), label, rose: rose && n != null ? true : undefined });

export function gaugeFor(f: CardCFacts): GaugeModel {
  const { start, end, today } = f;
  const base = { startLab: f.startLab, endLab: f.endLab, endOver: false };
  /* finished stages and closed rows: a full bar, no today — the past is not still running */
  if (f.kind === "ghost" || f.kind === "closed") {
    return { fillPct: 100, overPct: 0, overTone: null, todayPct: null, ...base };
  }
  if (end == null) {
    /* no end date: the bar IS the elapsed time, today at the tip; the right label says so */
    return { fillPct: 100, overPct: 0, overTone: null, todayPct: 100, ...base, endOver: true };
  }
  const span = Math.max(0.001, end - start);
  if (today <= end) {
    const fill = pct(Math.max(0, today - start) / span);
    return { fillPct: fill, overPct: 0, overTone: null, todayPct: fill, ...base };
  }
  const overRatio = (today - end) / span;
  const tone: "rose" | "sand" = f.kind === "quiet" ? "sand" : "rose";
  if (overRatio <= 0.25) {
    const over = pct(overRatio);
    return { fillPct: 100, overPct: over, overTone: tone, todayPct: 100 + over, ...base, endOver: true };
  }
  /* the long overrun rescales: track = start → today, the expected mark ends the tinted fill */
  const fill = pct(span / (today - start));
  return { fillPct: fill, overPct: 100 - fill, overTone: tone, todayPct: 100, ...base, endOver: true };
}

/** counter one is ALWAYS the eyebrow's number; two and three are the by-type table's */
export function countersFor(f: CardCFacts): [CounterModel, CounterModel, CounterModel] {
  const total = dash(f.totalDays, "days total");
  switch (f.kind) {
    case "waiting":
      return [dash(f.eyebrowDays, "days waiting"), dash(f.nudges, "nudges"), total];
    case "passed":
      return [dash(f.eyebrowDays, "days overdue", true), dash(f.nudges, "nudges"), total];
    case "moveDated":
      return [
        dash(f.eyebrowDays, f.today > (f.end ?? Infinity) ? "days overdue" : "days left", f.today > (f.end ?? Infinity)),
        dash(f.windowDays, "days you had"), total];
    case "moveUndated":
      return [dash(f.eyebrowDays, "days since request", true), { v: "—", label: "date promised" }, total];
    case "offer":
      return [dash(f.eyebrowDays, "days to decide"), dash(f.othersToNudge, "others to nudge"), total];
    case "quiet":
      /* replies is ZERO PLAINLY — a quiet row is quiet BECAUSE nothing has come back */
      return [dash(f.eyebrowDays, "days quiet"), dash(f.nudges, "nudges"), { v: "0", label: "replies" }];
    case "ghost":
      return [dash(f.eyebrowDays, "days in stage"), dash(f.nudges, "nudges"),
        { v: String(f.stageIdx ?? 1), label: `of ${f.stageCount ?? 1} stages` }];
    case "task":
      return [
        dash(f.eyebrowDays, f.today > (f.end ?? Infinity) ? "days overdue" : "days left", f.today > (f.end ?? Infinity)),
        dash(f.rolled, "rolled"), dash(f.daysOpen, "days open")];
    case "closed":
      return [total, dash(f.nudges, "nudges"), { v: f.outcome ?? "—", label: "outcome" }];
  }
}

export function cardCFor(f: CardCFacts): CardCModel {
  return { gauge: gaugeFor(f), counters: countersFor(f) };
}
