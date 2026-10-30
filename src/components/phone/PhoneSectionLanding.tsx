/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone last screens v1, 4B (30 Oct). Below 768px the desktop-only addresses `/queries/packages`,
 * `/manuscripts/comps` and `/manuscripts/versions` land on the phone Manuscript page at their own
 * section — App.tsx's slot choice redirects them (with `replace`, so the back gesture returns to
 * wherever the link was opened from) to `/manuscripts#packages|comps|versions`, keeping the query.
 *
 * ⚠️ THE PHONE MANUSCRIPT PAGE IS NOT EDITED. `ManuscriptPhone.tsx` is a `Manuscript*` file and owned
 * by another session. It scrolls to `#comps` itself; its Packages and Versions headings carry no id,
 * so this helper finds them by the lists they head (`[data-pa="ms-pkgs"]`, `[data-pa="ms-pro"]`) and
 * scrolls the heading in. `?pkg=` / `?version=` then open that item's read sheet by pressing the
 * page's own row (`[data-pa="ms-pkg"|"ms-version"][data-id]`) — the page's handler, not a copy.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** The phone landing for a desktop-only address, or null. */
/* Phone round two v1 (2B): `/queries/packages` is the Packages tab on a phone now, so it no longer lands here. */
export function phoneSectionFor(path: string): "packages" | "comps" | "versions" | null {
  if (path === "/manuscripts/comps") return "comps";
  if (path === "/manuscripts/versions") return "versions";
  return null;
}

const HEAD_OF: Record<string, string> = { packages: '[data-pa="ms-pkgs"]', versions: '[data-pa="ms-pro"]' };
const ROW_OF: Record<string, [string, string]> = { packages: ["pkg", "ms-pkg"], versions: ["version", "ms-version"] };

export function PhoneSectionLanding({ active }: { active: boolean }) {
  const location = useLocation();
  useEffect(() => {
    if (!active || location.pathname !== "/manuscripts") return;
    const section = location.hash.replace(/^#/, "");
    const head = HEAD_OF[section];
    if (!head) return;
    let tries = 0;
    const t = window.setInterval(() => {
      const page = document.querySelector<HTMLElement>('[data-pa="manuscript"]');
      const list = page?.querySelector<HTMLElement>(head);
      if (!list && ++tries < 40) return;
      window.clearInterval(t);
      if (!list) return;
      (list.previousElementSibling as HTMLElement | null ?? list).scrollIntoView({ block: "start" });
      const [param, row] = ROW_OF[section];
      const id = new URLSearchParams(location.search).get(param);
      if (id) page!.querySelector<HTMLElement>(`[data-pa="${row}"][data-id="${CSS.escape(id)}"]`)?.click();
    }, 50);
    return () => window.clearInterval(t);
  }, [active, location.key, location.pathname, location.hash, location.search]);
  return null;
}
