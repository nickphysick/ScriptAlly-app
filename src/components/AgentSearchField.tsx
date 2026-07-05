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
import { useFixedMenu } from "./forms/useFixedMenu";
import type { Agent } from "../types";
import { agentPrimary, agentSecondary, agentInitials } from "../lib/agentDisplay";

interface AgentSearchFieldProps {
  agents: Agent[];
  /** Selected agent id. */
  value: string;
  /** Agent ids already queried (scoped per-manuscript by the caller). */
  queriedAgentIds: Set<string>;
  onSelect: (agent: Agent) => void;
  /** Title of the manuscript the queried tags reflect — only passed when >1 manuscript exists. */
  manuscriptLabel?: string;
  /**
   * Creates a schema-compatible agent from the quick-add panel and returns it for selection.
   * The caller fills the defaults for every omitted required field. When absent, quick-add is hidden.
   */
  onCreateAgent?: (draft: {
    name: string;
    agency: string;
    email: string;
    responseTimeWeeks?: number;
    starRating?: number;
  }) => Promise<{ ok: boolean; error?: string; agent?: Agent }>;
}

type AgentGroup = { header: string | null; dim?: boolean; rows: Agent[] };

export const AgentSearchField: React.FC<AgentSearchFieldProps> = ({
  agents,
  value,
  queriedAgentIds,
  onSelect,
  manuscriptLabel,
  onCreateAgent,
}) => {
  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [groupByRating, setGroupByRating] = useState(false);
  const [hl, setHl] = useState(0); // highlighted result index (keyboard nav)
  // ── Inline quick-add ──
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaAgency, setQaAgency] = useState("");
  const [qaEmail, setQaEmail] = useState("");
  const [qaWeeks, setQaWeeks] = useState("");
  const [qaRating, setQaRating] = useState(3);
  const [qaSaving, setQaSaving] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Anchor the results menu with position:fixed (escapes FormShell's scroll-region clip).
  const { triggerRef, menuStyle } = useFixedMenu<HTMLInputElement>(open);

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

  const openQuickAdd = (prefillName: string) => {
    setQaName(prefillName.trim());
    setQaAgency("");
    setQaEmail("");
    setQaWeeks("");
    setQaRating(3);
    setQaError(null);
    setOpen(false);
    setShowQuickAdd(true);
  };

  const submitQuickAdd = async () => {
    if (!onCreateAgent) return;
    if (!qaName.trim()) {
      setQaError("Please enter the agent's name.");
      return;
    }
    setQaError(null);
    setQaSaving(true);
    try {
      const weeks = qaWeeks.trim() === "" ? undefined : parseInt(qaWeeks, 10);
      const res = await onCreateAgent({
        name: qaName,
        agency: qaAgency,
        email: qaEmail,
        responseTimeWeeks: Number.isFinite(weeks as number) ? (weeks as number) : undefined,
        starRating: qaRating,
      });
      if (res.ok && res.agent) {
        onSelect(res.agent); // auto-select; deadline line + send method update off the new agent
        setShowQuickAdd(false);
        setQueryText("");
      } else {
        setQaError(res.error || "Couldn't add the agent — please try again.");
      }
    } catch (e: any) {
      setQaError(e?.message || "Couldn't add the agent — please try again.");
    } finally {
      setQaSaving(false);
    }
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
        {!showQuickAdd && (
          <button
            type="button"
            className={`sa-ag-toggle${groupByRating ? " on" : ""}`}
            aria-pressed={groupByRating}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setGroupByRating((v) => !v)}
          >
            <span className="sa-ag-tick">✓</span> group by rating
          </button>
        )}
      </div>

      {showQuickAdd ? (
        <div className="sa-qa">
          <div className="sa-qa-head">Add a new agent</div>
          <input
            className="sa-input"
            autoFocus
            placeholder="Agent name"
            value={qaName}
            onChange={(e) => setQaName(e.target.value)}
          />
          <input className="sa-input" placeholder="Agency" value={qaAgency} onChange={(e) => setQaAgency(e.target.value)} />
          <input
            className="sa-input"
            placeholder="Email (optional)"
            value={qaEmail}
            onChange={(e) => setQaEmail(e.target.value)}
          />
          <div className="sa-row2">
            <input
              className="sa-input"
              inputMode="numeric"
              placeholder="Response wks (optional)"
              value={qaWeeks}
              onChange={(e) => setQaWeeks(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <div className="sa-qa-rating" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  role="radio"
                  aria-checked={qaRating === s}
                  className={`sa-qa-star${qaRating >= s ? " on" : ""}`}
                  onClick={() => setQaRating(s)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          {qaError && <div className="sa-error">{qaError}</div>}
          <div className="sa-qa-actions">
            <button type="button" className="sa-qa-cancel" onClick={() => setShowQuickAdd(false)}>
              Cancel
            </button>
            <button type="button" className="sa-qa-add" disabled={qaSaving} onClick={submitQuickAdd}>
              {qaSaving ? "Adding…" : "Add & select"}
            </button>
          </div>
          <div className="sa-qa-note">
            Just the basics — add genres, MSWL, and submission details later from the agent's page.
          </div>
        </div>
      ) : (
        <>
          <input
            ref={triggerRef}
            className="sa-input"
            style={{ marginBottom: 8 }}
            placeholder="Search by name or agency…"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            value={open ? queryText : selectedAgent ? agentPrimary(selectedAgent) : ""}
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

          {onCreateAgent && (
            <button
              type="button"
              className="sa-ag-addlink"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openQuickAdd(queryText)}
            >
              Agent not listed? <span>Add a new agent now</span>
            </button>
          )}

          {open && (
            <div className="sa-ag-menu" ref={menuRef} style={menuStyle} onMouseDown={(e) => e.preventDefault()}>
              {manuscriptLabel && (
                <div className="sa-ag-readout">
                  Query history shown for: <strong>{manuscriptLabel}</strong>
                </div>
              )}

              {groups.length === 0 ? (
                <div className="sa-ag-empty">
                  No agents match{queryText ? ` "${queryText}"` : ""}.
                  {onCreateAgent && (
                    <button type="button" className="sa-ag-empty-add" onClick={() => openQuickAdd(queryText)}>
                      + Add {queryText ? `"${queryText}"` : "a new agent"}
                    </button>
                  )}
                </div>
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
                      <span className="sa-ag-avatar">{agentInitials(a)}</span>
                      <span className="sa-ag-meta">
                        <span className="sa-ag-name">{agentPrimary(a)}</span>
                        <span className="sa-ag-agency">{agentSecondary(a) || "Independent"}</span>
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
        </>
      )}
    </div>
  );
};
