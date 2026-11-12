/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE SELLING FLAG (non-workspace v1, Phase 4). Every "buy" control — a plan length's Choose, "Add more time",
 * the Plans table's "Choose a length" — is drawn only when this is true. There is no payment path in the app, so it
 * is false, and `planTable.test.tsx` fails if any buy control is reachable while it is.
 */
export const PLANS_ON_SALE = false as boolean;
