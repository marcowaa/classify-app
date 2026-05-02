#!/usr/bin/env node
/*
  Deep DB audit for Classify:
  - compares expected tables from shared/schema.ts vs live DB
  - reports expired/security hygiene counts
  - detects foreign keys that are missing left-prefix indexes
*/

const fs = require('node:fs');
const path = require('node:path');
const pg = require('pg');

const { Pool } = pg;

function parseExpectedTables(schemaText) {
  const names = new Set();
  const re = /pgTable\("([a-zA-Z0-9_]+)"/g;
  let m;
  while ((m = re.exec(schemaText)) !== null) {
    names.add(m[1]);
  }
  return [...names].sort();
}

function toMap(rows, key) {
  const out = new Map();
  for (const r of rows) out.set(r[key], r);
  return out;
}

async function main() {
  const cwd = process.cwd();
  const schemaPath = path.join(cwd, 'shared', 'schema.ts');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(2);
  }

  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema not found: ${schemaPath}`);
    process.exit(2);
  }

  const schemaText = fs.readFileSync(schemaPath, 'utf8');
  const expectedTables = parseExpectedTables(schemaText);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const liveTablesRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const liveTables = liveTablesRes.rows.map((r) => r.tablename);

    const expectedSet = new Set(expectedTables);
    const liveSet = new Set(liveTables);

    const missingTables = expectedTables.filter((t) => !liveSet.has(t));

    const internalAllowlist = new Set(['drizzle_migrations']);
    const extraTables = liveTables.filter((t) => !expectedSet.has(t) && !internalAllowlist.has(t));

    const fkWithoutPrefixIndexRes = await client.query(`
      WITH fk AS (
        SELECT
          c.conname,
          t.relname AS table_name,
          c.conrelid,
          c.conkey,
          array_length(c.conkey, 1) AS fk_len
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.contype = 'f' AND n.nspname = 'public'
      ), idx AS (
        SELECT
          i.indrelid,
          i.indkey,
          i.indisvalid,
          i.indisready
        FROM pg_index i
      )
      SELECT fk.conname, fk.table_name
      FROM fk
      WHERE NOT EXISTS (
        SELECT 1
        FROM idx
        WHERE idx.indrelid = fk.conrelid
          AND idx.indisvalid
          AND idx.indisready
          AND idx.indkey[0:fk.fk_len-1] = fk.conkey
      )
      ORDER BY fk.table_name, fk.conname
    `);

    const healthQueries = [
      {
        key: 'active_expired_parent_sessions',
        sql: `SELECT COUNT(*)::int AS count FROM sessions WHERE is_active = true AND expires_at < now()`
      },
      {
        key: 'active_expired_parent_trusted_devices',
        sql: `SELECT COUNT(*)::int AS count FROM trusted_devices WHERE revoked_at IS NULL AND expires_at < now()`
      },
      {
        key: 'active_expired_child_trusted_devices',
        sql: `SELECT COUNT(*)::int AS count FROM child_trusted_devices WHERE revoked_at IS NULL AND expires_at < now()`
      },
      {
        key: 'expired_pending_child_login_requests',
        sql: `SELECT COUNT(*)::int AS count FROM child_login_requests WHERE status = 'pending' AND expires_at < now()`
      },
      {
        key: 'expired_pending_otp_codes',
        sql: `SELECT COUNT(*)::int AS count FROM otp_codes WHERE status = 'pending' AND expires_at < now()`
      }
    ];

    const health = {};
    for (const q of healthQueries) {
      const res = await client.query(q.sql);
      health[q.key] = res.rows[0]?.count ?? 0;
    }

    const constraintRes = await client.query(`
      SELECT conname
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
        AND conname IN (
          'child_login_requests_status_valid',
          'parent_link_requests_status_valid',
          'parent_parent_sync_status_valid',
          'sessions_expires_after_created',
          'otp_codes_attempts_non_negative'
        )
      ORDER BY conname
    `);

    const requiredConstraints = [
      'child_login_requests_status_valid',
      'parent_link_requests_status_valid',
      'parent_parent_sync_status_valid',
      'sessions_expires_after_created',
      'otp_codes_attempts_non_negative'
    ];

    const presentConstraints = new Set(constraintRes.rows.map((r) => r.conname));
    const missingConstraints = requiredConstraints.filter((c) => !presentConstraints.has(c));

    const report = {
      generatedAt: new Date().toISOString(),
      expectedTableCount: expectedTables.length,
      liveTableCount: liveTables.length,
      missingTables,
      extraTables,
      fkWithoutPrefixIndexCount: fkWithoutPrefixIndexRes.rowCount,
      fkWithoutPrefixIndex: fkWithoutPrefixIndexRes.rows,
      missingHardeningConstraints: missingConstraints,
      hygiene: health,
      recommendations: [
        missingTables.length ? 'Run pending migrations to create missing tables.' : null,
        fkWithoutPrefixIndexRes.rowCount ? 'Add indexes for foreign keys missing left-prefix indexes.' : null,
        missingConstraints.length ? 'Apply migration 20260321__db_hardening_and_maintenance.sql.' : null,
        Number(health.active_expired_parent_sessions) > 0 ? 'Purge or deactivate expired active sessions.' : null,
        Number(health.expired_pending_otp_codes) > 0 ? 'Expire pending OTP rows via periodic cleanup worker.' : null
      ].filter(Boolean)
    };

    const outDir = path.join(cwd, 'DataAnalysisExpert');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outPath = path.join(outDir, 'db-audit-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(JSON.stringify(report, null, 2));
    console.log(`\nReport written to: ${outPath}`);

    const hasCritical = missingTables.length > 0 || fkWithoutPrefixIndexRes.rowCount > 0;
    process.exit(hasCritical ? 1 : 0);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
