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
    expect(listKey(K("Escape"), false)).toBe("dismiss");
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
    const esc = list.slice(list.indexOf('if (action === "dismiss")'), list.indexOf('if (action === "down"'));
    expect(esc.indexOf("setDial(null)")).toBeLessThan(esc.indexOf("closeMenu(true)"));
    expect(esc.indexOf("closeMenu(true)")).toBeLessThan(esc.indexOf("setHelpOpen(false)"));
    expect(esc).not.toContain("stopPropagation");
  });

  it("the `?` map is built FROM `KEY_MAP`, so the sheet cannot advertise a key that does nothing", () => {
    expect(list).toContain("KEY_MAP.map((k) => (");
    for (const k of ["J / K", "Space", "Enter", "S", "E", "/", "W", "Esc", "?"]) {
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

describe("⚠️ SELECTION IS NOT BUILT, AND THE ABSENCE IS THE DECISION", () => {
  /**
   * Sheet 7 says "selection borrows the batch model wholesale". THERE IS NO BATCH MODEL — the
   * ledger's machinery retired with the run sheet, `todoLedger`'s `batch*` helpers are the
   * housekeeping COHORT, and board-optimise's Phase 8 was left unbuilt for this exact reason with
   * Nick's call still open. Building one fresh contradicts the phase's own central instruction.
   */
  it("`x` is unbound, and nothing renders a checkbox or a selection bar", () => {
    expect(listKey(K("x"), false)).toBeNull();
    expect(list).not.toContain('type="checkbox"');
    /* the markers a selection system would need: a set of picked keys, and a bar to hold them */
    expect(code(list)).not.toContain("setSelected");
    expect(code(list)).not.toContain("selectedKeys");
    expect(code(list)).not.toContain("SELECTED ·");
    expect(KEY_MAP.some((m) => m.key.toUpperCase() === "X")).toBe(false);
  });

  it("…and the reason is written where the next reader will look for it", () => {
    expect(lib).toContain("THERE IS NO BATCH MODEL");
    expect(lib).toContain("SELECTION_NOT_BUILT");
  });

  it("⚠️ THE ROW'S `.sel` STATE IS NOT SHIPPED EITHER — a state with no producer is dormant code", () => {
    const groupsCss = readFileSync(join(here, "todoGroups.css"), "utf8");
    expect(groupsCss).not.toContain(".tdg-row.sel");
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
