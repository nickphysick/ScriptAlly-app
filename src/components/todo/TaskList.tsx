/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskList — the consolidated Tasks page's BODY (tasks-consolidation, Phase 2; ref
 * design-refs/tasks-page.html, the third frame).
 *
 * ⚠️ THIS REPLACES THE FOUR-COLUMN BOARD, AND THE ARGUMENT IS PLACEMENT. The board asked the
 * writer where a thing belonged — To do, Today, Snoozed, Done — and then had to keep four columns
 * agreeing about one set. The ranked order of ONE list is the plan now, so the groups answer
 * "what KIND of thing is this", which the app can already derive, instead of "where did you put
 * it", which it could not.
 *
 * ⚠️ THE LIST OWNS NO STATE THAT MATTERS AND WRITES NOTHING. Its groups are `taskGroups(cols)`,
 * its fold is `groupSlice`, its pills and journeys are `taskRow`, its ticks are `isTickable`, and
 * every verb resolves through the SAME `cardMenu` model the board's ⋯ used. Two pieces of local
 * state are view memory only (the snoozed fold, a sweep's session-high member count) — losing
 * either changes nothing true.
 *
 * ⚠️ THE ROW IS ONE ELEMENT CARRYING ITS OWN GRID. Never `display: contents` on the row with the
 * cells promoted to grid items: `contents` deletes the row's box, so hover, focus and any future
 * selected band fracture into six separate rectangles and the divider has nothing to hang off.
 * The rule is load-bearing enough to be tested rather than commented (`tasksList.test.tsx`).
 *
 * ⚠️ WHICH VERB SLOTS FILL IS ASKED OF THE MENU MODEL, NEVER OF A SECOND PER-KIND TABLE. The four
 * slots are fixed tracks and an absent verb leaves its slot standing, so every primary in a panel
 * starts at the same x and an absence is legible. Phase 3 added the per-kind NAMES (Start, Close,
 * Return, Undo) and the pill tones and journeys in `lib/taskRow` — presentation the menu has no
 * opinion about. The split is the point: the menu says WHETHER, taskRow says WHAT IT IS CALLED,
 * so the row and the menu cannot disagree about what a card allows.
 */
import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Clock, MoreHorizontal, X, Check } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup, groupSlice, showMoreLabel } from "../../lib/todoGroups";
/* P3 — what the row SAYS about its kind: the pill's tone, the primary's name, the journey.
   (Whether a verb exists at all stays `cardMenu`'s answer — see below.) */
import { rowPill, rowPrimaryLabel, rowJourney } from "../../lib/taskRow";
import { isTickable, completionVia } from "../../lib/todoActions";
import { listKey, isTypingTarget, KEY_MAP } from "../../lib/taskShortcuts";
import { cardMenu, MenuLeaf, MenuEntry, MenuItemId } from "../../lib/todoMenu";
import { TodoColumnId, isSweepCard } from "../../lib/todoColumns";
import { PortalMenu } from "./PortalMenu";
import { SnoozeDial } from "./SnoozeDial";
import "./todoGroups.css";

export interface TaskListProps {
  groups: TaskGroup[];
  /** Housekeeping's fold — hoisted to the page so a re-render of the list never loses it. */
  hkExpanded: boolean;
  onToggleHk: () => void;
  /** The row's door: the dock, on this card. */
  onOpen: (card: BoardCard) => void;
  /** ⚠️ THE TICK RETURNS ITS WRITE (P5). The row believes the act immediately — it dims and its
   *  circle becomes a spinner — and only FAILURE interrupts, so the row needs to know when the
   *  write settles. A void return would leave the dim on until the data happened to change. */
  onTick: (card: BoardCard) => void | Promise<void>;
  /** The db's first snapshot has not landed — render the shell rather than an honest-looking
   *  empty page. Absent means loaded, so every existing caller keeps the behaviour it had. */
  loading?: boolean;
  /** A menu leaf, performed by the page with its existing primitives (as the board's ⋯ was). */
  onVerb: (card: BoardCard, item: MenuLeaf, column: TodoColumnId) => void;
  /** ⚠️ THE DIAL'S ONE WRITE — already clamped and re-labelled by `clampSnooze` on its way out,
   *  so the page performs rather than decides, exactly as it does for every ⋯ verb. */
  onSnooze: (card: BoardCard, days: number, when: string) => void;
}

