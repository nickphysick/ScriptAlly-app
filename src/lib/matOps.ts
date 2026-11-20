/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The materials controls' limits and changes (lifted out of components/agents/card/agentPills by Agent card v2.1, values
 * unchanged), so the add journey's pills, the agent card's tick list and the locks share one copy.
 */
import { UNIT_CFG, type SampleUnit } from "./agentMaterials";
import { CREATE_QTY } from "./createQty";
import type { CardMats } from "./cardDraft";

export const OTHER_MAX = 40;
export const SYN_MAX = 20;
/** the floor a sample amount must reach — the create sheet's own (`CREATE_QTY`) */
export const sampleFloor = (u: SampleUnit): number => CREATE_QTY[u].min;
export const sampleBad = (m: CardMats): boolean => m.smp.on && (!m.smp.qty || m.smp.qty < sampleFloor(m.smp.unit));

/**
 * Agent card v2.1 — EVERY CHANGE A MATERIALS CONTROL MAKES, in one place: `MaterialPills` (the add journey) and the agent
 * card's tick list (`MaterialRows`) both call these, so the two dresses can never store different things for the same
 * choices. Lifted out of MaterialPills unchanged.
 */
export const MAT_OPS = {
  ql: (m: CardMats): CardMats => ({ ...m, ql: !m.ql }),
  synOn: (m: CardMats): CardMats => ({ ...m, syn: { ...m.syn, on: true } }),
  synOff: (m: CardMats): CardMats => ({ ...m, syn: { on: false, len: m.syn.len } }),
  synLess: (m: CardMats): CardMats => ({ ...m, syn: { on: true, len: m.syn.len && m.syn.len > 1 ? m.syn.len - 1 : null } }),
  synMore: (m: CardMats): CardMats => ({ ...m, syn: { on: true, len: Math.min(SYN_MAX, (m.syn.len ?? 0) + 1) } }),
  synType: (m: CardMats, n: number | null): CardMats => ({ ...m, syn: { on: true, len: n ? Math.min(SYN_MAX, n) : null } }),
  smpOn: (m: CardMats): CardMats => ({ ...m, smp: { ...m.smp, on: true, qty: m.smp.qty || UNIT_CFG[m.smp.unit].def } }),
  smpOff: (m: CardMats): CardMats => ({ ...m, smp: { ...m.smp, on: false } }),
  smpLess: (m: CardMats): CardMats => { const u = UNIT_CFG[m.smp.unit]; return { ...m, smp: { ...m.smp, qty: Math.max(sampleFloor(m.smp.unit), Math.min(u.max, (m.smp.qty || u.def) - u.step)) } }; },
  smpMore: (m: CardMats): CardMats => { const u = UNIT_CFG[m.smp.unit]; return { ...m, smp: { ...m.smp, qty: Math.min(u.max, Math.max(sampleFloor(m.smp.unit), (m.smp.qty || u.def - u.step) + u.step)) } }; },
  smpType: (m: CardMats, n: number | null): CardMats => ({ ...m, smp: { ...m.smp, qty: n ? Math.min(UNIT_CFG[m.smp.unit].max, n) : 0 } }),
  smpUnit: (m: CardMats, x: SampleUnit): CardMats => (m.smp.unit === x ? m : { ...m, smp: { ...m.smp, unit: x, qty: UNIT_CFG[x].def } }),
  othOn: (m: CardMats): CardMats => ({ ...m, oth: { ...m.oth, on: true } }),
  othOff: (m: CardMats): CardMats => ({ ...m, oth: { on: false, text: m.oth.text } }),
  othType: (m: CardMats, v: string): CardMats => ({ ...m, oth: { on: true, text: v.length > OTHER_MAX && v.length > m.oth.text.length ? m.oth.text : v } }),
  /** the − / + limits the two steppers show */
  synLessOff: (m: CardMats): boolean => !m.syn.len,
  synMoreOff: (m: CardMats): boolean => (m.syn.len ?? 0) >= SYN_MAX,
  smpLessOff: (m: CardMats): boolean => !!m.smp.qty && m.smp.qty <= sampleFloor(m.smp.unit),
  smpMoreOff: (m: CardMats): boolean => m.smp.qty >= UNIT_CFG[m.smp.unit].max,
} as const;
export const SAMPLE_UNITS: readonly SampleUnit[] = ["Chapters", "Pages", "Words"];
