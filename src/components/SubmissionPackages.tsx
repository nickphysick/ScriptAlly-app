/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Submission packages v62 (18 Nov; ref design-refs/submission-packages-v62/) ══════════════════════════════════════
 * "Send a few, see what comes back, change one thing, send again." Each package is a record of exactly what went out,
 * and of what came back for it. Top to bottom:
 *   the navy header (Pk62Header) · the founding writer's first-visit note (once; then the Pro tag) ·
 *   the desk: "Your packages" (Pk62List) beside the open package (Pk62Open) and, once it has gone out, "What came
 *   back" (Pk62Back) · "All your packages, side by side" (Pk62Table).
 *   Day one (no package at all): the header and one framed card holding the How it works storyboard (Pk62DayOne).
 * Every rule and word is lib/packagesV62's; the data is usePk62's, joined from the packages model (usePk26Model).
 *
 * ⚠️ /manuscripts/packages REDIRECTS HERE with its query string (lib/packagesRoute), so every deep link still works:
 *    `?pkg={id}` opens that package (a retired one shows the retired list), `?tab=builder` and `?new=1` open New package
 *    (`&version={id}` puts that version in the package it makes), `?tab=tracking` scrolls to the table, and
 *    `?tab=let|syn|ver` opens that piece's list on the open package when it has not been sent.
 * ⚠️ OPEN TO ALL (D7). Nothing on this page reads the plan. The founding writer's note and the Pro tag read only
 *    whether the plan came from the founding offer, and the note's one stored flag (todoPrefs.packages.foundingNoteHidden).
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every Escape layer and overlay here is gated on `routeActive`.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { usePk26Model } from "./packages/v26/usePk26Model";
import { useScriptAllyDb } from "../lib/db";
import { packagesViaFounding } from "../lib/entitlements";
import { FOUNDING_NOTE_PATH, foundingNoteHidden } from "../lib/packagesV41";
import { libTabFromParam } from "../lib/packagesV38";
import { FIRST_BUTTON, NEW_BUTTON, headerTitle, isFinished } from "../lib/packagesV62";
import type { SubmissionPackage } from "../types";
import { Pk26Drawer, type DrawerView as MatView } from "./packages/v26/Pk26Drawer";
import { usePk62 } from "./packages/v62/usePk62";
import { usePk62Actions } from "./packages/v62/usePk62Actions";
import { Pk62Header, Pk62Note, Pk62Slim } from "./packages/v62/Pk62Header";
import { Pk62List } from "./packages/v62/Pk62List";
import { Pk62Open, type StepKey } from "./packages/v62/Pk62Open";
import { Pk62Back } from "./packages/v62/Pk62Back";
import { Pk62Table } from "./packages/v62/Pk62Table";
import { Pk62DayOne, Pk62How } from "./packages/v62/Pk62Story";
import { Pk62Drawer, type DrawerView } from "./packages/v62/Pk62Drawer";
/* the material drawer (a new letter, synopsis or version) is v26's, dressed by these */
import "./packages/v26/pk40.generated.css";
import "./packages/v26/pk26.css";
import "./packages/v26/pk38.generated.css";
import "./packages/v26/pk38.css";
import "./packages/v26/pk39.generated.css";
import "./packages/v26/pk39.css";
import "./packages/v26/pk391.generated.css";
import "./packages/v26/pk391.css";
import "./packages/v41/pk41.css";
/* the Query Centre's navy header and collapsed bar (the sheets they are dressed by, as Query letters imports them) */
import "./queries/centre/qcv1531.css";
import "./queries/centre/qcv1534.css";
import "./queries/centre/qcv154.css";
import "./queries/centre/qcv156.css";
import "./letters/queryLetters.css";
import "./packages/v43/pk43.css";
import "./packages/v62/pk62.css";

