/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 Part F — THE PAGE FOOT (the mock's option C): a dashed bar ("COMING SOON", "Multiple manuscripts",
 * "We're working on this. Watch this space.") and two tiles beneath it, Versions and Submission packages. The tiles
 * stretch so the foot reaches the bottom of the content area less 28px; they never shrink below 136px.
 *
 * TODO(illustration): each tile's picture is a placeholder until the artist's drawings arrive (TILE_ART).
 * TODO(gating): when Free plans return, hide these links (or lock them) for Free accounts. Today every account is a
 * founding member and PACKAGES_OPEN_TO_ALL is true.
 */
import React from "react";

export const FOOT_COPY = {
  chip: "Coming soon",
  title: "Multiple manuscripts",
  line: "We’re working on this. Watch this space.",
  versions: {
    title: "Versions",
    text: "Prologue first? Cut the flashback? Faster-paced start? Tweak, save and track different versions of your manuscript to see what lands.",
    go: "Open Versions →",
  },
  packages: {
    title: "Submission packages",
    text: "Bundle query letters, synopses and comparable titles with your manuscript and attach them to queries to see what performs best.",
    go: "Open Submission packages →",
  },
} as const;

/** TODO(illustration): set each to the artist's image and the placeholder goes. */
export const TILE_ART: { versions: string | null; packages: string | null } = { versions: null, packages: null };

const PageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M8 3.5h7l3.5 3.5v10.5H8z" /><path d="M15 3.5V7h3.5" /><path d="M5.5 7v13.5H15" /><path d="M11 11.5h4.5M11 14.5h3" />
  </svg>
);
const ParcelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M3.5 8 12 4l8.5 4v8.5L12 20.5l-8.5-4z" /><path d="M3.5 8 12 12l8.5-4M12 12v8.5" /><path d="m7.8 6 8.4 4.1v3" />
  </svg>
);

const Tile: React.FC<{ k: "versions" | "packages"; onOpen: () => void }> = ({ k, onOpen }) => {
  const c = FOOT_COPY[k];
  const art = TILE_ART[k];
  return (
    <button type="button" className="ms28-st" data-ms28={`tile-${k}`} onClick={onOpen}>
      {art ? <img className="ms28-st-ph is-art" src={art} alt="" /> : (
        <span className="ms28-st-ph" role="img" aria-label="Illustration placeholder">{k === "versions" ? <PageIcon /> : <ParcelIcon />}<em>Illustration</em></span>
      )}
      <span className="ms28-st-tx"><b>{c.title}</b><small data-ms28="tile-text">{c.text}</small><span className="ms28-st-go">{c.go}</span></span>
    </button>
  );
};

export const MsFoot: React.FC<{ onVersions: () => void; onPackages: () => void }> = ({ onVersions, onPackages }) => (
  <div className="ms28-foot" data-ms28="foot">
    <div className="ms28-sbar" data-ms28="bar">
      <span className="ms28-sb-chip">{FOOT_COPY.chip}</span>
      <b>{FOOT_COPY.title}</b>
      <span className="ms28-sb-d">{FOOT_COPY.line}</span>
    </div>
    <div className="ms28-stile2" data-ms28="tiles">
      <Tile k="versions" onOpen={onVersions} />
      <Tile k="packages" onOpen={onPackages} />
    </div>
  </div>
);
