import { describe, it, expect } from "vitest";
import { MAT_TABS, TODAY_TABS, desktopV5Redirect, isMatTab, isTodayTab, phoneV5Redirect, readTab } from "./phoneV5";
import { v3TabFor } from "./phoneV3Nav";

const go = (path: string, search = "", hash = "") => phoneV5Redirect(path, search, hash);

describe("phone v5 addresses (Phase A)", () => {
  it("the tabs inside Today and Materials", () => {
    expect(TODAY_TABS.map((t) => t.label)).toEqual(["Queries", "Agents", "Activity"]);
    expect(MAT_TABS.map((t) => t.label)).toEqual(["Packages", "Letters", "Versions", "Comps"]);
    expect(isTodayTab("agents")).toBe(true);
    expect(isTodayTab("packages")).toBe(false);
    expect(isMatTab("comps")).toBe(true);
    expect(isMatTab(null)).toBe(false);
  });
  it("Today is the hub: /dashboard stays, /queries and /agents land on Today on their tab", () => {
    expect(go("/dashboard")).toBeNull();
    expect(go("/queries")).toBe("/dashboard?tab=queries");
    expect(go("/queries/")).toBe("/dashboard?tab=queries");
    expect(go("/agents")).toBe("/dashboard?tab=agents");
    expect(go("/agents/discover")).toBeNull();
  });
  it("the full list of queries is pushed, and every v4 deep link into it still opens it", () => {
    expect(go("/queries", "?view=birds")).toBe("/queries/all?view=birds");
    expect(go("/queries", "?view=birds&focus=q1")).toBe("/queries/all?view=birds&focus=q1");
    expect(go("/queries", "?court=you")).toBe("/queries/all?court=you");
    expect(go("/queries", "?q=q1")).toBe("/queries/all?q=q1");
    expect(go("/queries/all")).toBeNull();
    expect(go("/queries/all", "?view=birds")).toBeNull();
  });
  it("To do is its own tab again", () => {
    expect(go("/todo")).toBeNull();
    expect(go("/todo", "?x=1")).toBeNull();
    expect(go("/todo/corkboard")).toBeNull();
  });
  it("packages, letters, versions and comps land on Materials on their tab; a deep link opens its thing", () => {
    expect(go("/queries/packages")).toBe("/materials?tab=packages");
    expect(go("/queries/packages", "?pkg=p1")).toBeNull();
    expect(go("/queries/packages", "?build=new")).toBeNull();
    expect(go("/queries/packages", "?ver=v1")).toBeNull();
    expect(go("/materials/letters")).toBe("/materials?tab=letters");
    expect(go("/manuscripts/comps")).toBe("/materials?tab=comps");
    expect(go("/manuscripts/versions")).toBe("/materials?tab=versions");
    expect(go("/manuscripts/versions", "?version=b1")).toBeNull(); // the book page opens it (PhoneSectionLanding)
    expect(go("/manuscripts", "", "#materials")).toBe("/materials?tab=letters");
    expect(go("/manuscripts", "", "#comps")).toBe("/materials?tab=comps");
    expect(go("/manuscripts", "", "#versions")).toBe("/materials?tab=versions");
    expect(go("/manuscripts", "", "#packages")).toBe("/materials?tab=packages");
    expect(go("/manuscripts", "?pkg=p1", "#packages")).toBeNull();
    expect(go("/manuscripts", "?version=b1", "#versions")).toBeNull();
    expect(go("/manuscripts", "?edit=l1", "#materials")).toBeNull();
    expect(go("/materials")).toBeNull();
  });
  it("the book and everything v4 kept under You stay where they are (Profile)", () => {
    for (const p of ["/manuscripts", "/you", "/queries/responses", "/queries/analytics", "/account", "/account/profile", "/goals", "/help", "/plans", "/your-notes", "/import", "/todo/corkboard"]) {
      expect(go(p), p).toBeNull();
      expect(v3TabFor(p), p).toBe("profile");
    }
  });
  it("every landing sits on the dock tab the brief names", () => {
    const land = (to: string) => v3TabFor(to.split(/[?#]/)[0]);
    expect(land(go("/queries")!)).toBe("today");
    expect(land(go("/queries", "?view=birds")!)).toBe("today");
    expect(land(go("/agents")!)).toBe("today");
    for (const [p, h] of [["/queries/packages", ""], ["/materials/letters", ""], ["/manuscripts/comps", ""], ["/manuscripts/versions", ""], ["/manuscripts", "#materials"]]) {
      expect(land(go(p, "", h)!), p + h).toBe("materials");
    }
  });
  it("a computer is kept where it went before v5's two addresses existed", () => {
    expect(desktopV5Redirect("/queries/all", "?view=birds")).toBe("/queries?view=birds");
    expect(desktopV5Redirect("/queries/all", "")).toBe("/queries");
    expect(desktopV5Redirect("/materials", "")).toBe("/dashboard");
    for (const p of ["/queries", "/agents", "/todo", "/materials/letters", "/queries/packages", "/manuscripts"]) expect(desktopV5Redirect(p, ""), p).toBeNull();
  });
  it("a session's tab survives storage refusing (the first tab)", () => {
    expect(readTab("pa5.today.tab", isTodayTab, "queries")).toBe("queries");
  });
});
