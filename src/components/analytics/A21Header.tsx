/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics — the page's header. Workspace headers v1 (14 Nov; design-refs/workspace-headers-v1) replaced v21's light
 * header and its white card with the shared navy header (shell/WorkspaceNavyHeader), dressed by the Query Centre's
 * sheets. The headline and the ring's figures are unchanged: `headTitle` and `ringOf(replyKeeping)` (lib/analyticsV24).
 * The card's four-row legend ("Where the queries stand") is gone.
 * ⚠️ DESKTOP ONLY. The phone (≤ 760) keeps v17's band, which the page mounts instead (decision 5).
 */
import React from "react";
import { WorkspaceNavyHeader, WsnhRing, WsnhWords } from "../shell/WorkspaceNavyHeader";

/** "27 queries, 10 replies" — singulars, and a zero in words. */
export function headTitle(sent: number, replies: number): { sent: string; sentWord: string; replies: string; repliesWord: string } {
  return {
    sent: String(sent),
    sentWord: sent === 1 ? "query" : "queries",
    replies: replies === 0 ? "no" : String(replies),
    repliesWord: replies === 1 ? "reply" : "replies",
  };
}

/* Workspace headers v1 (design-refs/workspace-headers-v1, "Analytics") — the navy header: "27 queries, 10 replies"
   (headTitle, as before) for the book; Record and See what happened; on the right the "Replied on time" ring with its
   percentage and "<n> of the <n> replies" (ringOf, as before). The four-row legend beside the ring is gone. Every
   figure is the page's own. Day one: "No queries yet" with the empty state's two buttons; no book: "No manuscript yet". */
export const AN_EMPTY_TITLE = "No queries yet";
export const AN_NO_MS_TITLE = "No manuscript yet";
export const anTitle = (sent: number, replies: number): string => {
  const t = headTitle(sent, replies);
  return `${t.sent} ${t.sentWord}, ${t.replies} ${t.repliesWord}`;
};
export const AnHeader: React.FC<{
  loading: boolean;
  /** the book has no queries (day one) */
  empty: boolean;
  noMs: boolean;
  sent: number;
  replies: number;
  msTitle: string | null;
  /** `ringOf(replyKeeping)`: pct is null while no reply had a stated time */
  ring: { inside: number; dated: number; pct: number | null } | null;
  onRecord: () => void;
  onRead: () => void;
  onLog: () => void;
  onImport: () => void;
}> = ({ loading, empty, noMs, sent, replies, msTitle, ring, onRecord, onRead, onLog, onImport }) => {
  const title = noMs ? AN_NO_MS_TITLE : empty ? AN_EMPTY_TITLE : anTitle(sent, replies);
  const filled = !noMs && !empty;
  const kept = ring && ring.pct !== null ? ring : null;
  return (
    <WorkspaceNavyHeader page="analytics" art="analytics-header" loading={loading}
      title={title}
      forLine={msTitle && !noMs ? { lead: "for", text: msTitle } : null}
      actions={noMs ? null : empty ? <>
        <button type="button" className="qc1531-b qc1531-b--n" data-a21="empty-log" onClick={onLog}>+ Log your first query</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-a21="empty-import" onClick={onImport}>Import the ones you{"’"}ve sent</button>
      </> : <>
        <button type="button" className="qc1531-b qc1531-b--n" data-a21="record-response" onClick={onRecord}>+ Record a response</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-a21="read" onClick={onRead} disabled={loading}>See what happened {"↓"}</button>
      </>}
      right={filled ? <>
        <WsnhRing pct={kept ? kept.pct : null} />
        <WsnhWords name="Replied on time"
          sub={kept ? <><b data-a21="hd-inside">{kept.inside}</b> of the {kept.dated} {kept.dated === 1 ? "reply" : "replies"}</> : "No replies yet"} />
      </> : null}
      bar={noMs ? null : filled ? {
        title, aside: kept ? <b>{kept.pct}% replied on time</b> : null, button: { label: "+ Record a response", onClick: onRecord },
      } : { title, button: { label: "+ Log your first query", onClick: onLog } }} />
  );
};

/** True at the phone's width (≤ 760), where v17's band stands in for the light header. Live on resize. */
export const PHONE_QUERY = "(max-width: 760px)";
export function usePhone(): boolean {
  const [phone, setPhone] = React.useState<boolean>(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mql = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return phone;
}
