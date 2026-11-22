/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The doors to the phone material editor (11A): `/manuscripts?edit=<materialId>`, below 768px. Mounted by App.tsx.
 * Phone round two v1: last screens' package flow (12A) is replaced by the Packages tab's builder, so
 * `?newpackage=1` and `?copy=<packageId>` now land there (`/queries/packages?build=new`, `?pkg=<id>`).
 *
 * ⚠️ THE ROWS' OWN "EDIT" AND "NEW PACKAGE" BUTTONS ARE NOT BUILT. The phone's material rows and package
 * cards are on `ManuscriptPhone.tsx`, a `Manuscript*` file owned by another session, so these are links
 * waiting for those buttons (the report lists the exact change). Closing removes the parameter, so the
 * back gesture returns to the page.
 */
import React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { usePackagesModel } from "../../packages/v4/usePackagesModel";
import { PhoneLetterEditor } from "./PhoneLetterEditor";
import { Navigate } from "react-router-dom";
import "./phoneMaterials.css";

export function PhoneMaterialsHost({ active }: { active: boolean }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const edit = params.get("edit"), newPkg = params.get("newpackage"), copy = params.get("copy");
  if (!active || location.pathname !== "/manuscripts" || !(edit || newPkg || copy)) return null;
  return <Host edit={edit} copy={copy} />;
}

function Host({ edit, copy }: { edit: string | null; copy: string | null }) {
  const model = usePackagesModel();
  const navigate = useNavigate();
  const close = () => navigate(`/manuscripts${window.location.hash}`, { replace: true });
  if (!model.collectionsReady) return null;
  /* Phone round two v1 (5B): THE BUILDER MOVED TO THE PACKAGES TAB. Last screens' step-by-step flow is replaced by the
     builder that shows what an agent receives; its old doors land there — a new package on the builder, a copy on the
     package's own page, which offers "Make a copy". */
  if (!edit) return <Navigate to={copy ? `/queries/packages?pkg=${encodeURIComponent(copy)}` : "/queries/packages?build=new"} replace />;
  const m = model.matById("letter", edit) ?? model.matById("synopsis", edit);
  if (!m) return null;
  return createPortal(<PhoneLetterEditor model={model} m={m} kind={m.kind === "synopsis" ? "synopsis" : "letter"} onDone={close} />, document.body);
}
