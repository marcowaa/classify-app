import bcrypt from "bcrypt";

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error("Usage: node tmp/gen_basic_auth_hash.mjs <username> <password>");
  process.exit(1);
}

const saltRounds = process.env.SALT_ROUNDS ? Number(process.env.SALT_ROUNDS) : 10;
const hash = bcrypt.hashSync(password, saltRounds);

process.stdout.write(`${username}:${hash}`);
