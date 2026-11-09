/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YOUR NOTES v1 (design-refs/your-notes-v1/your-notes-v1.html) — the founding writer's record of every note they have
 * sent, at `/your-notes` (More › Founding writer). The pop-up is for sending; this page is the record.
 *
 *   the header   the Query Centre's open header (`shell/OpenHeader`): a dashed placeholder where the art will go,
 *                "{n} notes sent", "to our founder" between rules, "+ Tell us something" and "How it works", and the
 *                ring (`shell/OpenRing`) of where the notes are — the middle is the number read so far
 *   the band     the Dashboard's founding writer band, unchanged except without "Your last note"
 *   the list     the Dashboard's band-headed card: the switch (All · With a reply · Still open · In the app), then one
 *                row per note — the kind, the title, a new-reply pill, where it came from, our founder's reply, the
 *                chip and whether it counted
 *   the side     "What happens to a note" and "How it works" (HOW_SLIDES' own words), sticky
 *   a note       the panel (`NotePanel`), from the right
 *
 * ⚠️ EVERY FIGURE IS READ: the notes are the writer's own `betaFeedback` docs, the rank is the server's `foundingStats`
 *    (inside the band). The page computes no rank. A failed read says so; it never shows a ring of zeros.
 * ⚠️ NO CLIENT WRITES: a reply and the seen-mark go through `addFeedbackNote` / `markFeedbackSeen` (lib/yourNotesStore).
 * ⚠️ IT WEARS THE DASHBOARD'S CLASSES (`.d58.d2` on the root: the band and the card frame are scoped to them) AND THE
 *    QUERY CENTRE'S (`.qc151` on the header's wrapper), never copies of either. yourNotes.css undoes `.d58`'s one-screen
 *    height and holds the page's own parts.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
/* the Dashboard's sheets the band and the card frame read (JS imports: Vite keeps each sheet once, in its first place) */
import "../dashboard/oneScreen.css";
import "../dashboard/v58/dash58.css";
import "../dashboard/v2/dash2.css";
import "./yourNotes.css";
import { useScriptAllyDb } from "../../lib/db";
import { HOW_SLIDES, HOW_TITLE, type ComposeKey } from "../../lib/foundingCard";
import {
  BUCKETS, CHIP, CONTEXT_LINE, EMPTY_LINE, FILTERS, FILTER_FOR_BUCKET, KEY_LINES, LOAD_FAILED, NOTES_TITLE, bucketCounts, bucketOf,
  composeKeyOf, countStates, filterCounts, hasNewReply, kindWords, newReplyCount, passes, readSoFar, rowTitle, shortDate,
  type BucketKey, type CountState, type FilterKey, type YourNote,
} from "../../lib/yourNotes";
import { useYourNotes } from "../../lib/yourNotesStore";
import { OpenHeader } from "../shell/OpenHeader";
import { OpenRing } from "../shell/OpenRing";
import { Frame } from "../dashboard/v2/Frame";
import { Dash2Founding } from "../dashboard/v2/Dash2Founding";
import { ICONS } from "../dashboard/v105/foundingArt";
import { FEEDBACK_HAWK } from "../shell/FeedbackDock";
import { NotePanel } from "./NotePanel";
import { Chip, iconFor, tellUs } from "./notesParts";

const ART_PH = (
  <div className="yn-ph" data-yn="art-placeholder">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>
    <span>Illustration<br />to come</span>
  </div>
);
const TELL: readonly { key: ComposeKey; label: string }[] = [{ key: "like", label: "Like" }, { key: "dont", label: "Don’t like" }, { key: "idea", label: "Idea" }];

const CountLine: React.FC<{ c: CountState | undefined }> = ({ c }) => {
  if (!c || c.state === "silent") return null;
  if (c.state === "pending") return <small data-yn="count">Counts once we’ve read it</small>;
  return c.worth > 1 ? <small data-yn="count">Counted as <b>{c.worth} notes</b></small> : <small data-yn="count">Counted</small>;
};

