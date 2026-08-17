/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sign out — one implementation, and the doors that reach it.
 *
 * ⚠️ THE DEFECT THIS GUARDS WAS INVISIBLE TO EVERY EXISTING TEST, and it is worth stating exactly
 * why. `AccountMenu` had a Sign out row. `AppShell` passed `onSignOut={logout}`. `WorkspaceShell`
 * received `onOpenAccount` and rendered `{accountMenu}`. Every one of those facts was true, every
 * one was covered, and a DESKTOP user still could not sign out — because the rail's user row
 * navigated to /account instead of calling the opener, and the only live opener lived in
 * `.ws-mobilebar`, which is `display:none` at ≥768px. Four correct parts, no working whole.
 *
 * So these assert the CHAIN rather than its links: the row calls the opener, the shell uses the
 * prop, the menu carries the row, and the handler leaves the app. Any one of them alone proves
 * nothing, which is how this got shipped in the first place.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

const WORKSPACE = read("WorkspaceShell.tsx");
const APPSHELL = read("AppShell.tsx");
const MENU = read("AccountMenu.tsx");
const DB = read("../../lib/db.tsx");

describe("the chain from the rail row to signOut", () => {
  /**
   * ⚠️ THE PROP WAS DESTRUCTURED AND NEVER CALLED. That is the whole original fault, and it is the
   * one an eye skims past: the signature looked complete.
   */
  it("WorkspaceShell actually calls onOpenAccount, not merely accepts it", () => {
    expect(WORKSPACE).toContain("onOpenAccount");
    expect(WORKSPACE).toMatch(/onOpenAccount\?\.\(\)/);
  });

  it("the rail's user row is the opener", () => {
    const at = WORKSPACE.indexOf('className="ws-uacct"');
    expect(at).toBeGreaterThan(-1);
    const row = WORKSPACE.slice(at, WORKSPACE.indexOf("</div>", at));
    expect(row).toMatch(/onClick=\{\(\) => onOpenAccount\?\.\(\)\}/);
  });

  /**
   * ⚠️ AND IT NO LONGER NAVIGATES STRAIGHT TO SETTINGS. Settings is the menu's first row, so the
   * destination survives; a row that did both would open a menu and leave the page underneath it.
   */
  it("…and does not also navigate to /account", () => {
    const at = WORKSPACE.indexOf('className="ws-uacct"');
    const row = WORKSPACE.slice(at, WORKSPACE.indexOf("</div>", at));
    expect(row).not.toContain('go("/account")');
  });

  /** The keyboard path is the same path — a mouse-only opener is not an opener. */
  it("Enter and Space open it too", () => {
    const at = WORKSPACE.indexOf('className="ws-uacct"');
    const row = WORKSPACE.slice(at, WORKSPACE.indexOf("</div>", at));
    expect(row).toContain("onKeyDown");
    expect(row).toMatch(/Enter/);
    expect(row).toMatch(/onOpenAccount\?\.\(\)/);
  });

  it("AppShell wires the opener to the menu's own open state", () => {
    expect(APPSHELL).toContain("onOpenAccount={() => setAccountOpen((v) => !v)}");
    expect(APPSHELL).toContain("open={accountOpen}");
    expect(APPSHELL).toContain("onSignOut={logout}");
  });
});

