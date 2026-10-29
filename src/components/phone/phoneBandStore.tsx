/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2 — the band's SLOT. Each phone page puts its key figure in the navy band beneath its title (Home's hero,
 * the Queries counts, To-do's week…). A page registers its node under its own PATH; the shell draws only the slot
 * registered for the path on screen, so a mounted-but-inactive page (StagePage slots never unmount) can never put its
 * figure in another page's band. The same per-route idiom as `MobileChromeContext`.
 */
import React, { createContext, useContext, useEffect } from "react";

export interface PhoneBandValue {
  setBandSlot: (path: string, node: React.ReactNode | null) => void;
}
export const PhoneBandContext = createContext<PhoneBandValue>({ setBandSlot: () => {} });

/** Put `node` in the band while `path` is on screen. Pass null (or unmount) to clear it. */
export function usePhoneBandSlot(path: string, node: React.ReactNode | null, deps: React.DependencyList): void {
  const { setBandSlot } = useContext(PhoneBandContext);
  useEffect(() => {
    setBandSlot(path, node);
    return () => setBandSlot(path, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, setBandSlot, ...deps]);
}
