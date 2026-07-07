/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The frontispiece plate's reveal — three band-headed mini panels (ref manuscripts-page-v2.html):
 * In the field (query roster), Submission packages (the named-package entity), Comparable titles.
 * All read-time derived; nothing stored. Panels stagger in via the `.msv-plate.open .msv-rpanel`
 * delays in the stylesheet.
 */
import React from "react";
import { Agent, CompTitle, ComponentType, Query, SubmissionPackage } from "../../types";
import { StatusDot } from "../StatusDot";
import { TypeGlyph } from "../packages/TypeGlyph";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { activeQueryCount, lastActivityMs, recentQueries } from "../../lib/manuscriptPage";
import { isSlotFilled } from "../../lib/packageMetrics";

/** "09 Jun" — the roster/package short date; em-dash when undated. */
const shortDate = (ms: number | null): string =>
  ms == null ? "—" : new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const ROSTER_LIMIT = 4;

const PACKAGE_SLOTS: { type: ComponentType; slot: keyof SubmissionPackage; label: string }[] = [
  { type: ComponentType.QUERY_LETTER, slot: "queryLetterVersionId", label: "Query letter" },
  { type: ComponentType.SYNOPSIS, slot: "synopsisVersionId", label: "Synopsis" },
  { type: ComponentType.SAMPLE_PAGES, slot: "samplePagesVersionId", label: "Sample pages" },
];

interface PlateRevealProps {
  queries: Query[]; // already scoped to this manuscript
  agents: Agent[]; // full list, for agentId lookup
  packages: SubmissionPackage[]; // already scoped + non-retired
  comps: CompTitle[];
  onOpenHub: () => void;
  onOpenBuilder: () => void;
  onManageComps: () => void;
}

export const PlateReveal: React.FC<PlateRevealProps> = ({
  queries,
  agents,
  packages,
  comps,
  onOpenHub,
  onOpenBuilder,
  onManageComps,
}) => {
  const sent = queries.length;
  const active = activeQueryCount(queries);
  const roster = recentQueries(queries, ROSTER_LIMIT);

  return (
    <div className="msv-rgrid">
      {/* ── In the field ── */}
      <div className="msv-rpanel msv-s1">
        <div className="msv-rband">
          <h4>In the field</h4>
          {sent > 0 && (
            <button type="button" className="msv-linky" onClick={onOpenHub}>
              ALL {sent} &rarr;
            </button>
          )}
        </div>
        <div className="msv-rbody">
          {sent === 0 ? (
            <div className="msv-emptyfield">Still on the runway — no queries yet.</div>
          ) : (
            <>
              <div className="msv-figrow">
                <span className="msv-fig">{sent}</span>
                <span className="msv-lab">SENT</span>
                <span className={`msv-figpill${active > 0 ? "" : " grey"}`}>
                  {active > 0 ? `${active} active` : "all closed"}
                </span>
              </div>
              {roster.map((q) => {
                const agent = agents.find((a) => a.id === q.agentId);
                const primary = agent ? agentPrimary(agent) : "Unknown agent";
                const secondary = agent ? agentSecondary(agent) : "";
                return (
                  <div key={q.id} className="msv-qrow">
                    <StatusDot status={q.status} overrideSize={13} decorative />
                    <span className="msv-who">
                      {primary}
                      {secondary && <span className="msv-ag"> · {secondary}</span>}
                    </span>
                    <span className="msv-d">{shortDate(lastActivityMs(q))}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Submission packages (named entity; date is CREATED, never implied recency) ── */}
      <div className="msv-rpanel msv-s2">
        <div className="msv-rband">
          <h4>Submission packages</h4>
          {packages.length > 0 && (
            <button type="button" className="msv-linky" onClick={onOpenBuilder}>
              BUILDER &rarr;
            </button>
          )}
        </div>
        <div className="msv-rbody">
          {packages.length === 0 ? (
            <>
              <div className="msv-emptyfield">No packages built yet.</div>
              <button type="button" className="msv-linky" style={{ marginTop: 8 }} onClick={onOpenBuilder}>
                BUILD ONE &rarr;
              </button>
            </>
          ) : (
            packages.map((pk) => (
              <div key={pk.id} className="msv-pkgrow">
                <div className="msv-pkgnm">{pk.packageName}</div>
                <div className="msv-pkgmeta">
                  <span className="msv-pkgparts">
                    {PACKAGE_SLOTS.map(({ type, slot, label }) => (
                      <span
                        key={slot}
                        className={`msv-pp${isSlotFilled(pk[slot] as string) ? " on" : ""}`}
                        title={label}
                      >
                        <TypeGlyph type={type} size={9.5} />
                      </span>
                    ))}
                  </span>
                  <span className="msv-pkgdate">
                    <span className="msv-createdlab">CREATED</span> {shortDate(Date.parse(pk.createdDate) || null)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Comparable titles (read-only list; MANAGE opens the sub-page) ── */}
      <div className="msv-rpanel msv-s3">
        <div className="msv-rband">
          <h4>Comparable titles</h4>
          <button type="button" className="msv-linky" onClick={onManageComps}>
            MANAGE &rarr;
          </button>
        </div>
        <div className="msv-rbody">
          {comps.length === 0 ? (
            <div className="msv-compsnudge">
              No comps attributed yet — most agents expect two or three, published in the last five years.
            </div>
          ) : (
            comps.map((c, i) => (
              <div key={`${c.title}-${i}`} className="msv-comprow">
                <span className="msv-comprow-t">{c.title}</span>
                {c.year && <span className="msv-comprow-y">{c.year}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
