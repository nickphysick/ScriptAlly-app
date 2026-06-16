/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MaterialsField — wraps the shared MaterialsEditor and adds the "attach a package" alternative,
 * for the query-log form's "Materials sent" area (create + edit). Free text and an attached package
 * are mutually exclusive in the UI; persistence of exactly one source of truth is the parent form's
 * job on save (write packageId + clear materialsWanted when attached; write materialsWanted + clear
 * packageId otherwise). This component keeps both in parent state for instant toggling and never
 * forces a choice — the free path is the untouched MaterialsEditor plus one ignorable link.
 *
 * STEP (a) of the query-log integration: the component + Free/Pro states only. Wiring into the three
 * save paths (LogQueryFocusForm / Queries.tsx edit / Queries.tsx inline log) is step (b).
 *
 * Reuses: MaterialsEditor (the editor), MountPanel (the clipping card, for the pink-band explainer),
 * BrandDropdown (the package picker), and the existing Query.packageId link. isPro is the single
 * entitlement source (currentUser.plan === UserPlan.PRO). No billing/enforcement here.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../lib/db";
import { ComponentType, QueryMaterial, SubmissionPackage, UserPlan } from "../types";
import { MaterialsEditor } from "./MaterialsEditor";
import { MountPanel } from "./MountPanel";
import { BrandDropdown } from "./forms";
import {
  pinkBandGradient,
  pinkBandRule,
  burgundy,
  headingInk,
  bodyInk,
  mutedInk,
  buttonPinkBg,
  buttonPinkBorder,
  ghostButtonBorder,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import { Lock, Package, Mail, FileText, BookOpen, Check } from "lucide-react";

const AMBER = "#b98a4e";
const SAGE = "#5a6e58";
const SAGE_TICK = "#8a9e88";

const COMP_META: Record<string, { Icon: React.ComponentType<any>; color: string }> = {
  [ComponentType.QUERY_LETTER]: { Icon: Mail, color: burgundy },
  [ComponentType.SYNOPSIS]: { Icon: FileText, color: SAGE },
  [ComponentType.SAMPLE_PAGES]: { Icon: BookOpen, color: AMBER },
};

/** A component chip (icon + version name) for the attached-package summary. */
const Chip: React.FC<{ kind: ComponentType; label: string }> = ({ kind, label }) => {
  const m = COMP_META[kind];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%", fontFamily: FONT_SANS, fontSize: 11, color: "#5a4a40", background: "#f3ece2", border: "1px solid #e4d8ca", borderRadius: 7, padding: "4px 9px" }}>
      <m.Icon style={{ width: 11, height: 11, color: m.color, flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
};

/** Free-user explainer — a centred pink-band MountPanel over a scrim. Honest, no dead controls. */
const ExplainerPopover: React.FC<{ onUpgrade: () => void; onClose: () => void }> = ({ onUpgrade, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const benefits = [
    "See which combination wins the most requests",
    "Learn which letter or synopsis is doing the work",
    "Let the analytics build themselves from your queries",
  ];
  return createPortal(
    <div role="presentation" onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(58,28,20,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="mf-pop-title" onMouseDown={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
        <MountPanel>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: pinkBandGradient, borderBottom: `1px solid ${pinkBandRule}` }}>
            <span aria-hidden="true" style={{ width: 3, height: 22, borderRadius: 2, background: burgundy, flexShrink: 0, display: "inline-block" }} />
            <span id="mf-pop-title" style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk }}>Submission packages</span>
          </div>
          <div style={{ padding: "18px 22px 22px" }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: "#4a3e34", lineHeight: 1.55, margin: "0 0 13px" }}>
              Instead of typing what you sent, attach a <b style={{ color: burgundy, fontWeight: 500 }}>package</b> — a reusable combination of a query letter, synopsis and sample pages.
            </p>
            <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {benefits.map((b) => (
                <li key={b} style={{ display: "flex", gap: 9, fontFamily: FONT_SANS, fontSize: 12.5, color: "#4a3e34", lineHeight: 1.4 }}>
                  <Check style={{ width: 14, height: 14, color: SAGE_TICK, flexShrink: 0, marginTop: 2 }} strokeWidth={2.4} aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={onUpgrade} style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", fontFamily: FONT_MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: burgundy, background: buttonPinkBg, border: `1px solid ${buttonPinkBorder}`, borderRadius: 10, padding: 12, cursor: "pointer" }}>
                Upgrade to Pro
              </button>
              <button onClick={onClose} style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9c8878", background: "#fff", border: `1px solid ${ghostButtonBorder}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer" }}>
                Not now
              </button>
            </div>
          </div>
        </MountPanel>
      </div>
    </div>,
    document.body,
  );
};

export interface MaterialsFieldProps {
  /** Free-text materials (the structured editor value) — held in parent state. */
  materials: (string | QueryMaterial)[];
  onMaterialsChange: (next: (string | QueryMaterial)[]) => void;
  /** The package link — "" when none. Held in parent state; persisted (exclusive of materials) on save. */
  packageId: string;
  onPackageChange: (id: string) => void;
  /** Packages are per-manuscript; the picker lists this manuscript's active packages. */
  manuscriptId: string;
  /** Pass-throughs to the underlying MaterialsEditor. */
  palette?: string[];
  quantifiable?: string[];
  allowCustom?: boolean;
  /** Routing for "Upgrade to Pro" + the empty-state "create one" link. */
  onNavigate?: (tab: string, subPageName?: string) => void;
}

const linkBase: React.CSSProperties = {
  marginTop: 9,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontFamily: FONT_MONO,
  fontSize: 10.5,
  letterSpacing: "0.03em",
  background: "transparent",
  border: "none",
  padding: "2px 0",
  cursor: "pointer",
};

export const MaterialsField: React.FC<MaterialsFieldProps> = ({
  materials,
  onMaterialsChange,
  packageId,
  onPackageChange,
  manuscriptId,
  palette,
  quantifiable,
  allowCustom,
  onNavigate,
}) => {
  const { currentUser, packages, versions } = useScriptAllyDb();
  const isPro = currentUser?.plan === UserPlan.PRO;
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const msPackages = packages.filter((p) => p.manuscriptId === manuscriptId && p.status !== "Retired");
  // Resolve across this manuscript's packages (retired included, so an attached-then-retired package
  // still shows); a stale id from a different manuscript won't resolve → graceful degrade.
  const attached: SubmissionPackage | undefined = packageId ? packages.find((p) => p.id === packageId && p.manuscriptId === manuscriptId) : undefined;
  const verName = (id: string) => versions.find((v) => v.id === id)?.versionName ?? null;

  // ── Attached state: chip summary + free-text escape ──────────────────────────
  if (packageId && attached) {
    const chips: { kind: ComponentType; id: string }[] = [
      { kind: ComponentType.QUERY_LETTER, id: attached.queryLetterVersionId },
      { kind: ComponentType.SYNOPSIS, id: attached.synopsisVersionId },
      { kind: ComponentType.SAMPLE_PAGES, id: attached.samplePagesVersionId },
    ];
    return (
      <div style={{ background: "#fbf6ef", border: `1px solid ${ghostButtonBorder}`, borderRadius: 11, padding: "12px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: headingInk, minWidth: 0 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attached.packageName}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a6a2e", background: "#f3e6cf", borderRadius: 20, padding: "2px 7px", flexShrink: 0 }}>attached</span>
          </span>
          <button onClick={() => { setPicking(false); onPackageChange(""); }} style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: "#9c8878", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
            Use free text instead
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chips.map((c) => <Chip key={c.kind} kind={c.kind} label={verName(c.id) ?? "—"} />)}
        </div>
      </div>
    );
  }

  // ── No package (or an unresolvable reference): the untouched editor + the attach affordance ──
  return (
    <div>
      {packageId && !attached && (
        <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: AMBER, marginBottom: 8 }}>
          The attached package is unavailable — showing free text. <button onClick={() => onPackageChange("")} style={{ ...linkBase, marginTop: 0, color: burgundy, display: "inline" }}>Clear</button>
        </div>
      )}

      <MaterialsEditor value={materials} onChange={onMaterialsChange} palette={palette} quantifiable={quantifiable} allowCustom={allowCustom} />

      <div>
        {!isPro ? (
          <button onClick={() => setExplainerOpen(true)} style={{ ...linkBase, color: "#9c8878" }}>
            <Lock style={{ width: 12, height: 12, color: AMBER }} strokeWidth={2.2} aria-hidden="true" /> Attach a package · Pro
          </button>
        ) : picking ? (
          msPackages.length === 0 ? (
            <div style={{ marginTop: 9, fontFamily: FONT_SANS, fontSize: 12.5, color: mutedInk }}>
              No packages on this manuscript yet.{onNavigate ? (
                <>
                  {" "}
                  <button onClick={() => onNavigate("manuscripts", "Submission packages")} style={{ ...linkBase, marginTop: 0, color: burgundy, display: "inline", fontFamily: FONT_SANS, fontSize: 12.5, letterSpacing: 0, textDecoration: "underline" }}>
                    Create one in Submission Packages
                  </button>.
                </>
              ) : " Create one on the Submission Packages page."}
            </div>
          ) : (
            <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <BrandDropdown
                  value=""
                  placeholder="Choose a package…"
                  options={msPackages.map((p) => ({ value: p.id, label: p.packageName }))}
                  onChange={(id) => { if (id) { onPackageChange(id); setPicking(false); } }}
                />
              </div>
              <button onClick={() => setPicking(false)} style={{ ...linkBase, marginTop: 0, color: "#9c8878" }}>Cancel</button>
            </div>
          )
        ) : (
          <button onClick={() => setPicking(true)} style={{ ...linkBase, color: burgundy }}>
            <Package style={{ width: 12, height: 12, color: burgundy }} strokeWidth={2.2} aria-hidden="true" /> Attach a package
          </button>
        )}
      </div>

      {explainerOpen && (
        <ExplainerPopover
          onClose={() => setExplainerOpen(false)}
          onUpgrade={() => { setExplainerOpen(false); onNavigate?.("plans"); }}
        />
      )}
    </div>
  );
};
