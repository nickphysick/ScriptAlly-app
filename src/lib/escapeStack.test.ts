/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one Escape stack (Agent card v1 §6.6, §9). Two capture-phase listeners on one target are
 * resolved by REGISTRATION ORDER — a fact about which element mounted last, not about what is on
 * screen — so every overlay layer registers here and exactly one listener decides.
 */
import { describe, it, expect } from "vitest";
import { createEscapeStack, ESC_LEVEL } from "./escapeStack";

const press = (k: string) => {
  const e = new Event("keydown", { cancelable: true });
  Object.defineProperty(e, "key", { value: k });
  return e;
};

/** a target that counts its own listener registrations — "one listener" is a count, not a hope */
const countingTarget = () => {
  const t = new EventTarget();
  let adds = 0;
  const add = t.addEventListener.bind(t);
  t.addEventListener = ((...a: Parameters<EventTarget["addEventListener"]>) => { adds += 1; add(...a); }) as EventTarget["addEventListener"];
  return { t, adds: () => adds };
};

describe("the one Escape stack", () => {
  it("only the top layer handles Escape, and releasing it hands the key back to the layer below", () => {
    const { t } = countingTarget();
    const s = createEscapeStack(t);
    const seen: string[] = [];
    s.push(() => seen.push("card"), ESC_LEVEL.card);
    const releasePopup = s.push(() => seen.push("popup"), ESC_LEVEL.cardPopup);
    t.dispatchEvent(press("Escape"));
    expect(seen).toEqual(["popup"]);
    releasePopup();
    t.dispatchEvent(press("Escape"));
    expect(seen).toEqual(["popup", "card"]);
  });

  it("orders by LEVEL, not by push order — React runs a child's effects before its parent's", () => {
    const { t } = countingTarget();
    const s = createEscapeStack(t);
    const seen: string[] = [];
    /* the child (a combobox inside the card) mounts first, the card second — the card must not win */
    s.push(() => seen.push("popup"), ESC_LEVEL.cardPopup);
    s.push(() => seen.push("card"), ESC_LEVEL.card);
    t.dispatchEvent(press("Escape"));
    expect(seen).toEqual(["popup"]);
  });

  it("the drawer outranks the card it docked, so a docked card never takes the drawer's Escape", () => {
    const { t } = countingTarget();
    const s = createEscapeStack(t);
    const seen: string[] = [];
    /* the card registers AFTER the drawer — a docked card re-registering while the drawer still
       asks. Pushed the other way round this case could not tell a level from a push order. */
    const releaseDrawer = s.push(() => seen.push("drawer"), ESC_LEVEL.drawer);
    s.push(() => seen.push("card"), ESC_LEVEL.card);
    t.dispatchEvent(press("Escape"));
    releaseDrawer();
    t.dispatchEvent(press("Escape"));
    expect(seen).toEqual(["drawer", "card"]);
  });

  it("ties at one level go to the later push", () => {
    const { t } = countingTarget();
    const s = createEscapeStack(t);
    const seen: string[] = [];
    s.push(() => seen.push("first"), ESC_LEVEL.card);
    s.push(() => seen.push("second"), ESC_LEVEL.card);
    t.dispatchEvent(press("Escape"));
    expect(seen).toEqual(["second"]);
  });

  it("installs ONE listener however many layers come and go", () => {
    const { t, adds } = countingTarget();
    const s = createEscapeStack(t);
    for (let i = 0; i < 5; i++) s.push(() => {}, ESC_LEVEL.card)();
    s.push(() => {}, ESC_LEVEL.drawer);
    expect(adds()).toBe(1);
  });

  it("swallows the key: a listener registered AFTER it on the same target never sees an Escape it handled", () => {
    const { t } = countingTarget();
    const s = createEscapeStack(t);
    s.push(() => {}, ESC_LEVEL.card);
    let late = 0;
    t.addEventListener("keydown", () => { late += 1; }, true);
    const e = press("Escape");
    t.dispatchEvent(e);
    expect(late).toBe(0);
    expect(e.defaultPrevented).toBe(true);
  });

  it("lets every other key through, and does nothing at all with no layers", () => {
    const { t } = countingTarget();
    const s = createEscapeStack(t);
    let late = 0;
    let handled = 0;
    s.push(() => { handled += 1; }, ESC_LEVEL.card)(); /* pushed and released: an empty stack */
    t.addEventListener("keydown", () => { late += 1; }, true);
    t.dispatchEvent(press("Escape"));
    s.push(() => { handled += 1; }, ESC_LEVEL.card);
    t.dispatchEvent(press("Enter"));
    expect(handled).toBe(0);
    expect(late).toBe(2);
    expect(s.depth()).toBe(1);
  });
});
