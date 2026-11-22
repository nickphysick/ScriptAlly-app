/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 2 — when Sentry starts, how it is configured, and who it says the user is.
 * Sentry itself is mocked: these hold OUR calls into it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const calls = vi.hoisted(() => ({ init: [] as unknown[], setUser: [] as unknown[], capture: [] as unknown[][] }));
vi.mock("@sentry/react", () => {
  const integration = (name: string) => (opts?: unknown) => ({ name, opts });
  return {
    init: (o: unknown) => { calls.init.push(o); },
    setUser: (u: unknown) => { calls.setUser.push(u); },
    captureException: (...a: unknown[]) => { calls.capture.push(a); },
    eventFiltersIntegration: integration("EventFilters"),
    functionToStringIntegration: integration("FunctionToString"),
    browserApiErrorsIntegration: integration("BrowserApiErrors"),
    breadcrumbsIntegration: integration("Breadcrumbs"),
    globalHandlersIntegration: integration("GlobalHandlers"),
    linkedErrorsIntegration: integration("LinkedErrors"),
    dedupeIntegration: integration("Dedupe"),
    httpContextIntegration: integration("HttpContext"),
  };
});

const DSN = "https://k@o1.ingest.de.sentry.io/2";
beforeEach(() => { calls.init.length = 0; calls.setUser.length = 0; calls.capture.length = 0; vi.resetModules(); });
const load = () => import("./sentry");

describe("sentryEnabled — Sentry is off unless a DSN and a real host", () => {
  it("off without a DSN", async () => {
    const { sentryEnabled } = await load();
    expect(sentryEnabled({ hostname: "dev.queryhawk.net", mode: "development" })).toBe(false);
    expect(sentryEnabled({ dsn: "  ", hostname: "dev.queryhawk.net", mode: "development" })).toBe(false);
  });
  it("off on localhost, 127.0.0.1, the emulator and in tests", async () => {
    const { sentryEnabled } = await load();
    for (const hostname of ["localhost", "127.0.0.1", "[::1]", "app.localhost", "x.test"]) expect(sentryEnabled({ dsn: DSN, hostname, mode: "development" }), hostname).toBe(false);
    expect(sentryEnabled({ dsn: DSN, hostname: "dev.queryhawk.net", mode: "emulator" })).toBe(false);
    expect(sentryEnabled({ dsn: DSN, hostname: "dev.queryhawk.net", mode: "test" })).toBe(false);
  });
  it("on for the deployed sites", async () => {
    const { sentryEnabled } = await load();
    expect(sentryEnabled({ dsn: DSN, hostname: "scriptally-dev.web.app", mode: "development" })).toBe(true);
    expect(sentryEnabled({ dsn: DSN, hostname: "queryhawk.net", mode: "production" })).toBe(true);
  });
});

