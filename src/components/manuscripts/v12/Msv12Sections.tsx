/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v12 — the main column's sections: owed requests, Versions, Query letters and
 * Synopses, Other materials, Submission packages. Presentational; every figure arrives derived
 * (lib/manuscriptSummary), every status glyph is the app's own StatusDot, and no handler here
 * writes anything — the page routes actions to the flows that own them.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { Agent, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../../../types";
import type { CountEntry, OwedRow, VersionUsage } from "../../../lib/manuscriptSummary";
import { initialsOf } from "../../../lib/manuscriptSummary";

/** "2 Sep" / "2 Sep 2026" — the app's own short date, never a browser locale's. */
export const fmtDay = (iso: string | null | undefined, withYear = false): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
};

/**
 * One status glyph + its count. The glyph is StatusDot and nothing else (L5); a closed entry's
 * accessible name is the count of closed queries — a summed bucket has no single outcome to name,
 * so no outcome word is invented for it (the StatusDot closed-set law).
 */
export const CountCluster: React.FC<{ counts: CountEntry[]; pkgLabel?: string | null }> = ({ counts, pkgLabel }) => (
  <>
    {counts.map((c, i) => (
      <span key={i} title={c.closed ? `${c.n} closed` : `${c.n} ${c.status}`}>
        <span className="msv12-sd" data-msv12-sd="">
          <StatusDot status={c.status} overrideSize={12} decorative />
        </span>
        {c.n}
      </span>
    ))}
    {pkgLabel ? <span className="msv12-lbl msv12-pkgn">{pkgLabel}</span> : null}
  </>
);

export const SectionH: React.FC<{
  title: string; sub?: React.ReactNode; pro?: boolean; children?: React.ReactNode;
}> = ({ title, sub, pro, children }) => (
  <div className="msv12-sech">
    <h2>
      {title}
      {pro ? <span className="msv12-pro">Pro</span> : null}
      {sub ? <span className="msv12-sub">{sub}</span> : null}
    </h2>
    {children ? <div className="msv12-acts">{children}</div> : null}
  </div>
);

/* ══ owed requests ════════════════════════════════════════════════════════════════════════════ */

