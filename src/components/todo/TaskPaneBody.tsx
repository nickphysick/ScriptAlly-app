/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskPaneBody — the pane's send form, as a LEDGER OF FIXED ROWS (workspace round, Phase 3; ref
 * `design-refs/todo-actionbar-corrected.html` and `todo-workspace-final.html`).
 *
 * ⚠️ ONE QUESTION AT A TIME, AND THE ROW NEVER MOVES. Each required answer owns a 40px row whether
 * it is open, unanswered or answered — open, the control sits beneath it; answered and closed, the
 * answer sits at the row's right-hand end with a sage tick and a muted `Edit`. So the form's height
 * changes only by the height of the OPEN question's body, and the ledger above it is stable to read
 * and to click. What this replaces is a stack of `.sect`s all open at once, where four questions
 * competed for attention and the answers were only visible as lit pills.
 *
 * ⚠️ THE ROWS ARE THE GATE'S OWN DECLARATION, RENDERED. `questions` is `requirementsFor(kind)` with
 * each row's `answered` taken from the same predicate the gate refuses on — so the chip's count,
 * the missing line's names, the open row and the ledger are five readings of ONE array rather than
 * five derivations that can drift. A question the gate can require is a question the form asks, by
 * construction: there is no second table saying which sections to draw.
 *
 * ⚠️ THE STEER SQUARE IS THE OPEN ROW'S. Disclosure and steer were two mechanisms pointing at the
 * same thing — a `.sect.next` pseudo-element beside a form where everything was visible — and they
 * are one now: the row that is open IS the one you are up to.
 *
 * ⚠️ THE FIELDS REPORT UPWARD; THEY DO NOT WRITE, AND THEY DO NOT OWN WHICH ROW IS OPEN. The pane's
 * primary is the one completion path, and the session owns `openId` because the GATE has to be able
 * to open a row: pressing an incomplete primary opens the first unanswered question. A body that
 * held that state would need the gate to reach into it.
 *
 * ⚠️ THE PARCEL'S CONTROL IS `SampleSpecPicker`, MOUNTED DIRECTLY — not a copy of it. It already
 * owns the sample's vocabulary, its physics and its encoding; what it did not have was a way to say
 * "one parcel, one measure", and that is `mode="sent"`. It is also the reason the parcel row is the
 * one that does not auto-advance: see `onAnswered`.
 */
import React from "react";
import { SampleSpecPicker } from "../materials/SampleSpecPicker";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { formatSampleSpecs, type MaterialRow } from "../../lib/agentMaterials";
import type { ReqField } from "../../lib/paneGate";
import type { DelayOption } from "../../lib/journeys";

/**
 * ⚠️ EVERY CHOICE IS A UNION WITH `null` FOR UNCHOSEN, AND `null` IS NEVER A DEFAULT (finishing
 * round, Phase 3).
 *
 * These were plain values seeded on open — When "Today", the window from the agent's record, the
 * reminder a week before. Each looked like an answer the writer had given, and none of them was:
 * the strip read "today · reply expected ~15 Oct · nudge 8 Oct" before anybody had touched the
 * form, and pressing the primary would have recorded three facts nobody stated.
 *
 * ⚠️ AND "No reminder" IS A CHOICE, NOT AN ABSENCE. It is `{ kind: "none" }`, distinct from the
 * `null` that means the question is unanswered — which is exactly the distinction a single
 * `number | null` could not carry, and the reason these are unions rather than nullable numbers.
 */
export type DayChoice =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "date"; ymd: string };
export type ExpectChoice =
  | { kind: "weeks"; weeks: number }
  | { kind: "date"; ymd: string };
export type RemindChoice =
  | { kind: "lead"; days: number }
  /**
   * ⚠️ A REMINDER CAN BE A DATE, AND THE UNION HAD NO MEMBER FOR IT (deed round, Phase 4). "A custom
   * date…" mapped to `{ kind: "lead", days: 14 }` — so it selected, revealed nothing, and SILENTLY
   * INVENTED A FORTNIGHT the writer never picked. Not a missing control: a fabricated answer, in
   * the one place this app's premise is that the record is true.
   */
  | { kind: "date"; ymd: string }
  | { kind: "none" };

