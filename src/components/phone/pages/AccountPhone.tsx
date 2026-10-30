/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SETTINGS, PLAN AND HELP ON A PHONE (Phone app v2, Part 8B; ref design-refs/phone-app-v2/src/overlays.js
 * `PAGES.settings`, `PAGES.plan`, `PAGES.help`, inside the page band).
 *
 * ⚠️ NOTHING HERE WRITES. Settings is an index of the desktop's own sections (`ACCOUNT_ROUTES`, `SECTION_BANDS`), grouped
 * as the ref groups them; each opens that section's own page, styled for the phone (`settingsPhone.css`), so every
 * setting, its writer and its receipt are the desktop's. Plan states the plan facts the app already holds
 * (`planLine`, `PLAN_ROWS`, the Smart Import line) — no new upsell. Help shows the dashboard's own getting-started
 * progress (`gettingStartedRows`), the page guides (`GUIDE_PAGES` / `guideCard`, opened as Help opens them) and the
 * articles by area (`HELP_AREAS`, `HELP_ARTICLE_LIST`), with the Help Centre's own search (`searchHelp`).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { ACCOUNT_ROUTES, type AccountSectionId } from "../../../lib/accountRoutes";
import { SECTION_BANDS } from "../../settings/sectionBands";
import { planLine } from "../../../lib/shellSidebar";
import { PLAN_ROWS } from "../../../lib/planComparison";
import { smartImportLine } from "../../../lib/smartImportEntitlement";
import { useSmartImportEntitlement } from "../../../lib/useSmartImportEntitlement";
import { dayMonth } from "../../../lib/dates";
import { gettingStartedRows } from "../../../lib/dashEmpty";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { GUIDE_PAGES, guideCard } from "../../../lib/pageChecklist";
import { readSkipped, requestGuideOpen } from "../../../lib/guideHub";
import { useGuideFacts } from "../../help/helpShared";
import { HELP_ARTICLE_LIST } from "../../../content/help/articles";
import { HELP_AREAS } from "../../../content/help/model";
import { searchHelp } from "../../../content/help/search";
import { openFeedback } from "../../../lib/feedbackStore";
import { UserPlan } from "../../../types";
import { QM1_SLOTS } from "../phoneArt";
import { PhoneArt } from "../PhoneArtSpot";
import { PI } from "../phoneIcons";
import "./pagesPhone.css";

const Chev = () => <span className="pa-chev" aria-hidden="true">{PI.chev}</span>;
const ICON: Record<AccountSectionId, React.ReactNode> = {
  profile: PI.person, security: PI.shield, plan: PI.card, notifications: PI.bell, preferences: PI.sliders, tasks: PI.todo, data: PI.data,
};
/** the ref's three groups; every section the desktop has is in one of them */
export const SETTINGS_GROUPS: AccountSectionId[][] = [["profile", "security", "plan"], ["notifications", "preferences", "tasks"], ["data"]];

