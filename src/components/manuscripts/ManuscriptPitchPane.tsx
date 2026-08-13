/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pitch shelf — the four pieces of writing a writer stores and copies into a query.
 * Reference: design-refs/manuscript-library.html, `.pbody` (the pitch strip and the `.assets` grid).
 *
 * ⚠️ COPY IS THE POINT OF THIS PAGE. A writer composing a query in their email client should be one
 * click from the clipboard on every piece, so `Copy` is on every written asset and on the derived
 * pitch line — not tucked behind a menu, and never gated.
 *
 * ⚠️ ALL FOUR ARE FREE. This is the app's core promise, not an upsell surface. There is no plan
 * prop here and there is not meant to be one; the spec asserts the component takes none.
 *
 * ⚠️ THE SYNOPSIS CARD STORES NOTHING. Its prose lives on a `ManuscriptVersion` authored in the
 * Package Workshop, which stays the single editing home — so it reads, Copies and states its version
 * count, and its Edit is a deep link rather than an editor. Duplicating that prose onto the
 * manuscript would put one piece of writing in two stores on a page that also names the first.
 */
import React, { useState } from "react";
import {
  PitchAsset,
  PitchAssetKey,
  PITCH_DESCRIPTION,
  wordCountLabel,
  liveCountLabel,
} from "../../lib/manuscriptPitch";
import { PitchLine } from "../../lib/comps";
import { PITCH_LABEL, PITCH_NEEDS_TWO, PITCH_NEEDS_ONE } from "../../lib/manuscriptTiles";
import "./manuscriptLibrary.css";

export interface ManuscriptPitchPaneProps {
  assets: PitchAsset[];
  /** Derived from the comp shelf — consumed, never recomputed here. */
  pitch: PitchLine;
  /** The complete line's clipboard text, or null while it is incomplete. */
  pitchText: string | null;
  /** How many SYNOPSIS versions exist. Stated as a fact on that card. */
  synopsisVersionCount: number;
  /** The surfaced synopsis version's date, already formatted. `null` when there is none. */
  synopsisDate: string | null;
  onCopy: (text: string) => void;
  /** Only ever called for the three editable keys — the synopsis is read-only here. */
  onSave: (key: PitchAssetKey, text: string) => void;
  /** The synopsis's Edit and Write it both land in the Package Workshop. */
  onOpenWorkshop: () => void;
}

/**
 * ⚠️ THE LOGLINE AND THE SYNOPSIS SPAN BOTH COLUMNS, the two in the middle share a row. The logline
 * is one sentence that reads badly in a narrow column, and the synopsis is the longest piece and the
 * only read-only one — giving it the full width keeps it from reading as a fourth peer in a ragged
 * 2×2 with a hole in it.
 */
const WIDE = new Set<PitchAssetKey>(["logline", "synopsis"]);

export const ManuscriptPitchPane: React.FC<ManuscriptPitchPaneProps> = ({
  assets,
  pitch,
  pitchText,
  synopsisVersionCount,
  synopsisDate,
  onCopy,
  onSave,
  onOpenWorkshop,
}) => {
  /** Which card is open, and its draft. Editing is buffered: Cancel restores, nothing writes. */
  const [editing, setEditing] = useState<PitchAssetKey | null>(null);
  const [draft, setDraft] = useState("");

  const open = (a: PitchAsset) => { setEditing(a.key); setDraft(a.text ?? ""); };
  const cancel = () => { setEditing(null); setDraft(""); };
  const save = (key: PitchAssetKey) => { onSave(key, draft); setEditing(null); setDraft(""); };

  return (
    <div className="msv-pbody">
      {/* ── the derived pitch line, with its own Copy ── */}
      <div className="msv-pitchstrip">
        <div className="msv-pitchtxt">
          <div className="msv-lab">{PITCH_LABEL} — from your comp shelf</div>
          {pitch.kind === "two" ? (
            <div className="msv-pv">
              <i>{pitch.a}</i>
              <span className="msv-pvm">meets</span>
              <i>{pitch.b}</i>
            </div>
          ) : (
            /* Absence states the threshold, never urges. The strings are locked in manuscriptTiles. */
            <div className="msv-pv none">{pitch.kind === "one" ? PITCH_NEEDS_ONE : PITCH_NEEDS_TWO}</div>
          )}
        </div>
        {/* No complete line → no Copy. A button that copies nothing is worse than no button. */}
        {pitchText && (
          <button type="button" className="msv-btn sm msv-pcopy" onClick={() => onCopy(pitchText)}>
            Copy
          </button>
        )}
      </div>

      <div className="msv-assets">
        {assets.map((a) => {
          const wide = WIDE.has(a.key) ? " wide" : "";

          if (editing === a.key) {
            return (
              <div key={a.key} className={`msv-asset editing${wide}`}>
                <div className="msv-ahead">
                  <span className="msv-an">{a.label}</span>
                  <span className="msv-ahint">{a.hint}</span>
                </div>
                <textarea
                  className="msv-atext"
                  value={draft}
                  aria-label={a.label}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="msv-aeditfoot">
                  {/* Two facts side by side — the count, and the length the piece is written to. */}
                  <span className="msv-awc">{liveCountLabel(draft, a.hint)}</span>
                  <span className="msv-aeditbtns">
                    <button type="button" className="msv-btn sm" onClick={cancel}>Cancel</button>
                    <button type="button" className="msv-btn sm msv-primary" onClick={() => save(a.key)}>Save</button>
                  </span>
                </div>
              </div>
            );
          }

          if (!a.written) {
            return (
              <div key={a.key} className={`msv-asset empty${wide}`}>
                <div className="msv-ahead">
                  <span className="msv-an">{a.label}</span>
                  <span className="msv-ahint">{a.hint}</span>
                </div>
                {/* States what the piece IS. No coaching, no encouragement. */}
                <div className="msv-aplaceholder">{PITCH_DESCRIPTION[a.key]}</div>
                <div className="msv-awrite">
                  <button
                    type="button"
                    className="msv-btn sm"
                    onClick={() => (a.readOnly ? onOpenWorkshop() : open(a))}
                  >
                    Write it
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={a.key} className={`msv-asset${wide}`}>
              <div className="msv-ahead">
                <span className="msv-an">{a.label}</span>
                <span className="msv-ahint">{a.hint}</span>
                <span className="msv-aacts">
                  <button type="button" className="msv-linkline" onClick={() => onCopy(a.text ?? "")}>Copy</button>
                  <button
                    type="button"
                    className="msv-linkline"
                    onClick={() => (a.readOnly ? onOpenWorkshop() : open(a))}
                  >
                    Edit
                  </button>
                </span>
              </div>
              <div className={`msv-acontent${a.key === "logline" ? " serif" : ""}`}>{a.text}</div>
              {/*
                ⚠️ THE FOOTER STATES ONLY WHAT IS KNOWN. The ref draws "N words · Edited {date}", but
                nothing stores an edited date for the three manuscript-backed pieces — and inventing
                one from any other field would be a plausible number stating something untrue. The
                synopsis DOES have a real date (its version's), and its card says so.
              */}
              <div className="msv-ameta">
                {wordCountLabel(a.text)}
                {a.key === "synopsis" && synopsisDate ? ` · Version of ${synopsisDate}` : ""}
                {a.key === "synopsis" && synopsisVersionCount > 1
                  ? ` · ${synopsisVersionCount} versions on file`
                  : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