const Row: React.FC<{ n: YourNote; c: CountState | undefined; onOpen: () => void }> = ({ n, c, onOpen }) => (
  <li>
    <button type="button" className="yn-nr" data-yn="row" data-id={n.id} onClick={onOpen}>
      <span className="yn-nk" aria-hidden="true">{iconFor(n.kind)}</span>
      <span className="yn-nt">
        <b>{rowTitle(n)}{hasNewReply(n) ? <span className="yn-nnew" data-yn="new-reply">New reply</span> : null}</b>
        <span className="yn-nm"><em>{kindWords(n.kind)}</em>{n.pageName ? ` · from ${n.pageName}` : ""}{n.createdAt != null ? ` · ${shortDate(n.createdAt)}` : ""}</span>
        {n.reply ? (
          <span className="yn-nrep" data-yn="reply-preview"><img src={FEEDBACK_HAWK} alt="" /><span><b>Our founder:</b> {n.reply.text}</span></span>
        ) : null}
      </span>
      <span className="yn-ns"><Chip status={n.status} /><CountLine c={c} /></span>
    </button>
  </li>
);

const TellButtons: React.FC = () => (
  <div className="d22-tell yn-tell">
    {TELL.map((t) => (
      <button key={t.key} type="button" data-yn="tell" data-key={t.key} onClick={() => tellUs(t.key)}>
        <span className="d22-ti">{ICONS[t.key]}</span><span>{t.label}</span>
      </button>
    ))}
  </div>
);

export const YourNotesPage: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const { currentUser } = useScriptAllyDb();
  const uid = currentUser?.id ?? null;
  const { loading, error, notes, retry } = useYourNotes(uid);
  return <YourNotesView uid={uid} userName={currentUser?.name ?? ""} loading={loading} error={error} notes={notes} retry={retry} active={active} />;
};

