/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DiaryLab — DEV-only review harness for the "What's in the diary?" carousel (#/diary-lab). Renders
 * DiaryCarousel over a mock fortnight (the mockup's scene) so it can be eyeballed WITHOUT signing in
 * (the dashboard is auth-gated). Crucially it REPLICATES the app stage — a scroll container with
 * id="app-stage-scroll" wrapping a centred max-width column — so the full-bleed break-out is
 * exercised here exactly as on the real dashboard. Theme toggle proves the three --dc-* token sets.
 * TEMP — remove after sign-off.
 */
import React, { useMemo, useState } from "react";
import { Query, Agent, Manuscript, QueryStatus } from "../../types";
import { DiaryCarousel } from "./DiaryCarousel";
import { startOfDay } from "./fortnightEvents";
import { FONT_MONO } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold" | "t-edn";

const AGENTS: Agent[] = [
  { id: "a1", name: "Alexandra Stone", agency: "Foundry Literary" },
  { id: "a2", name: "Jonathan Vance", agency: "Vanguard Creative" },
  { id: "a3", name: "Priya Chandran", agency: "Marchbank Literary" },
  { id: "a4", name: "Elena Marsh", agency: "Rook & Quill" },
] as unknown as Agent[];

const MANUSCRIPTS: Manuscript[] = [
  { id: "m1", title: "The Lighthouse at Wick Point" },
] as unknown as Manuscript[];

export const DiaryLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");

  // Mock queries shaped to reproduce the mockup's fortnight: query sent −5 · full requested −4 ·
  // query sent −2 · nudge due +1 · full due to send +3 · response window closes +7. Today quiet.
  const queries = useMemo<Query[]>(() => {
    const today = startOfDay(new Date());
    const iso = (off: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + off);
      return d.toISOString();
    };
    return [
      { id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: iso(-5), responseDeadline: iso(7) },
      { id: "q2", agentId: "a2", manuscriptId: "m1", status: QueryStatus.FULL_REQUESTED, dateSent: iso(-30), fullRequestedDate: iso(-4), expectedSendDate: iso(3) },
      { id: "q3", agentId: "a3", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: iso(-2), responseDeadline: iso(40) },
      { id: "q4", agentId: "a4", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: iso(-40), responseDeadline: iso(45), nudgeDate: iso(1) },
    ] as unknown as Query[];
  }, []);

  const chipStyle = (on: boolean): React.CSSProperties => ({
    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase",
    padding: "7px 13px", borderRadius: 8, cursor: "pointer",
    border: "1px solid var(--bd, #d6cfc4)", background: on ? "var(--band-a, #ece5d8)" : "#fffefb",
    color: on ? "var(--hdr, #5d4037)" : "var(--ink, #241c15)",
  });

  const filler = (label: string) => (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ height: 120, borderRadius: 16, border: "1px dashed rgba(124,58,42,.25)", background: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted, #8a7d6c)" }}>
        {label} (content-column width · the strip should run wider than this)
      </div>
    </div>
  );

  return (
    // Replicates AppShell: fixed-height flex shell → the scroll STAGE (id app-stage-scroll,
    // position:relative, overflow-y:auto) → a centred max-width column holding the carousel.
    <div className={theme} style={{ height: "100vh", display: "flex", overflow: "hidden", background: "var(--desk, #f2ede7)" }}>
      <div id="app-stage-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1280, margin: "0 auto", padding: "18px 24px 0", flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted, #8a7d6c)" }}>#/diary-lab</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {(["t-capp", "t-bold", "t-edn"] as Theme[]).map((t) => (
              <button key={t} type="button" onClick={() => setTheme(t)} style={chipStyle(theme === t)}>
                {t === "t-capp" ? "Cappuccino" : t === "t-bold" ? "Bold Pastille" : "Editorial"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 0 40px" }}>
          {filler("Stat row")}
          <div style={{ margin: "20px 0" }}>
            <DiaryCarousel queries={queries} agents={AGENTS} manuscripts={MANUSCRIPTS} activities={[]} />
          </div>
          {filler("What's live")}
        </div>
      </div>
    </div>
  );
};