describe("the menu still carries the row, last and below the rule", () => {
  /**
   * Unchanged by this pass, and pinned because it is now load-bearing: it is the only sign-out a
   * desktop user has.
   */
  it("Sign out is the final row", () => {
    /* ⚠️ THE RENDERED LABEL, NOT THE BARE WORD. "Settings" occurs four times in this file — the
       lucide import, the icon element, the row's own label and "Task settings" — so `indexOf` on
       it describes whichever came first and keeps passing until the two disagree. The repo's
       `testAnchors` meta-test caught exactly that here. The span form is unique per row. */
    const out = MENU.indexOf("<span>Sign out</span>");
    expect(out).toBeGreaterThan(-1);
    expect(MENU.indexOf("<span>Settings</span>")).toBeLessThan(out);
    expect(MENU.indexOf("<span>Task settings</span>")).toBeLessThan(out);
    expect(MENU.indexOf("<span>Help centre</span>")).toBeLessThan(out);
  });

  it("…and sits below the hairline separator", () => {
    expect(MENU.indexOf('className="am-div"')).toBeLessThan(MENU.indexOf("<span>Sign out</span>"));
  });

  /** No confirm step: leaving is not destructive, and signing back in costs a password. */
  it("asks nothing before it goes", () => {
    const at = MENU.indexOf("onSignOut()");
    expect(at).toBeGreaterThan(-1);
    expect(MENU).not.toMatch(/confirm\(/);
  });
});

describe("⚠️ one implementation — logout() itself", () => {
  it("signs out of Firebase", () => {
    expect(DB).toContain("signOut(auth)");
  });

  /**
   * ⚠️ IT LANDS ON THE LANDING PAGE, NOT THE SIGN-IN FORM. Clearing the session alone left the
   * writer on `<Auth/>` — the app's answer to "who are you", put to someone who had just said they
   * were leaving. `/` is a real page now, with somewhere to go from it.
   */
  it("leaves the app for /", () => {
    const at = DB.indexOf("const logout");
    expect(at).toBeGreaterThan(-1);
    const body = DB.slice(at, DB.indexOf("};", at));
    expect(body).toContain('window.location.assign("/")');
  });

  /**
   * ⚠️ IN `finally`, NOT THE `try`. A failed signOut still means the writer asked to leave, and
   * stranding them inside an account they believe they have left is the worse of the two failures.
   */
  it("goes even when signOut throws", () => {
    const at = DB.indexOf("const logout");
    const body = DB.slice(at, DB.indexOf("};", at));
    expect(body.indexOf("finally")).toBeLessThan(body.indexOf('window.location.assign("/")'));
  });

  /**
   * ⚠️ INTERFACE PREFERENCES SURVIVE. The auth listener drops the session flag and tears down every
   * collection listener; nothing clears the `sa.*` keys, and nothing should — a collapsed sidebar
   * is not account data.
   */
  it("clears no interface preference on the way out", () => {
    const at = DB.indexOf("const logout");
    const body = DB.slice(at, DB.indexOf("};", at));
    expect(body).not.toContain("localStorage.clear");
    expect(body).not.toContain("removeItem");
  });
});

describe("the second door — Account & settings", () => {
  const SETTINGS = read("../AccountSettings.tsx");

  it("offers a sign-out row", () => {
    expect(SETTINGS).toContain('title="Signing out"');
    expect(SETTINGS).toContain("Sign out");
    expect(SETTINGS).toContain("acct-h-signout");
  });

  /**
   * ⚠️ ABOVE THE DANGER ZONE, NOT BELOW IT. Someone scrolling to close their account should not
   * pass the way out on the journey to deletion — and someone looking for the way out should not
   * have to scroll past a delete button to find it. Two exits; the reversible one comes first.
   */
  it("sits above the closing-your-account block", () => {
    const signOut = SETTINGS.indexOf('title="Signing out"');
    const danger = SETTINGS.indexOf('title="Danger zone"');
    expect(signOut).toBeGreaterThan(-1);
    expect(danger).toBeGreaterThan(-1);
    expect(signOut).toBeLessThan(danger);
  });

  /** ⚠️ THE SAME HANDLER, never a local signOut of its own. */
  it("calls the shared logout", () => {
    expect(SETTINGS).toContain("logout,");
    expect(SETTINGS).toContain("void logout()");
    expect(SETTINGS).not.toContain("signOut(auth)");
  });

  /**
   * ⚠️ AND IT DOES NOT TOUCH THE DELETION PATH. The two controls sit next to each other, which is
   * exactly why the boundary is worth asserting: sign-out must never reach the flag or the confirm.
   */
  it("is independent of the deletion path", () => {
    const at = SETTINGS.indexOf('title="Signing out"');
    const card = SETTINGS.slice(at, SETTINGS.indexOf('title="Danger zone"'));
    expect(card).not.toContain("ACCOUNT_DELETION_ENABLED");
    expect(card).not.toContain("setShowDelete");
    expect(card).not.toContain("deletionConfirmed");
  });
});

describe("no second implementation crept in", () => {
  /**
   * ⚠️ EVERY DOOR CALLS `logout`. Two sign-outs would eventually disagree about where they land —
   * which is precisely the class of fault that let one of them navigate and the other not.
   */
  it("only db.tsx calls Firebase signOut", () => {
    const callers = ["AppShell.tsx", "WorkspaceShell.tsx", "AccountMenu.tsx", "ShellV2.tsx"]
      .filter((f) => read(f).includes("signOut(auth)"));
    expect(callers).toEqual([]);
  });

  it("Dashboard no longer takes a logout it never used", () => {
    expect(read("../Dashboard.tsx")).not.toContain("logout");
  });
});
