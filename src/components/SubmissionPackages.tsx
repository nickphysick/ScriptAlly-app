/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Submission packages v2 (route /manuscripts/packages) — ONE PAGE (27 Sep) ══════════════════════
 * Ref: design-refs/materials/packages-v2.html. Replaces the Packages · Builder · Tracking tabs (D1).
 *
 * The page renders its OWN group, like the Contact list and Comparable titles: the FULL `PageHeader`
 * is row 1 across both tracks, the main column and the Materials rail are row 2 at the rule + 24.
 * `WorkspacePageGrid` is given `masthead={null}`.
 *
 * ⚠️ THE DEEP LINKS SURVIVE THE TABS (P7). `?tab=builder` opens the composer (App's "New package"
 * lands there), `?tab=tracking` scrolls to Side by side, `?tab=packages` is the top of the page.
 * They are read on every arrival (`location.key`), so a second "New package" while already here
 * still opens it.
 *
 * ⚠️ FACTS ONLY (D6). Side by side states what the log records per sent package, in the list's own
 * order; no row is marked, sorted by outcome or called best. `strongestPackage` / `rank*` are not
 * imported here.
 *
 * ⚠️ OPEN TO ALL (D7). Nothing on this page reads the plan; the one gate is `addPackage`'s, behind
 * `PACKAGES_OPEN_TO_ALL`.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../lib/db";
import { useToast } from "./toast/ToastProvider";
import { ComponentType, SubmissionPackage } from "../types";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { PageHeader } from "./shell/PageHeader";
import type { LivingHeader } from "./shell/PageHeader";
import { packagesHeaderCopy, type PackageLead } from "../lib/livingHeaders";
import { useLivingCountOverride } from "../lib/livingHeaderReview";
import { PackagesExhibit } from "./packages/PackagesExhibit";
import { appendBookVersion, bookVersionsOf, newBookVersionId, renameBookVersion } from "../lib/bookVersions";
import { countWords, createPayload } from "../lib/materialDraft";
import { isVersionSent, lockedEditLine, nextVersionName } from "../lib/versionLock";
import { duplicateOf } from "../lib/buildRow";
import { duplicateName, resolveActivePackage } from "../lib/packageMetrics";
import { initialsOf } from "../lib/manuscriptSummary";
import {
  isSent, MATERIALS_PILE, MatKind, MaterialItem, materialMeta, materialsFor, offered, PACKAGES_HERO, sideBySide,
  suggestPackageName, usesOf,
} from "../lib/packagesPage";
import { PkgAct, PkgCard } from "./packages/PkgCard";
import { buildRows } from "../lib/analytics";
import { packageResults } from "../lib/packageResults";
import { editionNumber, editionWarning, editionsOf, ordinal, summaryFrom } from "../lib/packageEditions";
import { openQueryDrawer } from "../lib/queryActions/drawerStore";
import type { CompState } from "./packages/PkgComposer";
import { PkgDrawer4, type DrawerView } from "./packages/v4/PkgDrawer4";
import { EMPTY_PKG, usePackagesModel } from "./packages/v4/usePackagesModel";
import "./packages/v4/packagesV4.css";
import { PkgHeader4, PkgSummaryCard, type StatusKey } from "./packages/v4/PkgHeader4";
import { overall } from "../lib/packageReplies";
import { PkgFilters4, emptyPkgFilters, filterCount, pkgMatches, type PkgFilters, type PkgPop } from "./packages/v4/PkgFilters4";
import { usePopover } from "./shell/ListPills";
import { MaterialsSheet, PackagesSheet, type CardData } from "./packages/v4/PkgSheets4";
import { PkgBand, PkgBandToggle } from "./packages/PkgBand";
import "./packages/packagesV2.css";

const KEY = "scriptally_active_manuscript_id";
/** The empty state's two lines (living headers v3 §4) — the ref's, verbatim. */
export const PACKAGES_EMPTY_HEADING = "No packages yet";
export const PACKAGES_EMPTY_SUBLINE = "Build one package — the letter, the synopsis, the sample — and attach it to a query in one go, with a record of exactly what went.";
/** The example card is never sent, so it draws no results; this satisfies the prop and nothing reads it. */
const EXAMPLE_RESULTS = () => packageResults("example", null, [], new Map());

/** The empty state's example card — a picture of a package, never a record (P8). */
const EXAMPLE: SubmissionPackage = {
  id: "example", userId: "", manuscriptId: "", packageName: "Autumn round", queryLetterVersionId: "x",
  synopsisVersionId: "x", samplePagesVersionId: "", status: "Active", createdDate: "",
  otherMaterials: "Author bio in the email body", note: "Sending in batches of five, Tuesdays.",
};