/**
 * ⚠️ ONE SHAPE FOR EVERY "WHEN SHOULD THIS COME BACK" ANSWER (journey round, Phase 1). The fork adds
 * three questions that are the same question in three registers — *hold me to when?*, *if nothing
 * comes back…*, *ask you again…* — and each offers presets, a date, and (where the contract offers
 * it) an explicit end to the asking.
 *
 * ⚠️ `never` IS A MEMBER BECAUSE IT IS AN ANSWER. "Don’t ask again" and "Stop asking about this one"
 * are choices the writer makes, not absences — the same law `RemindChoice` was extended under after
 * "A custom date…" was mapped onto an invented fortnight. Whether a flow OFFERS it is the options
 * table's business; whether the type can express it is this file's.
 */
export type DelayChoice =
  | { kind: "days"; days: number }
  | { kind: "date"; ymd: string }
  | { kind: "never" };

export interface SendBodyValues {
  /**
   * ⚠️ THE SAMPLE ROWS, IN THE ONE SHAPE THE APP ALREADY STORES. `MaterialRow[]` is what
   * `SampleSpecPicker` reads and writes and what `materialsWantedFromRows` encodes, so what the
   * writer picks and what is recorded cannot come to mean different things.
   */
  rows: MaterialRow[];
  /** "Anything else going with it? e.g. author bio" — the writer's own words, verbatim */
  alongside: string;
  /** the day it went — `null` until the writer says */
  when: DayChoice | null;
  /** when a reply is expected — a window, or an explicit date. `null` until chosen. */
  expect: ExpectChoice | null;
  /** the nudge reminder — a lead, or the explicit choice of none. `null` until chosen. */
  remind: RemindChoice | null;
  /** the free text under "Anything else?" */
  also: string;
  /* ── the fork's three, `null` until the writer says (journey round, Phase 1) ─────────────── */
  /** the delay intents' day — Send's *hold me to it*, Nudge's *give it longer*, Note's *give it a date* */
  hold: DelayChoice | null;
  /** the nudge's next clock — *if nothing comes back…* */
  checkin: DelayChoice | null;
  /** the close's *ask you again…*, whose `never` is the per-query mute */
  again: DelayChoice | null;
}

/** the contract's four windows, in its order */
export const EXPECT_WEEKS = [4, 6, 8, 12] as const;

/** the contract's three When options, in its order */
export const DAY_OPTIONS: { label: string; make: () => DayChoice | "picker" }[] = [
  { label: "Today", make: () => ({ kind: "today" }) },
  { label: "Yesterday", make: () => ({ kind: "yesterday" }) },
  { label: "Another date…", make: () => "picker" },
];

/**
 * ⚠️ THE REMINDER IS EXPRESSED AS A LEAD, NOT A DATE. "The week before" has to keep meaning the
 * week before even when the expected reply moves, so what is stored on the form is the OFFSET and
 * the date is derived from it — the same reason `surfaceOffset` is a lead rather than a stamp.
 */
export const REMIND_OPTIONS: { label: string; make: () => RemindChoice | "picker" }[] = [
  { label: "On the day", make: () => ({ kind: "lead", days: 0 }) },
  { label: "The week before", make: () => ({ kind: "lead", days: 7 }) },
  { label: "A custom date…", make: () => "picker" },
  { label: "No reminder", make: () => ({ kind: "none" }) },
];

/** is this option the one currently chosen? — read from the value, never from a second state */
export const dayIsOn = (v: DayChoice | null, label: string): boolean =>
  !!v && ((v.kind === "today" && label === "Today")
       || (v.kind === "yesterday" && label === "Yesterday")
       || (v.kind === "date" && label === "Another date…"));
export const remindIsOn = (v: RemindChoice | null, label: string): boolean =>
  !!v && ((v.kind === "none" && label === "No reminder")
       || (v.kind === "lead" && v.days === 0 && label === "On the day")
       || (v.kind === "lead" && v.days === 7 && label === "The week before")
       /* the custom option is the DATE member now — it was a lead with an invented number */
       || (v.kind === "date" && label === "A custom date…"));

/**
 * One row of the ledger. Built by the session from `requirementsFor(kind)` and the gate's own
 * answers — never assembled here, so the form cannot ask a question the gate does not know about
 * or skip one it does.
 */
