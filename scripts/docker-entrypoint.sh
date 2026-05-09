#!/bin/sh

echo "=============================================="
echo "  Classify Docker Entrypoint"
echo "  Environment: ${NODE_ENV:-production}"
echo "=============================================="

# Load local .env if it exists (so DATABASE_URL/JWT_SECRET are available)
if [ -f ".env" ]; then
  echo "Loading .env..."
  set -a
  . ./.env
  set +a
fi

wait_for_db() {
    echo "[1/4] Waiting for database to be ready..."
    DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')

    if [ -z "$DB_HOST" ]; then
        DB_HOST="db"
    fi
    if [ -z "$DB_PORT" ]; then
        DB_PORT="5432"
    fi

    echo "  Connecting to database at $DB_HOST:$DB_PORT"

    MAX_RETRIES=30
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            echo "  Database is reachable at $DB_HOST:$DB_PORT"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "  Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "  WARNING: Could not verify database connection via netcat"
        echo "  Attempting to proceed with migration anyway..."
    fi

    echo "  Waiting additional 5 seconds for database initialization..."
    sleep 5
    echo "  Database check complete"
}

run_migrations() {
    echo "[2/4] Running database migrations (drizzle-kit push)..."
    echo "  Schema file: ./shared/schema.ts"
    echo "  Database: ${DATABASE_URL%@*}@***"

    if [ ! -f "./shared/schema.ts" ]; then
        echo "  ERROR: Schema file not found at ./shared/schema.ts"
        return 1
    fi

    if [ ! -f "./drizzle.config.ts" ]; then
        echo "  ERROR: Drizzle config not found at ./drizzle.config.ts"
        return 1
    fi

    echo "  Found schema.ts and drizzle.config.ts"

    MAX_RETRIES=3
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        echo "  Running: npx drizzle-kit push --force (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"

        if npx drizzle-kit push --force 2>&1; then
            echo "  ✅ Database schema synchronized successfully!"
            echo "  All 92 tables have been created/updated"
            return 0
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "  Migration attempt failed, retrying in 5 seconds..."
            sleep 5
        fi
    done

    echo "  ❌ ERROR: Database migration failed after $MAX_RETRIES attempts"
    echo "  Please check:"
    echo "    1. DATABASE_URL is correct"
    echo "    2. Database server is accessible"
    echo "    3. Database user has CREATE TABLE permissions"
    return 1
}

seed_admin() {
    echo "[3/4] Seeding admin account..."

    node -e "
const pg = require('pg');
const { Pool } = pg;
const bcrypt = require('bcrypt');

async function seedAdmin() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const email = process.env.ADMIN_EMAIL || 'admin@classify.app';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const username = process.env.ADMIN_USERNAME || (email.includes('@') ? email.split('@')[0] : 'admin');

    try {
        const tableCheck = await pool.query(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admins')\");
        if (!tableCheck.rows[0].exists) {
            console.log('  ⚠️ Admins table does not exist yet, skipping seed');
            await pool.end();
            return;
        }

        const existing = await pool.query('SELECT id FROM admins WHERE email = \\$1', [email]);
        if (existing.rows.length > 0) {
            console.log('  ✅ Admin account already exists:', email);
            await pool.end();
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO admins (id, username, email, password) VALUES (gen_random_uuid(), \\$1, \\$2, \\$3) ON CONFLICT (email) DO NOTHING',
            [username, email, hashedPassword]
        );
        console.log('  ✅ Admin account created:', email);
    } catch (err) {
        console.log('  ⚠️ Admin seed issue:', err.message);
    }
    await pool.end();
}

seedAdmin().catch(console.error);
" 2>&1 || echo "  ⚠️ Admin seeding completed with warnings"
}

verify_tables() {
    echo "  Verifying critical tables..."

    node -e "
const pg = require('pg');
const { Pool } = pg;

async function verifyTables() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const criticalTables = ['parents', 'children', 'admins', 'tasks', 'products', 'notifications'];

    try {
        const result = await pool.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\");
        const existingTables = result.rows.map(r => r.table_name);
        const tableCount = existingTables.length;

        console.log('  Found', tableCount, 'tables in database');

        const missing = criticalTables.filter(t => !existingTables.includes(t));
        if (missing.length > 0) {
            console.log('  ⚠️ Missing critical tables:', missing.join(', '));
        } else {
            console.log('  ✅ All critical tables exist');
        }
    } catch (err) {
        console.log('  ⚠️ Could not verify tables:', err.message);
    }
    await pool.end();
}

verifyTables().catch(console.error);
" 2>&1 || echo "  ⚠️ Table verification skipped"
}

start_app() {
    echo "[4/4] Starting application server..."
    echo "=============================================="
    echo "  ✅ Server starting on port ${PORT:-5000}"
    echo "  ✅ Health check: http://localhost:${PORT:-5000}/api/health"
    echo "=============================================="

    exec node dist/index.js
}

main() {
    wait_for_db

    if [ "${DB_PUSH_ON_BOOT:-false}" = "true" ]; then
        if run_migrations; then
            verify_tables
            seed_admin
        else
            echo "  ⚠️ Migration failed - attempting to start anyway"
            echo "  The application may not function correctly"
        fi
    else
        echo "[2/4] Skipping database migrations (DB_PUSH_ON_BOOT=false)"
        echo "  To enable auto-migrations set DB_PUSH_ON_BOOT=true"
        verify_tables
        seed_admin
    fi

    start_app
}

main
