/**
 * Seed script: Insert the built-in Math Challenge game into flash_games table.
 * Run: npx tsx scripts/seed-math-game.ts
 * 
 * Uses raw SQL to avoid schema column mismatches.
 */
import pg from "pg";

const { Pool } = pg;

async function seed() {
  if (!process.env.DATABASE_URL) {
    // Try loading from .env
    const fs = await import("fs");
    const envContent = fs.readFileSync(".env", "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^\s*([^#][^=]*)=(.*)\s*$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Check what columns exist
  const { rows: cols } = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'flash_games' ORDER BY ordinal_position
  `);
  console.log("📋 flash_games columns:", cols.map(c => c.column_name).join(", "));

  // Check if game already exists
  const { rows: existing } = await pool.query(
    `SELECT id FROM flash_games WHERE embed_url = $1`,
    ["/games/math-challenge.html"]
  );

  if (existing.length > 0) {
    console.log("✅ Math Challenge game already exists (id:", existing[0].id, ")");
    await pool.end();
    return;
  }

  // Insert using only columns that exist
  const colNames = cols.map(c => c.column_name);
  
  const values: Record<string, any> = {
    title: "تحدي الرياضيات 🧮",
    description: "لعبة رياضيات ممتعة! أجب على 10 أسئلة (جمع، طرح، ضرب) واختر المستوى المناسب. احصل على نقاط مقابل كل إجابة صحيحة!",
    embed_url: "/games/math-challenge.html",
    is_active: true,
  };

  // Only include columns that exist in the table
  if (colNames.includes("points_per_play")) values.points_per_play = 5;
  if (colNames.includes("max_plays_per_day")) values.max_plays_per_day = 10;
  if (colNames.includes("category")) values.category = "math";
  if (colNames.includes("min_age")) values.min_age = 6;
  if (colNames.includes("max_age")) values.max_age = 14;

  const insertCols = Object.keys(values);
  const placeholders = insertCols.map((_, i) => `$${i + 1}`);
  const insertValues = Object.values(values);

  const { rows } = await pool.query(
    `INSERT INTO flash_games (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id, title, embed_url`,
    insertValues
  );

  console.log("✅ Math Challenge game created successfully!");
  console.log("   ID:", rows[0].id);
  console.log("   Title:", rows[0].title);
  console.log("   URL:", rows[0].embed_url);

  await pool.end();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err.message || err);
    process.exit(1);
  });
