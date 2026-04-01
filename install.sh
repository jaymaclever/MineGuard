#!/bin/bash

# MineGuard Security OS - Ubuntu Server Installation
# Simple, direct, no bullshit

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN}   MineGuard - Ubuntu Server Installation${NC}"
echo -e "${GREEN}===================================================${NC}"

# Step 1: Install Node.js
echo -e "\n${YELLOW}[1/5] Installing Node.js v20...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing from NodeSource repository...${NC}"
    sudo apt-get update -y
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Node.js. Trying alternative method...${NC}"
        sudo apt-get install -y curl gnupg2 lsb-release ubuntu-keyring
        curl https://keyserver.ubuntu.com/pks/lookup?op=get\&search=0x1655a0ab68576280 | sudo apt-key add -
        echo "deb https://deb.nodesource.com/node_20.x focal main" | sudo tee /etc/apt/sources.list.d/nodesource.list
        sudo apt-get update -y
        sudo apt-get install -y nodejs
    fi
else
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    echo -e "${GREEN}Node.js v$(node -v) already installed${NC}"
fi

# Verify Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js installation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) ready${NC}"

# Step 2: Verify npm
echo -e "\n${YELLOW}[2/5] Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v) ready${NC}"

# Step 3: Install Dependencies
echo -e "\n${YELLOW}[3/5] Installing npm dependencies...${NC}"
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: npm install failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Build Frontend
echo -e "\n${YELLOW}[4/5] Building frontend (Vite)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 5: Setup Environment
echo -e "\n${YELLOW}[5/5] Setting up environment...${NC}"
if [ ! -f .env ]; then
    cat > .env <<EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=mineguard_jwt_secret_key_12345
ENCRYPTION_KEY=mineguard_secret_key_32_chars_!!
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Create database directory if needed
mkdir -p logs
chmod -R 755 logs

echo -e "\n${GREEN}===================================================${NC}"
echo -e "${GREEN}         INSTALLATION COMPLETE! ${NC}"
echo -e "${GREEN}===================================================${NC}"

echo -e "\n${YELLOW}Start the server:${NC}"
echo -e "  ${GREEN}npm start${NC}"

echo -e "\n${YELLOW}Or setup as systemd service:${NC}"
echo -e "  Copy the commands below and run as root"
echo -e ""
echo -e "  APP_PATH=\$(pwd)"
echo -e "  CURRENT_USER=\$(whoami)"
echo -e "  sudo bash -c 'cat > /etc/systemd/system/mineguard.service <<EOF"
echo -e "[Unit]"
echo -e "Description=MineGuard Security OS"
echo -e "After=network.target"
echo -e ""
echo -e "[Service]"
echo -e "Type=simple"
echo -e "User=\$CURRENT_USER"
echo -e "WorkingDirectory=\$APP_PATH"
echo -e "ExecStart=$(which node) server.ts"
echo -e "Restart=always"
echo -e "Environment=NODE_ENV=production"
echo -e ""
echo -e "[Install]"
echo -e "WantedBy=multi-user.target"
echo -e "EOF'"
echo -e ""
echo -e "  sudo systemctl daemon-reload"
echo -e "  sudo systemctl enable mineguard"
echo -e "  sudo systemctl start mineguard"
echo -e ""

echo -e "${YELLOW}Access:${NC}"
echo -e "  http://localhost:3000"
echo -e ""
echo -e "${YELLOW}Default credentials:${NC}"
echo -e "  User: superadmin"
echo -e "  Pass: secret"
echo -e ""
echo -e "${GREEN}===================================================${NC}"
