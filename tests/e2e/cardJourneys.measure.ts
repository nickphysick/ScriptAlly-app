/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 — THE DOOR AND BEHAVIOUR LOCKS, on the rendered page, over the emulator's harness account at 1440 × 900
 * (design-refs/card-journeys-v1). One test per journey, so each goes green with its own phase:
 *
 *   J1  the action on the query's card opens a JOURNEY PANEL (it has the track), not a form inside the card; the path and
 *       query string do not change
 *   J2  the card stays mounted behind it, stepped back (scaled to .955, 40px left) and dimmed; it is inert (no Tab reaches
 *       it); the Agent step is already done and is not a button; the head carries the Archivist's head
 *   J3  Escape with nothing answered closes the journey only: the card comes forward unchanged (not under, still open)
 *   J4  ✕ and a click on the dimmed card close it too
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneys.measure.ts --project=measure`. Nothing here saves.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { DOORS, openCardWithDoor, pressDoor, readStack, tabReachesCard, type DoorKind } from "./cardJourneysLib";

const DIR = "reports/card-journeys-v1";
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); this.save(); console.log(`  ${ok ? "✓" : "✗"} ${where} — ${detail}`); }
  save() { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1)); }
  done(floor: number) {
    this.save();
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

for (const k of Object.keys(DOORS) as DoorKind[]) {
  test(`card journeys v1 · ${k}: opens over the card, the card steps back, closes back to it`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`doors-${k}`);
    const id = await openCardWithDoor(page, k);
    L.check(`${k} · subject`, !!id, id ? `card ${id} offers the action` : "no card on the harness offers it");
    if (!id) { L.done(1); return; }
    const before = await readStack(page, id);
    await pressDoor(page, id, k);
    const on = await readStack(page, id);
    L.check(`J1 ${k} · a journey, not the card's form`, on.journey && on.kind === k && on.track && !on.composer, `journey ${on.journey} (${on.kind}), track ${on.track}, composer in card ${on.composer}`);
    L.check(`J1 ${k} · the path does not change`, on.path === before.path, `${before.path} → ${on.path}`);
    L.check(`J2 ${k} · the card stays, stepped back`, on.card && on.under && on.scale === 0.955 && on.dx === -40, `card ${on.card}, under ${on.under}, scale ${on.scale}, dx ${on.dx}`);
    L.check(`J2 ${k} · the card is dimmed`, (on.dim ?? 0) > 0.9, `::after opacity ${on.dim}`);
    L.check(`J2 ${k} · the card is inert`, on.inert, `inert ${on.inert}`);
    L.check(`J2 ${k} · the Agent step is done and fixed`, on.agent?.state === "done" && on.agent?.tag === "SPAN", JSON.stringify(on.agent));
    L.check(`J2 ${k} · the Archivist's head, navy`, on.art && !!on.headBg && on.headBg !== "rgba(0, 0, 0, 0)", `art ${on.art}, head ${on.headBg}`);
    if (on.journey) L.check(`J2 ${k} · Tab never reaches the card`, !(await tabReachesCard(page, id)), "30 presses of Tab");
    /* J3 — Escape with nothing answered closes the journey only */
    await page.keyboard.press("Escape"); await settle(page, 700);
    const back = await readStack(page, id);
    L.check(`J3 ${k} · Escape closes the journey`, !back.journey, `journey ${back.journey}`);
    L.check(`J3 ${k} · the card comes forward`, back.card && !back.under && !back.inert && back.scale === 1, `card ${back.card}, under ${back.under}, inert ${back.inert}, scale ${back.scale}`);
    /* J4 — ✕, then a click on the dimmed card */
    await pressDoor(page, id, k);
    await page.locator('[data-cj="close"]').first().click().catch(() => {}); await settle(page, 700);
    const x = await readStack(page, id);
    L.check(`J4 ${k} · ✕ closes it`, !x.journey && x.card && !x.under, `journey ${x.journey}, card ${x.card}, under ${x.under}`);
    await pressDoor(page, id, k);
    const box = await page.locator(`[data-qp="panel"][data-qp-id="${id}"]`).boundingBox();
    if (box) await page.mouse.click(box.x + 14, box.y + box.height / 2);
    await settle(page, 700);
    const y = await readStack(page, id);
    L.check(`J4 ${k} · a click on the dimmed card closes it`, !y.journey && y.card && !y.under, `journey ${y.journey}, card ${y.card}, under ${y.under}`);
    L.done(10);
  });
}
