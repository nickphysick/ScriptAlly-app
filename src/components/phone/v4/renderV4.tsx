/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — the overlay host's renderer for v4's own panels (v3Store's union; V3Layer draws them).
 */
import React from "react";
import type { V3Overlay } from "../v3/v3Store";
import { TasksPageV4 } from "./TasksPageV4";

export function renderV4(o: V3Overlay): React.ReactNode {
  if (o.type === "tasks") return <TasksPageV4 />;
  return null;
}
