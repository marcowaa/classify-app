#!/bin/bash
# ============================================
# Classify - Full VPS Deployment Script
# Domain: classi-fy.com
# Server: Hostinger VPS (srv1118737.hstgr.cloud)
# ============================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🚀 Classify - Full Production Deploy     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"

PROJECT_DIR="/var/www/classify"

generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
        return
    fi
    date +%s%N | sha256sum | awk '{print $1}'
}

generate_password() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 24 | tr -d '=+/' | cut -c1-20
        return
    fi
    date +%s%N | sha256sum | awk '{print substr($1,1,20)}'
}

# ── Step 1: System Update & Docker Check ──
echo -e "\n${YELLOW}[1/8] Checking system requirements...${NC}"

if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    apt update && apt install -y docker-compose-plugin
fi

echo -e "${GREEN}  ✅ Docker $(docker --version | cut -d' ' -f3)${NC}"
echo -e "${GREEN}  ✅ $(docker compose version)${NC}"

# ── Step 2: Firewall ──
echo -e "\n${YELLOW}[2/8] Configuring firewall...${NC}"
apt install -y ufw > /dev/null 2>&1 || true
ufw allow ssh > /dev/null 2>&1
ufw allow http > /dev/null 2>&1
ufw allow https > /dev/null 2>&1
echo "y" | ufw enable > /dev/null 2>&1 || true
echo -e "${GREEN}  ✅ Firewall configured (SSH, HTTP, HTTPS)${NC}"

# ── Step 3: Clone/Update repository ──
echo -e "\n${YELLOW}[3/8] Setting up project...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo "  Project directory exists. Backing up .env..."
    cp "$PROJECT_DIR/.env" "/root/.env.backup.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
    cd "$PROJECT_DIR"
    
    # If it's a git repo, pull latest
    if [ -d ".git" ]; then
        echo "  Pulling latest code..."
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}  ⚠️  Project directory not found at $PROJECT_DIR${NC}"
    echo -e "${YELLOW}  You need to upload the project first. Options:${NC}"
    echo -e "${YELLOW}  A) git clone YOUR_REPO_URL $PROJECT_DIR${NC}"
    echo -e "${YELLOW}  B) Upload via SCP from your local machine${NC}"
    echo ""
    echo "  Creating directory..."
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
echo -e "${GREEN}  ✅ Project directory: $PROJECT_DIR${NC}"

# ── Step 4: Create/Preserve .env file ──
echo -e "\n${YELLOW}[4/8] Preparing production .env securely...${NC}"

if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${GREEN}  ✅ Existing .env detected. Preserving current secrets.${NC}"
else
    APP_URL_VALUE="${APP_URL:-https://classi-fy.com}"
    FRONTEND_URL_VALUE="${FRONTEND_URL:-$APP_URL_VALUE}"
    BACKEND_URL_VALUE="${BACKEND_URL:-$APP_URL_VALUE}"

    POSTGRES_USER_VALUE="${POSTGRES_USER:-classify}"
    POSTGRES_PASSWORD_VALUE="${POSTGRES_PASSWORD:-$(generate_password)}"
    POSTGRES_DB_VALUE="${POSTGRES_DB:-classify_db}"

    JWT_SECRET_VALUE="${JWT_SECRET:-$(generate_secret)}"
    SESSION_SECRET_VALUE="${SESSION_SECRET:-$(generate_secret)}"
    ADMIN_PANEL_PASSWORD_VALUE="${ADMIN_PANEL_PASSWORD:-$(generate_password)}"
    ADMIN_CREATION_SECRET_VALUE="${ADMIN_CREATION_SECRET:-$(generate_secret)}"

    ADMIN_EMAIL_VALUE="${ADMIN_EMAIL:-admin@classify.app}"
    ADMIN_PASSWORD_VALUE="${ADMIN_PASSWORD:-$(generate_password)}"
    ADMIN_BYPASS_EMAILS_VALUE="${ADMIN_BYPASS_EMAILS:-}"

    SMTP_HOST_VALUE="${SMTP_HOST:-smtp.hostinger.com}"
    SMTP_PORT_VALUE="${SMTP_PORT:-587}"
    SMTP_SECURE_VALUE="${SMTP_SECURE:-false}"
    SMTP_USER_VALUE="${SMTP_USER:-}"
    SMTP_PASSWORD_VALUE="${SMTP_PASSWORD:-}"
    SMTP_FROM_VALUE="${SMTP_FROM:-Classify <info@classi-fy.com>}"
    RESEND_API_KEY_VALUE="${RESEND_API_KEY:-}"

    INHOME_SHIPPING_ENABLED_VALUE="${INHOME_SHIPPING_ENABLED:-true}"
    INHOME_SHIPPING_BASE_URL_VALUE="${INHOME_SHIPPING_BASE_URL:-https://inhome.classi-fy.com}"
    INHOME_SHIPPING_API_KEY_VALUE="${INHOME_SHIPPING_API_KEY:-replace_with_inhome_api_key}"
    INHOME_SHIPPING_TIMEOUT_MS_VALUE="${INHOME_SHIPPING_TIMEOUT_MS:-5000}"
    INHOME_SHIPPING_WEBHOOK_SECRET_VALUE="${INHOME_SHIPPING_WEBHOOK_SECRET:-replace_with_shared_webhook_secret}"
    INHOME_ALLOW_PRIVATE_HOSTS_VALUE="${INHOME_ALLOW_PRIVATE_HOSTS:-false}"
    PUBLIC_BASE_URL_VALUE="${PUBLIC_BASE_URL:-$APP_URL_VALUE}"

    CORS_ORIGIN_VALUE="${CORS_ORIGIN:-$APP_URL_VALUE}"
    ALLOWED_ORIGINS_VALUE="${ALLOWED_ORIGINS:-$APP_URL_VALUE,https://www.classi-fy.com}"

    cat > "$PROJECT_DIR/.env" << ENVEOF