/* ══ Settings: the index ══ */
export const SettingsPhone: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="pa-pg" data-pa="settings">
      <div className="pa-pgbody">
        {SETTINGS_GROUPS.map((g, i) => (
          <div key={i} className="pa-group pa-setgroup" data-pa="set-group">
            {g.map((id) => {
              const r = ACCOUNT_ROUTES.find((x) => x.id === id)!;
              return (
                <button key={id} type="button" className="pa-li" data-pa="set-row" data-k={id} onClick={() => navigate(r.path)}>
                  <span className="pa-ico">{ICON[id]}</span>
                  <span className="pa-lt">{r.label}<span className="pa-sub">{SECTION_BANDS[id].sub}</span></span>
                  <Chev />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══ Plan & billing ══ */
export const PlanPhone: React.FC = () => {
  const { currentUser } = useScriptAllyDb();
  const navigate = useNavigate();
  const ent = useSmartImportEntitlement();
  const pro = currentUser?.plan === UserPlan.PRO;
  const smart = smartImportLine(ent, (iso) => dayMonth(iso));
  return (
    <div className="pa-pg" data-pa="plan">
      <div className="pa-pgbody">
        <div className="pa-card pa-plancard" data-pa="plan-card">
          <img className="pa-planimg" src="/images/tier-founding.png" alt="" draggable={false} />
          <div className="pa-plant">Founding writer <span className="pa-lock" data-pa="founding-chip">Founding</span></div>
          <p className="pa-sub pa-plansub" data-pa="plan-line">{planLine(currentUser?.plan).label}</p>
        </div>
        <div className="pa-gl">What your plan includes</div>
        <div className="pa-group" data-pa="plan-rows">
          {PLAN_ROWS.map((r) => {
            const c = pro ? r.pro : r.free;
            return (
              <div key={r.label} className="pa-li" data-pa="plan-row" data-k={r.label}>
                <span className="pa-ico pa-planico">{c.kind === "absent" ? null : PI.check}</span>
                <span className="pa-lt">{r.label}</span>
                <span className="pa-rt">{c.kind === "figure" ? c.text : c.kind === "included" ? "Included" : "Not on this plan"}</span>
              </div>
            );
          })}
          <div className="pa-li" data-pa="plan-smart"><span className="pa-ico">{PI.upload}</span><span className="pa-lt">Smart Import<span className="pa-sub">{smart.note}</span></span><span className="pa-rt">{smart.tag}</span></div>
        </div>
        <div className="pa-gl">More</div>
        <div className="pa-group">
          <button type="button" className="pa-li" data-pa="plan-account" onClick={() => navigate("/account/plan")}><span className="pa-ico">{PI.card}</span><span className="pa-lt">Plan & billing<span className="pa-sub">{SECTION_BANDS.plan.sub}</span></span><Chev /></button>
        </div>
      </div>
    </div>
  );
};

/* ══ Help centre ══ */
export const HelpPhone: React.FC = () => {
  const navigate = useNavigate();
  const { manuscripts, agents, queries, versions } = useScriptAllyDb();
  const { user, counts } = useGuideFacts();
  const [q, setQ] = useState("");
  const hits = useMemo(() => (q.trim() ? searchHelp(q) : []), [q]);
  const active = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
  }, [manuscripts]);
  const gs = useMemo(() => gettingStartedRows({ manuscripts, agentCount: agents.length, queryCount: queries.length, versions: versions ?? [], activeManuscript: active }), [manuscripts, agents.length, queries.length, versions, active]);
  const gsDone = gs.filter((r) => r.done).length;
  const cards = GUIDE_PAGES.map((g) => guideCard(g, user, counts, readSkipped(g.page)));
  return (
    <div className="pa-pg" data-pa="help">
      <div className="pa-pgbody">
        <label className="pa-hsearch" data-pa="help-search">
          {PI.search}
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guides" aria-label="Search the guides" />
        </label>
        {hits.length ? (
          <div className="pa-group" data-pa="help-hits">
            {hits.slice(0, 8).map((h) => <button key={h.slug} type="button" className="pa-li" onClick={() => navigate(`/help/${h.slug}`)}><span className="pa-ico">{PI.note}</span><span className="pa-lt">{h.title}</span><Chev /></button>)}
          </div>
        ) : null}
        <button type="button" className="pa-card pa-gscard" data-pa="help-gs" data-done={gsDone} data-total={gs.length} onClick={() => navigate("/dashboard")}>
          <PhoneArt art={QM1_SLOTS.quill} size={68} className="pa-gsart" />
          <span className="pa-gscol">
            <b>Getting started</b>
            <span className="pa-barh" aria-hidden="true"><i style={{ width: `${Math.round((gsDone / Math.max(1, gs.length)) * 100)}%` }} /></span>
            <span className="pa-sub">{gsDone} of {gs.length} steps done</span>
          </span>
        </button>
        <div className="pa-gl">Page guides</div>
        <div className="pa-group" data-pa="help-guides">
          {cards.map((c) => (
            <button key={c.page} type="button" className="pa-li" data-pa="help-guide" data-k={c.page} onClick={() => { navigate(c.route); requestGuideOpen(c.page); }}>
              <span className="pa-ico">{PI.note}</span>
              <span className="pa-lt">{c.page}<span className="pa-sub">{c.finished ? "Learned" : `${c.n} of ${c.total} · ${c.n ? "Up next" : "Starts with"}: ${c.next ?? c.first}`}</span></span>
              <Chev />
            </button>
          ))}
        </div>
        {HELP_AREAS.map((a) => {
          const list = HELP_ARTICLE_LIST.filter((x) => x.area === a.id);
          return list.length ? (
            <React.Fragment key={a.id}>
              <div className="pa-gl">{a.heading}</div>
              <div className="pa-group" data-pa="help-area" data-k={a.id}>
                {list.map((x) => <button key={x.slug} type="button" className="pa-li" data-pa="help-article" onClick={() => navigate(`/help/${x.slug}`)}><span className="pa-ico">{PI.note}</span><span className="pa-lt">{x.title}</span><Chev /></button>)}
              </div>
            </React.Fragment>
          ) : null;
        })}
        <div className="pa-gl">Still stuck?</div>
        <div className="pa-group">
          <button type="button" className="pa-li" data-pa="help-ask" onClick={() => openFeedback()}><span className="pa-ico">{PI.chat}</span><span className="pa-lt">Ask us</span><Chev /></button>
        </div>
      </div>
    </div>
  );
};
