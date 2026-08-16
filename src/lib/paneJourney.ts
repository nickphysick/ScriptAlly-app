/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneJourney — the in-pane journey's PURE model (Item 9, Phase 2; ref
 * design-refs/todo-journey-in-pane.html).
 *
 * ⚠️ THE JOURNEY RENDERS INSIDE THE CARD, AND THAT IS THE WHOLE POINT OF THE MOVE. It was a
 * full-viewport takeover mounted from `FocusFlow`; the card's body becomes the form instead, so
 * nothing overlays and nothing has to be dismissed. The band stays above it the entire time, so the
 * writer never loses who they are recording against.
 *
 * ⚠️ AND IT REMOVES THE `inert` SEAL RATHER THAN PATCHING IT. `useOverlay`'s `sealBackground()`
 * puts `inert` on `#root` on the stated premise that overlays portal to `document.body`; `FocusFlow`
 * does not portal, so the takeover sealed ITSELF and every control inside it was unreachable by
 * pointer and by keyboard — measured, `elementsFromPoint` at the primary's own centre returning
 * `[body, html]`. A journey that is not an overlay cannot have that fault.
 *
 * ⚠️ NOTHING HERE WRITES. The page already owns the send: `quickSendPayload` → `markSentWriteArgs`
 * → `recordMaterialsSent`, with `undoQueryStatus` as its inverse. This model only decides what the
 * writer has said; the same one write path performs it, so the journey and the quick ✓ cannot come
 * to record different things.
 */

/**
 * ⚠️ THE STEPS ARE DECLARED PER JOURNEY, AND THE STACKS ARE DELIBERATELY DIFFERENT LENGTHS.
 *
 * A send asks four things because a send HAS four: what went, how, when, and anything to remember.
 * A chase asks two — when you nudged and when to ask again — because that is the whole of a nudge;
 * `logNudge` takes `checkBackDate`, `eventDate` and an optional note, and has no home for a method
 * at all, so a "how it went" step would collect an answer that goes nowhere. A close asks ONE: which
 * of the three ways it ended, because that is the only thing the app does not already know.
 *
 * ⚠️ PADDING THEM TO FOUR FOR SYMMETRY WOULD BE THE WORSE PAGE. A two-step journey that asks only
 * what it needs is faster to finish and tells the truth about how much of a decision this is; a
 * filler step in the middle teaches the writer that some questions here do not matter.
 *
 * Declared as a table rather than branched in the component — the same law `paneSections` follows.
 */
export type JourneyKind = "send" | "chase" | "close" | "offer" | "note" | "fix";

/**
 * ⚠️ THE OFFER IS A BRANCH, NOT A STACK, AND FLATTENING IT WOULD BE A LIE ABOUT THE DECISION.
 * The other three journeys ask a sequence of questions about ONE act. An offer asks which of three
 * different acts you are here to do — tell the others, record what you decided, or buy time — and
 * they share nothing: different screens, different writes, different meanings of "done". A step
 * stack would put two of them in front of a writer who wants the third.
 *
 * So: the branch selection IS the first screen, and the chosen branch is the second.
 */
export type OfferBranch = "notify" | "decide" | "time";

export const OFFER_BRANCHES: { key: OfferBranch; title: string; gloss: string }[] = [
  { key: "notify", title: "Let your other agents know", gloss: "Courtesy says the ones holding your pages hear it from you" },
  { key: "decide", title: "Record your decision", gloss: "Accepted or declined — this is what completes the task" },
  { key: "time", title: "I need time to decide", gloss: "The card stays on your board, quieter, until the day you choose" },
];

export type StepId = "what-went" | "how" | "when" | "check-back" | "why" | "remember" | "wrote"
  /* the fix journey's three, one per gap `agentDataQualityNeeds` can report */
  | "gap-responseTime" | "gap-materials" | "gap-mswl";

/* ⚠️ `Exclude<…, "offer">` IS THE TYPE SAYING WHAT THE DESIGN SAYS: the offer has no step stack,
   because it branches. A `Record<JourneyKind, …>` would have forced a placeholder entry here, and a
   placeholder is how a branch quietly becomes a stack six months later. */
