/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The doors to the phone material editor (11A) and package flow (12A): `/manuscripts?edit=<materialId>`,
 * `/manuscripts?newpackage=1` and `/manuscripts?copy=<packageId>`, below 768px. Mounted by App.tsx.
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
import { PhonePackageFlow } from "./PhonePackageFlow";
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
  let body: React.ReactNode = null;
  if (edit) {
    const m = model.matById("letter", edit) ?? model.matById("synopsis", edit);
    if (!m) return null;
    body = <PhoneLetterEditor model={model} m={m} kind={m.kind === "synopsis" ? "synopsis" : "letter"} onDone={close} />;
  } else {
    body = <PhonePackageFlow model={model} copyOf={copy} onDone={close} />;
  }
  return createPortal(body, document.body);
}
