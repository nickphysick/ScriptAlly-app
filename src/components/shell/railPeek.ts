/**
 * railPeek — the hover-peek rail's state model (design ref: design-refs/rail-hover-peek-v2.html,
 * authoritative for timings and behaviour).
 *
 * Three states: `rest` and `peek` are the unpinned pair (60px icon rail in flow; hover/focus
 * expands it AS AN OVERLAY over the content), `pinned` stands alone (full width IN the flow,
 * no overlay, no scrim ever). Coarse pointers are permanently pinned — no hover peek.
 *
 * Pure module: intent timers take injected schedule/cancel so the tests can drive them with
 * fake clocks; persistence takes an injected storage. The component consumes railMode +
 * scrimVisible and never re-derives.
 */

export type RailMode = "rest" | "peek" | "pinned";

export interface RailPeekState {
  pinned: boolean;
  peeking: boolean;
  coarse: boolean;
}

/** Ref timings: enter intent 120ms, leave grace 240ms. */
export const PEEK_ENTER_MS = 120;
export const PEEK_LEAVE_MS = 240;

/** Pin persistence — follows the timeline-drawer pin's `sa.` naming convention. */
export const RAIL_PIN_KEY = "sa.railPinned";
/** The retired chevron's key — read once for migration, never written again. */
export const LEGACY_COLLAPSE_KEY = "scriptally.queriesRailCollapsed";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const safeStorage = (): StorageLike | null => {
  try { return window.localStorage; } catch { return null; }
};

/**
 * Read the pin state. Default PINNED (existing users keep today's in-flow rail until they
 * choose otherwise). One-off migration from the legacy chevron key: collapsed ("1") maps to
 * unpinned, expanded ("0") to pinned — written through to the new key so it only runs once;
 * the legacy key itself is left in place (the dev-only SidebarShell lab still reads it).
 */
export function readRailPinned(storage: StorageLike | null = safeStorage()): boolean {
  if (!storage) return true;
  try {
    const stored = storage.getItem(RAIL_PIN_KEY);
    if (stored !== null) return stored === "1";
    const legacy = storage.getItem(LEGACY_COLLAPSE_KEY);
    if (legacy !== null) {
      const pinned = legacy !== "1"; // collapsed → unpinned; expanded → pinned
      storage.setItem(RAIL_PIN_KEY, pinned ? "1" : "0");
      return pinned;
    }
    return true;
  } catch {
    return true;
  }
}

export function writeRailPinned(pinned: boolean, storage: StorageLike | null = safeStorage()): void {
  try { storage?.setItem(RAIL_PIN_KEY, pinned ? "1" : "0"); } catch { /* private mode — ignore */ }
}

/** Resolve the three-state mode; a coarse pointer always pins (no hover on touch). */
export function railMode(s: RailPeekState): RailMode {
  if (s.pinned || s.coarse) return "pinned";
  return s.peeking ? "peek" : "rest";
}

/** The scrim exists only during an unpinned peek — never while pinned, never at rest. */
export function scrimVisible(s: RailPeekState): boolean {
  return railMode(s) === "peek";
}

/** The wrapper's in-flow width; the overlay panel is wider than this only while peeking. */
export function railFlowWidth(s: RailPeekState, full = 240, mini = 60): number {
  return railMode(s) === "pinned" ? full : mini;
}

export function railPanelWidth(s: RailPeekState, full = 240, mini = 60): number {
  return railMode(s) === "rest" ? mini : full;
}

/**
 * Hover/focus intent — one debounced gate for pointer AND keyboard focus, so Tab into the
 * rail peeks exactly like hover (and a quick pass-through never flashes it open). Injected
 * timers for testability; `dispose` cancels anything in flight (unmount).
 */
export function makePeekIntent(
  setPeeking: (on: boolean) => void,
  schedule: (fn: () => void, ms: number) => number = (fn, ms) => window.setTimeout(fn, ms),
  cancel: (id: number) => void = (id) => window.clearTimeout(id)
) {
  let timer: number | null = null;
  const clear = () => { if (timer !== null) { cancel(timer); timer = null; } };
  const enter = () => { clear(); timer = schedule(() => { timer = null; setPeeking(true); }, PEEK_ENTER_MS); };
  const leave = () => { clear(); timer = schedule(() => { timer = null; setPeeking(false); }, PEEK_LEAVE_MS); };
  return {
    pointerEnter: enter,
    pointerLeave: leave,
    focusEnter: enter,
    focusLeave: leave,
    /** Open without the intent delay (the ⌘K search assist). */
    openNow: () => { clear(); setPeeking(true); },
    dispose: clear,
  };
}