export const JOURNEY_STEPS: Record<Exclude<JourneyKind, "offer">, readonly StepId[]> = {
  send: ["what-went", "how", "when", "remember"],
  chase: ["when", "check-back", "remember"],
  close: ["why", "remember"],
  /**
   * ⚠️ A NOTE HAS NOTHING TO ASK, SO IT ASKS NOTHING. One step — the words you wrote — and a
   * commit that ticks it off. The step is confirmation rather than a question, and that is honest:
   * every field a journey could add here would be one the app invented so the stack looked longer.
   *
   * ⚠️ I CONSIDERED AND REJECTED A CLOSING NOTE. `UserTask` has `detail`, which is the writer's OWN
   * line; writing over it at completion would edit what they wrote in order to record that they had
   * finished it. There is no field for "what happened when I did this", so nothing pretends there is.
   */
  note: ["wrote"],
  /**
   * ⚠️ THE FIX JOURNEY'S STACK IS EMPTY HERE BECAUSE IT IS DERIVED FROM THE CARD, NOT DECLARED.
   * Its steps are whichever agent fields are actually missing — `agentDataQualityNeeds` already
   * answers that, and it is the same derivation the card was RAISED by. A card raised for one gap
   * asks one question; a card raised for three asks three. `fixSteps()` below builds it.
   *
   * ⚠️ AND IT IS NOT PADDED TO MATCH THE SEND. A journey that asked about a wish list on a card
   * raised for a missing reply window would be inventing work — and worse, it would invite the
   * writer to fill in a field nothing had flagged, which is how a housekeeping prompt turns into a
   * form.
   */
  fix: [],
};

/** The `fix` journey's steps — one per gap, in the order `agentDataQualityNeeds` reports them. */
export function fixSteps(needs: readonly ("responseTime" | "materials" | "mswl")[]): StepId[] {
  return needs.map((n) => `gap-${n}` as StepId);
}

/**
 * ⚠️ THE BAND'S PRE-LINE IS PER JOURNEY, and the walk is what found this: a close card in the
 * journey read "Recording what you sent to / Elinor Hale", which describes a send. The pre-line is
 * the one line telling the writer what they are in the middle of, so it has to be true of the thing
 * they are doing.
 */
export const JOURNEY_PRELINE: Record<JourneyKind, string> = {
  send: "Recording what you sent to",
  chase: "Recording the nudge you sent to",
  close: "Closing your query to",
  /* ⚠️ THE OFFER'S PRE-LINE IS THE ONE THING IT SHARES ACROSS BRANCHES — whichever you pick, you
     are answering an offer, and the band should not change under you when you choose. */
  offer: "Answering the offer from",
  /* a fix is about the RECORD, and the band's subject is the agent whose record it is */
  fix: "Filling in the record for",
  /* a note has no agent — the band already falls through to the standing subject */
  note: "Ticking off",
};

/**
 * ⚠️ THE COMMIT NAMES ITS OWN DEED. A send reads `SendSpec.actLabel` ("Record the full as sent"),
 * which already exists for exactly this; the other two have no send spec, so they name themselves
 * here rather than falling through to `rowPrimaryLabel`'s row shorthand — which put "Action" on a
 * chase's commit button, measured on the deployed page.
 */
/* the offer names its deed per BRANCH — `OFFER_ACT` — so it is absent here for the same reason */
export const JOURNEY_ACT: Record<Exclude<JourneyKind, "send" | "offer">, string> = {
  chase: "Log the nudge",
  close: "Close the record",
  note: "Mark it done",
  fix: "Save to the record",
};

/**
 * ⚠️ THE FOOT'S HINT IS PER JOURNEY TOO — same family as the pre-line, found the same way. A close
 * card read "Nothing is sent from here — this records what you sent", which is a sentence about a
 * send sitting under a form that ends a query.
 */
export const JOURNEY_HINT: Record<Exclude<JourneyKind, "offer">, string> = {
  send: "Nothing is sent from here — this records what you sent.",
  chase: "Nothing is sent from here — this records the nudge you sent.",
  close: "This closes the record. It does not tell the agent anything.",
  note: "Struck through on Today — undo is on the toast.",
  fix: "This updates the agent's record. It tells them nothing.",
};

/** The three ways a query ends — the close journey's one real question. */
export type CloseReason = "no_reply" | "off_record" | "withdrawn";