/**
 * ⚠️ THE GROUP → COLUMN MAP EXISTS BECAUSE THE MENU MODEL STILL SPEAKS COLUMNS, and that is the
 * honest reading rather than a leftover: `cardMenu`'s "column" is really the card's STATE — is it
 * live, asleep, or finished — and the three states outlived the four columns. Mapping here keeps
 * one menu model instead of forking it for a page that no longer has columns.
 */
export function groupColumn(id: TaskGroup["id"]): TodoColumnId {
  if (id === "snoozed") return "snoozed";
  if (id === "done") return "done";
  return "todo";
}

/** The heading dot — the group's own family tone, so the heading and its pills agree. */
const GROUP_DOT: Record<TaskGroup["id"], string> = {
  now: "#d98b74",
  housekeeping: "#d9c49a",
  yours: "#a8bca4",
  snoozed: "#c4bcb2",
  done: "#b9c9b4",
};

/** Does the menu offer this leaf, live? A disabled line is an explanation, not an affordance. */
function offers(groups: ReturnType<typeof cardMenu>, id: MenuItemId): boolean {
  const hit = (e: MenuEntry): boolean =>
    e.kind === "leaf" ? e.id === id && !e.disabled : e.sub.some((s) => s.id === id && !s.disabled);
  return groups.some((g) => g.entries.some(hit));
}

/** ⚠️ THE PAUSE IS THE RECEIPT (sheet 6) — you see the act land before the row moves on. 600ms is
 *  the ref's own hold, and it is the one duration on this page allowed past 300ms because it is a
 *  DWELL rather than a movement. */
export const RING_MS = 600;

/**
 * ⚠️ THE SKELETON IS THE REAL ROW, WEARING PLACEHOLDERS (sheet 3). It reuses `.tdg-row` and its
 * six tracks, `.tdg-verbs` and its four slots — so nothing shifts by a pixel when the data lands.
 * A bespoke skeleton with its own measurements would be a second layout to keep in step with the
 * first, and the day they drift is the day the page jumps on load.
 *
 * Two groups, as the ref says: in practice the first arrive and the rest follow without a spinner.
 */
const SkeletonRow: React.FC = () => (
  <div className="tdg-row" aria-hidden>
    <div className="tdg-cc"><span className="tdg-sk tick" /></div>
    <div style={{ minWidth: 0 }}><div className="tdg-sk t" /><div className="tdg-sk sub" /></div>
    <div className="tdg-cc"><span className="tdg-sk pill" /></div>
    <div className="tdg-cc"><div className="tdg-jrny" /></div>
    <div className="tdg-cr"><span className="tdg-sk age" /></div>
    <div className="tdg-verbs">
      <span className="tdg-sk vb" /><span className="tdg-slot" /><span className="tdg-slot" /><span className="tdg-sk vb" />
    </div>
  </div>
);

export const TaskListSkeleton: React.FC = () => (
  <div className="tdg" role="status" aria-label="Loading your tasks">
    {[0, 1].map((s) => (
      <div key={s} className="tdg-sect">
        <div className="tdg-shd"><h3><span className="tdg-sk" style={{ width: 132 }} /></h3></div>
        <div className="tdg-panel">{[0, 1, 2].map((r) => <SkeletonRow key={r} />)}</div>
      </div>
    ))}
  </div>
);

interface OpenMenu {
  key: string;
  card: BoardCard;
  column: TodoColumnId;
  anchor: HTMLElement;
  openSub?: "snooze" | "resnooze" | "dismiss";
}