export interface PaneQuestion {
  /** the requirement's DOM anchor — `s-unit`, `s-when`, … (bare; this mount prefixes it) */
  id: string;
  /** the field key, so the control is chosen by the declaration rather than by row position */
  field: ReqField;
  /** the ledger's own heading, from the declaration */
  label: string;
  /** answered? — the GATE's predicate, never a second reading of the same values */
  answered: boolean;
  /**
   * ⚠️ THE ANSWER WHERE THE FORM CANNOT DERIVE IT FROM ITS OWN VALUES — today exactly one case, and
   * it was a blank row on the page until a screenshot showed it (workspace round).
   *
   * A FULL MANUSCRIPT has no unit to pick, so the gate counts the parcel as answered by the
   * MATERIAL itself and the picker holds nothing to format. The row therefore read "WHAT YOU SENT"
   * with no answer, no tick and no Edit — a question stating itself and nothing else, which is
   * worse than either an open control or an absent row. What was sent is a fact about the CARD, so
   * the session supplies it and the body renders it like any other answer.
   */
  answer?: string;
  /**
   * ⚠️ A DELAY QUESTION'S OWN OPTIONS, FROM ITS FLOW. "Hold me to when?" offers tomorrow and "ask
   * you again…" offers three months — the same FIELD in different registers, so the options belong
   * to the flow rather than to this component. A delay row with none would draw a question with
   * nothing under it, which is why `journeys.test.ts` refuses one.
   */
  delays?: DelayOption[];
  /** the hint under this question, where its flow declares one */
  hint?: string;
}

export interface TaskPaneBodyProps {
  value: SendBodyValues;
  onChange: (v: SendBodyValues) => void;
  /**
   * ⚠️ SHOWN, NEVER CHOSEN (Phase 3, finishing round). The agency's own stated window is the best
   * information on record and the worst possible default: pre-selecting it would put the agency's
   * answer in the writer's mouth, and the strip would then record it as something they said. It
   * renders as a quiet line under the pills instead — there to be agreed with, or not.
   */
  statedWeeks?: number | null;
  /**
   * ⚠️ A NOTE'S OWN WORDS, AS THE CENTREPIECE (finishing round, Phase 5). Present only on the note
   * journey, and a note requires nothing — so it has no ledger at all, which is the same statement
   * made twice from one place rather than a second branch.
   */
  note?: { text: string; added: string };
  /** the ledger's rows, in the declaration's own order */
  questions?: PaneQuestion[];
  /** which row is open — the session's, because the gate has to be able to change it */
  openId?: string | null;
  /** open a row: `Edit`, a click on a closed row's head, or the gate pointing at what is missing */
  onOpen?: (id: string) => void;
  /**
   * ⚠️ "THE WRITER HAS FINISHED THIS ROW", WHICH IS NOT THE SAME EVENT AS "THIS ROW IS NOW
   * ANSWERED" — and the difference is the whole reason this is a callback rather than an effect.
   *
   * A pill click is one act and completes its question, so it advances. The PARCEL is two acts —
   * which unit, and how many — and `SampleSpecPicker` seeds a default amount and puts the caret in
   * it the moment a unit is chosen, so advancing there would close the row under a caret the
   * control had just placed. The unit row therefore does NOT auto-advance; the writer moves on by
   * clicking the next row, which every closed row accepts. Stated as a decision, not an omission.
   */
  onAnswered?: () => void;
  /**
   * ⚠️ A PREFIX FOR THIS MOUNT'S ROW IDS, defaulting to `""` so `/todo` is byte-identical
   * (tasks-workflow, Pack B Phase 1).
   *
   * Every workspace page in this app stays MOUNTED, so the moment a second surface renders this
   * component the document holds two `id="s-unit"`, two `id="s-when"`, and so on. Two things break,
   * and the first looks like a feature bug rather than an HTML one:
   * `document.querySelector('.tpn #s-unit')` returns the FIRST match, so a "jump to the missing
   * answer" reaches a pane the writer cannot see; and duplicate ids make any `aria-labelledby` or
   * label-`for` resolving by id ambiguous. Scoping the query to a ref fixes the first and NOT the
   * second — only unique ids fix the second.
   *
   * ⚠️ IT PREFIXES THE RENDERED ATTRIBUTE ONLY. `openId` and `paneGate`'s `REQ` table keep the BARE
   * names, so the comparison below and `anchorFor` are untouched — one vocabulary for what a row
   * IS, and a per-mount name for where it lives in the document.
   */
  idPrefix?: string;
  /**
   * ⚠️ THE CLOSE JOURNEY'S REASSURANCE, ON THE ROW WHERE IT IS READ (workspace round, Phase 4). It
   * was the form's sub-line — "Closing records no response — not a rejection…" — above a question
   * the reader had not reached yet. It reassures about the ACT of closing, and the row where the
   * writer dates that act is where they are deciding whether to go through with it. Nothing else
   * supplies one today; the prop exists because the sentence belongs to the JOURNEY and the row
   * belongs to the form, and neither can state the other's business.
   */
  whenHint?: React.ReactNode;
  /**
   * ⚠️ WHICH OPTIONAL FIELDS THE WRITER HAS OPENED. Held by the SESSION rather than here, for the
   * same reason `openId` is: it has to reset when the card does. A disclosure flag left behind on a
   * card change would show an empty box on the next task with no explanation of where it came from.
   */
  extras?: { alongside: boolean; also: boolean };
  onOpenExtra?: (which: "alongside" | "also") => void;
  /**
   * ⚠️ WHICH OPTIONAL FIELDS THIS FLOW OFFERS — from the declaration, and `[]` while the fork is
   * showing (journey round, Phase 3, found in the first screenshot).
   *
   * The links rendered off the body's own reasoning, so `+ Add a note for your file` sat under the
   * fork before the writer had said what they wanted to do — offering to annotate a decision not
   * yet made. And `JourneyFlow.links` was declared and read by nothing, which is the reachability
   * trap this repo has a standing note about: a field nobody reads is a field that drifts.
   */
  offers?: ("alongside" | "also")[];
  /** the free-plan `.upsell`; omitted for Pro */
  upsell?: React.ReactNode;
}

