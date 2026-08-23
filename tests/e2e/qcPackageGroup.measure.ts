/**
 * §1/§2/§4 · the package group in a send (refs 177, 178).
 *   SA_E2E_BASE_URL=dev npx playwright test --project=measure qcPackageGroup
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { harnessDb, snapshotQuery } from "./harnessDocs";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";

const PKG_QUERY = "seed-pkgq-1";

/** Attach the seeded package to the seeded query, so the group has something to draw. */
const ensureAttached = async () => {
  const { db, uid } = await harnessDb();
  /* ⚠️ ALWAYS WRITES. The first version returned early when a package item was already present, so
     changing the fixture changed nothing and the check reported the PAGE failing to draw a loose
     pill that had never been put there. */
  const pkg = (await getDoc(doc(db, "users", uid, "packages", "seed-pkg-1"))).data() as any;
  await updateDoc(doc(db, "users", uid, "queries", PKG_QUERY), {
    packageId: "",
    materialsWanted: [
      { material: "Query Letter", fromPackageId: "seed-pkg-1", fromPackageName: pkg.packageName },
      { material: "Synopsis", fromPackageId: "seed-pkg-1", fromPackageName: pkg.packageName },
      { material: "Sample Pages", fromPackageId: "seed-pkg-1", fromPackageName: pkg.packageName },
      /* ⚠️ AN `Other` FREE-TEXT ITEM, NOT "Author bio" — that material was retired from this app and
         is stripped on every materials commit, so it renders nothing and the loose-pill count read
         zero about a fixture that had never put a pill on the page. */
      { material: "Other", type: "other", quantity: "Comparable titles list" },
    ],
  });
};

const readGroup = (page: any) => page.evaluate(() => {
  const g = document.querySelector(".qc-pkggrp");
  if (!g) return null;
  const cs = getComputedStyle(g);
  const meta = g.querySelector(".qc-pkggrp-meta");
  const pill = g.querySelector(".qc-mchip");
  /* ⚠️ EVERY MATERIAL PILL NOT INSIDE A GROUP. The first form was `.qc-sentmat > .qc-mchip`, a
     direct-child selector that matched nothing because the pills are not direct children — it
     reported the page failing to draw a loose pill that was on screen the whole time. */
  const loose = Array.from(document.querySelectorAll(".qc-mchip-att")).filter((c) => !c.closest(".qc-pkggrp"));
  return {
    name: (g.querySelector(".qc-pkggrp-name")?.textContent || "").trim(),
    meta: (meta?.textContent || "").replace(/\s+/g, " ").trim(),
    hasView: !!g.querySelector(".qc-pkggrp-view"),
    mark: !!g.querySelector('[data-art="package-mark"]'),
    inside: g.querySelectorAll(".qc-mchip").length,
    outside: loose.length,
    bg: cs.backgroundColor, border: cs.borderColor,
    /* ⚠️ THE PILLS MUST TAKE NOTHING FROM THE GROUP (ref 178) */
    pillBg: pill ? getComputedStyle(pill).backgroundColor : "",
    pillColor: pill ? getComputedStyle(pill).color : "",
  };
});

test("§1 · the package's items sit in a group; hand-attached ones sit below it", async ({ page }) => {
  test.setTimeout(240000);
  await ensureAttached();
  await openRoute(page, `/queries?q=${PKG_QUERY}`, { width: 1440, height: 900 });
  await page.waitForTimeout(2600);

  const g = await readGroup(page);
  expect(g, "no package group rendered").not.toBeNull();
  console.log(`  group "${g!.name}" · meta "${g!.meta}" · view ${g!.hasView} · mark ${g!.mark}`);
  console.log(`  pills inside ${g!.inside} · loose below ${g!.outside}`);
  expect(g!.name).toBe("Standard UK");
  expect(g!.mark, "the shared package mark did not render").toBe(true);
  expect(g!.inside, "the package's three items are not in the group").toBe(3);
  expect(g!.outside, "the hand-attached item did not sit below the group").toBeGreaterThan(0);
  expect(g!.hasView, "no view link to the package").toBe(true);

  /* §4 · blue on the group, nothing on the pills */
  console.log(`  blue · ground ${g!.bg} · rim ${g!.border} · pill ground ${g!.pillBg}`);
  expect(g!.bg, "the group is not on the pastille ground").toBe("rgb(237, 241, 246)");
  expect(g!.border, "the group's rim is not pastille blue").toBe("rgb(194, 207, 218)");
  /* ⚠️ NOT ON THE PILLS — they would read as a different kind of material. */
  expect(g!.pillBg, "a pill inside the group took the group's blue").not.toBe("rgb(237, 241, 246)");
});

test("§4 · the meta line's contrast is measured against the group's ground, not white", async ({ page }) => {
  test.setTimeout(240000);
  await ensureAttached();
  await openRoute(page, `/queries?q=${PKG_QUERY}`, { width: 1440, height: 900 });
  await page.waitForTimeout(2600);
  const r = await page.evaluate(() => {
    const meta = document.querySelector(".qc-pkggrp-meta") as HTMLElement;
    const group = document.querySelector(".qc-pkggrp") as HTMLElement;
    if (!meta || !group) return null;
    const px = (s: string) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    const L = ([r0, g0, b0]: number[]) => 0.2126 * lin(r0) + 0.7152 * lin(g0) + 0.0722 * lin(b0);
    const mc = getComputedStyle(meta), gc = getComputedStyle(group);
    const a = L(px(mc.color)), b = L(px(gc.backgroundColor));
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), size: mc.fontSize, ink: mc.color, ground: gc.backgroundColor };
  });
  expect(r, "the meta line is missing").not.toBeNull();
  console.log(`  meta ${r!.ink} on ${r!.ground} at ${r!.size} → ${r!.ratio.toFixed(2)}:1`);
  /* ⚠️ AGAINST THE GROUP'S BLUE GROUND, NOT WHITE — mono 9px is small text, so AA is 4.5. */
  expect(r!.ratio, "the meta line fails AA on the group's own ground").toBeGreaterThanOrEqual(4.5);
});
