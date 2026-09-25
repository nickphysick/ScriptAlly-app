/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactAgentForm — the card's own layout, typed into (v11 §8.2). ONE form for the pop-up's
 * edit mode and the add card (§7.3: "the body becomes the same form as the add card"), so the
 * two can never drift. The caller owns the draft; this renders it and reports changes.
 *
 * ⚠️ TYPING NEVER RE-RENDERS THE FORM (§8.2): the inputs are controlled, but nothing about a
 * keystroke remounts a section — keys are stable, sections are unconditional, and §11.9 holds
 * the focused element to be the SAME NODE before and after typing.
 *
 * ⚠️ LOCATION IS TWO CONTROLS WHERE THE MOCK DRAWS ONE — the rules require an ISO country
 * (`isKnownCountry`); a free-text location would be denied in silence, the affectedKeys shape.
 * City takes the text; the country rides the existing `AgentCountryPicker`. Recorded as the
 * P4 deviation-with-reason.
 *
 * ⚠️ THE NRN SWITCH IS RULING (e): it sits beside the reply time in BOTH hosts, because the
 * nudge and close flows read it — its Also-changes note names them.
 */
import React from "react";
import { AgentCountryPicker } from "../AgentCountryPicker";
import { AlsoNote } from "../../../lib/contactEdit";
import type { ContactDraft } from "../../../lib/contactEdit";
import { MAT_QTY, buildAgentMaterials, parseAgentMaterials } from "../../../lib/agentMaterials";
import { commitTypedGenre } from "../../../lib/quickAdd";

export type FormSection = "who" | "door" | "genres" | "wishlist" | "materials" | "rating" | "notes";

export interface ContactAgentFormProps {
  draft: ContactDraft;
  onDraft: (patch: Partial<ContactDraft>) => void;
  /** the Also-changes notes, rendered under the sections that own them (edit mode) */
  notes?: AlsoNote[];
  /** the manuscript's genre, offered first with its tick */
  msGenre: string | null;
  /** every genre already on the writer's list, most-used first */
  genrePool: string[];
  /** the section to reveal and pulse on open (a slip's or Housekeeping's target) */
  focusSection?: FormSection | null;
  /** add-only: the paste-a-link panel above the who block (§8.3 — FILL IN stays hidden) */
  linkPanel?: React.ReactNode;
  /** duplicate line under the name (the add card's check) */
  duplicate?: React.ReactNode;
}

/* the mock's own reveal: [data-esec].pulse */
const sec = (k: FormSection, focus: FormSection | null | undefined) =>
  ({ "data-esec": k, className: `clv-fsec2${focus === k ? " clv-pulse" : ""}` });

