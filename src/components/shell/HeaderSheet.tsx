/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE HEADER SHEET (app shell v2, 9 Oct; ref design-refs/shell/shell-v2-page.html).
 *
 * The lighter field every page header sits on: `--ws-sheet`, the page sheet's full width, from the
 * sheet's top down to the header's bottom, closed by the envelope flap. One element, rendered as the
 * FIRST child of a header whose root carries `hsheet-host` (headerSheet.css). It changes nothing
 * about the header's own layout: it is absolutely placed and painted behind the header's contents.
 *
 * Two elements because a clip removes an ordinary box-shadow: the outer one carries the
 * drop-shadow filter, which follows the outline of the clipped inner one.
 */
import React from "react";
import "./headerSheet.css";

export const HeaderSheet: React.FC = () => (
  <span className="hsheet" data-header-sheet="" aria-hidden="true"><i /></span>
);
