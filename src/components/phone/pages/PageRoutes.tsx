/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The menu pages choose their page by width, as `/todo` does (TodoRoute): the desktop pages from 768px up, the phone's
 * own pages (Phone app v2, Part 7) below it. One is mounted at a time.
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { useIsMobile } from "../../shell/mobileChrome";
import { ResponsesPage } from "../../responses/ResponsesPage";
import { ResponsesPhone } from "./ResponsesPhone";
import { ManuscriptPage } from "../../manuscripts/v12/ManuscriptPage";
import { ManuscriptPhone } from "./ManuscriptPhone";
import { QueryAnalytics } from "../../QueryAnalytics";
import { AnalyticsPhone } from "./AnalyticsPhone";
import { GoalsPhone } from "./GoalsPhone";
import { AccountSettings } from "../../AccountSettings";
import { PlansPage } from "../../PlansPage";
import { HelpCentre } from "../../HelpCentre";
import { HelpPhone, PlanPhone, SettingsPhone } from "./AccountPhone";
import type { AccountSectionId } from "../../../lib/accountRoutes";
import "./settingsPhone.css";

export const ResponsesRoute: React.FC<React.ComponentProps<typeof ResponsesPage>> = (props) =>
  useIsMobile() ? <ResponsesPhone /> : <ResponsesPage {...props} />;

/** ⚠️ READS the manuscripts page's component to choose it; no Manuscripts file is edited (Part 7's rule) */
export const ManuscriptRoute: React.FC<React.ComponentProps<typeof ManuscriptPage>> = (props) =>
  useIsMobile() ? <ManuscriptPhone /> : <ManuscriptPage {...props} />;

export const AnalyticsRoute: React.FC<React.ComponentProps<typeof QueryAnalytics>> = (props) =>
  useIsMobile() ? <AnalyticsPhone /> : <QueryAnalytics {...props} />;

/** Streaks & goals has no desktop page yet: a computer goes to the dashboard (listed for Nick) */
export const GoalsRoute: React.FC = () => (useIsMobile() ? <GoalsPhone /> : <Navigate to="/dashboard" replace />);

/** Settings: on a phone the bare `/account` is the index; a section is the desktop's own page inside `.pa-set`, which
 *  the phone stylesheet dresses as grouped lists — every setting and its writer unchanged */
export const SettingsRoute: React.FC<{ path: string; section: AccountSectionId } & Omit<React.ComponentProps<typeof AccountSettings>, "section">> = ({ path, section, ...rest }) => {
  const phone = useIsMobile();
  if (!phone) return <AccountSettings section={section} {...rest} />;
  return path === "/account" ? <SettingsPhone /> : <div className="pa-set" data-pa="settings-section" data-k={section}><AccountSettings section={section} {...rest} /></div>;
};

export const PlansRoute: React.FC = () => (useIsMobile() ? <PlanPhone /> : <div className="sv2-focuscol"><PlansPage /></div>);

/** Help: the phone's own home at `/help`; an article (`/help/{slug}`) is the Help Centre's own page */
export const HelpRoute: React.FC<{ path: string }> = ({ path }) => (useIsMobile() && path.replace(/\/+$/, "") === "/help" ? <HelpPhone /> : <HelpCentre />);
