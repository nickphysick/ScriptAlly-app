/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — YOU (ref `vLibrary`) and SETTINGS (ref `PAGES.account`). "Progress | Materials", the Settings gear in
 * the header. Every page the retired menu offered is reachable from here, from Settings or from Today.
 *
 * ⚠️ EVERY FIGURE IS AN EXISTING ONE: the Responses page's own counts (`respItems` → `pageCounts`: asked for more,
 *    passed, replies), the packages page's own rate (`packageMetrics`) on the active package (`activePackageId`, the
 *    packages page's reader), the book's own fields. Where the app keeps no figure (a streak), the tile says its name.
 * ⚠️ SETTINGS WRITES THROUGH THE DESKTOP'S OWN WRITES: the notify map merged whole (`updateUserProfile({ notifyPrefs })`,
 *    AccountSettings `saveNotify`) and the quiet window's one leaf (`quietWeeksPaths`). It says, as the desktop does,
 *    that the nudge emails are not sent yet.
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePhoneBandExtra } from "../phoneBandStore";
import { V3HeaderIcon } from "./V3Chrome";
import { V3I, type V3IconName } from "./v3Icons";
import { YOU_PATH } from "../../../lib/phoneV3Nav";
import { useScriptAllyDb } from "../../../lib/db";
import { pageCounts, pctOf, respItems } from "../../../lib/responses";
import { resolveScopedManuscript, planLine } from "../../../lib/shellSidebar";
import { activePackageId } from "../../../lib/queryActions/packages";
import { packageMetrics } from "../../../lib/packageMetrics";
import { buildQcRows } from "../../../lib/qcSummary";
import { notifyPrefs } from "../../../lib/accountPrefs";
import { QUIET_WEEKS, quietWeeksOf, quietWeeksPaths } from "../../../lib/queryState";
import { openFeedback } from "../../../lib/feedbackStore";
import { ACCOUNT_ROUTES } from "../../../lib/accountRoutes";
import { showV3Snack } from "./v3Store";
import "./phoneV3.css";

type YouSeg = "progress" | "materials";

