/**
 * §2 — materials, on the running page.
 *
 * ⚠️ THE CLAIM IS AN ABSENCE — no pill in a pending or ghost state — and an absence is exactly what
 * a source lock cannot settle: the markup can be right and the cascade still paint a muted pill.
 * This reads every pill the page draws.
 *
 *   npx playwright test --project=measure qcMats
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — every pill is attached, removal is immediate and undoable, the menu states all four", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);

  const pills = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc-sentmat .qc-mchip-att")].map((p) => {
    const c = getComputedStyle(p);
    return {
      text: (p.textContent || "").replace(/\s+/g, " ").trim(),
      colour: c.color, background: c.backgroundColor, border: `${c.borderTopStyle} ${c.borderTopWidth}`,
      opacity: c.opacity,
      /* the ✓/○ marker the not-sent state used */
      marker: p.querySelector("i") ? (p.querySelector("i")!.textContent || "").trim() : "",
      hasX: !!p.querySelector(".qc-mchipx"),
    };
  }));
  console.log(`\n${pills.length} material pills on this send:`);
  pills.forEach((p) => console.log(`  "${p.text}" · ${p.colour} on ${p.background} · border ${p.border} · opacity ${p.opacity} · marker "${p.marker}" · ×: ${p.hasX}`));
  expect(pills.length, "no materials on this query to read").toBeGreaterThan(0);

  /* ⚠️ NO GHOSTS. A dashed rim, a faded pill or a `○` marker are the three shapes the retired
     not-yet-sent state took; all three are absences now, so all three are asserted. */
  const faint = await page.evaluate(() => {
    const root = document.querySelector(".f12-root") ?? document.documentElement;
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(root).getPropertyValue("--qc-tx-off").trim();
    document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); return c;
  });
  for (const p of pills) {
    expect(p.marker, `"${p.text}" still draws a sent/not-sent marker`).toBe("");
    expect(p.border, `"${p.text}" is dashed — a pending pill`).not.toContain("dashed");
    expect(Number(p.opacity), `"${p.text}" is faded`).toBeGreaterThan(0.9);
    expect(p.colour, `"${p.text}" is drawn in the muted ink — a ghost`).not.toBe(faint);
    expect(p.hasX, `"${p.text}" has no remove control`).toBe(true);
  }

  /* ── the Attach menu states the complete set, with attached ones inert ── */
  await page.locator(".qc-mchip-add").click();
  await page.waitForTimeout(350);
  const menu = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="menu"] .f12-menu-item')].map((b) => ({
    label: (b.textContent || "").trim(),
    disabled: (b as HTMLButtonElement).disabled,
  })));
  console.log(`\nattach menu:`);
  menu.forEach((m) => console.log(`  "${m.label}"${m.disabled ? "  [inert]" : ""}`));
  for (const want of ["Query letter", "Synopsis", "Opening sample", "Other"]) {
    const row = menu.find((m) => m.label.startsWith(want));
    expect(row, `the menu does not list ${want}`).toBeTruthy();
  }
  /* ⚠️ ATTACHED ONES ARE LISTED AND INERT — hiding them would make the menu shorter every time it
     was used, and leave a writer unable to see that a type exists at all. */
  /* ⚠️ `ATTACHED` IS A HINT NOW (§2), in its own column rather than suffixed onto the label — so
     the match is case-insensitive and reads the whole row. As a suffix it read as a different
     material ("Synopsis · Attached"). */
  for (const m of menu.filter((x) => /attached/i.test(x.label))) {
    expect(m.disabled, `"${m.label}" is marked Attached and still clickable`).toBe(true);
  }
  const attachedInMenu = menu.filter((m) => /attached/i.test(m.label)).length;
  expect(attachedInMenu, "no menu row reflects what is already on the send").toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  /* ── removal is immediate, and the undo puts it back ── */
  const target = page.locator(".qc-sentmat .qc-mchip-att").first();
  const label = (await target.innerText()).replace(/\s+/g, " ").trim();
  /* ⚠️ COUNTED AT THE MOMENT OF THE ACTION, not from the earlier read. The first version compared
     against a count taken before the menu was opened and closed, and reported "1 → 2" — a removal
     that appeared to ADD a pill. The list is live; a stale `before` measures two different pages. */
  const before = await page.locator(".qc-sentmat .qc-mchip-att").count();
  console.log(`\nbefore removing: ${before} pills (first read saw ${pills.length})`);
  await target.hover();
  await page.waitForTimeout(150);
  const xVisible = await target.locator(".qc-mchipx").evaluate((el) => getComputedStyle(el).display);
  console.log(`\nhovering "${label}": × display ${xVisible}`);
  expect(xVisible, "the × does not appear on hover").not.toBe("none");
  await target.locator(".qc-mchipx").click();
  await page.waitForTimeout(900);

  const after = await page.locator(".qc-sentmat .qc-mchip-att").count();
  /* ⚠️ THE TOAST'S OWN CLASS, NOT A `has-text` SWEEP. A document-wide search for "Undo" found a
     HIDDEN theme-editor button — "⏪ Undo Style (Classic)" — and waited seven minutes for it to
     become clickable. The same first-match family that has cost this suite time before. */
  const toast = (await page.locator(".sa-toast").first().innerText({ timeout: 4000 }).catch(() => "")).replace(/\s+/g, " ").trim();
  console.log(`  removed: ${before} → ${after} pills · toast "${toast}"`);
  expect(after, "the pill did not leave the row").toBe(before - 1);
  expect(toast, "removal fired no toast").not.toBe("");
  /* ⚠️ AND IT SAYS "removed", NOT "unmarked" — marking was the vocabulary of the state §2 retires. */
  expect(toast.toLowerCase(), `the toast still speaks of marking: "${toast}"`).not.toContain("unmark");
  expect(toast.toLowerCase(), "the toast does not say what happened").toContain("removed");
  expect(await page.locator(".sa-toast-undo").count(), "the toast offers no undo").toBeGreaterThan(0);

  /* put it back through the undo, so the walk changes nothing */
  await page.locator(".sa-toast-undo").first().click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const restored = await page.locator(".qc-sentmat .qc-mchip-att").count();
  console.log(`  undone: ${restored} pills`);
  expect(restored, "undo did not restore the material").toBe(before);
});

