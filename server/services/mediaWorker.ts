import { inArray, sql } from "drizzle-orm";
import { storage } from "../storage";
import { media, mediaEvents } from "../../shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "../replit_integrations/object_storage/objectStorage";

const db = storage.db;
const objectStorageService = new ObjectStorageService();

const GRACE_HOURS = Number(process.env.MEDIA_ORPHAN_GRACE_HOURS || "24");
const PURGE_DAYS = Number(process.env.MEDIA_PURGE_DAYS || "7");
const INTERVAL_MS = Number(process.env.MEDIA_CLEANUP_INTERVAL_MS || String(15 * 60 * 1000));
const ENABLED = process.env.MEDIA_CLEANUP_ENABLED !== "false";
const ADVISORY_LOCK_KEY = BigInt(928371);

async function tryAcquireLock(): Promise<boolean> {
  const result = await db.execute(sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) as locked;`);
  const row: any = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
  return !!(row?.locked || row?.pg_try_advisory_lock);
}

async function releaseLock() {
  await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY});`);
}

type OrphanRow = { id: string; object_key: string };

async function findOrphans(): Promise<OrphanRow[]> {
  const graceInterval = sql.raw(`INTERVAL '${GRACE_HOURS} hours'`);
  const res = await db.execute(sql`
    SELECT id, object_key
    FROM media m
    WHERE m.deleted_at IS NULL
      AND m.created_at < (NOW() - ${graceInterval})
      AND NOT EXISTS (
        SELECT 1 FROM media_references r
        WHERE r.media_id = m.id AND r.deleted_at IS NULL
      )
  `);
  return (res as any).rows || [];
}

async function markSoftDeleted(orphanIds: string[]) {
  if (!orphanIds.length) return;
  const purgeAt = new Date(Date.now() + PURGE_DAYS * 24 * 60 * 60 * 1000);
  await db
    .update(media)
    .set({ deletedAt: new Date(), purgeAt })
    .where(inArray(media.id, orphanIds));
  await db.insert(mediaEvents).values(
    orphanIds.map((id) => ({ mediaId: id, action: "SOFT_DELETED", meta: { reason: "orphan" } }))
  );
}

async function purgeExpired() {
  const res = await db.execute(sql`
    SELECT id, object_key
    FROM media
    WHERE deleted_at IS NOT NULL
      AND purge_at IS NOT NULL
      AND purge_at <= NOW()
  `);
  const rows: any[] = (res as any).rows || [];
  for (const row of rows) {
    const objectPath = `/objects/${row.object_key}`;
    try {
      const file = await objectStorageService.getObjectEntityFile(objectPath);
      await file.delete({ ignoreNotFound: true });
    } catch (err) {
      if (!(err instanceof ObjectNotFoundError)) {
        console.error("media purge delete error", err);
      }
    }

    await db.insert(mediaEvents).values({ mediaId: row.id, action: "PURGED", meta: { reason: "expired" } });
    await db.execute(sql`DELETE FROM media WHERE id = ${row.id}`);
  }
}

async function runCleanupCycle() {
  const locked = await tryAcquireLock();
  if (!locked) return;
  try {
    const orphans: OrphanRow[] = await findOrphans();
    if (orphans.length) {
      await markSoftDeleted(orphans.map((o: OrphanRow) => o.id));
    }
    await purgeExpired();
  } finally {
    await releaseLock();
  }
}

async function runCleanupCycleSafe() {
  try {
    await runCleanupCycle();
  } catch (err) {
    console.error("media cleanup error", err);
  }
}

export function startMediaWorker() {
  if (!ENABLED) return;
  runCleanupCycleSafe();
  setInterval(runCleanupCycleSafe, INTERVAL_MS).unref();
}
