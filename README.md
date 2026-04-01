# 🛡️ MineGuard - Sistema de Segurança de Mina

**MineGuard** é um sistema completo de gestão de segurança operacional para mineração, projetado para monitoramento em tempo real, registro de incidentes e auditoria ativa.

Sistema **Full-Stack** moderno com React 18, TypeScript, Express e SQLite. Pronto para produção em Ubuntu Server.

---

## 🚀 Funcionalidades Principais

- ✅ **Dashboard em Tempo Real** - Visualização de estatísticas, gráficos e mapa de operações
- ✅ **Gestão de Ocorrências** - Registro detalhado com categorias, gravidade (G1-G4), GPS e metadados
- ✅ **Exportação para PDF** - Relatórios profissionais formatados para impressão
- ✅ **RBAC Hierárquico** - Controle de acesso robusto (Superadmin, Sierra, Oficial, Supervisor, Agente)
- ✅ **Notificações em Tempo Real** - WebSockets para alertas instantâneos
- ✅ **Integração Telegram** - Envio automático de alertas para grupos
- ✅ **Email SMTP** - Relatórios agendados por email
- ✅ **Relatórios Agendados** - Configure horário, canal (Email/Telegram) e conteúdo
- ✅ **Multilíngue (i18n)** - Português (BR) e English (US) com preferência por usuário
- ✅ **PWA (Progressive Web App)** - Instalável como app nativo em mobile
- ✅ **Backup & Restauração** - Gerencie backups do banco de dados pelo navegador
- ✅ **Personalização de UI** - Altere nome, slogan, tema, cores e layout
- ✅ **Auditoria Ativa** - Log completo de ações e histórico

---

## 🛠️ Stack Tecnológica

### Frontend
- React 18+ com TypeScript
- Vite (Build Tool moderno)
- Tailwind CSS (Estilização)
- Motion/Framer Motion (Animações)
- Lucide React (Ícones)
- Recharts (Gráficos)
- i18next (Multilíngue)

### Backend
- Node.js v20 com Express
- SQLite (better-sqlite3)
- Socket.io (Comunicação em tempo real)
- JWT (Autenticação segura)
- Criptografia AES-256

---

## 📥 Instalação Rápida (Ubuntu Server)

### One-Line Installation
```bash
git clone https://github.com/seu-usuario/mineguard.git && cd mineguard && sudo bash install.sh
```

Ou passo a passo:
```bash
git clone https://github.com/seu-usuario/mineguard.git
cd mineguard
sudo bash install.sh
```

### O que o instalador faz automaticamente:
1. ✅ Atualiza pacotes do sistema
2. ✅ Instala Node.js v20 (se não existir)
3. ✅ Instala todas as dependências npm
4. ✅ Compila o frontend (Vite)
5. ✅ Cria `.env` com chaves seguras
6. ✅ Configura serviço systemd
7. ✅ **Inicia o servidor automaticamente**

### Pronto! Acesse:
```
http://localhost:3000

👤 Usuário: superadmin
🔑 Senha: secret
```

---

## 🎮 Gerenciamento do Serviço (systemd)

O servidor roda como serviço do sistema. Comandos úteis:

```bash
# Ver status
sudo systemctl status mineguard

# Parar
sudo systemctl stop mineguard

# Iniciar
sudo systemctl start mineguard

# Reiniciar
sudo systemctl restart mineguard

# Ver logs em tempo real
sudo journalctl -u mineguard -f
```

---

## ⚙️ Configuração Avançada

### Editar .env (após instalação)
```bash
nano /path/to/mineguard/.env
```

Chaves disponíveis:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=b6f8a2c4e9d1f3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0c2d4e6f8a0c2
ENCRYPTION_KEY=Lulo-CSI-Safe-Admin-Secret-Key-2026-Security-First!

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id

# Email SMTP (opcional)
EMAIL_SENDER=noreply@mineguard.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app
```

---

## 📱 Recursos Especiais

### Preferência de Idioma por Usuário
1. Vá para **Gestão de Pessoal**
2. Clique em **Editar Agente**
3. Selecione **Idioma Preferido** (Português/English)
4. O idioma é aplicado automaticamente ao login

### Relatórios Agendados
Na seção **Configurações → 🔔 Notificações → Relatórios Agendados**:
- Escolha horário de envio
- Selecione canais (Email e/ou Telegram)
- Configure destinatários
- Selecione o conteúdo a incluir

### Integração Telegram
1. Crie um bot com @BotFather no Telegram
2. Obtenha o token do bot
3. Descobra o Chat ID com `/getid`
4. Configure em **Configurações → 🔔 Notificações → Telegram**

---

## 🔐 Segurança

- JWT com chave hexadecimal de 256 bits
- Criptografia AES-256 para dados sensíveis
- Senhas hasheadas com padrão seguro
- CORS configurado para produção
- Headers de segurança HTTP
- Rate limiting recomendado (configure no nginx/Apache)

---

## 🚨 Troubleshooting

### Porta 3000 já em uso
```bash
lsof -i :3000
kill -9 <PID>
# ou altere PORT no .env
```

### Serviço não inicia
```bash
sudo journalctl -u mineguard -n 50
# Verifique o .env e permissões de arquivo
```

### Banco de dados corrompido
```bash
rm mina_seguranca.db
sudo systemctl restart mineguard
# DB será recriado automaticamente
```

---

## 📊 Estrutura de Dados

### Usuários
- ID, Nome, Função, Nº Mecanográfico
- Nível Hierárquico (RBAC)
- Idioma Preferido
- Senha (criptografada)

### Ocorrências (Reports)
- ID, Agente ID, Categoria
- Gravidade (G1-G4)
- Descrição, Coordenadas GPS
- Timestamp, Status

### Configurações
- Email SMTP
- Telegram (Bot Token, Chat ID)
- Relatórios Agendados
- Personalização de UI

---

## 📄 Credenciais Padrão

```
👤 Usuário: superadmin
🔑 Senha: secret
🔐 Nível: Superadmin (acesso total)
```

⚠️ **IMPORTANTE:** Mude a senha padrão em produção!

---

## 📞 Suporte

Para problemas:
1. Verifique os logs: `sudo journalctl -u mineguard -f`
2. Valide o `.env`: `cat .env`
3. Reinicie o serviço: `sudo systemctl restart mineguard`

---

## 📄 Licença

Projeto confidencial para operações de segurança. Acesso restrito.

---

*Desenvolvido com ❤️ para operações críticas de segurança.*