test("§1/§2 — the editor is on-brand, commits as it goes, and both routes open it", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(450);

  /* ── the pill route ── */
  const pill = page.locator(".qc-sentmat .qc-mchip-att").first();
  const pillLabel = (await pill.innerText()).replace(/\s+/g, " ").trim();
  await pill.click();
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => {
    const p = document.querySelector<HTMLElement>(".f12-panel");
    if (!p) return null;
    const c = getComputedStyle(p);
    const r = p.getBoundingClientRect();
    const eyebrow = p.querySelector<HTMLElement>(".f12-panel-eyebrow");
    return {
      bg: c.backgroundColor, shadow: c.boxShadow.slice(0, 40), border: `${c.borderTopWidth} ${c.borderTopColor}`,
      onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      eyebrow: (eyebrow?.textContent || "").trim(),
      eyebrowFont: eyebrow ? `${getComputedStyle(eyebrow).fontFamily.split(",")[0]} ${getComputedStyle(eyebrow).fontSize}` : "",
      buttons: [...p.querySelectorAll("button")].map((b) => (b.textContent || "").trim()),
      /* the old sheet, asserted gone */
      oldSheet: document.querySelectorAll(".f12-pop .f12-done").length,
    };
  });
  console.log(`\npill "${pillLabel}" → panel: ${panel ? `${panel.bg} · shadow ${panel.shadow} · border ${panel.border}` : "(none)"}`);
  console.log(`  eyebrow "${panel?.eyebrow}" in ${panel?.eyebrowFont} · buttons ${JSON.stringify(panel?.buttons)}`);
  expect(panel, "the pill opened no editor").not.toBeNull();
  expect(panel!.onScreen, "the editor opened off screen").toBe(true);
  /* ⚠️ WHITE, WITH THE PAGE'S STANDARD POPOVER SHADOW AND A HAIRLINE — not the cream sheet. */
  expect(panel!.bg, "the editor is not on white").toBe("rgb(255, 255, 255)");
  expect(panel!.shadow, "the editor has no shadow").not.toBe("none");
  expect(panel!.border, "the editor has no hairline rim").toContain("1px");
  expect(panel!.eyebrowFont.toLowerCase(), "the eyebrow is not mono").toContain("mono");
  expect(parseFloat(panel!.eyebrowFont.split(" ").pop() || "99"), "the eyebrow is display-size").toBeLessThan(12);
  /* ⚠️ NO DONE AND NO SAVE — the section's own test, and the whole reason the surface changed. */
  for (const b of panel!.buttons) {
    expect(b.toLowerCase(), `the editor still carries a "${b}" control`).not.toMatch(/^(done|save)/);
  }
  expect(panel!.oldSheet, "the old sheet's DONE foot is still rendered").toBe(0);

  /* Esc closes and returns focus to the opener */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    open: document.querySelectorAll(".f12-panel").length,
    focused: (document.activeElement?.className || "").toString().slice(0, 30),
  }));
  console.log(`  after Esc: ${after.open} panels · focus on "${after.focused}"`);
  expect(after.open, "Esc left the editor open").toBe(0);
  expect(after.focused, "Esc did not return focus to the opener").toContain("qc-mchip");

  /* ── the attach route: Opening sample attaches AND hands over ── */
  const before = await page.locator(".qc-sentmat .qc-mchip-att").count();
  await page.locator(".qc-mchip-add").click();
  await page.waitForTimeout(300);
  await page.locator('[role="menu"] .f12-menu-item', { hasText: "Opening sample" }).click();
  await page.waitForTimeout(900);
  const handed = await page.evaluate(() => ({
    pills: document.querySelectorAll(".qc-sentmat .qc-mchip-att").length,
    eyebrow: (document.querySelector(".f12-panel-eyebrow")?.textContent || "").trim(),
    stepper: document.querySelectorAll(".f12-step input").length,
    units: [...document.querySelectorAll<HTMLElement>(".f12-units button")].map((b) => `${(b.textContent || "").trim()}${b.classList.contains("on") ? "*" : ""}`),
    hint: (document.querySelector(".f12-panel-hint")?.textContent || "").trim(),
  }));
  console.log(`\nAttach → Opening sample: ${before} → ${handed.pills} pills · editor "${handed.eyebrow}" · units ${handed.units.join(" ")} · hint "${handed.hint}"`);
  /* ⚠️ IT ATTACHES AND THEN OPENS — a sample without a size is half a fact, and the pill must exist
     before the editor does so that closing without touching it leaves a real material. */
  expect(handed.pills, "choosing Opening sample did not attach it").toBe(before + 1);
  expect(handed.eyebrow.toLowerCase(), "it attached without handing over to the editor").toBe("opening sample");
  expect(handed.stepper, "the editor has no typeable stepper").toBe(1);
  expect(handed.units.length, "the editor has no unit pills").toBe(3);
  console.log(`  (the hint line renders only when the agent states a size — this agent: ${handed.hint ? "yes" : "no"})`);

  /* clean up: remove what the walk attached, from inside the editor */
  await page.locator(".f12-panel-rm").click();
  await page.waitForTimeout(900);
  const restored = await page.locator(".qc-sentmat .qc-mchip-att").count();
  console.log(`  removed from inside the editor: ${restored} pills`);
  expect(restored, "Remove from this send left the pill behind").toBe(before);
});