# Classify - Production Environment
# Server: Hostinger VPS
# Domain: classi-fy.com

# Database
POSTGRES_USER=$POSTGRES_USER_VALUE
POSTGRES_PASSWORD=$POSTGRES_PASSWORD_VALUE
POSTGRES_DB=$POSTGRES_DB_VALUE

# Security
JWT_SECRET=$JWT_SECRET_VALUE
SESSION_SECRET=$SESSION_SECRET_VALUE
ADMIN_PANEL_PASSWORD=$ADMIN_PANEL_PASSWORD_VALUE

# Admin Account
ADMIN_EMAIL=$ADMIN_EMAIL_VALUE
ADMIN_PASSWORD=$ADMIN_PASSWORD_VALUE
ADMIN_CREATION_SECRET=$ADMIN_CREATION_SECRET_VALUE
ADMIN_BYPASS_EMAILS=$ADMIN_BYPASS_EMAILS_VALUE

# Application
APP_URL=$APP_URL_VALUE
FRONTEND_URL=$FRONTEND_URL_VALUE
BACKEND_URL=$BACKEND_URL_VALUE
NODE_ENV=production

# SMTP
SMTP_HOST=$SMTP_HOST_VALUE
SMTP_PORT=$SMTP_PORT_VALUE
SMTP_SECURE=$SMTP_SECURE_VALUE
SMTP_USER=$SMTP_USER_VALUE
SMTP_PASSWORD=$SMTP_PASSWORD_VALUE
SMTP_FROM=$SMTP_FROM_VALUE

# Resend
RESEND_API_KEY=$RESEND_API_KEY_VALUE

# In-home shipping connector
INHOME_SHIPPING_ENABLED=$INHOME_SHIPPING_ENABLED_VALUE
INHOME_SHIPPING_BASE_URL=$INHOME_SHIPPING_BASE_URL_VALUE
INHOME_SHIPPING_API_KEY=$INHOME_SHIPPING_API_KEY_VALUE
INHOME_SHIPPING_TIMEOUT_MS=$INHOME_SHIPPING_TIMEOUT_MS_VALUE
INHOME_SHIPPING_WEBHOOK_SECRET=$INHOME_SHIPPING_WEBHOOK_SECRET_VALUE
INHOME_ALLOW_PRIVATE_HOSTS=$INHOME_ALLOW_PRIVATE_HOSTS_VALUE
PUBLIC_BASE_URL=$PUBLIC_BASE_URL_VALUE

# CORS
CORS_ORIGIN=$CORS_ORIGIN_VALUE
ALLOWED_ORIGINS=$ALLOWED_ORIGINS_VALUE
ENVEOF

    chmod 600 "$PROJECT_DIR/.env"
    echo -e "${GREEN}  ✅ .env created with secure runtime-generated secrets${NC}"
    echo -e "${YELLOW}  ⚠️  SMTP/Resend keys are placeholders unless supplied via environment.${NC}"
fi

# ── Step 5: Stop existing containers ──
echo -e "\n${YELLOW}[5/8] Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true
docker compose -f docker-compose.http.yml down 2>/dev/null || true
echo -e "${GREEN}  ✅ Old containers stopped${NC}"

# ── Step 6: Start with HTTP first (for SSL certificate) ──
echo -e "\n${YELLOW}[6/8] Starting services (HTTP mode for SSL setup)...${NC}"
docker compose -f docker-compose.http.yml up -d --build

echo "  Waiting for services to be healthy..."
sleep 30

