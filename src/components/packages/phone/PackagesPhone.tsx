/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PACKAGES TAB ON A PHONE (Phone round two v1, 3A · 4A · 5B; ref design-refs/phone-round-two-v1/src/boot3.js
 * `hubHtml`, `landing` at land A, `PAGES.pkgpage`, `buildPage` at build B, `PAGES.letter`, `PAGES.ver`, `PAGES.comps`,
 * `PAGES.compslog`). `/queries/packages` below 768px; the desktop page renders at 768px and up (PackagesRoute chooses).
 *
 * ⚠️ IT DERIVES NOTHING OF ITS OWN. Every fact is the desktop packages page's: `usePk26Model` (the same hook the desktop
 * page runs) for the packages, the letters, synopses and versions, their figures (`figPk` / `figItems` / `facts` /
 * `pieceFacts`) and every write; `packageStage` / `STAGE_LABEL` / `isLocked` for the lifecycle; `packageShowcases` /
 * `bestPiece` for What's landing (ranked by the desktop's own "asked for more ÷ sent", hidden under its own minimum);
 * `compUsage` / `compAge` for the comps. The phone lays them out.
 *
 * Every screen below the hub is a full-screen page keyed by the address (`?pkg=`, `?build=`, `?mat=`, `?ver=`,
 * `?comps=1`, `?compsin=`, `?all=`, `?edit=`), so the back gesture closes it.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import type { CompTitle, PackageIcon, SubmissionPackage } from "../../../types";
import { useScriptAllyDb } from "../../../lib/db";
import { usePk26Model, type Pk26Model } from "../v26/usePk26Model";
import { usePackagesModel } from "../v4/usePackagesModel";
import { PhoneLetterEditor } from "../../phone/materials/PhoneLetterEditor";
import { packageStage, STAGE_LABEL, isLocked, canMakeActive, canRetire } from "../../../lib/packagesV40";
import { packageShowcases, bestPiece, thresholdWords, type Fig } from "../../../lib/packagesV38";
import { MIN_SENDS_FOR_CLAIM, formatRate, packageMetrics } from "../../../lib/packageMetrics";
import { bestClaim, compsWords, letterCompCount, materialFacts, materialQueries, paragraphs, pieceChip, pieceResult, pkgPieces, type PieceKey, type PkgPiece } from "../../../lib/phoneV5";
import { sentRecordOf } from "../../../lib/queryActions/sentRecord";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { I4, Chev, Link4 } from "../../phone/v4/V4Parts";
import "../../phone/v4/phoneV4.css";
import "../../phone/v5/phoneV5.css";
import { PACKAGE_ICONS } from "../packageIcons";
/* v42: the guide is How it works's four stations (v41's five steps are deleted) */
import { HOW_STATIONS as HOW_STEPS, PACKAGE_NAVY } from "../../../lib/packagesV42";
import { compUsage, compKey, compsInLetter, letterFixed, MAX_LETTER_COMPS } from "../../../lib/compUsage";
import { compAge, currentYear } from "../../../lib/compsPage";
import { withCompAdded, withCompEdited, type CompDraft } from "../../../lib/comps";
import { withCompIds } from "../../../lib/compUsage";
import { normalizeComp } from "../../../lib/comps";
import { readVersions, setInUse, archiveVersion, editVersion } from "../../../lib/bookVersions";
import { inUseId } from "../../../lib/versionsV2";
import { versionsUnlocked } from "../../../lib/entitlements";
import { dayMonth } from "../../../lib/dates";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { usePhoneBandSlot } from "../../phone/phoneBandStore";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import { useToast } from "../../toast/ToastProvider";
import "./packagesPhone.css";

export const PACKAGES_PATH = "/queries/packages";
const HB = "#1d4b63"; // Harbour — the packages' colour (PACKAGE_COLOURS[0])
const MPINK = "#f7e3e3"; // the materials' pink (the desktop's letter and synopsis tint)

const lockI = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
const pkIcon = (p: Pick<SubmissionPackage, "icon">) => PACKAGE_ICONS[(p.icon ?? "box") as string] ?? PACKAGE_ICONS.box ?? PI.box;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "2 requests from 11", "3 sent, no requests yet", "Not sent yet" — the figure a card shows, in words */
export function resultWords(f: Pick<Fig, "sent" | "more">): string {
  if (!f.sent) return "Not sent yet";
  if (!f.more) return `${f.sent} sent, no requests yet`;
  return `${plural(f.more, "request")} from ${f.sent}`;
}

/* ── going places ─────────────────────────────────────────────────────────────────────────────────────────────── */
function usePkNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const open = (key: string, value: string) => {
    const n = new URLSearchParams(); n.set(key, value);
    navigate({ pathname: PACKAGES_PATH, search: `?${n}` }, { state: { pk2: true } });
  };
  const back = () => {
    if ((location.state as { pk2?: boolean } | null)?.pk2) { navigate(-1); return; }
    navigate({ pathname: PACKAGES_PATH, search: "" }, { replace: true });
  };
  const replace = (key: string, value: string) => {
    const n = new URLSearchParams(); n.set(key, value);
    navigate({ pathname: PACKAGES_PATH, search: `?${n}` }, { replace: true, state: location.state });
  };
  return { params, open, back, replace, navigate };
}

/* ═══ THE HUB ════════════════════════════════════════════════════════════════════════════════════════════════════ */
/** Phone app v5, Phase F: the Materials tab (phone/v5/MaterialsV5) draws its own four tabs, so this hub is drawn only
 *  under one of its pages (`/queries/packages` with no page is sent to Materials). Every page below is still this
 *  file's, at `/queries/packages?…`, drawn by the copy mounted in the packages slot. */
