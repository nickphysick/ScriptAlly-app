/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Submission packages v4 (route /manuscripts/packages; 14 Oct) ═════════════════════════════════════════════
 * Refs: design-refs/packages-v4/packages-v4.html (the page) and design-refs/materials/packages-v3.html (the drawer).
 * v3's data, drawer and derivations in the Query Centre v138 / Contact list v17.1 dress:
 *
 *   A · the centred light header and its summary card (Sent / Not sent yet / Retired, and the Reply rate ring)
 *   B · the filter row (v17's pills)
 *   C · the packages sheet (search in its navy row; In use, and Retired folded)
 *   D · the materials sheet (three columns)
 *   E · the blush banner and "What's getting replies"
 *   F · the empty page, with no packages: navy panel and the Archivist, How it works, Ways to get started
 *
 * ⚠️ THE PAGE DISPLAYS; THE DRAWER DOES EVERY CREATE AND EDIT (v3 decision 1). Viewing doesn't dim; forms do.
 * ⚠️ DEEP LINKS, read on every arrival (`location.key`): `?tab=builder` opens the package form (App's "New package"
 *    lands there), `?tab=tracking` scrolls to "What's getting replies", `?tab=packages` is the top of the page, and
 *    `?pkg={id}` opens that package's drawer (`&view=replies` its second tab).
 * ⚠️ OPEN TO ALL (D7). Nothing on this page reads the plan; the one gate is `addPackage`'s.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { SubmissionPackage } from "../types";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { usePopover } from "./shell/ListPills";
import { suggestPackageName, type MatKind } from "../lib/packagesPage";
import { materialPackageCount, materialSplit, overall } from "../lib/packageReplies";
import { PkgDrawer4, type DrawerView } from "./packages/v4/PkgDrawer4";
import { EMPTY_PKG, usePackagesModel } from "./packages/v4/usePackagesModel";
import { PkgHeader4, PkgSummaryCard, type StatusKey } from "./packages/v4/PkgHeader4";
import { PkgFilters4, emptyPkgFilters, filterCount, pkgMatches, type PkgFilters, type PkgPop } from "./packages/v4/PkgFilters4";
import { MaterialsSheet, PackagesSheet, type CardData } from "./packages/v4/PkgSheets4";
import { RepliesBanner, RepliesSheet, materialSub, packageSub, type ByKind, type ReplyRow } from "./packages/v4/PkgReplies4";
import { PkgEmpty4 } from "./packages/v4/PkgEmpty4";
import "./packages/packagesV2.css";
import "./packages/v4/packagesV4.css";

export const SubmissionPackages: React.FC = () => {
  const model = usePackagesModel();
  const { activeMs, msId, allMats, mats, msPkgs, live, retired, active, msQueries, rowsById, collectionsReady } = model;
  const location = useLocation();
  const noneLive = !!activeMs && msPkgs.length > 0 && live.length === 0;

  /* ── the drawer (v3 Part D): every create and edit happens there ── */
  const [view, setView] = useState<DrawerView | null>(null);
  /* a letter (or synopsis) chosen on the way in fills the name suggestion, as picking one in the form does */
  const openNew = (pre: { letter?: string; synopsis?: string; version?: string } = {}) => {
    const letter = pre.letter ?? "", synopsis = pre.synopsis ?? "";
    const name = letter || synopsis ? suggestPackageName(model.matById("letter", letter)?.name ?? null, model.matById("synopsis", synopsis)?.name ?? null) : "";
    setView({ m: "pkgform", d: { ...EMPTY_PKG, letter, synopsis, version: pre.version ?? "", name } });
  };
  /* the replies sheet: the ring's press and ?tab=tracking scroll to it */
  const repliesRef = useRef<HTMLElement | null>(null);
  const scrollerOf = () => [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.querySelector('[data-pk4="page"]')) ?? null;

  /* ── deep links, on every arrival: ?tab=builder · ?tab=tracking · ?tab=packages · ?pkg={id}[&view=replies] ── */
  const params = new URLSearchParams(location.search);
  const tab = params.get("tab");
  const pkgParam = params.get("pkg");
  const [pendingTrack, setPendingTrack] = useState(false);
  const [pendingPkg, setPendingPkg] = useState<{ id: string; replies: boolean } | null>(null);
  useEffect(() => {
    if (tab === "builder") openNew();
    else if (tab === "tracking") setPendingTrack(true);
    else if (tab === "packages") { const s = scrollerOf(); if (s) s.scrollTop = 0; }
    if (pkgParam) setPendingPkg({ id: pkgParam, replies: params.get("view") === "replies" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  useEffect(() => {
    if (!pendingPkg || !msPkgs.some((p) => p.id === pendingPkg.id)) return;
    setView({ m: "pkg", id: pendingPkg.id, tab: pendingPkg.replies ? "replies" : "inside" });
    setPendingPkg(null);
  }, [pendingPkg, msPkgs]);
  useLayoutEffect(() => {
    if (!pendingTrack || !repliesRef.current) return;
    repliesRef.current.scrollIntoView({ block: "start" });
    setPendingTrack(false);
  }, [pendingTrack, msPkgs.length]);
  /* a different manuscript is a different page: the drawer closes */
  const lastMs = useRef(msId);
  useEffect(() => { if (lastMs.current && lastMs.current !== msId) setView(null); lastMs.current = msId; }, [msId]);

  const matName = (k: MatKind, id: string | undefined) => (id ? allMats[k].find((m) => m.id === id) ?? null : null);

  /* ── Part A · the card's counts and the status filter (shared with the Status pill, Part B) ── */
  const counts: Record<StatusKey, number> = {
    sent: live.filter((p) => model.goneOut(p)).length, new: live.filter((p) => !model.goneOut(p)).length, ret: retired.length,
  };
  /* Part B · the filters; Status is ONE state with the card's rows */
  const [filters, setFilters] = useState<PkgFilters>(emptyPkgFilters);
  const status = useMemo(() => new Set(filters.status), [filters.status]);
  /* a row press shows only that row; pressed again it clears. It never scrolls (A2). */
  const pressStatus = (k: StatusKey) => setFilters((f) => ({ ...f, status: f.status.length === 1 && f.status[0] === k ? [] : [k] }));
  const keyOf = (p: SubmissionPackage): StatusKey => (p.status === "Retired" ? "ret" : model.goneOut(p) ? "sent" : "new");
  const statusMatch = (p: SubmissionPackage) => pkgMatches(p, keyOf(p), filters);
  const pop = usePopover<PkgPop>();
  const inPackages = (kind: "letter" | "synopsis" | "version", id: string) => msPkgs.filter((p) =>
    (kind === "letter" ? p.queryLetterVersionId : kind === "synopsis" ? p.synopsisVersionId || "" : p.bookVersionId || "") === id).length;
  /* Part C · the sheet's search: package names and the names of the materials each holds now */
  const [find, setFind] = useState("");
  const findMatch = (p: SubmissionPackage) => {
    const t = find.trim().toLowerCase();
    if (!t) return true;
    return [p.packageName, matName("letter", p.queryLetterVersionId)?.name, matName("synopsis", p.synopsisVersionId)?.name, matName("version", p.bookVersionId)?.name]
      .some((x) => (x ?? "").toLowerCase().includes(t));
  };
  const clearAll = () => { setFilters(emptyPkgFilters()); setFind(""); };
  const cardOf = (p: SubmissionPackage): CardData => ({
    pkg: p, sent: model.goneOut(p), forNew: active?.id === p.id, split: model.currentSplit(p),
    slots: { letter: matName("letter", p.queryLetterVersionId)?.name ?? null, synopsis: matName("synopsis", p.synopsisVersionId)?.name ?? null, version: matName("version", p.bookVersionId)?.name ?? null },
  });
  /* In use: the package used for new queries first, then newest (msPkgs is newest first) */
  const cardsLive = live.filter((p) => statusMatch(p) && findMatch(p)).sort((a, b) => Number(active?.id === b.id) - Number(active?.id === a.id)).map(cardOf);
  const cardsRet = retired.filter((p) => statusMatch(p) && findMatch(p)).map(cardOf);
  const overallSplit = useMemo(() => overall(msPkgs, msQueries, rowsById), [msPkgs, msQueries, rowsById]);
  const goReplies = () => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    repliesRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };
  /* Part E · the table's rows, ALL editions (the card and the drawer cells read the current one) */
  const rowsFor = (by: ByKind): ReplyRow[] => {
    if (by === "package") return msPkgs.map((p) => { const sp = model.allSplit(p); return { id: p.id, kind: "package", name: p.packageName, s: sp, sub: packageSub(p, sp), pkg: p }; });
    const list = allMats[by].filter((m) => !m.retired || model.matSplit(m).sent > 0).map((m): ReplyRow => {
      const sp = model.matSplit(m);
      return { id: m.id, kind: by, name: m.name, s: sp, sub: materialSub(materialPackageCount(m.id, by, msPkgs, msQueries), sp), mat: m };
    });
    if (by === "version") {
      const nr = materialSplit(null, "version", msPkgs, msQueries, rowsById);
      if (nr.sent) list.push({ id: null, kind: "version", name: "Not recorded", s: nr, sub: `in ${materialPackageCount(null, "version", msPkgs, msQueries)} package${materialPackageCount(null, "version", msPkgs, msQueries) === 1 ? "" : "s"}` });
    }
    return list;
  };

  /* Part F · the empty page: no packages for the manuscript, live or retired */
  /* only once every collection has answered: an account still loading is not an account with no packages */
  const emptyPage = !!activeMs && collectionsReady && msPkgs.length === 0;
  const newestLetter = mats.letter[0] ? { id: mats.letter[0].id, name: mats.letter[0].name } : null;
  return (
    <WorkspacePageGrid scrollLabel="Submission packages" masthead={null}>
      <div className="ppv-page" data-ppv="page">
        <div className="pk4 pk4-col" data-pk4="page">
        {emptyPage ? (
          <PkgEmpty4 msTitle={activeMs?.title ?? null} newestLetter={newestLetter}
            onBuild={(letterId) => openNew(letterId ? { letter: letterId } : {})}
            onAdd={(k) => setView({ m: "matform", d: { kind: k, name: "", note: "", text: "" } })} />
        ) : <PkgHeader4 loading={!collectionsReady} live={collectionsReady ? live.length : null} msTitle={activeMs?.title ?? null}
          onNew={() => openNew()} onAddMaterial={() => setView({ m: "matform", d: { kind: "letter", name: "", note: "", text: "" } })}
          card={<PkgSummaryCard counts={counts} active={status} onStatus={pressStatus} overall={overallSplit} onRate={goReplies} loading={!collectionsReady} />}>
          <PkgFilters4 filters={filters} onFilters={setFilters} pop={pop} statusCounts={counts} letters={allMats.letter} synopses={allMats.synopsis}
            versions={allMats.version} inPackages={inPackages} showing={msPkgs.filter((p) => statusMatch(p) && findMatch(p)).length} />
        </PkgHeader4>}
        <div className="pk4-body" data-ppv="main">
            {!activeMs || emptyPage ? null : (
              <>
                <PackagesSheet live={cardsLive} retired={cardsRet} total={msPkgs.length} filtered={filterCount(filters) > 0 || !!find.trim()}
                  retiredForced={filters.status.includes("ret")} noneLive={noneLive} openId={view?.m === "pkg" ? view.id : null}
                  find={find} onFind={setFind} onClearAll={clearAll} onOpen={(p) => setView({ m: "pkg", id: p.id, tab: "inside" })} onNew={() => openNew()} />
                <MaterialsSheet mats={allMats} openId={view?.m === "mat" ? view.id : null}
                  use={(m) => ({ packages: model.packagesWith(m).length, sent: model.matSplit(m).sent })}
                  goneOut={(m) => (m.kind === "version" ? model.matSplit(m).sent > 0 : model.materialGoneOut(m.id))}
                  onOpen={(m) => setView({ m: "mat", kind: m.kind, id: m.id })}
                  onAdd={(k) => setView({ m: "matform", d: { kind: k, name: "", note: "", text: "" } })} />
              </>
            )}
          {!activeMs || emptyPage ? null : (
            <>
              <RepliesBanner />
              <div className="pk4-col2">
                <RepliesSheet ref={repliesRef} rowsFor={rowsFor} packageRows={rowsFor("package")} letterRows={rowsFor("letter")} overall={overallSplit}
                  onOpen={(r) => (r.pkg ? setView({ m: "pkg", id: r.pkg.id, tab: "replies" }) : r.mat ? setView({ m: "mat", kind: r.mat.kind, id: r.mat.id }) : undefined)} />
              </div>
            </>
          )}
        </div>
        </div>
        <PkgDrawer4 model={model} view={view} go={setView} />
      </div>
    </WorkspacePageGrid>
  );
};

export default SubmissionPackages;
