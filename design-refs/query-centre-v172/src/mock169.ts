/* MOCK ONLY (Query Centre v169 review build) — the review switches. Not for the app. */
import { useSyncExternalStore } from "react";
export interface Mock169 { list: "ledger" | "rows" | "cards"; tint: "band" | "edge"; line: "due" | "today"; next: "act" | "built"; mats: "icons" | "clip"; ws: "column" | "edge" | "beside" | "under"; wsl: "band" | "status" | "chip" | "bar" | "seal" | "steps" | "ledger"; tl: "steps" | "beside" | "under" | "lead"; fp: "smart" | "built"; g1: "on" | "off"; fold: "on" | "off"; bars: "on" | "off"; hint: "on" | "off"; views: "on" | "off"; slate: "on" | "off"; head: "cream" | "blush" | "blushd" | "sand" | "navy" | "slate" | "line"; mpills: "on" | "off"; cw: "consider" | "close" }
const KEY = "qh.mock174";
const read = (): Mock169 => { try { return { list: "ledger", tint: "band", line: "due", next: "act", mats: "icons", ws: "beside", wsl: "band", tl: "steps", fp: "smart", g1: "on", fold: "on", bars: "off", hint: "on", views: "off", slate: "off", head: "blushd", mpills: "on", cw: "consider", ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { list: "ledger", tint: "band", line: "due", next: "act", mats: "icons", ws: "beside", wsl: "band", tl: "steps", fp: "smart", g1: "on", fold: "on", bars: "off", hint: "on", views: "off", slate: "off", head: "blush", mpills: "on", cw: "consider" }; } };
let cur = read();
const subs = new Set<() => void>();
export const setMock169 = (p: Partial<Mock169>) => { cur = { ...cur, ...p }; try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* */ } subs.forEach((f) => f()); };
export const useMock169 = (): Mock169 => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cur, () => cur);

/* the review build opens on the Query Centre with the beta strip dismissed (as on Nick's dev screen) */
try { sessionStorage.setItem("sa.betaStripDismissed", "1"); } catch { /* */ }