describe("initSentry", () => {
  it("does not initialise without a DSN", async () => {
    const { initSentry } = await load();
    expect(initSentry({ hostname: "dev.queryhawk.net", mode: "development" })).toBe(false);
    expect(calls.init).toHaveLength(0);
  });

  it("does not initialise in this test run with the real environment (no host, mode test)", async () => {
    const { initSentry } = await load();
    expect(initSentry()).toBe(false);
    expect(calls.init).toHaveLength(0);
  });

  it("initialises once, errors only, with every collected category off", async () => {
    const { initSentry } = await load();
    expect(initSentry({ dsn: DSN, environment: "dev", hostname: "scriptally-dev.web.app", mode: "development" })).toBe(true);
    expect(initSentry({ dsn: DSN, environment: "dev", hostname: "scriptally-dev.web.app", mode: "development" })).toBe(false);
    expect(calls.init).toHaveLength(1);
    const o = calls.init[0] as Record<string, unknown> & { integrations: { name: string; opts?: Record<string, unknown> }[] };
    expect(o.dsn).toBe(DSN);
    expect(o.environment).toBe("dev");
    expect(o.defaultIntegrations).toBe(false);
    const names = o.integrations.map((i) => i.name);
    expect(names).toEqual(["EventFilters", "FunctionToString", "BrowserApiErrors", "Breadcrumbs", "GlobalHandlers", "LinkedErrors", "Dedupe", "HttpContext"]);
    for (const banned of ["Replay", "BrowserTracing", "BrowserProfiling", "Feedback", "BrowserSession", "Console"]) expect(names.join(" ")).not.toContain(banned);
    expect(o.integrations.find((i) => i.name === "Breadcrumbs")!.opts).toEqual({ dom: false, fetch: false, xhr: false, sentry: false, history: true });
    for (const k of ["tracesSampleRate", "replaysSessionSampleRate", "replaysOnErrorSampleRate", "profilesSampleRate"]) expect(o[k], k).toBeUndefined();
    expect(o.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false, httpBodies: [] });
    expect(typeof o.beforeSend).toBe("function");
    expect(typeof o.beforeBreadcrumb).toBe("function");
  });

  it("beforeSend scrubs, and drops an error handleFirestoreError has already reported", async () => {
    const { initSentry, markReported } = await load();
    initSentry({ dsn: DSN, environment: "dev", hostname: "scriptally-dev.web.app", mode: "development" });
    const beforeSend = (calls.init[0] as { beforeSend: (e: unknown, h?: unknown) => unknown }).beforeSend;
    expect(beforeSend({ request: { url: "/welcome?r=FW-1", headers: { a: 1 } } }, {})).toEqual({ request: { url: "/welcome" } });
    const err = new Error("Firestore get failed");
    markReported(err);
    expect(beforeSend({ message: "x" }, { originalException: err })).toBeNull();
  });
});

describe("the user is the uid and nothing else", () => {
  it("identifyForErrors sets { id } on sign-in and clears it on sign-out", async () => {
    const { identifyForErrors } = await load();
    identifyForErrors("uid-123");
    identifyForErrors(null);
    expect(calls.setUser).toEqual([{ id: "uid-123" }, null]);
  });

  it("no file in src calls Sentry's setUser except lib/sentry.ts, and that call carries only an id", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && /\bsetUser\(/.test(readFileSync(p, "utf8"))) hits.push(p.replace(/.*\/src\//, "src/"));
      }
    };
    walk(join(__dirname, ".."));
    expect(hits).toEqual(["src/lib/sentry.ts"]);
    const line = readFileSync(join(__dirname, "sentry.ts"), "utf8").split("\n").find((l) => /Sentry\.setUser\(/.test(l))!;
    expect(line).toContain("{ id: uid }");
    expect(line).not.toMatch(/email|name|ip/i);
  });
});

describe("reporting", () => {
  it("a boundary's catch is captured with its page name", async () => {
    const { reportBoundaryError } = await import("./errorReporting");
    const err = new Error("boom");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportBoundaryError(err, { boundary: "queries", componentStack: "\n    at Queries" });
    spy.mockRestore();
    expect(calls.capture).toEqual([[err, { tags: { boundary: "queries" }, contexts: { react: { componentStack: "\n    at Queries" } } }]]);
  });

  it("handleFirestoreError reports the operation and the path's shape, and still throws as before", async () => {
    const { reportFirestoreError } = await import("./errorReporting");
    const { markReported } = await import("./sentry");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = new Error("Missing or insufficient permissions.");
    const thrown = reportFirestoreError(original.message, original, "get", "users/abc/queries/q1");
    spy.mockRestore();
    expect(thrown.message).toBe("Firestore get failed at users/abc/queries/q1: Missing or insufficient permissions.");
    expect(calls.capture).toEqual([[original, { tags: { area: "firestore", operation: "get", path: "users/{id}/queries/{id}" } }]]);
    void markReported;
    /* and firebase.ts throws exactly that (it cannot be imported here: it starts Firebase) */
    const src = readFileSync(join(__dirname, "firebase.ts"), "utf8");
    expect(src).toContain("throw reportFirestoreError(errInfo.error, error, errInfo.operationType, path);");
  });
});
