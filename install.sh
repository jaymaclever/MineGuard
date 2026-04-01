#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   MineGuard - Full Installation${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}ERROR: Must run with sudo${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[1/6] Updating system packages...${NC}"
apt-get update -y >/dev/null 2>&1
apt-get upgrade -y >/dev/null 2>&1

echo -e "${YELLOW}[2/6] Installing Node.js v20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y nodejs >/dev/null 2>&1

echo -e "${YELLOW}[3/6] Installing npm dependencies...${NC}"
npm install --legacy-peer-deps >/dev/null 2>&1

echo -e "${YELLOW}[4/6] Building frontend...${NC}"
npm run build >/dev/null 2>&1

echo -e "${YELLOW}[5/6] Configuring environment...${NC}"
if [ ! -f .env ]; then
    cat > .env <<EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=mineguard_jwt_secret_key_12345
ENCRYPTION_KEY=mineguard_secret_key_32_chars_!!
EOF
fi

echo -e "${YELLOW}[6/6] Starting MineGuard service...${NC}"
APP_PATH=$(pwd)
SERVICE_USER=$(whoami)

cat > /etc/systemd/system/mineguard.service <<EOF
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
systemctl enable mineguard >/dev/null 2>&1
systemctl start mineguard

sleep 2

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Installation Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "\n${GREEN}🚀 Access MineGuard:${NC}"
echo -e "   http://localhost:3000"
echo -e "\n${GREEN}📝 Login:${NC}"
echo -e "   User: superadmin"
echo -e "   Pass: secret"
echo -e "\n${YELLOW}Monitor:${NC}"
echo -e "   systemctl status mineguard"
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
