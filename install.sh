#!/bin/bash

# MineGuard Security OS - Linux Server Installation Script
# Author: AI Studio Build
# Date: 2026-03-31

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}   MineGuard Security OS - Instalador Linux Server  ${NC}"
echo -e "${GREEN}====================================================${NC}"

# 1. Check for Node.js
echo -e "\n${YELLOW}[1/6] Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Erro: Node.js não encontrado. Por favor, instale o Node.js v18 ou superior.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Erro: Versão do Node.js ($NODE_VERSION) é inferior a 18. Por favor, atualize.${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v) detectado.${NC}"

# 2. Check for npm
echo -e "\n${YELLOW}[2/6] Verificando npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Erro: npm não encontrado.${NC}"
    exit 1
fi
echo -e "${GREEN}npm $(npm -v) detectado.${NC}"

# 3. Install Dependencies
echo -e "\n${YELLOW}[3/6] Instalando dependências do projeto...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao instalar dependências.${NC}"
    exit 1
fi
echo -e "${GREEN}Dependências instaladas com sucesso.${NC}"

# 4. Build Frontend
echo -e "\n${YELLOW}[4/6] Compilando o frontend (Vite)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao compilar o frontend.${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend compilado com sucesso na pasta /dist.${NC}"

# 5. Environment Configuration
echo -e "\n${YELLOW}[5/6] Configurando variáveis de ambiente...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Arquivo .env criado a partir de .env.example.${NC}"
    echo -e "${RED}IMPORTANTE: Edite o arquivo .env e insira suas chaves de API e segredos.${NC}"
else
    echo -e "${GREEN}Arquivo .env já existe.${NC}"
fi

# 6. Systemd Service Configuration
echo -e "\n${YELLOW}[6/6] Configurando como Serviço do Sistema (systemd)...${NC}"
APP_PATH=$(pwd)
CURRENT_USER=$(whoami)
SERVICE_FILE="/etc/systemd/system/mineguard.service"

echo -e "Caminho da aplicação: ${YELLOW}$APP_PATH${NC}"
echo -e "Usuário do serviço: ${YELLOW}$CURRENT_USER${NC}"

cat <<EOF | sudo tee $SERVICE_FILE > /dev/null
[Unit]
Description=MineGuard Security OS Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$APP_PATH
ExecStart=$(which npm) start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

if [ $? -eq 0 ]; then
    sudo systemctl daemon-reload
    sudo systemctl enable mineguard
    echo -e "${GREEN}Serviço 'mineguard' criado e habilitado com sucesso.${NC}"
    echo -e "${YELLOW}O serviço iniciará automaticamente no boot.${NC}"
else
    echo -e "${RED}Erro ao criar o arquivo de serviço. Certifique-se de ter privilégios de sudo.${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}         INSTALAÇÃO CONCLUÍDA COM SUCESSO!          ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "\nPara gerenciar o serviço, use os seguintes comandos:"
echo -e "${YELLOW}sudo systemctl start mineguard${NC}   - Iniciar o servidor"
echo -e "${YELLOW}sudo systemctl status mineguard${NC}  - Verificar o status"
echo -e "${YELLOW}sudo systemctl stop mineguard${NC}    - Parar o servidor"
echo -e "${YELLOW}sudo systemctl restart mineguard${NC} - Reiniciar o servidor"
echo -e "\nO sistema estará disponível em: http://localhost:3000"
echo -e "${GREEN}====================================================${NC}"
