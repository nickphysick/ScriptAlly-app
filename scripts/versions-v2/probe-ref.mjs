// Versions v2 — read boxes and computed values off the ref (dev aid for the port). node probe-ref.mjs <ref> <w> <h> <js>
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
const [, , ref, w, h, js] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(pathToFileURL(ref).href); await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector(".gd-pop")?.remove());
console.log(JSON.stringify(await p.evaluate(js), null, 1)); await b.close();
