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
 * cells promoted to grid items: `contents` deletes the row's box, so hover, focus and the selected
 * band fracture into separate rectangles and the divider has nothing to hang off. The rule is
 * load-bearing enough to be tested rather than commented (`tasksList.test.tsx`).
 *
 * ⚠️ FOUR TRACKS SINCE THE RAIL (rail + workspace, Phase 3) — checkbox · StatusDot · content ·
 * actions. The pill and the age lost their lanes to the CAPTION and the journey meter moved
 * INSIDE the content cell, because at a 440px rail six lanes left the title 33px. Neither was
 * ever a column of facts you scan down; they are clauses about one row.
 *
 * ⚠️ WHICH VERB SLOTS FILL IS ASKED OF THE MENU MODEL, NEVER OF A SECOND PER-KIND TABLE. The
 * menu says WHETHER, `taskRow` says WHAT IT IS CALLED, so the row and the menu cannot disagree
 * about what a card allows.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight, ChevronDown, Check,
  Clock, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup, groupSlice, showMoreLabel } from "../../lib/todoGroups";
/* P3 — what the row SAYS about its kind: the pill's tone, the primary's name, the journey.
   (Whether a verb exists at all stays `cardMenu`'s answer — see below.) */
/* ⚠️ THE ROW'S OWN DERIVATIONS NARROWED WITH IT (visual rebuild, Phase 2). `rowPill`, `rowJourney`,
   `rowTitleParts` and `rowReversalIcon` all survive in `taskRow` — the workspace card and the
   command bar read them — but the ROW no longer draws a pill-in-caption, a meter, a two-weight
   title or a reversal icon. Imports removed rather than left unreferenced: an unused import is a
   map somebody re-wires. */
import { rowPrimaryLabel, splitMenu } from "../../lib/taskRow";
import { cardBucket, BUCKET_LABEL, rowDeed, rowMeta, RowFigure } from "../../lib/todoBuckets";
import { StatusDot } from "../StatusDot";
import { RowTip, useTipShow } from "./RowTip";
import { isTickable, completionVia } from "../../lib/todoActions";
import { listKey, isTypingTarget, KEY_MAP } from "../../lib/taskShortcuts";
import { cardMenu, MenuLeaf, MenuEntry, MenuItemId, placeMenu } from "../../lib/todoMenu";
import { TodoColumnId } from "../../lib/todoColumns";
import { laterHideKey } from "../../lib/todoHousekeeping";
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
  /**
   * ⚠️ THE FIGURE IS RESOLVED BY THE PAGE, NOT BY THE ROW. It needs the agent's stated window, the
   * CTA engine's ball-holder and the clock — three things the list has no business holding. The
   * page passes a resolver, exactly as it does for the pane's hand-off, so the derivation stays
   * where the data is and the row stays a renderer.
   */
  figure: (card: BoardCard) => RowFigure;
  /**
   * ⚠️ WHAT THE WORKSPACE PANE IS SHOWING — and it is the PANE'S key, never a second selection
   * the list keeps for itself (rail + workspace, Phase 3). Two surfaces holding their own idea of
   * "the current one" is the drift this whole page is built against; the rail marks what the pane
   * has, which is why the mark cannot be wrong.
   *
   * Absent means nothing is open, and no row is marked. The rail is legible either way.
   */
  selectedKey?: string;
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
  urgent: "#d98b74",
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
 * tracks — so nothing shifts by a pixel when the data lands. A bespoke skeleton with its own
 * measurements would be a second layout to keep in step with the first, and the day they drift is
 * the day the page jumps on load. FOUR tracks since Phase 3, and it follows: a skeleton on the old
 * six would have been a placeholder for a shape the loaded row no longer has, which is precisely
 * the fault its own note below warns about.
 *
 * ⚠️ ITS ACTION CELL IS EMPTY, AND THAT IS THE FAITHFUL SHAPE. The cluster renders NOTHING at
 * rest, so a placeholder there would show a shape the loaded row does not have.
 *
 * Two groups, as the ref says: in practice the first arrive and the rest follow without a spinner.
 */
