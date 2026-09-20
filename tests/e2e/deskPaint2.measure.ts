import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { openQueryById, openTab, pressAction } from "./openQuery";
test("token scope + the rung's inline method — 1440", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const host = await openQueryById(page, "cor-move-b");
  await openTab(page, host, "Tracking");
  await page.locator(`${host.root} .tl-more`).first().waitFor();

  /* (a) the rung: is the method inline after the title? */
  const rung = await page.evaluate((rootSel) => {
    const qpn = [...document.querySelectorAll<HTMLElement>(rootSel)].find((e) => e.getBoundingClientRect().height > 0)!;
    const row = qpn.querySelector<HTMLElement>(".tl-r1");
    const title = row?.querySelector<HTMLElement>(".tl-ttl, .tl-ev-title, .tl-evtitle");
    const method = row?.querySelector<HTMLElement>(".qp-inplace");
    const R = (e: HTMLElement | null | undefined) => e ? (() => { const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1) }; })() : null;
    return {
      rowHTML: row?.innerHTML.slice(0, 220),
      rowDisplay: row ? getComputedStyle(row).display : null,
      rowAlign: row ? getComputedStyle(row).alignItems : null,
      title: R(title), titleDisplay: title ? getComputedStyle(title).display : null,
      method: R(method), methodDisplay: method ? getComputedStyle(method).display : null,
      methodWrapDisplay: method?.parentElement ? `${method.parentElement.className}:${getComputedStyle(method.parentElement).display}` : null,
    };
  }, host.root);
  console.log("RUNG " + JSON.stringify(rung, null, 1));

  /* (b) the token: does --stage-accent resolve on the portalled desk as it does in the drawer? */
  await pressAction(page, host, /Nudge/i);
  await page.locator(".qcd-card .qrd-mail").waitFor();
  const tok = await page.evaluate((rootSel) => {
    const qpn = [...document.querySelectorAll<HTMLElement>(rootSel)].find((e) => e.getBoundingClientRect().height > 0)!;
    const desk = document.querySelector<HTMLElement>(".qcd")!;
    const card = document.querySelector<HTMLElement>(".qcd-card")!;
    const val = (el: Element, p: string) => getComputedStyle(el).getPropertyValue(p).trim();
    return {
      deskParent: desk.parentElement?.tagName,
      panelAccent: val(qpn, "--stage-accent"), panelOut3: val(qpn, "--stage-out-3"),
      deskAccent: val(desk, "--stage-accent"), deskOut3: val(desk, "--stage-out-3"),
      cardBorderTop: getComputedStyle(card).borderTopColor,
      panelTabUnderline: (() => { const t = qpn.querySelector(".qpn-tab--on"); return t ? getComputedStyle(t).borderBottomColor : null; })(),
      t_f12_on_body: document.body.classList.contains("t-f12"),
      whereT12: (() => { const e = document.querySelector(".t-f12"); return e ? e.className.toString().slice(0, 40) : "NONE"; })(),
      cardPaddingTop: getComputedStyle(card).paddingTop,
    };
  }, host.root);
  console.log("TOKEN " + JSON.stringify(tok, null, 1));
});
