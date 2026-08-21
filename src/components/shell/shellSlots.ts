/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SHELL SLOTS — ids for the few places page chrome has to be rendered OUTSIDE its own subtree.
 *
 * ⚠️ ITS WHOLE POINT IS HAVING NO DEPENDENCIES. `WorkspacePageGrid` needs the window wrapper's id to
 * portal the fold's chevron onto the window's border, and importing it from `WorkspaceShell` made a
 * leaf component depend on the entire shell — which transitively imports Firebase, so three unit
 * suites stopped LOADING with `auth/invalid-api-key` before a single assertion ran. A constant is
 * not worth a dependency edge, and the edge it created pointed the wrong way: from the thing being
 * arranged to the thing arranging it.
 */

/**
 * The wrapper around `.ws-window`, and the host for chrome that must sit ON the window's edge.
 *
 * ⚠️ AN ID IS SAFE HERE BECAUSE THE SHELL RENDERS ONCE — worth stating rather than assuming.
 * `getElementById` returns whichever match is first in the document, which is how inspecting the
 * brand once silently measured the panel's 27px logo instead of the bar's. One shell, one wrapper,
 * one id; anyone adding a second must not give it this one.
 */
export const WINWRAP_ID = "sa-winwrap";