export const LRow: React.FC<{ icon: V3IconName; t: string; s?: string | null; onOpen: () => void; pa3?: string }> = ({ icon, t, s, onOpen, pa3 }) => (
  <button type="button" className="pa3-row pa3-lrow" data-pa3={pa3 ?? "lrow"} onClick={onOpen}>
    <span className="pa3-icw"><V3I n={icon} /></span>
    <span className="pa3-tx"><span className="pa3-t">{t}</span>{s ? <span className="pa3-s">{s}</span> : null}</span>
    <V3I n="chev" className="pa3-ic pa3-chev" />
  </button>
);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const YouV3: React.FC = () => {
  const navigate = useNavigate();
  const { queries, agents, activities, manuscripts, packages, versions } = useScriptAllyDb();
  const [seg, setSeg] = useState<YouSeg>("progress");
  usePhoneBandExtra(YOU_PATH, <V3HeaderIcon label="Settings" pa3="settings" onClick={() => navigate("/account")}><V3I n="gear" /></V3HeaderIcon>, [navigate]);
  const nowMs = useMemo(() => Date.now(), [queries]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => buildQcRows(queries, agents, activities, nowMs), [queries, agents, activities, nowMs]);
  const c = useMemo(() => pageCounts(respItems(rows), rows), [rows]);
  const asked = pctOf(c.more, c.sent);
  const ms = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    return resolveScopedManuscript(manuscripts, stored);
  }, [manuscripts]);
  const pkgs = useMemo(() => (packages ?? []).filter((p) => p.manuscriptId === ms?.id), [packages, ms]);
  const activeId = ms ? activePackageId(ms, packages ?? []) : null;
  const active = pkgs.find((p) => p.id === activeId) ?? null;
  const am = active ? packageMetrics(active.id, queries) : null;
  const vName = (id: string | null | undefined) => (id ? (versions ?? []).find((v) => v.id === id)?.versionName ?? null : null);
  const words = ms?.wordCount ? `${ms.wordCount.toLocaleString("en-GB")} words` : null;

  return (
    <div className="pa3 pa3-you" data-pa3="you" data-seg={seg}>
      <div className="pa3-page">
        <div className="pa3-seg" role="tablist">
          <button type="button" role="tab" aria-selected={seg === "progress"} className={seg === "progress" ? "on" : ""} data-pa3="yseg" data-k="progress" onClick={() => setSeg("progress")}>Progress</button>
          <button type="button" role="tab" aria-selected={seg === "materials"} className={seg === "materials" ? "on" : ""} data-pa3="yseg" data-k="materials" onClick={() => setSeg("materials")}>Materials</button>
        </div>
        {seg === "progress" ? (<>
          <button type="button" className="pa3-show" data-pa3="going" onClick={() => navigate("/queries/analytics")}>
            <small>How it’s going</small>
            <div className="pa3-in"><b data-pa3="going-figure">{plural(c.more, "request")} from {plural(c.sent, "query", "queries")}</b><span>{plural(c.replies, "agent has", "agents have")} replied so far. See the full picture.</span></div>
          </button>
          <div className="pa3-tiles" style={{ marginTop: 12 }}>
            <button type="button" className="pa3-tile" data-pa3="tile" data-k="responses" onClick={() => navigate("/queries/responses")}><V3I n="mail" /><b>Responses</b><span>{plural(c.replies, "reply", "replies")}</span></button>
            <button type="button" className="pa3-tile" data-pa3="tile" data-k="analytics" onClick={() => navigate("/queries/analytics")}><V3I n="chart" /><b>Analytics</b><span>{asked != null ? `${asked}% asked for more` : "No replies yet"}</span></button>
            <button type="button" className="pa3-tile" data-pa3="tile" data-k="wall" onClick={() => navigate("/queries/responses#wall")}><V3I n="wall" /><b>Wall of no</b><span>{plural(c.passed, "pass", "passes")}</span></button>
            <button type="button" className="pa3-tile" data-pa3="tile" data-k="goals" onClick={() => navigate("/goals")}><V3I n="flame" /><b>Streaks and goals</b><span>Your weekly goal</span></button>
          </div>
        </>) : (<>
          <div className="pa3-card">
            <button type="button" className="pa3-book" data-pa3="book" onClick={() => navigate("/manuscripts")}>
              <span className="pa3-cover">{ms?.title ?? ""}</span>
              <span className="pa3-tx" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ font: "400 19px var(--pa-type)", display: "block" }}>{ms?.title?.trim() || "Your book"}</span>
                <span style={{ fontSize: 13.5, color: "var(--pa-muted)" }}>{[ms?.genre, words].filter(Boolean).join(" · ")}</span>
              </span>
              <V3I n="chev" className="pa3-ic pa3-chev" />
            </button>
          </div>
          <div className="pa3-sec"><h2 className="pa3-h2">Going out with new queries</h2></div>
          {active && am ? (
            <button type="button" className="pa3-show" data-pa3="active-package" onClick={() => navigate(`/queries/packages?pkg=${encodeURIComponent(active.id)}`)}>
              <b style={{ fontSize: 16 }}>{active.packageName}</b><br />
              <small>{[vName(active.queryLetterVersionId), vName(active.synopsisVersionId), vName(active.samplePagesVersionId)].filter(Boolean).join(" · ")}</small>
              <div className="pa3-in"><b>{am.requests ? `${plural(am.requests, "request")} from ${am.sent}` : `No requests from ${am.sent}`}</b><span>Sent to {plural(am.sent, "agent")}</span></div>
            </button>
          ) : <div className="pa3-card"><div className="pa3-empty">No package is set for new queries.</div></div>}
          <div className="pa3-sec"><h2 className="pa3-h2">Everything you send</h2></div>
          <div className="pa3-card">
            <LRow icon="box" t="Packages" s={pkgs.length ? `${plural(pkgs.length, "set")} of letter, synopsis and version` : null} onOpen={() => navigate("/queries/packages")} />
            <LRow icon="file" t="Query letters" onOpen={() => navigate("/manuscripts#materials")} />
            <LRow icon="note" t="Synopses and comps" onOpen={() => navigate("/manuscripts#comps")} />
          </div>
        </>)}
      </div>
    </div>
  );
};

