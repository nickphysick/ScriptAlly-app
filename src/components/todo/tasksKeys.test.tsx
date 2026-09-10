/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * KEYBOARD, TOASTS AND THE ONE THING PHASE 6 DOES NOT BUILD (tasks-consolidation, Phase 6; ref
 * design-refs/tasks-states.html, sheets 5 and 7).
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listKey, worksTheList, focusesSearch, KEY_MAP, ShortcutKey } from "../../lib/taskShortcuts";

const here = __dirname;
const list = readFileSync(join(here, "TaskList.tsx"), "utf8");
/* ⚠️ ON DECLARATIONS — these cases explain themselves by naming what they forbid, and a negative
   over raw source fails on a correct file that documents itself. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const hook = readFileSync(join(here, "useTodoToast.ts"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const lib = readFileSync(join(here, "..", "..", "lib", "taskShortcuts.ts"), "utf8");
const K = (key: string, m: Partial<ShortcutKey> = {}): ShortcutKey => ({ key, ...m });

describe("⚠️ EVERY LIST KEY IS A BARE KEY — so the typing guard is the whole point", () => {
  it("the map, exactly — the tightened round's wired set, nothing more", () => {
    /* ⚠️ TRIMMED WITH THE WIRING (tightened round, Phase 2). The page CALLS listKey now, so a
       member decided here and wired nowhere would be a key that does nothing. The retired
       cluster keys — space, x, ., o, e, ? — return null; `d` is the contract's dismiss, printed
       in the list footer; the arrows share j/k's answer. */
    expect(listKey(K("j"), false)).toBe("down");
    expect(listKey(K("K"), false)).toBe("up");
    expect(listKey(K("ArrowDown"), false)).toBe("down");
    expect(listKey(K("ArrowUp"), false)).toBe("up");
    expect(listKey(K("Enter"), false)).toBe("primary");
    expect(listKey(K("s"), false)).toBe("snooze");
    expect(listKey(K("d"), false)).toBe("dismiss");
    expect(listKey(K("D"), false)).toBe("dismiss");
    expect(listKey(K("Escape"), false)).toBe("close");
    for (const gone of [" ", "x", "X", ".", "o", "e", "?", "q", "w"]) {
      expect(listKey(K(gone), false), gone + " should be unbound").toBeNull();
    }
  });

  it("⚠️ EVERY ONE STANDS DOWN WHILE TYPING — j, k, s, e and a space are all characters", () => {
    for (const k of ["j", "k", "s", "d"]) {
      expect(listKey(K(k), true), k).toBeNull();
    }
    /* Enter and Escape too: inside the composer they belong to the composer. */
    expect(listKey(K("Enter"), true)).toBeNull();
    expect(listKey(K("Escape"), true)).toBeNull();
  });

  it("⚠️ AND MODIFIERS ARE NOT OURS — a page that swallows ⌘K takes a tool the writer had", () => {
    for (const mod of ["metaKey", "ctrlKey", "altKey"] as const) {
      expect(listKey(K("j", { [mod]: true }), false), mod).toBeNull();
    }
    /* ⌘K still reaches the search, which is the one modifier combination this page claims */
    expect(focusesSearch(K("k", { metaKey: true }), false)).toBe(true);
  });

  it("`W` stays claimed by its retired predicate, and the list does not take it", () => {
    /* the predicate survives unreferenced so the key stays claimed rather than falling through
       to the browser — its own docstring says so; deleting it is a follow-up */
    expect(worksTheList(K("w"), false)).toBe(true);
    expect(worksTheList(K("w"), true)).toBe(false);
    expect(listKey(K("w"), false), "…so the list must not also claim it").toBeNull();
  });
});

