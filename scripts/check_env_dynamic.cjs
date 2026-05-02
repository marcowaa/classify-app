#!/usr/bin/env node
/* Cross-platform prestart env check for local/dev machines. */
const fs = require('node:fs');
const path = require('node:path');

try {
  const dotenv = require('dotenv');
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
} catch {
  // dotenv is optional in this check script.
}

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());

console.log('Environment check (dynamic):');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- PORT: ${process.env.PORT || 'not set'}`);
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'missing'}`);
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? 'set' : 'missing'}`);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Env check passed.');
process.exit(0);
