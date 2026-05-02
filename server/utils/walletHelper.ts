import { storage } from "../storage";
import { wallets, walletTransfers } from "../../shared/schema";
import { eq } from "drizzle-orm";

const db = storage.db;

/**
 * Ensure a wallet exists for the given parent (Phase 2 wallets table).
 * If no wallet exists, creates one with zero balance.
 * Shared utility to avoid duplication across payment and parent routes.
 */
export async function ensureWallet(parentId: string) {
  const existing = await db.select().from(wallets).where(eq(wallets.parentId, parentId));
  if (existing[0]) return existing[0];
  const created = await db
    .insert(wallets)
    .values({ parentId, balance: "0", currency: "USD", status: "active" })
    .returning();
  return created[0];
}

/**
 * Recalculate wallet balance from all wallet transfers.
 * Used after deposits, refunds, and spending operations.
 */
export async function recalcWalletBalance(walletId: string) {
  const transfers = await db.select().from(walletTransfers).where(eq(walletTransfers.walletId, walletId));
  const total = transfers.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  await db.update(wallets).set({ balance: total.toString() }).where(eq(wallets.id, walletId));
}
