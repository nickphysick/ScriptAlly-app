/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The add card (v11 §8) — the pure law and the source locks a node runner can carry. The
 * rendered halves (§11.9: disabled-until, the duplicate blocking, the after-add ring, the
 * focused-node identity) live in tests/e2e/contactV11.measure.ts, on the real page.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emptyContactDraft } from "../../../lib/contactEdit";

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "");
const card = readFileSync(new URL("./ContactAddCard.tsx", import.meta.url), "utf8");
const list = readFileSync(new URL("../AgentList.tsx", import.meta.url), "utf8");

describe("a new agent is born the way the house births agents", () => {
  it("the empty draft carries ABSENCE, not zeros — null weeks, undefined NRN, no rating, door open", () => {
    const d = emptyContactDraft();
    expect(d.responseTimeWeeks, "an invented window is a confident wrong value").toBeNull();
    expect(d.noResponseMeansNo, "unstated is an ORIGIN state").toBeUndefined();
    expect(d.starRating).toBeNull();
    expect(d.submissionStatus).toBe("Open");
    expect(d.genres).toEqual([]);
    expect(d.materialsWanted).toEqual([]);
  });

  it("the create goes through addAgent — the one path with the cap and the activity — and the optionals spread in only when stated", () => {
    const create = strip(list).slice(strip(list).indexOf("const onCreateAgent"), strip(list).indexOf("const onCreateAgent") + 1600);
    expect(create, "the create left the shared path").toContain("await addAgent({");
    expect(create, "the link stopped going through the scheme allowlist").toContain("normaliseSubmissionsUrl(link)");
    expect(create, "reopensOn must ride only a CLOSED door").toMatch(/reopensOn[\s\S]*SubmissionStatus\.CLOSED/);
    for (const opt of ["responseTimeWeeks", "noResponseMeansNo", "starRating"]) {
      expect(create, `${opt} is written unconditionally — a born agent must OMIT what the writer did not state`).toMatch(new RegExp(`\\.\\.\\.\\(d\\.${opt}`));
    }
  });
});

describe("FILL IN is deliberately not rendered (§8.3)", () => {
  it("the card renders the link FIELD and no FILL IN control", () => {
    const src = strip(card);
    expect(src).toContain('data-clv="f-link"');
    expect(src, "a FILL IN control appeared — nothing in the app reads a web page, so it cannot act").not.toMatch(/>\s*FILL IN\s*</);
  });

  it("FromLinkTag and FilledCountLine exist for the follow-up and are rendered NOWHERE", () => {
    expect(card).toContain("export const FromLinkTag");
    expect(card).toContain("export const FilledCountLine");
    /* reachability, not existence: the sweep is over the whole src tree via the two JSX spellings */
    const files = [list, card, readFileSync(new URL("./ContactAgentForm.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("./ContactProfile.tsx", import.meta.url), "utf8")];
    for (const f of files) {
      expect(strip(f)).not.toContain("<FromLinkTag");
      expect(strip(f)).not.toContain("<FilledCountLine");
    }
  });
});