/** The page from its data: props only, so every state renders in a smoke without Firebase (yourNotesPageSmoke). */
export const YourNotesView: React.FC<{
  uid: string | null; userName: string; loading: boolean; error: boolean; notes: YourNote[]; retry: () => void; active?: boolean;
}> = ({ uid, userName, loading, error, notes, retry, active = true }) => {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const howRef = useRef<HTMLDivElement | null>(null);

  const ready = !loading && !error;
  const counts = useMemo(() => (ready ? bucketCounts(notes) : null), [ready, notes]);
  const fcount = useMemo(() => filterCounts(notes), [notes]);
  const states = useMemo(() => countStates(notes), [notes]);
  const fresh = newReplyCount(notes);
  const shown = notes.filter((n) => passes(n, filter));
  const empty = ready && notes.length === 0;
  const open = openId ? notes.find((n) => n.id === openId) ?? null : null;
  /* a page left behind closes its panel */
  useEffect(() => { if (!active) setOpenId(null); }, [active]);

  const smooth = (): ScrollBehavior => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  const pickBucket = (k: BucketKey) => {
    setFilter(FILTER_FOR_BUCKET[k]);
    requestAnimationFrame(() => gridRef.current?.scrollIntoView({ behavior: smooth(), block: "start" }));
  };
  const toHow = () => howRef.current?.scrollIntoView({ behavior: smooth(), block: "center" });

  const sum = !counts ? " " : notes.length ? `${notes.length} sent` : "Nothing sent yet";

  return (
    <div className="yn d58 d2" data-yn="page" data-state={loading ? "loading" : error ? "error" : empty ? "empty" : "notes"}>
      <div className="yn-wrap">
        <div className="qc151 yn-hdw">
          <OpenHeader
            className="yn-hd"
            attrs={{ "data-yn": "header", "data-own-header": "" }}
            art={ART_PH}
            artClassName="yn-art"
            title={loading ? " " : NOTES_TITLE(error ? 0 : notes.length)}
            titleAttrs={{ "data-yn": "title" }}
            forLine={{ lead: "to", text: "our founder", attrs: { "data-yn": "for" } }}
            actions={<>
              <button type="button" className="qc1531-b qc1531-b--n" data-yn="tell-us" onClick={() => tellUs()}>+ Tell us something</button>
              <button type="button" className="qc1531-b qc1531-b--g" data-yn="how" onClick={toHow}>How it works</button>
            </>}
            ring={
              <OpenRing<BucketKey>
                buckets={BUCKETS}
                counts={counts}
                isOn={() => false}
                onPick={pickBucket}
                mid={{ n: counts ? readSoFar(counts) : null, label: "read so far" }}
                heading="Where they are"
                sum={sum}
                ariaLabel="Where they are"
                tipNoun={notes.length === 1 ? "note" : "notes"}
                hatchId="yn-hatch"
                probe="yn"
                className="yn-ring"
              />
            }
          />
        </div>

        <div className="yn-band" data-yn="band">
          <Dash2Founding loading={false} uid={uid} folded={false} noLast />
        </div>

        <div className="yn-grid" ref={gridRef}>
          <div className="yn-main">
            <Frame tone="sand" title="Your notes" label="Your notes" probe="yn-notes" loading={loading}
              meta={ready && notes.length ? <>{notes.length} sent{fresh ? <> · <button type="button" className="yn-newlink" data-yn="new-link" onClick={() => setFilter("replies")}>{fresh} new {fresh === 1 ? "reply" : "replies"}</button></> : null}</> : undefined}>
              {loading ? (
                <div className="yn-sk" aria-hidden="true" data-yn="loading"><i /><i /><i /></div>
              ) : error ? (
                <div className="yn-empty" data-yn="error" role="alert">
                  <p>{LOAD_FAILED}</p>
                  <button type="button" className="yn-btn" onClick={retry}>Try again</button>
                </div>
              ) : empty ? (
                <div className="yn-empty" data-yn="empty">
                  <h3 className="yn-eh">Nothing sent yet</h3>
                  <p>{EMPTY_LINE}</p>
                  <TellButtons />
                </div>
              ) : (
                <>
                  <div className="yn-nf">
                    <div className="yn-fsw" role="group" aria-label="Show">
                      {FILTERS.map((f) => (
                        <button key={f.key} type="button" data-yn="filter" data-k={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                          {f.label}<small>{fcount[f.key]}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <ul className="yn-nl" data-yn="list">
                    {shown.length ? shown.map((n) => <Row key={n.id} n={n} c={states.get(n.id)} onOpen={() => setOpenId(n.id)} />)
                      : <li className="yn-none"><p>Nothing here.</p></li>}
                  </ul>
                </>
              )}
            </Frame>
          </div>
          <aside className="yn-side">
            <Frame tone="stone" title="What happens to a note" label="What happens to a note" probe="yn-key">
              <div className="d2-body">
                <ul className="yn-key" data-yn="key">
                  {KEY_LINES.map((k) => (
                    <li key={k.key}><Chip status={k.key === "none" ? null : k.key === "inapp" ? "built" : k.key} /><span>{k.line}</span></li>
                  ))}
                </ul>
              </div>
            </Frame>
            <div ref={howRef}>
              <Frame tone="sage" title={HOW_TITLE} label={HOW_TITLE} probe="yn-how">
                <div className="d2-body" data-yn="how-body">
                  {HOW_SLIDES.map((s) => <p key={s.title} className="yn-howp"><b>{s.title}.</b> {s.body}</p>)}
                  <p className="yn-howfine">{HOW_SLIDES[2].fine}</p>
                </div>
              </Frame>
            </div>
          </aside>
        </div>
      </div>
      {open ? <NotePanel note={open} onClose={() => setOpenId(null)} userName={userName} /> : null}
    </div>
  );
};
