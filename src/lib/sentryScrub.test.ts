/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 2 — what an error report may carry, on crafted events.
 */
import { describe, expect, it } from "vitest";
import { browserFromUa, normaliseFirestorePath, scrubBreadcrumb, scrubEvent, stripUrl, stripUrlsIn, type ScrubEvent } from "./sentryScrub";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

/** A realistic event as the browser SDK builds it, with every field we intend to remove filled in. */
function crafted(): ScrubEvent {
  return {
    message: undefined,
    request: {
      url: "https://dev.queryhawk.net/welcome?r=FW-ABC123&utm_source=x#top",
      headers: { "User-Agent": CHROME, Referer: "https://dev.queryhawk.net/founders?token=SECRET-TOKEN" },
      cookies: { session: "abc" },
      query_string: "r=FW-ABC123",
    },
    exception: {
      values: [{
        type: "TypeError",
        value: "Cannot read properties of undefined (reading 'x') at https://dev.queryhawk.net/assets/index-A.js?v=2",
        stacktrace: { frames: [
          { filename: "https://dev.queryhawk.net/assets/index-A.js?v=2#L1", abs_path: "https://dev.queryhawk.net/assets/index-A.js?token=SECRET-TOKEN", lineno: 1, colno: 2, function: "Ab" },
        ] },
      }],
    },
    breadcrumbs: [
      { category: "navigation", data: { from: "/queries?q=abc&qh-crash=queries", to: "/agents?token=SECRET-TOKEN#x" } },
      { category: "ui.click", message: "button.ws-ni" },
      { category: "ui.input", message: "input#au-email" },
      { category: "console", message: "My manuscript about a hawk", level: "log" },
      { category: "fetch", data: { url: "https://firestore.googleapis.com/x?key=AIza" } },
      { category: "xhr", data: { url: "/api/waitlist" } },
    ],
    extra: { boundary: "queries", note: { text: "the writer's pitch" }, arguments: ["draft text"], path: "users/{id}" },
    user: { id: "uid-123", email: "writer@example.com", username: "Writer", ip_address: "1.2.3.4" },
    tags: { boundary: "queries" },
  };
}

describe("scrubEvent", () => {
  const out = scrubEvent(crafted(), CHROME)!;
  const json = JSON.stringify(out);

  it("keeps the event", () => expect(out).not.toBeNull());

  it("no query string, hash, welcome reference or token survives anywhere", () => {
    for (const s of ["?", "#top", "#L1", "FW-ABC123", "SECRET-TOKEN", "utm_source", "q=abc", "AIza"]) {
      expect(json, s).not.toContain(s);
    }
  });

  it("the page's URL is kept, as a path", () => {
    expect(out.request).toEqual({ url: "https://dev.queryhawk.net/welcome" });
  });

  it("request headers, cookies and the query string field are removed", () => {
    expect(json).not.toContain("User-Agent");
    expect(json).not.toContain("Referer");
    expect(json).not.toContain("cookies");
    expect(json).not.toContain("query_string");
  });

  it("stack frames keep their file, without query or hash", () => {
    const f = out.exception!.values![0].stacktrace!.frames![0];
    expect(f.filename).toBe("https://dev.queryhawk.net/assets/index-A.js");
    expect(f.abs_path).toBe("https://dev.queryhawk.net/assets/index-A.js");
    expect(f.lineno).toBe(1);
    expect(out.exception!.values![0].value).toBe("Cannot read properties of undefined (reading 'x') at https://dev.queryhawk.net/assets/index-A.js");
  });

  it("only navigation breadcrumbs remain, as paths", () => {
    expect(out.breadcrumbs).toEqual([{ category: "navigation", data: { from: "/queries", to: "/agents" } }]);
    expect(json).not.toContain("My manuscript"); // the console line
    expect(json).not.toContain("au-email");
  });

  it("extra keeps only plain metadata this app sets", () => {
    expect(out.extra).toEqual({ boundary: "queries", path: "users/{id}" });
  });

  it("the user is the id and nothing else", () => {
    expect(out.user).toEqual({ id: "uid-123" });
    expect(json).not.toContain("writer@example.com");
    expect(json).not.toContain("1.2.3.4");
    expect(json).not.toContain("Writer");
  });

  it("the browser is named by its name and major version only", () => {
    expect(out.contexts?.browser).toEqual({ name: "Chrome", version: "130" });
    expect(json).not.toContain("Macintosh");
  });

  it("does not change the event it was given", () => {
    const e = crafted();
    scrubEvent(e, CHROME);
    expect(e.request?.headers).toBeDefined();
    expect(e.user?.email).toBe("writer@example.com");
  });
});

