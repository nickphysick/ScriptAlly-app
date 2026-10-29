/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — THE MENTOR'S TOP TIPS (ref design-refs/dashboard-first-visit-v1/).
 *
 * ⚠️ ONE LIST, AND IT IS THE ONLY PLACE THE TIPS LIVE. The bubble reads this array and nothing else, so a
 * tip can be reworded, added or removed here without touching the layout. `lead` is the bold opening
 * phrase (with its full stop); `rest` is the sentence that follows it. The four below are the pack's,
 * verbatim.
 */
export interface DashTip { lead: string; rest: string }

export const DASH_TIPS: readonly DashTip[] = [
  {
    lead: "Query in batches.",
    rest: "Send to five to ten agents at a time rather than your whole list at once. If the first batch brings no requests, you can rework your letter or opening pages before you've used up the agents you most want.",
  },
  {
    lead: "Log the date and what you sent.",
    rest: "Record when each query went and exactly what went with it: letter, synopsis and pages. QueryHawk uses the date to tell you when a nudge or a close is due, and the materials to show which version gets the most requests.",
  },
  {
    lead: "Fill in your agents' details.",
    rest: "Add each agent's usual reply time and what they ask for. The reply time is how QueryHawk knows when a query is overdue, and the list means you send exactly what each agent wants.",
  },
  {
    lead: "Mix established and newer agents.",
    rest: "Newer agents are building their lists, so they're often more open to debuts than established names. A newer agent at an established agency can be the sweet spot: keen to sign clients, with the agency's experience behind them.",
  },
];
