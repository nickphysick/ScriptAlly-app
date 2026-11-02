/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CF-2 (2 Nov): Cloudflare's beacon loads on queryhawk.net and www.queryhawk.net only, never twice,
 * not after `?notrack`,
 * and never from the built HTML. The served half (a production build on 127.0.0.1 makes no request
 * to Cloudflare) is tests/e2e/cfAnalytics.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { ANALYTICS_HOSTS, BEACON_CONFIG, BEACON_SRC, NOTRACK_KEY, startAnalytics, type AnalyticsEnv } from "./cfAnalytics";

type FakeScript = { attrs: Record<string, string>; defer: boolean; src: string; setAttribute: (k: string, v: string) => void };

/** One page load: a document of its own, a URL, and the storage handed in (shared across loads). */
function page(hostname: string, opts: { search?: string; store?: Map<string, string> | "throws" } = {}) {
  const head: FakeScript[] = [];
  const urls: string[] = [];
  const store = opts.store ?? new Map<string, string>();
  const storage = () => {
    if (store === "throws") throw new Error("SecurityError: storage is disabled");
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  };
  const env: AnalyticsEnv = {
    hostname,
    pathname: "/privacy",
    search: opts.search ?? "",
    hash: "#top",
    replaceUrl: (u) => urls.push(u),
    storage,
    doc: {
      head: { appendChild: (el) => head.push(el as FakeScript) },
      createElement: () => {
        const el: FakeScript = { attrs: {}, defer: false, src: "", setAttribute: (k, v) => { el.attrs[k] = v; } };
        return el;
      },
      querySelector: (sel) => head.find((s) => sel === `script[src="${s.src}"]`) ?? null,
    },
  };
  return { env, head, urls, store };
}

describe("CF-2 A1 · no beacon anywhere but the live hosts", () => {
  for (const host of ["localhost", "127.0.0.1", "192.168.1.10", "dev.queryhawk.net", "scriptally-app.web.app", "scriptally-app.firebaseapp.com", "queryhawk.net.evil.com", "evilqueryhawk.net", ""]) {
    it(`${host || "(empty host)"} adds no script`, () => {
      const p = page(host);
      startAnalytics(p.env);
      expect(p.head).toHaveLength(0);
    });
  }
  it("the allowlist is exactly the two live names", () => {
    expect([...ANALYTICS_HOSTS]).toEqual(["queryhawk.net", "www.queryhawk.net"]);
  });
});

describe("CF-2 A2 · exactly one beacon on the live hosts, with today's token and config", () => {
  for (const host of ["queryhawk.net", "www.queryhawk.net"]) {
    it(host, () => {
      const p = page(host);
      startAnalytics(p.env);
      startAnalytics(p.env);
      expect(p.head, "one, after two calls").toHaveLength(1);
      expect(p.head[0].src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
      expect(p.head[0].defer).toBe(true);
      expect(p.head[0].attrs["data-cf-beacon"]).toBe('{"token": "ee52cb1f15964230836ca4f32696fbfb"}');
      expect(BEACON_SRC).toBe(p.head[0].src);
      expect(BEACON_CONFIG).toBe(p.head[0].attrs["data-cf-beacon"]);
    });
  }
});

describe("CF-2 A3 · no built or source HTML carries the beacon", () => {
  const root = process.cwd();
  const htmlUnder = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? htmlUnder(p) : p.endsWith(".html") ? [p] : [];
    });
  const entries = [join(root, "index.html"), ...htmlUnder(join(root, "holding")), ...htmlUnder(join(root, "public")), ...htmlUnder(join(root, "dist"))];
  it("the population: the app's entry is read", () => {
    expect(entries).toContain(join(root, "index.html"));
  });
  it("none of them names cloudflareinsights", () => {
    const hits = entries.filter((f) => readFileSync(f, "utf8").includes("cloudflareinsights"));
    expect(hits).toEqual([]);
  });
  it("the build injects nothing and carries no token", () => {
    expect(readFileSync(join(root, "vite.config.ts"), "utf8")).not.toMatch(/transformIndexHtml|cfBeacon|CF_BEACON/);
    expect(readFileSync(join(root, ".env.production"), "utf8")).not.toContain("CF_BEACON");
  });
});

describe("CF-2 B · the ?notrack opt-out", () => {
  it("B1 · ?notrack sets the flag, strips the parameter, adds no script; a later plain load adds none either", () => {
    const store = new Map<string, string>();
    const first = page("queryhawk.net", { search: "?utm_source=instagram&notrack", store });
    startAnalytics(first.env);
    expect(store.get(NOTRACK_KEY)).toBe("1");
    expect(first.urls, "the parameter is gone, the rest kept").toEqual(["/privacy?utm_source=instagram#top"]);
    expect(first.head).toHaveLength(0);
    const later = page("queryhawk.net", { store });
    startAnalytics(later.env);
    expect(later.head, "still opted out on the next visit").toHaveLength(0);
    expect(later.urls, "nothing to strip").toEqual([]);
  });
  it("B1 · a bare ?notrack leaves a clean URL", () => {
    const p = page("queryhawk.net", { search: "?notrack" });
    startAnalytics(p.env);
    expect(p.urls).toEqual(["/privacy#top"]);
  });
  it("B2 · ?track clears the flag, and the beacon loads", () => {
    const store = new Map<string, string>([[NOTRACK_KEY, "1"]]);
    const back = page("queryhawk.net", { search: "?track", store });
    startAnalytics(back.env);
    expect(store.has(NOTRACK_KEY)).toBe(false);
    expect(back.urls).toEqual(["/privacy#top"]);
    expect(back.head).toHaveLength(1);
    const next = page("queryhawk.net", { store });
    startAnalytics(next.env);
    expect(next.head, "and on the next run").toHaveLength(1);
  });
  it("B3 · storage that throws: the beacon still loads once and nothing throws", () => {
    const p = page("queryhawk.net", { store: "throws" });
    expect(() => { startAnalytics(p.env); startAnalytics(p.env); }).not.toThrow();
    expect(p.head).toHaveLength(1);
    const q = page("queryhawk.net", { search: "?notrack", store: "throws" });
    expect(() => startAnalytics(q.env)).not.toThrow();
    expect(q.urls, "the parameter is still stripped").toEqual(["/privacy#top"]);
  });
  it("the opt-out works on any host (so a dev visit can set it), and dev still loads nothing", () => {
    const store = new Map<string, string>();
    const p = page("dev.queryhawk.net", { search: "?notrack", store });
    startAnalytics(p.env);
    expect(store.get(NOTRACK_KEY)).toBe("1");
    expect(p.head).toHaveLength(0);
  });
});