/** What the writer has said, once the four steps are answered. */
export interface JourneySendValues {
  /** The material rows they left ticked — labels, in the order the card states them. */
  materials: string[];
  /** Free text from "Anything else?" — a covering line, a note on the changes. */
  also: string;
  /** How it went. */
  method: SendMethod;
  /** The day it went, `YYYY-MM-DD`. */
  sentDate: string;
  /** "Anything to remember" — optional, and optional means optional. */
  note: string;
  /** chase only — days until the reminder returns. */
  checkBackDays: number;
  /** close only — which of the three ways it ended. `null` until the writer says. */
  reason: CloseReason | null;
  /* ── fix: one field per gap `agentDataQualityNeeds` can report, all empty until answered ── */
  /** Weeks, as typed. A string because the editor is chips + a free field. */
  fixResponseWeeks: string;
  /** Rides with the reply window — "no reply means no" is a fact about the same policy. */
  fixNoMeansNo: boolean;
  /** Material labels, the shape `buildAgentMaterials` encodes. */
  fixMaterials: string[];
  /** Their wish list, verbatim. */
  fixMswl: string;
  /** offer only — `null` while the writer is on the branch selector. */
  branch: OfferBranch | null;
  /** offer · decide — accepted or declined. `null` until said. */
  decision: "accepted" | "declined" | null;
  /** offer · time — the day the card wakes, `YYYY-MM-DD`. */
  remindDate: string;
  /** offer · notify — which agents to write a reminder for, by query id. */
  notifySel: Record<string, boolean>;
  /**
   * ⚠️ WHICH OF THOSE ARE HOLDING PAGES — carried in the draft so the SUMMARY can state both
   * numbers without re-deriving the split. The alternative was threading the holder groups down to
   * the footer, which would have given two components two chances to disagree about who is in
   * which group.
   */
  notifyHolding: string[];
}

export type SendMethod = "Email" | "Agency portal" | "Post";

/**
 * ⚠️ THE THREE THE REF DRAWS, AND NO "OTHER". A fourth free-text channel would be a field nothing
 * downstream reads — `recordMaterialsSent` has no home for the method at all, and the quick path
 * already stores it only for the receipt's wording.
 */
export const SEND_METHODS: readonly SendMethod[] = ["Email", "Agency portal", "Post"] as const;

/** `YYYY-MM-DD` for a Date, in LOCAL time — never `toISOString`, which is UTC and slips a day. */
export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The journey's opening state.
 *
 * ⚠️ THE MATERIALS OPEN TICKED, because the card states them as a RECORD of what is on file and the
 * journey is confirming rather than choosing from nothing. Untick is the writer correcting it.
 *
 * ⚠️ AND THE METHOD OPENS ON THE QUERY'S OWN, where the record holds one. Defaulting to Email when
 * the record says Post would be the app quietly overwriting a fact it already had.
 */
export function openSend(
  materials: string[],
  queryMethod: string | undefined,
  now: Date,
  /** offer only — the two notify groups, so the seed can differ by group (see `seedNotify`). */
  holdingQueryIds: string[] = [],
  queriedQueryIds: string[] = [],
): JourneySendValues {
  const m = SEND_METHODS.find((x) => x.toLowerCase() === String(queryMethod ?? "").toLowerCase());
  return {
    materials: [...materials], also: "", method: m ?? "Email", sentDate: ymdLocal(now), note: "",
    /* ⚠️ THE DEFAULT IS THE ONE THE QUICK PATH ALREADY STATES — `DEFAULT_CHECKBACK_DAYS`'s 14. A
       second default here would be a second answer to "when does a nudge come back". */
    checkBackDays: 14,
    /* ⚠️ `null`, NOT A FIRST REASON. A close is the one journey whose single question has no safe
       default: pre-selecting "no reply" would write a NO_RESPONSE for a query the writer withdrew,
       on a form they never touched. The commit is blocked until they say. */
    reason: null,
    /* ⚠️ `null` — THE OFFER OPENS ON ITS SELECTOR. There is no default branch, because the three
       are not degrees of one act; choosing for the writer would decide which of three different
       things they came here to do. */
    fixResponseWeeks: "",
    fixNoMeansNo: false,
    fixMaterials: [],
    fixMswl: "",
    branch: null,
    decision: null,
    remindDate: "",
    ...seedNotify(holdingQueryIds, queriedQueryIds),
  };
}

/**
 * ⚠️ THE TWO GROUPS OPEN DIFFERENTLY, BECAUSE THE COURTESY DIFFERS. An agent reading your
 * manuscript right now needs telling; an agent holding a query letter is a courtesy the writer may
 * or may not extend today.
 *
 * ⚠️ AND BOTH WRONG DEFAULTS ARE WRONG IN THEIR OWN WAY. Pre-ticking all twelve makes the second
 * decision for the writer — it would write nine reminders they never chose. Pre-ticking none makes
 * them do work the app already knows the answer to: of course the three holding your pages should
 * hear. So: holding pre-ticked, queried not.
 */