# Check health
echo "  Testing health endpoint..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}  ✅ App is healthy (HTTP 200)${NC}"
else
    echo -e "${YELLOW}  ⚠️  Health check returned: $HEALTH (may still be starting)${NC}"
    echo "  Waiting another 30 seconds..."
    sleep 30
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    echo -e "  Health check: $HEALTH"
fi

# ── Step 7: SSL Certificate ──
echo -e "\n${YELLOW}[7/8] Setting up SSL certificate...${NC}"

# Install certbot
apt install -y certbot > /dev/null 2>&1

# Stop nginx to free port 80 for certbot
docker compose -f docker-compose.http.yml stop nginx 2>/dev/null || true
sleep 3

echo "  Requesting SSL certificate for classi-fy.com..."
certbot certonly --standalone --non-interactive --agree-tos \
    --email admin@classi-fy.com \
    -d classi-fy.com -d www.classi-fy.com \
    2>&1 || {
    echo -e "${RED}  ❌ SSL failed. Make sure DNS A records point to this server's IP.${NC}"
    echo -e "${YELLOW}  Continuing with HTTP mode. Run this script again after fixing DNS.${NC}"
    
    # Restart HTTP mode
    docker compose -f docker-compose.http.yml up -d
    echo -e "\n${GREEN}App is running at: http://$(curl -s ifconfig.me)${NC}"
    exit 0
}

# Copy certs
mkdir -p "$PROJECT_DIR/nginx/ssl"
cp /etc/letsencrypt/live/classi-fy.com/fullchain.pem "$PROJECT_DIR/nginx/ssl/"
cp /etc/letsencrypt/live/classi-fy.com/privkey.pem "$PROJECT_DIR/nginx/ssl/"
chmod 600 "$PROJECT_DIR/nginx/ssl/"*.pem

echo -e "${GREEN}  ✅ SSL certificate installed${NC}"

# Stop HTTP containers
docker compose -f docker-compose.http.yml down

# ── Step 8: Start HTTPS Production ──
echo -e "\n${YELLOW}[8/8] Starting HTTPS production mode...${NC}"
docker compose up -d --build

echo "  Waiting for services..."
sleep 30

# Final health check
HEALTH=$(curl -sk -o /dev/null -w "%{http_code}" https://classi-fy.com/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}  ✅ HTTPS is working!${NC}"
else
    # Try local
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    echo -e "  Local health: $HEALTH"
fi

# ── Setup SSL auto-renewal ──
echo -e "\n${YELLOW}Setting up SSL auto-renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/classi-fy.com/fullchain.pem $PROJECT_DIR/nginx/ssl/ && cp /etc/letsencrypt/live/classi-fy.com/privkey.pem $PROJECT_DIR/nginx/ssl/ && docker compose -f $PROJECT_DIR/docker-compose.yml restart nginx") | crontab -
echo -e "${GREEN}  ✅ Auto-renewal configured (monthly)${NC}"

# ── Final Summary ──
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")
echo -e "\n${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅ Deployment Complete!                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Website:  ${GREEN}https://classi-fy.com${NC}"
echo -e "  🔒 HTTPS:    ${GREEN}Enabled${NC}"
echo -e "  📡 Server:   ${GREEN}$SERVER_IP${NC}"
echo -e "  📁 Project:  ${GREEN}$PROJECT_DIR${NC}"
echo ""
echo -e "  ${YELLOW}Useful commands:${NC}"
echo "  docker compose ps              # Check status"
echo "  docker compose logs -f app     # App logs"
echo "  docker compose logs -f nginx   # Nginx logs"
echo "  docker compose restart app     # Restart app"
echo "  docker compose down && docker compose up -d  # Full restart"
echo ""
echo -e "  ${YELLOW}Admin login:${NC}"
echo "  Email: admin@classify.app"
echo "  URL:   https://classi-fy.com"
echo ""

echo -e "${YELLOW}In-home checks:${NC}"
INHOME_DNS=$(getent hosts inhome.classi-fy.com | awk '{print $1}' | head -n 1)
if [ -n "$INHOME_DNS" ]; then
    echo -e "  DNS inhome.classi-fy.com -> ${GREEN}$INHOME_DNS${NC}"
else
    echo -e "  ${RED}DNS for inhome.classi-fy.com is missing (NXDOMAIN).${NC}"
fi

WEBHOOK_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" https://classi-fy.com/api/store/inhome/webhook 2>/dev/null || echo "000")
echo -e "  Webhook endpoint status: ${GREEN}$WEBHOOK_STATUS${NC}"

if [ "$WEBHOOK_STATUS" != "200" ]; then
    echo -e "  ${YELLOW}⚠️  in-home webhook endpoint is not healthy yet.${NC}"
fi

echo -e "  ${YELLOW}Next step:${NC} update INHOME_SHIPPING_API_KEY and INHOME_SHIPPING_WEBHOOK_SECRET in .env"
echo ""
