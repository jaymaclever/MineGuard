# 🛡️ MineGuard - Sistema de Segurança de Mina

**MineGuard** é um sistema de gestão de segurança operacional de ponta a ponta para mineração, projetado para monitoramento em tempo real, registro de incidentes e auditoria ativa.

Este é um aplicativo **Full-Stack** construído com foco em performance, segurança e usabilidade em ambientes críticos.

---

## 🚀 Funcionalidades Principais

- **Dashboard em Tempo Real:** Visualização de estatísticas, gráficos de volume de ocorrências e mapa de operações simulado.
- **Gestão de Ocorrências:** Registro detalhado de incidentes com categorias, gravidade (G1 a G4), coordenadas GPS e metadados customizados.
- **Exportação para PDF:** Gere relatórios detalhados de ocorrências individuais ou listas completas com formatação profissional pronta para impressão.
- **Controle de Acesso Hierárquico (RBAC):** Sistema robusto de permissões baseado em níveis (Superadmin, Sierra 1, Sierra 2, Oficial, Supervisor, Agente).
- **Notificações em Tempo Real:** Integração via WebSockets para alertas instantâneos de novas ocorrências.
- **Integração com Telegram:** (Opcional) Envio automático de alertas para grupos de resposta rápida.
- **Personalização da UI:** O Superadmin pode alterar o nome da aplicação, slogan, modo visual (claro/escuro), paleta de cores (laranja, azul, verde, vermelho, roxo) e layout (padrão ou compacto) diretamente nas configurações.
- **Auditoria Ativa:** Log completo de ações e histórico de registros.

---

## 🛠️ Stack Tecnológica

### Frontend
- **React 18+** com **TypeScript**
- **Vite** (Build Tool)
- **Tailwind CSS** (Estilização)
- **Motion (Framer Motion)** (Animações)
- **Lucide React** (Ícones)
- **Recharts** (Gráficos e Visualização de Dados)

### Backend
- **Node.js** com **Express**
- **SQLite** (`better-sqlite3`) para persistência de dados
- **Socket.io** para comunicação em tempo real
- **JWT** para autenticação segura
- **tsx** para execução de TypeScript no servidor

---

## 📦 Instalação (Linux Server)

Preparamos um script de instalação automatizada para facilitar o deploy em servidores Linux (Ubuntu/Debian).

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/mineguard.git
cd mineguard
```

### 2. Execute o script de instalação
```bash
chmod +x install.sh
./install.sh
```

O script irá:
1. Verificar as versões do Node.js e npm.
2. Instalar todas as dependências do projeto.
3. Compilar o frontend para produção.
4. Criar o arquivo `.env` inicial.
5. **Configurar o serviço `systemd` para iniciar automaticamente no boot.**

---

## ⚙️ Configuração (.env)

Após a instalação, edite o arquivo `.env` com suas credenciais:

```env
# Gemini AI (Opcional para recursos inteligentes)
GEMINI_API_KEY="sua_chave_aqui"

# Segurança
JWT_SECRET="seu_segredo_jwt"
ENCRYPTION_KEY="sua_chave_de_criptografia_32_chars"

# Telegram (Opcional)
TELEGRAM_BOT_TOKEN="token_do_seu_bot"
TELEGRAM_GROUP_OFICIAIS_SIERRAS_ID="id_do_grupo"
```

---

## 🚦 Gerenciamento do Serviço (systemd)

O instalador configura o MineGuard como um serviço do sistema. Use os comandos abaixo para gerenciá-lo:

### Iniciar o servidor
```bash
sudo systemctl start mineguard
```

### Parar o servidor
```bash
sudo systemctl stop mineguard
```

### Verificar o status
```bash
sudo systemctl status mineguard
```

### Reiniciar o servidor
```bash
sudo systemctl restart mineguard
```

### Ver logs em tempo real
```bash
journalctl -u mineguard -f
```

---

## 📄 Licença

Este projeto é de uso restrito e confidencial para operações de segurança. Consulte os termos de uso da sua organização.

---
*Desenvolvido com ❤️ por AI Studio Build.*