/** today as YYYY-MM-DD, local — the picker's own vocabulary */
const todayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "12 August" — a date in the ledger's own register, which is prose rather than a stamp */
const longDay = (ymd: string): string =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

/**
 * ⚠️ THE ANSWER, IN THE WORDS THE WRITER CHOSE IT BY. Every one of these reads the option tables
 * above rather than restating a label, so the pill that is lit and the answer in the row cannot
 * come to say different things. A date is the exception and reads as a date, because "Another
 * date…" is the name of a control and not the name of an answer.
 */
/** which of `SendBodyValues`' three delay slots a field reads — one map, so nothing guesses */
const DELAY_SLOT: Partial<Record<ReqField, "hold" | "checkin" | "again">> =
  { holdday: "hold", checkin: "checkin", again: "again" };

function answerText(field: ReqField, v: SendBodyValues, delays?: DelayOption[]): string | null {
  const slot = DELAY_SLOT[field];
  if (slot) {
    const d = v[slot];
    if (!d) return null;
    if (d.kind === "date") return d.ymd ? longDay(d.ymd) : null;
    /* ⚠️ THE OPTION'S OWN LABEL, READ BACK. The answer the writer sees is the words they pressed;
       deriving "in 14 days" from the stored number would be the app's arithmetic wearing their
       answer's clothes — the fault the strip's `leadPhrase` was retired for. Matched against the
       FLOW's own options, so a flow that renames an option renames its answer with it. */
    const hit = (delays ?? []).find((o) =>
      d.kind === "never" ? o.kind === "never" : o.kind === "days" && o.days === d.days);
    return hit?.label ?? null;
  }
  if (field === "unit") return formatSampleSpecs(v.rows, "and");
  if (field === "when") {
    if (!v.when) return null;
    if (v.when.kind === "date") return v.when.ymd ? longDay(v.when.ymd) : null;
    return DAY_OPTIONS.find((o) => dayIsOn(v.when, o.label))?.label ?? null;
  }
  if (field === "expect") {
    if (!v.expect) return null;
    if (v.expect.kind === "date") return v.expect.ymd ? longDay(v.expect.ymd) : null;
    return `${v.expect.weeks} weeks`;
  }
  if (field === "remind") {
    if (!v.remind) return null;
    if (v.remind.kind === "date") return v.remind.ymd ? longDay(v.remind.ymd) : null;
    return REMIND_OPTIONS.find((o) => remindIsOn(v.remind, o.label))?.label ?? null;
  }
  return null;
}

