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
import React from "react";
import { useNavigate } from "react-router-dom";
import { V3I, type V3IconName } from "./v3Icons";
import { useScriptAllyDb } from "../../../lib/db";
import { planLine } from "../../../lib/shellSidebar";
import { notifyPrefs } from "../../../lib/accountPrefs";
import { QUIET_WEEKS, quietWeeksOf, quietWeeksPaths } from "../../../lib/queryState";
import { openFeedback } from "../../../lib/feedbackStore";
import { ACCOUNT_ROUTES } from "../../../lib/accountRoutes";
import { showV3Snack } from "./v3Store";
import "./phoneV3.css";


export const LRow: React.FC<{ icon: V3IconName; t: string; s?: string | null; onOpen: () => void; pa3?: string }> = ({ icon, t, s, onOpen, pa3 }) => (
  <button type="button" className="pa3-row pa3-lrow" data-pa3={pa3 ?? "lrow"} onClick={onOpen}>
    <span className="pa3-icw"><V3I n={icon} /></span>
    <span className="pa3-tx"><span className="pa3-t">{t}</span>{s ? <span className="pa3-s">{s}</span> : null}</span>
    <V3I n="chev" className="pa3-ic pa3-chev" />
  </button>
);


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
