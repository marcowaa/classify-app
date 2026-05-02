import { eq, sql } from "drizzle-orm";
import { childAssignedProducts, children, pointsLedger } from "../../shared/schema";
import { monitorChildPoints } from "./riskMonitor";

export type PointsLedgerReason =
  | "TASK_COMPLETED"
  | "GAME_COMPLETED"
  | "AD_WATCH_COMPLETED"
  | "PURCHASE_DEBIT"
  | "TEMPLATE_TASK_PURCHASE"
  | "TEMPLATE_TASK_SALE"
  | "ADMIN_ADJUSTMENT";

export interface PointsDeltaParams {
  childId: string;
  delta: number;
  reason: PointsLedgerReason;
  taskId?: string | null;
  requestId?: string | null;
  minBalance?: number;
  clampToMinBalance?: boolean;
}

export interface PointsDeltaResult {
  newTotalPoints: number;
  childName: string | null;
}

export async function applyPointsDelta(tx: any, params: PointsDeltaParams): Promise<PointsDeltaResult> {
  const { childId, delta, reason, taskId, requestId, minBalance, clampToMinBalance } = params;

  const locked = await tx.execute(sql`
    SELECT id, name, total_points
    FROM children
    WHERE id = ${childId}
    FOR UPDATE
  `);

  const row = locked.rows?.[0];
  if (!row) {
    throw new Error("Child not found");
  }

  const currentTotal = Number(row.total_points ?? 0);
  let newTotalPoints = currentTotal + delta;

  if (minBalance !== undefined && newTotalPoints < minBalance) {
    if (!clampToMinBalance) {
      throw new Error("INSUFFICIENT_POINTS");
    }
    newTotalPoints = minBalance;
  }

  const actualDelta = newTotalPoints - currentTotal;
  if (actualDelta === 0) {
    return {
      newTotalPoints,
      childName: row.name ?? null,
    };
  }

  await tx.insert(pointsLedger).values({
    childId,
    taskId: taskId ?? null,
    pointsDelta: actualDelta,
    balanceAfter: newTotalPoints,
    reason,
    requestId: requestId ?? null,
  });

  await tx.execute(sql`SELECT set_config('app.points_update', 'ledger', true)`);

  await tx
    .update(children)
    .set({ totalPoints: newTotalPoints })
    .where(eq(children.id, childId));

  await tx
    .update(childAssignedProducts)
    .set({
      progressPoints: sql`GREATEST(0, LEAST(${childAssignedProducts.requiredPoints}, ${newTotalPoints}))`,
    })
    .where(eq(childAssignedProducts.childId, childId));

  // Non-blocking risk signal check for unusual points earning/spending patterns.
  void monitorChildPoints({ childId, delta: actualDelta, reason, requestId: requestId ?? null }).catch((error: any) => {
    console.error("Risk monitor (points) failed:", error?.message || error);
  });

  return {
    newTotalPoints,
    childName: row.name ?? null,
  };
}