export const OwedList: React.FC<{
  owed: OwedRow[];
  agentName: (id: string) => string;
  versionPin: (q: Query) => string | null;
  onSend: (row: OwedRow) => void;
}> = ({ owed, agentName, versionPin, onSend }) => {
  if (owed.length === 0) return null;
  return (
    <div className="msv12-owed" data-msv12="owed">
      {owed.map((row) => {
        const pin = versionPin(row.query);
        return (
          <div className="msv12-owedrow" data-msv12="owed-row" key={row.query.id}>
            <span className="msv12-sd" data-msv12-sd="">
              <StatusDot status={row.query.status} overrideSize={12} decorative />
            </span>
            <div className="msv12-otxt">
              <span className="msv12-who">{agentName(row.query.agentId)}</span> {row.ask}.
              <div className="msv12-osub">
                {[
                  row.requestedIso ? `Requested ${fmtDay(row.requestedIso)}` : null,
                  /* "pins {version}" only where the record genuinely carries one — see the page */
                  pin ? `pins ${pin}` : null,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className="msv12-move">Your move</span>
            <button type="button" className="msv12-btn" data-msv12="owed-send" onClick={() => onSend(row)}>
              {row.kind === "partial" ? "Send partial" : "Send full"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ══ versions ═════════════════════════════════════════════════════════════════════════════════ */

export const VersionsSection: React.FC<{
  versions: BookVersion[]; // newest first
  currentId: string | null;
  usage: (id: string) => VersionUsage;
  onNewVersion: () => void;
}> = ({ versions, currentId, usage, onNewVersion }) => (
  <section className="msv12-sec" data-msv12="versions">
    <SectionH
      title="Versions"
      sub={versions.length > 0 ? `${versions.length} ${versions.length === 1 ? "edit" : "edits, newest first"}` : undefined}
    >
      <button type="button" className="msv12-btn" onClick={onNewVersion}>+ New version</button>
    </SectionH>
    {versions.length === 0 ? (
      <p className="msv12-cap" style={{ margin: 0 }}>
        Name each edit for what changed, like “Fast-paced opening”. Partials and fulls are cut from
        a version, so you’ll know which one an agent read.
      </p>
    ) : (
      <div className="msv12-vlist">
        {versions.map((v) => {
          const u = usage(v.id);
          const cur = v.id === currentId;
          return (
            <div
              key={v.id}
              className={`msv12-vrow${cur ? " msv12-vrow--cur" : ""}`}
              data-msv12="vrow" data-msv12-vid={v.id} data-qtotal={u.total} data-cur={cur ? "1" : "0"}
            >
              <span className="msv12-vmark" aria-hidden="true" />
              <div>
                <div className="msv12-vname">
                  {v.name}
                  {cur ? <span className="msv12-curtag">Current</span> : null}
                </div>
                {v.note ? <div className="msv12-vnote">{v.note}</div> : null}
              </div>
              {/* the mock also draws a per-version word count; the record does not carry one, so
                  the clause is omitted rather than restated from the manuscript (run report) */}
              <div className="msv12-vfacts">Saved {fmtDay(v.createdDate, true)}</div>
              <div className="msv12-vused">
                <CountCluster
                  counts={u.counts}
                  pkgLabel={u.packages > 0 ? `${u.packages} package${u.packages === 1 ? "" : "s"}` : "No packages"}
                />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

/* ══ query letters + synopses ═════════════════════════════════════════════════════════════════ */

const MaterialRow: React.FC<{
  m: ManuscriptVersion; inUse: boolean; queryCount: number;
}> = ({ m, inUse, queryCount }) => (
  <div className={`msv12-mrow${inUse ? " msv12-mrow--cur" : ""}`} data-msv12="mrow">
    <i aria-hidden="true" />
    <div>
      <div className="msv12-mn">
        {m.versionName}
        {inUse ? <span className="msv12-curtag msv12-curtag--och">In use</span> : null}
      </div>
      <div className="msv12-mf2">
        {[
          typeof m.wordCount === "number" ? `${m.wordCount.toLocaleString("en-GB")} words` : null,
          m.createdDate ? `saved ${fmtDay(m.createdDate)}` : null,
          `in ${queryCount} ${queryCount === 1 ? "query" : "queries"}`,
        ].filter(Boolean).join(" · ")}
      </div>
    </div>
  </div>
);

export const MaterialsSections: React.FC<{
  letters: ManuscriptVersion[];
  synopses: ManuscriptVersion[];
  letterInUseId: string | null;
  queryCount: (id: string, slot: "letter" | "synopsis") => number;
  showTwoPageNote: boolean;
  onNew: (which: "letter" | "synopsis") => void;
}> = ({ letters, synopses, letterInUseId, queryCount, showTwoPageNote, onNew }) => (
  <div className="msv12-mat2">
    <section className="msv12-sec" data-msv12="letters">
      <SectionH title="Query letters" sub={letters.length > 0 ? String(letters.length) : undefined}>
        <button type="button" className="msv12-btn" onClick={() => onNew("letter")}>+ New</button>
      </SectionH>
      {letters.length === 0 ? (
        <p className="msv12-cap" style={{ margin: 0 }}>Keep every draft and see which one went into each query.</p>
      ) : (
        <div className="msv12-mlist">
          {letters.map((m) => (
            <MaterialRow key={m.id} m={m} inUse={m.id === letterInUseId} queryCount={queryCount(m.id, "letter")} />
          ))}
        </div>
      )}
    </section>
    <section className="msv12-sec" data-msv12="synopses">
      <SectionH title="Synopses" sub={synopses.length > 0 ? String(synopses.length) : undefined}>
        <button type="button" className="msv12-btn" onClick={() => onNew("synopsis")}>+ New</button>
      </SectionH>
      {synopses.length === 0 ? (
        <p className="msv12-cap" style={{ margin: 0 }}>Agents ask for different lengths. Keep each one ready.</p>
      ) : (
        <div className="msv12-mlist">
          {synopses.map((m) => (
            <MaterialRow key={m.id} m={m} inUse={false} queryCount={queryCount(m.id, "synopsis")} />
          ))}
        </div>
      )}
      {showTwoPageNote ? (
        <p className="msv12-mnote">
          Some agents ask for 2 pages.{" "}
          <button type="button" className="msv12-mini" onClick={() => onNew("synopsis")}>Add a length</button>
        </p>
      ) : null}
    </section>
  </div>
);

/* ══ other materials ══════════════════════════════════════════════════════════════════════════ */

export const OtherSection: React.FC<{ tiles: { label: string; queries: number }[] }> = ({ tiles }) => (
  <section className="msv12-sec" data-msv12="other">
    <SectionH title="Other materials" sub="Anything else an agent asks for" />
    <div className="msv12-ogrid">
      {tiles.map((t) => (
        <div className="msv12-otile" key={t.label}>
          <i aria-hidden="true" />
          <div className="msv12-mn">{t.label}</div>
          <div className="msv12-mf2">in {t.queries} {t.queries === 1 ? "query" : "queries"}</div>
        </div>
      ))}
      {/* ⚠️ NO FLOW EXISTS for a standalone other material — the app's "Other" is a package's own
          free-text line (`otherMaterials`, deliberately not a fourth slot). The tile states the
          gap honestly rather than opening nothing; the run report carries the decision. */}
      <button
        type="button" className="msv12-otile msv12-otile--add" aria-disabled="true"
        title="Standalone other materials are coming soon — today a package carries its own line"
      >
        <span className="msv12-plus" aria-hidden="true">+</span>
        <span>
          <span className="msv12-mn">Add other material</span>
          <span className="msv12-mf2" style={{ display: "block" }}>A comps paragraph, a pitch, a questionnaire</span>
        </span>
      </button>
    </div>
  </section>
);

/* ══ submission packages ══════════════════════════════════════════════════════════════════════ */

export interface PkgCardModel {
  pkg: SubmissionPackage;
  items: { label: string; version?: string }[];
  recipients: Agent[];
  extraRecipients: number;
  counts: CountEntry[];
}

export const PackagesSection: React.FC<{
  pro: boolean;
  cards: PkgCardModel[];
  inUse: number;
  onOpenPackages: () => void;
  onSeePro: () => void;
}> = ({ pro, cards, inUse, onOpenPackages, onSeePro }) => (
  <section className="msv12-sec" data-msv12="packages">
    <SectionH
      title="Submission packages"
      pro={!pro}
      sub={pro && inUse > 0 ? <span data-msv12="pkg-inuse">{inUse} in use</span> : undefined}
    >
      {pro ? (
        <button type="button" className="msv12-link" onClick={onOpenPackages}>Open Submission packages</button>
      ) : null}
    </SectionH>
    {pro ? (
      <div className="msv12-pgrid">
        {cards.map(({ pkg, items, recipients, extraRecipients, counts }) => (
          <div className="msv12-pkg" data-msv12="pkg" key={pkg.id}>
            <div className="msv12-pkgh">
              <div className="msv12-pkgname"><i aria-hidden="true" />{pkg.packageName}</div>
              <span className="msv12-lbl">{items.length} material{items.length === 1 ? "" : "s"}</span>
            </div>
            <ul>
              {items.map((it, i) => (
                <li key={i}>{it.label}{it.version ? <span className="msv12-pv">{it.version}</span> : null}</li>
              ))}
            </ul>
            <div className="msv12-pkgf">
              <div className="msv12-discs">
                {recipients.map((a) => (
                  <span className="msv12-disc" key={a.id} title={a.name}>{initialsOf(a.name)}</span>
                ))}
                {extraRecipients > 0 ? <span className="msv12-disc">+{extraRecipients}</span> : null}
              </div>
              <div className="msv12-used"><CountCluster counts={counts} /></div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="msv12-lock" data-msv12="pro-lock">
        <div className="msv12-lockic" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1c130f" strokeWidth="1.4">
            <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" />
          </svg>
        </div>
        <div>
          <div className="msv12-lockt">Bundle your materials into packages</div>
          {/* ⚠️ NO PRICE. The mock writes "£4.99 a month"; the product has no confirmed Pro price
              (PRICING_TIERS holds "Price to be confirmed", locked), so this button sells nothing
              it cannot state. Run report, deviation list. */}
          <p>Name a round, pick its letter, synopsis and sample, and see which agents received it. Part of Pro.</p>
        </div>
        <button type="button" className="msv12-btn msv12-btn--dark" onClick={onSeePro}>See Pro</button>
      </div>
    )}
  </section>
);

/** Re-exported for the page's owed handler — the send statuses in one place. */
export const OWED_SEND_TASK_TYPES: Record<"partial" | "full", string> = {
  partial: "partial_requested",
  full: "full_requested",
};

export { QueryStatus };
