import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  DATABASE_URL: z.string(),
  
  REDIS_URL: z.string().optional().default("redis://localhost:6379"),
  
  JWT_SECRET: z.string().optional().default("classify-jwt-secret-change-in-production"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("90d"),
  
  SESSION_SECRET: z.string().optional().default("classify-session-secret-change-in-production"),
  
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100"),
  RATE_LIMIT_LOGIN_MAX: z.string().default("5"),
  
  CORS_ORIGIN: z.string().default("*"),
  
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  
  CACHE_TTL_SECONDS: z.string().default("300"),
  
  ADMIN_PANEL_PASSWORD: z.string().optional(),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  
  const isProduction = parsed.data.NODE_ENV === "production";
  
  if (isProduction) {
    if (!parsed.data.JWT_SECRET || parsed.data.JWT_SECRET === "classify-jwt-secret-change-in-production") {
      console.error("CRITICAL: JWT_SECRET must be set to a secure value in production!");
      process.exit(1);
    }
    if (!parsed.data.SESSION_SECRET || parsed.data.SESSION_SECRET === "classify-session-secret-change-in-production") {
      console.error("CRITICAL: SESSION_SECRET must be set to a secure value in production!");
      process.exit(1);
    }
    if (!parsed.data.ADMIN_PANEL_PASSWORD) {
      console.error("CRITICAL: ADMIN_PANEL_PASSWORD must be set in production!");
      process.exit(1);
    }
  }
  
  return {
    env: parsed.data.NODE_ENV,
    port: parseInt(parsed.data.PORT, 10),
    isProduction: parsed.data.NODE_ENV === "production",
    isDevelopment: parsed.data.NODE_ENV === "development",
    isTest: parsed.data.NODE_ENV === "test",
    
    database: {
      url: parsed.data.DATABASE_URL,
    },
    
    redis: {
      url: parsed.data.REDIS_URL,
    },
    
    jwt: {
      secret: parsed.data.JWT_SECRET,
      expiresIn: parsed.data.JWT_EXPIRES_IN,
      refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
    },
    
    session: {
      secret: parsed.data.SESSION_SECRET,
    },
    
    rateLimit: {
      windowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
      maxRequests: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS, 10),
      loginMax: parseInt(parsed.data.RATE_LIMIT_LOGIN_MAX, 10),
    },
    
    cors: {
      origin: parsed.data.CORS_ORIGIN === "*" ? "*" : parsed.data.CORS_ORIGIN.split(","),
    },
    
    logging: {
      level: parsed.data.LOG_LEVEL,
    },
    
    cache: {
      ttlSeconds: parseInt(parsed.data.CACHE_TTL_SECONDS, 10),
    },
    
    admin: {
      password: parsed.data.ADMIN_PANEL_PASSWORD,
    },
  };
}

export const config = loadConfig();
export type Config = typeof config;