/**
 * §2 (outlined-bar pack) — the pills are filled pink, and the sample names itself from its size.
 *
 * ⚠️ THE POINT OF MEASURING RATHER THAN LOCKING THE CSS is that the claim is "the SAME pink as the
 * primary button", and only the page can settle that: the tokens are overridden per palette, so two
 * rules naming two tokens can still paint one colour, and two rules naming ONE token can paint two.
 * It reads the button and the pills and compares the values it finds.
 */
test("§2 — filled pink pills, and a sample that states its own size", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);

  const g = await page.evaluate(() => {
    const read = (el: Element) => {
      const c = getComputedStyle(el as HTMLElement);
      return {
        text: (el.textContent || "").replace(/\s+/g, " ").trim(),
        bg: c.backgroundColor, rim: c.borderTopColor, ink: c.color, weight: c.fontWeight,
        clip: (() => { const s = el.querySelector("svg"); return s ? getComputedStyle(s).stroke : null; })(),
        figures: (() => { const t = el.querySelector(".qc-mchiptx"); return t ? getComputedStyle(t).fontVariantNumeric : null; })(),
      };
    };
    const logq = document.querySelector(".qc-logq");
    const row = document.querySelector(".f12-row.f12-sel") || document.querySelector(".f12-row");
    return {
      pills: [...document.querySelectorAll(".qc-sentmat .qc-mchip-att")].map(read),
      primary: logq ? getComputedStyle(logq).backgroundColor : null,
      selectedRow: row ? getComputedStyle(row).backgroundColor : null,
      badges: document.querySelectorAll(".qc-mqtybadge").length,
    };
  });
  console.log(`\nprimary fill ${g.primary} · selected row ${g.selectedRow} · quantity badges ${g.badges}`);
  g.pills.forEach((p) => console.log(`  "${p.text}" · ${p.ink}/${p.weight} on ${p.bg} · rim ${p.rim} · clip ${p.clip} · ${p.figures}`));
  expect(g.pills.length, "no materials on this query to read").toBeGreaterThan(0);

  /* ⚠️ THE SAME FILL AS THE PRIMARY, ASSERTED AGAINST THE BUTTON RATHER THAN A HEX — the pack's
     rule is "the pink the page already has", and a hex here would pass on the day someone added a
     fourth pink that happened to match. */
  for (const p of g.pills) {
    expect(p.bg, `"${p.text}" is not the primary's fill`).toBe(g.primary);
    expect(p.rim, `"${p.text}" has no rim of its own`).not.toBe(p.bg);
    expect(Number(p.weight), `"${p.text}" is not at medium weight`).toBeGreaterThanOrEqual(500);
    expect(p.clip, `"${p.text}"'s paperclip is not burgundy`).toBe("rgb(124, 58, 42)");
    expect(p.figures, `"${p.text}" is not on tabular figures`).toContain("tabular-nums");
  }
  /* ⚠️ AND THE SIZE CHIP IS GONE, page-wide — not just off the sample. */
  expect(g.badges, "a quantity badge is still rendering").toBe(0);

  /* ⚠️ THE SAMPLE'S LABEL IS ITS SIZE. Reported rather than required, because whether this query
     carries a sized sample is data, not markup — a `toBeGreaterThan(0)` here would fail on an
     account whose first query happens to have sent only a letter. */
  /* ⚠️ IF THIS QUERY HAS NO SAMPLE, ATTACH ONE AND MEASURE THAT — the derived label is the whole of
     §2b and reporting it as "no data on this account" would leave the pack's main claim unproven on
     a page. The attach route is the same one §2's flow above walks; the sample is removed again at
     the end so the account is left as it was found. */
  let pills = g.pills;
  let attached = false;
  if (!pills.some((p) => /^First /.test(p.text))) {
    await page.locator(".qc-mchip-add").click();
    await page.waitForTimeout(300);
    await page.locator('[role="menu"] .f12-menu-item', { hasText: "Opening sample" }).click();
    await page.waitForTimeout(900);
    pills = await page.evaluate(() => [...document.querySelectorAll(".qc-sentmat .qc-mchip-att")].map((el) => ({
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      bg: getComputedStyle(el as HTMLElement).backgroundColor, rim: "", ink: "", weight: "", clip: null as string | null, figures: null as string | null,
    })));
    attached = true;
    console.log(`  attached a sample → ${pills.map((p) => `"${p.text}"`).join(", ")}`);
  }
  const sized = pills.filter((p) => /^First /.test(p.text));
  console.log(`  sized samples: ${sized.length ? sized.map((s) => `"${s.text}"`).join(", ") : "(none on this query)"}`);
  expect(sized.length, "no sample on this query and attaching one produced no sized pill").toBeGreaterThan(0);
  for (const s of sized) {
    expect(s.text, `"${s.text}" still names the type instead of the size`).not.toContain("Opening sample");
    expect(s.text, `"${s.text}" reads as an assembled label`).not.toMatch(/First 1 /);
    expect(s.text, `"${s.text}" states no unit`).toMatch(/chapters?|pages?|words?/);
  }

  /* ⚠️ LEAVE THE ACCOUNT AS IT WAS FOUND — through the editor the attach route already opened,
     not through the pill's ×. The × is `display:none` until its pill is hovered, and a hovered
     element under an undo toast is a click that waits for the full timeout: it cost seven minutes
     of one run to find that out. The editor's own `Remove from this send` is on screen and is the
     removal path the earlier case in this file already walks. */
  if (attached) {
    const rm = page.locator(".f12-panel button", { hasText: "Remove from this send" });
    const seen = await rm.count();
    if (seen === 1) {
      await rm.click({ timeout: 5000 });
      await page.waitForTimeout(600);
      console.log(`  removed the attached sample · ${await page.locator(".qc-sentmat .qc-mchip-att").count()} pills left`);
    } else {
      /* ⚠️ REPORTED, NOT RETRIED. Two matches or none means the editor is not where this run left
         it, and a click into that is how a cleanup step becomes a seven-minute timeout. */
      console.log(`  ⚠️ the attached sample was NOT removed — ${seen} remove controls on screen`);
    }
  }
});