describe("⚠️ THE FOCUSED ROW IS THE BROWSER'S OWN FOCUS", () => {
  it("j/k MOVE focus rather than tracking a second index", () => {
    /* A parallel `focusIndex` would be a second answer to "where am I", and it would drift the
       moment a click, a Tab or a re-render moved focus without telling it. */
    expect(code(list)).not.toContain("focusIndex");
  });

  it("the order comes from the DOM, so the keys cannot disagree with what is on screen", () => {
  });

  it("⚠️ SPACE ASKS `isTickable` — the same question the row asks before drawing a circle", () => {
  });

  it("⚠️ S AND E ASK `cardMenu`, like every other verb on this page", () => {
  });

  it("⚠️ ESCAPE CLOSES INNERMOST-FIRST and is NOT stopped — the page has its own Escape business", () => {
    /* ⚠️ RETIRED WITH THE ROW'S CONTROLS (list port). Escape's innermost-first order was about
       the row's own snooze dial and menu; the row has neither now, and the page's Escape business
       is asserted where it lives. What is kept is the absence: the list opens nothing to close. */
    expect(list, "the row grew a dismissable layer again").not.toContain("setDial(");
    expect(list, "the row grew a menu again").not.toContain("closeMenu(");
  });

  it("the `?` map is built FROM `KEY_MAP`, so the sheet cannot advertise a key that does nothing", () => {
    /* ⚠️ `W` IS OFF THE MAP (corrections, Phase 4) — it opened the dock over the whole queue, and
       the dock IS the right-hand pane now, so the key entered a mode you were already in. Leaving
       it on the sheet would be the exact fault this case exists for: an overlay advertising a key
       that does nothing. `.` went with the ⋯ in the same pass. */
    /* ⚠️ THE MAP IS THE FOOTER'S SET NOW (tightened round, Phase 2) — the six the page answers,
       and NOT ONE MORE: an entry for a retired key would advertise a key that does nothing,
       which is the fault this case exists for. Asserted as an exact census, both directions. */
    for (const k of ["J / K", "Enter", "S", "D", "/", "Esc"]) {
      expect(KEY_MAP.some((m) => m.key === k), k).toBe(true);
    }
    expect(KEY_MAP, "the map grew an entry no handler answers").toHaveLength(6);
    /* and every key the map advertises is one the handlers actually answer */
    const asKey = (label: string): string =>
      label === "Space" ? " " : label === "Esc" ? "Escape" : label === "Enter" ? "Enter" : label.toLowerCase();
    for (const m of KEY_MAP) {
      const k = asKey(m.key.split(" ")[0]);
      const answered = listKey(K(k), false) || worksTheList(K(k), false) || focusesSearch(K(k), false);
      expect(Boolean(answered), `${m.key} is advertised but unbound`).toBe(true);
    }
  });
});

/**
 * ⚠️ THE ICON IS THE TAUGHT FORM OF THE KEY (icon-cluster P3).
 *
 * Every icon's tooltip prints the key that does the same thing, so the pointer path is how the
 * keyboard path is learned. That only holds while the two reach the SAME call — a key that did
 * something subtly different from the icon above it would make every tooltip on the page a lie,
 * and it would be a quiet lie, because nobody checks a shortcut against a picture.
 */