export const TaskPaneBody: React.FC<TaskPaneBodyProps> = ({
  value, onChange, note, statedWeeks, questions = [], openId = null, onOpen, onAnswered,
  idPrefix = "", whenHint, extras = { alongside: false, also: false }, onOpenExtra,
  offers = ["alongside", "also"], upsell,
}) => {
  /* ⚠️ THE DOM NAME, WHICH IS NOT THE ROW'S NAME. `openId` carries the BARE id, because that is
     what `paneGate` emits; this is only what the attribute says. Default `""` makes it the identity
     function, so `/todo` renders exactly the ids it has always rendered. */
  const domId = (id: string) => `${idPrefix}${id}`;
  /* ⚠️ "ANYTHING ELSE GOING WITH IT" IS OFFERED ONLY WHERE THERE IS AN IT. It is about the parcel,
     so a journey that records no parcel has nothing for it to go alongside — the same absence rule
     the ledger's own rows follow, read off the same declaration. */
  const offersAlongside = offers.includes("alongside") && questions.some((q) => q.field === "unit");
  const offersAlso = offers.includes("also");

  /**
   * ⚠️ ONE CONTROL FOR ALL THREE DELAY QUESTIONS (journey round, Phase 3). *Hold me to when?*, *if
   * nothing comes back…* and *ask you again…* are the same question in three registers, so they get
   * the same control and differ only by the options their FLOW declares. Three near-identical
   * blocks here is how they would come to behave differently.
   */
  const delayControl = (q: PaneQuestion): React.ReactNode => {
    const slot = DELAY_SLOT[q.field]!;
    const v = value[slot];
    const on = (o: DelayOption) =>
      !!v && (o.kind === "date" ? v.kind === "date"
            : o.kind === "never" ? v.kind === "never"
            : v.kind === "days" && v.days === o.days);
    return (
      <>
        <div className="seg">
          {(q.delays ?? []).map((o) => (
            <button type="button" key={o.id} className={on(o) ? "on" : undefined}
              onClick={() => {
                /* ⚠️ THE PICKER OPENS EMPTY AND AN EMPTY DATE IS NOT AN ANSWER — the gate checks the
                   date's presence, not the pill's selection. Seeding one here is the fault the
                   finishing round removed from the reminder. */
                const next: DelayChoice =
                  o.kind === "date" ? { kind: "date", ymd: "" }
                  : o.kind === "never" ? { kind: "never" }
                  : { kind: "days", days: o.days };
                onChange({ ...value, [slot]: next });
                if (o.kind !== "date") onAnswered?.();
              }}>{o.label}</button>
          ))}
        </div>
        {v?.kind === "date" && (
          <div style={{ marginTop: 8 }}>
            {/* the app's own picker — a second date control would be a second place a date comes from */}
            <BrandDatePicker value={v.ymd} placeholder="Pick the day"
              min={todayYmd()}
              onChange={(ymd) => { onChange({ ...value, [slot]: { kind: "date", ymd } }); if (ymd) onAnswered?.(); }} />
          </div>
        )}
        {q.hint && <div className="hint">{q.hint}</div>}
      </>
    );
  };

  /** the control a row opens onto — chosen by the declaration's field, never by row position */
  const control = (field: ReqField): React.ReactNode => {
    if (field === "unit") return (
      <>
        <SampleSpecPicker
          rows={value.rows}
          onChange={(rows) => onChange({ ...value, rows })}
          /* ⚠️ "and", NOT "or". A requirement offers a choice; a record describes one parcel. */
          join="and"
          mode="sent"
          idPrefix="tpn-sent"
        />
        <div className="hint">Pick the unit you actually sent in — one only.</div>
      </>
    );
    if (field === "when") return (
      <>
        <div className="seg">
          {DAY_OPTIONS.map((o) => (
            <button type="button" key={o.label}
              className={dayIsOn(value.when, o.label) ? "on" : undefined}
              onClick={() => {
                const made = o.make();
                onChange({ ...value, when: made === "picker" ? { kind: "date", ymd: "" } : made });
                /* ⚠️ THE PICKER IS NOT AN ANSWER YET — it reveals a field, so advancing here would
                   skip past a question the gate still counts as unanswered. */
                if (made !== "picker") onAnswered?.();
              }}>{o.label}</button>
          ))}
        </div>
        {/* ⚠️ THE PICKER IS THE APP'S OWN, and expect-back opens the SAME one — the brief's rule,
            and the reason a second date control would be wrong is that two pickers on one form is
            two places for a date to come from. */}
        {value.when?.kind === "date" && (
          <div style={{ marginTop: 8 }}>
            <BrandDatePicker value={value.when.ymd} placeholder="Pick the day it went"
              max={todayYmd()}
              onChange={(ymd) => { onChange({ ...value, when: { kind: "date", ymd } }); if (ymd) onAnswered?.(); }} />
          </div>
        )}
        {whenHint && <div className="hint">{whenHint}</div>}
      </>
    );
    if (field === "expect") return (
      <>
        <div className="seg">
          {EXPECT_WEEKS.map((w) => (
            <button type="button" key={w}
              className={value.expect?.kind === "weeks" && value.expect.weeks === w ? "on" : undefined}
              onClick={() => { onChange({ ...value, expect: { kind: "weeks", weeks: w } }); onAnswered?.(); }}>{w} weeks</button>
          ))}
          <button type="button"
            className={value.expect?.kind === "date" ? "on" : undefined}
            onClick={() => onChange({ ...value, expect: { kind: "date", ymd: "" } })}>Another date…</button>
        </div>
        {value.expect?.kind === "date" && (
          <div style={{ marginTop: 8 }}>
            <BrandDatePicker value={value.expect.ymd} placeholder="Pick when you expect to hear"
              min={todayYmd()}
              onChange={(ymd) => { onChange({ ...value, expect: { kind: "date", ymd } }); if (ymd) onAnswered?.(); }} />
          </div>
        )}
        {/* ⚠️ THE AGENCY'S OWN FIGURE, STATED AND NOT CHOSEN. Absent where the record holds none —
            a line reading "Their stated window is —" would be the app talking about its own gap. */}
        {typeof statedWeeks === "number" && statedWeeks > 0 && (
          <div className="hint">Their stated window is {statedWeeks} weeks.</div>
        )}
      </>
    );
    if (field === "remind") return (
      <>
        <div className="seg">
          {REMIND_OPTIONS.map((o) => (
            <button type="button" key={o.label}
              className={remindIsOn(value.remind, o.label) ? "on" : undefined}
              onClick={() => {
                const made = o.make();
                /* ⚠️ THE PICKER OPENS EMPTY, and an empty date is NOT an answer — the gate checks
                   the date's presence, not the pill's selection. Seeding a number here is exactly
                   what the finishing round removed. */
                onChange({ ...value, remind: made === "picker" ? { kind: "date", ymd: "" } : made });
                if (made !== "picker") onAnswered?.();
              }}>{o.label}</button>
          ))}
        </div>
        {/* ⚠️ THE SAME COMPONENT AND THE SAME REVEAL PATH AS `When` — not a second date field. The
            reminder row had none at all, which is why the option selected and showed nothing. */}
        {value.remind?.kind === "date" && (
          <div style={{ marginTop: 8 }}>
            <BrandDatePicker value={value.remind.ymd} placeholder="Pick the day to be reminded"
              onChange={(ymd) => { onChange({ ...value, remind: { kind: "date", ymd } }); if (ymd) onAnswered?.(); }} />
          </div>
        )}
        {/* ⚠️ AND IT SAYS WHERE THE REMINDER GOES. The contract's own line, and it is the honest
            one: this app has no notification delivery of any kind, so a reminder that implied a
            push or an email would be promising something nothing sends. It lands on this list. */}
        <div className="hint">The reminder lands here, on your list, when the time comes.</div>
      </>
    );
    return null;
  };

  return (
  <>
    {/* ⚠️ THE WRITER'S OWN SENTENCE, AT READING SIZE. It was a label above a form; it is the thing
        the pane is about, so it is the first thing in it and it is set in the hand the list writes
        notes in. The meta line beneath carries the date and the one sentence about finishing —
        ONCE, in the pane, total: it used to appear here AND in the band's sub-line. */}
    {note && (
      <>
        <div className="notebody">{note.text}</div>
        <div className="notemeta">Added {note.added} · ticking it off is what finishes it</div>
      </>
    )}

    {questions.map((q) => {
      const open = q.id === openId;
      /* the row's own answer where the form holds one; the card's where it does not */
      const ans = q.answered ? (answerText(q.field, value, q.delays) ?? q.answer ?? null) : null;
      /* ⚠️ EVERY CLOSED ROW OPENS ON A CLICK, ANSWERED OR NOT. `Edit` is the visible cue on an
         answered one; an UNANSWERED closed row has no cue and still has to be reachable, because
         editing an earlier answer closes a later unanswered row behind it. One target, not two
         controls — which is why `Edit` is a span inside the head rather than a button beside it. */
      const openable = !open;
      return (
        <div className={`q${open ? " open" : ""}${q.answered ? " done" : ""}`} id={domId(q.id)} key={q.id}>
          <div
            className="head"
            {...(openable
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  onClick: () => onOpen?.(q.id),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(q.id); }
                  },
                }
              : {})}
          >
            {/* the steer square — the contract's own node, shown by `.q.open` and nothing else */}
            <span className="sqm" aria-hidden />
            <span className="ql" data-req={q.field}>{q.label}</span>
            {ans && !open && (
              <span className="ans">
                {ans}
                <span className="tick" aria-hidden>✓</span>
                <span className="edit">Edit</span>
              </span>
            )}
          </div>
          {/* ⚠️ RENDERED ONLY WHEN OPEN, not hidden with `display: none`. A hidden control is still
              in the tab order and still in the document, so "at rest this form holds no textarea"
              would be a claim about paint rather than about the page. */}
          {open && (
            <div className="body">
              {DELAY_SLOT[q.field] ? delayControl(q) : control(q.field)}
            </div>
          )}
        </div>
      );
    })}

    {/* ⚠️ THE OPTIONAL FIELDS ARE LINKS UNTIL THEY ARE ASKED FOR (workspace round, Phase 4). They
        were two boxes standing open under every journey, so a form of four questions presented six
        things to fill in and two of them were empty by design. A link states that something MAY go
        here; an empty box states that something SHOULD.

        ⚠️ AND THE `OPTIONAL` TAG GOES WITH THE FIELD, not with the link. It answers "must I?" about
        a control that is on screen; beside a link that nobody has opened it answers a question
        nobody asked. At rest this form holds no textarea and no tag at all. */}
    {((offersAlongside && !extras.alongside) || (offersAlso && !extras.also)) && (
      <div className="addrow">
        {offersAlongside && !extras.alongside && (
          <button type="button" className="addlink" onClick={() => onOpenExtra?.("alongside")}>
            + Anything else going with it
          </button>
        )}
        {offersAlso && !extras.also && (
          <button type="button" className="addlink" onClick={() => onOpenExtra?.("also")}>
            + Add a note for your file
          </button>
        )}
      </div>
    )}

    {offersAlongside && extras.alongside && (
      <div className="sect">
        <label className="f-lbl" htmlFor={domId("s-alongside")}>Anything else going with it? <span className="opttag">OPTIONAL</span></label>
        <input
          id={domId("s-alongside")}
          className="txt"
          placeholder="e.g. author bio"
          autoFocus
          value={value.alongside}
          onChange={(e) => onChange({ ...value, alongside: e.target.value })}
        />
      </div>
    )}

    {offersAlso && extras.also && (
      <div className="sect">
        <label className="f-lbl" htmlFor={domId("s-also")}>A note for your file <span className="opttag">OPTIONAL</span></label>
        <textarea id={domId("s-also")} className="note-in" autoFocus
          placeholder="Add any further details you want to keep on file"
          value={value.also} onChange={(e) => onChange({ ...value, also: e.target.value })} />
      </div>
    )}

    {upsell && <div className="upsell">{upsell}</div>}
  </>
  );
};
