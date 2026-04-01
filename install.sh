#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   MineGuard - Full Installation${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

# Ensure running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}ERROR: Must run with sudo${NC}"
    exit 1
fi

# 1. Update system
echo -e "\n${YELLOW}[1/5] Updating system packages...${NC}"
apt-get update -y >/dev/null 2>&1
apt-get upgrade -y >/dev/null 2>&1

# 2. Install Node.js
echo -e "${YELLOW}[2/5] Installing Node.js v20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y nodejs >/dev/null 2>&1

if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js installation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 3. Install npm dependencies
echo -e "${YELLOW}[3/5] Installing npm dependencies...${NC}"
npm install --legacy-peer-deps >/dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 4. Build frontend
echo -e "${YELLOW}[4/5] Building frontend...${NC}"
npm run build >/dev/null 2>&1
echo -e "${GREEN}✓ Frontend built${NC}"

# 5. Setup environment
echo -e "${YELLOW}[5/5] Setting up environment...${NC}"

# Create .env if not exists
if [ ! -f .env ]; then
    cat > .env <<EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=mineguard_jwt_secret_key_12345
ENCRYPTION_KEY=mineguard_secret_key_32_chars_!!
EOF
fi

# Create systemd service
SERVICE_FILE="/etc/systemd/system/mineguard.service"
APP_PATH=$(pwd)
SERVICE_USER=$(stat -c "%U" .env)

cat > $SERVICE_FILE <<EOF
[Unit]
Description=MineGuard Security OS
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_PATH
ExecStart=$(which node) server.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mineguard
echo -e "${GREEN}✓ Systemd service configured${NC}"

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   Installation Complete! ✓${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Start the server:${NC}"
echo -e "  ${GREEN}systemctl start mineguard${NC}"
echo -e "  ${GREEN}systemctl status mineguard${NC}"
echo -e "\n${YELLOW}Logs:${NC}"
echo -e "  ${GREEN}systemctl logs mineguard -f${NC}"
echo -e "\n${YELLOW}Access:${NC}"
echo -e "  http://localhost:3000"
echo -e "\n${YELLOW}Credentials:${NC}"
echo -e "  User: superadmin"
echo -e "  Pass: secret"