export const SubmissionPackages: React.FC<{ active?: boolean; onNavigate?: (tab: string, sub?: string) => void }> = ({ active: routeActive = true }) => {
  const model = usePk26Model();
  const { activeMs, live, msPkgs, msId, collectionsReady, active } = model;
  const d = usePk62(model);
  const act = usePk62Actions(model);
  const location = useLocation();
  const navigate = useNavigate();

  /* §5.2 — the founding writer's note, once; then the Pro tag (one stored flag on the user) */
  const { currentUser, entitlement, updateUserPaths } = useScriptAllyDb();
  const founding = packagesViaFounding(entitlement);
  const dismissed = foundingNoteHidden(currentUser);
  const showNote = founding && !dismissed;
  const proTag = founding && dismissed;

  const [curId, setCurId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [mat, setMat] = useState<MatView | null>(null);
  const [how, setHow] = useState(false);
  /** the list a package opens with: after New package, its version list; from a deep link, that piece's */
  const [firstStep, setFirstStep] = useState<{ id: string | null; step: StepKey } | null>(null);
  /** a version from Versions' "Add to a package" (`?new=1&version=`), put into the package New package makes */
  const [withVersion, setWithVersion] = useState<string | null>(null);
  const [stamp, setStamp] = useState(false);
  useEffect(() => { if (!stamp) return undefined; const t = window.setTimeout(() => setStamp(false), 600); return () => window.clearTimeout(t); }, [stamp]);

  const retired = useMemo(() => msPkgs.filter((p) => p.status === "Retired"), [msPkgs]);
  const going = active && live.some((p) => p.id === active.id) ? active : null;
  const options = useMemo(() => live.filter(isFinished), [live]);
  /* the open package: the one chosen (a retired one only while the retired list shows), else the one going out, else the first */
  const current = useMemo<SubmissionPackage | null>(() => {
    const chosen = msPkgs.find((p) => p.id === curId) ?? null;
    if (chosen && (chosen.status !== "Retired" || showRetired)) return chosen;
    return going ?? live[0] ?? (showRetired ? retired[0] ?? null : null);
  }, [msPkgs, curId, showRetired, going, live, retired]);
  const ci = current ? d.info(current) : null;

  /* a different manuscript is a different page */
  const lastMs = useRef(msId);
  useEffect(() => {
    if (lastMs.current && lastMs.current !== msId) { setCurId(null); setDrawer(null); setMat(null); setShowRetired(false); setFirstStep(null); }
    lastMs.current = msId;
  }, [msId]);

  /* the right column says, politely, which package is open */
  const [said, setSaid] = useState("");
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    const id = current?.id ?? null;
    if (lastOpen.current && id && lastOpen.current !== id) setSaid(`${current!.packageName} is open.`);
    lastOpen.current = id;
  }, [current]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const part = (k: string) => rootRef.current?.querySelector<HTMLElement>(`[data-pk62="${k}"]`) ?? null;
  const toDesk = (focusRow: string | null) => {
    requestAnimationFrame(() => {
      part("desk")?.scrollIntoView({ block: "start", behavior: "auto" });
      if (focusRow) rootRef.current?.querySelector<HTMLElement>(`[data-pk62-row="${focusRow}"]`)?.focus({ preventScroll: true });
    });
  };
  const open = (p: SubmissionPackage) => {
    if (p.status === "Retired") setShowRetired(true);
    if (p.id !== current?.id) setFirstStep(null);
    setCurId(p.id);
  };

  /* ── deep links, read on every arrival ── */
  const [pending, setPending] = useState<{ pkg?: string; track?: boolean; step?: StepKey } | null>(null);
  useEffect(() => {
    if (!routeActive) return;
    const q = new URLSearchParams(location.search);
    const t = q.get("tab");
    if (t === "builder" || q.get("new") === "1") { setDrawer({ m: "new" }); setWithVersion(q.get("version")); }
    if (t === "tracking") setPending({ track: true });
    const step = libTabFromParam(t);
    const pkg = q.get("pkg");
    if (pkg || step) setPending({ ...(pkg ? { pkg } : {}), ...(step ? { step } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, routeActive]);
  useLayoutEffect(() => {
    if (!pending) return;
    if (pending.pkg) {
      const p = msPkgs.find((x) => x.id === pending.pkg);
      if (!p) return;
      open(p);
      if (pending.step) setFirstStep({ id: p.id, step: pending.step });
      toDesk(null);
    } else if (pending.step && current) setFirstStep({ id: current.id, step: pending.step });
    if (pending.track) part("table")?.scrollIntoView({ block: "start" });
    setPending(null);
  }, [pending, msPkgs]); // eslint-disable-line react-hooks/exhaustive-deps

  const goQueries = (ids: string[]) => navigate({ pathname: "/queries", search: ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "" });
  const goComps = () => navigate("/manuscripts/comps");
  const onChoose = async (p: SubmissionPackage) => { if (await act.useForNew(p)) { setCurId(p.id); setStamp(true); } };
  const onCopy = async (p: SubmissionPackage) => {
    const id = await act.copy(p);
    if (id) { setShowRetired(false); setCurId(id); setFirstStep(null); toDesk(null); }
  };
  const onCreate = async (x: { name: string; note: string; icon: SubmissionPackage["icon"] & string }) => {
    const id = await act.create(x);
    if (!id) return false;
    setCurId(id);
    const v = withVersion && model.versionRows.some((r) => r.id === withVersion) ? withVersion : null;
    setWithVersion(null);
    if (v) {
      const made = { id, queryLetterVersionId: "", synopsisVersionId: "", bookVersionId: "" } as SubmissionPackage;
      await model.putPiece(made, "ver", v);
      setFirstStep({ id, step: "let" });
    } else setFirstStep({ id, step: "ver" });
    toDesk(null);
    return true;
  };
  const onNewPiece = (k: StepKey) => setMat(k === "ver" ? { m: "newver", parentId: null } : { m: "newmat", kind: k });

  /* §5.7 · DAY ONE: the manuscript has no package at all (only once every collection has answered) */
  const dayOne = !!activeMs && collectionsReady && msPkgs.length === 0;
  const title = headerTitle(live.length);

  return (
    <WorkspacePageGrid className="pk39-wpg" scrollLabel="Submission packages" masthead={null}>
      <div ref={rootRef} className={`pk43 pk62${dayOne ? " k62--day1" : ""}`} data-pk62="page" data-pk62-state={dayOne ? "day-one" : d.totals.sent ? "sent" : "nothing-sent"}>
        {dayOne ? null : <Pk62Slim title={title} going={going?.packageName ?? null} onNew={() => setDrawer({ m: "new" })} />}
        <Pk62Header d={d} title={title} msTitle={activeMs?.title ?? null} proTag={proTag} newLabel={msPkgs.length ? NEW_BUTTON : FIRST_BUTTON}
          onNew={() => setDrawer({ m: "new" })} onHow={() => setHow(true)} going={going} options={options} onScreen={routeActive} onChoose={(p) => void onChoose(p)} />
        {showNote ? <Pk62Note onOk={() => { void updateUserPaths({ [FOUNDING_NOTE_PATH]: true }); }} /> : null}
        {dayOne ? <Pk62DayOne /> : msPkgs.length ? (
          <>
            <div className="k62-desk" data-pk62="desk">
              <Pk62List d={d} live={live} retired={retired} showRetired={showRetired} openId={current?.id ?? null} stamp={stamp}
                onShowRetired={(on) => { setShowRetired(on); if (!on && current?.status === "Retired") setCurId(null); }}
                onOpen={(p) => open(p)} onNew={() => setDrawer({ m: "new" })} />
              <div className="k62-stack" data-pk62="work">
                <span className="k62-sr" aria-live="polite">{said}</span>
                {ci ? <>
                  <Pk62Open model={model} d={d} act={act} i={ci} onScreen={routeActive}
                    firstStep={firstStep && (firstStep.id === ci.p.id) ? firstStep.step : null}
                    onEdit={(p) => setDrawer({ m: "edit", id: p.id })} onCopy={(p) => void onCopy(p)} onNewPiece={onNewPiece}
                    onOpenMaterial={(k, id) => setMat({ m: "mat", kind: k, id })} />
                  <Pk62Back d={d} i={ci} onCopy={(p) => void onCopy(p)} onSeeQueries={goQueries} />
                </> : null}
              </div>
            </div>
            <Pk62Table d={d} pkgs={msPkgs} onOpen={(p) => { open(p); toDesk(p.id); }} />
          </>
        ) : null}
      </div>
      <Pk26Drawer model={model} view={routeActive ? mat : null} go={setMat} onSeeQueries={goQueries} onOpenComps={goComps} />
      <Pk62Drawer view={routeActive ? drawer : null} pkgOf={(id) => msPkgs.find((p) => p.id === id) ?? null} infoOf={d.info} onClose={() => setDrawer(null)}
        onCreate={onCreate} onSave={act.save} onDelete={(p) => act.remove(p, d.info(p).sent)} onRetire={act.retire} />
      <Pk62How open={routeActive && how} onClose={() => setHow(false)} />
    </WorkspacePageGrid>
  );
};

export default SubmissionPackages;
