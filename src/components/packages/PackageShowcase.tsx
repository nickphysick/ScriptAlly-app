/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackageShowcase — the Pro-selling landing shown on the Submission Packages route when the writer
 * has ZERO packages (replaces the FR1 "Find out what wins requests" split-stage). A marketing surface:
 * a Queries-Hub-idiom header on the page ground, a hero with a 24s self-playing product demo, a
 * Version-compare section, the library trio and a closing CTA band. Ref (source of truth, ported
 * faithfully): design-refs/scriptally-packages-showcase.html.
 *
 * CAPPUCCINO-ONLY by design (a marketing surface, not themed workspace chrome): every colour is a
 * self-scoped `.pkgshow --*` token (the ref's :root), so it reads Cappuccino regardless of the user's
 * queriesTheme — the same stance the public marketing Landing takes. Fonts are the app's
 * Source Sans Pro / Playfair / JetBrains (not the ref's Inter — the documented marketing divergence).
 *
 * The demo is ONE 24s master timeline, CSS-only (no JS timers). Keyframe names are namespaced `psw*`
 * (keyframes are always global) and every keyframe percentage is a literal number (CSS silently drops
 * var() in keyframe selectors — a proven footgun). Pure presentation: no Firestore, no state, no real
 * data; the demo + "Make active" buttons are fiction. `prefers-reduced-motion` renders the end-state.
 * (The ref's lines 152–156 are orphaned/truncated bar keyframes with no target element — omitted.)
 */
import React from "react";
import { FONT_SANS, FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

export interface PackageShowcaseProps {
  /** The active manuscript's title, shown in the header chip. */
  manuscriptTitle: string;
  /** "Unlock with Pro" — navigate to the plans page (host decision). */
  onUnlockPro: () => void;
  /** "Try it with example data →" — enter the workshop + start the FR3 tour (same hook as the old landing). */
  onTryExample: () => void;
}

const SHOWCASE_CSS = `
  .pkgshow { --ground:#f2ede7; --card:#fdfaf5; --bd:#d8cebf; --ink:#241c15; --hdr:#5d4037; --muted:#9a8c80;
    --burg:#7c3a2a; --sage:#8a9e88; --sage-d:#5a6e58; --sage-l:#e9ede6; --gold:#a8842c;
    --pink:#f5e2da; --pink-b:#e8c8bc; --pink-h:#efd5ca; --pink-l:#fbf0eb;
    --slate:#6A89A7; --slate-d:#55708c; --sel:#f3ede2; --dash:#c9bca8;
    height:100%; overflow-y:auto; background:var(--ground); color:var(--ink); font-family:${FONT_SANS}; }
  .pkgshow .page { max-width:1280px; margin:0 auto; padding:34px 40px 90px; }
  /* header — Queries Hub idiom: Playfair on the ground, no card */
  .pkgshow .crumb { font-family:${FONT_MONO}; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#a4937f; }
  .pkgshow .hubrow { display:flex; align-items:baseline; gap:16px; margin-top:8px; }
  .pkgshow .hubrow h1 { font-family:${FONT_SERIF}; font-size:46px; font-weight:800; letter-spacing:-.8px; color:var(--ink); line-height:1; }
  .pkgshow .propill { display:inline-flex; align-items:center; gap:6px; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.1em; background:#e7edf3; color:var(--slate-d); border:1px solid #cfdae4; border-radius:8px; padding:5px 10px; transform:translateY(-6px); }
  .pkgshow .mschip { margin-left:auto; display:inline-flex; align-items:center; gap:9px; background:var(--card); border:1px solid var(--bd); border-radius:10px; padding:10px 16px; font-weight:600; font-size:13.5px; color:var(--hdr); align-self:center; }

  /* ===== hero ===== */
  .pkgshow .hero { display:flex; align-items:center; gap:44px; margin-top:44px; }
  .pkgshow .hcopy { flex:0 0 380px; min-width:0; }
  .pkgshow .hcopy h2 { font-family:${FONT_SERIF}; font-size:44px; font-weight:800; line-height:1.06; letter-spacing:-.8px; }
  .pkgshow .hcopy h2 em { font-style:italic; color:var(--burg); }
  .pkgshow .hcopy .hl { font-size:14.5px; color:#6a594d; line-height:1.65; margin-top:16px; }
  .pkgshow .ctarow { display:flex; align-items:center; gap:13px; margin-top:26px; flex-wrap:wrap; }
  .pkgshow .cta-pro { font-family:${FONT_SERIF}; font-size:17px; font-weight:700; color:#fff; background:var(--slate); border:1px solid var(--slate-d); border-radius:12px; padding:14px 28px; cursor:pointer; box-shadow:0 8px 22px rgba(85,112,140,.28); }
  .pkgshow .cta-pro:hover { background:var(--slate-d); }
  .pkgshow .cta-tour { font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--burg); background:var(--card); border:1px solid var(--bd); border-radius:10px; padding:13px 17px; cursor:pointer; }
  .pkgshow .cta-tour:hover { background:var(--sel); }
  .pkgshow .trust { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.08em; text-transform:uppercase; color:#b3a291; margin-top:16px; }

  /* ===== the living demo ===== */
  .pkgshow .demo { position:relative; flex:1; min-width:0; height:580px; }
  .pkgshow .dwin { position:absolute; background:var(--card); border:1px solid var(--bd); border-radius:13px; box-shadow:0 12px 30px rgba(58,28,20,.11); overflow:hidden; }
  .pkgshow .dhead { font-family:${FONT_SERIF}; font-size:16px; font-weight:700; color:var(--hdr); background:linear-gradient(135deg,#ece5d8,#e5ddcd); border-bottom:1px solid var(--bd); padding:10px 15px; white-space:nowrap; display:flex; align-items:center; gap:9px; }
  .pkgshow .d-pal { left:0; top:0; width:214px; height:580px; z-index:3; }
  .pkgshow .pchip { display:flex; align-items:center; gap:8px; margin:7px 10px 0; background:var(--card); border:1px solid var(--bd); border-radius:8px; padding:6px 9px; }
  .pkgshow .pchip .g { width:19px; height:19px; border-radius:6px; background:var(--sel); color:var(--burg); display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; }
  .pkgshow .pchip .n { font-family:${FONT_SERIF}; font-size:11.5px; font-weight:600; line-height:1.05; }
  .pkgshow .pchip.nw { border-color:var(--slate); opacity:0; animation:pswX 24s linear infinite; }
  .pkgshow .d-exp { left:300px; top:24px; width:340px; z-index:9; animation:pswExpFade 24s linear infinite; }
  .pkgshow .d-exp .dhead { background:#e9e5df; color:#494439; }
  .pkgshow .d-exp .dots { display:flex; gap:5px; }
  .pkgshow .d-exp .dots i { width:8px; height:8px; border-radius:50%; background:#d5cfc6; }
  .pkgshow .fgrid { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; padding:13px; }
  .pkgshow .fdoc { display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px 4px; border-radius:8px; }
  .pkgshow .fdoc.hot { background:#eef2f6; outline:1.4px dashed var(--slate); }
  .pkgshow .fdoc .ic { width:32px; height:40px; background:#fff; border:1.4px solid var(--slate); border-radius:4px; position:relative; display:flex; align-items:center; justify-content:center; font-family:${FONT_MONO}; font-size:8px; font-weight:600; color:var(--slate-d); }
  .pkgshow .fdoc .ic::before { content:''; position:absolute; top:-1.4px; right:-1.4px; width:10px; height:10px; background:var(--ground); border-left:1.4px solid var(--slate); border-bottom:1.4px solid var(--slate); border-radius:0 0 0 4px; }
  .pkgshow .fdoc .fn { font-family:${FONT_MONO}; font-size:6.5px; color:#5d5247; text-align:center; line-height:1.35; }
  .pkgshow .mpkg { position:absolute; width:168px; background:var(--card); border:1px solid var(--bd); border-radius:10px; overflow:hidden; box-shadow:0 8px 20px rgba(58,28,20,.09); opacity:0; animation:pswX 24s ease infinite; }
  .pkgshow .mpkg .mh { font-family:${FONT_SERIF}; font-size:13px; font-weight:700; color:var(--hdr); border-bottom:1px solid var(--bd); padding:8px 12px; white-space:nowrap; }
  .pkgshow .mpkg.hcap .mh { background:linear-gradient(135deg,#ece5d8,#e5ddcd); }
  .pkgshow .mpkg.hpink .mh { background:var(--pink); }
  .pkgshow .mpkg.hsage .mh { background:var(--sage-l); }
  .pkgshow .mpkg .pips { padding:8px 12px 10px; display:flex; flex-direction:column; gap:6px; }
  .pkgshow .pip { display:flex; align-items:center; gap:7px; font-family:${FONT_MONO}; font-size:6.8px; color:var(--muted); }
  .pkgshow .pip .dot { width:9px; height:9px; border-radius:50%; border:1.4px dashed var(--dash); flex-shrink:0; position:relative; }
  .pkgshow .pip .dot::after { content:''; position:absolute; inset:-1.4px; border-radius:50%; background:var(--burg); opacity:0; animation:pswX 24s linear infinite; animation-name:inherit; }
  .pkgshow .pip .pn { opacity:.5; animation:pswX 24s linear infinite; animation-name:inherit; }
  .pkgshow .pip .dot.still::after { display:none; }
  .pkgshow .pip .dot.still + .pn { animation:none; opacity:.5; }
  .pkgshow .ghost { position:absolute; z-index:12; display:flex; align-items:center; gap:7px; background:var(--card); border:1px solid var(--burg); border-radius:8px; padding:7px 9px; box-shadow:0 12px 26px rgba(124,58,42,.22); opacity:0; pointer-events:none; animation:pswX 24s ease-in-out infinite; }
  .pkgshow .ghost .g { width:18px; height:18px; border-radius:6px; background:var(--pink); color:var(--burg); display:flex; align-items:center; justify-content:center; font-size:9px; }
  .pkgshow .ghost .n { font-family:${FONT_SERIF}; font-size:11px; font-weight:600; white-space:nowrap; }
  .pkgshow .ghost.file { border-color:var(--slate); box-shadow:0 12px 26px rgba(85,112,140,.25); }
  .pkgshow .ghost.file .g { background:#e7edf3; color:var(--slate-d); border-radius:4px; font-size:8px; font-family:${FONT_MONO}; font-weight:600; }
  .pkgshow .d-dash { left:230px; top:296px; width:532px; height:254px; z-index:4; overflow:visible; animation:pswBreath 24s ease infinite; }
  @keyframes pswBreath { 0%,52%{box-shadow:0 12px 30px rgba(58,28,20,.11);} 62%{box-shadow:0 16px 42px rgba(58,28,20,.2);} 70%{box-shadow:0 13px 34px rgba(58,28,20,.14);} 78%{box-shadow:0 16px 42px rgba(58,28,20,.2);} 84%,100%{box-shadow:0 12px 30px rgba(58,28,20,.11);} }
  .pkgshow .d-dash .dhead { border-radius:12px 12px 0 0; }
  .pkgshow .d-dash .ct { margin-left:auto; font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); opacity:0; animation:pswCtIn 24s linear infinite; }
  @keyframes pswCtIn { 0%,51%{opacity:0;} 53%,80%{opacity:1;} 83%,100%{opacity:0;} }
  .pkgshow .dbody { position:relative; padding:14px 20px 0; height:190px; }
  .pkgshow .cogbox { position:absolute; right:-24px; top:-26px; z-index:8; }
  .pkgshow .cog { position:absolute; transform-origin:center; opacity:0; display:inline-flex; }
  .pkgshow .cog.big { color:var(--burg); animation:pswSpinA 24s linear infinite; }
  .pkgshow .cog.mid { left:32px; top:28px; color:var(--sage-d); animation:pswSpinB 24s linear infinite; }
  .pkgshow .cog.sml { left:-15px; top:35px; color:var(--gold); animation:pswSpinC 24s linear infinite; }
  @keyframes pswSpinA { 0%,51%{opacity:0;transform:rotate(0);} 52.5%{opacity:1;} 81%{opacity:1;transform:rotate(660deg);} 84%,100%{opacity:0;transform:rotate(700deg);} }
  @keyframes pswSpinB { 0%,51%{opacity:0;transform:rotate(0);} 52.5%{opacity:1;} 81%{opacity:1;transform:rotate(-500deg);} 84%,100%{opacity:0;} }
  @keyframes pswSpinC { 0%,51.5%{opacity:0;transform:rotate(15deg);} 53%{opacity:1;} 81%{opacity:1;transform:rotate(890deg);} 84%,100%{opacity:0;} }
  .pkgshow .in-svg { width:100%; height:132px; }
  .pkgshow .in-grid line { stroke:#efe6d8; stroke-width:1; }
  .pkgshow .in-base { stroke:var(--pink-b); stroke-width:2; fill:none; stroke-linecap:round; }
  .pkgshow .in-line { stroke:var(--burg); stroke-width:2.3; fill:none; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:540; stroke-dashoffset:540; animation:pswInkDraw 24s ease-in-out infinite; }
  @keyframes pswInkDraw { 0%,53%{stroke-dashoffset:540;} 79%,96%{stroke-dashoffset:0;} 99%,100%{stroke-dashoffset:540;} }
  /* top/left pin the nib's box to the chart svg's content origin (20,14 inside .dbody) so the
     path() coordinates — authored in svg space — land the nib ON the ink line. The bare ref detaches
     here in current Chrome (offset-path origin = the positioned box, verified by loading the ref):
     a flagged fix-to-intent, not a reinterpretation. offset-path + offset-rotate kept verbatim. */
  .pkgshow .nib { position:absolute; top:14px; left:20px; width:24px; height:24px; color:var(--hdr); z-index:6; offset-path:path('M20 112 C 80 104, 110 66, 160 74 S 260 38, 310 46 S 410 10, 468 18'); offset-rotate:38deg; animation:pswNibRide 24s ease-in-out infinite; opacity:0; }
  @keyframes pswNibRide { 0%,53%{offset-distance:0%;opacity:0;} 54.5%{opacity:1;} 78%{opacity:1;offset-distance:100%;} 81%,100%{opacity:0;offset-distance:100%;} }
  .pkgshow .blm { position:absolute; width:9px; height:9px; border-radius:50%; background:var(--pink-b); border:1.6px solid var(--burg); transform:scale(0); z-index:5; }
  .pkgshow .wpop { position:absolute; z-index:9; display:flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--bd); border-radius:8px; padding:6px 9px; box-shadow:0 10px 24px rgba(58,28,20,.16); opacity:0; pointer-events:none; }
  .pkgshow .wpop .g { width:16px; height:16px; border-radius:5px; background:var(--sel); color:var(--burg); display:flex; align-items:center; justify-content:center; font-size:8px; flex-shrink:0; }
  .pkgshow .wpop .n { font-family:${FONT_SERIF}; font-size:10.5px; font-weight:600; white-space:nowrap; }
  .pkgshow .stamp { position:absolute; right:24px; bottom:14px; width:74px; height:74px; border-radius:50%; border:2.5px solid var(--sage-d); color:var(--sage-d); background:rgba(233,237,230,.55); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; transform:rotate(-11deg) scale(2.1); opacity:0; animation:pswStampIn 24s cubic-bezier(.2,1.6,.4,1) infinite; z-index:10; }
  .pkgshow .stamp .tk { font-size:23px; line-height:1; }
  .pkgshow .stamp .tx { font-family:${FONT_MONO}; font-size:5px; letter-spacing:.14em; }
  @keyframes pswStampIn { 0%,81%{opacity:0;transform:rotate(-11deg) scale(2.1);} 84.5%,96%{opacity:1;transform:rotate(-11deg) scale(1);} 99%,100%{opacity:0;} }
  .pkgshow .rec { position:absolute; left:230px; bottom:-8px; width:532px; z-index:14; background:var(--card); border:1px solid var(--sage); border-radius:12px; box-shadow:0 16px 38px rgba(90,110,88,.22); padding:12px 16px; display:flex; align-items:center; gap:12px; opacity:0; transform:translateY(16px); animation:pswRecIn 24s ease infinite; }
  .pkgshow .rec .rst { color:var(--gold); font-size:17px; flex-shrink:0; }
  .pkgshow .rec .rt { font-size:11px; line-height:1.55; color:var(--ink); }
  .pkgshow .rec .rt b { color:var(--ink); font-weight:600; }
  .pkgshow .rec .rbtn { margin-left:auto; flex-shrink:0; font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.05em; text-transform:uppercase; background:var(--pink); border:1px solid var(--pink-b); color:var(--ink); border-radius:8px; padding:9px 12px; white-space:nowrap; cursor:pointer; }
  @keyframes pswRecIn { 0%,86%{opacity:0;transform:translateY(16px);} 89%,97%{opacity:1;transform:translateY(0);} 99.5%,100%{opacity:0;transform:translateY(16px);} }
  @keyframes pswGf1 { 0%,3%{opacity:0;transform:translate(0,0);} 4.2%{opacity:1;} 8%{opacity:1;transform:translate(-308px,80px) rotate(-2deg);} 9.2%,100%{opacity:0;transform:translate(-308px,80px);} }
  @keyframes pswGf2 { 0%,7%{opacity:0;transform:translate(0,0);} 8.2%{opacity:1;} 12%{opacity:1;transform:translate(-422px,111px) rotate(-2deg);} 13.2%,100%{opacity:0;transform:translate(-422px,111px);} }
  @keyframes pswGf3 { 0%,11%{opacity:0;transform:translate(0,0);} 12.2%{opacity:1;} 16%{opacity:1;transform:translate(-308px,68px) rotate(-2deg);} 17.2%,100%{opacity:0;transform:translate(-308px,68px);} }
  @keyframes pswCi1 { 0%,8%{opacity:0;transform:scale(.85);} 9%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswCi2 { 0%,12%{opacity:0;transform:scale(.85);} 13%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswCi3 { 0%,16%{opacity:0;transform:scale(.85);} 17%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswExpFade { 0%,17%{opacity:1;} 20.5%,96%{opacity:0;} 99.5%,100%{opacity:1;} }
  @keyframes pswPk1 { 0%,18%{opacity:0;transform:translateY(8px);} 19.5%,96%{opacity:1;transform:translateY(0);} 99%,100%{opacity:0;} }
  @keyframes pswPk2 { 0%,19%{opacity:0;transform:translateY(8px);} 20.5%,96%{opacity:1;transform:translateY(0);} 99%,100%{opacity:0;} }
  @keyframes pswPk3 { 0%,20%{opacity:0;transform:translateY(8px);} 21.5%,96%{opacity:1;transform:translateY(0);} 99%,100%{opacity:0;} }
  @keyframes pswPk4 { 0%,21%{opacity:0;transform:translateY(8px);} 22.5%,96%{opacity:1;transform:translateY(0);} 99%,100%{opacity:0;} }
  @keyframes pswPk5 { 0%,22%{opacity:0;transform:translateY(8px);} 23.5%,96%{opacity:1;transform:translateY(0);} 99%,100%{opacity:0;} }
  @keyframes pswPk6 { 0%,23%{opacity:0;transform:translateY(8px);} 24.5%,96%{opacity:1;transform:translateY(0);} 99%,100%{opacity:0;} }
  @keyframes pswM1 { 0%,26%{opacity:0;transform:translate(0,0);} 26.9%{opacity:1;} 28.6%{opacity:1;transform:translate(230px,16px) rotate(-2deg);} 29.5%,100%{opacity:0;transform:translate(230px,16px);} }
  @keyframes pswM2 { 0%,29%{opacity:0;transform:translate(0,0);} 29.9%{opacity:1;} 31.6%{opacity:1;transform:translate(412px,123px) rotate(2deg);} 32.5%,100%{opacity:0;transform:translate(412px,123px);} }
  @keyframes pswM3 { 0%,32%{opacity:0;transform:translate(0,0);} 32.9%{opacity:1;} 34.6%{opacity:1;transform:translate(412px,-46px) rotate(-2deg);} 35.5%,100%{opacity:0;transform:translate(412px,-46px);} }
  @keyframes pswM4 { 0%,35%{opacity:0;transform:translate(0,0);} 35.9%{opacity:1;} 37.6%{opacity:1;transform:translate(230px,-86px) rotate(2deg);} 38.5%,100%{opacity:0;transform:translate(230px,-86px);} }
  @keyframes pswM5 { 0%,38%{opacity:0;transform:translate(0,0);} 38.9%{opacity:1;} 40.6%{opacity:1;transform:translate(594px,-108px) rotate(-2deg);} 41.5%,100%{opacity:0;transform:translate(594px,-108px);} }
  @keyframes pswM6 { 0%,41%{opacity:0;transform:translate(0,0);} 41.9%{opacity:1;} 43.6%{opacity:1;transform:translate(230px,-1px) rotate(2deg);} 44.5%,100%{opacity:0;transform:translate(230px,-1px);} }
  @keyframes pswM7 { 0%,44%{opacity:0;transform:translate(0,0);} 44.9%{opacity:1;} 46.6%{opacity:1;transform:translate(594px,-32px) rotate(-2deg);} 47.5%,100%{opacity:0;transform:translate(594px,-32px);} }
  @keyframes pswM8 { 0%,47%{opacity:0;transform:translate(0,0);} 47.9%{opacity:1;} 49.6%{opacity:1;transform:translate(412px,-41px) rotate(2deg);} 50.5%,100%{opacity:0;transform:translate(412px,-41px);} }
  @keyframes pswDtA1 { 0%,28.6%{opacity:0;transform:scale(.3);} 29.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlA1 { 0%,28.6%{opacity:.5;} 29.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtE1 { 0%,31.6%{opacity:0;transform:scale(.3);} 32.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlE1 { 0%,31.6%{opacity:.5;} 32.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtB1 { 0%,34.6%{opacity:0;transform:scale(.3);} 35.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlB1 { 0%,34.6%{opacity:.5;} 35.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtA2 { 0%,37.6%{opacity:0;transform:scale(.3);} 38.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlA2 { 0%,37.6%{opacity:.5;} 38.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtC1 { 0%,40.6%{opacity:0;transform:scale(.3);} 41.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlC1 { 0%,40.6%{opacity:.5;} 41.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtD1 { 0%,43.6%{opacity:0;transform:scale(.3);} 44.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlD1 { 0%,43.6%{opacity:.5;} 44.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtF1 { 0%,46.6%{opacity:0;transform:scale(.3);} 47.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlF1 { 0%,46.6%{opacity:.5;} 47.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  @keyframes pswDtE2 { 0%,49.6%{opacity:0;transform:scale(.3);} 50.6%,95%{opacity:1;transform:scale(1);} 98%,100%{opacity:0;} }
  @keyframes pswPlE2 { 0%,49.6%{opacity:.5;} 50.6%,95%{opacity:1;} 98%,100%{opacity:.5;} }
  /* "The Works" pops (materials/packages pulled into the panel) + ink-line data blooms */
  .pkgshow .wpop.w1 { animation:pswWpW1 24s cubic-bezier(.3,1.4,.5,1) infinite; }
  @keyframes pswWpW1 { 0%,54%{opacity:0;transform:scale(.3) rotate(-5deg);} 55.2%{opacity:1;transform:scale(1.06) rotate(1.5deg);} 56%{transform:scale(1) rotate(0);} 58.2%{opacity:1;transform:scale(1);} 60.5%,100%{opacity:0;transform:translate(110px,70px) scale(.12) rotate(6deg);} }
  .pkgshow .wpop.w2 { animation:pswWpW2 24s cubic-bezier(.3,1.4,.5,1) infinite; }
  @keyframes pswWpW2 { 0%,58%{opacity:0;transform:scale(.3) rotate(-5deg);} 59.2%{opacity:1;transform:scale(1.06) rotate(1.5deg);} 60%{transform:scale(1) rotate(0);} 62.2%{opacity:1;transform:scale(1);} 64.5%,100%{opacity:0;transform:translate(-120px,10px) scale(.12) rotate(6deg);} }
  .pkgshow .wpop.w3 { animation:pswWpW3 24s cubic-bezier(.3,1.4,.5,1) infinite; }
  @keyframes pswWpW3 { 0%,62%{opacity:0;transform:scale(.3) rotate(-5deg);} 63.2%{opacity:1;transform:scale(1.06) rotate(1.5deg);} 64%{transform:scale(1) rotate(0);} 66.2%{opacity:1;transform:scale(1);} 68.5%,100%{opacity:0;transform:translate(130px,-40px) scale(.12) rotate(6deg);} }
  .pkgshow .wpop.w4 { animation:pswWpW4 24s cubic-bezier(.3,1.4,.5,1) infinite; }
  @keyframes pswWpW4 { 0%,66%{opacity:0;transform:scale(.3) rotate(-5deg);} 67.2%{opacity:1;transform:scale(1.06) rotate(1.5deg);} 68%{transform:scale(1) rotate(0);} 70.2%{opacity:1;transform:scale(1);} 72.5%,100%{opacity:0;transform:translate(50px,90px) scale(.12) rotate(6deg);} }
  .pkgshow .wpop.w5 { animation:pswWpW5 24s cubic-bezier(.3,1.4,.5,1) infinite; }
  @keyframes pswWpW5 { 0%,70%{opacity:0;transform:scale(.3) rotate(-5deg);} 71.2%{opacity:1;transform:scale(1.06) rotate(1.5deg);} 72%{transform:scale(1) rotate(0);} 74.2%{opacity:1;transform:scale(1);} 76.5%,100%{opacity:0;transform:translate(-110px,-30px) scale(.12) rotate(6deg);} }
  .pkgshow .wpop.w6 { animation:pswWpW6 24s cubic-bezier(.3,1.4,.5,1) infinite; }
  @keyframes pswWpW6 { 0%,74%{opacity:0;transform:scale(.3) rotate(-5deg);} 75.2%{opacity:1;transform:scale(1.06) rotate(1.5deg);} 76%{transform:scale(1) rotate(0);} 78.2%{opacity:1;transform:scale(1);} 80.5%,100%{opacity:0;transform:translate(-30px,-60px) scale(.12) rotate(6deg);} }
  .pkgshow .blm.wb1 { animation:pswWblWb1 24s ease infinite; }
  @keyframes pswWblWb1 { 0%,55.5%{transform:scale(0);} 57.0%{transform:scale(1.55);} 58.0%,96%{transform:scale(1);} 99%,100%{transform:scale(0);} }
  .pkgshow .blm.wb2 { animation:pswWblWb2 24s ease infinite; }
  @keyframes pswWblWb2 { 0%,60%{transform:scale(0);} 61.5%{transform:scale(1.55);} 62.5%,96%{transform:scale(1);} 99%,100%{transform:scale(0);} }
  .pkgshow .blm.wb3 { animation:pswWblWb3 24s ease infinite; }
  @keyframes pswWblWb3 { 0%,65%{transform:scale(0);} 66.5%{transform:scale(1.55);} 67.5%,96%{transform:scale(1);} 99%,100%{transform:scale(0);} }
  .pkgshow .blm.wb4 { animation:pswWblWb4 24s ease infinite; }
  @keyframes pswWblWb4 { 0%,70%{transform:scale(0);} 71.5%{transform:scale(1.55);} 72.5%,96%{transform:scale(1);} 99%,100%{transform:scale(0);} }
  .pkgshow .blm.wb5 { animation:pswWblWb5 24s ease infinite; }
  @keyframes pswWblWb5 { 0%,75%{transform:scale(0);} 76.5%{transform:scale(1.55);} 77.5%,96%{transform:scale(1);} 99%,100%{transform:scale(0);} }
  /* In-app fit (beyond the fixed-canvas ref, flagged): the demo's absolute stage spans 762px; inside
     the route's 1200 read cap the hero offers ~696px, so the demo scales down a notch; on genuinely
     narrow panes it hides and the hero is copy-only. The hero is an inline-size container for this. */
  .pkgshow .hero { container-type: inline-size; container-name: pswhero; }
  @container pswhero (max-width: 1150px) { .pkgshow .demo { transform: scale(.88); transform-origin: left center; } }
  @container pswhero (max-width: 900px) { .pkgshow .demo { display: none; } }
  @media (prefers-reduced-motion: reduce) {
    .pkgshow .demo * { animation:none!important; }
    .pkgshow .demo .wpop, .pkgshow .demo .nib, .pkgshow .demo .cogbox { display:none!important; }
    .pkgshow .demo .in-line { stroke-dashoffset:0!important; }
    .pkgshow .demo .stamp { opacity:1!important; transform:rotate(-11deg) scale(1)!important; }
    .pkgshow .demo .blm { transform:scale(1)!important; }
    .pkgshow .demo .d-dash .ct { display:none!important; }
    .pkgshow .demo .d-exp, .pkgshow .demo .ghost { display:none!important; }
    .pkgshow .demo .pchip.nw, .pkgshow .demo .mpkg, .pkgshow .demo .rec { opacity:1!important; transform:none!important; }
    .pkgshow .demo .pip .dot:not(.still)::after { opacity:1!important; animation:none!important; }
    .pkgshow .demo .pip .pn { opacity:1!important; }
  }
`;

const lockGlyph = (
  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="11" width="15" height="9.5" rx="2" /><path d="M8 11V7.5a4 4 0 018 0V11" />
  </svg>
);
const bookGlyph = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h11l3 3v13H5z" /><path d="M8 4v6l2-1.5L12 10V4" />
  </svg>
);
const cog = (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size >= 40 ? 1.6 : size >= 28 ? 1.8 : 2}><circle cx="12" cy="12" r={size >= 40 ? 3.4 : size >= 28 ? 3.2 : 3} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></svg>
);
const nibGlyph = (
  <svg className="nib" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" aria-hidden="true"><path d="M4 20l2.5-7L17 2.5a2.1 2.1 0 013 3L9.5 16z" /><path d="M13 6l4.5 4.5" /><circle cx="7.6" cy="15.9" r="1" fill="currentColor" /></svg>
);
const recText = (
  <span className="rt">Your <b>character-led</b> package has a significantly higher response rate than other packages and has resulted in <b>2 partial requests</b>. Make this your active package for future queries?</span>
);

export const PackageShowcase: React.FC<PackageShowcaseProps> = ({ manuscriptTitle, onUnlockPro, onTryExample }) => {
  return (
    <div className="pkgshow">
      <style>{SHOWCASE_CSS}</style>
      <div className="page">
        {/* header: Queries Hub idiom — bare on the ground, no card */}
        <div className="crumb">Scriptally / Manuscripts / Submission Packages</div>
        <div className="hubrow">
          <h1>Package Workshop</h1>
          <span className="propill">{lockGlyph} PRO</span>
          <span className="mschip">{bookGlyph}{manuscriptTitle}</span>
        </div>

        {/* hero */}
        <div className="hero">
          <div className="hcopy">
            <h2>Find out what<br /><em>wins requests</em></h2>
            <div className="hl">Build different versions of your submission from the same materials. Send them. ScriptAlly tracks which one gets agents asking for the full manuscript.</div>
            <div className="ctarow">
              <button type="button" className="cta-pro" onClick={onUnlockPro}>Unlock with Pro</button>
              <button type="button" className="cta-tour" onClick={onTryExample}>Try it with example data →</button>
            </div>
            <div className="trust">Built for UK querying · Your materials stay yours</div>
          </div>
          <div className="demo" aria-label="Animated demo: dragging Word documents in, building six packages, analytics crunching, and a recommendation appearing">
            {/* materials palette (3 chips arrive by animation) */}
            <div className="dwin d-pal">
              <div className="dhead">Your materials</div>
              <div className="pchip"><span className="g">?</span><span className="n">Character-led letter</span></div>
              <div className="pchip"><span className="g">?</span><span className="n">Comp-led letter</span></div>
              <div className="pchip"><span className="g">≡</span><span className="n">One-page synopsis</span></div>
              <div className="pchip"><span className="g">≡</span><span className="n">Full synopsis · 2pp</span></div>
              <div className="pchip nw" style={{ animationName: "pswCi1" }}><span className="g">≡</span><span className="n">Character-led synopsis</span></div>
              <div className="pchip nw" style={{ animationName: "pswCi2" }}><span className="g">▤</span><span className="n">Chapters 1–3</span></div>
              <div className="pchip nw" style={{ animationName: "pswCi3" }}><span className="g">▤</span><span className="n">Prologue + Ch 1</span></div>
              <div className="pchip"><span className="g">▤</span><span className="n">First 50 pages</span></div>
              <div className="pchip"><span className="g">≡</span><span className="n">Bio &amp; credits</span></div>
            </div>
            {/* six packages revealed as the explorer fades */}
            <div className="mpkg hcap" style={{ left: 230, top: 10, animationName: "pswPk1" }}><div className="mh">Character-led · v2</div><div className="pips"><div className="pip"><span className="dot" style={{ animationName: "pswDtA1" }} /><span className="pn" style={{ animationName: "pswPlA1" }}>Character-led letter</span></div><div className="pip"><span className="dot" style={{ animationName: "pswDtA2" }} /><span className="pn" style={{ animationName: "pswPlA2" }}>Character-led synopsis</span></div></div></div>
            <div className="mpkg hpink" style={{ left: 412, top: 10, animationName: "pswPk2" }}><div className="mh">Comp-led · v1</div><div className="pips"><div className="pip"><span className="dot" style={{ animationName: "pswDtB1" }} /><span className="pn" style={{ animationName: "pswPlB1" }}>One-page synopsis</span></div><div className="pip"><span className="dot still" /><span className="pn">Comp-led letter</span></div></div></div>
            <div className="mpkg hsage" style={{ left: 594, top: 10, animationName: "pswPk3" }}><div className="mh">Hartley bespoke</div><div className="pips"><div className="pip"><span className="dot" style={{ animationName: "pswDtC1" }} /><span className="pn" style={{ animationName: "pswPlC1" }}>Character-led synopsis</span></div><div className="pip"><span className="dot still" /><span className="pn">Chapters 1–3</span></div></div></div>
            <div className="mpkg hpink" style={{ left: 230, top: 148, animationName: "pswPk4" }}><div className="mh">Short &amp; sharp</div><div className="pips"><div className="pip"><span className="dot" style={{ animationName: "pswDtD1" }} /><span className="pn" style={{ animationName: "pswPlD1" }}>Chapters 1–3</span></div><div className="pip"><span className="dot still" /><span className="pn">One-page synopsis</span></div></div></div>
            <div className="mpkg hsage" style={{ left: 412, top: 148, animationName: "pswPk5" }}><div className="mh">First attempt</div><div className="pips"><div className="pip"><span className="dot" style={{ animationName: "pswDtE1" }} /><span className="pn" style={{ animationName: "pswPlE1" }}>Comp-led letter</span></div><div className="pip"><span className="dot" style={{ animationName: "pswDtE2" }} /><span className="pn" style={{ animationName: "pswPlE2" }}>First 50 pages</span></div></div></div>
            <div className="mpkg hcap" style={{ left: 594, top: 148, animationName: "pswPk6" }}><div className="mh">Prologue-first</div><div className="pips"><div className="pip"><span className="dot" style={{ animationName: "pswDtF1" }} /><span className="pn" style={{ animationName: "pswPlF1" }}>Prologue + Ch 1</span></div><div className="pip"><span className="dot still" /><span className="pn">Bio &amp; credits</span></div></div></div>
            {/* file explorer (fades after dragging docs in) */}
            <div className="dwin d-exp">
              <div className="dhead"><span className="dots"><i /><i /><i /></span>Documents</div>
              <div className="fgrid">
                <div className="fdoc hot"><span className="ic">W</span><span className="fn">MDO_Synopsis_char.docx</span></div>
                <div className="fdoc hot"><span className="ic">W</span><span className="fn">MDO_Pages_1-3.docx</span></div>
                <div className="fdoc"><span className="ic">W</span><span className="fn">MDO_Full_MS.docx</span></div>
                <div className="fdoc hot"><span className="ic">W</span><span className="fn">MDO_Prologue.docx</span></div>
                <div className="fdoc"><span className="ic">W</span><span className="fn">MDO_Notes_old.docx</span></div>
                <div className="fdoc"><span className="ic">W</span><span className="fn">Agent_list.docx</span></div>
              </div>
            </div>
            {/* file ghost-flights */}
            <div className="ghost file" style={{ left: 320, top: 84, animationName: "pswGf1" }}><span className="g">W</span><span className="n">MDO_Synopsis_char.docx</span></div>
            <div className="ghost file" style={{ left: 434, top: 84, animationName: "pswGf2" }}><span className="g">W</span><span className="n">MDO_Pages_1-3.docx</span></div>
            <div className="ghost file" style={{ left: 320, top: 158, animationName: "pswGf3" }}><span className="g">W</span><span className="n">MDO_Prologue.docx</span></div>
            {/* material ghost-flights fanning into the packages */}
            <div className="ghost" style={{ left: 12, top: 40, animationName: "pswM1" }}><span className="g">?</span><span className="n">Character-led letter</span></div>
            <div className="ghost" style={{ left: 12, top: 71, animationName: "pswM2" }}><span className="g">?</span><span className="n">Comp-led letter</span></div>
            <div className="ghost" style={{ left: 12, top: 102, animationName: "pswM3" }}><span className="g">≡</span><span className="n">One-page synopsis</span></div>
            <div className="ghost" style={{ left: 12, top: 164, animationName: "pswM4" }}><span className="g">≡</span><span className="n">Character-led synopsis</span></div>
            <div className="ghost" style={{ left: 12, top: 164, animationName: "pswM5" }}><span className="g">≡</span><span className="n">Character-led synopsis</span></div>
            <div className="ghost" style={{ left: 12, top: 195, animationName: "pswM6" }}><span className="g">▤</span><span className="n">Chapters 1–3</span></div>
            <div className="ghost" style={{ left: 12, top: 226, animationName: "pswM7" }}><span className="g">▤</span><span className="n">Prologue + Ch 1</span></div>
            <div className="ghost" style={{ left: 12, top: 257, animationName: "pswM8" }}><span className="g">▤</span><span className="n">First 50 pages</span></div>
            {/* analytics — "The Works" */}
            <div className="dwin d-dash">
              <div className="dhead">Package analytics<span className="ct">CRUNCHING YOUR RESULTS…</span></div>
              <div className="dbody">
                <svg className="in-svg" viewBox="0 0 492 132" fill="none">
                  <g className="in-grid"><line x1="20" y1="20" x2="472" y2="20" /><line x1="20" y1="52" x2="472" y2="52" /><line x1="20" y1="84" x2="472" y2="84" /><line x1="20" y1="116" x2="472" y2="116" /></g>
                  <path className="in-base" d="M20 120 C 120 118, 300 114, 468 108" />
                  <path className="in-line" d="M20 112 C 80 104, 110 66, 160 74 S 260 38, 310 46 S 410 10, 468 18" />
                </svg>
                <span className="blm wb1" style={{ left: 36, top: 66 }} />
                <span className="blm wb2" style={{ left: 152, top: 86 }} />
                <span className="blm wb3" style={{ left: 256, top: 58 }} />
                <span className="blm wb4" style={{ left: 352, top: 56 }} />
                <span className="blm wb5" style={{ left: 452, top: 30 }} />
                {nibGlyph}
                <div className="stamp"><span className="tk">✓</span><span className="tx">WINNER FOUND</span></div>
              </div>
              <div className="cogbox">
                <span className="cog big">{cog(46)}</span>
                <span className="cog mid">{cog(30)}</span>
                <span className="cog sml">{cog(21)}</span>
              </div>
              <div className="wpop w1" style={{ left: -54, top: -18 }}><span className="g">?</span><span className="n">Character-led letter</span></div>
              <div className="wpop w2" style={{ right: -44, top: 60 }}><span className="g">≡</span><span className="n">One-page synopsis</span></div>
              <div className="wpop w3" style={{ left: -58, top: 130 }}><span className="g">▤</span><span className="n">Chapters 1–3</span></div>
              <div className="wpop w4" style={{ left: 150, top: -30 }}><span className="g">◫</span><span className="n">Comp-led · v1</span></div>
              <div className="wpop w5" style={{ right: -48, bottom: 26 }}><span className="g">≡</span><span className="n">Character-led synopsis</span></div>
              <div className="wpop w6" style={{ right: 150, bottom: -26 }}><span className="g">◫</span><span className="n">Character-led · v2</span></div>
            </div>
            {/* recommendation card */}
            <div className="rec"><span className="rst">★</span>{recText}<button type="button" className="rbtn">Make active</button></div>
          </div>
        </div>
      </div>
    </div>
  );
};
