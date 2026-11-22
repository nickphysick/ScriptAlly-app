/**
 * Query card v167 §C/§D — the profile drawers' source and render locks (the measured halves are
 * tests/e2e/qc167.measure.ts): the band and its words, "Save to profile", the one WeekSlider, the agent card's methods.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileDrawer, cancelWords, journeyName167, profileLine, savedToast, type ProfileIn } from "./QcProfile167";
import { METHOD_PILLS } from "../../agents/card/agentPills";

const prof: ProfileIn = { agentId: "a1", first: "Fenella", initials: "FV", weeks: 8, nrmn: true, method: "Email", methodOther: null, materialsWanted: ["Query letter"] };
const html = (k: "weeks" | "method", over: Partial<ProfileIn> = {}, journey: string | null = null) =>
  renderToStaticMarkup(<ProfileDrawer k={k} prof={{ ...prof, ...over }} journey={journey} busy={false} onBack={() => {}} onSave={() => {}} />);
const src = readFileSync("src/components/queries/centre/QcProfile167.tsx", "utf8");

describe("QC167-8 (source) the profile band and its save", () => {
  it("every profile drawer: the seal, {first}'s profile, the line, Cancel and Save to profile", () => {
    for (const k of ["weeks", "method"] as const) {
      const h = html(k);
      expect(h).toMatch(/data-qc167="profile-band"[^]*?>FV<\/span>[^]*?>Fenella’s profile<\/b><i data-qc167="profile-line">Saved for every query you send Fenella<\/i>/);
      expect(h).toMatch(/data-qc167="cancel"[^>]*>Cancel<\/button>/);
      expect(h).toMatch(/data-qc167="save"[^>]*>Save to profile<svg/);
    }
  });
  it("mid-journey: the line says the journey waits, and Cancel is Back to it", () => {
    expect(profileLine("Fenella", "Mark sent")).toBe("Saved for every query you send Fenella. “Mark sent” is waiting for you.");
    expect(cancelWords("Mark sent")).toBe("Back to “Mark sent”");
    const h = html("weeks", {}, "Mark sent");
    expect(h).toContain("“Mark sent” is waiting for you.");
    expect(h).toContain(">Back to “Mark sent”</button>");
    expect(journeyName167("send")).toBe("Mark sent");
    expect(journeyName167("reply")).toBe("Record a response");
  });
  it("the toast names the profile", () => {
    expect(savedToast("Fenella")).toBe("Saved to Fenella’s profile");
    expect(readFileSync("src/components/Queries.tsx", "utf8")).toMatch(/setQc1522Toast\(\{ msg: profileSavedToast\(first\), undo: undo \?/);
  });
  it("nothing to save until something changed", () => {
    expect(html("weeks")).toMatch(/data-qc167="save" disabled=""/);
  });
});

describe("QC167-6 (source) the reply time is the app's WeekSlider", () => {
  it("the one WeekSlider module (the agent card's), its Unknown pill, and the switch; no fixed buttons", () => {
    expect(src).toMatch(/import \{ WeekSlider \} from "\.\.\/\.\.\/forms\/WeekSlider";/);
    expect(readFileSync("src/components/agents/card/agentPills.tsx", "utf8")).toMatch(/import \{ WeekSlider \} from "\.\.\/\.\.\/forms\/WeekSlider";/);
    expect(src).toMatch(/<WeekSlider value=\{weeks\} onChange=\{\(w\) => setWeeks\(w\)\} onUnknown=\{\(\) => setWeeks\(null\)\}/);
    const h = html("weeks");
    expect(h).toContain('type="range"');
    expect(h).toContain(">Unknown<");
    expect(h).toMatch(/role="switch" aria-checked="true" data-qc167="nrmn"/);
    expect(h).not.toMatch(/data-qc152="reply-opt"/);
    expect(src).not.toMatch(/REPLY_WEEKS/);
  });
});

describe("QC167-C (source) takes queries: the agent card's methods", () => {
  it("the same methods, order and stored values as MethodPills", () => {
    const h = html("method");
    const got = [...h.matchAll(/data-method="([^"]+)"/g)].map((m) => m[1]);
    expect(got).toEqual(METHOD_PILLS.map(([v]) => v));
    const words = [...h.matchAll(/<span class="t"><b>([^<]+)<\/b>/g)].map((m) => m[1]);
    expect(words).toEqual(METHOD_PILLS.map(([, l]) => l));
  });
  it("a stored Other is a selected tile carrying its words", () => {
    const h = html("method", { method: "Other", methodOther: "Agency portal" });
    expect(h).toMatch(/class="qc167-pk on" aria-pressed="true" data-method="Other"><span class="t"><b>Agency portal<\/b>/);
  });
});
