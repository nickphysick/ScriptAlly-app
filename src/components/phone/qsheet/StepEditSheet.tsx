/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 — A STEP EDITED FROM THE SHEET: the desktop's own step editor (QcStepEdit1522), saved exactly as
 * the Query Centre's card saves it (components/Queries.tsx, "§2.4 the bubble edited in place"):
 *   - a step: lib/qc1522Write `planStepEdit` (+ `planDetails1522` on the query's first step) through `commitPlan`, one
 *     snapshot, so Undo restores it exactly; deleted: `planFix` with the steps that depend on it;
 *   - an agent's reply that moved nothing: `editActivity` / `deleteActivity` under a snapshot.
 * The desktop opens it in place of the bubble. At 390px its controls (the calendar, the material chips) need the width,
 * so on the phone it opens as a sheet over the query sheet (reported).
 */
import React, { useMemo } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { QcStepEdit1522, STEP_METHODS as EDIT_METHODS } from "../../queries/centre/QcStepEdit1522";
import { PopCtx, type MatEnv } from "../../queries/centre/QcEdit152";
import { orderSteps as orderSteps152, readMat, sideOf as side152, stepTitle as stepTitle152, type ThreadStepIn } from "../../../lib/qcThread152";
import { commitPlan, planFix, readFeed, readLog, type FixStep, type StepMaterial } from "../../../lib/qc152Write";
import { dependents, STEP_LABEL, type LogStep, type StepType } from "../../../lib/qcLogic152";
import { planDetails1522, planStepEdit } from "../../../lib/qc1522Write";
import { restoreSnapshot, takeSnapshot, type Snapshot } from "../../../lib/queryActions/snapshot";
import { bookVersionsOf } from "../../../lib/bookVersions";
import { inUseId as inUseBookVersion } from "../../../lib/versionsV2";
import { packagesUnlocked } from "../../../lib/entitlements";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { ComponentType, QueryStatus, type Agent, type Manuscript, type Query } from "../../../types";
import { showV3Snack } from "../v3/v3Store";

const T: Partial<Record<string, StepType>> = {
  [QueryStatus.QUERIED]: "queried", [QueryStatus.PARTIAL_REQUESTED]: "preq", [QueryStatus.PARTIAL_SENT]: "psent", [QueryStatus.FULL_REQUESTED]: "freq",
  [QueryStatus.FULL_SENT]: "fsent", [QueryStatus.REVISE_RESUBMIT]: "rr", [QueryStatus.OFFER]: "offer", [QueryStatus.REJECTED]: "passed", [QueryStatus.NO_RESPONSE]: "noresp", [QueryStatus.WITHDRAWN]: "withdrawn",
};
const FIX: Record<string, FixStep["kind"]> = { queried: "queried", preq: "partial_req", psent: "partial_sent", freq: "full_req", fsent: "full_sent", rr: "rr_req", offer: "offer", passed: "pass", noresp: "noresp", withdrawn: "withdrawn" };
const fixKind = (x: ThreadStepIn): FixStep["kind"] => (x.kind === "nudge" ? "nudge" : x.kind === "told" ? "told" : FIX[T[x.status ?? ""] ?? "queried"] ?? "queried");
const logOf = (xs: readonly ThreadStepIn[]): LogStep[] => xs.flatMap((x) => {
  const t = x.kind === "nudge" ? "nudge" : x.kind === "told" ? "told" : x.status ? T[x.status] : undefined;
  return t && x.ms != null && x.activityId ? [{ id: x.activityId, t, d: x.ms }] : [];
});
const asMats = (labels: string[]): StepMaterial[] => labels.map((l) => {
  const m = readMat(l);
  return m.kind === "sample" ? { kind: "sample" as const, unit: m.unit, n: m.n } : m.kind === "other" ? { kind: "other" as const, text: l } : { kind: m.kind };
});

export interface StepEditSheetProps {
  q: Query; ag: Agent | null; ms: Manuscript | null;
  steps: readonly ThreadStepIn[];
  /** the query's log entries by id (lib buildCardView `evStore`) */
  evStore: Map<string, Record<string, unknown>>;
  activityId: string;
  first: string;
  nowMs: number;
  quietWeeks: number;
  onClose: () => void;
}

export const StepEditSheet: React.FC<StepEditSheetProps> = ({ q, ag, ms, steps, evStore, activityId, first, nowMs, quietWeeks, onClose }) => {
  const db = useScriptAllyDb();
  const uid = db.currentUser?.id ?? "";
  const ed = steps.find((x) => x.activityId === activityId) ?? null;
  const env: MatEnv = useMemo(() => ({
    free: !packagesUnlocked(db.entitlement),
    versions: bookVersionsOf(ms).filter((v) => !(v as { archived?: boolean }).archived)
      .map((v) => ({ id: v.id, name: v.name, madeMs: new Date(v.createdDate).getTime() })).sort((a, b) => a.madeMs - b.madeMs),
    inUseVersionId: inUseBookVersion(ms, db.packages ?? []),
    letters: db.versions.filter((v) => v.manuscriptId === q.manuscriptId && v.componentType === ComponentType.QUERY_LETTER).map((v) => ({ name: v.versionName })),
    synopses: db.versions.filter((v) => v.manuscriptId === q.manuscriptId && v.componentType === ComponentType.SYNOPSIS).map((v) => ({ name: v.versionName })),
  }), [db.entitlement, ms, db.packages, db.versions, q.manuscriptId]);
  const [root, setRoot] = React.useState<HTMLElement | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  if (!ed || !ed.activityId) return null;
  const dated = steps.filter((x) => x.ms != null && !x.kind);
  const i = dated.indexOf(ed);
  const deps = dependents(logOf(steps), ed.activityId, { nowMs, first });
  const depName = (d: LogStep) => { const s0 = steps.find((x) => x.activityId === d.id); return s0 ? stepTitle152(s0, first) : STEP_LABEL[d.t]; };
  const gone = new Set([ed.activityId, ...deps.map((d) => d.id)]);
  const rest = orderSteps152(steps.filter((x) => !x.kind && x.status && !gone.has(x.activityId ?? ""))).pop();
  const backTo = rest?.status ? STAGE_NAME[rest.status] ?? null : null;
  const deleteText0 = `Delete this step? ${deps.length ? `${deps.map((d) => depName(d)).join(", ")} ${deps.length === 1 ? "depends" : "depend"} on it, so ${deps.length === 1 ? "it goes" : "they go"} too. ` : ""}${backTo ? `${first}’s card goes back to ${backTo}.` : ""}`;
  const deleteText = ed.kind === "reply" ? `Delete this step? ${first}’s card stays at ${STAGE_NAME[q.status as QueryStatus] ?? q.status}.` : deleteText0;
  const ev = evStore.get(ed.activityId) as { replyNote?: unknown; materials?: unknown } | undefined;
  const words0 = typeof ev?.replyNote === "string" ? String(ev.replyNote) : (ed.quote ?? "");
  const stored = Array.isArray(ev?.materials) && ev!.materials.length && typeof (ev!.materials as unknown[])[0] === "object" ? (ev!.materials as StepMaterial[]).map((x) => ({ ...x })) : null;
  const isQueryStep = ed.status === QueryStatus.QUERIED && !ed.kind;
  const pkgList = env.free ? null : (db.packages ?? []).filter((k) => k.manuscriptId === q.manuscriptId).map((k) => ({ id: k.id, name: k.packageName }));
  const done = (snap: Snapshot, msg: string) => { onClose(); showV3Snack({ msg, undo: async () => { await restoreSnapshot(snap); } }); };
  const fail = () => { showV3Snack({ msg: "Couldn't save that. Nothing was changed." }); return false; };

  return (
    <div className="pqs-ed" data-pqs="step-edit" data-id={ed.activityId}>
      <div className="pqs-dim on" onClick={onClose} />
      <div className="pqs-sheet pqs-edsheet" role="dialog" aria-modal="true" aria-label="Edit this step" ref={setRoot}>
        <div className="pqs-grab"><i /></div>
        <PopCtx.Provider value={{ root, open, setOpen }}>
          <div className="qc152 pqs-desk pqs-edbody">
            <QcStepEdit1522 id={ed.activityId} onReopen={() => {}} side={side152(ed)} status={ed.status} kind={ed.kind} title={stepTitle152(ed, first)} ms={ed.ms ?? new Date(nowMs).setHours(0, 0, 0, 0)}
              mats={stored ?? (ed.status === QueryStatus.QUERIED ? asMats(ed.chips.map((c) => c.label)) : [])}
              request={ed.status === QueryStatus.PARTIAL_REQUESTED || ed.status === QueryStatus.FULL_REQUESTED || ed.status === QueryStatus.REVISE_RESUBMIT}
              words={words0} first={first} env={env} nowMs={nowMs} floorMs={i > 0 ? dated[i - 1].ms : null} ceilMs={i >= 0 && i < dated.length - 1 ? dated[i + 1].ms : null}
              deleteText={deleteText} busy={false}
              reply={ed.kind === "reply" && ed.reply ? { kind: ed.reply.kind, dateMs: ed.reply.dateMs, withYou: ed.reply.withYou } : null}
              how={isQueryStep ? { value: q.sendMethod ?? null, options: EDIT_METHODS } : null}
              pkg={isQueryStep && pkgList ? { value: (q as { packageId?: string | null }).packageId ?? null, options: pkgList } : null}
              onCancel={onClose}
              onSave={async (v) => {
                try {
                  if (ed.kind === "reply") {
                    const snap = await takeSnapshot(uid, [q.id]);
                    const moved = ed.ms == null || new Date(ed.ms).setHours(0, 0, 0, 0) !== v.dayMs;
                    await db.editActivity(q.id, ed.activityId!, { ...(moved ? { date: new Date(new Date(v.dayMs).setHours(12, 0, 0, 0)).toISOString() } : {}), reply: { words: v.words || null, ...(v.reply ? { kind: v.reply.kind, date: v.reply.date } : {}) } } as never);
                    done(snap, "Saved that step");
                    return true;
                  }
                  const [existing, feed] = await Promise.all([readLog(uid, q.id), readFeed(uid, q.id)]);
                  const plan = planStepEdit({ uid, q, agent: ag, ms, existing, feed, nowMs: Date.now(), quietWeeks },
                    { id: ed.activityId!, kind: fixKind(ed), dayMs: v.dayMs, materials: v.mats }, side152(ed) === "them" ? v.words : null);
                  if (isQueryStep && (v.how !== undefined || v.pkgId !== undefined)) {
                    const k = v.pkgId ? (db.packages ?? []).find((x) => x.id === v.pkgId) : null;
                    const dp = planDetails1522(q, { agentId: q.agentId, method: v.how ?? q.sendMethod ?? "",
                      pkg: k ? { id: k.id, name: k.packageName, edition: k.edition ?? 1 } : null, pkgChanged: !!pkgList && v.pkgId !== undefined && (v.pkgId ?? null) !== ((q as { packageId?: string | null }).packageId ?? null) });
                    plan.query = { ...plan.query, ...dp.query };
                  }
                  done(await commitPlan(uid, plan), "Saved that step");
                  return true;
                } catch { return fail(); }
              }}
              onDelete={async () => {
                try {
                  if (ed.kind === "reply") {
                    const snap = await takeSnapshot(uid, [q.id]);
                    await db.deleteActivity(ed.activityId!);
                    done(snap, "Step deleted");
                    return true;
                  }
                  const [existing, feed] = await Promise.all([readLog(uid, q.id), readFeed(uid, q.id)]);
                  const marked = db.queries.filter((x) => x.offerRefQueryId === q.id).map((x) => x.id);
                  const plan = planFix({ uid, q, agent: ag, ms, existing, feed, nowMs: Date.now(), quietWeeks, marked }, [], [ed.activityId!, ...deps.map((d) => d.id)], null);
                  done(await commitPlan(uid, plan, undefined, marked), deps.length ? `${deps.length + 1} steps deleted` : "Step deleted");
                  return true;
                } catch { return fail(); }
              }} />
          </div>
        </PopCtx.Provider>
      </div>
    </div>
  );
};
