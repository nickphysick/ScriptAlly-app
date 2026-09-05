/**
 * ⚠️ COMPLETION LEAVES THE LIST — drawer round, Phase 5.
 *
 * RED FIRST, IN THE BRIEF'S ORDER: (1) a crossover completes the ORIGINATING row — the send row
 * when a send crossed to a close — because that is the only place the row and the sheet can
 * disagree about which task just finished; (2) Undo within the window keeps the row and restores
 * the sheet; (3) the last task closing the drawer.
 *
 * ⚠️ IT COMMITS, SO IT RESTORES IN THE SAME RUN — the standing rule, and this file's structure is
 * that rule. The crossover case commits a real close and presses Undo INSIDE the window with no
 * navigation between; the expiry case (the row actually leaving) is run against a FIXTURE TASK
 * this spec creates through the same Firebase SDK the board-shapes fixture uses, and deletes in
 * its teardown whatever happened in between — a lapsed window spends the toast, so the fixture,
 * not the toast, is what makes the run residue-free. If the delete fails the run FAILS LOUDLY.
 *
 * ⚠️ NO BACKTICKS OR REGEX LITERALS INSIDE ANY page.evaluate TEMPLATE. The runner refuses a run
 * under 15 assertions — silence is not a pass.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_CL_OUT ?? "run-artifacts/completion-leaves.txt";
rmSync(OUT, { force: true });

const SETTLED = "document.querySelector('.tdw-split').getAnimations().length === 0";
const FIXT = "fixt-p5-leaving";
/* the hold is the undo toast's own window (useTodoToast WITH_UNDO_MS = 8000) + the 300ms fade */
const WINDOW_MS = 8000;

const env = (f: string) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));

