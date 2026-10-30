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
import { packageStage, STAGE_LABEL, isLocked, packageQueries, type Facts } from "../../../lib/packagesV40";
import { packageShowcases, bestPiece, thresholdWords, type Fig } from "../../../lib/packagesV38";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packageMetrics";
import { hexOf, firstFreeColour } from "../../../lib/packagesV39";
import { PACKAGE_ICONS } from "../packageIcons";
import { HOW_STEPS } from "../v26/Pk39HowItWorks";
import { compUsage, compKey, letterFixed, MAX_LETTER_COMPS } from "../../../lib/compUsage";
import { compAge, currentYear } from "../../../lib/compsPage";
import { withCompAdded } from "../../../lib/comps";
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
export const PackagesPhone: React.FC<{ active: boolean }> = ({ active }) => {
  const model = usePk26Model();
  const nav = usePkNav();
  const { params } = nav;
  const pk = model.active;

  /* the band: the line, and the active package card laid over the band's foot (ref `.apk`) */
  usePhoneBandSlot(PACKAGES_PATH, (
    <div data-pa="pk-band">
      <div className="pa-pksub">What you send agents, and what’s working</div>
      {pk ? (
        <button type="button" className="pa-apk" data-pa="pk-active" data-id={pk.id} data-pc={hexOf(pk)} onClick={() => nav.open("pkg", pk.id)}>
          <span className="pa-apkh" style={{ background: hexOf(pk) }}>
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
  ), [pk?.id, pk?.packageName, pk?.colour, pk?.icon, model.figPk, model.letters, model.synopses, model.versionRows]);

  /* What's landing (4A): the desktop's own ranking; a card whose sample is under the desktop's minimum is left out */
  const showcases = useMemo(() => landing(model), [model]);
  const [howOpen, setHowOpen] = useState(false);
  const usage = useUsage(model);

  /* the page in front: one of the detail pages, keyed by the address */
  const page = active ? pageFor(params) : null;

  return (
    <div className="pa-pk" data-pa="packages">
      <div className="pa-pkbody">
        <div className="pa-shd pa-shd--first"><h2 className="pa-h2">What’s landing</h2><button type="button" className="pa-link" data-pa="pk-how" onClick={() => setHowOpen(true)}>How it works</button></div>
        <Landing cards={showcases.cards} hidden={showcases.hidden} />

        <div className="pa-shd"><h2 className="pa-h2">Your packages</h2><button type="button" className="pa-link" data-pa="pk-new" onClick={() => nav.open("build", "new")}>New</button></div>
        {model.msPkgs.length ? (
          <div className="pa-card pa-pkrows" data-pa="pk-list">
            {[...model.live, ...model.retired].map((p) => <PkRow key={p.id} model={model} p={p} onOpen={() => nav.open("pkg", p.id)} />)}
          </div>
        ) : <p className="pa-sub pa-pknone" data-pa="pk-none">No packages yet.</p>}
        <button type="button" className="pa-btn pri blk pa-hb pa-mt12" data-pa="pk-build" onClick={() => nav.open("build", "new")}>{PI.plus}Build a package</button>

        <Shelves model={model} usage={usage} onOpen={nav.open} />
      </div>

      <MobileSheet open={howOpen} onClose={() => setHowOpen(false)} ariaLabel="How it works" pa={{ height: "auto", white: true }}>
        <div className="pa-pkhow" data-pa="pk-how-sheet">
          <h2 className="pa-sht">How it works</h2>
          <ol>{HOW_STEPS.map(([t, x], i) => <li key={i}><b>{t}</b><span>{x}</span></li>)}</ol>
          <p className="pa-sub">{thresholdWords(MIN_SENDS_FOR_CLAIM)}</p>
        </div>
      </MobileSheet>

      {page ? createPortal(
        <div className="pa-layer pa-pkpage" data-pa="pk-page" data-page={page.kind}>
          <PageBody kind={page.kind} id={page.id} model={model} usage={usage} nav={nav} />
        </div>, document.body) : null}
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
  if (kind === "pkg") { const p = model.msPkgs.find((x) => x.id === id); return p ? <PackagePage model={model} p={p} nav={nav} usage={usage} /> : <Gone onBack={nav.back} />; }
  if (kind === "build") return <BuilderPage model={model} id={id} nav={nav} />;
  if (kind === "mat") { const m = model.lettersAll.find((x) => x.id === id) ?? model.synopsesAll.find((x) => x.id === id); return m ? <MaterialPage model={model} m={m} nav={nav} usage={usage} /> : <Gone onBack={nav.back} />; }
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
    <span className="pa-pkic" style={{ background: hexOf(p) }} data-pc={hexOf(p)} aria-hidden="true">{pkIcon(p)}</span>
    <span className="pa-pkrt"><b>{p.packageName}</b><span className="pa-sub">{piecesLine(model, p)}</span></span>
    <LcTag p={p} />
  </button>
);

/* ── What's landing (land A): swipeable showcase cards ── */
interface ShowCard { key: string; rank: string; name: string; colour: string; icon: React.ReactNode; metric: string; line: string; open: () => void }
function landing(model: Pk26Model): { cards: Omit<ShowCard, "open">[] & { target?: [string, string] }[]; hidden: string[] } {
  const cards: (Omit<ShowCard, "open"> & { target: [string, string] })[] = [];
  const hidden: string[] = [];
  const pks = model.figItems("pk").map((i) => ({ ...i, f: i.f }));
  const best = packageShowcases(pks.map((i) => ({ id: i.id, name: i.name, f: i.f, retired: i.retired }))).find((s) => s.k === "best");
  if (best) {
    const p = model.msPkgs.find((x) => x.id === best.item.id)!;
    cards.push({ key: "pk", rank: "Your best package", name: p.packageName, colour: hexOf(p), icon: pkIcon(p), metric: resultWords(best.item.f), line: piecesLine(model, p), target: ["pkg", p.id] });
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
              <button key={c.key} type="button" className="pa-show" data-pa="pk-show" data-k={c.key} onClick={() => c.target && nav.open(c.target[0], c.target[1])}>
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

/* ═══ A PACKAGE (ref `PAGES.pkgpage`) ════════════════════════════════════════════════════════════════════════════ */
const PackagePage: React.FC<{ model: Pk26Model; p: SubmissionPackage; nav: ReturnType<typeof usePkNav>; usage: Usage }> = ({ model, p, nav }) => {
  const { queries } = useScriptAllyDb();
  const stage = packageStage(p);
  const locked = isLocked(p);
  const isActive = model.active?.id === p.id;
  const f: Facts = model.facts(p);
  const qs = packageQueries(p, model.msQueries).filter((q) => q.status !== "Withdrawn");
  const funnel = funnelOf(qs.map((q) => q.id), model.rowsById);
  const passed = qs.filter((q) => q.status === "Rejected").length;
  const waiting = qs.filter((q) => !["Rejected", "No Response", "Withdrawn", "Signed"].includes(String(q.status))).length;
  const letter = model.lettersAll.find((m) => m.id === p.queryLetterVersionId) ?? null;
  const letterComps = letter?.compIds ? model.comps.filter((c) => c.id && letter.compIds!.includes(c.id)).map((c) => c.title) : [];
  const ver = model.versionRows.find((v) => v.id === p.bookVersionId) ?? null;
  const extras = model.extras.filter((e) => (p.extraIds ?? []).includes(e.id));
  void queries;
  const copy = async () => { const id = await model.duplicate(p); if (id) nav.replace("pkg", id); };
  return (
    <>
      <div className="pa-band pa-band--page pa-pkband" style={{ background: hexOf(p) }} data-pa="pkg-band" data-pc={hexOf(p)}>
        <div className="pa-bandrow"><button type="button" className="pa-ring" aria-label="Back" data-pa="pk-back" onClick={nav.back}>{PI.back}</button><span className="pa-grow" /></div>
        <div className="pa-pkhead">
          <span className="pa-pkic big" aria-hidden="true">{pkIcon(p)}</span>
          <div><h1 className="pa-bt" data-pa="pkg-name">{p.packageName}</h1>
            <div className="pa-pkstate" data-pa="pkg-state" data-stage={stage}>{stage === "out" ? "🔒 " : ""}{STAGE_LABEL[stage]}{isActive ? " · new queries use it" : ""}</div></div>
        </div>
      </div>
      <div className="pa-pksubbody pa-pkpgbody">
        <div className="pa-fsum" data-pa="pkg-figs">
          <div><b>{f.n}</b><span>{f.n === 1 ? "query" : "queries"}</span></div>
          <div><b>{f.more}</b><span>asked for more</span></div>
          <div><b>{f.pct != null ? `${f.pct}%` : "–"}</b><span>{f.pct != null ? "request rate" : `rate after ${MIN_SENDS_FOR_CLAIM + 1} sent`}</span></div>
        </div>
        <div className="pa-shd"><h2 className="pa-h2">How far it gets</h2><span className="pa-sub">{f.n} sent</span></div>
        <div className="pa-card"><Funnel f={funnel} />{f.n ? <p className="pa-sub pa-mt12" data-pa="pkg-passed">{passed ? `${plural(passed, "agent")} passed` : "Nobody has passed"} and {waiting ? `${waiting} ${waiting === 1 ? "is" : "are"} still waiting` : "nobody is still waiting"}.</p> : null}</div>
        <div className="pa-shd"><h2 className="pa-h2">What’s in it</h2></div>
        <div className="pa-card pa-pad0" data-pa="pkg-contents">
          {ver ? <button type="button" className="pa-mslot" data-pa="pkg-piece" data-k="ver" onClick={() => nav.open("ver", ver.id)}>{mi(PI.book, "#e3ebf0")}<span className="t"><b>{ver.name}</b><small>Version · the pages come from this</small></span><span className="pa-chev">{PI.chev}</span></button> : null}
          {letter ? <button type="button" className="pa-mslot" data-pa="pkg-piece" data-k="let" onClick={() => nav.open("mat", letter.id)}>{mi(PI.doc, MPINK)}<span className="t"><b>{letter.name}</b><small>Query letter{letterComps.length ? ` · names ${letterComps.join(" and ")}` : ""}</small></span><span className="pa-chev">{PI.chev}</span></button> : null}
          {p.synopsisVersionId ? <button type="button" className="pa-mslot" data-pa="pkg-piece" data-k="syn" onClick={() => nav.open("mat", p.synopsisVersionId)}>{mi(PI.note, MPINK)}<span className="t"><b>{model.matName("syn", p.synopsisVersionId)}</b><small>Synopsis</small></span><span className="pa-chev">{PI.chev}</span></button> : null}
          {extras.length ? <div className="pa-mslot" data-pa="pkg-piece" data-k="ext">{mi(PI.plus)}<span className="t"><b>Also sends</b><small>{extras.map((e) => e.name).join(" · ")}</small></span></div> : null}
          {!ver && !letter && !p.synopsisVersionId && !extras.length ? <p className="pa-sub" style={{ padding: "12px 16px" }}>Nothing in it yet.</p> : null}
        </div>
        {locked ? (
          <>
            <div className="pa-lockn" data-pa="pkg-locked">{lockI}<span>It’s gone out, so it’s locked: changing it would muddle its numbers. Make a copy to try something different.</span></div>
            <div className="pa-row2">
              <button type="button" className="pa-btn pri pa-hb" data-pa="pkg-copy" onClick={() => void copy()}>Make a copy</button>
              {stage !== "retired" ? <button type="button" className="pa-btn sec" data-pa="pkg-stop" onClick={() => void model.retire(p).then((ok) => { if (ok) nav.back(); })}>Stop using it</button> : null}
            </div>
          </>
        ) : (
          <div className="pa-row2 pa-mt12">
            <button type="button" className="pa-btn pri pa-hb" data-pa="pkg-edit" onClick={() => nav.open("build", p.id)}>Edit</button>
            {!isActive && stage === "ready" ? <button type="button" className="pa-btn sec" data-pa="pkg-use" onClick={() => void model.makeActive(p)}>Use for new queries</button> : null}
          </div>
        )}
        {locked && !isActive && stage === "out" ? <button type="button" className="pa-btn sec blk pa-mt10" data-pa="pkg-use" onClick={() => void model.makeActive(p)}>Use for new queries</button> : null}
        <div className="pa-shd"><h2 className="pa-h2">Queries it went with</h2><span className="pa-sub">{qs.length}</span></div>
        <QueryRows ids={qs.map((q) => q.id)} model={model} />
      </div>
    </>
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
  const [pick, setPick] = useState<Slot | null>(null);
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
      pid = await model.createPackage({ name: fields.packageName, note: "", icon: "box" as PackageIcon, colour: firstFreeColour(model.msPkgs), from: null });
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

/* ═══ A LETTER OR A SYNOPSIS (ref `PAGES.letter`) ════════════════════════════════════════════════════════════════ */
const MaterialPage: React.FC<{ model: Pk26Model; m: Pk26Model["lettersAll"][number]; nav: ReturnType<typeof usePkNav>; usage: Usage }> = ({ model, m, nav }) => {
  const { showToast } = useToast();
  const f = model.pieceFacts(m.kind, m.id);
  const v = useScriptAllyDb().versions.find((x) => x.id === m.id);
  const comps = m.kind === "let" && m.compIds ? model.comps.filter((c) => c.id && m.compIds!.includes(c.id)) : [];
  const earlier = (m.kind === "let" ? model.lettersAll : model.synopsesAll).filter((x) => x.id !== m.id);
  const [more, setMore] = useState(false);
  const copyText = async () => { try { await navigator.clipboard.writeText(m.text); showToast({ message: "Copied the text." }); } catch { showToast({ message: "Couldn’t copy. Select the text and copy it instead." }); } };
  const newVersion = () => nav.open("edit", m.id);
  return (
    <Sub title={m.name} onBack={nav.back}>
      <div className="pa-matmeta"><span className="pa-sub">{[v?.createdDate ? `Edited ${dayMonth(v.createdDate)}` : null, m.words != null ? `${m.words.toLocaleString("en-GB")} words` : null].filter(Boolean).join(" · ")}</span>{m.inUse ? <span className="pa-inuse">In use</span> : m.retired ? <span className="pa-lc draft">Put away</span> : null}</div>
      <div className="pa-paper" data-pa="mat-text">{m.text || <span className="pa-sub">No text yet.</span>}</div>
      <div className="pa-acts3" data-pa="mat-acts">
        <button type="button" data-pa="mat-edit" onClick={() => nav.open("edit", m.id)}>{PI.edit}Edit</button>
        <button type="button" data-pa="mat-new" onClick={newVersion}>{PI.plus}New version</button>
        <button type="button" data-pa="mat-copy" onClick={() => void copyText()}>{PI.share}Copy text</button>
        <button type="button" data-pa="mat-more" onClick={() => setMore(true)}>{PI.more}More</button>
      </div>
      <div className="pa-fsum pa-mt14" data-pa="mat-figs">
        <div><b>{f.n}</b><span>{f.n === 1 ? "query" : "queries"}</span></div>
        <div><b>{f.more}</b><span>asked for more</span></div>
        <div><b>{f.pct != null ? `${f.pct}%` : "–"}</b><span>{f.pct != null ? "request rate" : "rate after 5 sent"}</span></div>
      </div>
      {m.kind === "let" ? (
        <>
          <div className="pa-shd"><h2 className="pa-h2">Comps it names</h2><button type="button" className="pa-link" data-pa="mat-comps" onClick={() => nav.open("compsin", m.id)}>Change</button></div>
          {comps.length ? <div className="pa-pcwrap" data-pa="mat-comp-chips">{comps.map((c) => <span key={c.id} className="pa-pc">{PI.pages}{c.title}</span>)}</div> : <p className="pa-sub">{m.compIds ? "This letter names no comps." : "Not recorded yet."}</p>}
        </>
      ) : null}
      <div className="pa-shd"><h2 className="pa-h2">In these packages</h2></div>
      {m.inPackages.length ? (
        <div className="pa-card pa-pad0">{m.inPackages.map((p) => (
          <button key={p.id} type="button" className="pa-pkrow" onClick={() => nav.open("pkg", p.id)}><span className="pa-pkic sm" style={{ background: hexOf(p) }} data-pc={hexOf(p)} aria-hidden="true">{pkIcon(p)}</span><span className="pa-pkrt"><b>{p.packageName}</b></span><LcTag p={p} /></button>
        ))}</div>
      ) : <p className="pa-sub">Not in a package yet.</p>}
      {earlier.length ? (
        <>
          <div className="pa-shd"><h2 className="pa-h2">{m.kind === "let" ? "Other letters" : "Other synopses"}</h2></div>
          <div className="pa-card pa-pad0">{earlier.map((x) => {
            const fx = model.pieceFacts(x.kind, x.id);
            return <button key={x.id} type="button" className="pa-mslot" onClick={() => nav.replace("mat", x.id)}>{mi(m.kind === "let" ? PI.doc : PI.note, MPINK)}<span className="t"><b>{x.name}</b><small>{fx.n ? `${plural(fx.n, "query", "queries")} · ${plural(fx.more, "request")}` : "Not sent yet"}</small></span><span className="pa-chev">{PI.chev}</span></button>;
          })}</div>
        </>
      ) : null}
      <MobileSheet open={more} onClose={() => setMore(false)} ariaLabel="More" pa={{ height: "auto", drag: false, z: 1100 }}>
        <h2 className="pa-sht">{m.name}</h2>
        <div className="pa-group">
          {m.retired
            ? <button type="button" className="pa-li" onClick={() => { setMore(false); void model.bringBack(m); }}><span className="pa-ico">{PI.plus}</span><span className="pa-lt">Bring it back</span></button>
            : <button type="button" className="pa-li" data-pa="mat-putaway" onClick={() => { setMore(false); void model.putAwayMat(m); }}><span className="pa-ico">{PI.closeq}</span><span className="pa-lt">Put it away</span></button>}
        </div>
      </MobileSheet>
    </Sub>
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
 *  what it shares with your book, and in your own words. Written the desktop's way (withCompAdded, withCompIds). */
const CompForm: React.FC<{ open: boolean; model: Pk26Model; onClose: () => void }> = ({ open, model, onClose }) => {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const [d, setD] = useState({ media: "book", title: "", author: "", publisher: "", year: "", shares: "", note: "" });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const ok = d.title.trim() && (!d.year || /^\d{4}$/.test(d.year));
  const save = async () => {
    const ms = model.activeMs;
    if (!ms || !ok) return;
    const comp: CompTitle = normalizeComp({ title: d.title, author: d.author, publisher: d.publisher, ...(d.year ? { year: Number(d.year) } : {}), note: d.note, ...(d.shares.trim() ? { matchAxis: d.shares.trim() } : {}), ...(d.media !== "book" ? { media: d.media } : {}), source: "user" } as unknown as CompTitle);
    try { await db.updateManuscript(ms.id, { comps: withCompIds(withCompAdded([...model.comps], comp)).map(normalizeComp) }); showToast({ message: `Added ${comp.title}.` }); onClose(); setD({ media: "book", title: "", author: "", publisher: "", year: "", shares: "", note: "" }); }
    catch { showToast({ message: "Couldn’t save that change. Check your connection and try again." }); }
  };
  return (
    <MobileSheet open={open} onClose={onClose} ariaLabel="Add a comp" pa={{ height: "92%", white: true, z: 1100 }}>
      <div data-pa="comp-form">
        <h2 className="pa-sht">Add a comp</h2>
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
