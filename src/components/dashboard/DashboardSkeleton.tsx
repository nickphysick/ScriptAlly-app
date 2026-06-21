/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashboardSkeleton — the warm placeholder shown while the dashboard's data is still loading.
 *
 * It mirrors the real dashboard's layout (Dashboard.tsx default/non-magazine view): two
 * `[1fr_420px]` grid rows — row 1 = hero banner + four stat-chart cards (left) and the task
 * panel (right); row 2 = the querying-pipeline strip + strategic-insight cards (left) and the
 * Fortnight-in-Focus panel (right). Matching the same container classes, grid tracks, gaps and
 * card heights keeps layout shift near-zero when the real content swaps in.
 *
 * Shaped blocks only — no text, no fake numbers. Warm taupe placeholder on parchment cards with
 * a slow shimmer; the shimmer drops to a static tone under prefers-reduced-motion.
 */
import React from "react";

/** A shimmering placeholder block (rounded). `r` is the corner radius. */
const Block: React.FC<{ w?: number | string; h?: number | string; r?: number; className?: string; style?: React.CSSProperties }> = ({
  w = "100%",
  h = 12,
  r = 6,
  className = "",
  style,
}) => (
  <div className={`sk-block ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />
);

/** A small circle placeholder (status dots / avatars). */
const Dot: React.FC<{ s?: number }> = ({ s = 26 }) => (
  <div className="sk-block" style={{ width: s, height: s, borderRadius: "50%", flexShrink: 0 }} />
);

const Card: React.FC<{ className?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  className = "",
  style,
  children,
}) => (
  <div className={`sk-card ${className}`} style={style}>
    {children}
  </div>
);

export const DashboardSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" aria-busy="true">
      <style>{`
        @keyframes skShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .sk-block {
          background-color: #e7ddce;
          background-image: linear-gradient(90deg, #e7ddce 0%, #efe7db 50%, #e7ddce 100%);
          background-size: 200% 100%;
          animation: skShimmer 1.9s ease-in-out infinite;
        }
        .sk-card {
          background: #FDFAF5;
          border: 0.5px solid #e8e0d8;
          border-radius: 16px;
          box-shadow: 0 1px 2px rgba(60,40,30,.04), 0 8px 30px rgba(60,40,30,.05);
        }
        @media (prefers-reduced-motion: reduce) {
          .sk-block { animation: none; background-image: none; background-color: #e7ddce; }
        }
      `}</style>

      {/* ===== Row 1: hero + four stat cards (left) · task panel (right) ===== */}
      <div className="w-full max-w-none px-4 md:px-10 lg:px-8 xl:px-8 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[16px] items-stretch">
          {/* Left: hero banner above the four stat cards */}
          <div className="flex flex-col gap-[16px]">
            <Card style={{ minHeight: 150, padding: 24 }}>
              <Block w={120} h={11} r={5} />
              <Block w="56%" h={26} r={7} style={{ marginTop: 16 }} />
              <Block w="42%" h={13} r={5} style={{ marginTop: 12 }} />
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <Block w={130} h={36} r={10} />
                <Block w={120} h={36} r={10} />
                <Block w={140} h={36} r={10} />
              </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px] items-stretch">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} style={{ minHeight: 170, padding: "23px 23px 21px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Block w={70} h={10} r={5} />
                    <Dot s={18} />
                  </div>
                  <Block w={54} h={30} r={7} style={{ marginTop: 16 }} />
                  <Block w="70%" h={10} r={5} style={{ marginTop: 10 }} />
                  {/* chart area */}
                  <Block w="100%" h={42} r={8} style={{ marginTop: "auto" }} />
                </Card>
              ))}
            </div>
          </div>

          {/* Right: task panel (fills the cell height, driven by the left column) */}
          <div className="relative">
            <div className="lg:absolute lg:inset-0">
              <Card style={{ height: "100%", minHeight: 336, padding: 22, display: "flex", flexDirection: "column" }}>
                <Block w={140} h={14} r={6} />
                <Block w={90} h={10} r={5} style={{ marginTop: 10 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Dot s={26} />
                      <div style={{ flex: 1 }}>
                        <Block w="80%" h={12} r={5} />
                        <Block w="55%" h={10} r={5} style={{ marginTop: 8 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Row 2: pipeline + insights (left) · Fortnight panel (right) ===== */}
      <div className="w-full max-w-none px-4 md:px-10 lg:px-8 xl:px-8 pt-[14px] grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[16px] items-start">
        {/* Left column */}
        <div className="flex flex-col gap-[16px]">
          {/* Querying pipeline strip */}
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Block w={150} h={11} r={5} />
              <Block w={80} h={9} r={5} />
            </div>
            {/* header dots row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
              <Block w={220} h={10} r={5} />
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
                {Array.from({ length: 7 }).map((_, i) => <Dot key={i} s={14} />)}
              </div>
            </div>
            {/* manuscript rows */}
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
                <Block w={220} h={14} r={5} />
                <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
                  {Array.from({ length: 7 }).map((_, i) => <Dot key={i} s={22} />)}
                </div>
              </div>
            ))}
          </Card>

          {/* Strategic insight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} style={{ minHeight: 96, padding: 18 }}>
                <Block w={90} h={10} r={5} />
                <Block w="70%" h={16} r={6} style={{ marginTop: 12 }} />
                <Block w="50%" h={10} r={5} style={{ marginTop: 10 }} />
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Fortnight-in-Focus panel */}
        <Card style={{ minHeight: 360, padding: 20 }}>
          <Block w={160} h={13} r={6} />
          <Block w={110} h={10} r={5} style={{ marginTop: 10 }} />
          {/* day grid */}
          <div className="grid grid-cols-7 gap-2" style={{ marginTop: 20 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <Block key={i} w="100%" h={56} r={8} />
            ))}
          </div>
          <Block w="100%" h={64} r={10} style={{ marginTop: 18 }} />
        </Card>
      </div>
    </div>
  );
};