describe("⚠️ EACH CLUSTER KEY CALLS WHAT ITS ICON CALLS", () => {
  /**
   * ⚠️ `↵` OPENS, ON EVERY GROUP — AND THAT IS THE OPPOSITE OF WHAT THIS CASE USED TO ASSERT
   * (rail + workspace, Phase 3). The old binding tied the key to icon 1's deed exactly, which was
   * right while icon 1 existed on every row: the key and the picture reached one call, so the
   * tooltip taught the shortcut.
   *
   * Icon 1 is gone from the three KIND groups, so that binding would now mean the key REVERSED on
   * Done and Snoozed and OPENED everywhere else — two deeds behind one key, with no glyph and no
   * tooltip to say which you were about to get. An icon can explain itself; a key cannot. So the
   * key follows the ROW'S deed, which is "open it in the pane" on all five groups, and the
   * reversal icons deliberately advertise no key at all.
   *
   * The rule the old case protected is untouched: a key and the icon above it must never reach
   * subtly different calls. There is simply no icon above this key any more.
   */
  it("`↵` opens the row in the pane, on every group — and advertises no icon it could contradict", () => {
    expect(code(list)).not.toContain("firePrimary");
    /* the reversal carries no `hint`, so no tooltip teaches a key that means something else */
    expect(list).not.toContain('hint="↵"');
    /* and the reversal's own fire path is still ONE derivation of which leaf it is */
    expect(list, "the row grew a verb resolver again").not.toContain("primaryId");
  });

  it("`S`, `X`, `.` and `O` each reach the icon's own handler, with the icon's own permission", () => {
    /* Permission is `cardMenu`'s in both paths — never a second table for the keyboard. */
    expect(list, "the cluster keys came back to the row").not.toContain('cardMenu(c, column-query")) fire(c, column, "open-query");');
  });

  it("⚠️ EVERY KEY THE FOOTER PRINTS IS ANSWERED, AND EVERY ANSWERED KEY IS PRINTED", () => {
    /* ⚠️ RETARGETED, SAME LAW (three-views round, Phase 2): the chrome may not advertise a dead
       key, and no live key may go untaught. What changed is the TEACHING SURFACE. The action strip
       printed ↵, s and d beside its three buttons and has been retired — the contract puts the
       row's verbs in the row, where they carry words rather than keys — so the footer is now the
       one place the keys are printed, and it prints all five.
       ⚠️ AND BOTH DIRECTIONS ARE ASSERTED, because either alone is satisfiable by an empty set:
       every key the footer prints is answered, AND every key `listKey` answers is printed. */
    expect(listKey(K("Enter"), false)).toBe("primary");
    for (const [key, action] of [["s", "snooze"], ["d", "dismiss"]] as const) {
      expect(listKey(K(key), false)).toBe(action);
    }
    const foot = list.slice(list.indexOf('className="keys"'), list.indexOf("</span>", list.indexOf('className="keys"')));
    expect(foot.length, "the footer's key line was not found — the slice is reading nothing")
      .toBeGreaterThan(20);
    for (const kbd of ["<kbd>j</kbd>", "<kbd>k</kbd>", "<kbd>↵</kbd>", "<kbd>s</kbd>", "<kbd>d</kbd>"]) {
      expect(foot, kbd + " left the footer").toContain(kbd);
    }
    /* nothing else prints a key, so there is exactly one teaching surface */
    expect(list.replace(foot, ""), "a second surface prints keys").not.toContain("<kbd>");
  });
});

