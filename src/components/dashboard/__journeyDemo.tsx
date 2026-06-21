/* TEMP dev harness (#/journey-demo) — NOT committed. Two WhatsLivePanel states:
   (1) has settled/inactive queries → "Not shown here: …" + grey "no …" live captions;
   (2) no settled queries → "You have no inactive queries. Everything is shown below." */
import React from "react";
import { WhatsLivePanel } from "./WhatsLivePanel";
import { QueryStatus, Query } from "../../types";
import { kraft } from "../../lib/designTokens";

const mk = (status: QueryStatus, n: number): Query[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${status}-${i}`, status } as unknown as Query));

// Active live: queried, partial requested, full requested. Inactive live (zero): partial sent,
// full sent, R&R. Settled: 1 offer, 6 rejected, 1 withdrawn + 1 no-response (= 2 closed).
const WITH_INACTIVE: Query[] = [
  ...mk(QueryStatus.QUERIED, 4),
  ...mk(QueryStatus.PARTIAL_REQUESTED, 2),
  ...mk(QueryStatus.FULL_REQUESTED, 1),
  ...mk(QueryStatus.OFFER, 1),
  ...mk(QueryStatus.REJECTED, 6),
  ...mk(QueryStatus.WITHDRAWN, 1),
  ...mk(QueryStatus.NO_RESPONSE, 1),
];

// No settled queries at all — only live ones.
const NO_INACTIVE: Query[] = [
  ...mk(QueryStatus.QUERIED, 3),
  ...mk(QueryStatus.PARTIAL_REQUESTED, 1),
  ...mk(QueryStatus.FULL_SENT, 1),
];

const Frame: React.FC<{ label: string; queries: Query[] }> = ({ label, queries }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7c3a2a", marginBottom: 8 }}>{label}</div>
    <div style={{ width: 820, maxWidth: "100%" }}>
      <WhatsLivePanel queries={queries} />
    </div>
  </div>
);

export const JourneyDemo: React.FC = () => (
  <div style={{ minHeight: "100vh", background: kraft, padding: 40 }}>
    <Frame label="WITH INACTIVE — header 'Not shown here: 1 offer, 6 rejections, 2 closed'; grey 'no …' on empty live stages" queries={WITH_INACTIVE} />
    <Frame label="NO INACTIVE — header 'You have no inactive queries. Everything is shown below.'" queries={NO_INACTIVE} />
  </div>
);
