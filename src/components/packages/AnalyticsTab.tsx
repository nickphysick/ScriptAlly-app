/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AnalyticsTab — the Analytics half of the two-tab Package Workshop (ref
 * design-refs/scriptally-packages-twotab.html): a scope row (All packages + one pill per package)
 * over either the all-packages view or a single package in focus.
 *
 * FRAMING RULE, applied to every figure and every line of copy here: REPLY RATE is the primary
 * measure, because it is the one that stabilises at the sample sizes querying produces. REQUESTS are
 * treated as noteworthy EVENTS and counted with a ★ — never turned into a rate to optimise, because
 * at four or five sends a request rate is noise wearing a percentage sign. And because a request
 * travels with every material in the package that was sent, materials are described as being "in
 * requesting packages"; nothing here claims a material caused anything.
 *
 * Every number is derived at read time from `packages` + `queries` (+ agents for reply windows).
 * Nothing is stored and this tab never writes to Firestore.
 */
import React from "react";
import { ManuscriptVersion, SubmissionPackage, Query, Agent } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import {
  funnelStages, rankPackagesByReplies, medianReplyDays, medianReplyDaysAll, daysToWeeks, formatRate,
  MIN_SENDS_FOR_CLAIM, materialUsage, isSlotFilled,
} from "../../lib/packageMetrics";
import { overdueSends, rankMaterialsByReplies, sentToRows, recommendations, Recommendation } from "../../lib/packageAnalytics";
import { COMMUNITY_STATS_ENABLED, displayablePercentile, percentileLabel, percentileSentence } from "../../lib/communityStats";
import { AnalyticsEmpty } from "./AnalyticsEmpty";

export type AnalyticsScope = "all" | string;

export interface AnalyticsTabProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  agents: Agent[];
  /** The manuscript's stored active package id, for the scope pill's ACTIVE tag. */
  activePackageId: string | null;
  scope: AnalyticsScope;
  onScope: (s: AnalyticsScope) => void;
  /** Injected so the derivations stay pure and testable. */
  now?: number;
  /** Real action: take the writer to the Queries Hub, where nudges are actually sent. */
  onOpenQueries: () => void;
  /** Real action: open a package on the Workshop tab. */
  onOpenPackage: (packageId: string) => void;
  /** First-run: start a new package (the header's action). */
  onNewPackage?: () => void;
  /** First-run: the EXISTING guided tour over example data. */
  onTryExample?: () => void;
}

/** A package's sends. */
const sendsOf = (pkgId: string, queries: Query[]) => queries.filter((q) => q.packageId === pkgId);
const pct = (r: number | null) => Math.round((r ?? 0) * 100);

/**
 * The community comparison, and what stands in its place. Every percentile on this tab goes through
 * `displayablePercentile`, which returns null unless the flag is on, a source actually answered, the
 * cohort clears its floor and the writer's own sample clears MIN_SENDS_FOR_CLAIM. Null is the normal
 * answer today — the surrounding view is written to be complete without it, not to look broken.
 */
const PercentilePill: React.FC<{ metric: "package-reply-rate" | "material-reply-rate"; value: number | null; sends: number }> = ({ metric, value, sends }) => {
  const p = displayablePercentile(metric, value, sends);
  if (!p) return null;
  return <span className={`pkgw-pctpill${p.percentile >= 90 ? " top" : ""}`}>{percentileLabel(p)}</span>;
};

/** The percentile track — the writer's dot against the cohort. Renders only when a claim is allowed. */
const CommunityTrack: React.FC<{ value: number | null; sends: number; subject: string }> = ({ value, sends, subject }) => {
  const p = displayablePercentile("package-reply-rate", value, sends);
  if (!p) {
    // Flag-off fallback: one quiet line, so the panel reads as finished rather than missing a part.
    return COMMUNITY_STATS_ENABLED ? null : (
      <div className="pkgw-unlock">Comparisons with other ScriptAlly writers unlock as the community grows.</div>
    );
  }
  return (
    <>
      <div className="pkgw-ptrack">
        <span className="med" style={{ left: "50%" }} />
        <span className="you" style={{ left: `${p.percentile}%` }} />
      </div>
      <div className="pkgw-ptlab"><span>COMMUNITY LOW</span><span>MEDIAN</span><span>HIGH</span></div>
      <div className="pkgw-bigline">{percentileSentence(p, subject)}</div>
    </>
  );
};

