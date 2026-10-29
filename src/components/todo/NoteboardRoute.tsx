/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `/todo/noteboard` chooses its page by width, as `/todo` does (TodoRoute): the noteboard page on a desktop (768px up),
 * the phone's Corkboard (Phone app v2, Part 5C) below it. One is mounted at a time.
 */
import React from "react";
import { useIsMobile } from "../shell/mobileChrome";
import { TodoNoteboardPage } from "./TodoNoteboardPage";
import { CorkPhone } from "./phone/CorkPhone";

export const NoteboardRoute: React.FC<React.ComponentProps<typeof TodoNoteboardPage>> = (props) => {
  const phone = useIsMobile();
  return phone ? <CorkPhone /> : <TodoNoteboardPage {...props} />;
};
