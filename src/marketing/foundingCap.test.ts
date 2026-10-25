/**
 * The founding cap — one value (25 Oct: 50). The client constant every counter and every copy string
 * reads, held equal to the server's fallback cap, and the copy that states it held to the constant.
 *
 * ⚠️ THE SERVER SIDE IS READ AS SOURCE, NOT IMPORTED: functions/src/waitlistModel.ts imports Node's
 * `crypto`, and the marketing bundle must not. A source read is the right tool here — the claim is
 * "this token is still emitted with this value", not a behaviour.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FOUNDING_CAP, FOUNDING_CAP_WORD } from "./foundingCap";
import { FOUNDING_FULL, PRICING_TIERS } from "./landingCopy";
import { PV3_H1 } from "./pricingCopy";
import { FOUNDERS_LEDE } from "./foundersCopy";
import { ABOUT_CLOSE_BODY } from "./aboutCopy";

describe("the founding cap is one value", () => {
  it("is fifty", () => {
    expect(FOUNDING_CAP).toBe(50);
    expect(FOUNDING_CAP_WORD).toBe("fifty");
  });
  it("the server's fallback cap is the same number", () => {
    const src = readFileSync(new URL("../../functions/src/waitlistModel.ts", import.meta.url), "utf8");
    const m = src.match(/export const DEFAULT_CAP\s*=\s*(\d+)\s*;/);
    expect(m, "DEFAULT_CAP is still declared").not.toBeNull();
    expect(Number(m![1])).toBe(FOUNDING_CAP);
  });
  it("every string that states the cap states this one", () => {
    expect(PV3_H1).toBe(`A free QueryHawk campaign for our first ${FOUNDING_CAP} writers.`);
    expect(FOUNDING_FULL.startsWith(`All ${FOUNDING_CAP_WORD} founding places are claimed.`)).toBe(true);
    const founding = PRICING_TIERS.find((t) => t.key === "founding")!;
    expect(founding.tag).toBe(`Available now · ${FOUNDING_CAP} places`);
    expect(FOUNDERS_LEDE).toContainEqual({ b: `${FOUNDING_CAP_WORD} writers` });
    expect(ABOUT_CLOSE_BODY).toContain(`first ${FOUNDING_CAP_WORD} writers`);
  });
});