/* ── Settings (ref `PAGES.account`) ── */
export const SettingsV3: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile, updateUserPaths, logout } = useScriptAllyDb();
  const notify = notifyPrefs(currentUser?.notifyPrefs);
  const quiet = quietWeeksOf(currentUser);
  const name = (currentUser?.name ?? "").trim();
  const saveNudges = async (v: boolean) => {
    try { await updateUserProfile({ notifyPrefs: { ...notify, nudges: v } }); showV3Snack({ msg: v ? "Nudge reminders on" : "Nudge reminders off" }); }
    catch { showV3Snack({ msg: "Couldn’t save that. Try again?" }); }
  };
  const saveQuiet = async (w: number) => {
    try { await updateUserPaths(quietWeeksPaths(w)); showV3Snack({ msg: "Gone quiet setting saved" }); }
    catch { showV3Snack({ msg: "Couldn’t save the gone quiet setting. Try again?" }); }
  };
  return (
    <div className="pa3 pa3-settings" data-pa3="settings-page">
      <div className="pa3-page flat">
        <div className="pa3-card">
          <button type="button" className="pa3-row" data-pa3="writer" onClick={() => navigate("/plans")}>
            <span className="pa3-seal">{(name[0] ?? "?").toUpperCase()}</span>
            <span className="pa3-tx"><span className="pa3-t">{name || "You"}</span><span className="pa3-s">{planLine(currentUser?.plan).label}</span></span>
            <V3I n="chev" className="pa3-ic pa3-chev" />
          </button>
        </div>
        <div className="pa3-sec"><h2 className="pa3-h2">Reminders</h2></div>
        <div className="pa3-card">
          <div className="pa3-kv">
            <span style={{ color: "var(--pa-ink)" }}>Nudge reminders by email</span>
            <button type="button" className={`pa3-sw${notify.nudges ? " on" : ""}`} aria-pressed={notify.nudges} aria-label="Nudge reminders by email" data-pa3="nudge-emails" onClick={() => void saveNudges(!notify.nudges)} />
          </div>
          <div className="pa3-kv">
            <span style={{ color: "var(--pa-ink)" }}>Call a query gone quiet after</span>
            <label className="pa3-pill q" style={{ height: 32, position: "relative" }}>
              {quiet} weeks
              <select data-pa3="quiet-weeks" aria-label="Call a query gone quiet after" value={quiet} onChange={(e) => void saveQuiet(Number(e.target.value))}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%" }}>
                {QUIET_WEEKS.map((w) => <option key={w} value={w}>{w} weeks</option>)}
              </select>
            </label>
          </div>
        </div>
        <p className="pa3-note" data-pa3="inert">QueryHawk doesn’t send these emails yet. What you choose here is stored and will be honoured from the day it does.</p>
        <div className="pa3-sec"><h2 className="pa3-h2">Help and tools</h2></div>
        <div className="pa3-card">
          <LRow icon="upload" t="Import queries" s="Bring a spreadsheet across" onOpen={() => navigate("/import")} />
          <LRow icon="help" t="Help centre" onOpen={() => navigate("/help")} />
          <LRow icon="chat" t="Give feedback" onOpen={() => openFeedback()} />
        </div>
        <div className="pa3-sec"><h2 className="pa3-h2">Your account</h2></div>
        <div className="pa3-card">
          {ACCOUNT_ROUTES.map((r) => <LRow key={r.path} icon="gear" t={r.label} onOpen={() => navigate(r.path)} pa3="acct-row" />)}
          <LRow icon="out" t="Sign out" onOpen={() => void logout()} pa3="sign-out" />
        </div>
      </div>
    </div>
  );
};
