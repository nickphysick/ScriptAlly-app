/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashboardSkeleton — warm placeholder shown while the dashboard's data loads.
 *
 * Mirrors THIS branch's dashboard (Dashboard.tsx default/non-magazine view) so real content snaps
 * into the same boxes with no layout shift. Two `[1fr_420px]` rows:
 *   Row 1: hero banner + four stat-chart cards (left) · task panel "Over to you" (right)
 *   Row 2: "What's live right now?" pipeline strip + Fortnight-in-Focus grid (left) ·
 *          "the story so far" activity timeline (right)
 *
 * Shaped blocks only (no text / fake numbers): warm parchment-taupe on parchment cards, matching
 * radii, gentle shimmer that drops to a static tone under prefers-reduced-motion. AppShell chrome
 * keeps rendering around this — only the content area is skeletonised.
 */
import React from "react";

const Block: React.FC<{ w?: number | string; h?: number | string; r?: number; className?: string; style?: React.CSSProperties }> = ({
  w = "100%",
  h = 12,
  r = 6,
  className = "",
  style,
}) => <div className={`sk-block ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;

const Dot: React.FC<{ s?: number }> = ({ s = 26 }) => (
  <div className="sk-block" style={{ width: s, height: s, borderRadius: "50%", flexShrink: 0 }} />
);

const Card: React.FC<{ className?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ className = "", style, children }) => (
  <div className={`sk-card ${className}`} style={style}>
    {children}
  </div>
);

/**
 * `slotIn` (opt-in, default off): the major cards rise + fade in one-by-one, staggered — the
 * "dashboard building itself" beat used behind the post-import loader (ImportingLoader). The live
 * loading usage in Dashboard.tsx leaves it off, so that path is unchanged. Reduced-motion → the
 * cards are simply present (no stagger), matching the rest of the skeleton.
 */
export const DashboardSkeleton: React.FC<{ slotIn?: boolean }> = ({ slotIn = false }) => {
  const slc = slotIn ? "sk-slot" : "";
  const sl = (i: number): React.CSSProperties => (slotIn ? { animationDelay: `${0.1 + i * 0.16}s` } : {});
  return (
    <div aria-hidden="true" aria-busy="true" className={slotIn ? "sk-slotin" : ""} style={{ minHeight: "100vh" }}>
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
        @keyframes skSlot { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .sk-slotin .sk-slot { opacity: 0; animation: skSlot .55s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .sk-block { animation: none; background-image: none; background-color: #e7ddce; }
          .sk-slotin .sk-slot { opacity: 1; transform: none; animation: none; }
        }
      `}</style>

      {/* ===== Row 1: hero + four stat cards (left) · task panel (right) ===== */}
      <div className="w-full max-w-none px-4 md:px-10 lg:px-8 xl:px-8 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[16px] items-stretch">
          <div className="flex flex-col gap-[16px]">
            {/* Hero banner */}
            <Card className={slc} style={{ minHeight: 150, padding: 24, ...sl(0) }}>
              <Block w={120} h={11} r={5} />
              <Block w="56%" h={26} r={7} style={{ marginTop: 16 }} />
              <Block w="42%" h={13} r={5} style={{ marginTop: 12 }} />
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <Block w={130} h={36} r={10} />
                <Block w={120} h={36} r={10} />
                <Block w={140} h={36} r={10} />
              </div>
            </Card>

            {/* Four stat-chart cards */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-[16px] items-stretch ${slc}`} style={sl(1)}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} style={{ minHeight: 170, padding: "23px 23px 21px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Block w={70} h={10} r={5} />
                    <Dot s={18} />
                  </div>
                  <Block w={54} h={30} r={7} style={{ marginTop: 16 }} />
                  <Block w="70%" h={10} r={5} style={{ marginTop: 10 }} />
                  <Block w="100%" h={42} r={8} style={{ marginTop: "auto" }} />
                </Card>
              ))}
            </div>
          </div>

          {/* Task panel "Over to you" — fills the cell height (driven by the left column) */}
          <div className="relative">
            <div className="lg:absolute lg:inset-0">
              <Card className={slc} style={{ height: "100%", minHeight: 336, padding: 22, display: "flex", flexDirection: "column", ...sl(2) }}>
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

      {/* ===== Row 2: What's-live strip + Fortnight grid (left) · story timeline (right) ===== */}
      <div className="w-full max-w-none px-4 md:px-10 lg:px-8 xl:px-8 pt-[14px] grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[16px] items-start">
        {/* Left column */}
        <div className="flex flex-col gap-[16px]">
          {/* "What's live right now?" — header + horizontal pipeline strip on a spine */}
          <Card className={slc} style={{ padding: 20, ...sl(3) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Block w={170} h={13} r={6} />
              <Block w={70} h={9} r={5} />
            </div>
            <div style={{ position: "relative", height: 83, marginTop: 18, display: "flex", alignItems: "center" }}>
              {/* spine line */}
              <Block h={2} r={2} style={{ position: "absolute", left: 0, right: 0, top: "50%" }} />
              {/* stage dots */}
              <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {Array.from({ length: 7 }).map((_, i) => <Dot key={i} s={30} />)}
              </div>
            </div>
          </Card>

          {/* Fortnight-in-Focus — header + 14-day grid */}
          <Card className={slc} style={{ minHeight: 320, padding: 20, ...sl(4) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Block w={160} h={13} r={6} />
              <Block w={90} h={9} r={5} />
            </div>
            <div className="grid grid-cols-7 gap-2" style={{ marginTop: 18 }}>
              {Array.from({ length: 14 }).map((_, i) => <Block key={i} w="100%" h={58} r={8} />)}
            </div>
            <Block w="100%" h={56} r={10} style={{ marginTop: 16 }} />
          </Card>
        </div>

        {/* Right: "the story so far" activity timeline */}
        <Card className={slc} style={{ minHeight: 360, padding: 22, display: "flex", flexDirection: "column", ...sl(5) }}>
          <Block w={130} h={13} r={6} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Dot s={22} />
                <div style={{ flex: 1 }}>
                  <Block w="72%" h={11} r={5} />
                  <Block w="46%" h={9} r={5} style={{ marginTop: 7 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
