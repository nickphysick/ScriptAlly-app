/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5 — MATERIALS, the dock's fourth tab (`/materials` below 768px; design-refs/phone-app-v5/phone-materials-v1.html).
 * Phase A gave it the strip; Phase F the page: the header — "Materials", "What goes out with {book}" and the package
 * going out with new queries, drawn as a banded bundle with its result — then the tabs Packages · Letters · Versions ·
 * Comps, pinned under the slim bar as Today's are (V5TabStrip), the chosen one remembered for the session.
 *
 * ⚠️ THE HEADER'S PACKAGE IS THE ONE NEW QUERIES USE: `model.active` = packageMetrics `resolveActivePackage`, the same
 *    reader the log journey's `activePackageId` goes through. Its result is packageMetrics' own (`packageMetrics`). With
 *    none set: the bundle's outline and "Choose what goes out with new queries", a chooser that writes through
 *    Packages' own `makeActive` (db `setActivePackage`).
 * ⚠️ EVERY PAGE THE TABS OPEN IS STILL PACKAGES' OWN, at `/queries/packages?pkg=` / `?build=` / `?mat=` / `?ver=` /
 *    `?comps=` / `?compsin=` / `?all=` / `?edit=`, drawn by the copy of PackagesPhone in the packages slot (App.tsx), so
 *    every deep link keeps landing. Phase A's Packages `section` bodies are retired (Phase F's tabs replace them).
 *
 * `/queries/packages`, `/materials/letters`, `/manuscripts/comps`, `/manuscripts/versions` and `/manuscripts#materials`
 * (and the book page's other section hashes) land here on the matching tab (lib/phoneV5 `phoneV5Redirect`, via `?tab=`).
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "../../shell/mobileChrome";
import { useScriptAllyDb } from "../../../lib/db";
import { MATERIALS_PATH } from "../../../lib/phoneV3Nav";
import { MAT_TAB_KEY, MAT_TABS, isMatTab, pkgResult, pkgStats, readTab, saveTab, versionsLocked, type MatTab } from "../../../lib/phoneV5";
import { canMakeActive } from "../../../lib/packagesV40";
import { usePk26Model } from "../../packages/v26/usePk26Model";
import { PACKAGES_PATH } from "../../packages/phone/PackagesPhone";
import { MaterialsLock } from "../../letters/MaterialsLock";
import { MobileSheet } from "../../shell/MobileSheet";
import { CAST, Chev, IconBtn, Link4 } from "../v4/V4Parts";
import { openV3 } from "../v3/v3Store";
import { V5TabStrip } from "./V5Tabs";
import { Bundle } from "./MatPartsV5";
import { CompsTabV5, LettersTabV5, PackagesTabV5, VersionsTabV5 } from "./MatTabsV5";
import "../v4/phoneV4.css";
import "./phoneV5.css";

export const MaterialsV5: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { queries, entitlement } = useScriptAllyDb();
  const model = usePk26Model();
  const [tab, setTab] = useState<MatTab>(() => readTab(MAT_TAB_KEY, isMatTab, "packages"));
  const pick = (t: MatTab) => { setTab(t); saveTab(MAT_TAB_KEY, t); };
  const [reveal, setReveal] = useState(0);
  const [choosing, setChoosing] = useState(false);
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

  /* a page of Packages' own, pushed: the back gesture comes back here (PackagesPhone's `back` reads `pk2`) */
  const open = (key: string, value: string) => {
    const n = new URLSearchParams(); n.set(key, value);
    navigate({ pathname: PACKAGES_PATH, search: `?${n}` }, { state: { pk2: true } });
  };

  const ms = model.activeMs;
  const title = ms?.title?.trim();
  const stats = useMemo(() => pkgStats(model.msPkgs, queries), [model.msPkgs, queries]);
  const act = model.active;
  const actResult = act ? pkgResult(stats.get(act.id) ?? { sent: 0, requests: 0 }) : null;
  const choosable = model.live.filter((p) => canMakeActive(p, act?.id));
  const locked = versionsLocked(entitlement, import.meta.env.MODE, () => { try { return window.sessionStorage.getItem("sa.dev.versionsFree"); } catch { return null; } });

  const body = tab === "packages" ? <PackagesTabV5 model={model} stats={stats} open={open} />
    : tab === "letters" ? <LettersTabV5 model={model} open={open} />
    : tab === "versions" ? <VersionsTabV5 model={model} locked={locked} open={open} onPlans={() => navigate("/plans")} />
    : <CompsTabV5 model={model} />;

  return (
    <div className="pa4 pa5 pa5-mat" data-pa5="materials" data-tab={tab} data-ms={ms?.id ?? ""}>
      <header className="pa5-hd pa5m-hd" data-pa5="mat-hd" data-pa4="materials-hero">
        <img className="pa5-hd-sh" src={CAST.shadow} alt="" />
        <div className="pa5-hd-t">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="pa5-hd-h">Materials</h1>
            <div className="pa4-s pa5-hd-day" data-pa5="mat-sub">{title ? `What goes out with ${title}` : "What goes out with your queries"}</div>
          </div>
          <span style={{ marginRight: -12 }}><IconBtn label="Search" n="search" pa4="search" onClick={() => openV3({ type: "search" })} /></span>
        </div>
        {act && actResult ? (
          <button type="button" className="pa5m-hdpk" data-pa5="mat-header-pkg" data-id={act.id} data-sent={actResult.sent} data-requests={actResult.more} onClick={() => open("pkg", act.id)}>
            <Bundle name={act.packageName} />
            <span className="pa5m-hdr">
              <span className="pa4-s">Going out with new queries</span>
              {actResult.of
                ? <><b className="pa5m-hdn">{actResult.big} <small>{actResult.of}</small></b><span className="pa4-s pa5m-hdw">asked for more</span></>
                : <b className="pa5m-hdn none">{actResult.big}</b>}
            </span>
          </button>
        ) : (
          <button type="button" className="pa5m-hdpk" data-pa5="mat-header-pkg" data-none="1"
            onClick={() => (choosable.length ? setChoosing(true) : open("build", "new"))}>
            <Bundle name="" outline />
            <span className="pa5m-hdr"><b className="pa5m-hdc">Choose what goes out with new queries</b><Chev /></span>
          </button>
        )}
      </header>
      <V5TabStrip page="materials" tabs={MAT_TABS} value={tab} onPick={pick} label="Materials" reveal={reveal}>
        <MaterialsLock page="packages">{body}</MaterialsLock>
      </V5TabStrip>

      <MobileSheet open={choosing} onClose={() => setChoosing(false)} ariaLabel="Choose what goes out with new queries" pa={{ height: "auto", white: true }}>
        <div className="pa4-layer pa5m-pick" data-pa5="mat-choose">
          <h2 className="pa5m-h">What goes out with new queries?</h2>
          {choosable.map((p) => {
            const r = pkgResult(stats.get(p.id) ?? { sent: 0, requests: 0 });
            return (
              <button key={p.id} type="button" className="pa4-tap" data-pa5="mat-choose-row" data-id={p.id}
                onClick={() => { setChoosing(false); void model.makeActive(p); }}>
                <span className="pa4-x"><b>{p.packageName}</b><span className="pa4-s">{r.words}</span></span><Chev />
              </button>
            );
          })}
          <Link4 rule pa4="mat-choose-new" onClick={() => { setChoosing(false); open("build", "new"); }}>New package</Link4>
        </div>
      </MobileSheet>
    </div>
  );
};

/** `/materials` chooses its page by width: the phone's Materials tab below 768px; at 768px and up exactly what the slot
 *  held before (the desktop never reaches `/materials` itself — it is sent to the dashboard, as before v5) */
export const MaterialsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  useIsMobile() ? <MaterialsV5 /> : <>{children}</>;
