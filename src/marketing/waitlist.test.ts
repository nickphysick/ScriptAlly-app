/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The waitlist client's classification — pure, so it is tested by calling it rather than by faking
 * `fetch`. The I/O around it is four lines and does nothing but produce these inputs.
 *
 * ⚠️ THE CASE THAT MATTERS MOST IS `non-json` WITH A 200. Both app hosts serve the SPA behind a
 * `** → /index.html` catch-all, so a request to an API path with no rewrite returns 200 and
 * `text/html` — measured on dev and prod. `res.ok` is `true` for a route that does not exist, and
 * a client that believed it would tell a reader they were on the list because the page they are
 * reading was handed back to them.
 */
import { describe, it, expect } from "vitest";
import { classifyJoin, readCount, RawResponse, JoinOutcome, WAITLIST_ENDPOINT } from "./waitlist";

const json = (status: number, body: unknown): RawResponse =>
  ({ kind: "json", status, ok: status >= 200 && status < 300, body });

describe("what a join attempt means", () => {
  it("a real acceptance is `sent`, and carries the count back", () => {
    const out = classifyJoin(json(200, { ok: true, position: 12, count: 12, cap: 100 }));
    expect(out).toEqual({ state: "sent", count: { claimed: 12, cap: 100 } });
  });

  it("a repeat is `dupe`, not a second acceptance", () => {
    const out = classifyJoin(json(200, { ok: true, alreadyJoined: true, position: 4, count: 40, cap: 100 }));
    expect(out.state).toBe("dupe");
  });

  /**
   * ⚠️ THE 200-HTML CASE. This is not a hypothetical: it is what BOTH app hosts return today for
   * `/api/waitlist`, because neither carries the rewrite. The form must go away and the reader
   * must be handed an address — retrying cannot help.
   */
  it("HTML served by the SPA catch-all is `down`, however cheerful its status", () => {
    expect(classifyJoin({ kind: "non-json", status: 200 })).toEqual({ state: "down" });
    expect(classifyJoin({ kind: "non-json", status: 404 })).toEqual({ state: "down" });
  });

  it("a body that claimed to be JSON and would not parse is `down` as well", () => {
    /* `request` collapses an unparseable body to the same shape, for the same reason: whatever
       answered is not the endpoint. */
    expect(classifyJoin({ kind: "non-json", status: 200 })).toEqual({ state: "down" });
  });

  it("a network failure is `down`", () => {
    expect(classifyJoin({ kind: "network" })).toEqual({ state: "down" });
  });

  /** A real answer that says no keeps the form, because trying again can help. */
  it("a JSON error is `error`, not `down`", () => {
    expect(classifyJoin(json(400, { error: "bad email" })).state).toBe("error");
    expect(classifyJoin(json(500, { error: "boom" })).state).toBe("error");
    expect(classifyJoin(json(429, { error: "slow down" })).state).toBe("error");
  });

  /**
   * ⚠️ AN UNRECOGNISED 200 IS A FAILURE, NOT A SUCCESS. Treating a body we do not understand as
   * acceptance is how a reader gets told they are on a list they are not on — the same disease as
   * a default branch that performs a write.
   */
  it("a 200 that does not say `ok` is an error", () => {
    expect(classifyJoin(json(200, {})).state).toBe("error");
    expect(classifyJoin(json(200, { ok: "yes" })).state).toBe("error");
    expect(classifyJoin(json(200, null)).state).toBe("error");
  });

  /**
   * ⚠️ NOTHING CAN PRODUCE `full`, AND THIS IS THE ASSERTION THAT SAYS SO RATHER THAN A COMMENT.
   * The function returns the cap in every response and enforces it nowhere, so a 101st sign-up
   * succeeds. Deciding "full" here from `count >= cap` would be the client inventing a policy the
   * server does not hold — and two browsers racing past 100 would both be told they were in. The
   * copy exists (`FOUNDING_FULL`); the one change that reaches it is a cap branch in
   * `functions/src/waitlist.ts`.
   */
  it("no response, including one at or over the cap, classifies as `full`", () => {
    const every: RawResponse[] = [
      { kind: "network" },
      { kind: "non-json", status: 200 },
      { kind: "non-json", status: 503 },
      json(200, { ok: true, count: 100, cap: 100 }),
      json(200, { ok: true, count: 137, cap: 100 }),
      json(200, { ok: true, alreadyJoined: true, count: 100, cap: 100 }),
      json(409, { error: "full", count: 100, cap: 100 }),
      json(200, { ok: true, full: true, count: 100, cap: 100 }),
    ];
    const states = every.map((r) => classifyJoin(r).state);
    expect(states).not.toContain("full");
    /* …and the ones that ARE reachable, so this is not passing on an empty set. */
    expect(new Set(states)).toEqual(new Set<JoinOutcome["state"]>(["down", "sent", "dupe", "error"]));
  });
});

describe("the count is both figures or neither", () => {
  it("reads a real pair", () => {
    expect(readCount({ count: 12, cap: 100 })).toEqual({ claimed: 12, cap: 100 });
    expect(readCount({ count: 0, cap: 100 })).toEqual({ claimed: 0, cap: 100 });
  });

  /**
   * ⚠️ ABSENCE MEANS THE COUNTER RENDERS NOTHING — not a zero, not an empty bar. A half-read pair
   * cannot be drawn as a proportion, and a fabricated scarcity number on a public page is a claim
   * about how many people signed up that nobody could check.
   */
  it("refuses anything it cannot draw", () => {
    for (const body of [
      null, undefined, "12 of 100", 42,
      {}, { count: 12 }, { cap: 100 },
      { count: "12", cap: 100 }, { count: 12, cap: "100" },
      { count: -1, cap: 100 }, { count: 12, cap: 0 },
      { count: Number.NaN, cap: 100 }, { count: 12, cap: Number.POSITIVE_INFINITY },
    ]) expect(readCount(body), JSON.stringify(body) ?? "undefined").toBeNull();
  });
});

/**
 * ⚠️ THE PATH THIS CLIENT CALLS AND THE PATH A HOSTING CONFIG REWRITES MUST BE THE SAME STRING,
 * and today exactly one config carries the rewrite: `firebase.holding.json`, for the legacy
 * holding site. Neither app host has it, which is why every join classifies as `down` — reported
 * in the pass notes, not fixed here, because hosting configs are Nick's.
 *
 * This asserts the two derivations against each other rather than pinning "/api/waitlist" twice.
 * It is the only place in the repo where the client's path and a routing table can be compared at
 * all, so it is worth having even while it describes a site this app does not serve: rename the
 * endpoint and this goes red, which is the moment to notice the app hosts were never wired.
 */
describe("the endpoint the client calls is a path something actually rewrites", () => {
  it("matches the holding site's waitlist rewrite", async () => {
    const { readFileSync } = await import("fs");
    const cfg = JSON.parse(readFileSync("firebase.holding.json", "utf8"));
    const rewrites: Array<{ source: string; function?: { functionId?: string } }> =
      cfg.hosting?.rewrites ?? [];
    const wl = rewrites.find((r) => r.function?.functionId === "waitlist");
    expect(wl, "firebase.holding.json rewrites something to the `waitlist` function").toBeTruthy();
    expect(wl!.source).toBe(WAITLIST_ENDPOINT);
  });
});
