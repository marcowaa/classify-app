#!/usr/bin/env node

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const APPLY = process.argv.includes("--apply");
const PREFIX_OLD = "/objects/private/";
const PREFIX_NEW = "/objects/";

function normalizeObjectUrl(value) {
  if (typeof value !== "string") return value;
  if (value.startsWith(PREFIX_OLD)) {
    return `${PREFIX_NEW}${value.slice(PREFIX_OLD.length)}`;
  }
  return value;
}

function normalizeJson(value) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const normalized = normalizeJson(item);
      if (normalized !== item) changed = true;
      return normalized;
    });
    return changed ? next : value;
  }

  if (value && typeof value === "object") {
    let changed = false;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = normalizeJson(item);
      if (normalized !== item) changed = true;
      next[key] = normalized;
    }
    return changed ? next : value;
  }

  return normalizeObjectUrl(value);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  const report = [];

  try {
    await client.query("BEGIN");

    const existingColumns = new Set();
    const { rows: columnRows } = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    for (const row of columnRows) {
      existingColumns.add(`${row.table_name}.${row.column_name}`);
    }

    const textColumns = [
      ["media", "url"],
      ["schools", "image_url"],
      ["schools", "cover_image_url"],
      ["school_teachers", "avatar_url"],
      ["school_teachers", "cover_image_url"],
      ["parents", "avatar_url"],
      ["parents", "cover_image_url"],
      ["children", "avatar_url"],
      ["teacher_tasks", "image_url"],
      ["teacher_tasks", "gif_url"],
      ["teacher_tasks", "video_url"],
      ["teacher_tasks", "cover_image_url"],
      ["tasks", "image_url"],
      ["tasks", "gif_url"],
    ];

    for (const [table, column] of textColumns) {
      if (!existingColumns.has(`${table}.${column}`)) {
        report.push(`${table}.${column}: skipped (missing)`);
        continue;
      }

      const sql = `
        UPDATE ${table}
        SET ${column} = regexp_replace(${column}, '^/objects/private/', '/objects/')
        WHERE ${column} LIKE '/objects/private/%'
      `;
      const result = await client.query(sql);
      report.push(`${table}.${column}: ${result.rowCount}`);
    }

    const jsonColumns = [
      ["school_posts", "media_urls", "id"],
      ["teacher_tasks", "question_images", "id"],
      ["teacher_tasks", "answers", "id"],
      ["tasks", "answers", "id"],
    ];

    for (const [table, column, idColumn] of jsonColumns) {
      if (!existingColumns.has(`${table}.${column}`) || !existingColumns.has(`${table}.${idColumn}`)) {
        report.push(`${table}.${column}: skipped (missing)`);
        continue;
      }

      const { rows } = await client.query(
        `SELECT ${idColumn} AS id, ${column} FROM ${table} WHERE ${column} IS NOT NULL`
      );

      let changedCount = 0;
      for (const row of rows) {
        const current = row[column];
        const normalized = normalizeJson(current);
        if (normalized !== current) {
          changedCount += 1;
          if (APPLY) {
            await client.query(
              `UPDATE ${table} SET ${column} = $1::jsonb WHERE ${idColumn} = $2`,
              [JSON.stringify(normalized), row.id]
            );
          }
        }
      }

      report.push(`${table}.${column}: ${changedCount}`);
    }

    if (APPLY) {
      await client.query("COMMIT");
      console.log("✅ Object URL repair applied successfully");
    } else {
      await client.query("ROLLBACK");
      console.log("ℹ️ Dry run complete (no changes applied)");
    }

    console.log("\nAffected records:");
    for (const line of report) {
      console.log(`- ${line}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("❌ Failed to repair object URLs:", error?.message || error);
  process.exit(1);
});
