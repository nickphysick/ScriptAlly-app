/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adding an agent — the pure law and the source locks a node runner can carry. ⚠️ RETARGETED
 * (Agent card v1 P3, 5 Oct): the v11 add card (`ContactAddCard`) is deleted, and adding an agent is
 * the agent card's editor opened empty (three tabs — a note needs an agent). The LAW is unchanged
 * and asserted unchanged: one create path through `addAgent`, and a born agent OMITS what the
 * writer did not state. The rendered halves (the disabled-until, the duplicate blocking, the
 * after-add ring) live in tests/e2e/agentCardV1.measure.ts and contactV11.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { emptyCardDraft, encodeMats, problemsOf } from "../../../lib/cardDraft";

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "");
const host = readFileSync(new URL("../card/AgentCardHost.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../card/AgentCardEditor.tsx", import.meta.url), "utf8");

describe("a new agent is born the way the house births agents", () => {
  it("the empty draft carries ABSENCE where the writer has said nothing — no window, no rule, no method, no country, no materials", () => {
    const d = emptyCardDraft();
    expect(d.weeks, "an invented window is a confident wrong value").toBeNull();
    expect(d.nrn, "unstated is an ORIGIN state").toBeNull();
    expect(d.method).toBeNull();
    expect(d.country, "a new agent is in no country until the writer says so").toBe("");
    expect(d.door).toBe("open");
    expect(d.reopens).toBe("");
    expect(d.genres).toEqual([]);
    /* ⚠️ the mock ticks three materials on its add card; stored, they would be a claim about what an
       agency wants that nobody made (see emptyCardDraft) */
    expect(encodeMats(d.mats), "a born agent states materials nobody asked for").toEqual([]);
  });

  it("only a name or an agency is needed", () => {
    expect(problemsOf(emptyCardDraft()).name).toBe("A name or an agency is needed");
    expect(problemsOf({ ...emptyCardDraft(), agency: "Rights & Co" })).toEqual({});
  });

  it("the create goes through addAgent — the one path with the cap and the activity — and the optionals spread in only when stated", () => {
    const at = strip(host).indexOf("const onCreateAgent");
    expect(at, "the create is no longer in the host").toBeGreaterThan(-1);
    const create = strip(host).slice(at, strip(host).indexOf("}, [addAgent]);", at));
    expect(create.length, "the create's end anchor moved — re-anchor this lock").toBeGreaterThan(200);
    expect(create, "the create left the shared path").toContain("await addAgent({");
    expect(create, "the links stopped going through the shared href builder").toMatch(/website: hrefFor\(d\.website\)/);
    expect(create, "reopensOn must ride only a CLOSED door").toMatch(/d\.door === "closed" && d\.reopens \? \{ reopensOn/);
    for (const [field, draft] of [["responseTimeWeeks", "weeks"], ["noResponseMeansNo", "nrn"], ["city", "city"], ["country", "country"]]) {
      expect(create, `${field} is written unconditionally — a born agent must OMIT what the writer did not state`)
        .toMatch(new RegExp(`\\.\\.\\.\\(d\\.${draft}[^?]*\\?\\s*\\{\\s*${field}`));
    }
  });
});

describe("FILL IN stays unbuilt, and the v11 card's parked pieces are gone with it", () => {
  it("the add card sorts a pasted link and fetches nothing — no FILL IN control", () => {
    const src = strip(editor);
    expect(src, "the paste field is gone").toContain('data-ae="paste"');
    expect(src, "a FILL IN control appeared — nothing in the app reads a web page, so it cannot act").not.toMatch(/>\s*FILL IN\s*</);
  });

  it("FromLinkTag and FilledCountLine left with the card that parked them", () => {
    expect(existsSync(new URL("./ContactAddCard.tsx", import.meta.url)), "the v11 add card came back").toBe(false);
    for (const f of [host, editor]) {
      expect(strip(f)).not.toContain("FromLinkTag");
      expect(strip(f)).not.toContain("FilledCountLine");
    }
  });
});
