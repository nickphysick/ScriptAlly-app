/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — the provider of the one read (useV3). The shell mounts it on a phone only; at 768px and up it renders
 * its children and computes nothing.
 */
import React, { createContext, useContext } from "react";
import { useV3, type V3Data } from "./useV3";

const V3Ctx = createContext<V3Data | null>(null);

const Live: React.FC<{ now: number; children: React.ReactNode }> = ({ now, children }) => {
  const v = useV3(now);
  return <V3Ctx.Provider value={v}>{children}</V3Ctx.Provider>;
};

export const V3Provider: React.FC<{ on: boolean; now: number; children: React.ReactNode }> = ({ on, now, children }) =>
  on ? <Live now={now}>{children}</Live> : <>{children}</>;

/** the one read; a v3 screen is only ever mounted under the provider */
export function useV3Data(): V3Data {
  const v = useContext(V3Ctx);
  if (!v) throw new Error("useV3Data: no V3Provider above this phone screen");
  return v;
}
/** for a piece that may render without it (the bar's badge reads zero) */
export const useV3Maybe = (): V3Data | null => useContext(V3Ctx);
