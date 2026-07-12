/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackgroundLab — DEV-only floating panel for auditioning app-wide page colours live, on the
 * real pages with real data. Mounted by the shell AppShell behind import.meta.env.DEV (so it
 * exists locally and on the scriptally-dev build, never in prod). All model logic is pure in
 * backgroundLab.ts (unit-locked); this file is only the chrome + localStorage/DOM IO.
 *
 * Two layers per theme (see backgroundLab.ts): DESK (--desk/--hub-desk — the visible page
 * colour) and GROUND (the shell root's kraft #F5F0EA behind it). Overrides apply through one
 * injected <style> and persist per browser in localStorage — never to the app or Firestore.
 */
import React, { useEffect, useMemo, useState } from "react";
import { FONT_MONO } from "../../lib/designTokens";
import {
  BG_LAB_STORAGE_KEY,
  BgLabState,
  LAB_SWATCHES,
  LabLayer,
  LabTheme,
  buildLabCss,
  clearOverride,
  labSummary,
  normalizeHex,
  parseLabState,
  resetAll,
  rgbToHex,
  serializeLabState,
  withOverride,
} from "./backgroundLabModel";

const readStored = (): BgLabState => {
  try {
    return parseLabState(window.localStorage.getItem(BG_LAB_STORAGE_KEY));
  } catch {
    return parseLabState(null);
  }
};

const writeStored = (state: BgLabState) => {
  try {
    window.localStorage.setItem(BG_LAB_STORAGE_KEY, serializeLabState(state));
  } catch {
    /* private mode — session-only is fine for a dev tool */
  }
};

/** Effective (post-override) colours, read off the live shell root. */
interface CurrentColours {
  desk: string;
  hubDesk: string;
  ground: string;
}

const readCurrent = (): CurrentColours | null => {
  const root = document.querySelector<HTMLElement>("[data-sa-ground]");
  if (!root) return null;
  const cs = getComputedStyle(root);
  return {
    desk: cs.getPropertyValue("--desk").trim(),
    hubDesk: cs.getPropertyValue("--hub-desk").trim(),
    ground: rgbToHex(cs.backgroundColor) ?? cs.backgroundColor,
  };
};

const ink = "#3b3129";
const hair = "#e3dbd0";
const mono9: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a7d6c",
};

const Swatch: React.FC<{ hex: string; name: string; selected: boolean; onPick: () => void }> = ({ hex, name, selected, onPick }) => (
  <button
    type="button"
    onClick={onPick}
    title={`${name} · ${hex}`}
    aria-label={`${name} ${hex}`}
    aria-pressed={selected}
    style={{
      width: 24,
      height: 24,
      borderRadius: 6,
      background: hex,
      border: selected ? "2px solid #7c3a2a" : "1px solid rgba(59,49,41,0.28)",
      cursor: "pointer",
      padding: 0,
      flex: "none",
    }}
  />
);