const SkeletonRow: React.FC = () => (
  <div className="tdg-row" aria-hidden>
    <div className="tdg-cc"><span className="tdg-sk tick" /></div>
    <div className="tdg-cc"><span className="tdg-sk dot" /></div>
    <div className="tdg-content"><div className="tdg-sk t" /><div className="tdg-sk sub" /></div>
    <div className="tdg-acts" />
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
 * ⚠️ ONE ICON, ITS TOOLTIP AND ITS DIM STATE, IN ONE PLACE. The alternative was four copies of the
 * hover/focus wiring in the row, which is four chances for one of them to lose its keyboard path.
 *
 * ⚠️ AN INAPPLICABLE ICON IS `aria-disabled` ON A LIVE BUTTON, NOT `disabled`. A disabled button
 * takes no hover and no focus — so its tooltip, which is the ONLY thing that explains why it is
 * dim, would be unreachable by either pointer or keyboard. The click is refused in the handler
 * instead, which keeps the explanation reachable and the refusal real.
 */
const RowIcon: React.FC<{
  Glyph: LucideIcon;
  label: string;
  hint?: string;
  enabled: boolean;
  /** Shown in place of the deed when the icon is dim — it must say WHY, not repeat the name. */
  why?: string;
  kind?: "prim" | "dz";
  expanded?: boolean;
  onFire: (anchor: HTMLElement) => void;
}> = ({ Glyph, label, hint, enabled, why, kind, expanded, onFire }) => {
  const btn = useRef<HTMLButtonElement | null>(null);
  const { shown, show, hide } = useTipShow();
  return (
    <button
      ref={btn}
      type="button"
      className={`tdg-ic${kind ? " " + kind : ""}${enabled ? "" : " off"}`}
      aria-label={enabled ? label : `${label} — ${why ?? "not available"}`}
      aria-disabled={enabled ? undefined : true}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      aria-expanded={expanded}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={(e) => { e.stopPropagation(); if (enabled) onFire(e.currentTarget); }}
    >
      <Glyph size={14} aria-hidden />
      {shown && <RowTip label={enabled ? label : (why ?? label)} hint={enabled ? hint : undefined} anchor={btn.current} />}
    </button>
  );
};

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
  /** ⚠️ THE MENU HANDS THE DIAL OFF; IT NO LONGER WEARS ONE. See the `Snooze…` row below. */
  onOpenDial: () => void;
  onClose: (returnFocus: boolean) => void;
}> = ({ card, column, anchor, onPick, onOpenDial, onClose }) => {
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
    /* ⚠️ NOTHING IS PRE-FOCUSED, AND THAT RULE IS BACK RATHER THAN NEW. It was suspended for one
       pack while this menu WORE the snooze dial — a control that opens on tomorrow and commits on
       Enter earns its focus. The menu is a column of VERBS again, so a pre-focused item would put
       Enter a slip from Dismiss. Focus goes to the box, which answers Escape and fires nothing. */
    el.focus({ preventScroll: true });
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
          {sec.items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className={`tbd-mi${it.enabled ? "" : " dim"}`}
              disabled={!it.enabled}
              title={it.why}
              /* ⚠️ A ROW THAT OPENS A SURFACE IS NOT A ROW THAT PERFORMS A VERB, and the MODEL says
                 which it is. `Snooze…` hands off to the one dial; everything else resolves through
                 `cardMenu` as it always did. Deciding this here by matching on the id would put
                 "which id opens the dial" in a second place. */
              onClick={() => (it.opens === "dial" ? onOpenDial() : onPick(it.id))}
            >
              <span className="tdg-mglyph" aria-hidden>{it.glyph}</span>
              {it.label}
              {it.hint && <span className="tdg-mkey" aria-hidden>{it.hint}</span>}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>,
    document.body,
  );
};

