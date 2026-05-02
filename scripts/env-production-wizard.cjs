#!/usr/bin/env node
/*
 * Interactive production .env wizard.
 * - Guides user through all major production keys.
 * - Validates values and prevents duplicate keys.
 * - Writes normalized .env file and verifies final integrity.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const ENV_PATH = path.resolve(process.cwd(), '.env');

function parseEnvFile(content) {
  const lines = content.split(/\r?\n/);
  const map = new Map();
  const duplicates = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (map.has(key)) {
      duplicates.add(key);
    }
    map.set(key, value);
  }

  return { map, duplicates: [...duplicates] };
}

function isBooleanLike(v) {
  return v === 'true' || v === 'false';
}

function isIntInRange(v, min, max) {
  if (!/^\d+$/.test(v)) {
    return false;
  }
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max;
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isHex(v, minLen) {
  return /^[0-9a-fA-F]+$/.test(v) && v.length >= minLen;
}

function isUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateDatabaseUrl(v) {
  try {
    const u = new URL(v);
    if (!['postgres:', 'postgresql:'].includes(u.protocol)) {
      return 'DATABASE_URL must start with postgresql:// or postgres://';
    }
    if (!u.hostname || !u.username || !u.pathname || u.pathname === '/') {
      return 'DATABASE_URL must include host, user, and database name.';
    }
    if (u.port && !isIntInRange(u.port, 1, 65535)) {
      return 'DATABASE_URL has invalid port.';
    }
    return null;
  } catch {
    return 'DATABASE_URL is not a valid URL.';
  }
}

function escapeEnvValue(value) {
  if (value === '') {
    return '';
  }
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
    return value;
  }
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function randomHex(chars = 64) {
  const bytes = Math.ceil(chars / 2);
  return crypto.randomBytes(bytes).toString('hex').slice(0, chars);
}

function checkRuntimeRequirements() {
  const issues = [];
  const warnings = [];

  const major = Number(process.versions.node.split('.')[0] || '0');
  if (major < 18) {
    issues.push(`Node.js ${process.versions.node} detected; require Node.js 18+.`);
  }

  if (os.platform() === 'win32' && process.env.SHELL && process.env.SHELL.includes('bash')) {
    warnings.push('Detected mixed shell environment; ensure your deployment shell loads .env correctly.');
  }

  return { issues, warnings };
}

const FIELD_SECTIONS = [
  {
    title: 'Database',
    fields: [
      {
        key: 'POSTGRES_USER',
        required: true,
        validate: (v) => (v ? null : 'POSTGRES_USER is required.'),
      },
      {
        key: 'POSTGRES_PASSWORD',
        required: true,
        secret: true,
        validate: (v) => (v.length >= 12 ? null : 'POSTGRES_PASSWORD should be at least 12 characters.'),
      },
      {
        key: 'POSTGRES_DB',
        required: true,
        validate: (v) => (v ? null : 'POSTGRES_DB is required.'),
      },
      {
        key: 'DATABASE_URL',
        required: true,
        validate: (v) => validateDatabaseUrl(v),
      },
    ],
  },
  {
    title: 'Security',
    fields: [
      {
        key: 'JWT_SECRET',
        required: true,
        secret: true,
        autoGenerate: () => randomHex(64),
        validate: (v) => (isHex(v, 64) ? null : 'JWT_SECRET must be hex and at least 64 chars.'),
      },
      {
        key: 'SESSION_SECRET',
        required: true,
        secret: true,
        autoGenerate: () => randomHex(64),
        validate: (v) => (isHex(v, 64) ? null : 'SESSION_SECRET must be hex and at least 64 chars.'),
      },
      {
        key: 'ADMIN_PANEL_PASSWORD',
        required: true,
        secret: true,
        validate: (v) => (v.length >= 8 ? null : 'ADMIN_PANEL_PASSWORD must be at least 8 chars.'),
      },
      {
        key: 'ADMIN_CREATION_SECRET',
        required: true,
        secret: true,
        autoGenerate: () => randomHex(64),
        validate: (v) => (isHex(v, 64) ? null : 'ADMIN_CREATION_SECRET must be hex and at least 64 chars.'),
      },
      {
        key: 'ADMIN_BYPASS_EMAILS',
        required: false,
        validate: (v) => {
          if (!v) {
            return null;
          }
          const emails = v.split(',').map((e) => e.trim()).filter(Boolean);
          return emails.every((e) => isEmail(e)) ? null : 'ADMIN_BYPASS_EMAILS must be comma-separated valid emails.';
        },
      },
      {
        key: 'ADMIN_EMAIL',
        required: true,
        validate: (v) => (isEmail(v) ? null : 'ADMIN_EMAIL must be a valid email.'),
      },
      {
        key: 'ADMIN_PASSWORD',
        required: true,
        secret: true,
        validate: (v) => (v.length >= 8 ? null : 'ADMIN_PASSWORD must be at least 8 chars.'),
      },
    ],
  },
  {
    title: 'Application',
    fields: [
      {
        key: 'APP_URL',
        required: true,
        validate: (v) => (isUrl(v) ? null : 'APP_URL must be a valid http/https URL.'),
      },
      {
        key: 'NODE_ENV',
        required: true,
        normalize: () => 'production',
        validate: (v) => (v === 'production' ? null : 'NODE_ENV must be production.'),
      },
      {
        key: 'ALLOWED_ORIGINS',
        required: true,
        validate: (v) => {
          if (!v) {
            return 'ALLOWED_ORIGINS is required.';
          }
          if (v === '*') {
            return null;
          }
          const origins = v.split(',').map((o) => o.trim()).filter(Boolean);
          return origins.every((o) => isUrl(o)) ? null : 'ALLOWED_ORIGINS must be * or comma-separated valid URLs.';
        },
      },
      {
        key: 'PUBLIC_BASE_URL',
        required: true,
        validate: (v) => (isUrl(v) ? null : 'PUBLIC_BASE_URL must be a valid http/https URL.'),
      },
    ],
  },
  {
    title: 'SMTP',
    fields: [
      {
        key: 'SMTP_HOST',
        required: true,
        validate: (v) => (v ? null : 'SMTP_HOST is required.'),
      },
      {
        key: 'SMTP_PORT',
        required: true,
        validate: (v) => (isIntInRange(v, 1, 65535) ? null : 'SMTP_PORT must be an integer 1-65535.'),
      },
      {
        key: 'SMTP_SECURE',
        required: true,
        validate: (v) => (isBooleanLike(v) ? null : 'SMTP_SECURE must be true or false.'),
      },
      {
        key: 'SMTP_USER',
        required: true,
        validate: (v) => (v ? null : 'SMTP_USER is required.'),
      },
      {
        key: 'SMTP_PASSWORD',
        required: true,
        secret: true,
        validate: (v) => (v.length >= 6 ? null : 'SMTP_PASSWORD appears too short.'),
      },
      {
        key: 'SMTP_FROM',
        required: true,
        validate: (v) => (/@/.test(v) ? null : 'SMTP_FROM should include a sender email.'),
      },
    ],
  },
  {
    title: 'Email/SMS/Payments',
    fields: [
      {
        key: 'RESEND_API_KEY',
        required: false,
        secret: true,
        validate: () => null,
      },
      {
        key: 'SMS_PROVIDER',
        required: false,
        validate: (v) => (!v || ['twilio'].includes(v) ? null : 'SMS_PROVIDER currently supports only twilio or empty.'),
      },
      {
        key: 'TWILIO_ACCOUNT_SID',
        required: false,
        secret: true,
        validate: (v, allValues) => {
          if (allValues.SMS_PROVIDER !== 'twilio') {
            return null;
          }
          return /^AC[a-zA-Z0-9]{32}$/.test(v) ? null : 'TWILIO_ACCOUNT_SID must look like ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
        },
      },
      {
        key: 'TWILIO_AUTH_TOKEN',
        required: false,
        secret: true,
        validate: (v, allValues) => {
          if (allValues.SMS_PROVIDER !== 'twilio') {
            return null;
          }
          return v && v.length >= 16 ? null : 'TWILIO_AUTH_TOKEN is required when SMS_PROVIDER=twilio.';
        },
      },
      {
        key: 'TWILIO_FROM_NUMBER',
        required: false,
        validate: (v, allValues) => {
          if (allValues.SMS_PROVIDER !== 'twilio') {
            return null;
          }
          return /^\+[1-9]\d{6,14}$/.test(v) ? null : 'TWILIO_FROM_NUMBER must be E.164 format like +1234567890';
        },
      },
      {
        key: 'STRIPE_SECRET_KEY',
        required: false,
        secret: true,
        validate: () => null,
      },
      {
        key: 'STRIPE_PUBLISHABLE_KEY',
        required: false,
        validate: () => null,
      },
      {
        key: 'STRIPE_WEBHOOK_SECRET',
        required: false,
        secret: true,
        validate: () => null,
      },
    ],
  },
  {
    title: 'In-home Shipping',
    fields: [
      {
        key: 'INHOME_SHIPPING_ENABLED',
        required: true,
        validate: (v) => (isBooleanLike(v) ? null : 'INHOME_SHIPPING_ENABLED must be true or false.'),
      },
      {
        key: 'INHOME_SHIPPING_BASE_URL',
        required: true,
        validate: (v, allValues) => {
          if (allValues.INHOME_SHIPPING_ENABLED === 'false') {
            return null;
          }
          return isUrl(v) ? null : 'INHOME_SHIPPING_BASE_URL must be a valid URL when enabled.';
        },
      },
      {
        key: 'INHOME_SHIPPING_API_KEY',
        required: true,
        secret: true,
        validate: (v, allValues) => {
          if (allValues.INHOME_SHIPPING_ENABLED === 'false') {
            return null;
          }
          return v ? null : 'INHOME_SHIPPING_API_KEY is required when enabled.';
        },
      },
      {
        key: 'INHOME_SHIPPING_TIMEOUT_MS',
        required: true,
        validate: (v) => (isIntInRange(v, 100, 120000) ? null : 'INHOME_SHIPPING_TIMEOUT_MS must be an integer 100-120000.'),
      },
      {
        key: 'INHOME_SHIPPING_WEBHOOK_SECRET',
        required: true,
        secret: true,
        validate: (v, allValues) => {
          if (allValues.INHOME_SHIPPING_ENABLED === 'false') {
            return null;
          }
          return v ? null : 'INHOME_SHIPPING_WEBHOOK_SECRET is required when enabled.';
        },
      },
      {
        key: 'INHOME_ALLOW_PRIVATE_HOSTS',
        required: true,
        validate: (v) => (isBooleanLike(v) ? null : 'INHOME_ALLOW_PRIVATE_HOSTS must be true or false.'),
      },
    ],
  },
  {
    title: 'Push Notifications / Worker',
    fields: [
      {
        key: 'VAPID_SUBJECT',
        required: false,
        validate: (v) => (!v || v.startsWith('mailto:') ? null : 'VAPID_SUBJECT should start with mailto:'),
      },
      {
        key: 'VAPID_PUBLIC_KEY',
        required: false,
        validate: () => null,
      },
      {
        key: 'VAPID_PRIVATE_KEY',
        required: false,
        secret: true,
        validate: () => null,
      },
      {
        key: 'FCM_PROJECT_ID',
        required: false,
        validate: () => null,
      },
      {
        key: 'FCM_SERVICE_ACCOUNT_JSON',
        required: false,
        secret: true,
        validate: () => null,
      },
      {
        key: 'FCM_SERVER_KEY',
        required: false,
        secret: true,
        validate: () => null,
      },
      {
        key: 'TASK_NOTIFICATION_WORKER_ENABLED',
        required: false,
        defaultValue: 'true',
        validate: (v) => (!v || isBooleanLike(v) ? null : 'TASK_NOTIFICATION_WORKER_ENABLED must be true/false or empty.'),
      },
      {
        key: 'TASK_NOTIFICATION_WORKER_PROFILE',
        required: false,
        defaultValue: 'medium',
        validate: (v, allValues) => {
          if (allValues.TASK_NOTIFICATION_WORKER_ENABLED === 'false' || !allValues.TASK_NOTIFICATION_WORKER_ENABLED) {
            return null;
          }
          return ['low', 'medium', 'high'].includes(v) ? null : 'TASK_NOTIFICATION_WORKER_PROFILE must be low, medium, or high.';
        },
      },
      {
        key: 'TASK_NOTIFICATION_WORKER_AUTOSCALE',
        required: false,
        defaultValue: 'true',
        validate: (v) => (!v || isBooleanLike(v) ? null : 'TASK_NOTIFICATION_WORKER_AUTOSCALE must be true/false or empty.'),
      },
    ],
  },
];

function buildFileContent(values) {
  const lines = [];
  lines.push('# Generated by env-production-wizard.cjs');
  lines.push(`# Generated at ${new Date().toISOString()}`);
  lines.push('# Keep secrets out of git history.');
  lines.push('');

  for (const section of FIELD_SECTIONS) {
    lines.push(`# ${section.title}`);
    for (const field of section.fields) {
      const v = values[field.key] ?? '';
      lines.push(`${field.key}=${escapeEnvValue(v)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function fullFinalValidation(values) {
  const errors = [];
  const warnings = [];

  for (const section of FIELD_SECTIONS) {
    for (const field of section.fields) {
      const value = values[field.key] ?? '';
      if (field.required && !value) {
        errors.push(`${field.key}: required value is missing.`);
        continue;
      }
      const validationError = field.validate ? field.validate(value, values) : null;
      if (validationError) {
        errors.push(`${field.key}: ${validationError}`);
      }
    }
  }

  if (values.NODE_ENV !== 'production') {
    errors.push('NODE_ENV must be production.');
  }

  if (values.ALLOWED_ORIGINS === '*') {
    warnings.push('ALLOWED_ORIGINS is set to * (open CORS). This is risky in production.');
  }

  if (values.APP_URL && !isHttpsUrl(values.APP_URL)) {
    warnings.push('APP_URL is not HTTPS.');
  }

  if (values.PUBLIC_BASE_URL && !isHttpsUrl(values.PUBLIC_BASE_URL)) {
    warnings.push('PUBLIC_BASE_URL is not HTTPS.');
  }

  const anyStripe = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'].some((k) => Boolean(values[k]));
  if (anyStripe) {
    for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET']) {
      if (!values[k]) {
        errors.push(`Stripe integration is partial: ${k} is missing.`);
      }
    }
  }

  if (values.SMS_PROVIDER === 'twilio') {
    for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER']) {
      if (!values[k]) {
        errors.push(`SMS_PROVIDER=twilio but ${k} is missing.`);
      }
    }
  }

  return { errors, warnings };
}

async function askField(rl, field, existingValue, allValues) {
  const displayExisting = existingValue ? (field.secret ? '***set***' : existingValue) : 'empty';
  const prompt = `${field.key}${field.required ? ' [required]' : ' [optional]'} (current: ${displayExisting})`;

  while (true) {
    const answer = (await rl.question(`${prompt}\n> `)).trim();

    if (!answer) {
      if (field.normalize) {
        const normalized = field.normalize('', allValues);
        const err = field.validate ? field.validate(normalized, allValues) : null;
        if (!err) {
          return normalized;
        }
      }

      if (existingValue) {
        const err = field.validate ? field.validate(existingValue, allValues) : null;
        if (!err) {
          return existingValue;
        }
      }

      if (field.autoGenerate) {
        const generated = field.autoGenerate();
        const err = field.validate ? field.validate(generated, allValues) : null;
        if (!err) {
          console.log(`  -> Auto-generated value for ${field.key}`);
          return generated;
        }
      }

      if (field.defaultValue) {
        const err = field.validate ? field.validate(field.defaultValue, allValues) : null;
        if (!err) {
          return field.defaultValue;
        }
      }

      if (field.required) {
        console.log('  ! This field is required and has no valid default. Please enter a value.');
        continue;
      }

      return '';
    }

    const finalValue = field.normalize ? field.normalize(answer, allValues) : answer;
    const validationError = field.validate ? field.validate(finalValue, allValues) : null;
    if (validationError) {
      console.log(`  ! ${validationError}`);
      continue;
    }
    return finalValue;
  }
}

async function main() {
  const runtime = checkRuntimeRequirements();
  if (runtime.issues.length > 0) {
    console.error('Server requirement check failed:');
    for (const issue of runtime.issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log('Production .env wizard');
  console.log('This tool validates values, removes duplicates, and rewrites .env in normalized order.');
  if (runtime.warnings.length) {
    console.log('Runtime warnings:');
    for (const w of runtime.warnings) {
      console.log(`- ${w}`);
    }
  }

  let existingContent = '';
  if (fs.existsSync(ENV_PATH)) {
    existingContent = fs.readFileSync(ENV_PATH, 'utf8');
  }

  const parsed = parseEnvFile(existingContent);
  if (parsed.duplicates.length > 0) {
    console.log('Detected duplicate keys in current .env (wizard will fix by writing unique normalized keys):');
    for (const d of parsed.duplicates) {
      console.log(`- ${d}`);
    }
  }

  const values = {};
  for (const [k, v] of parsed.map.entries()) {
    values[k] = v;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    for (const section of FIELD_SECTIONS) {
      console.log('');
      console.log(`=== ${section.title} ===`);
      for (const field of section.fields) {
        const existingValue = values[field.key] ?? '';
        const result = await askField(rl, field, existingValue, values);
        values[field.key] = result;
      }
    }

    const result = fullFinalValidation(values);
    if (result.errors.length > 0) {
      console.log('');
      console.error('Final validation failed. Fix these values and rerun:');
      for (const e of result.errors) {
        console.error(`- ${e}`);
      }
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.log('');
      console.log('Final validation warnings:');
      for (const w of result.warnings) {
        console.log(`- ${w}`);
      }
    }

    if (fs.existsSync(ENV_PATH)) {
      const backupPath = `${ENV_PATH}.backup-${Date.now()}`;
      fs.copyFileSync(ENV_PATH, backupPath);
      console.log(`Backup created: ${path.basename(backupPath)}`);
    }

    const content = buildFileContent(values);
    fs.writeFileSync(ENV_PATH, `${content.trimEnd()}\n`, 'utf8');

    const verify = parseEnvFile(fs.readFileSync(ENV_PATH, 'utf8'));
    if (verify.duplicates.length > 0) {
      console.error('Unexpected error: duplicate keys still exist after write.');
      process.exit(1);
    }

    console.log('');
    console.log('Success: .env generated and validated for production shape.');
    console.log('Recommended next checks:');
    console.log('- npm run check-env-dynamic');
    console.log('- npm run check-notifications:strict');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Wizard failed:', err && err.message ? err.message : err);
  process.exit(1);
});