export const PackagesPhone: React.FC<{ active: boolean }> = ({ active }) => {
  const model = usePk26Model();
  const nav = usePkNav();
  const { params } = nav;
  const pk = model.active;

  /* the band: the line, and the active package card laid over the band's foot (ref `.apk`) */
  const band = (
    <div data-pa="pk-band">
      <div className="pa-pksub">What you send agents, and what’s working</div>
      {pk ? (
        <button type="button" className="pa-apk" data-pa="pk-active" data-id={pk.id} data-pc={PACKAGE_NAVY} onClick={() => nav.open("pkg", pk.id)}>
          <span className="pa-apkh" style={{ background: PACKAGE_NAVY }}>
            <span className="pa-apkic" aria-hidden="true">{pkIcon(pk)}</span>
            <b>{pk.packageName}</b><span>New queries go out with this</span>
          </span>
          <span className="pa-apkb">
            <Pieces model={model} p={pk} />
            <span className="pa-apkr"><span className="pa-type" data-pa="pk-active-result">{resultWords(model.figPk(pk))}</span><span className="pa-apkch">Change</span></span>
          </span>
        </button>
      ) : (
        <div className="pa-apk pa-apk--none" data-pa="pk-active-none" data-has={model.live.length ? "1" : "0"}>
          {model.live.length ? (
            <span className="pa-apkb">
              <b>No package is set for new queries</b>
              <span className="pa-sub">Open a package that’s ready or out with agents and choose “Use for new queries”.</span>
            </span>
          ) : (
            <span className="pa-apkb">
              <b>No package yet</b>
              <span className="pa-sub">A package is what you send an agent: a version of your book, a letter and a synopsis. Build one and new queries go out with it.</span>
              <button type="button" className="pa-btn pri sm pa-hb" data-pa="pk-build-first" onClick={() => nav.open("build", "new")}>Build a package</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
  usePhoneBandSlot(PACKAGES_PATH, band, [pk?.id, pk?.packageName, pk?.colour, pk?.icon, model.figPk, model.letters, model.synopses, model.versionRows]);

  /* What's landing (4A): the desktop's own ranking; a card whose sample is under the desktop's minimum is left out */
  const usage = useUsage(model);
  const { versions } = useScriptAllyDb();
  const showcases = useMemo(() => landing(model, usage, (id) => versions.find((v) => v.id === id)?.versionName ?? "a letter"), [model, usage, versions]);
  const [howOpen, setHowOpen] = useState(false);

  /* the page in front: one of the detail pages, keyed by the address */
  const page = active ? pageFor(params) : null;

  const packagesPart = (<>
        <div className="pa-shd pa-shd--first"><h2 className="pa-h2">What’s landing</h2><button type="button" className="pa-link" data-pa="pk-how" onClick={() => setHowOpen(true)}>How it works</button></div>
        <Landing cards={showcases.cards} hidden={showcases.hidden} />

        <div className="pa-shd"><h2 className="pa-h2">Your packages</h2><button type="button" className="pa-link" data-pa="pk-new" onClick={() => nav.open("build", "new")}>New</button></div>
        {model.msPkgs.length ? (
          <div className="pa-card pa-pkrows" data-pa="pk-list">
            {[...model.live, ...model.retired].map((p) => <PkRow key={p.id} model={model} p={p} onOpen={() => nav.open("pkg", p.id)} />)}
          </div>
        ) : <p className="pa-sub pa-pknone" data-pa="pk-none">No packages yet.</p>}
        <button type="button" className="pa-btn pri blk pa-hb pa-mt12" data-pa="pk-build" onClick={() => nav.open("build", "new")}>{PI.plus}Build a package</button>
  </>);

  return (
    <div className="pa-pk" data-pa="packages">
      <div className="pa-pkbody">
        {packagesPart}
        <Shelves model={model} usage={usage} onOpen={nav.open} />
      </div>

      <MobileSheet open={howOpen} onClose={() => setHowOpen(false)} ariaLabel="How it works" pa={{ height: "auto", white: true }}>
        <div className="pa-pkhow" data-pa="pk-how-sheet">
          <h2 className="pa-sht">How it works</h2>
          <ol>{HOW_STEPS.map(([t, x], i) => <li key={i}><b>{t}</b><span>{x}</span></li>)}</ol>
          <p className="pa-sub">{thresholdWords(MIN_SENDS_FOR_CLAIM)}</p>
        </div>
      </MobileSheet>

      {page ? createPortal(<PackagesPhonePage model={model} />, document.body) : null}
    </div>
  );
};

/** The page in front, keyed by the address (`?pkg=` / `?build=` / `?mat=` …), as a full-screen layer — portalled by
 *  PackagesPhone; exported so the render smokes can draw a page without a portal. */
export const PackagesPhonePage: React.FC<{ model: Pk26Model }> = ({ model }) => {
  const nav = usePkNav();
  const usage = useUsage(model);
  const page = pageFor(nav.params);
  if (!page) return null;
  return (
    <div className="pa-layer pa-pkpage" data-pa="pk-page" data-page={page.kind}>
      <PageBody kind={page.kind} id={page.id} model={model} usage={usage} nav={nav} />
    </div>
  );
};

type PageKind = "pkg" | "build" | "mat" | "ver" | "comps" | "compsin" | "all" | "edit";
function pageFor(p: URLSearchParams): { kind: PageKind; id: string } | null {
  for (const k of ["build", "edit", "compsin", "pkg", "mat", "ver", "all", "comps"] as PageKind[]) {
    const v = p.get(k);
    if (v) return { kind: k, id: v };
  }
  return null;
}

const PageBody: React.FC<{ kind: PageKind; id: string; model: Pk26Model; usage: Usage; nav: ReturnType<typeof usePkNav> }> = ({ kind, id, model, usage, nav }) => {
  if (kind === "edit") return <EditorPage id={id} onDone={nav.back} />;
  if (!model.collectionsReady) return <Sub title="" onBack={nav.back}><p className="pa-sub">Loading…</p></Sub>;
  if (kind === "pkg") { const p = model.msPkgs.find((x) => x.id === id); return p ? <PackagePage model={model} p={p} nav={nav} /> : <Gone onBack={nav.back} />; }
  if (kind === "build") return <BuilderPage model={model} id={id} nav={nav} />;
  if (kind === "mat") { const m = model.lettersAll.find((x) => x.id === id) ?? model.synopsesAll.find((x) => x.id === id); return m ? <MaterialPage model={model} m={m} nav={nav} /> : <Gone onBack={nav.back} />; }
  if (kind === "ver") return <VersionPage model={model} id={id} nav={nav} />;
  if (kind === "comps") return <CompsPage model={model} usage={usage} nav={nav} />;
  if (kind === "compsin") return <CompsInLetter model={model} letterId={id} nav={nav} />;
  return <AllPage model={model} usage={usage} kind={id} nav={nav} />;
};
const Gone: React.FC<{ onBack: () => void }> = ({ onBack }) => <Sub title="Not found" onBack={onBack}><p className="pa-sub">That isn’t here any more.</p></Sub>;

/* ── a page's head (ref `sub`): back, the title, an optional right-hand control ── */
const Sub: React.FC<{ title: string; onBack: () => void; right?: React.ReactNode; children: React.ReactNode }> = ({ title, onBack, right, children }) => {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onBack(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onBack]);
  return (
    <>
      <div className="pa-pkbk"><button ref={back} type="button" className="pa-pkib" aria-label="Back" data-pa="pk-back" onClick={onBack}>{PI.back}</button><span className="t">{title}</span>{right ?? <span className="pa-pkib-sp" />}</div>
      <div className="pa-pksubbody">{children}</div>
    </>
  );
};

/* ── the pieces of a package as chips: version on pale Harbour, letter and synopsis on the materials pink ── */
const Pieces: React.FC<{ model: Pk26Model; p: SubmissionPackage }> = ({ model, p }) => {
  const ver = model.matName("ver", p.bookVersionId);
  const let_ = model.matName("let", p.queryLetterVersionId);
  const syn = model.matName("syn", p.synopsisVersionId);
  return (
    <span className="pa-apkp" data-pa="pk-pieces">
      {ver ? <span className="pa-pc v">{PI.book}{ver}</span> : null}
      {let_ ? <span className="pa-pc l">{PI.doc}{let_}</span> : null}
      {syn ? <span className="pa-pc l">{PI.note}{syn}</span> : null}
      {!ver && !let_ && !syn ? <span className="pa-sub">Nothing in it yet</span> : null}
    </span>
  );
};
const piecesLine = (model: Pk26Model, p: SubmissionPackage) =>
  [model.matName("ver", p.bookVersionId), model.matName("let", p.queryLetterVersionId), model.matName("syn", p.synopsisVersionId) ?? (p.queryLetterVersionId ? "No synopsis" : null)].filter(Boolean).join(" · ") || "Nothing in it yet";

const LcTag: React.FC<{ p: SubmissionPackage }> = ({ p }) => {
  const s = packageStage(p);
  return <span className={`pa-lc ${s}`} data-pa="pk-stage" data-stage={s}>{s === "out" ? "🔒 " : ""}{STAGE_LABEL[s]}</span>;
};

const PkRow: React.FC<{ model: Pk26Model; p: SubmissionPackage; onOpen: () => void }> = ({ model, p, onOpen }) => (
  <button type="button" className="pa-pkrow" data-pa="pk-row" data-id={p.id} data-stage={packageStage(p)} onClick={onOpen}>
    <span className="pa-pkic" style={{ background: PACKAGE_NAVY }} data-pc={PACKAGE_NAVY} aria-hidden="true">{pkIcon(p)}</span>
    <span className="pa-pkrt"><b>{p.packageName}</b><span className="pa-sub">{piecesLine(model, p)}</span></span>
    <LcTag p={p} />
  </button>
);

/* ── What's landing (land A): swipeable showcase cards ── */
interface ShowCard { key: string; rank: string; name: string; colour: string; icon: React.ReactNode; metric: string; line: string; open: () => void }
function landing(model: Pk26Model, usage?: Usage, letterNames?: (id: string) => string): { cards: Omit<ShowCard, "open">[] & { target?: [string, string] }[]; hidden: string[] } {
  const cards: (Omit<ShowCard, "open"> & { target: [string, string] })[] = [];
  const hidden: string[] = [];
  const pks = model.figItems("pk").map((i) => ({ ...i, f: i.f }));
  const best = packageShowcases(pks.map((i) => ({ id: i.id, name: i.name, f: i.f, retired: i.retired }))).find((s) => s.k === "best");
  if (best) {
    const p = model.msPkgs.find((x) => x.id === best.item.id)!;
    cards.push({ key: "pk", rank: "Your best package", name: p.packageName, colour: PACKAGE_NAVY, icon: pkIcon(p), metric: resultWords(best.item.f), line: piecesLine(model, p), target: ["pkg", p.id] });
  } else hidden.push("package");
  const bl = bestPiece(model.figItems("let").map((i) => ({ id: i.id, name: i.name, f: i.f, retired: i.retired })));
  if (bl) {
    const m = model.lettersAll.find((x) => x.id === bl.item.id);
    cards.push({ key: "let", rank: "Your best letter", name: bl.item.name, colour: "#9b4a57", icon: PI.doc, metric: resultWords(bl.item.f), line: m && m.inPackages.length ? `Used in ${m.inPackages.map((x) => x.packageName).join(" and ")}` : "", target: ["mat", bl.item.id] });
  } else hidden.push("letter");
  const bv = bestPiece(model.figItems("ver").map((i) => ({ id: i.id, name: i.name, f: i.f, retired: i.retired })));
  if (bv) {
    const v = model.versionRows.find((x) => x.id === bv.item.id);
    cards.push({ key: "ver", rank: "Your best version", name: bv.item.name, colour: HB, icon: PI.book, metric: resultWords(bv.item.f), line: v?.summary ?? "", target: ["ver", bv.item.id] });
  } else hidden.push("version");
  /* the desktop ranks a best synopsis too (Pk38Results' row of pieces), so the phone shows it */
  const bs = bestPiece(model.figItems("syn").map((i) => ({ id: i.id, name: i.name, f: i.f, retired: i.retired })));
  if (bs) {
    const m = model.synopsesAll.find((x) => x.id === bs.item.id);
    cards.push({ key: "syn", rank: "Your best synopsis", name: bs.item.name, colour: "#9b4a57", icon: PI.note, metric: resultWords(bs.item.f), line: m && m.inPackages.length ? `Used in ${m.inPackages.map((x) => x.packageName).join(" and ")}` : "", target: ["mat", bs.item.id] });
  }
  /* most named comp: the comp named in the most queries' letters (compUsage, the desktop's own count) */
  if (usage) {
    let top: { c: CompTitle; n: number; letters: string[] } | null = null;
    usage.comps.forEach((c, i) => { const u = usage.byKey.get(compKey(c, i)); if (u && u.queries.length && (!top || u.queries.length > top.n)) top = { c, n: u.queries.length, letters: u.letters }; });
    const t = top as { c: CompTitle; n: number; letters: string[] } | null;
    if (t) cards.push({ key: "comp", rank: "Most named comp", name: t.c.title, colour: "#3a3f4a", icon: PI.pages, metric: `In ${plural(t.n, "query", "queries")}`, line: letterNames ? `Named in ${t.letters.map(letterNames).join(" and ")}` : "", target: ["comps", "1"] });
  }
  return { cards, hidden };
}
const Landing: React.FC<{ cards: { key: string; rank: string; name: string; colour: string; icon: React.ReactNode; metric: string; line: string; target?: [string, string] }[]; hidden: string[] }> = ({ cards, hidden }) => {
  const nav = usePkNav();
  const track = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(0);
  const onScroll = () => { const t = track.current; if (!t || !t.children.length) return; const w = (t.children[0] as HTMLElement).offsetWidth + 12; setOn(Math.round(t.scrollLeft / w)); };
  return (
    <>
      {cards.length ? (
        <>
          <div className="pa-land" ref={track} onScroll={onScroll} data-pa="pk-land" data-count={cards.length}>
            {cards.map((c) => (
              <button key={c.key} type="button" className="pa-show" data-pa="pk-show" data-k={c.key} data-id={c.target?.[1] ?? ""} onClick={() => c.target && nav.open(c.target[0], c.target[1])}>
                <span className="top" style={{ background: c.colour }} data-pc={c.colour}><span className="ic" aria-hidden="true">{c.icon}</span><span className="nm">{c.name}</span></span>
                <span className="rank">{c.rank}</span>
                <span className="ov"><span className="m pa-type" data-pa="pk-show-metric">{c.metric}</span>{c.line ? <span className="c">{c.line}</span> : null}</span>
              </button>
            ))}
          </div>
          {cards.length > 1 ? <div className="pa-dots2" aria-hidden="true">{cards.map((c, i) => <i key={c.key} className={i === on ? "on" : undefined} />)}</div> : null}
        </>
      ) : null}
      {hidden.length ? (
        <p className="pa-sub pa-landnote" data-pa="pk-land-hidden" data-hidden={hidden.join(",")}>
          {cards.length ? `No best ${hidden.join(" or ")} yet: ` : "Nothing to compare yet: "}a piece needs {MIN_SENDS_FOR_CLAIM} answered queries before it counts.
        </p>
      ) : null}
    </>
  );
};

/* ── comps usage (compUsage, the desktop's own) ── */
type Usage = { comps: CompTitle[]; byKey: Map<string, { letters: string[]; sentLetters: string[]; queries: string[]; askedForMore: number }> };
function useUsage(model: Pk26Model): Usage {
  const { versions, packages, queries, activities } = useScriptAllyDb();
  return useMemo(() => {
    const ms = model.activeMs;
    if (!ms) return { comps: [], byKey: new Map() };
    const comps = model.comps;
    return { comps, byKey: compUsage(ms, versions, packages, queries, activities) };
  }, [model.activeMs, model.comps, versions, packages, queries, activities]);
}

/* ── the shelves (3A): Versions, Query letters, Synopses, Comps — paper cards, the in-use one ringed ── */
const Shelves: React.FC<{ model: Pk26Model; usage: Usage; onOpen: (k: string, v: string) => void }> = ({ model, usage, onOpen }) => {
  const { currentUser } = useScriptAllyDb();
  const verOpen = versionsUnlocked(currentUser);
  const lines = (n: number, more: number) => (n ? <>In {plural(n, "query", "queries")}{more ? <> · <em>{plural(more, "request")}</em></> : null}</> : "Not sent yet");
  const shelf = (title: string, kind: string, items: { id: string; name: string; s: React.ReactNode; inUse: boolean }[], cls: string, ico: React.ReactNode, label: string, add: string, onAdd: () => void, page: string) => (
    <section data-pa="pk-shelf" data-kind={kind}>
      <div className="pa-shd"><h2 className="pa-h2">{title}</h2>{items.length ? <button type="button" className="pa-link" data-pa="pk-shelf-all" onClick={() => onOpen("all", kind)}>See all</button> : null}</div>
      <div className="pa-shelf">
        {items.map((it) => (
          <button key={it.id} type="button" className={`pa-sheetc ${cls}${it.inUse ? " inuse" : ""}`} data-pa="pk-sheet" data-id={it.id} data-inuse={it.inUse ? "1" : "0"} onClick={() => onOpen(page, it.id)}>
            <span className="k">{ico}{label}{it.inUse ? <span className="pa-inuse">In use</span> : null}</span>
            <b>{it.name}</b><span className="s">{it.s}</span>
          </button>
        ))}
        <button type="button" className="pa-sheetc add" data-pa="pk-sheet-add" data-kind={kind} onClick={onAdd}>{PI.plus}{add}</button>
      </div>
    </section>
  );
  const factsLine = (k: "let" | "syn" | "ver", id: string) => { const f = model.pieceFacts(k, id); return lines(f.n, f.more); };
  return (
    <>
      {verOpen ? shelf("Versions", "ver", model.versionRows.map((v) => ({ id: v.id, name: v.name, s: factsLine("ver", v.id), inUse: v.inUse })), "", PI.book, "Version", "New version", () => onOpen("ver", "new"), "ver") : (
        <section data-pa="pk-shelf" data-kind="ver" data-locked="1">
          <div className="pa-shd"><h2 className="pa-h2">Versions</h2></div>
          <div className="pa-lockn" data-pa="pk-ver-locked">{lockI}<span>Versions are part of Pro. Keep each draft you send, and see which one gets requests.</span></div>
        </section>
      )}
      {shelf("Query letters", "let", model.letters.map((m) => ({ id: m.id, name: m.name, s: factsLine("let", m.id), inUse: m.inUse })), "l", PI.doc, "Query letter", "New letter", () => onOpen("edit", "new-let"), "mat")}
      {shelf("Synopses", "syn", model.synopses.map((m) => ({ id: m.id, name: m.name, s: factsLine("syn", m.id), inUse: m.inUse })), "l", PI.note, "Synopsis", "New synopsis", () => onOpen("edit", "new-syn"), "mat")}
      {shelf("Comps", "comp", usage.comps.map((c, i) => {
        const u = usage.byKey.get(compKey(c, i));
        const age = compAge(c, currentYear());
        return { id: compKey(c, i), name: c.title, s: <>{[c.author, c.year].filter(Boolean).join(" · ")}{u?.queries.length ? <> · <em>In {plural(u.queries.length, "query", "queries")}</em></> : age ? " · Over five years old" : null}</>, inUse: false };
      }), "", PI.pages, "Comp", "Add a comp", () => onOpen("comps", "add"), "comps")}
    </>
  );
};

/* ═══ A PACKAGE — Phone app v5, Phase F (design-refs/phone-app-v5/phone-materials-v1.html P2) ═══════════════════════
   ⚠️ HOW IT'S DOING IS packageMetrics' OWN (`packageMetrics`: the queries whose `packageId` is this package — sent,
   asked for more, the rate by `formatRate`), so the card, the header and this page cannot disagree. "Best of your N
   packages" is said only by lib/phoneV5 `bestClaim` (strongestPackage, at MIN_SENDS_FOR_CLAIM, strictly ahead).
   What an agent receives: the three slots (an unfilled slot "" says so, isSlotFilled). A package that has not gone out
   swaps a piece in the builder, opened on that slot (`?build=<id>&slot=`); one that has gone out is locked
   (`isLocked`), so a piece opens its own page. The opening sample line is true: the log journey keeps the portion's
   own control in package mode (queryActions/journeys/LogJourney.tsx, "HOW MUCH OF THE BOOK"). Sent to: the same
   queries, newest first. One button sets it going out with new queries (Packages' `makeActive` = db
   `setActivePackage`), where `canMakeActive` allows; on the active one it says so instead. */
/* Escape leaves the page — last, after any sheet opened over it (one cascade: lib/escapeStack) */
const PushBar: React.FC<{ title: string; onBack: () => void; right?: React.ReactNode }> = ({ title, onBack, right }) => {
  useEscapeLayer(true, onBack, ESC_LEVEL.pageMode);
  return (
    <div className="pa5m-bar" data-pa5="push-bar">
      <button type="button" className="pa4-ib" aria-label="Back" data-pa="pk-back" onClick={onBack}><I4 n="back" /></button>
      <b className="pa5m-bart">{title}</b>
      {right ?? <span className="pa5m-barsp" />}
    </div>
  );
};

const PackagePage: React.FC<{ model: Pk26Model; p: SubmissionPackage; nav: ReturnType<typeof usePkNav> }> = ({ model, p, nav }) => {
  const { queries, agents } = useScriptAllyDb();
  const [all, setAll] = useState(false);
  const stage = packageStage(p);
  const locked = isLocked(p);
  const isActive = model.active?.id === p.id;
  const stat = packageMetrics(p.id, queries);
  const best = bestClaim(p.id, model.msPkgs, queries);
  const books = readVersions(model.activeMs);
  const pieces = pkgPieces(p, [...model.lettersAll, ...model.synopsesAll].map((m) => ({ id: m.id, versionName: m.name })), books);
  const letter = model.lettersAll.find((m) => m.id === p.queryLetterVersionId) ?? null;
  const ver = books.find((v) => v.id === p.bookVersionId) ?? null;
  const extras = model.extras.filter((e) => (p.extraIds ?? []).includes(e.id));
  const sentTo = queries.filter((q) => q.packageId === p.id).sort((a, b) => String(b.dateSent ?? "").localeCompare(String(a.dateSent ?? "")));
  const shown = all ? sentTo : sentTo.slice(0, 3);
  const swap = (k: PieceKey) => nav.navigate({ pathname: PACKAGES_PATH, search: `?build=${encodeURIComponent(p.id)}&slot=${k}` }, { state: { pk2: true } });
  const copy = async () => { const id = await model.duplicate(p); if (id) nav.replace("pkg", id); };
  const ICO: Record<PieceKey, [string, string]> = { let: ["L", "var(--pa-st-pink)"], syn: ["S", "var(--pa-st-sand)"], ver: ["M", "var(--pa-st-slate)"] };
  const line = (x: PkgPiece): string => {
    if (!x.set) return "Not set";
    if (x.k === "let") { const n = letter ? letterCompCount(letter) : null; return [pieceChip(x), n == null ? null : compsWords(n).toLowerCase()].filter(Boolean).join(" · "); }
    if (x.k === "ver") return [pieceChip(x), ver?.changes[0] ?? null].filter(Boolean).join(" · ");
    return pieceChip(x);
  };
  return (
    <div className="pa4 pa5 pa5m-page" data-pa5="pkg-page" data-id={p.id} data-stage={stage} data-sent={stat.sent} data-requests={stat.requests}>
      <PushBar title={p.packageName} onBack={nav.back} />
      <div className="pa5m-pgb">
        <div className="pa4-card pa5m-how" data-pa5="pkg-how">
          <div className="pa4-s">How it’s doing</div>
          <div className="pa5m-figs">
            <div><b>{stat.sent}</b><span className="pa4-s">{stat.sent === 1 ? "query sent" : "queries sent"}</span></div>
            <div><b>{stat.requests}</b><span className="pa4-s">asked for more</span></div>
            <div><b>{formatRate(stat.requestRate)}</b><span className="pa4-s">request rate</span></div>
          </div>
          {best ? <p className="pa4-s pa5m-best" data-pa5="pkg-best">{best}</p> : null}
        </div>

        <h2 className="pa5m-h pa5m-sec">What an agent receives</h2>
        <div className="pa4-card pa5m-list" data-pa5="pkg-receives">
          {pieces.map((x) => {
            const opensPiece = locked && x.set && x.id;
            const go = !locked ? () => swap(x.k) : opensPiece ? () => nav.open(x.k === "ver" ? "ver" : "mat", x.id!) : undefined;
            const inner = (<>
              <span className="pa5m-ico" style={{ background: ICO[x.k][1] }} aria-hidden="true">{ICO[x.k][0]}</span>
              <span className="pa4-x"><span className="pa4-s" style={{ display: "block" }}>{x.label}</span><b>{line(x)}</b></span>
              {go ? <Chev /> : null}
            </>);
            return go
              ? <button key={x.k} type="button" className="pa4-tap" data-pa5="pkg-slot" data-k={x.k} data-set={x.set ? "1" : "0"} onClick={go}>{inner}</button>
              : <div key={x.k} className="pa4-tap" data-pa5="pkg-slot" data-k={x.k} data-set={x.set ? "1" : "0"}>{inner}</div>;
          })}
          {extras.length ? <div className="pa4-tap" data-pa5="pkg-slot" data-k="ext"><span className="pa5m-ico" aria-hidden="true">+</span><span className="pa4-x"><span className="pa4-s" style={{ display: "block" }}>Also sends</span><b>{extras.map((e) => e.name).join(" · ")}</b></span></div> : null}
        </div>
        <p className="pa4-s pa5m-note" data-pa5="pkg-sample">The opening sample is set per agent when you log a query.</p>
        {locked ? <p className="pa4-s pa5m-note" data-pa5="pkg-locked">It’s gone out, so it’s locked: changing it would muddle its numbers. Make a copy to try something different.</p> : null}

        <h2 className="pa5m-h pa5m-sec">Sent to</h2>
        {sentTo.length ? (
          <div className="pa4-card pa5m-list" data-pa5="pkg-sent" data-n={sentTo.length}>
            {shown.map((q) => {
              const a = agents.find((x) => x.id === q.agentId);
              return (
                <button key={q.id} type="button" className="pa4-tap" data-pa5="pkg-sent-row" data-id={q.id} onClick={() => nav.navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(q.id)}` })}>
                  <span className="pa4-x"><b>{a?.name || a?.agency || "An agent no longer on file"}</b><span className="pa4-s">{STAGE_NAME[q.status] ?? String(q.status)}</span></span><Chev />
                </button>
              );
            })}
            {sentTo.length > 3 && !all ? <Link4 rule pa4="pkg-sent-all" data-pa5="pkg-sent-all" onClick={() => setAll(true)}>See all {sentTo.length}</Link4> : null}
          </div>
        ) : <p className="pa4-s pa5m-note" data-pa5="pkg-sent-none">Not sent yet.</p>}
      </div>
      <div className="pa5m-act" data-pa5="pkg-act">
        {isActive ? <button type="button" className="pa4-cta" disabled data-pa5="pkg-set-active" data-on="1">Going out with new queries ✓</button>
          : canMakeActive(p, model.active?.id) ? <button type="button" className="pa4-cta" data-pa5="pkg-set-active" data-on="0" onClick={() => void model.makeActive(p)}>Use for new queries</button>
          : null}
        {!locked ? <Link4 pa4="pkg-change" data-pa5="pkg-change" onClick={() => nav.open("build", p.id)}>Change what’s in it</Link4>
          : <>
            <Link4 pa4="pkg-copy" data-pa5="pkg-copy" onClick={() => void copy()}>Make a copy</Link4>
            {canRetire(p, model.active?.id) ? <Link4 pa4="pkg-stop" data-pa5="pkg-stop" onClick={() => void model.retire(p).then((ok) => { if (ok) nav.back(); })}>Stop using it</Link4> : null}
          </>}
      </div>
    </div>
  );
};

const mi = (ico: React.ReactNode, bg = "var(--pa-fill)") => <span className="pa-mi" style={{ background: bg }} aria-hidden="true">{ico}</span>;

/* the funnel: how far the queries got, from Analytics' own rows (reachedRequest · reachedFull · reachedOffer) */
interface FunnelF { n: number; partial: number; full: number; offer: number }
function funnelOf(ids: readonly string[], rows: Pk26Model["rowsById"]): FunnelF {
  const rs = ids.map((id) => rows.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof rows.get>>[];
  return { n: ids.length, partial: rs.filter((r) => r.reachedRequest).length, full: rs.filter((r) => r.reachedFull).length, offer: rs.filter((r) => r.reachedOffer).length };
}
const Funnel: React.FC<{ f: FunnelF }> = ({ f }) => (
  <div className="pa-funnel" data-pa="funnel">
    {([["Queried", f.n], ["Partial", f.partial], ["Full", f.full], ["Offer", f.offer]] as const).map(([w, n]) => (
      <div key={w} data-k={w} data-n={n}><span>{w}</span><i style={{ width: `${Math.max(f.n ? (n / f.n) * 100 : 0, 2)}%`, ...(n ? {} : { background: "var(--pa-fill)" }) }} /><b>{n}</b></div>
    ))}
  </div>
);

const QueryRows: React.FC<{ ids: readonly string[]; model: Pk26Model }> = ({ ids, model }) => {
  const navigate = useNavigate();
  const { agents } = useScriptAllyDb();
  if (!ids.length) return <p className="pa-sub" data-pa="pk-q-none">None yet.</p>;
  return (
    <div className="pa-card pa-pad0" data-pa="pk-queries">
      {ids.map((id) => {
        const q = model.msQueries.find((x) => x.id === id);
        if (!q) return null;
        const a = agents.find((x) => x.id === q.agentId);
        return (
          <button key={id} type="button" className="pa-mslot" data-pa="pk-q" onClick={() => navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(id)}` })}>
            <PhoneDisc status={q.status} size={36} />
            <span className="t"><b>{a?.name || a?.agency || "Agent"}</b><small>{[STAGE_NAME[q.status] ?? String(q.status), a?.name && a.agency ? a.agency : null].filter(Boolean).join(" · ")}</small></span>
            <span className="pa-chev">{PI.chev}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ═══ THE BUILDER (build B): what an agent receives ═══════════════════════════════════════════════════════════════ */
type Slot = "ver" | "let" | "syn" | "ext";
const BuilderPage: React.FC<{ model: Pk26Model; id: string; nav: ReturnType<typeof usePkNav> }> = ({ model, id, nav }) => {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const existing = id !== "new" ? model.msPkgs.find((p) => p.id === id) ?? null : null;
  const lockedEdit = !!existing && isLocked(existing);
  const ms = model.activeMs;
  const [name, setName] = useState(() => existing?.packageName ?? nextName(model.msPkgs.map((p) => p.packageName)));
  const [ver, setVer] = useState<string>(() => existing?.bookVersionId ?? ms?.inUseBookVersionId ?? "");
  const [let_, setLet] = useState<string>(() => existing?.queryLetterVersionId ?? "");
  const [syn, setSyn] = useState<string>(() => existing?.synopsisVersionId ?? "");
  const [ext, setExt] = useState<string[]>(() => existing?.extraIds ?? []);
  /* Phone app v5: a package's page opens the builder on the piece it swaps (`&slot=let|syn|ver`) */
  const [pick, setPick] = useState<Slot | null>(() => { const s = nav.params.get("slot"); return s === "ver" || s === "let" || s === "syn" ? s : null; });
  const [renaming, setRenaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const done: Record<Slot, boolean> = { ver: !!ver, let: !!let_, syn: !!syn, ext: ext.length > 0 };
  const now: Slot | null = !ver ? "ver" : !let_ ? "let" : !syn ? "syn" : null;
  const letter = model.letters.find((m) => m.id === let_) ?? null;
  const verRow = model.versionRows.find((v) => v.id === ver) ?? null;
  const words = (verRow && readVersions(ms).find((v) => v.id === verRow.id)?.wordCount) ?? ms?.wordCount ?? null;
  const subject = ms ? `Query: ${(ms.title || "").toUpperCase()} (${[ms.genre?.toString().toLowerCase(), ms.wordCount ? `${ms.wordCount.toLocaleString("en-GB")} words` : null].filter(Boolean).join(", ")})` : "Query";

  if (lockedEdit) return <Sub title={existing!.packageName} onBack={nav.back}><div className="pa-lockn">{lockI}<span>It’s gone out, so it’s locked. Make a copy to try something different.</span></div></Sub>;

  const save = async (ready: boolean) => {
    if (saving || !ms) return;
    setSaving(true);
    const fields = {
      packageName: name.trim() || "New package",
      queryLetterVersionId: let_, synopsisVersionId: syn,
      extraIds: ext, otherMaterials: model.extras.filter((e) => ext.includes(e.id)).map((e) => e.name).join(", "),
      ...(ver ? { bookVersionId: ver } : {}),
    };
    let pid = existing?.id ?? null;
    if (!pid) {
      pid = await model.createPackage({ name: fields.packageName, note: "", icon: "box" as PackageIcon, from: null });
      if (!pid) { setSaving(false); return; }
    }
    const err = await db.updatePackage(pid, fields);
    setSaving(false);
    if (err) { showToast({ message: err }); return; }
    showToast({ message: ready ? `${fields.packageName} is ready. It goes out with the next query you log with it.` : `Saved ${fields.packageName} as a draft.` });
    nav.replace("pkg", pid);
  };

  return (
    <>
      <div className="pa-band pa-band--page" data-pa="build-band">
        <div className="pa-bandrow">
          <button type="button" className="pa-ring" aria-label="Close" data-pa="build-close" onClick={nav.back}>{PI.close}</button>
          <span className="pa-grow" />
          <button type="button" className="pa-btn onnavy sm" data-pa="build-draft" disabled={saving} onClick={() => void save(false)}>Save draft</button>
        </div>
        {renaming ? <input className="pa-bnamein" autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setRenaming(false)} onKeyDown={(e) => { if (e.key === "Enter") setRenaming(false); }} aria-label="Package name" data-pa="build-name-in" />
          : <button type="button" className="pa-bname" data-pa="build-name" onClick={() => setRenaming(true)}><span className="pa-bt">{name}</span><span className="pa-bnamehint">Tap the name to rename it</span></button>}
        <div className="pa-steps4" data-pa="build-steps">
          {([["ver", "Version"], ["let", "Letter"], ["syn", "Synopsis"], ["ext", "Extras"]] as [Slot, string][]).map(([k, w]) => (
            <span key={k} className={done[k] ? "ok" : undefined} data-pa="build-step" data-k={k} data-ok={done[k] ? "1" : "0"}>{done[k] ? PI.check : null}{w}</span>
          ))}
        </div>
      </div>
      <div className="pa-pksubbody">
        <div className="pa-shd pa-shd--first"><h2 className="pa-h2">What an agent receives</h2></div>
        <div className="pa-mail" data-pa="build-mail">
          <div className="pa-mh"><div><span>To</span>the agent’s email or form</div><div data-pa="build-subject"><span>Subject</span>{subject}</div></div>
          <SlotRow k="ver" order={0} now={now} filled={!!verRow} icon={mi(PI.book, "#e3ebf0")} title={verRow ? `Pages from ${verRow.name}` : "Choose a version"} sub={verRow ? `From ${verRow.name}${words ? ` · ${words.toLocaleString("en-GB")} words` : ""}` : "The pages they read come from a version of your book"} action={verRow ? "Change" : "Choose"} onPick={() => setPick("ver")} />
          <SlotRow k="let" order={1} now={now} filled={!!letter} icon={mi(PI.doc, MPINK)} title={letter ? letter.name : "Choose a query letter"} sub={letter ? "Query letter · in the email" : "The letter agents read first"} action={letter ? "Change" : "Choose"} onPick={() => setPick("let")} />
          {letter?.text ? <div className="pa-excerpt" data-pa="build-excerpt">{letter.text.slice(0, 140).trim()}{letter.text.length > 140 ? "…" : ""}</div> : null}
          <SlotRow k="syn" order={2} now={now} filled={!!syn} icon={mi(PI.note, syn ? MPINK : "#fff")} title={syn ? model.matName("syn", syn) ?? "Synopsis" : "Add a synopsis"} sub={syn ? "Synopsis" : "Skip it if this agent doesn’t ask for one"} action={syn ? "Change" : "Choose"} onPick={() => setPick("syn")} />
          <SlotRow k="ext" order={3} now={now} filled={ext.length > 0} icon={mi(PI.plus)} title="Also sends" sub={ext.length ? model.extras.filter((e) => ext.includes(e.id)).map((e) => e.name).join(" · ") : "Author bio, a cover note, anything else"} action={ext.length ? "Change" : "Add"} onPick={() => setPick("ext")} last />
        </div>
        <button type="button" className="pa-btn pri blk pa-hb pa-mt16" data-pa="build-ready" disabled={!let_ || !ver || saving} onClick={() => void save(true)}>Mark as ready</button>
        <p className="pa-sub pa-center pa-mt8">{!let_ || !ver ? "A package is ready once it has a version and a letter." : "You can still change it until it goes out with a query."}</p>
      </div>
      <Picker kind={pick} model={model} sel={{ ver, let: let_, syn, ext }} onClose={() => setPick(null)}
        onChoose={(k, v) => { if (k === "ver") setVer(v); if (k === "let") setLet(v); if (k === "syn") setSyn(v); setPick(null); }}
        onToggleExtra={(v) => setExt((x) => (x.includes(v) ? x.filter((y) => y !== v) : [...x, v]))}
        onWrite={(k) => { setPick(null); nav.open("edit", k === "let" ? "new-let" : "new-syn"); }} />
    </>
  );
};
function nextName(taken: string[]): string {
  let n = taken.length + 1;
  while (taken.includes(`Package ${n}`)) n += 1;
  return `Package ${n}`;
}
const SlotRow: React.FC<{ k: Slot; order: number; now: Slot | null; filled: boolean; icon: React.ReactNode; title: string; sub: string; action: string; onPick: () => void; last?: boolean }> = ({ k, order, now, filled, icon, title, sub, action, onPick, last }) => (
  <button type="button" className={`pa-mslot${filled ? "" : " empty"}${now === k ? " now" : ""}${last ? " last" : ""}`} data-pa="build-slot" data-k={k} data-order={order} data-now={now === k ? "1" : "0"} onClick={onPick}>
    {icon}<span className="t"><b>{title}</b><small>{sub}</small></span><span className="ch">{action}</span>
  </button>
);

const Picker: React.FC<{
  kind: Slot | null; model: Pk26Model; sel: { ver: string; let: string; syn: string; ext: string[] };
  onClose: () => void; onChoose: (k: Slot, id: string) => void; onToggleExtra: (id: string) => void; onWrite: (k: "let" | "syn") => void;
}> = ({ kind, model, sel, onClose, onChoose, onToggleExtra, onWrite }) => {
  const rows = kind === "ver" ? model.versionRows.map((v) => ({ id: v.id, name: v.name, f: model.pieceFacts("ver", v.id), inUse: v.inUse }))
    : kind === "let" ? model.letters.map((m) => ({ id: m.id, name: m.name, f: model.pieceFacts("let", m.id), inUse: m.inUse }))
    : kind === "syn" ? model.synopses.map((m) => ({ id: m.id, name: m.name, f: model.pieceFacts("syn", m.id), inUse: m.inUse })) : [];
  const title = kind === "ver" ? "Which version?" : kind === "let" ? "Which query letter?" : kind === "syn" ? "Which synopsis?" : "Also sends";
  const cur = kind === "ver" ? sel.ver : kind === "let" ? sel.let : kind === "syn" ? sel.syn : "";
  return (
    <MobileSheet open={!!kind} onClose={onClose} ariaLabel={title} pa={{ height: "auto", white: true, z: 1100 }}>
      <div data-pa="build-picker" data-k={kind ?? ""}>
        <h2 className="pa-sht">{title}</h2>
        <div className="pa-card pa-pad0">
          {kind === "ext" ? model.extras.map((e) => (
            <button key={e.id} type="button" className="pa-mslot" data-pa="pick-row" data-id={e.id} onClick={() => onToggleExtra(e.id)}>
              <span className={`pa-tbx${sel.ext.includes(e.id) ? " on" : ""}`}>{sel.ext.includes(e.id) ? PI.check : null}</span><span className="t"><b>{e.name}</b></span>
            </button>
          )) : rows.map((r) => (
            <button key={r.id} type="button" className={`pa-mslot${r.id === cur ? " now" : ""}`} data-pa="pick-row" data-id={r.id} onClick={() => onChoose(kind!, r.id)}>
              {mi(kind === "ver" ? PI.book : kind === "let" ? PI.doc : PI.note, kind === "ver" ? "#e3ebf0" : MPINK)}
              <span className="t"><b>{r.name}{r.inUse ? <span className="pa-inuse">In use</span> : null}</b><small>{r.f.n ? `In ${plural(r.f.n, "query", "queries")} · ${plural(r.f.more, "request")}` : "Not sent yet"}</small></span>
              {r.id === cur ? <span className="pa-tick">{PI.check}</span> : null}
            </button>
          ))}
          {kind === "ext" && !model.extras.length ? <p className="pa-sub" style={{ padding: "12px 16px" }}>No extras yet. Add one on a computer: an author bio, a cover note.</p> : null}
          {kind === "let" || kind === "syn" ? (
            <button type="button" className="pa-mslot" data-pa="pick-write" onClick={() => onWrite(kind)}>{mi(PI.plus)}<span className="t"><b>Write a new {kind === "let" ? "letter" : "synopsis"}</b><small>Opens the editor, then comes back here</small></span></button>
          ) : null}
          {kind === "ver" && !rows.length ? <p className="pa-sub" style={{ padding: "12px 16px" }}>No versions yet.</p> : null}
        </div>
      </div>
    </MobileSheet>
  );
};

/* ═══ A LETTER OR A SYNOPSIS — Phone app v5, Phase F (phone-materials-v1.html P4) ═══════════════════════════════════
   The wording to read; for a letter, the comps it mentions as chips, picked from the Comps list and written through
   the letter's own writer (db `updateVersion(id, { compIds })`, as Comps in a letter does), read-only once the letter
   is fixed (compUsage `letterFixed`); its result, the desktop's per-piece figure (lib/phoneV5 `materialFacts` — a
   query sent without a package counts here, on its letter, and on no package); "Edit the wording" (v4's plain-text
   editor, `?edit=`) and "Save as a new letter" (Packages' own `saveMaterial(…, "new")`, the desktop's save-as-new). */
const MaterialPage: React.FC<{ model: Pk26Model; m: Pk26Model["lettersAll"][number]; nav: ReturnType<typeof usePkNav> }> = ({ model, m, nav }) => {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const [more, setMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const v = db.versions.find((x) => x.id === m.id) ?? null;
  const isLet = m.kind === "let";
  const word = isLet ? "letter" : "synopsis";
  const f = materialFacts(m.kind, m.id, model.msQueries, model.pieceCtx, model.rowsById);
  const r = pieceResult(f);
  const qs = materialQueries(m.kind, m.id, model.msQueries, model.pieceCtx);
  const inPk = [...new Set(qs.map((q) => sentRecordOf(q).packageId).filter((x): x is string => !!x))].map((id) => model.msPkgs.find((p) => p.id === id)?.packageName).filter(Boolean) as string[];
  const alone = qs.some((q) => !sentRecordOf(q).packageId);
  const lastMs = Math.max(0, ...qs.map((q) => model.rowsById.get(q.id)?.sentMs ?? 0));
  const usedLine = [inPk.length ? `Sent in ${inPk.join(" and ")}` : null, alone ? "sent on its own" : null, lastMs ? `last used ${dayMonth(lastMs)}` : null].filter(Boolean).join(" · ");
  const act = model.active;
  const inAct = !!act && (isLet ? act.queryLetterVersionId : act.synopsisVersionId) === m.id;
  const fixed = isLet && !!v && letterFixed(v, db.queries, db.versions, db.packages);
  const ids = (m.compIds ?? []).slice();
  const named = isLet ? compsInLetter(model.comps, v) : [];
  const free = model.comps.filter((c) => !!c.id && !ids.includes(c.id));
  const setComps = async (next: string[]) => {
    const err = await db.updateVersion(m.id, { compIds: next });
    if (err) showToast({ message: err });
  };
  const copyText = async () => { try { await navigator.clipboard.writeText(m.text); showToast({ message: "Copied the text." }); } catch { showToast({ message: "Couldn’t copy. Select the text and copy it instead." }); } };
  const saveNew = async () => {
    if (saving) return;
    setSaving(true);
    await model.saveMaterial(m, { name: m.name, summary: m.summary, text: m.text, compIds: m.compIds }, "new");
    setSaving(false);
  };
  const paras = paragraphs(m.text);
  return (
    <div className="pa4 pa5 pa5m-page" data-pa5="letter-page" data-id={m.id} data-kind={m.kind} data-sent={r.sent} data-requests={r.more}>
      <PushBar title={m.name} onBack={nav.back} right={<button type="button" className="pa4-ib" aria-label="More" data-pa="mat-more" onClick={() => setMore(true)}><span aria-hidden="true" className="pa5m-dots">⋯</span></button>} />
      <div className="pa5m-pgb">
        {inAct || m.retired ? <div className="pa5m-chips" style={{ marginBottom: 12 }}>{inAct ? <span className="pa5m-tag use">In {act!.packageName}</span> : null}{m.retired ? <span className="pa5m-tag">Put away</span> : null}</div> : null}
        <div className="pa5m-read" data-pa5="letter-text">
          {paras.length ? paras.map((t, i) => <p key={i}>{t}</p>) : <p className="pa4-s">No wording yet.</p>}
        </div>
        {isLet ? (
          <>
            <h2 className="pa5m-h pa5m-sec">Comps in this letter</h2>
            <div className="pa5m-chips" data-pa5="letter-comps" data-n={named.length} data-fixed={fixed ? "1" : "0"}>
              {named.map((c) => fixed
                ? <span key={c.id} className="pa5m-tag b2" data-pa5="letter-comp" data-id={c.id}>{c.title}</span>
                : <button key={c.id} type="button" className="pa5m-tag b2 x" data-pa5="letter-comp" data-id={c.id} aria-label={`Take ${c.title} out of this letter`}
                    onClick={() => void setComps(ids.filter((x) => x !== c.id))}>{c.title}<span aria-hidden="true">×</span></button>)}
              {!fixed && ids.length < MAX_LETTER_COMPS ? <button type="button" className="pa5m-tag add" data-pa5="letter-comp-add" onClick={() => setAdding(true)}>+ Add</button> : null}
            </div>
            {fixed ? <p className="pa4-s pa5m-note">{m.name} has gone out, so the comps it names are fixed. Save it as a new letter to change them.</p>
              : !named.length ? <p className="pa4-s pa5m-note">{m.compIds ? "This letter names no comps." : "Not noted yet."}</p> : null}
          </>
        ) : null}
        <h2 className="pa5m-h pa5m-sec">How it’s doing</h2>
        <div className="pa4-card pa5m-how" data-pa5="letter-result">
          <div className="pa4-b">{r.of ? <><b className="pa5m-big">{r.big} {r.of}</b> asked for more</> : r.words}</div>
          {usedLine ? <div className="pa4-s">{usedLine.charAt(0).toUpperCase() + usedLine.slice(1)}</div> : null}
        </div>
      </div>
      <div className="pa5m-act" data-pa5="letter-act">
        <button type="button" className="pa4-cta" data-pa5="letter-edit" onClick={() => nav.open("edit", m.id)}>Edit the wording</button>
        <Link4 pa4="letter-new" data-pa5="letter-new" disabled={saving} onClick={() => void saveNew()}>Save as a new {word}</Link4>
      </div>

      <MobileSheet open={adding} onClose={() => setAdding(false)} ariaLabel="Add a comp to this letter" pa={{ height: "auto", white: true, z: 1100 }}>
        <div className="pa4-layer pa5m-pick" data-pa5="letter-comp-pick">
          <h2 className="pa5m-h">Add a comp</h2>
          {free.map((c) => (
            <button key={c.id} type="button" className="pa4-tap" data-pa5="letter-comp-pick-row" data-id={c.id} onClick={() => { setAdding(false); void setComps([...ids, c.id!]); }}>
              <span className="pa4-x"><b>{c.title}</b>{c.author || c.year ? <span className="pa4-s">{[c.author, c.year].filter(Boolean).join(" · ")}</span> : null}</span><Chev />
            </button>
          ))}
          {!free.length ? <p className="pa4-s" style={{ padding: "8px 0" }}>{model.comps.length ? "Every comp on your list is in this letter." : "No comps yet."}</p> : null}
          <Link4 rule pa4="letter-comp-list" onClick={() => { setAdding(false); nav.navigate({ pathname: "/materials", search: "?tab=comps" }); }}>Your comps list</Link4>
        </div>
      </MobileSheet>
      <MobileSheet open={more} onClose={() => setMore(false)} ariaLabel="More" pa={{ height: "auto", drag: false, z: 1100 }}>
        <div className="pa4-layer pa5m-pick">
          <h2 className="pa5m-h">{m.name}</h2>
          <button type="button" className="pa4-tap" data-pa="mat-copy" onClick={() => { setMore(false); void copyText(); }}><span className="pa4-x"><b>Copy the text</b></span></button>
          {m.retired
            ? <button type="button" className="pa4-tap" onClick={() => { setMore(false); void model.bringBack(m); }}><span className="pa4-x"><b>Bring it back</b></span></button>
            : <button type="button" className="pa4-tap" data-pa="mat-putaway" onClick={() => { setMore(false); void model.putAwayMat(m); }}><span className="pa4-x"><b>Put it away</b></span></button>}
        </div>
      </MobileSheet>
    </div>
  );
};

/* the full-screen editor (last screens' PhoneLetterEditor, on the base model it was built for) */
const EditorPage: React.FC<{ id: string; onDone: () => void }> = ({ id, onDone }) => {
  const base = usePackagesModel();
  if (!base.collectionsReady) return null;
  if (id === "new-let" || id === "new-syn") return <PhoneLetterEditor model={base} m={null} kind={id === "new-let" ? "letter" : "synopsis"} onDone={onDone} />;
  const m = base.matById("letter", id) ?? base.matById("synopsis", id);
  if (!m) return null;
  return <PhoneLetterEditor model={base} m={m} kind={m.kind === "synopsis" ? "synopsis" : "letter"} onDone={onDone} />;
};

/* ═══ A VERSION (ref `PAGES.ver`) ═════════════════════════════════════════════════════════════════════════════════ */
const VersionPage: React.FC<{ model: Pk26Model; id: string; nav: ReturnType<typeof usePkNav> }> = ({ model, id, nav }) => {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const ms = model.activeMs;
  const all = readVersions(ms);
  const v = all.find((x) => x.id === id) ?? null;
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  if (id === "new") return <Sub title="New version" onBack={nav.back}><NewVersion model={model} onSaved={(nid) => nav.replace("ver", nid)} /></Sub>;
  if (!v || !ms) return <Gone onBack={nav.back} />;
  const inUse = inUseId(ms, model.msPkgs) === v.id;
  const parent = v.parentId ? all.find((x) => x.id === v.parentId) ?? null : null;
  const f = model.pieceFacts("ver", v.id);
  const ids = model.msQueries.filter((q) => (q.bookVersionId ?? model.msPkgs.find((p) => p.id === (q.sentPackageId || q.packageId))?.bookVersionId) === v.id).map((q) => q.id);
  const funnel = funnelOf(ids.filter((qid) => model.msQueries.find((q) => q.id === qid)?.status !== "Withdrawn"), model.rowsById);
  const write = async (fields: ReturnType<typeof setInUse>, msg: string) => {
    if (typeof fields === "string") { showToast({ message: REFUSAL[fields] ?? "That can’t be changed." }); return false; }
    const ok = await db.writeVersionChange(ms.id, fields);
    showToast({ message: ok ? msg : "That didn’t save. Try again." });
    return ok;
  };
  return (
    <Sub title={v.name} onBack={nav.back}>
      <div className="pa-matmeta">{inUse ? <span className="pa-inuse">In use</span> : null}<span className="pa-sub">{[v.createdDate ? `Saved ${dayMonth(v.createdDate)}` : null, v.wordCount ? `${v.wordCount.toLocaleString("en-GB")} words` : null].filter(Boolean).join(" · ")}</span></div>
      {v.original ? <div className="pa-card"><div className="pa-sub pa-strong">As you first sent it</div></div> : (
        <div className="pa-card" data-pa="ver-changed">
          <div className="pa-sub pa-strong">What changed</div>
          <div className="pa-chg"><span className="vb">{parent?.name ?? "Before"}</span><span className="ar">→</span><span className="vb n">{v.name}</span></div>
          {v.changes.length ? <div className="pa-chgs">{v.changes.map((c, i) => <span key={i}>{c}</span>)}</div> : <p className="pa-sub">No changes noted.</p>}
        </div>
      )}
      <div className="pa-fsum pa-mt14" data-pa="ver-figs">
        <div><b>{f.n}</b><span>{f.n === 1 ? "query" : "queries"}</span></div>
        <div><b>{f.more}</b><span>asked for more</span></div>
        <div><b>{f.pct != null ? `${f.pct}%` : "–"}</b><span>{f.pct != null ? "request rate" : "rate after 5 sent"}</span></div>
      </div>
      <div className="pa-shd"><h2 className="pa-h2">How far it gets</h2></div>
      <div className="pa-card"><Funnel f={funnel} /></div>
      <div className="pa-acts3 three" data-pa="ver-acts">
        <button type="button" data-pa="ver-edit" onClick={() => setEditing(true)}>{PI.edit}Edit</button>
        <button type="button" data-pa="ver-use" disabled={inUse} onClick={() => void write(setInUse(ms, v.id), `New queries now use ${v.name}.`)}>{PI.check}{inUse ? "In use" : "Use for new queries"}</button>
        <button type="button" data-pa="ver-archive" disabled={v.original || inUse} onClick={() => setAsking(true)}>{PI.closeq}Archive</button>
      </div>
      <div className="pa-shd"><h2 className="pa-h2">Its queries and where they stand</h2></div>
      <QueryRows ids={ids} model={model} />
      <MobileSheet open={asking} onClose={() => setAsking(false)} ariaLabel="Archive" pa={{ height: "auto", drag: false, z: 1100 }}>
        <div data-pa="ver-archive-ask">
          <h2 className="pa-sht">Archive {v.name}?</h2>
          <p className="pa-sub">It leaves your list of versions. The queries it went out with keep it on their record, and you can bring it back from the Versions page on a computer.</p>
          <div className="pa-row2 pa-mt16">
            <button type="button" className="pa-btn sec" onClick={() => setAsking(false)}>Keep it</button>
            <button type="button" className="pa-btn pri" data-pa="ver-archive-go" onClick={async () => { setAsking(false); if (await write(archiveVersion(ms, v.id, new Date().toISOString().slice(0, 10), inUseId(ms, model.msPkgs)), `${v.name} is archived.`)) nav.back(); }}>Archive</button>
          </div>
        </div>
      </MobileSheet>
      <VersionEdit open={editing} v={v} onClose={() => setEditing(false)} onSave={async (name, changes) => { if (await write(editVersion(ms, v.id, { name, changes }, ids.length > 0), `Saved ${name}.`)) setEditing(false); }} />
    </Sub>
  );
};
const REFUSAL: Record<string, string> = {
  name: "That name is taken, or empty.", changes: "Each change needs a few words (80 at most, eight changes at most).", parent: "That version can’t be its own parent.",
  original: "The original stays as it is.", inUse: "That version is in use. Use another one first.", missing: "That version isn’t here any more.", cap: "You’ve reached the most versions a book can keep.",
};
const VersionEdit: React.FC<{ open: boolean; v: ReturnType<typeof readVersions>[number]; onClose: () => void; onSave: (name: string, changes: string[]) => void }> = ({ open, v, onClose, onSave }) => {
  const [name, setName] = useState(v.name);
  const [changes, setChanges] = useState(v.changes.join("\n"));
  return (
    <MobileSheet open={open} onClose={onClose} ariaLabel="Edit the version" pa={{ height: "auto", white: true, z: 1100 }}>
      <div data-pa="ver-edit-sheet">
        <h2 className="pa-sht">Edit {v.name}</h2>
        <label className="pa-fld"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        {!v.original ? <label className="pa-fld"><span>What changed, one per line</span><textarea value={changes} onChange={(e) => setChanges(e.target.value)} /></label> : null}
        <button type="button" className="pa-btn pri blk" onClick={() => onSave(name.trim(), changes.split("\n").map((c) => c.trim()).filter(Boolean))}>Save</button>
      </div>
    </MobileSheet>
  );
};
const NewVersion: React.FC<{ model: Pk26Model; onSaved: (id: string) => void }> = ({ model, onSaved }) => {
  const [name, setName] = useState("");
  const [change, setChange] = useState("");
  const live = model.versionRows;
  const [parent, setParent] = useState<string>(live.find((v) => v.inUse)?.id ?? live[0]?.id ?? "");
  return (
    <div data-pa="ver-new">
      <p className="pa-lede">A version is a draft of your book you send pages from. Name what changed, so you can see which one gets requests.</p>
      <label className="pa-fld"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Faster start" /></label>
      {live.length ? <label className="pa-fld"><span>Made from</span><select value={parent} onChange={(e) => setParent(e.target.value)}>{live.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label> : null}
      <label className="pa-fld"><span>What changed</span><input value={change} onChange={(e) => setChange(e.target.value)} placeholder="Cut the prologue" /></label>
      <button type="button" className="pa-btn pri blk" disabled={!name.trim()} onClick={async () => { const id = await model.saveVersion({ name, change, parentId: parent || null }); if (id) onSaved(id); }}>Save version</button>
    </div>
  );
};

/* ═══ COMPS (ref `PAGES.comps`, `PAGES.compslog`) ═════════════════════════════════════════════════════════════════ */
const MEDIA: Record<string, React.ReactNode> = { book: PI.book, film: PI.eye, tv: PI.eye, other: PI.pages };
const CompsPage: React.FC<{ model: Pk26Model; usage: Usage; nav: ReturnType<typeof usePkNav> }> = ({ model, usage, nav }) => {
  const { versions } = useScriptAllyDb();
  const [adding, setAdding] = useState(nav.params.get("comps") === "add");
  const letterName = (id: string) => versions.find((v) => v.id === id)?.versionName ?? "A letter";
  const y = currentYear();
  return (
    <Sub title="Comps" onBack={nav.back}>
      <p className="pa-lede">Books your letter compares yours to. Agents like comps from the last five years.</p>
      {usage.comps.length ? usage.comps.map((c, i) => {
        const u = usage.byKey.get(compKey(c, i));
        const age = c.year && /^\d{4}$/.test(String(c.year)) ? y - Number(c.year) : null;
        const old = compAge(c, y) != null;
        const media = (c.media ?? "book").toString().toLowerCase();
        return (
          <div key={compKey(c, i)} className="pa-ixc" data-pa="comp-card" data-old={old ? "1" : "0"} data-age={age ?? ""}>
            <div className="ih">{mi(MEDIA[media] ?? PI.book)}<span className="pa-sub">{[media === "tv" ? "TV" : media[0].toUpperCase() + media.slice(1), c.year].filter(Boolean).join(" · ")}</span>{age != null ? <span className={`pa-age${old ? " old" : ""}`} data-pa="comp-age">{age === 0 ? "This year" : `${plural(age, "yr")} old`}</span> : null}</div>
            <div className="ibd"><b>{c.title}</b>{c.author ? <span className="pa-sub">{c.author}</span> : null}{c.note ? <div className="why">{c.note}</div> : null}</div>
            <div className="slip">{u?.letters.length ? <>Named in {u.letters.map((l) => <span key={l} className="pa-pc l">{letterName(l)}</span>)}</> : <span>Not named in a letter yet</span>}<span className="q">{u?.queries.length ? plural(u.queries.length, "query", "queries") : ""}</span></div>
          </div>
        );
      }) : <p className="pa-sub">No comps yet.</p>}
      <button type="button" className="pa-btn pri blk pa-mt8" data-pa="comp-add" onClick={() => setAdding(true)}>{PI.plus}Add a comp</button>
      <CompForm open={adding} model={model} onClose={() => setAdding(false)} />
    </Sub>
  );
};
/** "Add a comp" — the desktop form's fields (CompForm / CompDraft): media, title, author or creator, publisher, year,
 *  what it shares with your book, and in your own words. Written the desktop's way (withCompAdded, withCompIds).
 *  Phone app v5: with `edit` (the comp's index) the same form edits that comp, the desktop's way too (`withCompEdited`,
 *  which merges onto the stored comp, so its id and every field the form does not carry survive). */
const EMPTY_COMP = { media: "book", title: "", author: "", publisher: "", year: "", shares: "", note: "" };
export const CompForm: React.FC<{ open: boolean; model: Pk26Model; onClose: () => void; edit?: number | null }> = ({ open, model, onClose, edit = null }) => {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const start = edit != null ? model.comps[edit] ?? null : null;
  const [d, setD] = useState(() => (start ? {
    media: String(start.media ?? "book").toLowerCase(), title: start.title ?? "", author: start.author ?? "", publisher: start.publisher ?? "",
    year: start.year ? String(start.year) : "", shares: start.matchAxis ?? "", note: start.note ?? "",
  } : EMPTY_COMP));
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const ok = d.title.trim() && (!d.year || /^\d{4}$/.test(d.year));
  const save = async () => {
    const ms = model.activeMs;
    if (!ms || !ok) return;
    if (start && edit != null) {
      const draft = { title: d.title.trim(), author: d.author, publisher: d.publisher, year: d.year ? Number(d.year) : undefined, note: d.note, matchAxis: d.shares.trim() || undefined, media: d.media === "book" ? undefined : d.media } as CompDraft;
      try { await db.updateManuscript(ms.id, { comps: withCompIds(withCompEdited([...model.comps], edit, draft).map(normalizeComp)) }); showToast({ message: `Saved ${draft.title}.` }); onClose(); }
      catch { showToast({ message: "Couldn’t save that change. Check your connection and try again." }); }
      return;
    }
    const comp: CompTitle = normalizeComp({ title: d.title, author: d.author, publisher: d.publisher, ...(d.year ? { year: Number(d.year) } : {}), note: d.note, ...(d.shares.trim() ? { matchAxis: d.shares.trim() } : {}), ...(d.media !== "book" ? { media: d.media } : {}), source: "user" } as unknown as CompTitle);
    try { await db.updateManuscript(ms.id, { comps: withCompIds(withCompAdded([...model.comps], comp)).map(normalizeComp) }); showToast({ message: `Added ${comp.title}.` }); onClose(); setD(EMPTY_COMP); }
    catch { showToast({ message: "Couldn’t save that change. Check your connection and try again." }); }
  };
  return (
    <MobileSheet open={open} onClose={onClose} ariaLabel={start ? `Edit ${start.title}` : "Add a comp"} pa={{ height: "92%", white: true, z: 1100 }}>
      <div data-pa="comp-form" data-edit={start ? "1" : "0"}>
        <h2 className="pa-sht">{start ? `Edit ${start.title}` : "Add a comp"}</h2>
        <label className="pa-fld"><span>It’s a</span><select value={d.media} onChange={set("media")}><option value="book">Book</option><option value="film">Film</option><option value="tv">TV</option><option value="other">Other</option></select></label>
        <label className="pa-fld"><span>Title</span><input value={d.title} onChange={set("title")} data-pa="comp-title" /></label>
        <label className="pa-fld"><span>{d.media === "book" ? "Author" : "Creator"}</span><input value={d.author} onChange={set("author")} /></label>
        <label className="pa-fld"><span>Publisher</span><input value={d.publisher} onChange={set("publisher")} /></label>
        <label className="pa-fld"><span>Year</span><input value={d.year} onChange={set("year")} inputMode="numeric" maxLength={4} /></label>
        <label className="pa-fld"><span>What it shares with your book</span><input value={d.shares} onChange={set("shares")} placeholder="Setting · voice" /></label>
        <label className="pa-fld"><span>In your own words</span><textarea value={d.note} onChange={set("note")} /></label>
        <button type="button" className="pa-btn pri blk" disabled={!ok} data-pa="comp-save" onClick={() => void save()}>Save comp</button>
      </div>
    </MobileSheet>
  );
};
/** Comps in a letter: a tick list saved to the letter's `compIds`. A letter that has gone out is read-only, as on the
 *  desktop (letterFixed). */
const CompsInLetter: React.FC<{ model: Pk26Model; letterId: string; nav: ReturnType<typeof usePkNav> }> = ({ model, letterId, nav }) => {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const letter = db.versions.find((v) => v.id === letterId) ?? null;
  const fixed = !!letter && letterFixed(letter, db.queries, db.versions, db.packages);
  const [sel, setSel] = useState<string[]>(() => (letter?.compIds ?? []).slice());
  if (!letter) return <Gone onBack={nav.back} />;
  const comps = model.comps.filter((c) => !!c.id);
  const y = currentYear();
  const toggle = (id: string) => { if (fixed) return; setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_LETTER_COMPS ? s : [...s, id])); };
  const save = async () => {
    const err = await db.updateVersion(letterId, { compIds: sel });
    if (err) { showToast({ message: err }); return; }
    showToast({ message: `Saved the comps in ${letter.versionName}.` });
    nav.back();
  };
  return (
    <Sub title={`Comps in ${letter.versionName}`} onBack={nav.back}>
      <p className="pa-lede">{fixed ? `${letter.versionName} has gone out, so the comps it names are fixed. Write a new version of the letter to change them.` : "Tick the comps this letter names, so you can see which ones agents respond to."}</p>
      <div className="pa-card pa-pad0" data-pa="compsin" data-fixed={fixed ? "1" : "0"}>
        {comps.map((c) => {
          const on = sel.includes(c.id!);
          return (
            <button key={c.id} type="button" className="pa-mslot" data-pa="compsin-row" data-id={c.id} data-on={on ? "1" : "0"} aria-pressed={on} disabled={fixed} onClick={() => toggle(c.id!)}>
              <span className={`pa-tbx${on ? " on" : ""}`}>{on ? PI.check : null}</span>
              <span className="t"><b>{c.title}</b><small>{[c.author, c.year, compAge(c, y) != null ? "over five years old" : null].filter(Boolean).join(" · ")}</small></span>
            </button>
          );
        })}
        {!comps.length ? <p className="pa-sub" style={{ padding: "12px 16px" }}>No comps yet.</p> : null}
      </div>
      {fixed ? <button type="button" className="pa-btn sec blk pa-mt16" onClick={() => nav.replace("edit", letterId)}>Write a new version</button>
        : <button type="button" className="pa-btn pri blk pa-mt16" data-pa="compsin-save" onClick={() => void save()}>Save</button>}
    </Sub>
  );
};

/* "See all" for a shelf: the full list of that kind */
const AllPage: React.FC<{ model: Pk26Model; usage: Usage; kind: string; nav: ReturnType<typeof usePkNav> }> = ({ model, usage, kind, nav }) => {
  if (kind === "comp") return <CompsPage model={model} usage={usage} nav={nav} />;
  const rows = kind === "ver" ? model.versionRows.map((v) => ({ id: v.id, name: v.name, inUse: v.inUse, page: "ver" }))
    : (kind === "let" ? model.lettersAll : model.synopsesAll).map((m) => ({ id: m.id, name: m.name, inUse: m.inUse, page: "mat", retired: m.retired }));
  const title = kind === "ver" ? "Versions" : kind === "let" ? "Query letters" : "Synopses";
  return (
    <Sub title={title} onBack={nav.back}>
      <div className="pa-card pa-pad0">{rows.map((r) => {
        const f = model.pieceFacts(kind as "let" | "syn" | "ver", r.id);
        return <button key={r.id} type="button" className="pa-mslot" data-pa="all-row" onClick={() => nav.open(r.page, r.id)}>{mi(kind === "ver" ? PI.book : kind === "let" ? PI.doc : PI.note, kind === "ver" ? "#e3ebf0" : MPINK)}<span className="t"><b>{r.name}{r.inUse ? <span className="pa-inuse">In use</span> : null}</b><small>{f.n ? `In ${plural(f.n, "query", "queries")} · ${plural(f.more, "request")}` : "Not sent yet"}{"retired" in r && r.retired ? " · put away" : ""}</small></span><span className="pa-chev">{PI.chev}</span></button>;
      })}</div>
    </Sub>
  );
};

export default PackagesPhone;
