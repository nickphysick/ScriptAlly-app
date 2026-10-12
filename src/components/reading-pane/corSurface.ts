/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What a correction sheet IS to assistive tech. Free-standing it is a modal dialog. Stepped into the query's side
 * panel (Query panel v2 §D) it is a group inside the panel — the panel is the one dialog — so the desk says so here.
 *
 * A file of its own, importing React alone: the desk provides it and the sheets read it, and neither may pull the
 * other's imports in behind it.
 */
import React from "react";

export const CorSurface = React.createContext<"dialog" | "group">("dialog");
