import { type Parent } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

let dbInstance: any = null;
let poolInstance: pg.Pool | null = null;

function isTransientDbError(error: any): boolean {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  if (["57P01", "57P02", "57P03", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE"].includes(code)) {
    return true;
  }

  return (
    message.includes("connection terminated") ||
    message.includes("terminating connection") ||
    message.includes("connection refused") ||
    message.includes("server closed the connection") ||
    message.includes("database system is starting up")
  );
}

function getDb() {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const max = Math.max(5, Number(process.env["DB_POOL_MAX"] || "50"));
    const min = Math.max(0, Number(process.env["DB_POOL_MIN"] || "5"));
    const idleTimeoutMillis = Math.max(1000, Number(process.env["DB_POOL_IDLE_TIMEOUT_MS"] || "30000"));
    const connectionTimeoutMillis = Math.max(1000, Number(process.env["DB_POOL_CONNECT_TIMEOUT_MS"] || "10000"));

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max,
      min,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });

    pool.on("error", (error) => {
      if (isTransientDbError(error)) {
        console.warn("⚠️ PostgreSQL pool transient error:", error?.message || error);
        return;
      }
      console.error("❌ PostgreSQL pool error:", error);
    });

    poolInstance = pool;
    dbInstance = drizzle(pool);
  }
  return dbInstance;
}

export interface IStorage {
  db: any;
}

export class MemStorage implements IStorage {
  db: any;

  constructor() {
    this.db = getDb();
  }
}

export const storage = new MemStorage();
