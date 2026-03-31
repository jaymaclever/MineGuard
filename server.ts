import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import crypto from "crypto";
import axios from "axios";
import cron from "node-cron";
import multer from "multer";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import http from "http";
import { generateDailyReport } from "./report_generator";

const db = new Database("mina_seguranca.db");

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "mineguard_jwt_secret_key_12345";

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT
  );
  CREATE TABLE IF NOT EXISTS role_weights (
    nivel_hierarquico TEXT PRIMARY KEY,
    peso INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nivel_hierarquico TEXT NOT NULL,
    permissao_nome TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(nivel_hierarquico, permissao_nome)
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    funcao TEXT NOT NULL,
    numero_mecanografico TEXT UNIQUE NOT NULL,
    nivel_hierarquico TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '123456'
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id INTEGER NOT NULL,
    titulo TEXT,
    categoria TEXT NOT NULL,
    gravidade TEXT NOT NULL,
    descricao TEXT NOT NULL,
    metadata TEXT,
    fotos_path TEXT,
    coords_lat REAL,
    coords_lng REAL,
    status TEXT DEFAULT 'Aberto',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agente_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS report_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    photo_path TEXT NOT NULL,
    caption TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
  );

  -- Seed default system settings if empty
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_name', 'MINEGUARD', 'Nome da aplicação');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_slogan', 'Security Operating System', 'Slogan da aplicação');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_theme_mode', 'dark', 'Modo de tema (light/dark)');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_theme_palette', 'orange', 'Paleta de cores (orange, blue, green, red, purple)');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_layout', 'default', 'Layout da aplicação (default, compact)');
`);

// Migration: Add password column if it doesn't exist (for existing databases)
try {
  db.prepare("SELECT password FROM users LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT '123456'");
    console.log("Migration: Added password column to users table.");
  } catch (alterErr) {
    console.error("Migration failed:", alterErr);
  }
}

// Migration: Add missing columns to reports table
const reportColumns = [
  { name: "titulo", type: "TEXT" },
  { name: "metadata", type: "TEXT" },
  { name: "coords_lat", type: "REAL" },
  { name: "coords_lng", type: "REAL" },
  { name: "status", type: "TEXT DEFAULT 'Aberto'" }
];

for (const col of reportColumns) {
  try {
    db.prepare(`SELECT ${col.name} FROM reports LIMIT 1`).get();
  } catch (e) {
    try {
      db.exec(`ALTER TABLE reports ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Migration: Added ${col.name} column to reports table.`);
    } catch (alterErr) {
      console.error(`Migration failed for ${col.name}:`, alterErr);
    }
  }
}

// Seed weights if empty
const weightsCount = db.prepare("SELECT COUNT(*) as count FROM role_weights").get() as any;
if (weightsCount.count === 0) {
  const insertWeight = db.prepare("INSERT INTO role_weights (nivel_hierarquico, peso) VALUES (?, ?)");
  const weights = [
    ['Superadmin', 100], ['Admin', 90], ['Sierra 1', 80], 
    ['Sierra 2', 70], ['Oficial', 60], ['Supervisor', 50], ['Agente', 40]
  ];
  weights.forEach(w => insertWeight.run(w[0], w[1]));
}

// Seed default permissions for Superadmin if empty
const permsCount = db.prepare("SELECT COUNT(*) as count FROM permissions").get() as any;
if (permsCount.count === 0) {
  const insertPerm = db.prepare("INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) VALUES (?, ?, ?)");
  const defaultPerms = [
    'view_dashboard', 'view_reports', 'create_reports', 'manage_users', 
    'manage_permissions', 'view_daily_reports', 'manage_settings', 'conclude_reports'
  ];
  defaultPerms.forEach(p => insertPerm.run('Superadmin', p, 1));
  // Sierra 1 defaults
  ['view_dashboard', 'view_reports', 'create_reports', 'view_daily_reports', 'conclude_reports'].forEach(p => insertPerm.run('Sierra 1', p, 1));
  // Oficial defaults
  ['view_dashboard', 'view_reports', 'create_reports', 'conclude_reports'].forEach(p => insertPerm.run('Oficial', p, 1));
  // Agente defaults
  ['view_reports', 'create_reports'].forEach(p => insertPerm.run('Agente', p, 1));
}

// Seed mock users if empty
const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
if (usersCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password) VALUES (?, ?, ?, ?, ?)");
  insertUser.run('Superadmin', 'Administrador do Sistema', 'superadmin', 'Superadmin', 'secret');
  insertUser.run('Ana Santos', 'Monitora de Perímetro', 'M-2055', 'Agente', '123456');
  insertUser.run('João Pereira', 'Supervisor de Turno', 'M-1542', 'Supervisor', '123456');
} else {
  // Garantir que o superadmin tenha as credenciais corretas
  const adminExists = db.prepare("SELECT id FROM users WHERE numero_mecanografico = ?").get('superadmin');
  if (adminExists) {
    db.prepare("UPDATE users SET password = ? WHERE numero_mecanografico = ?").run('secret', 'superadmin');
  } else {
    // Se não existir 'superadmin', mas existir 'M-1024', migrar
    const oldAdminExists = db.prepare("SELECT id FROM users WHERE numero_mecanografico = ?").get('M-1024');
    if (oldAdminExists) {
      db.prepare("UPDATE users SET numero_mecanografico = ?, password = ?, nome = ? WHERE numero_mecanografico = ?").run('superadmin', 'secret', 'Superadmin', 'M-1024');
    } else {
      // Caso contrário, inserir novo
      db.prepare("INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password) VALUES (?, ?, ?, ?, ?)").run('Superadmin', 'Administrador do Sistema', 'superadmin', 'Superadmin', 'secret');
    }
  }
}

// Seed mock reports if empty
const reportsCount = db.prepare("SELECT COUNT(*) as count FROM reports").get() as any;
if (reportsCount.count === 0) {
  const insertReport = db.prepare("INSERT INTO reports (agente_id, categoria, gravidade, descricao, coords_lat, coords_lng) VALUES (?, ?, ?, ?, ?, ?)");
  insertReport.run(2, 'Perímetro', 'G3', 'Cerca danificada no setor Norte, possível tentativa de intrusão.', -23.5505, -46.6333);
  insertReport.run(3, 'Safety', 'G2', 'Vazamento de óleo identificado na rampa principal.', -23.5510, -46.6340);
}

// Simple Encryption Key (In production, use a real secret from env)
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || "mineguard_secret_key_32_chars_!!";
// Ensure key is exactly 32 bytes for aes-256-cbc by padding or truncating
const ENCRYPTION_KEY = Buffer.alloc(32, ENCRYPTION_KEY_RAW);
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string) {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const server = http.createServer(app);
  const io = new Server(server);

  // Multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
  const upload = multer({ storage });

  app.use(cookieParser());
  app.use(express.json());
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ status: "error", message: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ status: "error", message: "Invalid token" });
    }
  };

  // Permission Middleware
  const checkPermission = (permission: string) => {
    return (req: any, res: any, next: any) => {
      const userPermissions = req.user.permissions || {};
      if (userPermissions[permission] === true) {
        next();
      } else {
        res.status(403).json({ status: "error", message: "Forbidden: Insufficient permissions" });
      }
    };
  };

  // Request Logging Middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  // --- Auth API ---
  app.post("/api/login", (req, res) => {
    const { numero_mecanografico, password } = req.body;
    console.log(`Tentativa de login: ${numero_mecanografico}`);
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE numero_mecanografico = ? AND password = ?").get(numero_mecanografico, password) as any;
      
      if (user) {
        console.log(`Login bem-sucedido para: ${user.nome}`);
        const permissions = db.prepare("SELECT permissao_nome, is_enabled FROM permissions WHERE nivel_hierarquico = ?").all(user.nivel_hierarquico) as any[];
        const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(user.nivel_hierarquico) as any)?.peso || 0;
        const token = jwt.sign({ 
          id: user.id, 
          nome: user.nome, 
          nivel_hierarquico: user.nivel_hierarquico,
          peso: userWeight,
          permissions: permissions.reduce((acc, p) => ({ ...acc, [p.permissao_nome]: !!p.is_enabled }), {})
        }, JWT_SECRET, { expiresIn: "24h" });
        
        res.cookie("token", token, { httpOnly: true, sameSite: "none", secure: true });
        res.json({ 
          status: "success", 
          user: { 
            id: user.id, 
            nome: user.nome, 
            nivel_hierarquico: user.nivel_hierarquico, 
            peso: userWeight,
            numero_mecanografico: user.numero_mecanografico,
            permissions: permissions.reduce((acc, p) => ({ ...acc, [p.permissao_nome]: !!p.is_enabled }), {})
          } 
        });
      } else {
        console.log(`Falha no login: Credenciais incorretas para ${numero_mecanografico}`);
        res.status(401).json({ status: "error", message: "Credenciais inválidas" });
      }
    } catch (dbErr) {
      console.error("Erro no banco de dados durante login:", dbErr);
      res.status(500).json({ status: "error", message: "Erro interno no servidor" });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ status: "success" });
  });

  app.get("/api/public/settings", (req, res) => {
    try {
      const keys = ['app_name', 'app_slogan', 'app_theme_mode', 'app_theme_palette', 'app_layout'];
      const placeholders = keys.map(() => '?').join(',');
      const settings = db.prepare(`SELECT key, value FROM system_settings WHERE key IN (${placeholders})`).all(...keys) as any[];
      
      const publicSettings: Record<string, string> = {};
      settings.forEach(s => {
        try {
          publicSettings[s.key] = decrypt(s.value);
        } catch (e) {
          publicSettings[s.key] = s.value; // Fallback if not encrypted yet
        }
      });
      
      res.json(publicSettings);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/me", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, nome, funcao, numero_mecanografico, nivel_hierarquico FROM users WHERE id = ?").get(req.user.id) as any;
    if (user) {
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(user.nivel_hierarquico) as any)?.peso || 0;
      const permissions = db.prepare("SELECT permissao_nome, is_enabled FROM permissions WHERE nivel_hierarquico = ?").all(user.nivel_hierarquico) as any[];
      user.peso = userWeight;
      user.permissions = permissions.reduce((acc, p) => ({ ...acc, [p.permissao_nome]: !!p.is_enabled }), {});
    }
    res.json(user);
  });

  // --- Report Scheduling (06:00 Every Morning) ---
  cron.schedule('0 6 * * *', () => {
    console.log('Iniciando geração automática do relatório diário (06:00)...');
    generateDailyReport();
  });

  // --- Report API ---
  app.get("/api/reports/daily", authenticate, checkPermission('view_daily_reports'), (req, res) => {
    const reportsDir = path.join(process.cwd(), "daily_reports");
    if (!fs.existsSync(reportsDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.endsWith('.html'))
      .map(f => ({
        name: f,
        date: f.split('_')[1].replace('.html', ''),
        url: `/api/reports/view/${f}`
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    res.json(files);
  });

  app.get("/api/reports/view/:filename", authenticate, checkPermission('view_daily_reports'), (req, res) => {
    const { filename } = req.params;
    const reportsDir = path.join(process.cwd(), "daily_reports");
    const filePath = path.join(reportsDir, filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("Relatório não encontrado.");
    }
  });

  app.post("/api/reports/generate-now", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      const filePath = generateDailyReport();
      res.json({ status: "ok", message: "Relatório gerado com sucesso.", file: path.basename(filePath) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // --- Settings API ---
  app.get("/api/settings", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      const settings = db.prepare("SELECT key, value, description FROM system_settings").all();
      const decryptedSettings = settings.map((s: any) => {
        try {
          return {
            ...s,
            value: decrypt(s.value)
          };
        } catch (e) {
          return { ...s, value: "" };
        }
      });
      res.json(decryptedSettings);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/settings", authenticate, checkPermission('manage_settings'), (req, res) => {
    const { settings } = req.body;
    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value, description) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, description=excluded.description
    `);

    const transaction = db.transaction((data) => {
      for (const s of data) {
        upsert.run(s.key, encrypt(s.value), s.description);
      }
    });

    transaction(settings);
    res.json({ status: "ok" });
  });

  app.post("/api/test-telegram", authenticate, checkPermission('manage_settings'), async (req, res) => {
    const { botToken, chatId } = req.body;
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: "Teste de Sistema MineGuard - Conexão Validada ✅",
        parse_mode: "HTML"
      });
      res.json({ status: "ok", data: response.data });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.response?.data?.description || error.message });
    }
  });

  // --- Stats API ---
  app.get("/api/stats", authenticate, checkPermission('view_dashboard'), (req: any, res) => {
    try {
      const userRole = req.user.nivel_hierarquico;
      const userId = req.user.id;
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(userRole) as any)?.peso || 0;

      let totalReports, totalUsers, reportsByCategory, reportsBySeverity, reportsLast7Days;

      if (userWeight < 60) {
        // Apenas as suas próprias estatísticas
        totalReports = (db.prepare("SELECT COUNT(*) as count FROM reports WHERE agente_id = ?").get(userId) as any).count;
        totalUsers = 1; 
        reportsByCategory = db.prepare("SELECT categoria as name, COUNT(*) as value FROM reports WHERE agente_id = ? GROUP BY categoria").all(userId);
        reportsBySeverity = db.prepare("SELECT gravidade as name, COUNT(*) as value FROM reports WHERE agente_id = ? GROUP BY gravidade").all(userId);
        reportsLast7Days = db.prepare(`
          SELECT date(timestamp) as date, COUNT(*) as count 
          FROM reports 
          WHERE agente_id = ? AND timestamp >= date('now', '-7 days') 
          GROUP BY date(timestamp)
          ORDER BY date ASC
        `).all(userId);
      } else {
        // Hierarquia (Oficial e acima)
        totalReports = (db.prepare(`
          SELECT COUNT(*) as count 
          FROM reports r
          JOIN users u ON r.agente_id = u.id
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ?
        `).get(userWeight) as any).count;
        
        totalUsers = (db.prepare(`
          SELECT COUNT(*) as count 
          FROM users u
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ?
        `).get(userWeight) as any).count;

        reportsByCategory = db.prepare(`
          SELECT r.categoria as name, COUNT(*) as value 
          FROM reports r
          JOIN users u ON r.agente_id = u.id
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ?
          GROUP BY r.categoria
        `).all(userWeight);

        reportsBySeverity = db.prepare(`
          SELECT r.gravidade as name, COUNT(*) as value 
          FROM reports r
          JOIN users u ON r.agente_id = u.id
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ?
          GROUP BY r.gravidade
        `).all(userWeight);

        reportsLast7Days = db.prepare(`
          SELECT date(r.timestamp) as date, COUNT(*) as count 
          FROM reports r
          JOIN users u ON r.agente_id = u.id
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ? AND r.timestamp >= date('now', '-7 days') 
          GROUP BY date(r.timestamp)
          ORDER BY date ASC
        `).all(userWeight);
      }

      res.json({
        totalReports,
        totalUsers,
        reportsByCategory,
        reportsBySeverity,
        reportsLast7Days
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // --- Users API CRUD ---
  app.get("/api/users", authenticate, checkPermission('manage_users'), (req, res) => {
    try {
      const users = db.prepare("SELECT id, nome, funcao, numero_mecanografico, nivel_hierarquico FROM users").all();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/users", authenticate, checkPermission('manage_users'), (req, res) => {
    try {
      const { nome, funcao, numero_mecanografico, nivel_hierarquico, password } = req.body;
      const stmt = db.prepare("INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password) VALUES (?, ?, ?, ?, ?)");
      const result = stmt.run(nome, funcao, numero_mecanografico, nivel_hierarquico, password || '123456');
      res.json({ status: "success", id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.put("/api/users/:id", authenticate, checkPermission('manage_users'), (req, res) => {
    try {
      const { id } = req.params;
      const { nome, funcao, numero_mecanografico, nivel_hierarquico, password } = req.body;
      
      let query = "UPDATE users SET nome = ?, funcao = ?, numero_mecanografico = ?, nivel_hierarquico = ?";
      const params = [nome, funcao, numero_mecanografico, nivel_hierarquico];
      
      if (password) {
        query += ", password = ?";
        params.push(password);
      }
      
      query += " WHERE id = ?";
      params.push(id);
      
      const stmt = db.prepare(query);
      stmt.run(...params);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.delete("/api/users/:id", authenticate, checkPermission('manage_users'), (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // --- Roles API CRUD ---
  app.get("/api/roles", authenticate, checkPermission('manage_permissions'), (req, res) => {
    const roles = db.prepare("SELECT nivel_hierarquico, peso FROM role_weights ORDER BY peso DESC").all();
    res.json(roles);
  });

  app.post("/api/roles", authenticate, checkPermission('manage_permissions'), (req, res) => {
    try {
      const { nivel_hierarquico, peso } = req.body;
      const stmt = db.prepare("INSERT INTO role_weights (nivel_hierarquico, peso) VALUES (?, ?)");
      stmt.run(nivel_hierarquico, peso);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.put("/api/roles/:oldName", authenticate, checkPermission('manage_permissions'), (req, res) => {
    try {
      const { oldName } = req.params;
      const { nivel_hierarquico, peso } = req.body;
      
      const transaction = db.transaction(() => {
        // Update weights
        db.prepare("UPDATE role_weights SET nivel_hierarquico = ?, peso = ? WHERE nivel_hierarquico = ?")
          .run(nivel_hierarquico, peso, oldName);
        
        // Update users referencing this role
        db.prepare("UPDATE users SET nivel_hierarquico = ? WHERE nivel_hierarquico = ?")
          .run(nivel_hierarquico, oldName);
          
        // Update permissions referencing this role
        db.prepare("UPDATE permissions SET nivel_hierarquico = ? WHERE nivel_hierarquico = ?")
          .run(nivel_hierarquico, oldName);
      });
      
      transaction();
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.delete("/api/roles/:name", authenticate, checkPermission('manage_permissions'), (req, res) => {
    try {
      const { name } = req.params;
      
      const transaction = db.transaction(() => {
        db.prepare("DELETE FROM role_weights WHERE nivel_hierarquico = ?").run(name);
        db.prepare("DELETE FROM permissions WHERE nivel_hierarquico = ?").run(name);
        // Note: Users with this role will have an invalid role, ideally we should reassign them
      });
      
      transaction();
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/permissions/:role", authenticate, checkPermission('manage_permissions'), (req, res) => {
    const { role } = req.params;
    const perms = db.prepare("SELECT permissao_nome, is_enabled FROM permissions WHERE nivel_hierarquico = ?").all(role);
    res.json(perms);
  });

  app.post("/api/permissions/:role", authenticate, checkPermission('manage_permissions'), (req, res) => {
    const { role } = req.params;
    const { permissions } = req.body; // Array of { name, enabled }
    
    const upsert = db.prepare(`
      INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) 
      VALUES (?, ?, ?) 
      ON CONFLICT(nivel_hierarquico, permissao_nome) DO UPDATE SET is_enabled=excluded.is_enabled
    `);

    const transaction = db.transaction((data) => {
      for (const p of data) {
        upsert.run(role, p.name, p.enabled ? 1 : 0);
      }
    });

    transaction(permissions);
    res.json({ status: "ok" });
  });

  // --- Migration Logic ---
  app.post("/api/roles/delete-admin", authenticate, checkPermission('manage_permissions'), (req, res) => {
    // Regra: Se 'Admin' for deletado, migrar permissões para 'Sierra 1'
    try {
      const transaction = db.transaction(() => {
        // 1. Pegar permissões do Admin
        const adminPerms = db.prepare("SELECT permissao_nome, is_enabled FROM permissions WHERE nivel_hierarquico = 'Admin'").all() as any[];
        
        // 2. Migrar para Sierra 1 (apenas se Sierra 1 não tiver a permissão ou se Admin tiver habilitado)
        const upsertSierra = db.prepare(`
          INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) 
          VALUES ('Sierra 1', ?, ?) 
          ON CONFLICT(nivel_hierarquico, permissao_nome) DO UPDATE SET is_enabled=excluded.is_enabled
        `);

        for (const p of adminPerms) {
          upsertSierra.run(p.permissao_nome, p.is_enabled);
        }

        // 3. Deletar Admin (dos pesos e permissões)
        db.prepare("DELETE FROM permissions WHERE nivel_hierarquico = 'Admin'").run();
        db.prepare("DELETE FROM role_weights WHERE nivel_hierarquico = 'Admin'").run();
      });

      transaction();
      res.json({ status: "ok", message: "Admin removido e permissões migradas para Sierra 1." });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // --- Hierarchical Reports API ---
  app.patch("/api/reports/:id/status", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Aberto', 'Concluído'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status inválido' });
    }

    // Reopening requires permission
    if (status === 'Aberto' && !req.user.permissions?.conclude_reports) {
      return res.status(403).json({ status: 'error', message: 'Permissão insuficiente para reabrir relatório' });
    }

    try {
      const result = db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
      if (result.changes > 0) {
        // Emit socket event for real-time update
        io.emit('report_updated', { id: parseInt(id), status });
        res.json({ status: 'success', message: `Relatório ${status.toLowerCase()} com sucesso` });
      } else {
        res.status(404).json({ status: 'error', message: 'Relatório não encontrado' });
      }
    } catch (err) {
      console.error("Erro ao atualizar status do relatório:", err);
      res.status(500).json({ status: 'error', message: 'Erro interno do servidor' });
    }
  });

  // Edit report (update description and/or photo) - only for open reports
  app.patch("/api/reports/:id", authenticate, upload.array("fotos", 20), (req: any, res) => {
    const { id } = req.params;
    const { descricao, captions } = req.body;

    try {
      // Check if report exists and is open
      const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as any;
      if (!report) {
        return res.status(404).json({ status: 'error', message: 'Relatório não encontrado' });
      }

      if (report.status !== 'Aberto') {
        return res.status(403).json({ status: 'error', message: 'Apenas relatórios abertos podem ser editados' });
      }

      // Check permission (only original agent or superadmin can edit)
      if (report.agente_id !== req.user.id && req.user.nivel_hierarquico !== 'Superadmin') {
        return res.status(403).json({ status: 'error', message: 'Permissão insuficiente para editar este relatório' });
      }

      let updateQuery = "UPDATE reports SET ";
      const values: any[] = [];

      if (descricao !== undefined && descricao !== null) {
        updateQuery += "descricao = ?, ";
        values.push(descricao);
      }

      // Remove trailing comma and space if there are updates
      if (values.length > 0) {
        updateQuery = updateQuery.slice(0, -2);
      } else {
        updateQuery = updateQuery.slice(0, -6); // Remove " SET "
      }
      
      if (values.length > 0) {
        updateQuery += " WHERE id = ?";
      } else {
        updateQuery = "UPDATE reports SET id = id WHERE id = ?"; // No-op if nothing to update
      }
      values.push(id);

      const result = values.length > 1 ? db.prepare(updateQuery).run(...values) : { changes: 0 };
      
      // Add new photos
      if (req.files && req.files.length > 0) {
        const photoCaptions = Array.isArray(captions) ? captions : (captions ? [captions] : []);
        const insertPhoto = db.prepare("INSERT INTO report_photos (report_id, photo_path, caption) VALUES (?, ?, ?)");
        
        req.files.forEach((file: any, index: number) => {
          const photoPath = `/uploads/${file.filename}`;
          const caption = photoCaptions[index] || '';
          insertPhoto.run(id, photoPath, caption);
        });
      }

      // Fetch updated report with photos
      const updatedReport = db.prepare(`
        SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel 
        FROM reports r 
        LEFT JOIN users u ON r.agente_id = u.id 
        WHERE r.id = ?
      `).get(id) as any;
      
      const photos = db.prepare("SELECT * FROM report_photos WHERE report_id = ?").all(id);
      updatedReport.photos = photos;

      io.emit('report_updated', updatedReport);
      res.json({ status: 'success', message: 'Relatório atualizado com sucesso', report: updatedReport });
    } catch (err: any) {
      console.error("Erro ao atualizar relatório:", err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.get("/api/reports", authenticate, checkPermission('view_reports'), (req: any, res) => {
    const userRole = req.user.nivel_hierarquico;
    const userId = req.user.id;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const severity = req.query.severity as string || '';
    
    // Pegar peso do usuário logado
    const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(userRole) as any)?.peso || 0;

    let query = `
      SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel
      FROM reports r
      JOIN users u ON r.agente_id = u.id
      JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
      WHERE 1=1
    `;
    const params: any[] = [];

    // Se o peso for inferior a 60 (Oficial), vê apenas as suas próprias ocorrências
    if (userWeight < 60) {
      query += ` AND r.agente_id = ?`;
      params.push(userId);
    } else {
      // Se for Oficial ou superior, vê a hierarquia (seu peso e abaixo)
      query += ` AND rw.peso <= ?`;
      params.push(userWeight);
    }

    if (search) {
      query += ` AND (r.descricao LIKE ? OR u.nome LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ` AND r.categoria = ?`;
      params.push(category);
    }
    if (severity) {
      query += ` AND r.gravidade = ?`;
      params.push(severity);
    }

    query += ` ORDER BY r.timestamp DESC`;

    const reports = db.prepare(query).all(...params) as any[];
    // Add photos to each report
    reports.forEach((report) => {
      report.photos = db.prepare("SELECT * FROM report_photos WHERE report_id = ?").all(report.id);
    });
    res.json(reports);
  });

  // --- Operational Reports API (All) ---
  app.get("/api/reports/all", authenticate, checkPermission('view_reports'), (req: any, res) => {
    try {
      const userRole = req.user.nivel_hierarquico;
      const userId = req.user.id;
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(userRole) as any)?.peso || 0;

      let query = `
        SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel
        FROM reports r
        JOIN users u ON r.agente_id = u.id
        JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userWeight < 60) {
        query += ` AND r.agente_id = ?`;
        params.push(userId);
      } else {
        query += ` AND rw.peso <= ?`;
        params.push(userWeight);
      }

      query += ` ORDER BY r.timestamp DESC`;
      const reports = db.prepare(query).all(...params) as any[];
      // Add photos to each report
      reports.forEach((report) => {
        report.photos = db.prepare("SELECT * FROM report_photos WHERE report_id = ?").all(report.id);
      });
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Personal Reports API - User's own reports with date range
  app.get("/api/reports/personal", authenticate, (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      let query = `
        SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel 
        FROM reports r 
        JOIN users u ON r.agente_id = u.id 
        WHERE r.agente_id = ?
      `;
      const params: any[] = [userId];

      if (startDate) {
        query += ` AND DATE(r.timestamp) >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND DATE(r.timestamp) <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY r.timestamp DESC`;

      const reports = db.prepare(query).all(...params) as any[];
      reports.forEach((report) => {
        report.photos = db.prepare("SELECT * FROM report_photos WHERE report_id = ?").all(report.id);
      });
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Daily Report Personal - User's consolidated daily report
  app.get("/api/reports/daily-personal", authenticate, (req: any, res) => {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      
      const reports = db.prepare(`
        SELECT r.* FROM reports r 
        WHERE r.agente_id = ? AND DATE(r.timestamp) = ?
      `).all(userId, today) as any[];

      const summary = {
        totalReports: reports.length,
        byGravity: { G1: 0, G2: 0, G3: 0, G4: 0 },
        byCategory: {} as any,
        reports: reports
      };

      reports.forEach((r: any) => {
        summary.byGravity[r.gravidade as keyof typeof summary.byGravity]++;
        summary.byCategory[r.categoria] = (summary.byCategory[r.categoria] || 0) + 1;
      });

      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Daily Report Team - Team's consolidated daily report (for supervisors/managers)
  app.get("/api/reports/daily-team", authenticate, (req: any, res) => {
    try {
      const userWeight = req.user.peso || 0;
      const today = new Date().toISOString().split('T')[0];

      // Get reports from team members (lower weight = lower hierarchy)
      const reports = db.prepare(`
        SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel
        FROM reports r
        JOIN users u ON r.agente_id = u.id
        JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
        WHERE rw.peso < ? AND DATE(r.timestamp) = ?
      `).all(userWeight, today) as any[];

      const summary = {
        totalReports: reports.length,
        byGravity: { G1: 0, G2: 0, G3: 0, G4: 0 },
        byCategory: {} as any,
        byAgent: {} as any,
        reports: reports
      };

      reports.forEach((r: any) => {
        summary.byGravity[r.gravidade as keyof typeof summary.byGravity]++;
        summary.byCategory[r.categoria] = (summary.byCategory[r.categoria] || 0) + 1;
        summary.byAgent[r.agente_nome] = (summary.byAgent[r.agente_nome] || 0) + 1;
      });

      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/reports", authenticate, checkPermission('create_reports'), upload.array("fotos", 20), async (req: any, res) => {
    try {
      const { titulo, categoria, gravidade, descricao, coords_lat, coords_lng, metadata, captions } = req.body;
      const agente_id = req.user.id;
      const fotos_path = req.files && req.files.length > 0 ? `/uploads/${req.files[0].filename}` : null;
      
      if (!categoria || !gravidade || !descricao) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
      }

      const stmt = db.prepare(`
        INSERT INTO reports (agente_id, titulo, categoria, gravidade, descricao, metadata, fotos_path, coords_lat, coords_lng, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const result = stmt.run(agente_id, titulo || null, categoria, gravidade, descricao, metadata || null, fotos_path, coords_lat || null, coords_lng || null);
      
      // Add photos to report_photos table
      if (req.files && req.files.length > 0) {
        const photoCaptions = Array.isArray(captions) ? captions : (captions ? [captions] : []);
        const insertPhoto = db.prepare("INSERT INTO report_photos (report_id, photo_path, caption) VALUES (?, ?, ?)");
        
        req.files.forEach((file: any, index: number) => {
          const photoPath = `/uploads/${file.filename}`;
          const caption = photoCaptions[index] || '';
          insertPhoto.run(result.lastInsertRowid, photoPath, caption);
        });
      }
      
      const newReport = {
        id: result.lastInsertRowid,
        agente_id,
        agente_nome: req.user.nome,
        titulo,
        categoria,
        gravidade,
        descricao,
        metadata: metadata ? JSON.parse(metadata) : null,
        fotos_path,
        coords_lat,
        coords_lng,
        status: 'Aberto',
        timestamp: new Date().toISOString()
      };

      // Notify via Socket.io
      io.emit("new_report", newReport);

      // Telegram Alert for G3/G4
      if (gravidade === 'G3' || gravidade === 'G4') {
        try {
          const settings = db.prepare("SELECT key, value FROM system_settings").all() as any[];
          const botToken = settings.find((s: any) => s.key === 'telegram_bot_token')?.value;
          const chatId = settings.find((s: any) => s.key === 'telegram_chat_id')?.value;

          if (botToken && chatId) {
            const decryptedToken = decrypt(botToken);
            const decryptedChatId = decrypt(chatId);
            
            const alertText = `
🚨 <b>ALERTA DE SEGURANÇA - ${gravidade}</b> 🚨
<b>Título:</b> ${titulo || 'Sem título'}
<b>Categoria:</b> ${categoria}
<b>Agente:</b> ${req.user.nome}
<b>Descrição:</b> ${descricao}
${coords_lat ? `<b>Local:</b> <a href="https://www.google.com/maps?q=${coords_lat},${coords_lng}">Ver no Mapa</a>` : ''}
            `;

            await axios.post(`https://api.telegram.org/bot${decryptedToken}/sendMessage`, {
              chat_id: decryptedChatId,
              text: alertText,
              parse_mode: "HTML"
            });
          }
        } catch (teleErr) {
          console.error("Erro ao enviar alerta Telegram:", teleErr);
        }
      }

      res.json({ status: "success", id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Catch-all for API routes that don't match
  app.all("/api/*", (req, res) => {
    res.status(404).json({ status: "error", message: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
