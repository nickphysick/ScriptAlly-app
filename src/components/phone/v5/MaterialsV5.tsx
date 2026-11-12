/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A — MATERIALS, the dock's fourth tab (`/materials` below 768px). A header, then the tab strip
 * Packages · Letters · Versions · Comps, which pins under the slim bar as Today's does. For now each tab's body is the
 * existing phone Packages page's own part (PackagesPhone `section`): the packages with the one going out with new
 * queries, the letters and synopses, the versions (behind the same gate as before), the comps. Every page they open is
 * still Packages' own, at `/queries/packages?pkg=` / `?build=` / `?mat=` / `?ver=` / `?comps=` / `?edit=` …, so every
 * deep link keeps working. Phase F rebuilds the header and the four bodies (design-refs/phone-app-v5/phone-materials-v1.html).
 *
 * `/queries/packages`, `/materials/letters`, `/manuscripts/comps`, `/manuscripts/versions` and `/manuscripts#materials`
 * (and the book page's other section hashes) land here on the matching tab (lib/phoneV5 `phoneV5Redirect`, via `?tab=`).
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "../../shell/mobileChrome";
import { useScriptAllyDb } from "../../../lib/db";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { MATERIALS_PATH } from "../../../lib/phoneV3Nav";
import { MAT_TAB_KEY, MAT_TABS, isMatTab, readTab, saveTab, type MatTab } from "../../../lib/phoneV5";
import { PackagesPhone } from "../../packages/phone/PackagesPhone";
import { MaterialsLock } from "../../letters/MaterialsLock";
import { Hero, IconBtn } from "../v4/V4Parts";
import { openV3 } from "../v3/v3Store";
import { V5TabStrip } from "./V5Tabs";
import "../v4/phoneV4.css";
import "./phoneV5.css";

export const MaterialsV5: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { manuscripts } = useScriptAllyDb();
  const [tab, setTab] = useState<MatTab>(() => readTab(MAT_TAB_KEY, isMatTab, "packages"));
  const pick = (t: MatTab) => { setTab(t); saveTab(MAT_TAB_KEY, t); };
  const [reveal, setReveal] = useState(0);
  /* the address names a tab (`?tab=`): choose it, then drop it from the address */
  useEffect(() => {
    if (loc.pathname !== MATERIALS_PATH) return;
    const p = new URLSearchParams(loc.search);
    const asked = p.get("tab");
    if (!isMatTab(asked)) return;
    setTab(asked); saveTab(MAT_TAB_KEY, asked); setReveal((n) => n + 1);
    p.delete("tab");
    navigate({ pathname: loc.pathname, search: p.toString() ? `?${p}` : "", hash: loc.hash }, { replace: true });
  }, [loc.pathname, loc.search, loc.hash, navigate]);

  const ms = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    return resolveScopedManuscript(manuscripts, stored) ?? null;
  }, [manuscripts]);
  const title = ms?.title?.trim();
  const corner = <IconBtn label="Search" n="search" pa4="search" onClick={() => openV3({ type: "search" })} />;

  return (
    <div className="pa4 pa5 pa5-mat" data-pa5="materials" data-tab={tab}>
      <Hero pa4="materials-hero" kick="Materials" head={title ? `What goes out with ${title}` : "What goes out with your queries"} corner={corner} />
      <V5TabStrip page="materials" tabs={MAT_TABS} value={tab} onPick={pick} label="Materials" reveal={reveal}>
        {/* ⚠️ `active={false}`: this copy draws the hub's parts only. The pages they open are drawn by the copy in the
            packages slot (App.tsx), which is the one active at `/queries/packages?…` */}
        <MaterialsLock page="packages"><PackagesPhone active={false} section={tab} /></MaterialsLock>
      </V5TabStrip>
    </div>
  );
};

/** `/materials` chooses its page by width: the phone's Materials tab below 768px; at 768px and up exactly what the slot
 *  held before (the desktop never reaches `/materials` itself — it is sent to the dashboard, as before v5) */
export const MaterialsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  useIsMobile() ? <MaterialsV5 /> : <>{children}</>;