test("completion holds through the window, then the row leaves and the sheet moves on", async ({ page }) => {
  test.setTimeout(180_000);
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  /* ── the fixture: one task this run owns outright ─────────────────────────────────────── */
  const dev = env(".env.development");
  const local = existsSync(".env.local") ? env(".env.local") : {};
  if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
  const app = initializeApp({
    apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
  }, "p5-fixture");
  const cred = await signInWithEmailAndPassword(getAuth(app),
    process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
    process.env.SA_E2E_PASSWORD ?? (local.SA_E2E_PASSWORD as string));
  const fs = getFirestore(app);
  const taskRef = doc(fs, "users", cred.user.uid, "tasks", FIXT);
  const nowIso = new Date().toISOString();
  await deleteDoc(taskRef).catch(() => {});
  await setDoc(taskRef, {
    id: FIXT, userId: cred.user.uid,
    text: "P5 fixture — completion leaves the list",
    done: false, createdAt: nowIso, updatedAt: nowIso, dueDate: nowIso.slice(0, 10),
  });

  try {
    await ensureSignedIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/todo");
    await page.waitForFunction(
      "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
    await liftMotionSuppression(page);
    /* the fixture row must have arrived before anything is counted */
    await page.waitForFunction(
      "[...document.querySelectorAll('.tlc .row')].some((r) => (r.textContent || '').indexOf('P5 fixture') > -1)",
      null, { timeout: 20_000 }).catch(() => {});

    /* the footer opens with its bold total ("30 tasks · …"), so parseInt on the text is the number */
    const counts = () => page.evaluate(`(() => {
      const foot = document.querySelector(".tlc .l-foot .c");
      const rows = document.querySelectorAll(".tlc .row").length;
      return { rows, foot: foot ? foot.textContent.trim() : null,
               footN: foot ? parseInt(foot.textContent, 10) : -1 };
    })()`) as Promise<any>;
    const fixtureRow = () => page.evaluate(`(() => {
      const r = [...document.querySelectorAll(".tlc .row")]
        .find((x) => (x.textContent || "").indexOf("P5 fixture") > -1);
      if (!r) return null;
      const b = r.getBoundingClientRect();
      return { key: r.getAttribute("data-rowkey"), h: Math.round(b.height), sel: r.classList.contains("sel"),
               op: parseFloat(getComputedStyle(r).opacity) };
    })()`) as Promise<any>;

    const before = await counts();
    const fRow = await fixtureRow();
    add("P5.0 · the fixture task is on the board", !!fRow && before.rows > 1,
        "rows = " + before.rows + " · footer " + JSON.stringify(before.foot));

    /* ── (2) UNDO FIRST — commit, hold, undo inside the window, nothing changes ──────────── */
    await page.evaluate(`(() => {
      const r = [...document.querySelectorAll(".tlc .row")]
        .find((x) => (x.textContent || "").indexOf("P5 fixture") > -1);
      if (r) r.click();
    })()`);
    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});
    await page.evaluate(`(() => {
      const fks = [...document.querySelectorAll(".tpn .fk")];
      const t = fks.find((f) => ((f.querySelector(".t") || {}).textContent || "").indexOf("Tick it off") > -1);
      if (t) t.click();
    })()`);
    await page.waitForTimeout(250);
    const pressed1 = await page.evaluate(`(() => {
      const p = document.querySelector(".tpn .prime");
      if (!p) return false;
      p.click();
      return true;
    })()`) as boolean;
    add("P5.1 · the primary was pressed (undo pass)", pressed1, "");
    await page.waitForTimeout(900);

    /* ⚠️ THE WINDOW'S OBSERVABLES, all three at once: the row is STILL in the list, the footer has
       NOT dropped, and the sheet has NOT moved on — the receipt is the only thing that changed. */
    const during = await counts();
    const dRow = await fixtureRow();
    const sheetDuring = await page.evaluate(`(() => {
      const deed = document.querySelector(".tpn .deed");
      const rec = document.querySelector(".tpn .foot .recorded");
      const toast = document.querySelector(".tdb-toast");
      const undoBtn = toast && [...toast.querySelectorAll("button")]
        .find((b) => (b.textContent || "").trim().toUpperCase() === "UNDO");
      return { deed: deed ? deed.textContent.trim().slice(0, 30) : null,
               recorded: !!rec, toast: !!toast, undo: !!undoBtn };
    })()`) as any;
    add("P5.2 · during the window the row HOLDS — present, still counted, still selected",
        !!dRow && during.rows === before.rows && during.footN === before.footN && dRow.sel,
        "rows " + before.rows + " → " + during.rows + " · footer " + before.footN + " → " + during.footN
        + " · row present = " + !!dRow + (dRow ? " · sel = " + dRow.sel : ""));
    add("P5.3 · the sheet holds too, with the receipt in the foot and Undo in the toast",
        !!sheetDuring.deed && sheetDuring.recorded && sheetDuring.toast && sheetDuring.undo,
        "deed " + JSON.stringify(sheetDuring.deed) + " · foot recorded = " + sheetDuring.recorded
        + " · toast = " + sheetDuring.toast + " · undo = " + sheetDuring.undo);

    /* ‹ › skip the completed row: › then ‹ must not land back on the fixture */
    await page.locator('.tpn .b-nav button[aria-label="Next task"]').click();
    await page.waitForTimeout(250);
    const afterNext = await page.evaluate(
      `(() => { const d = document.querySelector(".tpn .deed"); return d ? d.textContent.trim().slice(0, 40) : null; })()`) as string | null;
    await page.locator('.tpn .b-nav button[aria-label="Previous task"]').click();
    await page.waitForTimeout(250);
    const afterBack = await page.evaluate(
      `(() => { const d = document.querySelector(".tpn .deed"); return d ? d.textContent.trim().slice(0, 40) : null; })()`) as string | null;
    add("P5.4 · ‹ › walk PAST the completed task — it is out of the queue while it holds",
        !!afterNext && !!afterBack && (afterBack || "").indexOf("P5 fixture") === -1,
        "› → " + JSON.stringify(afterNext) + " · ‹ → " + JSON.stringify(afterBack));

    /* undo, still inside the window — asserted immediately, per the standing rule */
    const undone = await page.evaluate(`(() => {
      const toast = document.querySelector(".tdb-toast");
      const b = toast && [...toast.querySelectorAll("button")]
        .find((x) => (x.textContent || "").trim().toUpperCase() === "UNDO");
      if (!b) return false;
      b.click();
      return true;
    })()`) as boolean;
    expect(undone, "the account has been changed and the undo button was not found").toBe(true);
    await page.waitForTimeout(1200);
    const afterUndo = await counts();
    const uRow = await fixtureRow();
    const sheetUndo = await page.evaluate(`(() => {
      const d = document.querySelector(".tpn .deed");
      const rec = document.querySelector(".tpn .foot .recorded");
      return { deed: d ? d.textContent.trim().slice(0, 40) : null, recorded: !!rec };
    })()`) as any;
    add("P5.5 · Undo keeps the row and the count, and the sheet is back on the task — nothing ever left",
        !!uRow && afterUndo.rows === before.rows && afterUndo.footN === before.footN && (uRow.op ?? 1) > 0.9
          && (sheetUndo.deed || "").indexOf("P5 fixture") > -1 && !sheetUndo.recorded,
        "rows " + afterUndo.rows + " · footer " + afterUndo.footN + " · row opacity " + (uRow ? uRow.op : "-")
        + " · deed " + JSON.stringify(sheetUndo.deed) + " · foot recorded = " + sheetUndo.recorded);

    /* ── (1) THE CROSSOVER — the held row is the ORIGINATING task's ──────────────────────── */
    const sendKey = await page.evaluate(`(() => {
      const r = [...document.querySelectorAll(".tlc .row")]
        .find((x) => (((x.querySelector(".pill") || {}).textContent) || "").trim() === "Send"
          && (((x.querySelector(".r-deed") || {}).textContent) || "").toLowerCase().indexOf("partial") > -1);
      if (!r) return null;
      r.click();
      return r.getAttribute("data-rowkey");
    })()`) as string | null;
    add("P5.6 · a partial Send opens for the crossover", !!sendKey, "key = " + JSON.stringify(sendKey));
    await page.waitForTimeout(400);
    await page.evaluate(`(() => {
      const fks = [...document.querySelectorAll(".tpn .fk")];
      const w = fks.find((f) => ((f.querySelector(".t") || {}).textContent || "").indexOf("not going to send") > -1);
      if (w) w.click();
    })()`);
    await page.waitForTimeout(300);
    /* ⚠️ A CROSSOVER ARRIVES AT THE CLOSE'S OWN FORK — its receipt says where it came from, and the
       close's questions are still the close's. The path the sheet actually asks for: "Close it
       now", then the closenow flow's one question (`when`), then the crossover's own verb. Pressing
       a primary that is not `.ready` records nothing and reports nothing — which the first form of
       this leg did, and the loud undo guard correctly stopped the run over it. */
    await page.evaluate(`(() => {
      const fks = [...document.querySelectorAll(".tpn .fk")];
      const c = fks.find((f) => ((f.querySelector(".t") || {}).textContent || "").indexOf("Close it now") > -1);
      if (c) c.click();
    })()`);
    await page.waitForTimeout(300);
    await page.evaluate(`(() => {
      const seg = document.querySelector(".tpn .q.open .body .seg button");
      if (seg) seg.click();
    })()`);
    await page.waitForTimeout(300);
    const crossedPressed = await page.evaluate(`(() => {
      const p = document.querySelector(".tpn .prime");
      if (!p) return "no primary";
      if (!p.classList.contains("ready")) return "not ready";
      p.click();
      return "pressed";
    })()`) as string;
    await page.waitForTimeout(900);
    /* ⚠️ THE GROUP IS PART OF THE CLAIM — geometry, not presence, met again. The first build held
       the row in the WRONG group (the placement map was rebuilt from the post-write board, so the
       lookup missed and fell to "yours") and every assertion stayed green, because they asked
       whether the row existed and held. The head above the held row is where "the row holds" is
       actually visible. */
    const heldAfterCross = await page.evaluate(`(() => {
      const sel = document.querySelector(".tlc .row.sel");
      const rec = document.querySelector(".tpn .foot .recorded");
      let head = null;
      if (sel) {
        let el = sel.previousElementSibling;
        while (el && !el.classList.contains("grp")) el = el.previousElementSibling;
        head = el ? el.textContent.trim() : null;
      }
      return { key: sel ? sel.getAttribute("data-rowkey") : null, recorded: !!rec, head };
    })()`) as any;
    add("P5.7 · the crossover completes the ORIGINATING row — held IN ITS OWN GROUP, marked, selected",
        crossedPressed === "pressed" && !!heldAfterCross.key && heldAfterCross.key === sendKey && heldAfterCross.recorded
          && (heldAfterCross.head || "").toLowerCase().indexOf("needs you now") > -1,
        "primary " + crossedPressed + " · held row " + JSON.stringify(heldAfterCross.key)
        + " vs send row " + JSON.stringify(sendKey) + " · recorded = " + heldAfterCross.recorded
        + " · under the head " + JSON.stringify(heldAfterCross.head));

    /* undo the close immediately — the write must not stand */
    const undone2 = await page.evaluate(`(() => {
      const toast = document.querySelector(".tdb-toast");
      const b = toast && [...toast.querySelectorAll("button")]
        .find((x) => (x.textContent || "").trim().toUpperCase() === "UNDO");
      if (!b) return false;
      b.click();
      return true;
    })()`) as boolean;
    /* ⚠️ THE GUARD IS CONDITIONAL ON A PRESS. "A close stands" is only true if the primary fired;
       a leg that never became ready has written nothing, and the loud message would be a false
       alarm about an account that is untouched. Either way the run stops — an unpressed crossover
       leg is a broken fixture, not a pass. */
    if (crossedPressed === "pressed") {
      expect(undone2, "A CLOSE STANDS ON THE ACCOUNT — the crossover's undo button was not found").toBe(true);
    } else {
      expect(crossedPressed, "the crossover leg never reached a ready primary — nothing was written, fix the fixture").toBe("pressed");
    }
    await page.waitForTimeout(1200);
    const backRow = await page.evaluate(`(() => {
      const r = [...document.querySelectorAll(".tlc .row")]
        .find((x) => x.getAttribute("data-rowkey") === ${JSON.stringify(sendKey)});
      return !!r;
    })()`) as boolean;
    add("P5.8 · the crossover's Undo restores the send row", backRow, "row back = " + backRow);

    /* ── (3) EXPIRY — complete the fixture again and let the window lapse ────────────────── */
    await page.evaluate(`(() => {
      const r = [...document.querySelectorAll(".tlc .row")]
        .find((x) => (x.textContent || "").indexOf("P5 fixture") > -1);
      if (r) r.click();
    })()`);
    await page.waitForTimeout(400);
    await page.evaluate(`(() => {
      const fks = [...document.querySelectorAll(".tpn .fk")];
      const t = fks.find((f) => ((f.querySelector(".t") || {}).textContent || "").indexOf("Tick it off") > -1);
      if (t) t.click();
    })()`);
    await page.waitForTimeout(250);
    const preExpiry = await counts();
    await page.evaluate(`(() => { const p = document.querySelector(".tpn .prime"); if (p) p.click(); })()`);
    /* let the whole window lapse, plus the fade */
    await page.waitForTimeout(WINDOW_MS + 900);
    const gone = await fixtureRow();
    const afterExpiry = await counts();
    const sheetAfter = await page.evaluate(`(() => {
      const d = document.querySelector(".tpn .deed");
      const open = document.querySelector(".tdw-split").classList.contains("open");
      return { deed: d ? d.textContent.trim().slice(0, 40) : null, open };
    })()`) as any;
    add("P5.9 · after the window the row is GONE and the footer dropped from the one array",
        !gone && afterExpiry.rows === preExpiry.rows - 1 && afterExpiry.footN === preExpiry.footN - 1,
        "row present = " + !!gone + " · rows " + preExpiry.rows + " → " + afterExpiry.rows
        + " · footer " + preExpiry.footN + " → " + afterExpiry.footN);
    add("P5.10 · …and the sheet has moved to the next open task",
        sheetAfter.open && !!sheetAfter.deed && (sheetAfter.deed || "").indexOf("P5 fixture") === -1,
        "drawer open = " + sheetAfter.open + " · deed " + JSON.stringify(sheetAfter.deed));
  } finally {
    /* ⚠️ THE TEARDOWN IS THE RESTORE. Whatever the run did — completed, undone, half-done — the
       account's delta is exactly this one document, and deleting it is total. */
    const still = await getDoc(taskRef);
    await deleteDoc(taskRef);
    const check = await getDoc(taskRef);
    if (check.exists()) {
      // eslint-disable-next-line no-console
      console.error("RESIDUE — the fixture task could not be deleted; remove users/*/tasks/" + FIXT + " by hand");
      out.push({ id: "TEARDOWN", ok: false, note: "fixture not deleted" });
    } else {
      out.push({ id: "teardown · the fixture is deleted — the account's delta is zero",
        ok: true, note: "was present at teardown = " + still.exists() });
    }
  }

  writeFileSync(OUT, out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log("\n" + out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n"));
  const bad = out.filter((r) => !r.ok);
  expect(bad.map((r) => r.id + " — " + r.note).join("\n"), "completionLeaves").toEqual("");
});
