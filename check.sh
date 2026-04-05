#!/bin/bash
# MineGuard Health Check Script

echo "🔍 MineGuard Health Check"
echo "========================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale Node.js."
    exit 1
fi
echo "✅ npm está instalado"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules não existe. Instalando dependências..."
    npm install
else
    echo "✅ node_modules existe"
fi

# Check if mina_seguranca.db exists
if [ ! -f "mina_seguranca.db" ]; then
    echo "⚠️  Base de dados não existe. Será criada ao iniciar o servidor."
else
    echo "✅ Base de dados encontrada"
fi

# Check if src/App.tsx exists
if [ ! -f "src/App.tsx" ]; then
    echo "❌ src/App.tsx não encontrado!"
    exit 1
fi
echo "✅ App.tsx existe"

# Check if server.ts exists
if [ ! -f "server.ts" ]; then
    echo "❌ server.ts não encontrado!"
    exit 1
fi
echo "✅ server.ts existe"

echo ""
echo "✅ TUDO OK! A aplicação está pronta."
echo ""
echo "Para iniciar o servidor, execute:"
echo "  npm run dev"
echo ""
echo "Então abra no navegador:"
echo "  https://localhost:2026"
