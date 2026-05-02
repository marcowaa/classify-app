# ==============================================================================
# Classify Dockerfile - Optimized for Hostinger Docker Manager
# ==============================================================================
# Features:
# - Multi-stage build with aggressive layer caching
# - Faster rebuilds (only changed layers rebuild)
# - Smaller final image (~150MB vs ~400MB)
# - Production-ready security (non-root user)
# - Built-in health checks and migrations
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies (cached unless package.json changes)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files for better caching
COPY package*.json ./
COPY .npmrc* ./

# Install ALL dependencies (needed for build)
# Uses npm ci when package-lock.json exists (faster, deterministic)
# Falls back to npm install when missing (manual/non-git deploys)
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi && \
    npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Build (cached unless source code changes)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Build frontend (Vite) and backend (esbuild)
# Increase Node.js heap size for large locale file processing
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime (smallest possible)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install only runtime utilities (curl for health, busybox for netcat)
RUN apk add --no-cache curl busybox-extras

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Create writable directories BEFORE switching user
RUN mkdir -p /app/uploads /app/logs && \
    chown -R appuser:nodejs /app /app/uploads /app/logs

# Switch to non-root user BEFORE npm install (avoids slow chown -R on node_modules)
USER appuser

# Copy package files (owned by appuser since USER is set)
COPY --chown=appuser:nodejs package*.json ./
COPY --chown=appuser:nodejs .npmrc* ./

# Install ONLY production deps + migration tools as appuser
# (drizzle-kit, tsx needed for db:push at startup)
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi && \
    npm install --no-save drizzle-kit tsx && \
    npm cache clean --force

# Copy built application from builder
COPY --chown=appuser:nodejs --from=builder /app/dist ./dist

# Copy database schema and migrations (needed for db:push)
COPY --chown=appuser:nodejs --from=builder /app/shared ./shared
COPY --chown=appuser:nodejs --from=builder /app/migrations ./migrations
COPY --chown=appuser:nodejs --from=builder /app/drizzle.config.ts ./
COPY --chown=appuser:nodejs --from=builder /app/tsconfig.json ./

# Copy scripts (entrypoint + maintenance tools)
COPY --chown=appuser:nodejs --from=builder /app/scripts ./scripts
RUN chmod +x ./scripts/docker-entrypoint.sh

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 5000

# Environment variables (can be overridden by docker-compose)
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

# Health check (used by Docker and Traefik)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Entrypoint: runs migrations + starts app
CMD ["sh", "./scripts/docker-entrypoint.sh"]
