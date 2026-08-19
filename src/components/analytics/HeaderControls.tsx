/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The two controls in the Analytics header: the range toggle and Export.
 *
 * ⚠️ NEITHER IS A BURGUNDY-FILLED BUTTON. The figures are what the page is for; a solid primary in
 * the header would outrank every number beneath it.
 */
import React from "react";
import { AnalyticsRange, RANGE_OPTIONS } from "../../lib/analytics";

/**
 * ⚠️ `aria-pressed` RATHER THAN A DISABLED "CURRENT" BUTTON. All three stay operable — pressing
 * the one already chosen is a harmless no-op — because a disabled control is skipped by keyboard
 * navigation, which would make the current range the one option a keyboard user cannot land on to
 * read.
 */
export const RangeToggle: React.FC<{
  value: AnalyticsRange;
  onChange: (r: AnalyticsRange) => void;
}> = ({ value, onChange }) => (
  <div className="an-range" role="group" aria-label="Date range">
    {RANGE_OPTIONS.map((o) => (
      <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

/**
 * ⚠️ IT RENDERS AND IT DOES NOTHING, AND IT SAYS SO. The header's shape is settled now, so the
 * control takes its place; producing the file it implies is its own piece of work. It is
 * `disabled` rather than silently inert — a button that looks live and swallows the click is the
 * worse of the two, and the title attribute states why.
 *
 * TODO(analytics-export): produce the export this button implies, and drop the disabled state
 * with it.
 */
export const ExportButton: React.FC = () => (
  <button type="button" className="an-btn" disabled title="Export is not wired up yet">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 v11" />
      <path d="M8 12 l4 4 4-4" />
      <path d="M5 19 h14" />
    </svg>
    Export
  </button>
);
