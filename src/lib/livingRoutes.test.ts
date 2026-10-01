/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Living headers v3 §2 — the six routes whose bar carries the breadcrumb (and whose header carries no
 * eyebrow). Exactly the six, exact paths only: a sub-route is not the page.
 */
import { describe, it, expect } from "vitest";
import { LIVING_ROUTES, isLivingRoute } from "./livingRoutes";

describe("the living routes", () => {
  it("are exactly the six pages in scope", () => {
    expect([...LIVING_ROUTES].sort()).toEqual(["/agents", "/manuscripts/comps", "/manuscripts/packages", "/queries", "/queries/analytics", "/todo"]);
  });
  it("match the exact route, with or without a trailing slash, and nothing beneath it", () => {
    expect(isLivingRoute("/queries")).toBe(true);
    expect(isLivingRoute("/queries/")).toBe(true);
    expect(isLivingRoute("/todo/calendar")).toBe(false);
    expect(isLivingRoute("/manuscripts")).toBe(false);
    expect(isLivingRoute("/dashboard")).toBe(false);
  });
});