export const ContactAgentForm: React.FC<ContactAgentFormProps> = ({
  draft, onDraft, notes = [], msGenre, genrePool, focusSection, linkPanel, duplicate,
}) => {
  const note = (field: AlsoNote["field"]) => {
    const n = notes.find((x) => x.field === field);
    if (!n || n.lines.length === 0) return null;
    return (
      <div className="clv-warn" data-clv="warn" data-warn={field}>
        <em>Also changes</em>
        {n.lines.map((l) => <p key={l}>{l}</p>)}
      </div>
    );
  };

  const initials = (draft.name.trim() || draft.agency.trim())
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  /* genres: the manuscript's first (outlined, ticked when chosen), then the writer's own pool */
  const options = [
    ...(msGenre ? [msGenre] : []),
    ...genrePool.filter((g) => !msGenre || g.toLowerCase() !== msGenre.toLowerCase()),
  ];
  const [other, setOther] = React.useState("");
  const [otherOpen, setOtherOpen] = React.useState(false);

  const mats = parseAgentMaterials(draft.materialsWanted);
  const putMats = (next: typeof mats) => onDraft({ materialsWanted: buildAgentMaterials(next) });
  const matOn = (k: string) => mats.selected.includes(k);
  const toggleMat = (k: string) =>
    putMats({ ...mats, selected: matOn(k) ? mats.selected.filter((x) => x !== k) : [...mats.selected, k] });
  /* "Opening pages": ONE toggle over the two stored sample kinds; the unit select decides which */
  const sampleKind = matOn("Sample chapters") ? "Sample chapters" : "Sample pages";
  const openingOn = matOn("Sample pages") || matOn("Sample chapters");
  const toggleOpening = () => {
    if (openingOn) putMats({ ...mats, selected: mats.selected.filter((x) => x !== "Sample pages" && x !== "Sample chapters") });
    else putMats({ ...mats, selected: [...mats.selected, "Sample pages"] });
  };
  const setSampleKind = (kind: "Sample pages" | "Sample chapters") => {
    const other = kind === "Sample pages" ? "Sample chapters" : "Sample pages";
    const counts = { ...mats.counts, [kind]: mats.counts[other] ?? mats.counts[kind] ?? "" };
    putMats({ ...mats, counts, selected: [...mats.selected.filter((x) => x !== other && x !== kind), kind] });
  };
  const synLen = mats.counts["Synopsis"] === "1" ? "1pp" : mats.counts["Synopsis"] === "2" ? "2pp" : "any";
  const setSynLen = (v: "1pp" | "2pp" | "any") =>
    putMats({ ...mats, counts: { ...mats.counts, Synopsis: v === "any" ? "" : v === "1pp" ? "1" : "2" } });

  /* the reveal: scroll the focused section into view once */
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    if (!focusSection) return;
    rootRef.current?.querySelector<HTMLElement>(`[data-esec="${focusSection}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [focusSection]);

  return (
    <div className="clv-fbody2" ref={rootRef}>
      {linkPanel}
      <div className="clv-fwho" data-esec="who">
        <span className={`clv-ini clv-fini${initials ? "" : " clv-fini--empty"}`} aria-hidden="true">
          {initials || "+"}
        </span>
        <div className="clv-flds">
          <input
            className="clv-fin clv-fin--nm"
            value={draft.name}
            placeholder="Agent's name"
            aria-label="Agent's name"
            data-clv="f-name"
            onChange={(e) => onDraft({ name: e.target.value })}
          />
          {duplicate}
          <input
            className="clv-fin clv-fin--mono"
            value={draft.agency}
            placeholder="Agency"
            aria-label="Agency"
            data-clv="f-agency"
            onChange={(e) => onDraft({ agency: e.target.value })}
          />
          <div className="clv-frow2">
            <input
              className="clv-fin clv-fin--mono"
              value={draft.city}
              placeholder="City"
              aria-label="City"
              onChange={(e) => onDraft({ city: e.target.value })}
            />
            <span className="clv-fcountry">
              <AgentCountryPicker value={draft.country} onChange={(c) => onDraft({ country: c })} />
            </span>
          </div>
          <div className="clv-frow2 clv-frow2--pace">
            <span className="clv-fwk">
              <input
                className="clv-fin clv-fin--mono clv-fin--wk"
                value={draft.responseTimeWeeks == null ? "" : String(draft.responseTimeWeeks)}
                placeholder="__"
                inputMode="numeric"
                aria-label="Reply time in weeks"
                data-clv="f-weeks"
                onChange={(e) => {
                  const t = e.target.value.replace(/[^\d]/g, "");
                  onDraft({ responseTimeWeeks: t === "" ? null : Math.min(520, parseInt(t, 10)) });
                }}
              />
              wks to reply
            </span>
            {/* ruling (e): silence-as-answer sits beside the window it modifies */}
            <label className="clv-fnrn" data-clv="f-nrn">
              <input
                type="checkbox"
                checked={draft.noResponseMeansNo === true}
                /* unstated is an ORIGIN state, not a destination (the house NRN law): once the
                   switch is touched it is true or false — unchecking RECORDS "silence is not
                   their answer" rather than un-knowing it, so the nudge flow stops treating
                   quiet as a close for this agent */
                onChange={(e) => onDraft({ noResponseMeansNo: e.target.checked })}
              />
              no reply means no
            </label>
          </div>
          <div className="clv-frow2">
            <input
              className="clv-fin clv-fin--mono"
              value={draft.website}
              placeholder="Website"
              aria-label="Website"
              data-clv="f-website"
              onChange={(e) => onDraft({ website: e.target.value })}
            />
            <input
              className="clv-fin clv-fin--mono"
              value={draft.email}
              placeholder="Email"
              aria-label="Email"
              onChange={(e) => onDraft({ email: e.target.value })}
            />
          </div>
        </div>
      </div>
      {note("who")}
      {note("reply")}
      {note("nrn")}

      <div {...sec("door", focusSection)}>
        <h5>Open to queries</h5>
        <span className="clv-seg" role="group" aria-label="Open to queries">
          <button
            type="button" aria-pressed={draft.submissionStatus === "Open"}
            onClick={() => onDraft({ submissionStatus: "Open" as ContactDraft["submissionStatus"], reopensOn: "" })}
          >
            Open
          </button>
          <button
            type="button" aria-pressed={draft.submissionStatus === "Closed"}
            onClick={() => onDraft({ submissionStatus: "Closed" as ContactDraft["submissionStatus"] })}
          >
            Closed
          </button>
        </span>
        {draft.submissionStatus === "Closed" && (
          <span className="clv-freopen" data-clv="f-reopen">
            Reopens
            <input
              type="date"
              value={draft.reopensOn}
              aria-label="The date their list reopens"
              onChange={(e) => onDraft({ reopensOn: e.target.value })}
            />
          </span>
        )}
        {note("door")}
      </div>

      <div {...sec("genres", focusSection)}>
        <h5>Genres sought</h5>
        <div className="clv-tgl" data-clv="f-genres">
          {options.map((g) => {
            const on = draft.genres.some((x) => x.toLowerCase() === g.toLowerCase());
            const isMs = !!msGenre && g.toLowerCase() === msGenre.toLowerCase();
            return (
              <button
                key={g} type="button" aria-pressed={on}
                className={isMs ? "clv-tgl--ms" : undefined}
                onClick={() => onDraft({
                  genres: on ? draft.genres.filter((x) => x.toLowerCase() !== g.toLowerCase()) : [...draft.genres, g],
                })}
              >
                {isMs && on ? "✓ " : ""}{g}
              </button>
            );
          })}
          {draft.genres.filter((g) => !options.some((o) => o.toLowerCase() === g.toLowerCase())).map((g) => (
            <button
              key={g} type="button" aria-pressed
              onClick={() => onDraft({ genres: draft.genres.filter((x) => x !== g) })}
            >
              {g}
            </button>
          ))}
          {otherOpen ? (
            <input
              className="clv-fin clv-fin--mono clv-fother"
              value={other}
              placeholder="Another genre"
              aria-label="Another genre"
              autoFocus
              onChange={(e) => setOther(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  /* canonicalise against the pool — typing "thriller" beside the pool's
                     "Thriller" must not mint a second spelling of one genre (quickAdd's law) */
                  const next = commitTypedGenre(other, draft.genres, options);
                  if (next) onDraft({ genres: next });
                  setOther(""); setOtherOpen(false);
                }
                if (e.key === "Escape") { setOther(""); setOtherOpen(false); e.stopPropagation(); }
              }}
              onBlur={() => {
                const next = commitTypedGenre(other, draft.genres, options);
                if (next) onDraft({ genres: next });
                setOther(""); setOtherOpen(false);
              }}
            />
          ) : (
            <button type="button" className="clv-tgl--add" onClick={() => setOtherOpen(true)}>+ Other</button>
          )}
        </div>
        {note("genres")}
      </div>

      <div {...sec("wishlist", focusSection)}>
        <h5>Manuscript wishlist <span className="clv-opt">Optional</span></h5>
        <textarea
          className="clv-fta"
          value={draft.mswlNotes}
          aria-label="Manuscript wishlist"
          data-clv="f-wishlist"
          onChange={(e) => onDraft({ mswlNotes: e.target.value })}
        />
      </div>

      <div {...sec("materials", focusSection)}>
        <h5>Materials requested</h5>
        <div className="clv-tgl" data-clv="f-materials">
          <button type="button" aria-pressed={matOn("Query letter")} onClick={() => toggleMat("Query letter")}>Query letter</button>
          <button type="button" aria-pressed={matOn("Synopsis")} onClick={() => toggleMat("Synopsis")}>Synopsis</button>
          <button type="button" aria-pressed={openingOn} onClick={toggleOpening}>Opening pages</button>
        </div>
        {matOn("Synopsis") && (
          <span className="clv-pgs">
            Synopsis
            <span className="clv-seg clv-seg--sm" role="group" aria-label="Synopsis length">
              {(["1pp", "2pp", "any"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={synLen === v} onClick={() => setSynLen(v)}>{v}</button>
              ))}
            </span>
          </span>
        )}
        {openingOn && (
          <span className="clv-pgs">
            First
            <input
              value={mats.counts[sampleKind] ?? ""}
              inputMode="numeric"
              placeholder={MAT_QTY[sampleKind].placeholder}
              aria-label={`How many ${MAT_QTY[sampleKind].unit}`}
              onChange={(e) => putMats({ ...mats, counts: { ...mats.counts, [sampleKind]: e.target.value.replace(/[^\d]/g, "") } })}
            />
            <select
              value={sampleKind === "Sample pages" ? "pages" : "chapters"}
              aria-label="Pages or chapters"
              onChange={(e) => setSampleKind(e.target.value === "pages" ? "Sample pages" : "Sample chapters")}
            >
              <option value="pages">pages</option>
              <option value="chapters">chapters</option>
            </select>
          </span>
        )}
      </div>

      <div {...sec("rating", focusSection)}>
        <h5>Your rating <span className="clv-opt">Optional</span></h5>
        <span className="clv-fstars" data-clv="f-stars" role="group" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} type="button"
              className={draft.starRating != null && draft.starRating >= n ? "clv-on" : undefined}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              /* click the same star again to clear (§8.2) */
              onClick={() => onDraft({ starRating: draft.starRating === n ? null : n })}
            >
              ★
            </button>
          ))}
        </span>
      </div>
    </div>
  );
};
