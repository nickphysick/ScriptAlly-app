/* MOCK ONLY (Query Centre v169 review build) — the review switches. Not for the app. */
import { useSyncExternalStore } from "react";
export interface Mock169 { list: "ledger" | "rows" | "cards"; tint: "band" | "edge"; line: "due" | "today"; next: "act" | "built"; mats: "icons" | "clip"; ws: "column" | "edge" | "beside" | "under"; wsl: "band" | "status" | "chip" | "bar" | "seal" | "steps" | "ledger"; tl: "steps" | "beside" | "under" | "lead"; fp: "smart" | "built"; g1: "on" | "off"; fold: "on" | "off"; bars: "on" | "off"; hint: "on" | "off"; views: "on" | "off"; slate: "on" | "off"; head: "cream" | "blush" | "blushd" | "sand" | "navy" | "slate" | "line"; mpills: "on" | "off"; cw: "consider" | "close"; end: "built" | "none" | "line"; ld: "new" | "built"; tm: "grace" | "cover"; en: "stagger" | "fade" | "none"; sm: "1" | "3"; top: "ring" | "ws" | "counts"; fd: "off" | "on"; one: "any" | "one"; spark: "off" | "on"; when: "three" | "one"; qp: "off" | "on"; stg: "own" | "ring"; frame: "lines" | "air"; pos: "stick" | "shrink" | "tuck"; key: "below" | "first" | "side" | "big"; ctr: "need" | "all"; cu: "on" | "off"; pop: "on" | "off"; empty: "hide" | "show"; hdr: "all" | "live" | "none"; tb: "need" | "plain" }
const KEY = "qh.mock1915";
const read = (): Mock169 => { try { return { list: "ledger", tint: "band", line: "due", next: "act", mats: "icons", ws: "beside", wsl: "band", tl: "steps", fp: "smart", g1: "on", fold: "on", bars: "off", hint: "on", views: "off", slate: "off", head: "blushd", mpills: "on", cw: "consider", end: "none", ld: "new", tm: "grace", en: "stagger", sm: "1", top: "ring", fd: "on", one: "any", spark: "off", when: "three", qp: "off", stg: "own", frame: "lines", pos: "stick", key: "below", ctr: "need", cu: "on", pop: "on", empty: "hide", hdr: "live", tb: "need", ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { list: "ledger", tint: "band", line: "due", next: "act", mats: "icons", ws: "beside", wsl: "band", tl: "steps", fp: "smart", g1: "on", fold: "on", bars: "off", hint: "on", views: "off", slate: "off", head: "blush", mpills: "on", cw: "consider", end: "none", ld: "new", tm: "grace", en: "stagger", sm: "1", top: "ring", fd: "on", one: "any", spark: "off", when: "three", qp: "off", stg: "own", frame: "lines", pos: "stick", key: "below", ctr: "need", cu: "on", pop: "on", empty: "hide", hdr: "live", tb: "need" }; } };
let cur = read();
export const peekMock169 = (): Mock169 => cur;
/* the load replay: remounts the Query Centre with useQcLoad's own dev hold set for the length of one load */
let rp = 0;
const rsubs = new Set<() => void>();
export const useReplay169 = (): number => useSyncExternalStore((f) => { rsubs.add(f); return () => rsubs.delete(f); }, () => rp, () => rp);
export const replayLoad169 = (ms: number) => {
  const w = window as unknown as { __SA_QC_HOLD_MS?: number };
  w.__SA_QC_HOLD_MS = ms; rp += 1; rsubs.forEach((f) => f());
  window.setTimeout(() => { w.__SA_QC_HOLD_MS = 0; }, ms + 1000);
};
const setSm = () => { try { document.documentElement.style.setProperty("--sm", cur.sm); } catch { /* */ } };
setSm();
const subs = new Set<() => void>();
export const setMock169 = (p: Partial<Mock169>) => { cur = { ...cur, ...p }; try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* */ } subs.forEach((f) => f()); setSm(); };
export const useMock169 = (): Mock169 => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cur, () => cur);

/* the review build opens on the Query Centre with the beta strip dismissed (as on Nick's dev screen) */
try { sessionStorage.setItem("sa.betaStripDismissed", "1"); } catch { /* */ }
(window as unknown as { __replay169?: (ms: number) => void }).__replay169 = replayLoad169;