export const TaskList: React.FC<TaskListProps> = ({ groups, hkExpanded, onToggleHk, onOpen, onTick, onVerb, onSnooze, loading = false }) => {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  /* ⚠️ THE DIAL IS THE CLOCK'S SURFACE NOW (P4) — it replaced the ⋯ menu's snooze submenu at THIS
     one call site, which is exactly why the clock was routed through a pre-opened submenu in P2
     rather than growing a chooser of its own. The ⋯ menu keeps its tiers for the keyboard path
     and for Snoozed's "Change the date…"; they resolve through the same `clampSnooze`. */
  const [dial, setDial] = useState<{ card: BoardCard; anchor: HTMLElement } | null>(null);
  /* Snoozed opens in place. Session-only and deliberately so: a band that remembered being open
     would greet you with the things you had put away. */
  const [snzOpen, setSnzOpen] = useState(false);
  /* A sweep's session-high member count — DERIVED VIEW MEMORY, carried over from the board's own
     rail rather than re-derived: with a baseline the meter can say "5 OF 16" as the pile shrinks,
     and a pile you have not started is a pile rather than a 0% failure. */
  const sweepBase = useRef(new Map<string, number>());
  /* ⚠️ THE FOCUSED ROW IS THE BROWSER'S OWN FOCUS, not a second index kept in state (P6). The rows
     are already `tabIndex={0}`, so j/k simply MOVE focus — which means Tab, a click and a
     shortcut all agree about where you are, and `:focus-visible` paints it for free. A parallel
     `focusIndex` would be a second answer to "where am I" and would drift the moment anything
     else moved focus. */
  const rowEls = useRef(new Map<string, HTMLElement>());
  const rootEl = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  /* ⚠️ THE OPTIMISTIC SET (P5). A key enters on commit and leaves when the write settles — not
     when the data changes, because a REFUSED write changes nothing and the row would dim for
     ever. The act is believed immediately; only failure interrupts. */
  const [pending, setPending] = useState<Set<string>>(new Set());
  /* ⚠️ THE COMPLETION RING, DERIVED FROM ARRIVAL (P5) — keys that have just appeared in the Done
     group wear it for 600ms. Carried from the retired board's own rail rather than reinvented:
     the ring is a receipt for a fact the derivation already states, so it is triggered by the
     fact rather than by the click that caused it. */
  const [rung, setRung] = useState<Set<string>>(new Set());
  const prevDone = useRef<Set<string> | null>(null);

  const doneKeys = groups.find((g) => g.id === "done")?.cards.map((c) => c.key) ?? [];
  const doneSig = doneKeys.join("|");
  useEffect(() => {
    const now = new Set(doneKeys);
    const before = prevDone.current;
    prevDone.current = now;
    if (!before) return; // first render rings nothing — arriving at a page is not an achievement
    const fresh = [...now].filter((k) => !before.has(k));
    if (!fresh.length) return;
    setRung((r) => new Set([...r, ...fresh]));
    const id = window.setTimeout(
      () => setRung((r) => { const n = new Set(r); fresh.forEach((k) => n.delete(k)); return n; }),
      RING_MS,
    );
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSig]);

  const tick = (c: BoardCard) => {
    setPending((p) => new Set(p).add(c.key));
    void Promise.resolve(onTick(c)).finally(() =>
      setPending((p) => { const n = new Set(p); n.delete(c.key); return n; }));
  };

  const closeMenu = (returnFocus: boolean) => {
    setMenu((m) => {
      if (m && returnFocus) m.anchor.focus();
      return null;
    });
  };

  const openMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    card: BoardCard,
    column: TodoColumnId,
    openSub?: OpenMenu["openSub"],
  ) => {
    e.stopPropagation();
    const anchor = e.currentTarget;
    setMenu((m) => (m?.key === card.key && m.openSub === openSub
      ? null
      : { key: card.key, card, column, anchor, openSub }));
  };

  const sweepFigure = (c: BoardCard): { label: string; pct: number } => {
    const m = isSweepCard(c) ? c.sweepOf : 0;
    const base = Math.max(sweepBase.current.get(c.key) ?? 0, m);
    sweepBase.current.set(c.key, base);
    const fixed = base - m;
    return fixed > 0
      ? { label: `${fixed} OF ${base} DONE`, pct: Math.round((fixed / base) * 100) }
      : { label: c.due, pct: 0 };
  };

  /* The rows in the order they are DRAWN — the walker reads the DOM rather than re-deriving the
     order, so j/k can never disagree with what is on screen. */
  const orderedKeys = (): string[] =>
    [...(rowEls.current.entries())]
      .filter(([, el]) => el.isConnected)
      .sort((a, b) => (a[1].compareDocumentPosition(b[1]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map(([k]) => k);

  const moveFocus = (delta: number) => {
    const keys = orderedKeys();
    if (!keys.length) return;
    const active = document.activeElement as HTMLElement | null;
    const cur = keys.findIndex((k) => rowEls.current.get(k) === active);
    const next = cur === -1 ? (delta > 0 ? 0 : keys.length - 1) : Math.min(keys.length - 1, Math.max(0, cur + delta));
    rowEls.current.get(keys[next])?.focus();
  };

  const focusedCard = (): { card: BoardCard; column: TodoColumnId } | null => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return null;
    for (const g of groups) {
      const col = groupColumn(g.id);
      const hit = g.cards.find((c) => rowEls.current.get(c.key) === active);
      if (hit) return { card: hit, column: col };
    }
    return null;
  };

  /* ⚠️ THE LIST LISTENS ON THE WINDOW, NOT ON ITS OWN CONTAINER — and the browser walk is what
     found it. A container handler only fires once focus is already INSIDE the list, so `j` did
     nothing at all from a standing start: you had to click a row before the keyboard would work,
     which is precisely the mouse dependency "drivable without a mouse" exists to remove. Keydown
     bubbles UP, so focus on the scrollzone (itself `tabIndex={0}`) never reached us either.
     ⚠️ AND IT CARRIES THE VISIBILITY GUARD, because the Tasks slots stay MOUNTED under
     `display: none` — without it a hidden page's list would answer keys meant for a visible one. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!rootEl.current || rootEl.current.offsetParent === null) return;
    const action = listKey(e, isTypingTarget(e.target));
    if (!action) return;
    if (action === "help") { e.preventDefault(); setHelpOpen((v) => !v); return; }
    if (action === "dismiss") {
      /* ⚠️ THE ORDER IS DIAL, THEN MENU, THEN THE MAP — innermost first, so Escape never closes
         two things at once. It is NOT stopped: the page beyond has its own Escape business. */
      if (dial) { setDial(null); e.preventDefault(); }
      else if (menu) { closeMenu(true); e.preventDefault(); }
      else if (helpOpen) { setHelpOpen(false); e.preventDefault(); }
      return;
    }
    if (action === "down" || action === "up") { e.preventDefault(); moveFocus(action === "down" ? 1 : -1); return; }
    const hit = focusedCard();
    if (!hit) return;
    const { card: c, column } = hit;
    e.preventDefault();
    if (action === "tick") {
      /* ⚠️ SPACE TICKS, OR OPENS THE FLOW WHERE THE TICK IS NOT THE ACT (sheet 7's own wording).
         `isTickable` is the same question the row asks before drawing a circle, so the key and
         the control can never offer different things. */
      if (isTickable(c)) tick(c); else onOpen(c);
      return;
    }
    if (action === "primary") { onOpen(c); return; }
    if (action === "snooze") {
      const el = rowEls.current.get(c.key);
      if (el && offers(cardMenu(c, column), "snooze-1")) setDial({ card: c, anchor: el });
      return;
    }
    if (action === "edit") {
      /* the row does not decide who may be edited — the menu does, as it does for every verb */
      const leaf = cardMenu(c, column).flatMap((g) => g.entries)
        .find((x) => x.kind === "leaf" && x.id === "edit-task");
      if (leaf && leaf.kind === "leaf") onVerb(c, leaf, column);
    }
  };

  /* The handler closes over `groups`, `dial`, `menu` and `helpOpen`, so it re-registers when any
     of them changes — cheap, and the alternative is a ref-shaped copy of the whole render. */
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const renderRow = (c: BoardCard, column: TodoColumnId) => {
    const menuModel = cardMenu(c, column);
    const sweep = isSweepCard(c);
    const fig = sweep ? sweepFigure(c) : null;
    const pill = rowPill(c, column);
    const journey = rowJourney(c, column);

    /* SLOT 1 — the primary. ⚠️ THE MENU SAYS WHETHER, `taskRow` SAYS WHAT IT IS CALLED. Absent
       where the TICK IS THE ACT: a writer's own item is finished by ticking it, so a second verb
       beside the circle would be two names for one act. */
    const primary: { id: MenuItemId; label: string; ghost?: true } | null =
      column === "done" ? (offers(menuModel, "undo-done") ? { id: "undo-done", label: rowPrimaryLabel(c, column), ghost: true } : null)
      : column === "snoozed" ? { id: "unsnooze", label: rowPrimaryLabel(c, column) }
      : completionVia(c) === "user-task" ? null
      : { id: "action", label: rowPrimaryLabel(c, column) };

    /* SLOT 2 — the clock. It opens the ⋯ menu AT its date tiers rather than owning a second
       chooser; Phase 4 swaps that submenu for the dial, at this one call site. Absent on a
       finished row, and on a sleeping one (its snooze is "change the date", which lives in ⋯).
       ⚠️ THE PERMISSION IS THE MENU'S, like the dismissal's. It was `snoozeVia(c) !== "none"`
       for one browser walk, and that put a SWEEP — which has no `relatedRecordId`, because it
       stands for many — in the state of refusing a snooze on the row while offering one in its
       own ⋯ menu. Two answers to one question, on one card. */
    const clock = column !== "done" && column !== "snoozed" && offers(menuModel, "snooze-1");

    /* SLOT 3 — the dismissal. ⚠️ THE PERMISSION IS THE MENU'S, NOT A SECOND TABLE: an offer's
       dismiss line is rendered DISABLED with its reason, so `offers` refuses it and the slot
       stands empty — which is exactly the ref's rule for offers and deadlines. */
    const dismiss = offers(menuModel, "dismiss-week");

    const tickable = isTickable(c);

    return (
      <div
        key={c.key}
        data-tdgkey={c.key}
        ref={(el) => { if (el) rowEls.current.set(c.key, el); else rowEls.current.delete(c.key); }}
        className={`tdg-row${c.done ? " done" : ""}${pending.has(c.key) ? " pend" : ""}${rung.has(c.key) ? " rung" : ""}`}
        aria-busy={pending.has(c.key) || undefined}
        role="button"
        tabIndex={0}
        aria-label={c.title}
        onClick={() => onOpen(c)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
            e.preventDefault();
            onOpen(c);
          }
        }}
      >
        <div className="tdg-cc">
          {/* ⚠️ THE SPINNER TAKES THE TICK'S PLACE rather than sitting beside it — the circle is
              where your eye already is, and a spinner elsewhere would leave a tick that looks
              clickable during a write it cannot join. */}
          {pending.has(c.key) ? <span className="tdg-spin" aria-hidden /> : tickable && (
            <button
              type="button"
              className={`tdg-tick${c.done ? " dn" : ""}`}
              aria-label={c.done ? `Undo “${c.title}”` : `Mark “${c.title}” done`}
              onClick={(e) => { e.stopPropagation(); tick(c); }}
            >
              <Check size={11} aria-hidden />
            </button>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="tdg-t">{c.title}</div>
          {/* the why-line sits BENEATH the title rather than competing for its width */}
          {(c.subtitle || c.record) && <div className="tdg-sub">{c.subtitle || c.record}</div>}
        </div>

        <div className="tdg-cc">
          {/* ⚠️ GUARDED AT THE DERIVATION: `rowPill` returns null where a card has no kind, so an
              empty pill — chrome with nothing in it, which reads as a load failure rather than an
              absence — cannot be drawn from here. The WORDS are the card's own derived `kind`;
              only the tone is per-kind. */}
          {pill && <span className={`tdg-pill tone-${pill.tone}`}>{pill.label}</span>}
        </div>

        <div className="tdg-cc">
          {/* ⚠️ THE METER NAMES THE STAGE, NOT A PERCENTAGE — except for a sweep, where the count
              IS the fact ("5 OF 16 DONE"). The two never appear together: a pile has no journey
              and a journey has no pile. */}
          <div className="tdg-jrny">
            {sweep ? (
              <>
                <div className="tdg-bar" aria-hidden><i style={{ width: `${fig!.pct}%` }} /></div>
                <div className="tdg-stlab">{fig!.label}</div>
              </>
            ) : journey && (
              <>
                <div className="tdg-steps" aria-hidden>
                  {journey.stages.map((s, i) => <span key={i} className={`tdg-stp ${s}`} />)}
                </div>
                <div className="tdg-stlab">{journey.label}</div>
              </>
            )}
          </div>
        </div>

        <div className="tdg-cr">
          {/* ⚠️ THE AGE NEVER ECHOES THE METER BESIDE IT (browser-measured, 9 Aug). A sweep that
              has not been started yet takes `c.due` as its meter label ("16 TO FIX"), and the age
              lane read the same field — so the row stated one figure twice, side by side. It is
              the board's own band law in a new lane: the right lane must not mirror its
              neighbour. A sweep has no age, and an em dash is what the ref draws there. */}
          <span className="tdg-age">{sweep ? "—" : c.due}</span>
        </div>

        <div className="tdg-verbs" onClick={(e) => e.stopPropagation()}>
          {primary ? (
            <button
              type="button"
              className={`tdg-vb go${primary.ghost ? " ghost" : ""}`}
              onClick={() => {
                const leaf = menuModel
                  .flatMap((g) => g.entries)
                  .flatMap((e) => (e.kind === "leaf" ? [e] : e.sub))
                  .find((l) => l.id === primary.id);
                if (leaf) onVerb(c, leaf, column);
              }}
            >
              {primary.label}
            </button>
          ) : <span className="tdg-slot" />}

          {clock ? (
            <button
              type="button"
              className="tdg-vb"
              aria-haspopup="menu"
              aria-label={`Snooze “${c.title}”`}
              title="Snooze"
              onClick={(e) => {
                e.stopPropagation();
                const anchor = e.currentTarget;
                setDial((d) => (d?.card.key === c.key ? null : { card: c, anchor }));
              }}
            >
              <Clock size={13} aria-hidden />
            </button>
          ) : <span className="tdg-slot" />}

          {dismiss ? (
            <button
              type="button"
              className="tdg-vb"
              aria-haspopup="menu"
              aria-label={`Dismiss “${c.title}”`}
              title="Dismiss"
              onClick={(e) => openMenu(e, c, column, "dismiss")}
            >
              <X size={13} aria-hidden />
            </button>
          ) : <span className="tdg-slot" />}

          <button
            type="button"
            className="tdg-vb"
            aria-haspopup="menu"
            aria-expanded={menu?.key === c.key}
            aria-label={`Actions for ${c.title}`}
            onClick={(e) => openMenu(e, c, column)}
          >
            <MoreHorizontal size={13} aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  /* ⚠️ THE SHELL REPLACES THE LIST WHOLESALE, and it is not an empty state. "No tasks" and "we do
     not know yet" are different sentences, and the second one must never be told as the first. */
  if (loading) return <TaskListSkeleton />;

  return (
    <div className="tdg" ref={rootEl}>
      {helpOpen && (
        /* ⚠️ THE MAP IS BUILT FROM `KEY_MAP`, so the overlay and the handler cannot list different
           keys — the classic way a shortcut sheet comes to advertise something that does nothing. */
        <div className="tdg-keyscrim" onClick={() => setHelpOpen(false)}>
          <div className="tdg-keys" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
            <div className="tdg-keysk">KEYBOARD</div>
            <table><tbody>
              {KEY_MAP.map((k) => (
                <tr key={k.key}><th><span className="tdg-kbd">{k.key}</span></th><td>{k.does}</td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}
      {dial && (
        <SnoozeDial
          card={dial.card}
          anchor={dial.anchor}
          onSnooze={(days, when) => { setDial(null); onSnooze(dial.card, days, when); }}
          onClose={(returnFocus) => { if (returnFocus) dial.anchor.focus(); setDial(null); }}
        />
      )}
      {menu && (
        <PortalMenu
          anchor={menu.anchor}
          groups={cardMenu(menu.card, menu.column)}
          openSub={menu.openSub}
          ariaLabel={`Actions for ${menu.card.title}`}
          onPick={(item) => { setMenu(null); onVerb(menu.card, item, menu.column); }}
          onClose={closeMenu}
        />
      )}

      {groups.map((g) => {
        const column = groupColumn(g.id);

        /* ⚠️ SNOOZED IS A SLIM FOLD, NOT A PANEL. It is the one group you asked for less of. */
        if (g.id === "snoozed") {
          return (
            <React.Fragment key={g.id}>
              <button
                type="button"
                className="tdg-fold"
                aria-expanded={snzOpen}
                onClick={() => setSnzOpen((v) => !v)}
              >
                <h3>
                  <span className="tdg-foldchev" aria-hidden><ChevronRight size={13} /></span>
                  {g.label}
                </h3>
                <span className="tdg-n">{g.cards.length}</span>
                <span className="tdg-desc">{g.description}</span>
              </button>
              {snzOpen && (
                <div className="tdg-sect">
                  <div className="tdg-panel">{g.cards.map((c) => renderRow(c, column))}</div>
                </div>
              )}
            </React.Fragment>
          );
        }

        /* ⚠️ ONLY HOUSEKEEPING FOLDS, AND `groupSlice` IS WHAT REFUSES THE REST. Hiding something
           that needs you now behind a "show more" is the one thing this page must not do — and
           the day's cleared work is never behind a toggle either (the rule the retired corner
           panel's spec carried). */
        const { visible, more } = groupSlice(g, hkExpanded);

        return (
          <div key={g.id} className="tdg-sect">
            <div className="tdg-shd">
              <h3>
                {g.id === "done"
                  ? <span className="tdg-foldchev" aria-hidden><ChevronDown size={13} /></span>
                  : <span className="tdg-dot" style={{ background: GROUP_DOT[g.id] }} aria-hidden />}
                {g.label}
              </h3>
              <span className="tdg-n">{g.cards.length}</span>
              <span className="tdg-desc">{g.description}</span>
            </div>
            {/* `grown` is what the stagger keys off — the fold's revealed rows, and only after a
                real expansion, so nothing animates on first paint (sheet 6: one entrance, then
                never again on filter or sort). */}
            <div className={`tdg-panel${g.id === "housekeeping" && hkExpanded ? " grown" : ""}`}>
              {visible.map((c) => renderRow(c, column))}
            </div>
            {more > 0 && (
              <div className="tdg-more">
                <button type="button" className="tdg-moreb" onClick={onToggleHk}>
                  <ChevronDown size={11} aria-hidden />
                  {showMoreLabel(more)}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