/** Emphasise the named phrases inside a derived sentence, without dangerouslySetInnerHTML. */
const emphasise = (text: string, bold: string[]): React.ReactNode => {
  const wanted = bold.filter(Boolean);
  if (!wanted.length) return text;
  const re = new RegExp(`(${wanted.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(re).map((part, i) => (wanted.includes(part) ? <b key={i}>{part}</b> : part));
};

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  versions, packages, queries, agents, activePackageId, scope, onScope, now = Date.now(),
  onOpenQueries, onOpenPackage, onNewPackage, onTryExample,
}) => {
  const packaged = queries.filter((q) => !!q.packageId && packages.some((p) => p.id === q.packageId));

  const scopeRow = (
    <div className="pkgw-scoper" role="tablist" aria-label="Analytics scope">
      <button type="button" role="tab" aria-selected={scope === "all"} className={`pkgw-scp${scope === "all" ? " on" : ""}`} onClick={() => onScope("all")}>
        All packages
      </button>
      {packages.map((p) => {
        const sent = sendsOf(p.id, queries).length;
        const tag = p.id === activePackageId ? "ACTIVE" : sent === 0 ? "DRAFT" : null;
        return (
          <button key={p.id} type="button" role="tab" aria-selected={scope === p.id} className={`pkgw-scp${scope === p.id ? " on" : ""}`} onClick={() => onScope(p.id)}>
            {p.packageName || "Untitled package"}
            {tag && <span className="tag2">{tag}</span>}
          </button>
        );
      })}
    </div>
  );

  // ── All packages ──────────────────────────────────────────────────────────
  const allView = () => {
    const f = funnelStages(packaged);
    const medDays = medianReplyDaysAll(packaged);
    const med = daysToWeeks(medDays);
    const overdue = overdueSends(packaged, agents, now);
    const ranked = rankPackagesByReplies(packages, queries);
    const sentPkgs = ranked.filter((r) => r.stat.sent > 0);
    const best = sentPkgs.find((r) => r.ranked && r.stat.replyRate !== null) ?? null;
    const anyProvisional = sentPkgs.some((r) => !r.ranked);
    const mats = rankMaterialsByReplies(versions, packages, queries);
    const recs: Recommendation[] = recommendations({ versions, packages, queries, agents, now });
    const bar = (n: number, d: number) => `${d > 0 ? Math.round((n / d) * 100) : 0}%`;

    // First run — nothing has gone out yet. The full empty screen replaces the thin line it used to be.
    if (f.sent === 0) {
      return <AnalyticsEmpty onNewPackage={() => onNewPackage?.()} onTryExample={() => onTryExample?.()} />;
    }

    return (
      <>
        <div className="pkgw-kpis">
          <div className="pkgw-kpi">
            <div className="v">{f.sent}</div>
            <div className="k">Queries sent</div>
            <div className="d">across {packages.length} {packages.length === 1 ? "package" : "packages"}</div>
          </div>
          <div className="pkgw-kpi">
            <div className="v g">{pct(f.replyRate)}<span className="u">%</span></div>
            <div className="k">Reply rate</div>
            <div className="d">
              {f.replied} of {f.sent} {f.replied === 1 ? "agent has" : "agents have"} come back to you
              {(() => { const p = displayablePercentile("package-reply-rate", f.replyRate, f.sent); return p ? <> — higher than <b>{p.percentile}%</b> of ScriptAlly writers</> : null; })()}
            </div>
          </div>
          <div className="pkgw-kpi">
            <div className="v b">{med ? med.replace(" wks", "") : "—"}{med && <span className="u"> wks</span>}</div>
            <div className="k">Median reply time</div>
            <div className="d">{overdue.length > 0 ? `${overdue.length} still out past the agent’s usual reply time` : "Nothing overdue"}</div>
          </div>
          <div className="pkgw-kpi">
            <div className="v gold">{f.requests}<span className="u"> ★</span></div>
            <div className="k">{f.requests === 1 ? "Request" : "Requests"}</div>
            <div className="d">rare — typically only 6–8% of sends earn one</div>
          </div>
        </div>

        <div className="gsec"><h2>Where your queries stand</h2><span className="cn">ALL TIME</span></div>
        <div className="grule" />
        <div className="panel">
          <div className="pkgw-fun">
            <div className="pkgw-fr"><span className="fl2">Sent</span><span className="tr2"><i style={{ width: "100%", background: "var(--pkg-dash)" }} /></span><span className="fv">{f.sent}</span></div>
            <div className="pkgw-fr"><span className="fl2">Replied</span><span className="tr2"><i style={{ width: bar(f.replied, f.sent), background: "var(--pkg-sage)" }} /></span><span className="fv">{f.replied} <span>{pct(f.replyRate)}%</span></span></div>
            <div className="pkgw-fr"><span className="fl2">Requests</span><span className="tr2"><i style={{ width: bar(f.requests, f.sent), background: "var(--pkg-gold-bar)" }} /></span><span className="fv">{f.requests} <span>★</span></span></div>
            <div className="pkgw-fr"><span className="fl2">Offers</span><span className="tr2"><i style={{ width: bar(f.offers, f.sent), background: "var(--pkg-burg)" }} /></span><span className="fv">{f.offers}</span></div>
          </div>
          {(() => {
            const stillOut = f.sent - f.replied;
            if (stillOut === 0) return null;
            return (
              <div className="note" style={{ marginTop: 13 }}>
                {stillOut === 1 ? "One query is" : `${stillOut} queries are`} still out.
                {overdue.length > 0 && ` ${overdue.length === 1 ? "One has" : `${overdue.length} have`} passed the agent’s usual reply time.`}
              </div>
            );
          })()}
        </div>

        <div className="pkgw-duo" style={{ marginTop: 26 }}>
          <div className="panel">
            <div className="gsec" style={{ margin: "0 0 5px" }}><h2 style={{ fontSize: 17 }}>Package leaderboard</h2><span className="cn">BY REPLY RATE</span></div>
            <div className="grule" style={{ marginBottom: 8 }} />
            {sentPkgs.map((r, i) => (
              <div key={r.pkg.id} className={`pkgw-lbr${best?.pkg.id === r.pkg.id ? " best" : ""}`}>
                <span className="rk">{i + 1}</span>
                <span className="ln2">
                  <span className="lnm">{r.pkg.packageName || "Untitled package"}</span>
                  {!r.ranked && <span className="prov">provisional</span>}
                  <div className="bar"><i style={{ width: `${pct(r.stat.replyRate)}%` }} /></div>
                </span>
                <span className="lv"><b>{formatRate(r.stat.replyRate)}</b>{r.stat.requests > 0 && ` · ${r.stat.requests}★`}</span>
              </div>
            ))}
            {anyProvisional && (
              <div className="note" style={{ marginTop: 11 }}>
                Rankings stay provisional until a package has gone to {MIN_SENDS_FOR_CLAIM} agents — below that, one
                lucky reply reads as a landslide.
              </div>
            )}
          </div>

          <div className="panel">
            <div className="gsec" style={{ margin: "0 0 5px" }}><h2 style={{ fontSize: 17 }}>Materials winning replies</h2><span className="cn">{COMMUNITY_STATS_ENABLED ? "VS THE SCRIPTALLY COMMUNITY" : "ACROSS EVERY PACKAGE"}</span></div>
            <div className="grule p" style={{ marginBottom: 8 }} />
            {mats.length === 0 ? (
              <div className="note">No material has travelled yet — send a package and they will start earning a record.</div>
            ) : (
              <>
                {mats.map((m, i) => (
                  <div key={m.version.id} className={`pkgw-matr${i === 0 && m.ranked ? " best" : ""}`}>
                    <span className="g3"><TypeGlyph type={m.version.componentType} size={13} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span className="mn2">{m.version.versionName}</span>
                      <div className="mm2">IN {m.usage.packages} {m.usage.packages === 1 ? "PACKAGE" : "PACKAGES"} · {m.usage.sends} {m.usage.sends === 1 ? "SEND" : "SENDS"}{m.usage.requests > 0 ? ` · ${m.usage.requests} ${m.usage.requests === 1 ? "REQUEST" : "REQUESTS"}` : ""}</div>
                    </span>
                    <span className="bar2"><i style={{ width: `${pct(m.usage.replyRate)}%` }} /></span>
                    <PercentilePill metric="material-reply-rate" value={m.usage.replyRate} sends={m.usage.sends} />
                    <span className="rr">{formatRate(m.usage.replyRate)}<span>replies</span></span>
                  </div>
                ))}
                {mats.some((m) => !m.ranked) && (
                  <div className="note" style={{ marginTop: 11 }}>
                    A material needs {MIN_SENDS_FOR_CLAIM} sends behind it before its rate means much.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {recs.length > 0 && (
          <>
            <div className="gsec"><h2>What to do next</h2><span className="cn">DERIVED FROM YOUR RESULTS</span></div>
            <div className="grule p" />
            <div className="pkgw-recs">
              {recs.map((r) => (
                <div key={r.id} className="pkgw-rec3">
                  <span className="rk2">{r.kicker}</span>
                  <div className="rt2">{emphasise(r.body, r.bold)}</div>
                  {r.action === "queries" && (
                    <button type="button" className="ra" onClick={onOpenQueries}>{r.actionLabel}</button>
                  )}
                  {r.action === "open-package" && r.packageId && (
                    <button type="button" className="ra" onClick={() => onOpenPackage(r.packageId!)}>{r.actionLabel}</button>
                  )}
                  {r.action === "swap" && (
                    /* No swap flow is built. Rather than a button that quietly does nothing, this
                       states plainly that it is coming and points at where the swap is done today. */
                    <span className="ra ra--soon" aria-disabled="true" title="Swapping a material inside a package isn’t built yet — do it on the Workshop tab">
                      {r.actionLabel} · coming soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  // ── One package in focus ──────────────────────────────────────────────────
  const focusView = (pkg: SubmissionPackage) => {
    const mine = sendsOf(pkg.id, queries);
    if (mine.length === 0) {
      return (
        <>
          <div className="gsec" style={{ marginTop: 0 }}><h2>{pkg.packageName || "Untitled package"}</h2></div>
          <div className="panel">
            <div className="note">
              Nothing to measure yet — this package hasn’t been sent. Add a query letter and send it with a query, and
              its numbers will appear here.
            </div>
          </div>
        </>
      );
    }
    const f = funnelStages(mine);
    const med = daysToWeeks(medianReplyDays(pkg.id, queries));
    const rows = sentToRows(pkg.id, queries, agents, now);
    const slots = [pkg.queryLetterVersionId, pkg.synopsisVersionId, pkg.samplePagesVersionId].filter(isSlotFilled);
    const mats = slots.map((id) => versions.find((v) => v.id === id)).filter(Boolean) as ManuscriptVersion[];

    return (
      <>
        <div className="gsec" style={{ marginTop: 0 }}>
          <h2>{pkg.packageName || "Untitled package"}</h2>
          <span className="cn">{pkg.id === activePackageId ? "ACTIVE" : `SENT ×${f.sent}`}</span>
        </div>
        <div className="pkgw-duo">
          <div className="panel" style={{ flex: 1.35 }}>
            <div className="sl">Reply rate</div>
            <div className="pkgw-hero3" style={{ marginTop: 10 }}>
              <span className="big">{formatRate(f.replyRate)}</span>
              <span className="lb">
                <b>of agents replied</b>
                <span>{f.replied} of {f.sent}{med ? ` · median ${med}` : ""}</span>
              </span>
            </div>
            <CommunityTrack value={f.replyRate} sends={f.sent} subject="package" />
            {!f.replyRate || f.sent < MIN_SENDS_FOR_CLAIM ? (
              <div className="note" style={{ marginTop: 12 }}>
                {f.sent} {f.sent === 1 ? "send is" : "sends are"} an early read — this figure will firm up as the package travels.
              </div>
            ) : null}
            {f.requests > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="pkgw-evchip">★ <b>{f.requests} {f.requests === 1 ? "request" : "requests"}</b>&nbsp;— rare: typically only 6–8% of sends earn one</span>
              </div>
            )}
          </div>
          <div className="panel">
            <div className="sl" style={{ marginBottom: 6 }}>Sent to</div>
            {rows.map((r) => (
              <div key={r.queryId} className="pkgw-agrow">
                {r.agentName}
                <span className={`st3 ${r.state === "request" ? "req" : r.state === "replied" ? "rep" : "wait"}`}>
                  {r.state === "request" ? "FULL REQUEST ★" : r.state === "replied" ? "REPLIED" : `WAITING · ${r.weeksOut} WK${r.weeksOut === 1 ? "" : "S"}${r.overdue ? " ⚠" : ""}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="gsec"><h2 style={{ fontSize: 17 }}>This package’s materials</h2><span className="cn">HOW THEY DO EVERYWHERE</span></div>
        <div className="grule p" />
        <div className="panel">
          {mats.length === 0 ? (
            <div className="note">This package has no materials in it yet.</div>
          ) : mats.map((v) => {
            const u = materialUsage(v.id, packages, queries);
            return (
              <div key={v.id} className="pkgw-matr">
                <span className="g3"><TypeGlyph type={v.componentType} size={13} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="mn2">{v.versionName}</span>
                  <div className="mm2">IN {u.packages} {u.packages === 1 ? "PACKAGE" : "PACKAGES"} · {u.sends} {u.sends === 1 ? "SEND" : "SENDS"}</div>
                </span>
                <span className="bar2"><i style={{ width: `${pct(u.replyRate)}%` }} /></span>
                <span className="rr">{formatRate(u.replyRate)}<span>replies</span></span>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const focused = scope === "all" ? null : packages.find((p) => p.id === scope) ?? null;

  return (
    <>
      {scopeRow}
      {focused ? focusView(focused) : allView()}
    </>
  );
};
