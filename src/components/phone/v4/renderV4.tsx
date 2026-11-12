/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — the overlay host's renderer for v4's own panels (v3Store's union; V3Layer draws them).
 */
import React from "react";
import type { V3Overlay } from "../v3/v3Store";
import { QuickLogV4 } from "./QuickLogV4";
import { AgentSheetV4, AgentsListPageV4 } from "./AgentsV4";
import { GapsSheetV5 } from "../v5/GapsSheetV5";
import { FeedbackSheetV5 } from "../v5/FeedbackSheetV5";

export function renderV4(o: V3Overlay): React.ReactNode {
  if (o.type === "plus") return <QuickLogV4 />;
  if (o.type === "log") return <QuickLogV4 agentId={o.agentId} />;
  if (o.type === "agents-all") return <AgentsListPageV4 group={o.group ?? null} />;
  if (o.type === "gaps") return <GapsSheetV5 group={o.group ?? null} />;
  if (o.type === "feedback") return <FeedbackSheetV5 about={o.about} kind={o.kind ?? null} />;
  if (o.type === "agent") return <AgentSheetV4 id={o.id} />;
  return null;
}
