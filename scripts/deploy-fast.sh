#!/bin/bash

# ==============================================================================
# Classify Fast Deployment Script
# ==============================================================================
# Optimized for Hostinger Docker Manager - Minimal downtime updates
# 
# Usage:
#   ./scripts/deploy-fast.sh                 # Pull from main branch
#   ./scripts/deploy-fast.sh dev             # Pull from dev branch
#   ./scripts/deploy-fast.sh --no-build      # Skip rebuild (env changes only)
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BRANCH="${1:-main}"
NO_BUILD=false
PROJECT_DIR="${CLASSIFY_PROJECT_DIR:-/srv/classify}"
REPO_URL="${CLASSIFY_REPO_URL:-https://github.com/marcowaa/classify.git}"

ensure_lfs_mobile_artifacts() {
    if [ ! -f .gitattributes ] || ! grep -q "filter=lfs" .gitattributes; then
        echo -e "${BLUE}ℹ No Git LFS tracked mobile artifacts found${NC}"
        return
    fi

    if [ ! -d .git ]; then
        echo -e "${RED}✗ .git directory is missing; cannot run git lfs pull${NC}"
        exit 1
    fi

    if ! git lfs version > /dev/null 2>&1; then
        echo -e "${RED}✗ git-lfs is not installed. Install git-lfs before deployment.${NC}"
        exit 1
    fi

    git lfs install --local > /dev/null 2>&1 || true
    if ! git lfs pull --include="client/public/apps/*.apk,client/public/apps/*.aab,client/public/apps/archive/*.apk,client/public/apps/archive/*.aab"; then
        echo -e "${RED}✗ git lfs pull failed for mobile artifacts${NC}"
        exit 1
    fi
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --no-build) NO_BUILD=true ;;
        *) BRANCH="$1" ;;
    esac
    shift
done

echo -e "${BLUE}========================================"
echo "  Classify - Fast Deployment"
echo "  Branch: $BRANCH"
echo "  Project Dir: $PROJECT_DIR"
echo "========================================${NC}"

# Check if running on VPS
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Not on VPS. Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Git Pull (or Clone)
echo -e "\n${YELLOW}[1/6] Pulling latest code from $BRANCH...${NC}"
if [ -d ".git" ]; then
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    echo -e "${GREEN}✓ Code updated via git pull${NC}"
else
    echo -e "${YELLOW}⚠ No git repo found. Initializing from remote...${NC}"
    # Save .env before re-cloning
    [ -f .env ] && cp .env /tmp/classify-env-backup
    cd ..
    PARENT_DIR=$(pwd)
    PROJ_NAME=$(basename "$PROJECT_DIR")
    rm -rf "$PROJECT_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$PROJ_NAME"
    cd "$PROJECT_DIR"
    # Restore .env
    [ -f /tmp/classify-env-backup ] && mv /tmp/classify-env-backup .env
    echo -e "${GREEN}✓ Code cloned from remote${NC}"
fi

# Step 2: Check if .env exists
echo -e "\n${YELLOW}[2/7] Resolving Git LFS mobile artifacts...${NC}"
ensure_lfs_mobile_artifacts
echo -e "${GREEN}✓ Git LFS mobile artifacts are resolved${NC}"

# Step 3: Check if .env exists
echo -e "\n${YELLOW}[3/7] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found. Copy from .env.example first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 4: Verify mobile artifact integrity before build/deploy
echo -e "\n${YELLOW}[4/7] Verifying mobile release artifacts...${NC}"
if ! node ./scripts/check-mobile-release-assets.cjs --strict; then
    echo -e "${RED}✗ Mobile artifact validation failed. Aborting deployment.${NC}"
    echo -e "${YELLOW}  Fix by publishing latest APK/AAB artifacts before deploy.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Mobile release artifacts are valid${NC}"

# Step 5: Rebuild or just restart
if [ "${ALLOW_MISSING_MOBILE_RELEASE_ASSETS:-false}" = "true" ]; then
    echo "WARN: ALLOW_MISSING_MOBILE_RELEASE_ASSETS=true is enabled; missing APK/AAB files will not block deployment"
fi
if [ "$NO_BUILD" = true ]; then
    echo -e "\n${YELLOW}[5/7] Skipping build (--no-build flag)${NC}"
else
    echo -e "\n${YELLOW}[5/7] Building updated image...${NC}"
    # Use BuildKit for faster builds with layer caching
    DOCKER_BUILDKIT=1 docker compose build app
    echo -e "${GREEN}✓ Image built successfully${NC}"
fi

# Step 6: Restart containers
echo -e "\n${YELLOW}[6/7] Restarting services...${NC}"
docker compose up -d --force-recreate app
echo -e "${GREEN}✓ Services restarted${NC}"

# Step 7: Wait and verify health
echo -e "\n${YELLOW}[7/7] Verifying deployment...${NC}"
sleep 10

# Check container status
APP_CONTAINER=$(docker ps --filter "name=app" --format "{{.Names}}" | head -1)
if [ -n "$APP_CONTAINER" ]; then
    echo -e "${GREEN}✓ Container is running: $APP_CONTAINER${NC}"
else
    echo -e "${RED}✗ Container failed to start${NC}"
    echo -e "${YELLOW}Showing logs:${NC}"
    docker compose logs app --tail=50
    exit 1
fi

# Check health endpoint (retry up to 6 times = 60 seconds)
for i in $(seq 1 6); do
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo -e "${GREEN}✓ Health check passed (HTTP 200)${NC}"
        break
    fi
    if [ "$i" -eq 6 ]; then
        echo -e "${RED}✗ Health check failed after 60s (HTTP $HEALTH_CHECK)${NC}"
        echo -e "${YELLOW}Showing recent logs:${NC}"
        docker compose logs app --tail=30
        exit 1
    fi
    echo -e "  Waiting for app to start... (attempt $i/6)"
    sleep 10
done

# Show container info
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
docker compose ps

echo -e "\n${YELLOW}Useful commands:${NC}"
echo "  View logs:        docker compose logs -f app"
echo "  Check status:     docker compose ps"
echo "  Restart:          docker compose restart app"
echo "  Full rebuild:     docker compose up -d --build"
echo ""
