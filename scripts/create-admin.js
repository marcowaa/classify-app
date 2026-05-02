import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

async function createAdmin() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const email = 'admin@classify.app';
    const password = 'Admin@Classify2024!';
    
    try {
        const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log('Admin exists, updating password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query('UPDATE admins SET password = $1 WHERE email = $2', [hashedPassword, email]);
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query('INSERT INTO admins (id, email, password, role) VALUES (gen_random_uuid(), $1, $2, $3)', [email, hashedPassword, 'admin']);
        }
        console.log('✅ Admin ready:', email, '/', password);
    } catch (err) {
        console.error('Error:', err.message);
    }
    await pool.end();
}

createAdmin();
