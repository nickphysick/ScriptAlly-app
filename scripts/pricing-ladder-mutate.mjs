/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The source-level breaks that prove pricingLadder.measure.ts's behaviour locks go red (pricing ladder,
 * 26 Oct). CSS breaks are applied in the page (`PL_MUTATE`); these change what the code does, so each is
 * a source edit and a rebuild.
 *
 *   node scripts/pricing-ladder-mutate.mjs apply <name>     then: npm run build:dev, run the lock
 *   node scripts/pricing-ladder-mutate.mjs restore           puts every touched file back
 *
 * ⚠️ RUN IT IN A MEASUREMENT WORKTREE, NEVER IN A SHARED CHECKOUT. Backups are named by the file's PATH
 * (two names differing only in case are one file on this machine), `restore` copies them back rather
 * than asking git (which would restore HEAD and take uncommitted work with it), and it refuses to stack
 * two breaks.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const DIR = ".pl-mut";
const PLANS = "src/marketing/PricingPlans.tsx";
const PHONE = "src/marketing/PricingPhone.tsx";
const DESK = "src/marketing/PricingPage.tsx";
const COPY = "src/marketing/pricingCopy.ts";
const EST = "src/marketing/campaignEstimate.ts";
const FILES = [PLANS, PHONE, DESK, COPY, EST];

/** name → [file, exact text, replacement][] */
const BREAKS = {
  /* PL-1: the ladder opens on 3 months */
  default: [[COPY, 'export const LADDER_DEFAULT: ProPlan["months"] = 6;', 'export const LADDER_DEFAULT: ProPlan["months"] = 3;']],
  /* PL-1: the one-month row stays checked whatever else is */
  multi: [[PLANS, "            aria-checked={on}", "            aria-checked={on || p.months === 1}"]],
  /* PL-1: the arrow keys do nothing */
  keys: [[PLANS, "    const to = ladderStep(selected, e.key);\n    if (to === null) return;", "    const to = ladderStep(selected, e.key);\n    if (to !== -1) return;"]],
  /* PL-1 and PL-5: the one-month row says "Add to any plan" again */
  line: [[COPY, '{ lead: "The monthly rate", save: null }', '{ lead: "Add to any plan", save: null }']],
  /* PL-2: every row is flagged once there is a result */
  fit: [
    [PLANS, '"mk-rung" + (p.months === fit ? " mk-rung--fit" : "")', '"mk-rung" + (fit !== null ? " mk-rung--fit" : "")'],
    [PLANS, "{p.months === fit && <span", "{fit !== null && <span"],
  ],
  /* PL-2 (phone): "See it in the plans" no longer opens the Pro tab */
  seetab: [[PHONE, "    setSheetOpen(false);\n    setTab(1);", "    setSheetOpen(false);"]],
  /* PL-2 (phone): …and neither scrolls to the Pro card nor focuses its checked row */
  seescroll: [
    [PHONE, "        window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - navH - tabsH, behavior: scrollBehavior() });", "        void navH; void tabsH;"],
    [PHONE, "      section.querySelector<HTMLElement>('#mk-pvpanel-pro [role=radio][aria-checked=\"true\"]')?.focus({ preventScroll: true });", "      void card;"],
  ],
  /* PL-3: both panels are always shown */
  panels: [
    [PHONE, 'aria-labelledby="mk-pvtab-free" hidden={tab !== 0}', 'aria-labelledby="mk-pvtab-free" hidden={false}'],
    [PHONE, 'aria-labelledby="mk-pvtab-pro" hidden={tab !== 1}', 'aria-labelledby="mk-pvtab-pro" hidden={false}'],
  ],
  /* PL-3: the arrow keys do nothing on the tabs */
  tabkeys: [[PHONE, '  key === "ArrowRight" || key === "ArrowLeft" ? 1 - from : key === "Home" ? 0 : key === "End" ? 1 : null;', "  (void from, void key, null);"]],
  /* PL-4: a Pro plans box on desktop and a swipe track on the phone come back */
  removal: [
    [DESK, '        <div className="mk-lpair">', '        <div className="mk-pv4plans" />\n        <div className="mk-lpair">'],
    [PHONE, '      <div className="mk-pvtabs">', '      <div className="mk-pvtrack" />\n      <div className="mk-pvtabs">'],
  ],
  /* PL-5: the small print twice (under Free as well) */
  small: [[PLANS, '      <p className="mk-lsub">{PV4_FREE.sub}</p>', '      <p className="mk-lsub">{PV4_FREE.sub}</p>\n      <p className="mk-lsmall">{LADDER_SMALL}</p>']],
  /* PL-5 (phone): the small print twice inside the Pro card — `small` above only shows on desktop, where
     the Free card is on screen; on a phone it is a hidden tab and the check reads what is visible */
  small2: [[PLANS, '      <p className="mk-lsmall">{LADDER_SMALL}</p>', '      <p className="mk-lsmall">{LADDER_SMALL}</p>\n      <p className="mk-lsmall">{LADDER_SMALL}</p>']],
  /* PL-5: an old tail and an old FAQ answer back */
  copy: [
    [EST, `"If your last replies run late, your plan simply carries on month by month until you're done."`, `"If your last replies run late, we'll be in touch with options to extend."`],
    [COPY, `"Congratulations! Record your signing and we'll offer to stop your renewal there and then. Your plan " +`, `"Congratulations! Your plan will simply run to the end of its months, and it won't renew automatically. " +`],
  ],
};

const backup = (f) => `${DIR}/${f.replace(/\//g, "-")}`;
const [, , cmd, name] = process.argv;
if (cmd === "apply") {
  const list = BREAKS[name];
  if (!list) { console.error(`no break called ${name}: ${Object.keys(BREAKS).join(", ")}`); process.exit(1); }
  if (existsSync(DIR) && readdirSync(DIR).length) { console.error(`STOP: ${DIR}/ holds an unrestored break — run restore first`); process.exit(1); }
  mkdirSync(DIR, { recursive: true });
  for (const [f] of list) if (!existsSync(backup(f))) copyFileSync(f, backup(f));
  for (const [f, from, to] of list) {
    const src = readFileSync(f, "utf8");
    if (src.split(from).length !== 2) { console.error(`STOP: ${f} does not contain exactly one of: ${from}`); process.exit(1); }
    writeFileSync(f, src.replace(from, to));
  }
  console.log(`applied ${name} (${list.length} edit${list.length > 1 ? "s" : ""})`);
} else if (cmd === "restore") {
  if (!existsSync(DIR)) { console.log("nothing to restore"); process.exit(0); }
  for (const b of readdirSync(DIR)) {
    const f = FILES.find((p) => backup(p) === `${DIR}/${b}`);
    if (!f) { console.error(`STOP: unknown backup ${b}`); process.exit(1); }
    copyFileSync(`${DIR}/${b}`, f);
  }
  rmSync(DIR, { recursive: true });
  console.log("restored");
} else {
  console.error("usage: apply <name> | restore");
  process.exit(1);
}
