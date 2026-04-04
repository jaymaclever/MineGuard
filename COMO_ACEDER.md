# 🚀 MineGuard - COMO ACEDER À APLICAÇÃO

## ✅ SERVIDOR ESTÁ FUNCIONANDO!

O servidor MineGuard está agora a correr na **porta 2026**.

---

## 📍 COMO ACEDER

### 1. **Certifique-se que tem o servidor rodando:**

```bash
npm run dev
```

Deve ver a mensagem:
```
Server running on https://localhost:2026
```

### 2. **Abra no navegador:**

```
https://localhost:2026
```

### 3. **Você verá a tela de login**
> [!IMPORTANT]
> Como o certificado é autoassinado, o navegador exibirá um aviso de segurança. Clique em **Avançado** e **Prosseguir/Continuar**.

---

## 👤 CREDENCIAIS PADRÃO

Use uma destas contas para fazer login (o servidor as cria automaticamente):

| Utilizador | Senha | Papel |
|-----------|-------|-------|
| `admin` | `123456` | Superadmin |
| `user` | `123456` | Agente |

**Nota:** As credenciais podem variar dependendo da configuração da base de dados. Se estas não funcionarem, verifique a base de dados `mina_seguranca.db`.

---

## 🔧 CONFIGURAÇÕES

- **Host**: `localhost` (ou `127.0.0.1`)
- **Porta**: `2026`
- **URL Completa**: `https://localhost:2026`
- **Base de Dados**: `mina_seguranca.db` (SQLite)

---

## ⚙️ SE PRECISAR MUDAR A PORTA

### Editar `vite.config.ts`:
```typescript
server: {
  host: '127.0.0.1',
  port: 2026,  // Mude para a porta desejada
  ...
}
```

### Editar `server.ts`:
```typescript
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 2026;  // Mude aqui também
```

### Reinicie o servidor:
```bash
npm run dev
```

---

## 🐛 TROUBLESHOOTING

### "Connection refused" / "localhost recusou estabelecer ligação"

**Causa**: Porta 2026 está em uso ou servidor não iniciou.

**Solução**:
```bash
# Verifique se há processo em porto 2026
netstat -ano | find ":2026"

# Se houver, termine o processo ou mude a porta (veja acima)
```

### Página em branco após login

**Solução**:
1. Abra DevTools (F12)
2. Vá ao separador "Console"
3. Procure erros em vermelho
4. Se houver erros, reporte-os

### Servidor inicia mas página não carrega

**Solução**:
```bash
# Limpe cache do npm
npm cache clean --force

# Reinstale dependências
npm install

# Reinicie servidor
npm run dev
```

---

## 📊 FUNCIONALIDADES DISPONÍVEIS

✅ Dashboard com estatísticas em tempo real
✅ Gestão de ocorrências (reports)
✅ Relatórios diários
✅ Gestão de utilizadores
✅ Configurações do sistema
✅ Alertas em tempo real
✅ Permissões por papel (RBAC)
✅ Multilíngue (PT-BR, PT-AO, EN-US)
✅ Exportação para PDF
✅ PWA (Instalável como app)

---

## 📞 PRECISA DE AJUDA?

Se o servidor não funciona:
1. ✅ Verifique se `npm install` foi executado
2. ✅ Verifique a porta (deve ser 2026)
3. ✅ Verifique se a base de dados existe: `mina_seguranca.db`
4. ✅ Veja os logs do servidor (procure por erros)

---

**Status**: ✅ **FUNCIONANDO** - Aplicação pronta para uso!
