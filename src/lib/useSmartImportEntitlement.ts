/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * React hook over the pure entitlement selector — reads the current user and returns Smart Import
 * entitlement state. Kept separate from smartImportEntitlement.ts so the pure logic stays free of
 * the db/firebase import graph (and unit-testable in node). The funnel surfaces (confirm step,
 * dashboard credit card, redemption) consume this.
 */
import { useScriptAllyDb } from "./db";
import { getSmartImportEntitlement, SmartImportEntitlement } from "./smartImportEntitlement";

export function useSmartImportEntitlement(): SmartImportEntitlement {
  const { currentUser, smartImportUsage } = useScriptAllyDb();
  return getSmartImportEntitlement(currentUser?.plan, smartImportUsage);
}
