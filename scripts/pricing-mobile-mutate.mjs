/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The source-level breaks that prove pricingMobile.measure.ts's BEHAVIOUR locks go red (pricing on
 * phones, 25 Oct). A CSS break is applied in the page (`PVM_MUTATE`); a break in what the code does
 * has to be a source change and a rebuild, and this is how each one is made and undone.
 *
 *   node scripts/pricing-mobile-mutate.mjs apply <name>     then: npm run build:dev, run the lock
 *   node scripts/pricing-mobile-mutate.mjs restore           puts every touched file back
 *
 * ⚠️ RUN IT IN A MEASUREMENT WORKTREE, NEVER IN A SHARED CHECKOUT. Backups are named by the file's
 * PATH (`.pvm-mut/src-marketing-PricingPhone.tsx`), never its basename — on this machine two names
 * differing only in case are one file — and `restore` copies them back rather than asking git,
 * which would restore HEAD and take any uncommitted work with the mutation.
 * ⚠️ IT REFUSES TO APPLY OVER AN UNRESTORED BREAK, so two breaks cannot silently stack.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const DIR = ".pvm-mut";
const PHONE = "src/marketing/PricingPhone.tsx";
const SHEET = "src/marketing/PlanSheetPhone.tsx";
const EST = "src/marketing/campaignEstimate.ts";
const COPY = "src/marketing/pricingCopy.ts";

/** name → [file, exact text, replacement][] */
const BREAKS = {
  /* PVM-4: the dots no longer follow the swipe */
  dots: [[PHONE, "card > 0 ? Math.min(count - 1, Math.max(0, Math.round(left / (card + 10)))) : 0", "0"]],
  /* PVM-6: three breaks in one build, each caught by its own soft assertion. (The tile break and PVM-5's
     and PVM-9's breaks were retired with their locks, 26 Oct; the ladder's are pricing-ladder-mutate.mjs.) */
  sheet: [
    [SHEET, 'if (e.key !== "Tab" || !dialog.current) return;', "return;"],
    [SHEET, '    els.forEach((e) => { e.style.overflow = "hidden"; });', "    void els;"],
    [PHONE, "    opener.current?.focus({ preventScroll: true });\n  }, []);", "  }, []);"],
  ],
  /* PVM-7 / 7b: shown without a figure, shown over the open sheet, and the field left unfocused */
  sticky: [
    [PHONE, "  const live = !!count && state !== \"down\" && formIsVisible(state);", "  const live = state !== \"down\" && formIsVisible(state);"],
    [PHONE, "  if (!host || !live || !count) return null;\n  const on = away && !blocked;", "  if (!host || !live) return null;\n  const on = away;"],
    [PHONE, "<p>{foundingPlacesLeftLabel(count.claimed, count.cap)}", "<p>{count ? foundingPlacesLeftLabel(count.claimed, count.cap) : \"\"}"],
    [PHONE, "    window.setTimeout(() => field?.focus({ preventScroll: true }), reduceMotion() ? 0 : 450);", "    void field;"],
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
    const f = [PHONE, SHEET, EST, COPY].find((p) => backup(p) === `${DIR}/${b}`);
    if (!f) { console.error(`STOP: unknown backup ${b}`); process.exit(1); }
    copyFileSync(`${DIR}/${b}`, f);
  }
  rmSync(DIR, { recursive: true });
  console.log("restored");
} else {
  console.error("usage: apply <name> | restore");
  process.exit(1);
}
