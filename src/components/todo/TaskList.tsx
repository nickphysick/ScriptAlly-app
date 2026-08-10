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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronDown, Check } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup, TaskGroupId, groupSlice, showMoreLabel } from "../../lib/todoGroups";
/* P3 — what the row SAYS about its kind: the pill's tone, the primary's name, the journey.
   (Whether a verb exists at all stays `cardMenu`'s answer — see below.) */
import { rowPill, rowPrimaryLabel, rowJourney, splitMenu, splitWeight } from "../../lib/taskRow";
import { isTickable, completionVia } from "../../lib/todoActions";
import { listKey, isTypingTarget, KEY_MAP } from "../../lib/taskShortcuts";
import { cardMenu, MenuLeaf, MenuEntry, MenuItemId, placeMenu } from "../../lib/todoMenu";
import { TodoColumnId, isSweepCard } from "../../lib/todoColumns";
import { laterHideKey } from "../../lib/todoHousekeeping";
import { PortalMenu } from "./PortalMenu";
import { SnoozeDial, SnoozeDialBody } from "./SnoozeDial";
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
 * six tracks and the split's own 118px seat — so nothing shifts by a pixel when the data lands.
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
    <div className="tdg-acts"><span className="tdg-sk split" /></div>
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


/**
 * ⚠️ THE SPLIT'S MENU, AND WHERE DANGER SITS (Fix 4; ref todo-splitguard-v1.html §2). Safe verbs
 * first; the destructive pair last, below a 12px dead zone that takes no click and a hairline —
 * nothing destructive sits within a pointer's drift of the caret.
 *
 * ⚠️ IT OPENS WITH NOTHING PRE-FOCUSED, so Enter straight after opening does nothing. Focus goes
 * to the menu's own box, which answers Escape and the number keys but fires no verb.
 *
 * It reuses `.tbd-menu2` / `.tbd-mi` from todoBoard.css — the shell the portalled menu has always
 * worn. Those classes are LIVE despite living in the retired board's stylesheet (recorded in
 * reports/STATE.md against the parked sweep): consumed here, never edited.
 */
