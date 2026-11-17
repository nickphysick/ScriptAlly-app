/**
 * Status marks v3 — the contact sheet: all twelve statuses from `StatusDot` at 12, 13, 16, 24 and 30, the Offer
 * outline (`reached={false}`), and two probe rows for SM3-5 (every mark under `tone="inherit"` inside a parent of
 * rgb(47, 74, 105), and every mark at the default tone). Rendered by the component itself, never redrawn.
 *
 *   npx tsx tests/e2e/statusMarksV3Sheet.tsx    → reports/status-marks-v3/sheet.html
 *
 * statusMarksV3.measure.ts (SM3_PHASE=after) loads the file, reads the probes' computed colours and screenshots the
 * sheet beside the reference's table.
 */
import React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../src/types";
import { StatusDot } from "../../src/components/StatusDot";

const SIZES = [12, 13, 16, 24, 30];
const ALL = Object.values(QueryStatus);

const Sheet = () => (
  <div id="sm3-sheet" style={{ background: "#fff", padding: 24, font: "14px Georgia, serif", color: "#1c130f", width: "max-content" }}>
    <table style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "6px 14px" }}>StatusDot, as built</th>
          {SIZES.map((s) => <th key={s} style={{ padding: "6px 14px", font: "13px 'Courier New', monospace" }}>{s}</th>)}
        </tr>
      </thead>
      <tbody>
        {ALL.map((st) => (
          <tr key={st} style={{ borderTop: "1px solid #efe9df" }}>
            <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600 }}>{st}</th>
            {SIZES.map((s) => <td key={s} style={{ textAlign: "center", padding: "8px 14px" }}><StatusDot status={st} overrideSize={s} /></td>)}
          </tr>
        ))}
        <tr style={{ borderTop: "1px solid #efe9df" }}>
          <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600 }}>Offer, reached=&#123;false&#125;</th>
          {SIZES.map((s) => <td key={s} style={{ textAlign: "center", padding: "8px 14px" }}><StatusDot status={QueryStatus.OFFER} overrideSize={s} reached={false} /></td>)}
        </tr>
      </tbody>
    </table>
    <p style={{ margin: "18px 0 6px" }}>tone=&quot;inherit&quot; inside a parent of rgb(47, 74, 105):</p>
    <div id="sm3-inherit" style={{ color: "rgb(47, 74, 105)", display: "flex", gap: 10 }}>
      {ALL.map((st) => <StatusDot key={st} status={st} overrideSize={24} tone="inherit" decorative />)}
    </div>
    <p style={{ margin: "18px 0 6px" }}>default tone, inside the same parent:</p>
    <div id="sm3-ink" style={{ color: "rgb(47, 74, 105)", display: "flex", gap: 10 }}>
      {ALL.map((st) => <StatusDot key={st} status={st} overrideSize={24} decorative />)}
    </div>
  </div>
);

mkdirSync("reports/status-marks-v3", { recursive: true });
writeFileSync("reports/status-marks-v3/sheet.html", `<!doctype html><meta charset="utf-8"><title>Status marks v3 contact sheet</title><body style="margin:0;background:#f2eee8">${renderToStaticMarkup(<Sheet />)}</body>\n`);
console.log("wrote reports/status-marks-v3/sheet.html");
