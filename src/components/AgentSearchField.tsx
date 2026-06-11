/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgentSearchField — the Log a Query agent picker. Search-as-you-type by name or agency, with
 * smart ordering: not-yet-queried agents float to the top (rating desc), already-queried agents
 * sit below in a dimmed "Already queried" group. A "group by rating" toggle re-buckets results
 * into 5★…1★ groups instead.
 *
 * "Already queried" is scoped per-manuscript by the caller (queriedAgentIds). When more than one
 * manuscript exists, a quiet readout names which manuscript the tags reflect.
 *
 * Form-specific (not a Form 11 foundation primitive); styled with the shared sa- tokens.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Agent } from "../types";

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface AgentSearchFieldProps {
  agents: Agent[];
  /** Selected agent id. */
  value: string;
  /** Agent ids already queried (scoped per-manuscript by the caller). */
  queriedAgentIds: Set<string>;
  onSelect: (agent: Agent) => void;
  /** Title of the manuscript the queried tags reflect — only passed when >1 manuscript exists. */
  manuscriptLabel?: string;
}

type AgentGroup = { header: string | null; dim?: boolean; rows: Agent[] };

export const AgentSearchField: React.FC<AgentSearchFieldProps> = ({
  agents,
  value,
  queriedAgentIds,
  onSelect,
  manuscriptLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [groupByRating, setGroupByRating] = useState(false);
  const [hl, setHl] = useState(0); // highlighted result index (keyboard nav)
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedAgent = agents.find((a) => a.id === value) || null;
  const isQueried = (a: Agent) => queriedAgentIds.has(a.id);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const q = queryText.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      agents.filter(
        (a) => !q || a.name.toLowerCase().includes(q) || (a.agency || "").toLowerCase().includes(q)
      ),
    [agents, q]
  );

  const groups: AgentGroup[] = useMemo(() => {
    const byRatingDesc = (a: Agent, b: Agent) => (b.starRating || 0) - (a.starRating || 0);

    if (groupByRating) {
      const out: AgentGroup[] = [];
      for (let r = 5; r >= 1; r--) {
        // Within a bucket, surface not-yet-queried first.
        const rows = filtered
          .filter((a) => (a.starRating || 0) === r)
          .sort((a, b) => Number(isQueried(a)) - Number(isQueried(b)));
        if (rows.length) out.push({ header: `${r} ★`, rows });
      }
      const unrated = filtered.filter((a) => !a.starRating);
      if (unrated.length) out.push({ header: "Unrated", rows: unrated });
      return out;
    }

    const notQueried = filtered.filter((a) => !isQueried(a)).sort(byRatingDesc);
    const queried = filtered.filter((a) => isQueried(a)).sort(byRatingDesc);
    const out: AgentGroup[] = [];
    if (notQueried.length) out.push({ header: null, rows: notQueried });
    if (queried.length) out.push({ header: "Already queried", dim: true, rows: queried });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, groupByRating, queriedAgentIds]);

  // Flat list of selectable rows in display order, for keyboard navigation.
  const flatRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // Reset the highlight when the result set changes; keep the highlighted row in view.
  useEffect(() => {
    setHl(0);
  }, [queryText, groupByRating, open]);
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector(".sa-ag-row.hl")?.scrollIntoView({ block: "nearest" });
  }, [hl, open]);

  const pick = (a: Agent) => {
    onSelect(a);
    setOpen(false);
    setQueryText("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHl((h) => Math.min(h + 1, flatRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && flatRows[hl]) {
        e.preventDefault();
        pick(flatRows[hl]);
      }
    } else if (e.key === "Escape") {
      // Close the menu only — and stop the event so it doesn't reach FormShell's close guard.
      if (open) {
        e.stopPropagation();
        setOpen(false);
      }
    }
  };

  return (
    <div className="sa-ag" ref={ref}>
      <div className="sa-ag-labelrow">
        <span className="sa-label sa-ag-label">Agent</span>
        <button
          type="button"
          className={`sa-ag-toggle${groupByRating ? " on" : ""}`}
          aria-pressed={groupByRating}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setGroupByRating((v) => !v)}
        >
          <span className="sa-ag-tick">✓</span> group by rating
        </button>
      </div>

      <input
        className="sa-input"
        style={{ marginBottom: open ? 0 : 14 }}
        placeholder="Search by name or agency…"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={open ? queryText : selectedAgent ? selectedAgent.name : ""}
        onFocus={() => {
          setOpen(true);
          setQueryText("");
        }}
        onChange={(e) => {
          setQueryText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        // Closes on blur (e.g. Tab away). Result rows preventDefault on mousedown so a click on a
        // result keeps focus and isn't swallowed by this blur.
        onBlur={() => setOpen(false)}
      />

      {open && (
        <div className="sa-ag-menu" ref={menuRef} onMouseDown={(e) => e.preventDefault()}>
          {manuscriptLabel && (
            <div className="sa-ag-readout">
              Query history shown for: <strong>{manuscriptLabel}</strong>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="sa-ag-empty">No agents match{queryText ? ` "${queryText}"` : ""}.</div>
          ) : (
            groups.map((g, gi) => (
              <div key={gi} className={g.dim ? "sa-ag-group-dim" : undefined}>
                {g.header && <div className="sa-ag-grouphead">{g.header}</div>}
                {g.rows.map((a) => {
                  const queried = isQueried(a);
                  const idx = flatRows.indexOf(a);
                  return (
                    <div
                      key={a.id}
                      role="option"
                      aria-selected={a.id === value}
                      className={`sa-ag-row${queried ? " queried" : ""}${a.id === value ? " sel" : ""}${idx === hl ? " hl" : ""}`}
                      onMouseEnter={() => setHl(idx)}
                      onClick={() => pick(a)}
                    >
                      <span className="sa-ag-avatar">{initialsOf(a.name)}</span>
                      <span className="sa-ag-meta">
                        <span className="sa-ag-name">{a.name}</span>
                        <span className="sa-ag-agency">{a.agency || "Independent"}</span>
                      </span>
                      {a.starRating ? <span className="sa-ag-stars">{"★".repeat(a.starRating)}</span> : null}
                      <span className={`sa-ag-tag ${queried ? "q" : "nq"}`}>{queried ? "Queried" : "Not queried"}</span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