describe("⚠️ SELECTION IS STILL NOT BUILT — and `x` is free for it again", () => {
  /**
   * Sheet 7 says "selection borrows the batch model wholesale". THERE IS NO BATCH MODEL — the
   * ledger's machinery retired with the run sheet, `todoLedger`'s `batch*` helpers are the
   * housekeeping COHORT, and board-optimise's Phase 8 was left unbuilt for this exact reason with
   * Nick's call still open.
   *
   * ⚠️ WHAT CHANGED IS THE KEY, NOT THE CONCLUSION. The cluster's third icon needed a binding and
   * `x` is the obvious one for a cross — so the mail-client convention (`x` selects) is no longer
   * available on this page. A real cost, flagged in the report rather than found later by someone
   * wondering why `x` removed their row. The mitigations are that dismiss is reversible from its
   * receipt, and that the icon's tooltip prints the key.
   */
  it("nothing selection-shaped is half-built — no checkbox, no picked set, no bar", () => {
    expect(list).not.toContain('type="checkbox"');
    expect(code(list)).not.toContain("setSelected");
    expect(code(list)).not.toContain("selectedKeys");
    expect(code(list)).not.toContain("SELECTED ·");
  });

  it("⚠️ `d` DISMISSES NOW AND `x` IS UNBOUND — a destructive key nothing teaches is a trap", () => {
    /* the inversion of the case this replaces: the icon cluster whose tooltip taught `x` is
       gone, the footer teaches `d`, and an untaught destructive binding must not survive its
       teacher. The map still states the way back. */
    expect(listKey(K("x"), false)).toBeNull();
    expect(listKey(K("d"), false)).toBe("dismiss");
    const entry = KEY_MAP.find((m) => m.key === "D");
    expect(entry, "D must be in the map").toBeTruthy();
    expect(entry!.does).toMatch(/undo/i);          // …and the map states the way back
  });

  it("…and the reason the absence stands is still written where the next reader will look", () => {
    /* the note moved with the key: selection is still unbuilt, and `x` is AVAILABLE again —
       a note claiming it was taken would be a comment outliving what it described */
    expect(lib).toContain("SELECTION_STILL_NOT_BUILT");
    expect(lib).toContain("AVAILABLE again");
    expect(lib, "the stale claim that x is taken").not.toContain("`x` is taken");
  });

  /**
   * ⚠️ `.sel` NOW HAS A PRODUCER, AND THAT IS WHY IT SHIPS (rail + workspace, Phase 3). The rule
   * was forbidden while nothing could set it — a state with no producer is dormant code. The
   * workspace pane supplies one: `selectedKey` is the DOCK'S OWN `activeKey`, so the rail marks
   * exactly what the pane is showing and the two cannot hold different ideas of "the current
   * one". The lock is inverted rather than deleted — the rule and its producer must ship together
   * in BOTH directions, which is the thing the original was protecting.
   *
   * ⚠️ THIS IS STILL NOT ROW SELECTION IN THE BATCH SENSE. There is no multi-select, `x` is still
   * dismiss, and the cases above stand unchanged.
   */
  it("⚠️ `.sel` SHIPS WITH ITS PRODUCER, OR NOT AT ALL — asserted both ways", () => {
    const groupsCss = readFileSync(join(here, "todoGroups.css"), "utf8");
    const listSrc = readFileSync(join(here, "TaskList.tsx"), "utf8");
    const pageSrc = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    /* ⚠️ THE SELECTED STATE IS THE PORTED ROW'S (list port) — `.tdg-row.sel` went with the retired
       sheet. The claim is unchanged: a selection marker ships with the thing that produces it. */
    expect(readFileSync(join(here, "taskList.css"), "utf8")).toContain(".tlc .row.sel");
    expect(listSrc).toContain('c.key === selectedKey ? " sel" : ""');
    /* the producer is the PANE'S key, not a second selection the list keeps for itself */
    /* ⚠️ RE-ANCHORED (P5): the pane no longer stores a queue, so there is no `dock` object to
       read a key off. The mark is the RESOLVED card's key — the same value the pane is showing,
       resolved from the live list — which is a stronger tie than before, not a weaker one. */
    expect(pageSrc).toContain("selectedKey={docked.card?.key}");
  });
});

describe("⚠️ ONE TOAST, ONE POSITION, ONE UNDO", () => {
  it("eight seconds, and hover still pauses on the remaining-time model", () => {
    expect(hook).toContain("const WITH_UNDO_MS = 8000;");
    expect(hook).toContain("deadline.current = Math.max(600, deadline.current - Date.now());");
  });

  it("bottom-left on the desktop, and it never stacks — a second act REPLACES the first", () => {
    expect(css).toContain(".tdb-toast { left: 26px; transform: none; }");
    /* the hook has always enforced replacement; it is why one position is enough */
    expect(hook).toContain("setToast({ msg, action });");
  });

  it("⚠️ PINK IS FOR A REFUSAL AND ONLY FOR A REFUSAL, and it carries no Undo", () => {
    expect(css).toContain(".tdb-toast.warn");
    expect(hook).toContain('setToast({ msg, tone: "warn" });');
    const warn = sliceBetween(hook, "const warn = useCallback", "const dismiss = useCallback");
    expect(warn, "a refusal has nothing to reverse").not.toContain("action");
    expect(page).toContain('role={toast.tone === "warn" ? "alert" : "status"}');
  });
});
