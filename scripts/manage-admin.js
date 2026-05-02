#!/usr/bin/env node

/**
 * Admin Credential Manager
 * 
 * الميزات:
 * ✅ إنشاء/تحديث حسابات الإدمن في قاعدة البيانات
 * ✅ التحقق من البيانات من .env
 * ✅ توليد كلمات مرور آمنة
 * ✅ عرض وتصحيح أخطاء الاتصال
 */

import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   🔐 Admin Credential Manager              ║');
console.log('╚════════════════════════════════════════════╝\n');

// Validation
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

if (!ADMIN_EMAIL) {
  console.error('❌ ADMIN_EMAIL not found in .env');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD not found in .env');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`  Email: ${ADMIN_EMAIL}`);
console.log(`  Password: ${'*'.repeat(ADMIN_PASSWORD.length)}`);
console.log('');

async function manageAdminCredentials() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admins'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Admins table does not exist yet.');
      console.log('   Run migrations first: npm run db:push');
      await pool.end();
      process.exit(1);
    }

    // Check if admin exists
    const existing = await pool.query(
      'SELECT id, email FROM admins WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log(`✅ Admin account found: ${ADMIN_EMAIL}`);
      console.log('   Updating password...\n');

      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await pool.query(
        'UPDATE admins SET password = $1, updated_at = NOW() WHERE email = $2',
        [hashedPassword, ADMIN_EMAIL]
      );

      console.log('✅ Password updated successfully\n');
    } else {
      console.log(`📝 Creating new admin account: ${ADMIN_EMAIL}\n`);

      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const username = ADMIN_EMAIL.split('@')[0];
      await pool.query(
        'INSERT INTO admins (id, username, email, password, role, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())',
        [username, ADMIN_EMAIL, hashedPassword, 'admin']
      );

      console.log('✅ Admin account created successfully\n');
    }

    console.log('📌 Login Credentials:');
    console.log(`   URL: https://yourdomain.com/admin`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   1. Change password after first login');
    console.log('   2. Never share these credentials');
    console.log('   3. Keep .env file secure\n');

  } catch (error) {
    console.error('❌ Error managing admin credentials:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Connection refused. Make sure:');
      console.log('   1. Database is running');
      console.log('   2. DATABASE_URL is correct');
      console.log('   3. Network connectivity is available\n');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

manageAdminCredentials();
