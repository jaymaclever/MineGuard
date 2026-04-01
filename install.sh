#!/bin/bash

# MineGuard Security OS - Linux Server Installation Script
# Author: AI Studio Build
# Date: 2026-03-31

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}   MineGuard Security OS - Instalador Linux Server  ${NC}"
echo -e "${GREEN}====================================================${NC}"

# Detect OS
echo -e "\n${YELLOW}[0/7] Detectando Sistema Operacional...${NC}"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    echo -e "${GREEN}Linux detectado.${NC}"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    echo -e "${GREEN}macOS detectado.${NC}"
else
    echo -e "${RED}Sistema operacional não suportado: $OSTYPE${NC}"
    exit 1
fi

# 1. Install Node.js if not present
echo -e "\n${YELLOW}[1/7] Verificando/Instalando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js não encontrado. Instalando...${NC}"
    
    if [ "$OS" == "linux" ]; then
        # Detect Linux distribution
        if command -v apt-get &> /dev/null; then
            echo -e "${BLUE}Detectado: Debian/Ubuntu. Instalando Node.js...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
            sudo apt-get update && sudo apt-get install -y nodejs 2>/dev/null || {
                echo -e "${YELLOW}Falha com apt-get. Tentando npm via curl...${NC}"
                curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm install 20
            }
        elif command -v yum &> /dev/null; then
            echo -e "${BLUE}Detectado: CentOS/RHEL. Instalando Node.js...${NC}"
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
        elif command -v dnf &> /dev/null; then
            echo -e "${BLUE}Detectado: Fedora. Instalando Node.js...${NC}"
            sudo dnf install -y nodejs npm
        else
            echo -e "${YELLOW}Gerenciador de pacotes não reconhecido. Instalando via NVM...${NC}"
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            nvm install 20
        fi
    elif [ "$OS" == "macos" ]; then
        echo -e "${BLUE}macOS detectado. Instalando Node.js via Homebrew...${NC}"
        if ! command -v brew &> /dev/null; then
            echo -e "${YELLOW}Homebrew não encontrado. Instalando...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install node
    fi
else
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Node.js versão $NODE_VERSION detectada. Versão 18+ requerida.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}Node.js $(node -v) está pronto.${NC}"

# 2. Check for npm
echo -e "\n${YELLOW}[2/7] Verificando npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm não encontrado mesmo após instalar Node.js. Tente instalar manualmente.${NC}"
    exit 1
fi
echo -e "${GREEN}npm $(npm -v) detectado.${NC}"

# 3. Install Project Dependencies
echo -e "\n${YELLOW}[3/7] Instalando dependências do projeto...${NC}"
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao instalar dependências.${NC}"
    exit 1
fi
echo -e "${GREEN}Dependências instaladas com sucesso.${NC}"

# 4. Build Frontend
echo -e "\n${YELLOW}[4/7] Compilando o frontend (Vite)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao compilar o frontend.${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend compilado com sucesso em /dist.${NC}"

# 5. Environment Configuration
echo -e "\n${YELLOW}[5/7] Configurando variáveis de ambiente...${NC}"
if [ ! -f .env ]; then
    cat > .env <<EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=mineguard_jwt_secret_key_12345
ENCRYPTION_KEY=mineguard_secret_key_32_chars_!!
EOF
    echo -e "${GREEN}Arquivo .env criado com configurações padrão.${NC}"
    echo -e "${YELLOW}IMPORTANTE: Edite o arquivo .env e configure suas variáveis de produção.${NC}"
else
    echo -e "${GREEN}Arquivo .env já existe.${NC}"
fi

# 6. Database Setup
echo -e "\n${YELLOW}[6/7] Verificando banco de dados...${NC}"
if [ -f mina_seguranca.db ]; then
    echo -e "${GREEN}Banco de dados já existe.${NC}"
else
    echo -e "${YELLOW}Criando banco de dados...${NC}"
    touch mina_seguranca.db
    echo -e "${GREEN}Banco de dados criado. Será inicializado ao iniciar o servidor.${NC}"
fi

# 7. System Service Configuration (Linux only)
if [ "$OS" == "linux" ]; then
    echo -e "\n${YELLOW}[7/7] Configurando serviço do sistema (systemd)...${NC}"
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
ExecStart=$(which node) server.ts
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    if [ $? -eq 0 ]; then
        sudo systemctl daemon-reload
        sudo systemctl enable mineguard 2>/dev/null || true
        echo -e "${GREEN}Serviço 'mineguard' criado e habilitado com sucesso.${NC}"
        echo -e "${YELLOW}O serviço iniciará automaticamente no boot.${NC}"
    else
        echo -e "${RED}Erro ao criar arquivo de serviço. Verifique privilégios de sudo.${NC}"
    fi
else
    echo -e "\n${YELLOW}[7/7] Configuração de serviço do sistema pulada (não é Linux).${NC}"
    echo -e "${YELLOW}Para macOS, use: npm start${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}         INSTALAÇÃO CONCLUÍDA COM SUCESSO!          ${NC}"
echo -e "${GREEN}====================================================${NC}"

echo -e "\n${BLUE}Próximos Passos:${NC}"
echo -e "1. Edite ${YELLOW}.env${NC} e configure suas variáveis (API keys, senhas, etc)"
echo -e "2. Execute o servidor:"

if [ "$OS" == "linux" ]; then
    echo -e "   ${YELLOW}npm start${NC}                    (modo direto)"
    echo -e "   ${YELLOW}sudo systemctl start mineguard${NC} (via systemd)"
    echo -e "\n${BLUE}Gerenciar o serviço:${NC}"
    echo -e "${YELLOW}sudo systemctl status mineguard${NC}  - Ver status"
    echo -e "${YELLOW}sudo systemctl stop mineguard${NC}    - Parar"
    echo -e "${YELLOW}sudo systemctl restart mineguard${NC} - Reiniciar"
    echo -e "${YELLOW}sudo systemctl logs mineguard -f${NC} - Ver logs"
else
    echo -e "   ${YELLOW}npm start${NC} (desenvolvimento)"
    echo -e "   ${YELLOW}npm run build && node server.ts${NC} (produção)"
fi

echo -e "\n${BLUE}Acesso:${NC}"
echo -e "   http://localhost:3000"
echo -e "\n${BLUE}Credenciais padrão:${NC}"
echo -e "   Usuário: ${YELLOW}superadmin${NC}"
echo -e "   Senha: ${YELLOW}secret${NC}"
echo -e "\n${GREEN}====================================================${NC}"
