/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * backgroundLab.ts — pure model for the DEV-only page-background lab (BackgroundLab.tsx).
 *
 * The app's "page colour" is TWO layers:
 *   · GROUND — the shell root's hardcoded #F5F0EA (kraft/light sand, AppShell.tsx). Only visible
 *     where nothing paints over it; the shell root carries [data-sa-ground] so the lab can hit it.
 *   · DESK — the themed working surface `--desk` / `--hub-desk` (index.css per theme class),
 *     painted by StagePage slots, the Dashboard root, the hub desks and manuscripts. This is the
 *     colour you actually SEE on every main page.
 *
 * The lab overrides either layer per theme via one injected <style> string (buildLabCss). Desk
 * overrides set BOTH --desk and --hub-desk to the same value — the ultrawide cap relies on the
 * pair matching, so the lab never lets them drift. Ground overrides need !important to beat the
 * shell root's inline style. Overrides live in localStorage only; nothing here writes app state.
 */

export type LabTheme = "cappuccino" | "bold" | "editorial";

export const LAB_THEME_CLASS: Record<LabTheme, string> = {
  cappuccino: "t-capp",
  bold: "t-bold",
  editorial: "t-edn",
};

export const LAB_THEMES: LabTheme[] = ["cappuccino", "bold", "editorial"];

export type LabLayer = "desk" | "ground";

export interface LayerOverride {
  desk?: string;
  ground?: string;
}

export interface BgLabState {
  overrides: Partial<Record<LabTheme, LayerOverride>>;
  /** When true, picking a colour paints desk + ground together (one page colour app-wide). */
  linked: boolean;
}

export const EMPTY_LAB_STATE: BgLabState = { overrides: {}, linked: true };

/** localStorage key — sa. prefix per the shell UI-pref convention. */
export const BG_LAB_STORAGE_KEY = "sa.bgLab";

/** Candidate grounds/desks — the kraft family, the three current theme desks, and a few washes. */
export const LAB_SWATCHES: { hex: string; name: string }[] = [
  { hex: "#f5f0ea", name: "Light sand — current shell ground" },
  { hex: "#faf5ee", name: "Warm cream" },
  { hex: "#fdfaf5", name: "Parchment" },
  { hex: "#f1e8dc", name: "Oat" },
  { hex: "#e8ddd0", name: "Cappuccino desk (today)" },
  { hex: "#e4d5bc", name: "Kraft paper" },
  { hex: "#d9c7a8", name: "Deep kraft" },
  { hex: "#cdb391", name: "Packing kraft" },
  { hex: "#c2cfda", name: "Bold blue-grey desk (today)" },
  { hex: "#f4f4f3", name: "Editorial paper (today)" },
  { hex: "#e9ede6", name: "Sage wash" },
];

/** "#abc" / "abc" / "#aabbcc" / "AABBCC" → "#aabbcc"; anything else → null. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  if (/^[0-9a-f]{3}$/.test(raw)) return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  return null;
}

/** "rgb(245, 240, 234)" / "rgba(…)" → "#f5f0ea"; unparseable → null. */
export function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return normalizeHex(rgb);
  const part = (s: string) => Math.min(255, parseInt(s, 10)).toString(16).padStart(2, "0");
  return `#${part(m[1])}${part(m[2])}${part(m[3])}`;
}

/** Safe parse of the stored state — invalid hexes dropped, garbage → empty state. */
export function parseLabState(raw: string | null): BgLabState {
  if (!raw) return EMPTY_LAB_STATE;
  try {
    const data = JSON.parse(raw) as Partial<BgLabState>;
    const overrides: BgLabState["overrides"] = {};
    for (const theme of LAB_THEMES) {
      const o = data.overrides?.[theme];
      if (!o) continue;
      const desk = typeof o.desk === "string" ? normalizeHex(o.desk) : null;
      const ground = typeof o.ground === "string" ? normalizeHex(o.ground) : null;
      if (desk || ground) overrides[theme] = { ...(desk ? { desk } : {}), ...(ground ? { ground } : {}) };
    }
    return { overrides, linked: data.linked !== false };
  } catch {
    return EMPTY_LAB_STATE;
  }
}

export function serializeLabState(state: BgLabState): string {
  return JSON.stringify(state);
}

/** Apply a colour to one layer of one theme — when linked, both layers move together. */
export function withOverride(state: BgLabState, theme: LabTheme, layer: LabLayer, hex: string): BgLabState {
  const normalized = normalizeHex(hex);
  if (!normalized) return state;
  const prev = state.overrides[theme] ?? {};
  const next: LayerOverride = state.linked
    ? { desk: normalized, ground: normalized }
    : { ...prev, [layer]: normalized };
  return { ...state, overrides: { ...state.overrides, [theme]: next } };
}

/** Clear one layer (both when linked); drops the theme entry once empty. */
export function clearOverride(state: BgLabState, theme: LabTheme, layer: LabLayer): BgLabState {
  const prev = state.overrides[theme];
  if (!prev) return state;
  const next = { ...prev };
  delete next[layer];
  if (state.linked) delete next[layer === "desk" ? "ground" : "desk"];
  const overrides = { ...state.overrides };
  if (next.desk || next.ground) overrides[theme] = next;
  else delete overrides[theme];
  return { ...state, overrides };
}

export function resetAll(state: BgLabState): BgLabState {
  return { ...state, overrides: {} };
}

/**
 * The injected stylesheet. Doubled theme class out-specifies the single-class token blocks in
 * index.css regardless of sheet order; the ground rule needs !important to beat the shell root's
 * inline background. Empty state → "" (no <style> rendered).
 */
export function buildLabCss(state: BgLabState): string {
  const rules: string[] = [];
  for (const theme of LAB_THEMES) {
    const o = state.overrides[theme];
    if (!o) continue;
    const cls = LAB_THEME_CLASS[theme];
    if (o.desk) rules.push(`.${cls}.${cls} { --desk: ${o.desk}; --hub-desk: ${o.desk}; }`);
    if (o.ground) rules.push(`.${cls}[data-sa-ground] { background: ${o.ground} !important; }`);
  }
  return rules.join("\n");
}

/** Human summary for the clipboard — tells the next session exactly what to change where. */
export function labSummary(state: BgLabState): string {
  const lines: string[] = ["ScriptAlly background lab — chosen overrides"];
  let any = false;
  for (const theme of LAB_THEMES) {
    const o = state.overrides[theme];
    if (!o) continue;
    any = true;
    const cls = LAB_THEME_CLASS[theme];
    if (o.desk) lines.push(`[${theme}] desk ${o.desk} → index.css .${cls}: set --desk AND --hub-desk (keep the pair equal)`);
    if (o.ground) lines.push(`[${theme}] ground ${o.ground} → AppShell.tsx shell-root background (today #F5F0EA)`);
  }
  if (!any) lines.push("(no overrides active)");
  return lines.join("\n");
}
