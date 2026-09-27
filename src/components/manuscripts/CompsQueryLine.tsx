/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Your query line" (comps v2; the mock's `.qcard`). The sentence composed from the comps switched
 * on below, in list order, in the format the writer picks — and Copy line.
 *
 * ⚠️ THE FORMAT IS LOCAL STATE, NOT ROUTED AND NOT PERSISTED: a way of looking at the same comps,
 * never a place in the app. It keeps the existing `QueryFormat` ("readers" | "meets").
 *
 * ⚠️ `example` IS THE EMPTY STATE'S PICTURE OF THE CARD — a fixed line, faded and inert, with its
 * controls still drawn (the mock's) but unable to take a press or focus.
 */
import React, { useState } from "react";
import { CompTitle } from "../../types";
import { IN_QUERY_LABEL, QueryFormat, queryLine } from "../../lib/compsPage";

export interface CompsQueryLineProps {
  comps: CompTitle[];
  msTitle: string;
  format: QueryFormat;
  onFormat: (f: QueryFormat) => void;
  example?: boolean;
}

export const CompsQueryLine: React.FC<CompsQueryLineProps> = ({ comps, msTitle, format, onFormat, example }) => {
  const [copied, setCopied] = useState(false);
  const q = example
    ? {
        kind: "line" as const,
        text: "",
        segments: [
          { text: msTitle, emphasis: "ms" as const }, { text: " will appeal to readers of " },
          { text: "The Tidewater Line", emphasis: "title" as const }, { text: " and " },
          { text: "Salt Road", emphasis: "title" as const }, { text: "." },
        ],
        caption: "Example · built from the comps you switch on",
      }
    : queryLine(comps, msTitle, format);

  const copy = async () => {
    if (q.kind !== "line" || example) return;
    try {
      await navigator.clipboard.writeText(q.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the button stays; nothing claims it copied */
    }
  };

  /* the empty prompt names the switch in bold — the label, verbatim, so it matches the control */
  const prompt = (text: string) => {
    const i = text.indexOf(IN_QUERY_LABEL);
    return i < 0 ? text : <>{text.slice(0, i)}<b>{IN_QUERY_LABEL}</b>{text.slice(i + IN_QUERY_LABEL.length)}</>;
  };

  const body = (
    <div className="cpv-qline" data-cpv={example ? undefined : "qline"} data-kind={q.kind} aria-live={example ? undefined : "polite"}>
      {q.kind === "line"
        ? q.segments.map((s, i) => (s.emphasis ? <i key={i}>{s.text}</i> : <React.Fragment key={i}>{s.text}</React.Fragment>))
        : prompt(q.prompt)}
    </div>
  );

  return (
    <section className="cpv-qcard" aria-label="Your query line" data-cpv={example ? "ex-line" : "qline-card"}
             aria-hidden={example ? true : undefined} inert={example ? true : undefined}>
      <div className="cpv-qh">
        <h2>Your query line</h2>
        <div className="cpv-seg" role="radiogroup" aria-label="Query line format">
          {(["readers", "meets"] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} data-fmt={f} onClick={() => onFormat(f)}>
              {f === "readers" ? "Readers of" : "A meets B"}
            </button>
          ))}
        </div>
      </div>
      {example ? <div className="cpv-ghost">{body}</div> : body}
      <div className="cpv-qbot">
        <span className="cpv-qcap" data-cpv={example ? undefined : "qcap"}>{q.caption}</span>
        <span className="cpv-qacts">
          <span className="cpv-copied" aria-live="polite">{copied ? "Copied" : ""}</span>
          <button type="button" className="cpv-btn cpv-btn--dark" data-cpv={example ? undefined : "copy"}
                  disabled={q.kind !== "line" || !!example} onClick={copy}>
            Copy line
          </button>
        </span>
      </div>
    </section>
  );
};