export const SubmissionPackages: React.FC = () => {
  const model = usePackagesModel();
  const { activeMs, msId, allMats, mats, msPkgs, live, retired, active, msQueries, rowsById, collectionsReady } = model;
  const { versions, queries, agents } = useScriptAllyDb();
  const navigate = useNavigate();
  const location = useLocation();
  const sent = msPkgs.filter(isSent);
  const empty = !!activeMs && msPkgs.length === 0;
  const noneLive = !!activeMs && msPkgs.length > 0 && live.length === 0;

  /* ── the drawer (v3 Part D): every create and edit happens there ── */
  const [view, setView] = useState<DrawerView | null>(null);
  const openNew = useCallback((pre: Partial<CompState> = {}) => {
    setView({ m: "pkgform", d: { ...EMPTY_PKG, letter: pre.letter ?? "", synopsis: pre.synopsis ?? "", version: pre.version ?? "" } });
  }, []);
  const [showRetired, setShowRetired] = useState(false);
  const sbsRef = useRef<HTMLDivElement | null>(null);
  const scrollerOf = () => sbsRef.current?.closest(".wpg-scroll") as HTMLElement | null;

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
    if (!pendingTrack || !sbsRef.current) return;
    sbsRef.current.scrollIntoView({ block: "start" });
    setPendingTrack(false);
  }, [pendingTrack, sent.length]);
  /* a different manuscript is a different page: the drawer closes */
  const lastMs = useRef(msId);
  useEffect(() => { if (lastMs.current && lastMs.current !== msId) setView(null); lastMs.current = msId; }, [msId]);

  const matName = (k: MatKind, id: string | undefined) => (id ? allMats[k].find((m) => m.id === id) ?? null : null);
  const metaOf = (m: MaterialItem) => materialMeta(m, usesOf(m, msPkgs));
  const summaryFor = useMemo(() => summaryFrom(versions, model.bookVersions), [versions, model.bookVersions]);
  const who = (queryId: string) => {
    const q = queries.find((x) => x.id === queryId);
    const row = rowsById.get(queryId);
    const name = row?.agentName ?? agents.find((a) => a.id === q?.agentId)?.name ?? "Unknown agent";
    return { name, initials: initialsOf(name) };
  };
  const cardProps = (p: SubmissionPackage) => {
    const l = matName("letter", p.queryLetterVersionId);
    const s = matName("synopsis", p.synopsisVersionId);
    return {
      letter: l ? { name: l.name, words: l.words } : null,
      synopsis: s ? { name: s.name, words: s.words } : null,
      version: matName("version", p.bookVersionId)?.name ?? null,
      editions: editionsOf(p, summaryFor),
      results: (ed: number | null) => packageResults(p.id, ed, msQueries, rowsById),
      who,
    };
  };

  const onAct = (p: SubmissionPackage) => async (a: PkgAct) => {
    switch (a) {
      case "log": openQueryDrawer({ mode: "log", manuscriptId: p.manuscriptId, packageId: p.id }); return;
      case "use": await model.usePkg(p); return;
      case "edit": setView({ m: "pkgform", d: model.editDraft(p) }); return;
      case "dup": setView({ m: "pkgform", d: model.dupDraft(p) }); return;
      case "retire": await model.retirePkg(p); return;
      case "restore": await model.restorePkg(p); return;
      case "delete": await model.deletePkg(p);
    }
  };

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
    sbsRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };

  /* ── the living header (living headers v3) ── */
  const lhOverride = import.meta.env.MODE !== "production" ? useLivingCountOverride() : null;
  const pkgCount = lhOverride != null && lhOverride >= 0 ? lhOverride : msPkgs.length;
  const exhibit = !!activeMs && pkgCount === 0;
  const lead: PackageLead | null = (() => {
    let best: PackageLead | null = null;
    for (const p of live) {
      const r = packageResults(p.id, null, msQueries, rowsById);
      if (r.sent > 0 && (!best || r.sent > best.sent)) best = { name: p.packageName, sent: r.sent, answered: r.answered, requests: r.requests };
    }
    return best;
  })();
  const living: LivingHeader | undefined = activeMs ? {
    count: collectionsReady ? pkgCount : null,
    copy: (n) => packagesHeaderCopy(n, { lead, firstLiveName: (active && active.status !== "Retired" ? active : live[0])?.packageName ?? null }),
    empty: { heading: PACKAGES_EMPTY_HEADING, subline: [PACKAGES_EMPTY_SUBLINE] },
  } : !collectionsReady ? { count: null, copy: (n) => packagesHeaderCopy(n, { lead: null, firstLiveName: null }) } : undefined;
  const rows = sideBySide(sent, queries);
  const slotLine = (p: SubmissionPackage) =>
    [matName("letter", p.queryLetterVersionId)?.name, matName("synopsis", p.synopsisVersionId)?.name, matName("version", p.bookVersionId)?.name].filter(Boolean).join(" · ");
  const card = (p: SubmissionPackage) => (
    <PkgCard key={p.id} pkg={p} active={active?.id === p.id} {...cardProps(p)} onAct={onAct(p)} onSaveNote={(n) => model.saveNote(p, n)}
      onOpenQuery={(id) => navigate(`/queries?q=${encodeURIComponent(id)}`)} />
  );

  return (
    <WorkspacePageGrid scrollLabel="Submission packages" masthead={null}>
      <div className="ppv-page" data-ppv="page">
        <div className="pk4 pk4-col" data-pk4="page">
        {exhibit ? (
          <div className="ppv-head pk4-oldhead">
            <PageHeader variant="full" panel title="Submission packages" living={living} primary={{ label: "+ New package", onClick: () => openNew() }}
              art={<img src={`${PACKAGES_HERO.src}?v=${PACKAGES_HERO.version}`} width={PACKAGES_HERO.width} height={PACKAGES_HERO.height} alt={PACKAGES_HERO.alt} />} />
          </div>
        ) : <PkgHeader4 loading={!collectionsReady && !activeMs} live={collectionsReady || activeMs ? live.length : null} msTitle={activeMs?.title ?? null}
          onNew={() => openNew()} onAddMaterial={() => setView({ m: "matform", d: { kind: "letter", name: "", note: "", text: "" } })}
          card={<PkgSummaryCard counts={counts} active={status} onStatus={pressStatus} overall={overallSplit} onRate={goReplies} loading={!collectionsReady && !activeMs} />}>
          <PkgFilters4 filters={filters} onFilters={setFilters} pop={pop} statusCounts={counts} letters={allMats.letter} synopses={allMats.synopsis}
            versions={allMats.version} inPackages={inPackages} showing={msPkgs.filter((p) => statusMatch(p) && findMatch(p)).length} />
        </PkgHeader4>}
        <div className="pk4-body" data-ppv="main">
            {!activeMs ? null : exhibit ? (
              <PackagesExhibit />
            ) : (
              <>
                <PackagesSheet live={cardsLive} retired={cardsRet} total={msPkgs.length} filtered={filterCount(filters) > 0 || !!find.trim()}
                  retiredForced={filters.status.includes("ret")} noneLive={noneLive} openId={view?.m === "pkg" ? view.id : null}
                  find={find} onFind={setFind} onClearAll={clearAll} onOpen={(p) => setView({ m: "pkg", id: p.id, tab: "inside" })} onNew={() => openNew()} />
                <MaterialsSheet mats={allMats} openId={view?.m === "mat" ? view.id : null}
                  use={(m) => ({ packages: model.packagesWith(m).length, sent: model.matSplit(m).sent })}
                  goneOut={(m) => (m.kind === "version" ? model.matSplit(m).sent > 0 : model.materialGoneOut(m.id))}
                  onOpen={(m) => setView({ m: "mat", kind: m.kind, id: m.id })}
                  onAdd={(k) => setView({ m: "matform", d: { kind: k, name: "", note: "", text: "" } })} />
                {sent.length >= 2 ? (
                  <>
                    <PkgBand band="sbs" title="Side by side" hint="Facts from your query log" ref={sbsRef} id="ppv-sbs" />
                    <div className="ppv-cmp">
                      <table data-ppv="sbs">
                        <thead><tr><th scope="col">Package</th><th scope="col">Queries</th><th scope="col">Requests</th><th scope="col">Replies</th><th scope="col">Typical reply</th></tr></thead>
                        <tbody>
                          {rows.map((r) => {
                            const p = sent.find((x) => x.id === r.id)!;
                            return (
                              <tr key={r.id} className={r.retired ? "is-retired" : undefined}>
                                <td>{p.packageName}<span className="m">{slotLine(p)}</span></td>
                                <td>{r.queries}</td><td>{r.requests} <span className="of">of {r.queries}</span></td>
                                <td>{r.replies} <span className="of">of {r.queries}</span></td><td>{r.typical}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="foot">Requests count partials and fulls. Typical reply is the median time to any reply.</div>
                    </div>
                  </>
                ) : null}
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