export function seedNotify(holdingQueryIds: string[] = [], queriedQueryIds: string[] = []):
  { notifySel: Record<string, boolean>; notifyHolding: string[] } {
  const notifySel: Record<string, boolean> = {};
  for (const id of holdingQueryIds) notifySel[id] = true;
  for (const id of queriedQueryIds) notifySel[id] = false;
  return { notifySel, notifyHolding: [...holdingQueryIds] };
}

/** Which of the three "when" segments a date corresponds to — `other` for anything else. */
export type WhenMode = "today" | "yesterday" | "other";

export function whenMode(sentDate: string, now: Date): WhenMode {
  if (sentDate === ymdLocal(now)) return "today";
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return sentDate === ymdLocal(y) ? "yesterday" : "other";
}

/** "12 Aug" — the chosen day on the relabelled segment. */
export function shortDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * ⚠️ THE SUMMARY ASSEMBLES FROM WHAT IS ANSWERED, AND STATES NOTHING ELSE. It is the sentence the
 * writer is about to commit, so every clause in it has to be one they actually gave: no materials
 * ticked and it says so plainly rather than naming a default they did not choose.
 *
 * ⚠️ AND IT IS A SENTENCE, NOT A FIELD LIST. "Recording the partial, sent by email today" reads as
 * the thing being done; "Materials: partial / Method: email / Date: today" is a form talking about
 * itself.
 */
export function sendSummary(v: JourneySendValues, now: Date): string {
  const things = [...v.materials, ...(v.also.trim() ? [v.also.trim()] : [])];
  const what = things.length ? things.join(", ") : "nothing marked as going";
  const mode = whenMode(v.sentDate, now);
  const when = mode === "today" ? "today" : mode === "yesterday" ? "yesterday" : `on ${shortDay(v.sentDate)}`;
  return `Recording ${what}, sent by ${v.method.toLowerCase()} ${when}.`;
}

/**
 * ⚠️ THE COMMIT IS ONLY BLOCKED BY A DATE, and deliberately by nothing else. A writer who sent an
 * empty covering email with nothing attached is recording a real thing; a writer with no date is
 * recording an event that did not happen on any day. Materials are a record, not a requirement —
 * the same reason the card marks them rather than asking.
 */
export function canCommitSend(v: JourneySendValues): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v.sentDate);
}

/**
 * ⚠️ THE FIX'S SUMMARY NAMES WHAT WILL BE WRITTEN, and nothing that will not. A writer who answered
 * one of three gaps sees one clause — the other two are still missing, and saying so here would be
 * the app reporting its own emptiness back at them.
 */
export function fixSummary(v: JourneySendValues): string {
  const parts: string[] = [];
  if (v.fixResponseWeeks.trim()) {
    parts.push(`a ${v.fixResponseWeeks.trim()}-week reply window${v.fixNoMeansNo ? " (no reply means no)" : ""}`);
  }
  if (v.fixMaterials.length) parts.push(`${v.fixMaterials.length} material${v.fixMaterials.length === 1 ? "" : "s"}`);
  if (v.fixMswl.trim()) parts.push("their wish list");
  return parts.length ? `Saving ${parts.join(", ")} to the record.` : "Fill in whatever you know.";
}

/** The sentence about to be committed, per branch — and nothing at all on the selector. */
export function offerSummary(v: JourneySendValues): string {
  if (v.branch === "notify") {
    /* ⚠️ BOTH NUMBERS, SO TWELVE ROWS NEVER HAVE TO BE READ TO KNOW WHAT WILL HAPPEN. A single
       total would hide the thing that matters — whether the three holding your pages are in it. */
    const holding = v.notifyHolding.filter((id) => v.notifySel[id]).length;
    const queried = Object.entries(v.notifySel).filter(([id, on]) => on && !v.notifyHolding.includes(id)).length;
    if (!holding && !queried) return "Choose who to tell.";
    const parts: string[] = [];
    if (holding) parts.push(`${holding} holding pages`);
    if (queried) parts.push(`${queried} queried`);
    return `Telling ${parts.join(" and ")}.`;
  }
  if (v.branch === "decide") {
    if (v.decision === "accepted") return "Recording that you accepted. Your other queries stay open.";
    if (v.decision === "declined") return "Recording that you declined. The querying continues.";
    return "Accepted or declined?";
  }
  if (v.branch === "time") {
    return v.remindDate ? `Bringing this back on ${shortDay(v.remindDate)}.` : "Choose a day to come back to it.";
  }
  return "";
}

