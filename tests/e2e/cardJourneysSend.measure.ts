/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 2 — MARK SENT, on the rendered page at 1440 × 900 (design-refs/card-journeys-v1 screens 01–11):
 *
 *   S1  every step is asked: Agent · What went · Sent · Reply time · Log; "What {First} asked for" with "I sent exactly
 *       that"; "When did it go to {First}?" with "{First} asked on {date}."; the Reply time slider starts at the agent's
 *       weeks or the house window, with "Reply expected by" and one "Remind me to nudge on" tick
 *   S2  the review: "Ready to mark it sent?", the grid card as it will be (its status label the send's), What went tiles,
 *       the nudge task, Add a note, the numbers, "Mark sent"; nothing in the column is cut off at 1440 × 900
 *   S3  the finish: "Logged. {Partial|Full|Revision} sent!" / "Over to {First}.", "Your {partial} is with {First}.", one of
 *       the three sentences, the stamp "Logged"; the card behind already shows the new state; Undo restores it
 *   S4  Unknown reply time: the review's card and the finish say there is no reply date ("No date yet" /
 *       "There's no reply date yet.")
 *   S5  "Back to {First}'s card": the journey goes and the card comes forward showing the send
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneysSend.measure.ts --project=measure`.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openCardWithDoor, pressDoor, readStack } from "./cardJourneysLib";

const DIR = "reports/card-journeys-v1";
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const C = (k: string) => `[data-cj="root"] [data-cj="${k}"]`;
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
const text = (page: Page, sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => "");
const trackOf = (page: Page) => page.locator(`${C("step")}`).evaluateAll((els) => els.map((e) => `${e.getAttribute("data-k")}:${e.getAttribute("data-state")}`));
/** nothing in the body or foot reaches past the column, and the column itself is inside the window */
async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-cj="root"]');
    const body = root?.querySelector<HTMLElement>('[data-cj="body"]');
    if (!root || !body) return ["no journey"];
    const out: string[] = [];
    const rb = root.getBoundingClientRect();
    if (rb.right > innerWidth + 0.5 || rb.bottom > innerHeight + 0.5 || rb.left < -0.5) out.push(`column ${Math.round(rb.left)}–${Math.round(rb.right)} × ${Math.round(rb.bottom)}`);
    const bb = body.getBoundingClientRect();
    for (const el of body.querySelectorAll<HTMLElement>("b, span, p, h2, button, li")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      if (r.right > bb.right + 1 || r.left < bb.left - 1) out.push(`${el.tagName} "${(el.innerText || "").slice(0, 30)}" ${Math.round(r.left)}–${Math.round(r.right)}`);
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === "ellipsis") out.push(`ellipsis "${(el.innerText || "").slice(0, 30)}"`);
    }
    return out.slice(0, 6);
  });
}

const STATUS_DOOR: Record<string, { word: string; noun: string; label: string }> = {
  "Partial Requested": { word: "Partial", noun: "partial", label: "Partial sent" },
  "Full Requested": { word: "Full", noun: "full", label: "Full sent" },
  "Revise & Resubmit": { word: "Revision", noun: "revision", label: "Resubmitted" },
};

async function walk(page: Page, L: Ledger, tag: string, opts: { unknown: boolean }) {
  const first = (await text(page, `${C("step")}[data-k="agent"] [data-rar="step-value"]`)) || "";
  const q1 = await text(page, C("q"));
  L.check(`S1 ${tag} · first step asks what went`, /^What did you send .+\?$/.test(q1) && (await page.locator(C("asked-card")).count()) === 1 && (await page.locator(C("went-ask")).count()) === 1, `"${q1}"`);
  L.check(`S1 ${tag} · the track`, (await trackOf(page)).join(" ") === "agent:done went:now sent:todo reply:todo log:todo", (await trackOf(page)).join(" "));
  const head = await text(page, '[data-cj="root"] .flh-t, [data-cj="root"] h1');
  L.check(`S1 ${tag} · the head`, /gone\. Great work!/.test(head) && /Let’s log the details\./.test(head), `"${head}"`);
  await page.locator(C("went-ask")).click(); await settle(page);
  const q2 = await text(page, C("q")), sub = await text(page, C("sub"));
  L.check(`S1 ${tag} · when did it go`, /^When did it go to .+\?$/.test(q2) && /^.+ asked on \d{1,2} [A-Z][a-z]{2}\.$/.test(sub), `"${q2}" / "${sub}"`);
  await page.locator(`${C("sent-at")}[data-k="today"]`).click(); await settle(page);
  const q3 = await text(page, C("q"));
  const sl = await page.locator(`${C("slider")}[data-k="wk"]`).count();
  const note = await text(page, C("slider-note"));
  const nudge = await page.locator(C("nudge")).count();
  L.check(`S1 ${tag} · reply time`, /^When might .+ reply\?$/.test(q3) && sl === 1 && /^Reply expected by /.test(note) && nudge === 1, `"${q3}", slider ${sl}, "${note}", nudge tick ${nudge}`);
  if (opts.unknown) { await page.locator(`${C("slider")} .sa-wk-unkbtn`).click(); await settle(page); }
  await page.locator(C("go")).click(); await settle(page, 900);
  return first;
}

for (const st of Object.keys(STATUS_DOOR)) {
  test(`card journeys v1 · Mark sent from a ${st} card`, async ({ page }) => {
    test.setTimeout(240_000);
    const d = STATUS_DOOR[st];
    const L = new Ledger(`send-${d.noun}`);
    page.on("console", (m) => { if (m.type() === "error") console.log(`  [console] ${m.text().slice(0, 400)}`); });
    const id = await openCardWithDoor(page, "send", [st]);
    L.check(`${d.noun} · subject`, !!id, id ? `card ${id}` : `no ${st} card offers Mark sent`);
    if (!id) { L.done(1); return; }
    await pressDoor(page, id, "send");
    await walk(page, L, d.noun, { unknown: false });
    /* S2 the review */
    L.check(`S2 ${d.noun} · the review`, (await text(page, C("q"))) === "Ready to mark it sent?" && (await page.locator('[data-cj="root"][data-step="log"]').count()) === 1, await text(page, C("q")));
    const pvStatus = await page.locator(`${C("preview")} [data-qc154="card"]`).first().getAttribute("data-status");
    L.check(`S2 ${d.noun} · the card as it will be`, pvStatus === (st === "Revise & Resubmit" ? "Resubmitted" : st.replace("Requested", "Sent")), `preview status ${pvStatus}`);
    const tiles = await page.locator(C("tile-r")).count(), task = await text(page, C("task")), note = await page.locator(C("add-note")).count(), counts = await page.locator(C("count")).count();
    L.check(`S2 ${d.noun} · what went, the task, a note, the numbers`, tiles >= 1 && /^Nudge .+ if there’s no reply/.test(task) && note === 1 && counts === 2, `${tiles} tiles, "${task}", add-note ${note}, ${counts} numbers`);
    L.check(`S2 ${d.noun} · the button`, (await text(page, C("save"))).startsWith("Mark sent"), await text(page, C("save")));
    L.check(`S2 ${d.noun} · nothing cut off at 1440 × 900`, (await cutOff(page)).length === 0, JSON.stringify(await cutOff(page)));
    /* S3 the finish */
    await page.locator(C("save")).click();
    await page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 });
    await settle(page, 800);
    const h = await text(page, '[data-cj="root"] .flh-t, [data-cj="root"] h1'), big = await text(page, C("done-head")), line = await text(page, C("done-line"));
    L.check(`S3 ${d.noun} · the head`, h.includes(`Logged. ${d.word} sent!`) && /Over to .+\./.test(h), `"${h}"`);
    L.check(`S3 ${d.noun} · the big line`, new RegExp(`^Your ${d.noun} is with .+\\.$`).test(big), `"${big}"`);
    L.check(`S3 ${d.noun} · one of the three sentences, no narration`, /^(We’ll remind you to nudge on .+\.|A reply is expected by .+\.|There’s no reply date yet\.)$/.test(line), `"${line}"`);
    L.check(`S3 ${d.noun} · the stamp`, (await text(page, C("stamp"))).startsWith("Logged"), await text(page, C("stamp")));
    const behind = await page.locator(`[data-qp="panel"][data-qp-id="${id}"]`).getAttribute("data-under");
    const fin = await text(page, C("done-btn"));
    L.check(`S3 ${d.noun} · the finish button`, /^Back to .+’s card$/.test(fin) && behind === "true", `"${fin}", card under ${behind}`);
    /* Undo restores */
    await page.locator(C("undo")).click();
    await page.locator('[data-cj="root"][data-step="log"]').waitFor({ timeout: 45_000 });
    await settle(page, 1200);
    const cardStatus = await page.locator(`#query-row-${id}`).first().getAttribute("data-status").catch(() => null);
    L.check(`S3 ${d.noun} · Undo restores`, cardStatus == null || cardStatus === st, `the grid card reads ${cardStatus}`);
    /* S5 — save again and go back to the card */
    await page.locator(C("save")).click();
    await page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 });
    await settle(page, 800);
    await page.locator(C("done-btn")).click(); await settle(page, 1000);
    const s5 = await readStack(page, id);
    const band = await page.locator(`[data-qp="panel"][data-qp-id="${id}"]`).innerText().catch(() => "");
    L.check(`S5 ${d.noun} · back to the card, showing the send`, !s5.journey && s5.card && !s5.under && band.toLowerCase().includes(d.label.toLowerCase()), `journey ${s5.journey}, under ${s5.under}, card says "${d.label}": ${band.toLowerCase().includes(d.label.toLowerCase())}`);
    L.done(14);
  });
}

test("card journeys v1 · Mark sent with the reply time Unknown", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("send-unknown");
  const id = await openCardWithDoor(page, "send", ["Partial Requested", "Full Requested"]);
  L.check("unknown · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "send");
  await walk(page, L, "unknown", { unknown: true });
  const pv = await text(page, C("preview"));
  L.check("S4 · the review's card has no reply date", /No date yet/.test(pv) && !/Nudge on/.test(pv), `"${pv.slice(0, 160)}"`);
  L.check("S4 · no nudge task", (await page.locator(C("task")).count()) === 0, `${await page.locator(C("task")).count()} task rows`);
  await page.locator(C("save")).click();
  await page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 });
  await settle(page, 800);
  L.check("S4 · the finish says so", (await text(page, C("done-line"))) === "There’s no reply date yet.", await text(page, C("done-line")));
  await page.locator(C("undo")).click();
  await page.locator('[data-cj="root"][data-step="log"]').waitFor({ timeout: 45_000 });
  L.done(8);
});
