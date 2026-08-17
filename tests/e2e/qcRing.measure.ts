/**
 * §3a — DIAGNOSIS ONLY. What paints a border around a clicked row, and which rule does it.
 *
 * ⚠️ IT ASKS THE BROWSER FOR THE MATCHED RULES, not for a computed value. `getComputedStyle` says
 * a border is 2px dark and cannot say WHICH rule put it there; CDP's `CSS.getMatchedStylesForNode`
 * is what DevTools' Styles panel is, so it returns the selector, the stylesheet and the line.
 *
 *   npx playwright test --project=measure qcRing
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

/** Every box a rule could be painting: the row, what it holds, and what holds it. */
const PAINTERS = `(el) => {
  const out = [];
  const seen = new Set();
  const look = (n, where) => {
    if (!n || seen.has(n)) return; seen.add(n);
    const c = getComputedStyle(n);
    const parts = [];
    if (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) parts.push("outline " + c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor);
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      if (c["border" + side + "Style"] !== "none" && parseFloat(c["border" + side + "Width"]) > 0) {
        parts.push("border-" + side.toLowerCase() + " " + c["border" + side + "Width"] + " " + c["border" + side + "Color"]);
      }
    }
    if (c.boxShadow && c.boxShadow !== "none") parts.push("box-shadow " + c.boxShadow);
    for (const pseudo of ["::before", "::after"]) {
      const p = getComputedStyle(n, pseudo);
      if (p.content !== "none") {
        if (p.boxShadow && p.boxShadow !== "none") parts.push(pseudo + " box-shadow " + p.boxShadow);
        if (p.borderTopStyle !== "none" && parseFloat(p.borderTopWidth) > 0) parts.push(pseudo + " border " + p.borderTopWidth + " " + p.borderTopColor);
        if (p.outlineStyle !== "none" && parseFloat(p.outlineWidth) > 0) parts.push(pseudo + " outline " + p.outlineWidth + " " + p.outlineColor);
      }
    }
    if (parts.length) out.push({ where, tag: n.tagName.toLowerCase(), cls: n.className && n.className.baseVal !== undefined ? n.className.baseVal : String(n.className || ""), paints: parts });
  };
  look(el, "the row");
  el.querySelectorAll("*").forEach((k, i) => look(k, "child " + i));
  let p = el.parentElement, up = 0;
  while (p && up < 4) { look(p, "ancestor " + (++up)); p = p.parentElement; }
  return out;
}`;