/**
 * ⚠️ EACH JOURNEY IS BLOCKED BY ITS OWN ONE THING, and never by more than that.
 *   send  — a date, because an event with no day happened on no day.
 *   chase — the same.
 *   close — the REASON, because the three write three different statuses. There is no default that
 *           is safe to assume, so nothing is assumed.
 */
export function canCommit(kind: JourneyKind, v: JourneySendValues): boolean {
  /* ⚠️ A NOTE IS NEVER BLOCKED — there is nothing to answer, so there is nothing to withhold. */
  if (kind === "note") return true;
  if (kind === "close") return v.reason !== null;
  if (kind === "offer") return canCommitOffer(v);
  /* ⚠️ ANY ONE GAP ANSWERED IS WORTH SAVING. A journey that demanded all three would refuse a
     writer who knows the reply window but not the wish list — and the card was raised BY the gaps,
     so closing one of them is real progress rather than a partial answer. */
  if (kind === "fix") return !!v.fixResponseWeeks.trim() || v.fixMaterials.length > 0 || !!v.fixMswl.trim();
  return canCommitSend(v);
}

/**
 * ⚠️ EACH BRANCH IS BLOCKED BY ITS OWN ONE THING, and the SELECTOR commits nothing at all — there
 * is no deed until a branch is chosen, so the footer offers none.
 */
export function canCommitOffer(v: JourneySendValues): boolean {
  if (v.branch === "decide") return v.decision !== null;
  if (v.branch === "time") return /^\d{4}-\d{2}-\d{2}$/.test(v.remindDate);
  if (v.branch === "notify") return Object.values(v.notifySel).some(Boolean);
  return false;
}

/**
 * ⚠️ THE COMMIT'S WORDS ARE THE BRANCH'S OWN. "Record the decision" on the notify screen would name
 * a deed that screen does not perform.
 */
export const OFFER_ACT: Record<OfferBranch, string> = {
  notify: "Set the reminders",
  decide: "Record the decision",
  time: "Set the reminder",
};

export const OFFER_HINT: Record<OfferBranch, string> = {
  notify: "This writes reminders for you — it does not email anyone.",
  decide: "Your other queries stay open and untouched.",
  time: "The reply-by date still counts down.",
};

/** "in 2 weeks" / "in 5 days" — the check-back stated as the interval the writer chose. */
export function checkBackLabel(days: number): string {
  if (days % 7 === 0 && days >= 7) {
    const w = days / 7;
    return `in ${w === 1 ? "a week" : `${w} weeks`}`;
  }
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

export const CLOSE_REASON_COPY: { key: CloseReason; label: string; gloss: string }[] = [
  { key: "no_reply", label: "No reply within their window", gloss: "Silence past a stated window" },
  { key: "off_record", label: "A pass arrived off the record", gloss: "You saw it but never logged it" },
  { key: "withdrawn", label: "You withdrew the query", gloss: "You pulled it yourself" },
];

/**
 * ⚠️ ONE SUMMARY PER JOURNEY, in the same grammar — the sentence about to be committed, assembled
 * from answers the writer actually gave.
 */
export function journeySummary(kind: JourneyKind, v: JourneySendValues, now: Date): string {
  if (kind === "send") return sendSummary(v, now);
  if (kind === "offer") return offerSummary(v);
  /* ⚠️ A NOTE'S SUMMARY IS NOT THE NOTE. The step above already shows the words; repeating them
     here would say the same thing twice on one screen. It states the DEED. */
  if (kind === "note") return "Marking this done.";
  if (kind === "fix") return fixSummary(v);
  const mode = whenMode(v.sentDate, now);
  const when = mode === "today" ? "today" : mode === "yesterday" ? "yesterday" : `on ${shortDay(v.sentDate)}`;
  if (kind === "chase") return `Logging a nudge sent ${when}, coming back ${checkBackLabel(v.checkBackDays)}.`;
  const r = CLOSE_REASON_COPY.find((x) => x.key === v.reason);
  /* ⚠️ IT SAYS WHAT IS MISSING RATHER THAN GUESSING — the one journey that can be unanswerable */
  return r ? `Closing the query: ${r.label.toLowerCase()}.` : "Choose how this one ended.";
}
