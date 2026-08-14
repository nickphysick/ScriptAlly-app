/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * KEYBOARD, TOASTS AND THE ONE THING PHASE 6 DOES NOT BUILD (tasks-consolidation, Phase 6; ref
 * design-refs/tasks-states.html, sheets 5 and 7).
 */
import { describe, it, expect } from "vitest";
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
  it("the map, exactly", () => {
    expect(listKey(K("j"), false)).toBe("down");
    expect(listKey(K("K"), false)).toBe("up");
    expect(listKey(K(" "), false)).toBe("tick");
    expect(listKey(K("Enter"), false)).toBe("primary");
    expect(listKey(K("s"), false)).toBe("snooze");
    expect(listKey(K("e"), false)).toBe("edit");
    /* ⚠️ THE CLUSTER'S THREE NEW KEYS (icon-cluster P3) — one per icon, so the tooltip that
       prints a key and the handler that answers it cannot come apart. */
    expect(listKey(K("x"), false)).toBe("dismiss");
    expect(listKey(K("X"), false)).toBe("dismiss");
    expect(listKey(K("."), false)).toBe("more");
    expect(listKey(K("o"), false)).toBe("open");
    /* ⚠️ ESCAPE IS `close` NOW, BECAUSE `x` TOOK THE WORD `dismiss`. Shutting a surface and
       putting a card away are different acts, and one name for both is how a handler comes to
       close a menu when it meant to dismiss a task. */
    expect(listKey(K("Escape"), false)).toBe("close");
    expect(listKey(K("?"), false)).toBe("help");
    expect(listKey(K("q"), false)).toBeNull();
  });

  it("⚠️ EVERY ONE STANDS DOWN WHILE TYPING — j, k, s, e and a space are all characters", () => {
    for (const k of ["j", "k", " ", "s", "e", "?"]) {
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

  it("`W` is a PAGE key, not a row key — it acts on the list, not on what happens to be focused", () => {
    expect(worksTheList(K("w"), false)).toBe(true);
    expect(worksTheList(K("w"), true)).toBe(false);
    expect(worksTheList(K("w", { metaKey: true }), false)).toBe(false);
    expect(listKey(K("w"), false), "…so the list must not also claim it").toBeNull();
  });
});

describe("⚠️ THE FOCUSED ROW IS THE BROWSER'S OWN FOCUS", () => {
  it("j/k MOVE focus rather than tracking a second index", () => {
    /* A parallel `focusIndex` would be a second answer to "where am I", and it would drift the
       moment a click, a Tab or a re-render moved focus without telling it. */
    expect(list).toContain("rowEls.current.get(keys[next])?.focus();");
    expect(code(list)).not.toContain("focusIndex");
    expect(list).toContain("const active = document.activeElement as HTMLElement | null;");
  });

  it("the order comes from the DOM, so the keys cannot disagree with what is on screen", () => {
    expect(list).toContain("compareDocumentPosition");
    expect(list).toContain("el.isConnected");
  });

  it("⚠️ SPACE ASKS `isTickable` — the same question the row asks before drawing a circle", () => {
    expect(list).toContain("if (isTickable(c)) tick(c); else onOpen(c);");
  });

  it("⚠️ S AND E ASK `cardMenu`, like every other verb on this page", () => {
    expect(list).toContain('offers(cardMenu(c, column), "snooze-1")');
    expect(list).toContain('.find((x) => x.kind === "leaf" && x.id === "edit-task")');
  });

  it("⚠️ ESCAPE CLOSES INNERMOST-FIRST and is NOT stopped — the page has its own Escape business", () => {
    const esc = list.slice(list.indexOf('if (action === "close")'), list.indexOf('if (action === "down"'));
    expect(esc.indexOf("setDial(null)")).toBeLessThan(esc.indexOf("closeMenu(true)"));
    expect(esc.indexOf("closeMenu(true)")).toBeLessThan(esc.indexOf("setHelpOpen(false)"));
    expect(esc).not.toContain("stopPropagation");
  });

  it("the `?` map is built FROM `KEY_MAP`, so the sheet cannot advertise a key that does nothing", () => {
    expect(list).toContain("KEY_MAP.map((k) => (");
    for (const k of ["J / K", "Space", "Enter", "S", "X", ".", "O", "E", "/", "W", "Esc", "?"]) {
      expect(KEY_MAP.some((m) => m.key === k), k).toBe(true);
    }
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
    expect(list).toContain('if (action === "primary") { onOpen(c); return; }');
    expect(code(list)).not.toContain("firePrimary");
    /* the reversal carries no `hint`, so no tooltip teaches a key that means something else */
    expect(list).not.toContain('hint="↵"');
    /* and the reversal's own fire path is still ONE derivation of which leaf it is */
    expect(list).toContain("const fireReversal = (c: BoardCard, column: TodoColumnId) => {");
    expect(list).toContain("const primaryId = (c: BoardCard, column: TodoColumnId): MenuItemId | null =>");
  });

  it("`S`, `X`, `.` and `O` each reach the icon's own handler, with the icon's own permission", () => {
    /* Permission is `cardMenu`'s in both paths — never a second table for the keyboard. */
    expect(list).toContain('if (offers(cardMenu(c, column), "dismiss-week")) fire(c, column, "dismiss-week");');
    expect(list).toContain('if (offers(cardMenu(c, column), "open-query")) fire(c, column, "open-query");');
    expect(list).toContain('if (action === "more") { if (el) openSplit(el, c, column); return; }');
    expect(list).toContain('if (el && offers(cardMenu(c, column), "snooze-1")) setDial({ card: c, anchor: el });');
  });

  it("⚠️ EVERY KEY A TOOLTIP PRINTS IS ANSWERED, AND EVERY ONE IS IN THE MAP", () => {
    /* The four the cluster advertises on its icons. `↵` is Enter; the rest are bare letters. */
    expect(listKey(K("Enter"), false)).toBe("primary");
    for (const [key, action] of [["s", "snooze"], ["x", "dismiss"], [".", "more"]] as const) {
      expect(listKey(K(key), false)).toBe(action);
    }
    for (const k of ["Enter", "S", "X", "."]) {
      expect(KEY_MAP.some((m) => m.key === k), `${k} is on an icon but not in the map`).toBe(true);
    }
  });
});

describe("⚠️ SELECTION IS STILL NOT BUILT — and `x` is no longer free for it", () => {
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

  it("⚠️ `x` DISMISSES NOW, and the map says so — an unadvertised destructive key is a trap", () => {
    expect(listKey(K("x"), false)).toBe("dismiss");
    const entry = KEY_MAP.find((m) => m.key === "X");
    expect(entry, "X must be in the map").toBeTruthy();
    expect(entry!.does).toMatch(/undo/i);          // …and the map states the way back
  });

  it("…and the reason the absence stands is still written where the next reader will look", () => {
    expect(lib).toContain("THERE IS NO BATCH MODEL");
    expect(lib).toContain("SELECTION_STILL_NOT_BUILT");
    expect(lib).toContain("`x` is taken");
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
    expect(groupsCss).toContain(".tdg-row.sel");
    expect(listSrc).toContain('c.key === selectedKey ? " sel" : ""');
    /* the producer is the PANE'S key, not a second selection the list keeps for itself */
    expect(pageSrc).toContain("selectedKey={dock?.activeKey}");
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
    const warn = hook.slice(hook.indexOf("const warn = useCallback"), hook.indexOf("const dismiss = useCallback"));
    expect(warn, "a refusal has nothing to reverse").not.toContain("action");
    expect(page).toContain('role={toast.tone === "warn" ? "alert" : "status"}');
  });
});
