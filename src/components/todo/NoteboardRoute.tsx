/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `/todo/corkboard` (old address /todo/noteboard). Corkboard v2 (6 Nov; ref design-refs/corkboard-v13/, screen 10) is
 * one page at every width: below 768px it is one column with the header stacked, and nothing is draggable (the ⋯
 * menu's Move items do that job). Phone app v2's own CorkPhone (Part 5C) is retired with it.
 */
import React from "react";
import { TodoNoteboardPage } from "./TodoNoteboardPage";

export const NoteboardRoute: React.FC<React.ComponentProps<typeof TodoNoteboardPage>> = (props) => <TodoNoteboardPage {...props} />;
