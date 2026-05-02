#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const pg = require('pg');

const { Pool } = pg;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sqlPath = path.join(process.cwd(), 'migrations', '20260321__db_hardening_and_maintenance.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing migration file: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(sql);
    console.log('Applied: 20260321__db_hardening_and_maintenance.sql');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