describe("dropped whole", () => {
  it("an event whose message names an email address", () => {
    expect(scrubEvent({ message: "No account for writer@example.com" })).toBeNull();
  });
  it("an exception whose value names an email address", () => {
    expect(scrubEvent({ exception: { values: [{ type: "Error", value: "auth failed for a.b+c@mail.co.uk" }] } })).toBeNull();
  });
  it("an email in a breadcrumb's message", () => {
    expect(scrubEvent({ message: "x", breadcrumbs: [{ category: "navigation", message: "to writer@example.com" }] })).toBeNull();
  });
  it("ResizeObserver warnings", () => {
    expect(scrubEvent({ message: "ResizeObserver loop completed with undelivered notifications." })).toBeNull();
  });
  it("being offline", () => {
    expect(scrubEvent({ exception: { values: [{ type: "TypeError", value: "Failed to fetch" }] } })).toBeNull();
    expect(scrubEvent({ exception: { values: [{ type: "FirebaseError", value: "Failed to get document because the client is offline." }] } })).toBeNull();
  });
  it("a crash inside a browser extension", () => {
    expect(scrubEvent({ exception: { values: [{ type: "Error", value: "x", stacktrace: { frames: [{ filename: "chrome-extension://abc/content.js" }] } }] } })).toBeNull();
    expect(scrubEvent({ exception: { values: [{ type: "Error", value: "x", stacktrace: { frames: [{ abs_path: "moz-extension://abc/c.js" }] } }] } })).toBeNull();
  });
  it("but an ordinary error is kept", () => {
    expect(scrubEvent({ exception: { values: [{ type: "Error", value: "Test crash for \"queries\"" }] } })).not.toBeNull();
  });
});

describe("helpers", () => {
  it("stripUrl", () => {
    expect(stripUrl("/welcome?r=1")).toBe("/welcome");
    expect(stripUrl("https://a.b/c#d")).toBe("https://a.b/c");
    expect(stripUrl("/plain")).toBe("/plain");
  });
  it("stripUrlsIn leaves prose alone and cuts each URL's query", () => {
    expect(stripUrlsIn("Failed to load https://a.b/x.js?v=1 and http://c.d/y?t=2#z now?")).toBe("Failed to load https://a.b/x.js and http://c.d/y now?");
  });
  it("scrubBreadcrumb drops everything but navigation", () => {
    expect(scrubBreadcrumb({ category: "ui.click" })).toBeNull();
    expect(scrubBreadcrumb({ category: "console", message: "hi" })).toBeNull();
    expect(scrubBreadcrumb({ category: "navigation", data: { to: "/x?y=1", extra: "z" } })).toEqual({ category: "navigation", data: { to: "/x" } });
  });
  it("browserFromUa", () => {
    expect(browserFromUa(CHROME)).toEqual({ name: "Chrome", version: "130" });
    expect(browserFromUa("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15")).toEqual({ name: "Safari", version: "18" });
    expect(browserFromUa("Mozilla/5.0 (X11) Gecko/20100101 Firefox/132.0")).toEqual({ name: "Firefox", version: "132" });
    expect(browserFromUa(undefined)).toBeUndefined();
  });
  it("normaliseFirestorePath replaces document ids", () => {
    expect(normaliseFirestorePath("users/abc123/queries/q9")).toBe("users/{id}/queries/{id}");
    expect(normaliseFirestorePath("users/abc123/queries")).toBe("users/{id}/queries");
    expect(normaliseFirestorePath("activities")).toBe("activities");
    expect(normaliseFirestorePath(null)).toBeNull();
  });
});