test("§3a — what is painting the ring, and from which rule", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  const row = page.locator(".f12-row").nth(3);
  await row.click({ timeout: 5000 });
  await page.waitForTimeout(400);

  /* ⚠️ THE ROW, NOT `document.activeElement`. If the click never focuses the row, activeElement is
     `body` and every "no ring" assertion passes while measuring the wrong element entirely. */
  const who = await page.evaluate(({ sel }) => (document.activeElement as HTMLElement)?.className ?? "(none)", { sel: 1 });
  console.log(`\nafter a CLICK · activeElement = ${who}`);
  const clicked = await row.evaluate(new Function("el", `return (${PAINTERS})(el)`) as any);
  console.log(JSON.stringify(clicked, null, 1));

  const fv = await row.evaluate((el) => { try { return el.matches(":focus-visible"); } catch { return "unsupported"; } });
  console.log(`row matches :focus-visible after click = ${fv}`);

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const kbdRow = page.locator(".f12-row").nth(4);
  const kbd = await kbdRow.evaluate(new Function("el", `return (${PAINTERS})(el)`) as any);
  console.log(`\nafter ARROWDOWN · row 4`);
  console.log(JSON.stringify(kbd, null, 1));
  console.log(`row matches :focus-visible after keyboard = ${await kbdRow.evaluate((el) => { try { return el.matches(":focus-visible"); } catch { return "unsupported"; } })}`);

  /* ⚠️ THE ORDER A WRITER ACTUALLY PRODUCES: keyboard FIRST, then a click. A click-then-keyboard
     sweep can never see a ring that a click INHERITS from the keyboard-focused row it replaces. */
  const ring = (n: number) => page.locator(".f12-row").nth(n).evaluate((el) => {
    const c = getComputedStyle(el);
    return { fv: (() => { try { return el.matches(":focus-visible"); } catch { return null; } })(), shadow: c.boxShadow, focused: document.activeElement === el };
  });
  for (const n of [6, 2, 8]) {
    await page.locator(".f12-row").nth(n).click({ timeout: 5000 });
    await page.waitForTimeout(350);
    const r = await ring(n);
    console.log(`\nkeyboard-then-CLICK row ${n}: focused=${r.focused} :focus-visible=${r.fv}\n  box-shadow ${r.shadow}`);
  }

  /* ⚠️ AND THE WHOLE PAGE, NOT JUST THE ROW — a ring "around the row" may be painted by something
     that is not the row. Anything on screen wearing an outline or a ≥2px shadow ring. */
  await page.locator(".f12-row").nth(3).click({ timeout: 5000 });
  await page.waitForTimeout(300);
  const sweep = await page.evaluate(() => {
    const out: string[] = [];
    const scope = document.querySelector(".qc-wpg") ?? document.querySelector(".f12-root") ?? document.body;
    out.push(`(scope ${scope.className || scope.tagName} · ${scope.querySelectorAll("*").length} descendants)`);
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 12) continue;
      const c = getComputedStyle(el);
      const ring = c.boxShadow !== "none" && /0px 0px 0px [2-9]/.test(c.boxShadow);
      const out1 = c.outlineStyle !== "none" && parseFloat(c.outlineWidth) >= 1;
      const bord = parseFloat(c.borderTopWidth) >= 1.5;
      if (ring || out1 || bord) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 44)} · ${Math.round(r.width)}×${Math.round(r.height)} · outline ${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor} · border ${c.borderTopWidth} ${c.borderTopColor} · shadow ${c.boxShadow.slice(0, 70)}`);
    }
    return out;
  });
  console.log(`\n── everything on the Query Centre wearing a ring/outline/≥1.5px border after a click ──`);
  sweep.forEach((s) => console.log("  " + s));
  await page.screenshot({ path: "reports/qc/ring-clicked.png" });
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(250);
  await page.screenshot({ path: "reports/qc/ring-keyboard.png" });

  /* ── the Styles panel, via CDP: every rule that matches the clicked row, in cascade order ── */
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = (await cdp.send("DOM.getDocument", { depth: -1, pierce: true })) as any;
  const { nodeIds } = (await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: ".f12-row" })) as any;
  const nodeId = nodeIds[3];
  const matched = (await cdp.send("CSS.getMatchedStylesForNode", { nodeId })) as any;
  const sheets = new Map<string, string>();
  for (const m of matched.matchedCSSRules ?? []) {
    const r = m.rule;
    const id = r.styleSheetId;
    if (id && !sheets.has(id)) {
      try { sheets.set(id, ((await cdp.send("CSS.getStyleSheetText", { styleSheetId: id })) as any).text); } catch { sheets.set(id, ""); }
    }
  }
  console.log(`\n── every rule matching .f12-row, in cascade order ──`);
  for (const m of matched.matchedCSSRules ?? []) {
    const r = m.rule;
    const decls = (r.style?.cssProperties ?? [])
      .filter((p: any) => /outline|border|box-shadow/.test(p.name) && p.value)
      .map((p: any) => `${p.name}: ${p.value}`);
    if (!decls.length) continue;
    const origin = r.origin;
    const href = r.styleSheetId ? (matched as any).cssKeyframesRules : null;
    const line = r.style?.range ? r.style.range.startLine + 1 : "?";
    console.log(`  ${r.selectorList.text}   [${origin} · line ${line}]  →  ${decls.join(" ; ")}`);
  }
  /* pseudo-element rules too — a ::after ring never shows in the element's own list */
  for (const pe of matched.pseudoElements ?? []) {
    for (const m of pe.matches ?? []) {
      const decls = (m.rule.style?.cssProperties ?? []).filter((p: any) => /outline|border|box-shadow|content/.test(p.name) && p.value).map((p: any) => `${p.name}: ${p.value}`);
      if (decls.length) console.log(`  ${m.rule.selectorList.text}${pe.pseudoType}   →  ${decls.join(" ; ")}`);
    }
  }
});