export const TaskList: React.FC<TaskListProps> = ({ groups, hkExpanded, onToggleHk, onOpen, onTick, onVerb, onSnooze, selectedKey, figure: figureFor, loading = false }) => {
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
  /* the day's cleared work, folded away by default — stated, not displayed */
  const [dnOpen, setDnOpen] = useState(false);
  /* A sweep's session-high member count — DERIVED VIEW MEMORY, carried over from the board's own
     rail rather than re-derived: with a baseline the meter can say "5 OF 16" as the pile shrinks,
     and a pile you have not started is a pile rather than a 0% failure. */
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

  /* (⚠️ `sweepFigure` IS RETIRED WITH THE METER IT FED — visual rebuild, Phase 2. It turned a
     sweep's remaining count into "5 OF 16 DONE" for the row's bar; the row has no bar. Its
     session-high `sweepBase` ref went with it. Deleted rather than left unreferenced, so a future
     meter is a deliberate rebuild rather than a resurrection of a shape nobody chose.) */

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
    if (action === "close") {
      /* ⚠️ THE ORDER IS DIAL, THEN MENU, THEN THE MAP — innermost first, so Escape never closes
         two things at once. It is NOT stopped: the page beyond has its own Escape business.
         ⚠️ AND IT IS `close`, NOT `dismiss`, SINCE `x` TOOK THAT WORD. Shutting a surface and
         putting a card away are different acts; one name for both is how a handler comes to
         close a menu when it meant to dismiss a task. */
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
    /* ⚠️ EVERY ROW KEY CALLS WHAT ITS ICON CALLS — the four that the tooltips advertise reach the
       same handlers the pointer does, so the two paths cannot come to mean different things. The
       icon is the taught form of the key; if they diverged, the tooltip would be teaching a lie.
       Permission is still asked of `cardMenu`, once, exactly as the icons ask it. */
    const el = rowEls.current.get(c.key);
    /* ⚠️ `↵` OPENS, ON EVERY GROUP. It used to fire icon 1's deed exactly, which meant it
       reversed on Done and Snoozed and acted everywhere else; with the pane, opening IS the row's
       deed on all five groups. A key that meant two things depending on which group you were in
       would be worse than any icon asymmetry — an icon has a glyph and a tooltip to explain
       itself, and a key has neither. Undo and Return stay reachable by icon and by ⋯. */
    if (action === "primary") { onOpen(c); return; }
    if (action === "snooze") {
      if (el && offers(cardMenu(c, column), "snooze-1")) setDial({ card: c, anchor: el });
      return;
    }
    if (action === "dismiss") {
      if (offers(cardMenu(c, column), "dismiss-week")) fire(c, column, "dismiss-week");
      return;
    }
    if (action === "more") { if (el) openSplit(el, c, column); return; }
    if (action === "open") {
      if (offers(cardMenu(c, column), "open-query")) fire(c, column, "open-query");
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

  /**
   * ⚠️ WHICH LEAF IS THE ROW'S PRIMARY — ONE ANSWER, READ BY THE ICON AND BY `↵` (P3). The row
   * used to compute this inline while the keyboard's Enter did something else entirely (it opened
   * the dock, whatever the row was), so on a Done row the icon said Undo and the key said dock.
   * Two derivations of "what is this row's deed" is exactly the drift the whole page is built to
   * avoid; `null` means the deed is not a menu verb — see `firePrimary`.
   */
  const primaryId = (c: BoardCard, column: TodoColumnId): MenuItemId | null =>
    column === "done" ? (offers(cardMenu(c, column), "undo-done") ? "undo-done" : null)
    : column === "snoozed" ? "unsnooze"
    : completionVia(c) === "user-task" ? null
    : "action";

  /**
   * ⚠️ THE REVERSAL FIRES ONLY WHERE THERE IS ONE — Done undoes, Snoozed returns, and nothing
   * else has this icon at all. `↵` no longer arrives here: the key is bound to OPEN on every
   * group now, because that is the row's deed on all five. The comment that used to bind icon 1
   * and the key to one deed is struck rather than edited; it was true and is not now.
   */
  const fireReversal = (c: BoardCard, column: TodoColumnId) => {
    const id = primaryId(c, column);
    if (id) fire(c, column, id);
  };

  /* ⚠️ THE GROUP IS THREADED, AND `groupColumn` CANNOT CARRY IT. That function collapses five
     group ids onto three columns — `now`, `housekeeping` and `yours` all land on `todo` — which is
     right for the MENU (a card's permissions follow its state: live, asleep, finished) and useless
     for weight, which is exactly the distinction the columns threw away. So the group rides beside
     the column rather than being recovered from it. */
  const renderRow = (c: BoardCard, column: TodoColumnId) => {
    const menuModel = cardMenu(c, column);

    /* ⚠️ THE REVERSAL, ON THE TWO STATE GROUPS ONLY (Phase 3). On the three KIND groups the old
       first icon repeated a control already on the row — the row click, or the checkbox in lane
       one — so it is gone from them; Done and Snoozed keep one constant verb each. */
    const bucket = cardBucket(c);
    const figure = figureFor(c);
    const tickable = isTickable(c);

    return (
      <div
        key={c.key}
        data-tdgkey={c.key}
        ref={(el) => { if (el) rowEls.current.set(c.key, el); else rowEls.current.delete(c.key); }}
        className={`tdg-row${c.key === selectedKey ? " sel" : ""}${c.done ? " done" : ""}${pending.has(c.key) ? " pend" : ""}${rung.has(c.key) ? " rung" : ""}`}
        aria-current={c.key === selectedKey || undefined}
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

        {/* ⚠️ LANE 2 — THE BUCKET PILL, LEADING THE ROW (visual rebuild, Phase 2). It says what KIND
            OF ACT this is — Send · Decide · Chase · Close · Fix · Note — which is the question a
            writer scanning a list actually has. It replaces the StatusDot, which said where a
            QUERY stood in a pipeline: a fact about the record rather than about the work, and one
            the card's journey meter and the pane's timeline both still carry.
            ⚠️ SENTENCE CASE, not caps — at 8.5px with letter-spacing, caps are a texture rather
            than a word. */}
        <div className={`tdg-bpill b-${bucket}`}>{BUCKET_LABEL[bucket]}</div>

        <div className="tdg-content">
          {/* ⚠️ LINE ONE IS THE DEED ALONE — "Send your full", never "Send your full to Marcus
              Reed". The agent moves to line two so line one scans as a column of verbs, which is
              what makes a long list readable at a glance. The deed is DERIVED from the task rather
              than sliced out of `title`: cutting a composed sentence at " to " would break the
              first time one was phrased differently, and silently. */}
          <div className={c.nature === "note" ? "tdg-notett" : "tdg-t"}>{rowDeed(c)}</div>
          {/* ⚠️ LINE TWO IS THE AGENT AND THE AGENCY, ONE LINE, ELLIPSISED — AND NO DATE. The time
              lives in the figure column; a date here would be the same fact twice on one row. A
              card with no agent shows whatever stands in for one. */}
          {/* ⚠️ ONE DERIVATION, AND THE ROW COMPOSES NOTHING (corrections, Phase 2). This read
              `{who} · {record}` — and `record` is ALREADY "name · agency", so the line printed
              "Tom Ellery · Tom Ellery · Curtis Vane". The composition upstream was never wrong; a
              second one was layered over it. */}
          <div className="tdg-sub">{rowMeta(c)}</div>
        </div>

        {/* ⚠️ THE FIGURE COLUMN — a mono label over a Playfair numeral, and the SAME pairing the
            workspace card's facts strip uses. That match is what makes the two panes read as one
            page rather than as two designs.
            ⚠️ THE WHOLE STACK FADES ON HOVER AND THE VERBS TAKE ITS SLOT, so nothing reflows: the
            column is one width whether it is showing a figure or two icons. */}
        <div className={`tdg-fig ${figure.side}`}>
          <div className="tdg-figstack">
            <div className="tdg-figlab">{figure.label}</div>
            <div className="tdg-figval">
              {/* ⚠️ A WORD IS NOT A NUMERAL (corrections, Phase 3c). "Today" at the numeral's 21px
                  shouts down a column of two-digit figures. Same family, same weight, same colour
                  — 15px — so the column still aligns without one word dominating the rail. The
                  test is `unit`: a figure with no unit is a word, which is the same fact the
                  derivation already decided rather than a second guess at it. */}
              <span className={`tdg-fignum${figure.unit ? "" : " word"}${figure.hot ? " hot" : ""}`}>{figure.value}</span>
              {figure.unit && <span className="tdg-figun">{figure.unit}</span>}
            </div>
          </div>
          {/* ⚠️ TWO VERBS, OVER THE FADED STACK (Phase 2). Absolutely positioned in the figure's
              own slot, so the row cannot reflow between rest and hover. The dim-in-place rule
              survives intact: an inapplicable verb greys and stays — an offer cannot be dismissed
              — so the two never trade places.
              ⚠️ THE ⋯ AND THE REVERSAL LEAVE THE ROW. v9 draws two verbs here and the column is
              104px; a four-icon cluster does not fit over a figure it is overlaying. Everything
              the ⋯ reached is on the COMMAND BAR (Phase 4), the page's one action surface — so
              nothing became unreachable, it moved to where the pack put it. */}
          <div className="tdg-acts" onClick={(e) => e.stopPropagation()}>
          <RowIcon
            Glyph={Clock}
            label="Snooze"
            hint="S"
            enabled={offers(menuModel, "snooze-1")}
            why="A finished task has nothing left to put off."
            onFire={(el) => setDial({ card: c, anchor: el })}
          />
          <RowIcon
            kind="dz"
            Glyph={X}
            label="Dismiss"
            hint="X"
            enabled={offers(menuModel, "dismiss-week")}
            why={c.taskType === "offer_received"
              ? "Offers cannot be dismissed — the reply-by date is not yours to move."
              : "There is nothing here to dismiss."}
            onFire={() => fire(c, column, "dismiss-week")}
          />
          </div>
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
          /* ⚠️ ONE SNOOZE SURFACE, FOUR DOORS ONTO IT. The menu closes and the DIAL opens, anchored
             to the icon that opened the menu — so the `Snooze…` row, icon 2, the `S` key and
             Snoozed's "Change the date…" all arrive at the same control in the same place. The
             menu wore its own inline copy for one pack; two surfaces for one act is how they come
             to disagree about a ceiling. */
          onOpenDial={() => { setSplit(null); setDial({ card: split.card, anchor: split.anchor }); }}
          onClose={(returnFocus) => {
            /* ⚠️ FOCUS RETURNS TO THE ICON THAT OPENED IT — the anchor IS that button now. It used
               to hunt for `.tdg-split-p` INSIDE the anchor, because the anchor was the split's
               wrapper and the primary half was where focus belonged; with the caret retired the
               anchor is the control, and the old query would silently find nothing and drop focus
               to the body. (Caught by the lock that says no `.tdg-split-` survives.) */
            if (returnFocus) split.anchor.focus();
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

        /**
         * ⚠️ DONE TODAY GATHERS AT THE FOOT, COLLAPSED (visual rebuild, Phase 2). A ticked row
         * sitting among live ones is a row you have to re-read to know you have finished it, and
         * after a busy morning the list is mostly memory. It keeps its own header with a count so
         * the day's work is still stated — cleared is not the same as gone.
         *
         * ⚠️ IT IS THE GROUP'S OWN CARDS, not a second collection. `taskGroups` already partitions
         * Done; this only changes how that partition is DRAWN.
         */
        if (g.id === "done") {
          return (
            <React.Fragment key={g.id}>
              <button
                type="button"
                className="tdg-dnhead"
                aria-expanded={dnOpen}
                onClick={() => setDnOpen((v) => !v)}
              >
                <h3>{g.label}</h3>
                <span className="n">{g.cards.length}</span>
                <span className="tdg-dncar" aria-hidden><ChevronRight size={13} /></span>
              </button>
              {dnOpen && (
                <div className="tdg-sect">
                  <div className="tdg-panel">{g.cards.map((c) => renderRow(c, column))}</div>
                </div>
              )}
            </React.Fragment>
          );
        }

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
          <div key={g.id} className={`tdg-sect g-${g.id}`}>
            <div className="tdg-shd">
              {/* Done and Snoozed both return above, so every group reaching here is a live KIND
                  and every one of them takes the dot. The chevron branch went with the fold. */}
              <h3>
                <span className="tdg-dot" style={{ background: GROUP_DOT[g.id] }} aria-hidden />
                {g.label}
              </h3>
              <span className="tdg-n">{g.cards.length}</span>
              {/* ⚠️ THE SUBTITLE IS GONE (visual rebuild, Phase 3). "An agent is waiting, or a date
                  is" explained what a section was back when a section was a line of text; the band
                  and the count say it now. `TaskGroup.description` survives in the derivation —
                  the Noteboard and the chips' own copy read the same module — but the rail does
                  not render it. A tinted band you can see does not need a sentence telling you it
                  is a section. */}
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
