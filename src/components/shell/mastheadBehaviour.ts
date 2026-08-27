/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ DOES THIS PAGE'S MASTHEAD LEAVE? ══════════════════════════════════════════════════════════
 *
 * ⚠️ THE LAW IS ABOUT LEAVING, NOT ABOUT A VARIANT NAME. `PageHeader variant="workspace"` used to
 * refuse an action outright, and its message gave the reason: *the masthead holds no actions —
 * they belong in the page's control row, which is the element that anchors once the masthead has
 * gone.* The reasoning was always about ANCHORING, and it is exactly right on a page whose masthead
 * scrolls away: an action placed there becomes unreachable, so it needs a row that persists.
 *
 * On a Type A page the masthead PINS and SETTLES. It never leaves, so the action never becomes
 * unreachable — and a control row there is a band existing purely to work around a constraint that
 * does not apply to it.
 *
 * So the refusal is conditional on the behaviour rather than on the variant, and this is the one
 * thing that knows which: `WorkspacePageGrid` derives `pinned` from `!fill || !!settleOn` and
 * publishes it here.
 *
 * ⚠️ IT IS A CONTEXT AND NOT A PROP, BECAUSE A PAGE MUST NOT BE ABLE TO ASSERT IT. A boolean the
 * caller passes is a caller's opinion — and the one caller with a motive to get it wrong is the one
 * that wants to put an action in a masthead that leaves. The grid computes it from the same
 * expression that decides whether the slab actually pins, so the claim and the behaviour cannot
 * come apart.
 *
 * ⚠️ AND ABSENCE MEANS "LEAVES", WHICH IS THE FAIL-CLOSED DIRECTION. A `PageHeader` rendered outside
 * a grid has no pinning slab to sit in, so an action in it has nothing anchoring it; defaulting to
 * "pins" would quietly permit exactly the arrangement the law forbids, in the one case nobody is
 * looking at.
 */
import { createContext, useContext } from "react";

export interface MastheadBehaviour {
  /** True when the masthead scrolls out of view — Type B. False when it pins and settles — Type A. */
  leaves: boolean;
}

/** ⚠️ `leaves: true` IS THE DEFAULT ON PURPOSE — see the fail-closed note above. */
export const MastheadBehaviourContext = createContext<MastheadBehaviour>({ leaves: true });

export const useMastheadLeaves = (): boolean => useContext(MastheadBehaviourContext).leaves;