const LayerSection: React.FC<{
  label: string;
  hint: string;
  effective: string;
  overrideHex?: string;
  onPick: (hex: string) => void;
  onClear: () => void;
}> = ({ label, hint, effective, overrideHex, onPick, onClear }) => {
  const [custom, setCustom] = useState("");
  const customValid = normalizeHex(custom);
  return (
    <div style={{ borderTop: `1px solid ${hair}`, paddingTop: 9, marginTop: 9 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ ...mono9, color: ink }}>{label}</span>
        <span style={{ ...mono9, fontSize: 8.5 }}>
          {overrideHex ? `override ${overrideHex}` : `current ${effective || "—"}`}
        </span>
      </div>
      <div style={{ ...mono9, fontSize: 8.5, marginTop: 2 }}>{hint}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
        {LAB_SWATCHES.map((s) => (
          <Swatch key={s.hex} hex={s.hex} name={s.name} selected={overrideHex === s.hex} onPick={() => onPick(s.hex)} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <input
          type="color"
          value={overrideHex ?? (normalizeHex(effective) || "#f5f0ea")}
          onChange={(e) => onPick(e.target.value)}
          title="Pick any colour"
          style={{ width: 26, height: 22, padding: 0, border: `1px solid ${hair}`, borderRadius: 5, background: "none", cursor: "pointer" }}
        />
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customValid) {
              onPick(customValid);
              setCustom("");
            }
          }}
          placeholder="#hex ↵"
          spellCheck={false}
          style={{
            width: 70,
            fontFamily: FONT_MONO,
            fontSize: 10,
            padding: "3px 6px",
            border: `1px solid ${custom && !customValid ? "#b3543e" : hair}`,
            borderRadius: 5,
            color: ink,
            background: "#fff",
          }}
        />
        <button
          type="button"
          onClick={onClear}
          disabled={!overrideHex}
          style={{
            marginLeft: "auto",
            fontFamily: FONT_MONO,
            fontSize: 8.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 5,
            border: `1px solid ${hair}`,
            background: "#fff",
            color: overrideHex ? ink : "#c0b6a8",
            cursor: overrideHex ? "pointer" : "default",
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export const BackgroundLab: React.FC<{ theme: LabTheme }> = ({ theme }) => {
  const [state, setState] = useState<BgLabState>(readStored);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<CurrentColours | null>(null);
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => buildLabCss(state), [state]);
  const override = state.overrides[theme] ?? {};

  const update = (next: BgLabState) => {
    setState(next);
    writeStored(next);
  };

  // Re-read the effective colours after every override/theme change. Deferred past the next
  // paint — Chrome's same-task getComputedStyle after a sheet swap can serve a stale resolution
  // for the !important-vs-inline ground (verified live); one frame later it's always correct.
  useEffect(() => {
    const t = window.setTimeout(() => setCurrent(readCurrent()), 60);
    return () => window.clearTimeout(t);
  }, [css, theme, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (layer: LabLayer) => (hex: string) => update(withOverride(state, theme, layer, hex));
  const hasAnyOverride = Object.keys(state.overrides).length > 0;

  const copySummary = async () => {
    const text = labSummary(state);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy the override summary:", text);
    }
  };

  const chipDesk = override.desk ?? normalizeHex(current?.desk ?? "") ?? "#e8ddd0";
  const chipGround = override.ground ?? (current?.ground || "#f5f0ea");

  return (
    <>
      {/* Always mounted, content-swapped — swapping text on a live sheet recalcs reliably,
          where unmounting a sheet with !important rules has shown one-frame stickiness. */}
      <style data-sa-bglab-css="">{css}</style>

      {/* Chip — above the help FAB (bottom-right 20, 38px, z30). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={hasAnyOverride ? "Background lab — overrides active" : "Background lab (dev only)"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 70,
          right: 20,
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 9px",
          borderRadius: 999,
          background: "#fffefb",
          border: `1px solid ${hasAnyOverride ? "#7c3a2a" : hair}`,
          boxShadow: "0 3px 12px rgba(58,28,20,0.14)",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 13,
            height: 13,
            borderRadius: "50%",
            flex: "none",
            background: `linear-gradient(135deg, ${chipDesk} 50%, ${chipGround} 50%)`,
            border: "1px solid rgba(59,49,41,0.3)",
          }}
        />
        <span style={{ ...mono9, color: ink }}>BG lab</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Background lab"
          style={{
            position: "fixed",
            bottom: 104,
            right: 20,
            zIndex: 70,
            width: 296,
            maxHeight: "72vh",
            overflowY: "auto",
            background: "#fffefb",
            border: `1px solid ${hair}`,
            borderRadius: 12,
            boxShadow: "0 10px 34px rgba(58,28,20,0.2)",
            padding: "12px 14px 13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ ...mono9, color: ink, fontSize: 10 }}>Background lab</span>
            <span style={{ ...mono9, fontSize: 8.5 }}>dev only · theme {theme}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", color: "#8a7d6c", fontSize: 13, lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={state.linked}
              onChange={(e) => update({ ...state, linked: e.target.checked })}
              style={{ margin: 0 }}
            />
            <span style={{ ...mono9, fontSize: 8.5, color: ink }}>Paint both layers together (one page colour)</span>
          </label>

          <LayerSection
            label="Desk — the page colour you see"
            hint="--desk + --hub-desk · every workspace page paints this"
            effective={
              current && current.desk !== current.hubDesk && !override.desk
                ? `${current.desk} / hub ${current.hubDesk}`
                : current?.desk ?? ""
            }
            overrideHex={override.desk}
            onPick={pick("desk")}
            onClear={() => update(clearOverride(state, theme, "desk"))}
          />

          <LayerSection
            label="Ground — kraft layer behind"
            hint="shell root #F5F0EA · shows only where no desk paints"
            effective={current?.ground ?? ""}
            overrideHex={override.ground}
            onPick={pick("ground")}
            onClear={() => update(clearOverride(state, theme, "ground"))}
          />

          <div style={{ display: "flex", gap: 6, marginTop: 11, borderTop: `1px solid ${hair}`, paddingTop: 10 }}>
            <button
              type="button"
              onClick={() => update(resetAll(state))}
              disabled={!hasAnyOverride}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 8.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "4px 9px",
                borderRadius: 6,
                border: `1px solid ${hair}`,
                background: "#fff",
                color: hasAnyOverride ? ink : "#c0b6a8",
                cursor: hasAnyOverride ? "pointer" : "default",
              }}
            >
              Reset all themes
            </button>
            <button
              type="button"
              onClick={copySummary}
              style={{
                marginLeft: "auto",
                fontFamily: FONT_MONO,
                fontSize: 8.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "4px 9px",
                borderRadius: 6,
                border: "1px solid #7c3a2a",
                background: "#fff",
                color: "#7c3a2a",
                cursor: "pointer",
              }}
            >
              {copied ? "Copied ✓" : "Copy summary"}
            </button>
          </div>

          <div style={{ ...mono9, fontSize: 8, marginTop: 9, lineHeight: 1.5 }}>
            Local to this browser (localStorage) — never written to the app. Focus pages (/account
            /plans /help) and the mobile bar keep their own grounds.
          </div>
        </div>
      )}
    </>
  );
};