const SplitMenu: React.FC<{
  card: BoardCard;
  column: TodoColumnId;
  anchor: HTMLElement;
  onPick: (id: MenuItemId) => void;
  /** The dial's write, straight through — the menu decides nothing about it. */
  onSnooze: (days: number, when: string) => void;
  onClose: (returnFocus: boolean) => void;
}> = ({ card, column, anchor, onPick, onSnooze, onClose }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const sections = splitMenu(card, column, laterHideKey(card.taskType));

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const p = placeMenu(r, { w: b.width, h: b.height }, { w: window.innerWidth, h: window.innerHeight });
    setPos({ left: p.left, top: p.top });
    /* ⚠️ THE SLIDER TAKES FOCUS WHERE THERE IS ONE, AND THIS SUPERSEDES "NOTHING IS PRE-FOCUSED".
       That rule was written when the menu was a column of VERBS, where a pre-focused item made
       Enter fire something destructive-adjacent by accident. The snooze section is a control now:
       it opens on tomorrow, Enter commits, and open-then-Enter is the commonest move on the page —
       so the slider is focused deliberately, and the act it commits is reversible from its own
       receipt, which is what makes a one-key commit honest. Where the dial is greyed there is
       nothing to drive, so focus falls back to the BOX and Enter still does nothing. The child's
       `autoFocus` lands in the commit phase, i.e. BEFORE this effect — so this must not take it
       back, and the guard is what stops it. */
    if (!sections.some((sec) => sec.dial?.enabled)) el.focus({ preventScroll: true });
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (elRef.current?.contains(t) || anchor.contains(t))) return;
      onClose(false);
    };
    const away = () => onClose(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", away);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", away);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={elRef}
      tabIndex={-1}
      className="t-f12 tbd-menu2 tdg-splitmenu"
      role="menu"
      aria-label={`Actions for ${card.title}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      /* ⚠️ ESCAPE ONLY. The number keys are GONE, not merely unused: `1` and `2` fired the two
         preset snooze rows, and a continuous twelve-stop scale has no two stops worth a shortcut
         — picking tomorrow is now open-then-Enter, which is fewer keys than it was. A binding
         kept past the thing it selected is the next reader's puzzle, and worse, an invitation to
         re-point it at something arbitrary. */
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); onClose(true); }
      }}
    >
      {sections.map((sec, si) => (
        <React.Fragment key={si}>
          {sec.danger && <div className="tdg-deadzone" aria-hidden />}
          {sec.head && <div className="tbd-mhead">{sec.head}</div>}
          {/* ⚠️ THE SAME DIAL THE `s` KEY OPENS, worn inline — `SnoozeDialBody`, not a copy of it.
              ⚠️ AND WHERE IT CANNOT ACT IT IS GREY, NEVER ABSENT, wearing `.tbd-mi.dim` — the
              greyed grammar that already exists in this sheet rather than a fourth state rule.
              `aria-disabled` with no handler, because a `<button disabled>` would take the shape
              of something pressable and then refuse. */}
          {sec.dial && (sec.dial.enabled ? (
            <div className="tdg-mdial">
              <SnoozeDialBody card={card} onSnooze={onSnooze} autoFocus />
            </div>
          ) : (
            <div className="tbd-mi dim" role="menuitem" aria-disabled title={sec.dial.why}>
              <span className="tdg-mglyph" aria-hidden>◷</span>
              {sec.dial.why}
            </div>
          ))}
          {sec.items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className={`tbd-mi${it.enabled ? "" : " dim"}`}
              disabled={!it.enabled}
              title={it.why}
              onClick={() => onPick(it.id)}
            >
              <span className="tdg-mglyph" aria-hidden>{it.glyph}</span>
              {it.label}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>,
    document.body,
  );
};

export const TaskList: React.FC<TaskListProps> = ({ groups, hkExpanded, onToggleHk, onOpen, onTick, onVerb, onSnooze, loading = false }) => {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  /* ⚠️ THE DIAL IS THE CLOCK'S SURFACE NOW (P4) — it replaced the ⋯ menu's snooze submenu at THIS
     one call site, which is exactly why the clock was routed through a pre-opened submenu in P2
     rather than growing a chooser of its own. The ⋯ menu keeps its tiers for the keyboard path
     and for Snoozed's "Change the date…"; they resolve through the same `clampSnooze`. */
  const [dial, setDial] = useState<{ card: BoardCard; anchor: HTMLElement } | null>(null);
  /* The split's menu — anchored to the whole control rather than to the caret, so it lines up with
     the button's edge instead of hanging off a 34px sliver. */
  const [split, setSplit] = useState<{ card: BoardCard; column: TodoColumnId; anchor: HTMLElement } | null>(null);
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

  /* ⚠️ ONE WAY IN TO EVERY VERB (Fix 4). The split's primary, its menu and the number keys all
     come through here, which resolves the id against `cardMenu` and hands the LEAF to the page's
     existing performer. Nothing about the write path changed: what invokes it did. */
  const fire = (c: BoardCard, column: TodoColumnId, id: MenuItemId) => {
    const leaf = cardMenu(c, column)
      .flatMap((g) => g.entries)
      .flatMap((e) => (e.kind === "leaf" ? [e] : e.sub))
      .find((l) => l.id === id);
    /* `dismiss-rule` on a non-sweep is the MUTE, which `cardMenu` only lists for sweeps — the page
       performs it from the same leaf shape, so the menu model stays untouched. */
    onVerb(c, leaf ?? { kind: "leaf", id, label: id }, column);
  };

  const openSplit = (anchor: HTMLElement, c: BoardCard, column: TodoColumnId) =>
    setSplit((s2) => (s2?.card.key === c.key ? null : { card: c, column, anchor }));

  /* ⚠️ THE GROUP IS THREADED, AND `groupColumn` CANNOT CARRY IT. That function collapses five
     group ids onto three columns — `now`, `housekeeping` and `yours` all land on `todo` — which is
     right for the MENU (a card's permissions follow its state: live, asleep, finished) and useless
     for weight, which is exactly the distinction the columns threw away. So the group rides beside
     the column rather than being recovered from it. */
  const renderRow = (c: BoardCard, column: TodoColumnId, group: TaskGroupId) => {
    const menuModel = cardMenu(c, column);
    const sweep = isSweepCard(c);
    const fig = sweep ? sweepFigure(c) : null;
    const pill = rowPill(c, column);
    const journey = rowJourney(c, column);
    const weight = splitWeight(group);

    /* ⚠️ THE PRIMARY. THE MENU SAYS WHETHER, `taskRow` SAYS WHAT IT IS CALLED. Absent where the
       TICK IS THE ACT: a writer's own item is finished by ticking it, so a second verb beside the
       circle would be two names for one act.
       ⚠️ AND IT NO LONGER CARRIES A `ghost` FLAG. It briefly did, meaning "Undo on a finished row
       is a way back rather than an act" — a ROW-STATE reason wearing the same class the GROUP
       weight now sets. One class with two reasons behind it is one that eventually contradicts
       itself, so the row-state flag is deleted and Done reaches the outlined weight the honest
       way: it is not the urgent group. Same pixels, better rule. */
    const primary: { id: MenuItemId; label: string } | null =
      column === "done" ? (offers(menuModel, "undo-done") ? { id: "undo-done", label: rowPrimaryLabel(c, column) } : null)
      : column === "snoozed" ? { id: "unsnooze", label: rowPrimaryLabel(c, column) }
      : completionVia(c) === "user-task" ? null
      : { id: "action", label: rowPrimaryLabel(c, column) };

    /* ⚠️ THE FOUR SLOTS ARE RETIRED (fix pack Fix 4). Snooze and dismiss are in the split's menu
       now, and with every row carrying ONE identical control the empty-slot alignment device has
       nothing left to align — so it is deleted rather than left inert. */
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

        <div className="tdg-acts" onClick={(e) => e.stopPropagation()}>
          {primary && (
            /* ⚠️ ONE CONTROL, TWO HALVES, AND THE SEAM IS DEFENDED FOUR WAYS (ref
               todo-splitguard-v1.html). The wrapper takes NO click of its own: the 3px seam
               belongs to neither half and must fire nothing, which it does by there being no
               handler above the halves to fall through to. */
            <span className={`tdg-split${weight === "outlined" ? " ghost" : ""}`}>
              {/* ⚠️ COMMIT ON RELEASE, NOT ON PRESS. `onClick` fires only when press AND release
                  land on the same element, so pressing the wrong half and sliding off does
                  nothing — that is the browser's own guarantee rather than a handler of ours.
                  ⚠️ AND THIS IS THE SINGLE TAB STOP: the caret is `tabIndex={-1}`, so Tab reaches
                  the split once, Enter fires the primary, and ↓ opens the menu from here. The
                  caret is never the only route in. */}
              <button
                type="button"
                className="tdg-split-p"
                onClick={() => fire(c, column, primary.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault(); e.stopPropagation();
                    openSplit(e.currentTarget.parentElement as HTMLElement, c, column);
                  }
                }}
              >
                {primary.label}
              </button>
              <span className="tdg-split-seam" aria-hidden />
              <button
                type="button"
                tabIndex={-1}
                className="tdg-split-c"
                aria-haspopup="menu"
                aria-expanded={split?.card.key === c.key}
                aria-label={`More actions for ${c.title}`}
                onClick={(e) => { e.stopPropagation(); openSplit(e.currentTarget.parentElement as HTMLElement, c, column); }}
              >
                <ChevronDown size={13} aria-hidden />
              </button>
            </span>
          )}
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
      {split && (
        <SplitMenu
          card={split.card}
          column={split.column}
          anchor={split.anchor}
          onPick={(id) => { setSplit(null); fire(split.card, split.column, id); }}
          /* ⚠️ THE DIAL'S WRITE IS THE PAGE'S OWN `onSnooze` — the same one the popover dial has
             always called, already clamped and re-labelled by `clampSnooze` inside the body. The
             menu closes because the act is done, exactly as picking a verb closes it. */
          onSnooze={(days, when) => { setSplit(null); onSnooze(split.card, days, when); }}
          onClose={(returnFocus) => {
            if (returnFocus) (split.anchor.querySelector(".tdg-split-p") as HTMLElement | null)?.focus();
            setSplit(null);
          }}
        />
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
                  <div className="tdg-panel">{g.cards.map((c) => renderRow(c, column, g.id))}</div>
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
              {visible.map((c) => renderRow(c, column, g.id))}
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
