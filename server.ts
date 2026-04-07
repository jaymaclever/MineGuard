import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
import Database from "better-sqlite3";
import crypto from "crypto";
import axios from "axios";
import cron from "node-cron";
import multer from "multer";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import http from "http";
import https from "https";
import { execFileSync } from "child_process";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv";
import * as XLSX from "xlsx";
import {
  approveDailyReport,
  exportDailyReportsBatch,
  exportDailyReport,
  generateDailyReport,
  getDailyReportDetail,
  getDailyReportPreviewHtml,
  listDailyReports,
  updateDailyReportLifecycle,
} from "./report_generator";
import { getAlertAudienceLabel, matchesAlertAudience } from "./src/lib/alertAudience";

const db = new Database("mina_seguranca.db");
const LUANDA_SQL_OFFSET = "+1 hour";

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
    password TEXT NOT NULL DEFAULT '123456',
    preferred_language TEXT DEFAULT 'pt-BR'
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
    setor TEXT,
    pessoas_envolvidas INTEGER,
    equipamento TEXT,
    acao_imediata TEXT,
    requer_investigacao BOOLEAN DEFAULT 0,
    testemunhas TEXT,
    potencial_risco TEXT,
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

  CREATE TABLE IF NOT EXISTS report_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      added_by INTEGER,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(report_id, user_id),
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(added_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sector_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sector_name TEXT UNIQUE NOT NULL,
      location_type TEXT NOT NULL DEFAULT 'point',
      lat REAL,
      lng REAL,
      notes TEXT,
      updated_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'aviso',
    is_temporary BOOLEAN DEFAULT 1,
    expires_at TEXT,
    target_audience TEXT DEFAULT 'all',
    pinned BOOLEAN DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS alert_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read BOOLEAN DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alert_id, user_id),
    FOREIGN KEY(alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS telegram_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    gravidade TEXT NOT NULL,
    titulo TEXT,
    categoria TEXT,
    agente_nome TEXT,
    descricao TEXT,
    coords_lat REAL,
    coords_lng REAL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    target_id INTEGER,
    details TEXT,
    ip_address TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reports_categoria ON reports(categoria);
  CREATE INDEX IF NOT EXISTS idx_reports_gravidade ON reports(gravidade);
  CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports(timestamp);
  CREATE INDEX IF NOT EXISTS idx_reports_agente_timestamp ON reports(agente_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_sector_locations_name ON sector_locations(sector_name);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);

  -- Seed default system settings if empty
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_name', 'MINEGUARD', 'Nome da aplicação');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_slogan', 'Security Operating System', 'Slogan da aplicação');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_theme_mode', 'dark', 'Modo de tema (light/dark)');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_theme_palette', 'obsidian-amber', 'Paleta de cores do sistema');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_theme_template', 'executive', 'Template visual do sistema');
  INSERT OR IGNORE INTO system_settings (key, value, description) VALUES ('app_layout', 'default', 'Layout da aplicação (default, compact)');
`);

  try {
    const alertColumns = db.prepare("PRAGMA table_info(alerts)").all() as Array<{ name: string }>;
    const alertColumnNames = alertColumns.map((column) => column.name);
    if (!alertColumnNames.includes("is_temporary")) {
      db.exec("ALTER TABLE alerts ADD COLUMN is_temporary BOOLEAN DEFAULT 1;");
  }
  if (!alertColumnNames.includes("expires_at")) {
    db.exec("ALTER TABLE alerts ADD COLUMN expires_at TEXT;");
  }
  if (!alertColumnNames.includes("target_audience")) {
    db.exec("ALTER TABLE alerts ADD COLUMN target_audience TEXT DEFAULT 'all';");
  }
    if (!alertColumnNames.includes("pinned")) {
      db.exec("ALTER TABLE alerts ADD COLUMN pinned BOOLEAN DEFAULT 0;");
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_alerts_expires_at ON alerts(expires_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_target_audience ON alerts(target_audience);
    `);
  } catch (error) {
    console.error("Migration: unable to extend alerts table", error);
  }

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

// Migration: Add preferred_language column if it doesn't exist
try {
  db.prepare("SELECT preferred_language FROM users LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'pt-BR'");
    console.log("Migration: Added preferred_language column to users table.");
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
  { name: "status", type: "TEXT DEFAULT 'Aberto'" },
  { name: "setor", type: "TEXT" },
  { name: "pessoas_envolvidas", type: "INTEGER" },
  { name: "equipamento", type: "TEXT" },
  { name: "acao_imediata", type: "TEXT" },
  { name: "requer_investigacao", type: "BOOLEAN DEFAULT 0" },
  { name: "testemunhas", type: "TEXT" },
  { name: "potencial_risco", type: "TEXT" }
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

// Seed default permissions for all roles if empty
const permsCount = db.prepare("SELECT COUNT(*) as count FROM permissions").get() as any;
if (permsCount.count === 0) {
  const insertPerm = db.prepare("INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) VALUES (?, ?, ?)");
  
  // Define permissions matrix
  const rolePermissions: Record<string, string[]> = {
    'Superadmin': [
      'view_dashboard', 'view_reports', 'create_reports', 'conclude_reports', 'delete_reports',
      'view_daily_reports', 'view_team_daily', 'create_alerts', 'edit_own_alerts',
      'manage_users', 'manage_permissions', 'manage_settings', 'view_audit_logs',
      'view_personal_reports', 'view_personal_daily', 'export_reports'
    ],
    'Admin': [
      'view_dashboard', 'view_reports', 'create_reports', 'conclude_reports', 'delete_reports',
      'view_daily_reports', 'view_team_daily', 'create_alerts', 'edit_own_alerts',
      'manage_users', 'manage_permissions', 'manage_settings', 'view_audit_logs',
      'view_personal_reports', 'view_personal_daily', 'export_reports'
    ],
    'Sierra 1': [
      'view_dashboard', 'view_reports', 'create_reports', 'conclude_reports',
      'view_daily_reports', 'view_team_daily', 'create_alerts', 'edit_own_alerts',
      'manage_users', 'view_audit_logs', 'view_personal_reports', 'view_personal_daily',
      'export_reports'
    ],
    'Sierra 2': [
      'view_dashboard', 'view_reports', 'create_reports', 'conclude_reports',
      'view_daily_reports', 'view_team_daily', 'create_alerts', 'edit_own_alerts',
      'manage_users', 'view_audit_logs', 'view_personal_reports', 'view_personal_daily',
      'export_reports'
    ],
    'Oficial': [
      'view_dashboard', 'view_reports', 'create_reports', 'conclude_reports',
      'view_daily_reports', 'create_alerts', 'edit_own_alerts',
      'view_personal_reports', 'view_personal_daily', 'export_reports'
    ],
    'Supervisor': [
      'view_dashboard', 'view_reports', 'create_reports', 'conclude_reports',
      'view_daily_reports', 'view_team_daily', 'create_alerts', 'edit_own_alerts',
      'view_audit_logs', 'view_personal_reports', 'view_personal_daily', 'export_reports'
    ],
    'Agente': [
      'view_dashboard', 'view_reports', 'create_reports', 'edit_own_alerts',
      'view_personal_reports', 'view_personal_daily'
    ]
  };

  Object.entries(rolePermissions).forEach(([role, perms]) => {
    perms.forEach(p => insertPerm.run(role, p, 1));
  });
}

// Migration: Ensure 'delete_reports' permission is present for Superadmin and Admin
['Superadmin', 'Admin'].forEach(role => {
  const exists = db.prepare("SELECT 1 FROM permissions WHERE nivel_hierarquico = ? AND permissao_nome = ?").get(role, 'delete_reports');
  if (!exists) {
    db.prepare("INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) VALUES (?, ?, ?)").run(role, 'delete_reports', 1);
    console.log(`Migration: Added 'delete_reports' permission for ${role}`);
  }
});

// Seed mock users if empty
const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
if (usersCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password) VALUES (?, ?, ?, ?, ?)");
  insertUser.run('Superadmin', 'Administrador do Sistema', 'superadmin', 'Superadmin', bcrypt.hashSync('secret', 10));
  insertUser.run('Ana Santos', 'Monitora de Perímetro', 'M-2055', 'Agente', bcrypt.hashSync('123456', 10));
  insertUser.run('João Pereira', 'Supervisor de Turno', 'M-1542', 'Supervisor', bcrypt.hashSync('123456', 10));
} else {
  // Garantir que o superadmin tenha as credenciais corretas, this block is legacy and migrated to bcrypt
  const adminExists = db.prepare("SELECT id FROM users WHERE numero_mecanografico = ?").get('superadmin');
  if (!adminExists) {
    const oldAdminExists = db.prepare("SELECT id FROM users WHERE numero_mecanografico = ?").get('M-1024');
    if (oldAdminExists) {
      db.prepare("UPDATE users SET numero_mecanografico = ?, password = ?, nome = ? WHERE numero_mecanografico = ?").run('superadmin', bcrypt.hashSync('secret', 10), 'Superadmin', 'M-1024');
    } else {
      db.prepare("INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password) VALUES (?, ?, ?, ?, ?)").run('Superadmin', 'Administrador do Sistema', 'superadmin', 'Superadmin', bcrypt.hashSync('secret', 10));
    }
  }
}

// Migration: Ensure passwords are hashed securely
try {
  const usersToMigrate = db.prepare("SELECT id, password FROM users").all() as any[];
  usersToMigrate.forEach(u => {
    if (u.password && !u.password.startsWith('$2')) {
      const hash = bcrypt.hashSync(u.password, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, u.id);
    }
  });
  console.log("Migration: Ensured all passwords are encrypted.");
} catch (e) {
  console.error("Migration password fail:", e);
}

// Migration: Ensure approve_reports exists
try {
  const approvePermExists = db.prepare("SELECT COUNT(*) as count FROM permissions WHERE permissao_nome = 'approve_reports'").get() as any;
  if (approvePermExists.count === 0) {
    const insertPerm = db.prepare("INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) VALUES (?, 'approve_reports', 1)");
    ['Superadmin', 'Admin', 'Sierra 1', 'Sierra 2'].forEach(role => {
      try { insertPerm.run(role); } catch(e) {}
    });
    console.log("Migration: Added approve_reports permission to administrative roles.");
  }
} catch (e) {
  console.error(e);
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
  
  const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(process.cwd(), "certs", "key.pem");
  const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(process.cwd(), "certs", "cert.pem");
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 2026;
  const HTTP_REDIRECT_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : PORT - 1;
  const hasSslKey = fs.existsSync(SSL_KEY_PATH);
  const hasSslCert = fs.existsSync(SSL_CERT_PATH);
  
  let server: https.Server;
  console.log(`[SSL] Key path: ${SSL_KEY_PATH}`);
  console.log(`[SSL] Cert path: ${SSL_CERT_PATH}`);
  console.log(`[SSL] Key found: ${hasSslKey ? "yes" : "no"}`);
  console.log(`[SSL] Cert found: ${hasSslCert ? "yes" : "no"}`);

  const useHttps = hasSslKey && hasSslCert;

  if (useHttps) {
    const options = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    };
    server = https.createServer(options, app);
    console.log("[SSL] Servidor configurado com HTTPS.");
  } else {
    throw new Error("[SSL] HTTPS obrigatorio. Certificados ausentes ou invalidos. Esperado key=" + SSL_KEY_PATH + " cert=" + SSL_CERT_PATH);
  }

  const io = new Server(server);
  const socketPresence = new Map<string, number>();
  const emitOnlineUsersCount = () => {
    io.emit('online_users_count', new Set(socketPresence.values()).size);
  };

  io.on('connection', (socket) => {
    emitOnlineUsersCount();

    socket.on('presence:join', (userId: number) => {
      if (Number.isInteger(userId) && userId > 0) {
        socketPresence.set(socket.id, userId);
        emitOnlineUsersCount();
      }
    });

    socket.on('disconnect', () => {
      socketPresence.delete(socket.id);
      emitOnlineUsersCount();
    });
  });

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
  const importUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 }
  });

  app.use(cookieParser());
  app.use(express.json());
  
  // Disable cache in development
  if (process.env.NODE_ENV !== "production") {
    app.use((req, res, next) => {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
      next();
    });
  }
  
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
      // Superadmin bypass: Always allow access
      if (req.user?.nivel_hierarquico === 'Superadmin') {
        return next();
      }

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

  const normalizeImportHeader = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const pickImportCell = (row: Record<string, any>, aliases: string[]) => {
    const entries = Object.entries(row);
    for (const alias of aliases) {
      const normalizedAlias = normalizeImportHeader(alias);
      const match = entries.find(([key]) => normalizeImportHeader(key) === normalizedAlias);
      if (match && String(match[1] ?? '').trim() !== '') {
        return String(match[1]).trim();
      }
    }
    return '';
  };

  const normalizeImportedLanguage = (value: string) => {
    const normalized = normalizeImportHeader(value);
    if (normalized.startsWith('en')) return 'en';
    return 'pt';
  };

  const parseImportedUsersSheet = (buffer: Buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Nenhuma folha encontrada no ficheiro Excel.');
    }
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  };

  // --- Auth API ---
  app.post("/api/login", (req, res) => {
    const { numero_mecanografico, password } = req.body;
    console.log(`Tentativa de login: ${numero_mecanografico}`);
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE numero_mecanografico = ?").get(numero_mecanografico) as any;
      
      if (user && user.password && bcrypt.compareSync(password, user.password)) {
        console.log(`Login bem-sucedido para: ${user.nome}`);
        
        // Audit log success
        db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)").run(user.id, "LOGIN_SUCCESS", "User logged into the system");
        
        const permissions = db.prepare("SELECT permissao_nome, is_enabled FROM permissions WHERE nivel_hierarquico = ?").all(user.nivel_hierarquico) as any[];
        const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(user.nivel_hierarquico) as any)?.peso || 0;
        const token = jwt.sign({ 
          id: user.id, 
          nome: user.nome, 
          nivel_hierarquico: user.nivel_hierarquico,
          peso: userWeight,
          preferred_language: user.preferred_language || 'pt-BR',
          permissions: permissions.reduce((acc, p) => ({ ...acc, [p.permissao_nome]: !!p.is_enabled }), {})
        }, JWT_SECRET, { expiresIn: "24h" });
        
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie("token", token, { 
          httpOnly: true, 
          sameSite: isSecure ? "none" : "lax", 
          secure: isSecure 
        });
        res.json({ 
          status: "success", 
          user: { 
            id: user.id, 
            nome: user.nome, 
            nivel_hierarquico: user.nivel_hierarquico, 
            peso: userWeight,
            numero_mecanografico: user.numero_mecanografico,
            preferred_language: user.preferred_language || 'pt-BR',
            permissions: permissions.reduce((acc, p) => ({ ...acc, [p.permissao_nome]: !!p.is_enabled }), {})
          } 
        });
      } else {
        console.log(`Falha no login: Credenciais incorretas para ${numero_mecanografico}`);
        if (user) {
          db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)").run(user.id, "LOGIN_FAILED", "Invalid password attempt");
        }
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
      const keys = ['app_name', 'app_slogan', 'app_theme_mode', 'app_theme_palette', 'app_theme_template', 'app_layout'];
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
    const user = db.prepare("SELECT id, nome, funcao, numero_mecanografico, nivel_hierarquico, preferred_language FROM users WHERE id = ?").get(req.user.id) as any;
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
    try {
      const { search, from, to } = req.query as Record<string, string | undefined>;
      res.json(listDailyReports({ search, from, to }));
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/reports/daily/:id", authenticate, checkPermission('view_daily_reports'), (req, res) => {
    try {
      res.json(getDailyReportDetail(Number(req.params.id)));
    } catch (err: any) {
      res.status(404).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/reports/daily/:id/preview", authenticate, checkPermission('view_daily_reports'), (req, res) => {
    try {
      res.type("html").send(getDailyReportPreviewHtml(Number(req.params.id)));
    } catch (err: any) {
      res.status(404).send(err.message);
    }
  });

  app.get("/api/reports/daily/:id/export", authenticate, checkPermission('export_reports'), async (req, res) => {
    try {
      const format = String(req.query.format || "html") as "html" | "pdf" | "xlsx";
      if (!["html", "pdf", "xlsx"].includes(format)) {
        return res.status(400).json({ status: "error", message: "Formato de exportacao invalido." });
      }

      const file = await exportDailyReport(Number(req.params.id), format);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
      res.send(file.buffer);
    } catch (err: any) {
      res.status(404).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/reports/daily/export-batch", authenticate, checkPermission('export_reports'), async (req, res) => {
    try {
      const format = String(req.body?.format || "pdf") as "html" | "pdf" | "xlsx";
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: unknown) => Number(id)) : [];
      if (!["html", "pdf", "xlsx"].includes(format)) {
        return res.status(400).json({ status: "error", message: "Formato de exportacao invalido." });
      }

      const file = await exportDailyReportsBatch(ids, format);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
      res.send(file.buffer);
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message });
    }
  });

  app.patch("/api/reports/daily/:id/status", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      const status = String(req.body?.status || "");
      if (!["draft", "issued", "archived"].includes(status)) {
        return res.status(400).json({ status: "error", message: "Estado de relatorio invalido." });
      }

      const report = updateDailyReportLifecycle(Number(req.params.id), status as "draft" | "issued" | "archived");
      res.json({ status: "ok", report });
    } catch (err: any) {
      res.status(404).json({ status: "error", message: err.message });
    }
  });

  app.patch("/api/reports/daily/:id/approve", authenticate, checkPermission('manage_settings'), (req: any, res) => {
    try {
      const report = approveDailyReport(Number(req.params.id), {
        id: req.user.id,
        name: req.user.nome,
        role: req.user.nivel_hierarquico || req.user.funcao || "Responsavel",
      });
      res.json({ status: "ok", report });
    } catch (err: any) {
      res.status(404).json({ status: "error", message: err.message });
    }
  });

  const canGenerateDailyReports = (user: any) => {
    const role = String(user?.nivel_hierarquico || user?.funcao || '').toLowerCase();
    return (
      user?.nivel_hierarquico === 'Superadmin' ||
      user?.permissions?.manage_settings === true ||
      ['oficial', 'sierra 1', 'sierra 2', 'supervisor', 'admin'].includes(role)
    );
  };

  const canAccessMap = (user: any) => {
    const role = String(user?.nivel_hierarquico || user?.funcao || '').toLowerCase();
    return (
      user?.nivel_hierarquico === 'Superadmin' ||
      user?.permissions?.manage_settings === true ||
      ['oficial', 'sierra 1', 'sierra 2', 'supervisor', 'admin'].includes(role)
    );
  };

  const requireMapAccess = (req: any, res: any, next: any) => {
    if (!canAccessMap(req.user)) {
      return res.status(403).json({ status: "error", message: "Forbidden: Insufficient permissions" });
    }
    next();
  };

  const getDecryptedSettingValue = (key: string, fallback = '') => {
    const setting = db.prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as { value?: string } | undefined;
    if (!setting?.value) return fallback;
    try {
      return decrypt(setting.value);
    } catch (error) {
      return setting.value || fallback;
    }
  };

  const listConfiguredSectors = () =>
    getDecryptedSettingValue('form_sectors', '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const listSectorLocations = () => {
    const configuredSectors = Array.from(new Set(listConfiguredSectors()));
    const savedLocations = db.prepare(`
      SELECT sl.id, sl.sector_name, sl.location_type, sl.lat, sl.lng, sl.notes, sl.updated_at, sl.updated_by, u.nome as updated_by_name
      FROM sector_locations sl
      LEFT JOIN users u ON u.id = sl.updated_by
      ORDER BY sl.sector_name COLLATE NOCASE ASC
    `).all() as any[];

    const bySector = new Map(savedLocations.map((location) => [String(location.sector_name), location]));
    const merged = configuredSectors.map((sectorName) => {
      const saved = bySector.get(sectorName);
      return {
        id: saved?.id ?? null,
        sector_name: sectorName,
        location_type: saved?.location_type ?? 'point',
        lat: saved?.lat ?? null,
        lng: saved?.lng ?? null,
        notes: saved?.notes ?? '',
        is_mapped: Number.isFinite(Number(saved?.lat)) && Number.isFinite(Number(saved?.lng)),
        updated_at: saved?.updated_at ?? null,
        updated_by: saved?.updated_by ?? null,
        updated_by_name: saved?.updated_by_name ?? null,
      };
    });

    savedLocations.forEach((location) => {
      if (!configuredSectors.includes(String(location.sector_name))) {
        merged.push({
          ...location,
          is_mapped: Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng)),
        });
      }
    });

    return merged.sort((a, b) => String(a.sector_name).localeCompare(String(b.sector_name), 'pt'));
  };

  app.post("/api/reports/generate-now", authenticate, (req: any, res, next) => {
    if (!canGenerateDailyReports(req.user)) {
      return res.status(403).json({ status: "error", message: "Forbidden: Insufficient permissions" });
    }
    next();
  }, (req: any, res) => {
    try {
      const { date } = req.body || {};
      const result = generateDailyReport({ date, generatedBy: req.user?.id ?? null });
      res.json({
        status: "ok",
        message: "Relatorio gerado com sucesso.",
        file: path.basename(result.filePath),
        reportId: result.id,
        reportDate: result.snapshot.reportDate,
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/map/sectors", authenticate, (req, res) => {
    try {
      res.json({ status: "ok", sectors: listSectorLocations() });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.put("/api/map/sectors", authenticate, requireMapAccess, (req: any, res) => {
    try {
      const sectorName = String(req.body?.sector_name || '').trim();
      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      const notes = String(req.body?.notes || '').trim();

      if (!sectorName) {
        return res.status(400).json({ status: "error", message: "Sector name is required." });
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ status: "error", message: "Valid coordinates are required." });
      }

      const knownSectors = listConfiguredSectors();
      if (knownSectors.length > 0 && !knownSectors.includes(sectorName)) {
        return res.status(400).json({ status: "error", message: "Unknown sector." });
      }

      db.prepare(`
        INSERT INTO sector_locations (sector_name, location_type, lat, lng, notes, updated_by, updated_at)
        VALUES (?, 'point', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(sector_name) DO UPDATE SET
          location_type = 'point',
          lat = excluded.lat,
          lng = excluded.lng,
          notes = excluded.notes,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `).run(sectorName, lat, lng, notes, req.user.id);

      res.json({
        status: "ok",
        message: "Localização do setor guardada com sucesso.",
        sectors: listSectorLocations(),
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.delete("/api/map/sectors/:sectorName", authenticate, requireMapAccess, (req, res) => {
    try {
      const sectorName = decodeURIComponent(String(req.params.sectorName || '')).trim();
      if (!sectorName) {
        return res.status(400).json({ status: "error", message: "Sector name is required." });
      }

      db.prepare("DELETE FROM sector_locations WHERE sector_name = ?").run(sectorName);
      res.json({
        status: "ok",
        message: "Localização do setor removida com sucesso.",
        sectors: listSectorLocations(),
      });
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

  // --- Backup API ---
  const backupsDir = path.join(process.cwd(), 'backups');
  const ensureBackupsDir = () => {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
  };

  const getDatabaseInfo = () => {
    const dbPath = path.join(process.cwd(), 'mina_seguranca.db');
    const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
    return {
      exists: Boolean(stats),
      size: stats?.size || 0,
      modifiedAt: stats ? stats.mtime.toISOString() : null,
    };
  };

  const listBackupFiles = () => {
    ensureBackupsDir();
    return fs.readdirSync(backupsDir)
      .filter((file) => file.endsWith('.db') || file.endsWith('.backup'))
      .map((file) => {
        const fullPath = path.join(backupsDir, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
        })
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  };

  const createDatabaseBackupSnapshot = (suffix = 'manual') => {
    ensureBackupsDir();
    const dbPath = path.join(process.cwd(), 'mina_seguranca.db');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mineguard-${suffix}-${stamp}.backup`;
    const targetPath = path.join(backupsDir, filename);
    fs.copyFileSync(dbPath, targetPath);
    return targetPath;
  };

  const clearDirectoryFiles = (directoryPath: string) => {
    if (!fs.existsSync(directoryPath)) return;
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.rmSync(fullPath, { force: true });
      }
    }
  };

  const getReportParticipants = (reportId: number | string) =>
    db.prepare(`
      SELECT
        rp.id,
        rp.report_id,
        rp.user_id,
        rp.added_at,
        u.nome,
        u.funcao,
        u.numero_mecanografico,
        u.nivel_hierarquico
      FROM report_participants rp
      JOIN users u ON u.id = rp.user_id
      WHERE rp.report_id = ?
      ORDER BY u.nome COLLATE NOCASE ASC
    `).all(reportId) as any[];

  const hydrateReportRelations = (report: any, currentUserId?: number) => {
    if (!report) return report;
    report.photos = db.prepare("SELECT * FROM report_photos WHERE report_id = ? ORDER BY id DESC").all(report.id);
    report.participants = getReportParticipants(report.id);
    report.can_edit =
      currentUserId != null &&
      (report.agente_id === currentUserId || report.participants.some((participant: any) => participant.user_id === currentUserId));
    return report;
  };

  const userCanEditReport = (reportId: number | string, userId: number, role: string) => {
    if (role === 'Superadmin') return true;
    const report = db.prepare("SELECT agente_id FROM reports WHERE id = ?").get(reportId) as any;
    if (!report) return false;
    if (report.agente_id === userId) return true;
    const participant = db.prepare("SELECT 1 FROM report_participants WHERE report_id = ? AND user_id = ?").get(reportId, userId);
    return Boolean(participant);
  };

  const parseParticipantIds = (rawValue: unknown) => {
    if (rawValue == null) return [] as number[];
    let values: unknown[] = [];

    if (Array.isArray(rawValue)) {
      values = rawValue;
    } else if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        values = Array.isArray(parsed) ? parsed : [rawValue];
      } catch {
        values = rawValue.includes(',') ? rawValue.split(',') : [rawValue];
      }
    } else {
      values = [rawValue];
    }

    return Array.from(
      new Set(
        values
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
  };

  const isGitRepo = () => fs.existsSync(path.join(process.cwd(), '.git'));

  const runGit = (args: string[]) => execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  app.get("/api/backup", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `mineguard-backup-${timestamp}.db`;
      const dbPath = path.join(process.cwd(), 'mina_seguranca.db');
      
      res.download(dbPath, filename, (err) => {
        if (err) console.error("Backup download error:", err);
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: "Erro ao fazer backup" });
    }
  });

  app.get("/api/backup/status", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      res.json({
        status: "ok",
        database: getDatabaseInfo(),
        backups: listBackupFiles(),
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message || "Erro ao ler estado do backup" });
    }
  });

  app.post("/api/backup/restore", authenticate, checkPermission('manage_settings'), (req: any, res) => {
    try {
      if (!req.files || !req.files.backupFile) {
        return res.status(400).json({ status: "error", message: "Arquivo não fornecido" });
      }

      const backupFileArray = req.files.backupFile as any[];
      const backupFile = Array.isArray(backupFileArray) ? backupFileArray[0] : backupFileArray;
      const dbPath = path.join(process.cwd(), 'mina_seguranca.db');
      ensureBackupsDir();
      const backupPath = path.join(backupsDir, `mina_seguranca-${Date.now()}.backup`);

      fs.copyFileSync(dbPath, backupPath);
      fs.writeFileSync(dbPath, backupFile.data || backupFile);

      res.json({ status: "ok", message: "Backup restaurado com sucesso", backupPath });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/system/reset", authenticate, checkPermission('manage_settings'), (req: any, res) => {
    try {
      const confirmation = String(req.body?.confirmation || '').trim().toUpperCase();
      if (confirmation !== 'REPOR') {
        return res.status(400).json({ status: "error", message: "Confirmação inválida. Escreva REPOR para continuar." });
      }

      const backupPath = createDatabaseBackupSnapshot('pre-reset');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const reportsDir = path.join(process.cwd(), 'daily_reports');

      const resetTransaction = db.transaction(() => {
        db.prepare("DELETE FROM alert_reads").run();
        db.prepare("DELETE FROM alerts").run();
        db.prepare("DELETE FROM report_participants").run();
        db.prepare("DELETE FROM report_photos").run();
        db.prepare("DELETE FROM telegram_queue").run();
        db.prepare("DELETE FROM reports").run();
        db.prepare("DELETE FROM daily_reports_archive").run();
        db.prepare("DELETE FROM audit_logs").run();
        db.prepare("DELETE FROM users").run();

        db.prepare(`
          INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password, preferred_language)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          'Superadmin',
          'Administrador do Sistema',
          'superadmin',
          'Superadmin',
          bcrypt.hashSync('secret', 10),
          'pt',
        );

        db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)").run(
          null,
          'SYSTEM_RESET',
          'Sistema reposto para configuração inicial com superadmin padrão.',
        );
      });

      resetTransaction();

      clearDirectoryFiles(uploadsDir);
      clearDirectoryFiles(reportsDir);

      io.emit('reports_cleared');
      io.emit('alerts_cleared');
      io.emit('users_reset');

      res.json({
        status: "ok",
        message: "Sistema reposto com sucesso. O acesso volta ao utilizador superadmin.",
        credentials: { numero_mecanografico: 'superadmin', password: 'secret' },
        backupPath,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message || "Falha ao repor o sistema." });
    }
  });

  // --- Stats API ---
  app.get("/api/stats", authenticate, checkPermission('view_dashboard'), (req: any, res) => {
    try {
      const userRole = req.user.nivel_hierarquico;
      const userId = req.user.id;
      const range = req.query.range as string || '7days';
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(userRole) as any)?.peso || 0;

      let dateFilter = `AND datetime(timestamp, '${LUANDA_SQL_OFFSET}') >= datetime('now', '${LUANDA_SQL_OFFSET}', '-7 days')`;
      let chartRange = "-7 days";
      let customValues: string[] = [];
      
      if (range === 'today') {
        dateFilter = `AND date(timestamp, '${LUANDA_SQL_OFFSET}') = date('now', '${LUANDA_SQL_OFFSET}')`;
        chartRange = "0 days"; // Just today
      } else if (range === '30days') {
        dateFilter = `AND datetime(timestamp, '${LUANDA_SQL_OFFSET}') >= datetime('now', '${LUANDA_SQL_OFFSET}', '-30 days')`;
        chartRange = "-30 days";
      } else if (range === 'custom') {
        if (!from || !to) {
          return res.status(400).json({ status: "error", message: "Parâmetros 'from' e 'to' são obrigatórios" });
        }
        if (from > to) {
          return res.status(400).json({ status: "error", message: "Intervalo inválido" });
        }
        dateFilter = `AND date(timestamp, '${LUANDA_SQL_OFFSET}') BETWEEN date(?) AND date(?)`;
        customValues = [from, to];
      }

      let totalReports, totalUsers, reportsByCategory, reportsBySeverity, reportsLast7Days;

      if (userWeight < 60) {
        totalReports = (db.prepare(`SELECT COUNT(*) as count FROM reports WHERE agente_id = ? ${dateFilter}`).get(userId, ...customValues) as any).count;
        totalUsers = 1; 
        reportsByCategory = db.prepare(`SELECT categoria as name, COUNT(*) as value FROM reports WHERE agente_id = ? ${dateFilter} GROUP BY categoria`).all(userId, ...customValues);
        reportsBySeverity = db.prepare(`SELECT gravidade as name, COUNT(*) as value FROM reports WHERE agente_id = ? ${dateFilter} GROUP BY gravidade`).all(userId, ...customValues);
        reportsLast7Days = range === 'custom'
          ? db.prepare(`
              SELECT date(timestamp, '${LUANDA_SQL_OFFSET}') as date, COUNT(*) as count 
              FROM reports 
              WHERE agente_id = ? AND date(timestamp, '${LUANDA_SQL_OFFSET}') BETWEEN date(?) AND date(?) 
              GROUP BY date(timestamp, '${LUANDA_SQL_OFFSET}')
              ORDER BY date ASC
            `).all(userId, ...customValues)
          : db.prepare(`
              SELECT date(timestamp, '${LUANDA_SQL_OFFSET}') as date, COUNT(*) as count 
              FROM reports 
              WHERE agente_id = ? AND datetime(timestamp, '${LUANDA_SQL_OFFSET}') >= datetime('now', '${LUANDA_SQL_OFFSET}', ?) 
              GROUP BY date(timestamp, '${LUANDA_SQL_OFFSET}')
              ORDER BY date ASC
            `).all(userId, chartRange);
      } else {
        totalReports = (db.prepare(`
          SELECT COUNT(*) as count 
          FROM reports r
          JOIN users u ON r.agente_id = u.id
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ? ${dateFilter.replace('timestamp', 'r.timestamp')}
        `).get(userWeight, ...customValues) as any).count;
        
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
          WHERE rw.peso <= ? ${dateFilter.replace('timestamp', 'r.timestamp')}
          GROUP BY r.categoria
        `).all(userWeight, ...customValues);

        reportsBySeverity = db.prepare(`
          SELECT r.gravidade as name, COUNT(*) as value 
          FROM reports r
          JOIN users u ON r.agente_id = u.id
          JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
          WHERE rw.peso <= ? ${dateFilter.replace('timestamp', 'r.timestamp')}
          GROUP BY r.gravidade
        `).all(userWeight, ...customValues);

        reportsLast7Days = range === 'custom'
          ? db.prepare(`
              SELECT date(r.timestamp, '${LUANDA_SQL_OFFSET}') as date, COUNT(*) as count 
              FROM reports r
              JOIN users u ON r.agente_id = u.id
              JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
              WHERE rw.peso <= ? AND date(r.timestamp, '${LUANDA_SQL_OFFSET}') BETWEEN date(?) AND date(?) 
              GROUP BY date(r.timestamp, '${LUANDA_SQL_OFFSET}')
              ORDER BY date ASC
            `).all(userWeight, ...customValues)
          : db.prepare(`
              SELECT date(r.timestamp, '${LUANDA_SQL_OFFSET}') as date, COUNT(*) as count 
              FROM reports r
              JOIN users u ON r.agente_id = u.id
              JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
              WHERE rw.peso <= ? AND datetime(r.timestamp, '${LUANDA_SQL_OFFSET}') >= datetime('now', '${LUANDA_SQL_OFFSET}', ?) 
              GROUP BY date(r.timestamp, '${LUANDA_SQL_OFFSET}')
              ORDER BY date ASC
            `).all(userWeight, chartRange);
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
      const users = db.prepare("SELECT id, nome, funcao, numero_mecanografico, nivel_hierarquico, preferred_language FROM users").all();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/users/import-excel", authenticate, checkPermission('manage_users'), importUpload.single('file'), (req: any, res) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ status: "error", message: "Selecione um ficheiro Excel para importar." });
      }

      const rows = parseImportedUsersSheet(req.file.buffer);
      if (!rows.length) {
        return res.status(400).json({ status: "error", message: "A planilha está vazia." });
      }

      const validRoles = new Set(
        (db.prepare("SELECT nivel_hierarquico FROM role_weights").all() as Array<{ nivel_hierarquico: string }>)
          .map((role) => role.nivel_hierarquico)
      );
      const existingNumbers = new Set(
        (db.prepare("SELECT numero_mecanografico FROM users").all() as Array<{ numero_mecanografico: string }>)
          .map((user) => String(user.numero_mecanografico).trim().toLowerCase())
      );
      const numbersInFile = new Set<string>();
      const insertUserStmt = db.prepare(
        "INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password, preferred_language) VALUES (?, ?, ?, ?, ?, ?)"
      );

      let imported = 0;
      let ignoredExisting = 0;
      const ignoredInvalid: Array<{ row: number; reason: string; numero_mecanografico?: string }> = [];

      const importTransaction = db.transaction(() => {
        rows.forEach((rawRow, index) => {
          const rowNumber = index + 2;
          const nome = pickImportCell(rawRow, ['nome', 'name', 'agente']);
          const funcao = pickImportCell(rawRow, ['funcao', 'função', 'cargo', 'role_function']);
          const numero = pickImportCell(rawRow, ['numero_mecanografico', 'número mecanográfico', 'numero', 'mecanografico', 'username', 'utilizador']);
          const nivel = pickImportCell(rawRow, ['nivel_hierarquico', 'nível hierárquico', 'nivel', 'perfil', 'role']);
          const password = pickImportCell(rawRow, ['password', 'senha']);
          const preferredLanguage = pickImportCell(rawRow, ['preferred_language', 'idioma', 'language']);

          if (!nome && !funcao && !numero && !nivel) {
            return;
          }

          if (!nome || !funcao || !numero || !nivel) {
            ignoredInvalid.push({ row: rowNumber, reason: 'Linha incompleta', numero_mecanografico: numero || undefined });
            return;
          }

          if (!validRoles.has(nivel)) {
            ignoredInvalid.push({ row: rowNumber, reason: `Perfil inválido: ${nivel}`, numero_mecanografico: numero });
            return;
          }

          const normalizedNumber = numero.trim().toLowerCase();
          if (numbersInFile.has(normalizedNumber)) {
            ignoredInvalid.push({ row: rowNumber, reason: 'Número mecanográfico duplicado na planilha', numero_mecanografico: numero });
            return;
          }
          numbersInFile.add(normalizedNumber);

          if (existingNumbers.has(normalizedNumber)) {
            ignoredExisting += 1;
            return;
          }

          insertUserStmt.run(
            nome.trim(),
            funcao.trim(),
            numero.trim(),
            nivel,
            bcrypt.hashSync((password || '123456').trim(), 10),
            normalizeImportedLanguage(preferredLanguage)
          );
          existingNumbers.add(normalizedNumber);
          imported += 1;
        });
      });

      importTransaction();

      res.json({
        status: "success",
        summary: {
          imported,
          ignored_existing: ignoredExisting,
          ignored_invalid: ignoredInvalid.length,
          processed_rows: rows.length
        },
        ignored_invalid_rows: ignoredInvalid.slice(0, 30)
      });
    } catch (err: any) {
      console.error("Erro ao importar utilizadores por Excel:", err);
      res.status(500).json({ status: "error", message: err.message || "Erro ao importar utilizadores." });
    }
  });

  app.get("/api/users/report-participants", authenticate, checkPermission('create_reports'), (req: any, res) => {
    try {
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(req.user.nivel_hierarquico) as any)?.peso || 0;
      let query = `
        SELECT u.id, u.nome, u.funcao, u.numero_mecanografico, u.nivel_hierarquico, u.preferred_language
        FROM users u
        JOIN role_weights rw ON rw.nivel_hierarquico = u.nivel_hierarquico
        WHERE u.id != ?
      `;
      const params: any[] = [req.user.id];

      if (req.user.nivel_hierarquico !== 'Superadmin') {
        query += ` AND rw.peso <= ?`;
        params.push(userWeight);
      }

      query += ` ORDER BY u.nome COLLATE NOCASE ASC`;
      res.json(db.prepare(query).all(...params));
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/users", authenticate, checkPermission('manage_users'), (req, res) => {
    try {
      const { nome, funcao, numero_mecanografico, nivel_hierarquico, password, preferred_language } = req.body;
      const hashedPassword = bcrypt.hashSync(password || '123456', 10);
      const stmt = db.prepare("INSERT INTO users (nome, funcao, numero_mecanografico, nivel_hierarquico, password, preferred_language) VALUES (?, ?, ?, ?, ?, ?)");
      const result = stmt.run(nome, funcao, numero_mecanografico, nivel_hierarquico, hashedPassword, preferred_language || 'pt');
      res.json({ status: "success", id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.put("/api/users/:id", authenticate, checkPermission('manage_users'), (req, res) => {
    try {
      const { id } = req.params;
      const { nome, funcao, numero_mecanografico, nivel_hierarquico, password, preferred_language } = req.body;
      
      let query = "UPDATE users SET nome = ?, funcao = ?, numero_mecanografico = ?, nivel_hierarquico = ?, preferred_language = ?";
      const params = [nome, funcao, numero_mecanografico, nivel_hierarquico, preferred_language || 'pt'];
      
      if (password && password.trim().length > 0) {
        query += ", password = ?";
        params.push(bcrypt.hashSync(password, 10));
      }
      
      query += " WHERE id = ?";
      params.push(id);
      
      const stmt = db.prepare(query);
      stmt.run(...params);
      const updatedUser = db
        .prepare("SELECT id, nome, funcao, numero_mecanografico, nivel_hierarquico, preferred_language FROM users WHERE id = ?")
        .get(id);
      res.json({ status: "success", user: updatedUser });
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
  app.patch("/api/reports/:id(\\d+)/status", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Aberto', 'Concluído', 'Aprovado'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status inválido' });
    }

    // Reopening requires permission
    if (status === 'Aberto' && !req.user.permissions?.conclude_reports) {
      return res.status(403).json({ status: 'error', message: 'Permissão insuficiente para reabrir relatório' });
    }

    if (status === 'Aprovado' && !req.user.permissions?.approve_reports) {
      return res.status(403).json({ status: 'error', message: 'Permissão insuficiente para aprovar relatórios' });
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
  app.patch("/api/reports/:id(\\d+)", authenticate, upload.array("fotos", 20), (req: any, res) => {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      setor,
      coords_lat,
      coords_lng,
      equipamento,
      acao_imediata,
      testemunhas,
      potencial_risco,
        metadata,
        captions,
        participant_ids
      } = req.body;

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
      if (!userCanEditReport(id, req.user.id, req.user.nivel_hierarquico)) {
        return res.status(403).json({ status: 'error', message: 'Permissão insuficiente para editar este relatório' });
      }

      let updateQuery = "UPDATE reports SET ";
      const values: any[] = [];

      const editableFields = [
        { key: "titulo", value: titulo },
        { key: "descricao", value: descricao },
        { key: "setor", value: setor },
        { key: "coords_lat", value: coords_lat },
        { key: "coords_lng", value: coords_lng },
        { key: "equipamento", value: equipamento },
        { key: "acao_imediata", value: acao_imediata },
        { key: "testemunhas", value: testemunhas },
        { key: "potencial_risco", value: potencial_risco },
        { key: "metadata", value: metadata }
      ];

      editableFields.forEach(({ key, value }) => {
        if (value !== undefined && value !== null) {
          updateQuery += `${key} = ?, `;
          values.push(value);
        }
      });

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

      if (participant_ids !== undefined) {
        const participantIds = parseParticipantIds(participant_ids).filter((userId) => userId !== report.agente_id);
        db.prepare("DELETE FROM report_participants WHERE report_id = ?").run(id);

        if (participantIds.length > 0) {
          const existingUsers = db.prepare(
            `SELECT id FROM users WHERE id IN (${participantIds.map(() => '?').join(',')})`
          ).all(...participantIds) as Array<{ id: number }>;
          const insertParticipant = db.prepare(
            "INSERT OR IGNORE INTO report_participants (report_id, user_id, added_by) VALUES (?, ?, ?)"
          );
          existingUsers.forEach((user) => {
            insertParticipant.run(id, user.id, req.user.id);
          });
        }
      }

      // Fetch updated report with photos
      const updatedReport = db.prepare(`
        SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel 
        FROM reports r 
        LEFT JOIN users u ON r.agente_id = u.id 
        WHERE r.id = ?
      `).get(id) as any;
      
      hydrateReportRelations(updatedReport, req.user.id);

      io.emit('report_updated', updatedReport);
      res.json({ status: 'success', message: 'Relatório atualizado com sucesso', report: updatedReport });
    } catch (err: any) {
      console.error("Erro ao atualizar relatório:", err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

    app.get("/api/reports/:id(\\d+)", authenticate, checkPermission('view_reports'), (req: any, res) => {
      try {
        const { id } = req.params;
        const report = db.prepare(`
          SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel
        FROM reports r
        LEFT JOIN users u ON r.agente_id = u.id
        WHERE r.id = ?
      `).get(id) as any;

        if (!report) {
          return res.status(404).json({ status: 'error', message: 'Relatório não encontrado' });
        }

        const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(req.user.nivel_hierarquico) as any)?.peso || 0;
        const reportWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(report.agente_nivel) as any)?.peso || 0;
        const canView =
          req.user.nivel_hierarquico === 'Superadmin' ||
          report.agente_id === req.user.id ||
          Boolean(db.prepare("SELECT 1 FROM report_participants WHERE report_id = ? AND user_id = ?").get(id, req.user.id)) ||
          (userWeight >= 60 && reportWeight <= userWeight);

        if (!canView) {
          return res.status(403).json({ status: 'error', message: 'Permissão insuficiente para visualizar este relatório' });
        }

        hydrateReportRelations(report, req.user.id);
        res.json({ status: 'success', report });
      } catch (err: any) {
        console.error("Erro ao obter relatório:", err);
        res.status(500).json({ status: 'error', message: err.message });
      }
  });

  app.get("/api/github/status", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      if (!isGitRepo()) {
        return res.json({
          status: "ok",
          repoAvailable: false,
          message: "Repositório Git não encontrado neste diretório.",
        });
      }

      const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
      const commit = runGit(['rev-parse', '--short', 'HEAD']);
      const remote = runGit(['remote', 'get-url', 'origin']);
      const dirty = runGit(['status', '--porcelain']);

      res.json({
        status: "ok",
        repoAvailable: true,
        branch,
        commit,
        remote,
        clean: dirty.length === 0,
        dirtyFiles: dirty.split('\n').filter(Boolean).length,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message || "Não foi possível ler o estado do Git." });
    }
  });

  app.post("/api/github/update", authenticate, checkPermission('manage_settings'), (req, res) => {
    try {
      if (!isGitRepo()) {
        return res.status(400).json({ status: "error", message: "Repositório Git não encontrado neste diretório." });
      }

      const branch = String(req.body?.branch || 'main');
      const beforeCommit = runGit(['rev-parse', '--short', 'HEAD']);
      const pullResult = runGit(['pull', '--ff-only', 'origin', branch]);
      const afterCommit = runGit(['rev-parse', '--short', 'HEAD']);

      res.json({
        status: "ok",
        message: "Atualização aplicada com sucesso.",
        beforeCommit,
        afterCommit,
        branch,
        output: pullResult,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message || "Falha ao atualizar via GitHub." });
    }
  });

  app.delete("/api/reports/:id(\\d+)", authenticate, checkPermission('conclude_reports'), (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if report exists
      const report = db.prepare("SELECT id FROM reports WHERE id = ?").get(id) as any;
      if (!report) {
        return res.status(404).json({ status: 'error', message: 'Relatório não encontrado' });
      }

      const transaction = db.transaction(() => {
        db.prepare("DELETE FROM reports WHERE id = ?").run(id);
        db.prepare("DELETE FROM report_photos WHERE report_id = ?").run(id);
        db.prepare("DELETE FROM telegram_queue WHERE report_id = ?").run(id);
      });

      transaction();
      console.log(`REPORT_DELETED: ID ${id} deleted by ${req.user.nome} (${req.user.nivel_hierarquico})`);
      io.emit('report_deleted', { id: parseInt(id) });
      res.json({ status: 'success', message: 'Relatório removido com sucesso' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.get("/api/reports/export", authenticate, checkPermission('view_reports'), (req: any, res) => {
    try {
      const userRole = req.user.nivel_hierarquico;
      const userId = req.user.id;
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(userRole) as any)?.peso || 0;
      
      let query = `
        SELECT r.id, r.timestamp, r.titulo, r.categoria, r.gravidade, r.status, u.nome as agente_nome, r.descricao
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
      const reports = db.prepare(query).all(...params);
      
      if (reports.length === 0) {
        return res.status(404).send("Nenhum dado para exportar.");
      }

      const json2csvParser = new Parser({ fields: ['id', 'timestamp', 'titulo', 'categoria', 'gravidade', 'status', 'agente_nome', 'descricao'] });
      const csv = json2csvParser.parse(reports);
      
      res.header('Content-Type', 'text/csv');
      res.attachment(`export_mineguard_${new Date().getTime()}.csv`);
      res.send(csv);
    } catch (err: any) {
      console.error(err);
      res.status(500).send("Erro ao gerar exportação.");
    }
  });

  app.get("/api/reports", authenticate, checkPermission('view_reports'), (req: any, res) => {
    const userRole = req.user.nivel_hierarquico;
    const userId = req.user.id;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const severity = req.query.severity as string || '';
    const dateFrom = req.query.dateFrom as string || '';
    const dateTo = req.query.dateTo as string || '';
    const status = req.query.status as string || '';
    const agent = req.query.agent as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
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
      query += ` AND (r.agente_id = ? OR EXISTS (SELECT 1 FROM report_participants rp WHERE rp.report_id = r.id AND rp.user_id = ?))`;
      params.push(userId, userId);
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
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    if (dateFrom) {
        query += ` AND DATE(r.timestamp, '${LUANDA_SQL_OFFSET}') >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
        query += ` AND DATE(r.timestamp, '${LUANDA_SQL_OFFSET}') <= ?`;
      params.push(dateTo);
    }
    if (agent) {
      query += ` AND r.agente_id = ?`;
      params.push(parseInt(agent));
    }

    // Get total count for pagination
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countParams = params.slice();
    const totalResult = db.prepare(countQuery).get(...countParams) as any;
    const total = totalResult?.total || 0;

    query += ` ORDER BY r.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const reports = db.prepare(query).all(...params) as any[];
    reports.forEach((report) => hydrateReportRelations(report, userId));
    
    res.json({
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
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
          WHERE (r.agente_id = ? OR EXISTS (SELECT 1 FROM report_participants rp WHERE rp.report_id = r.id AND rp.user_id = ?))
        `;
        const params: any[] = [userId, userId];

      if (startDate) {
        query += ` AND DATE(r.timestamp, '${LUANDA_SQL_OFFSET}') >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND DATE(r.timestamp, '${LUANDA_SQL_OFFSET}') <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY r.timestamp DESC`;

        const reports = db.prepare(query).all(...params) as any[];
        reports.forEach((report) => hydrateReportRelations(report, userId));
      console.log(`[API personal] user=${userId} start=${startDate || "-"} end=${endDate || "-"} total=${reports.length}`);
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Daily Report Personal - User's consolidated daily report
  app.get("/api/reports/daily-personal", authenticate, (req: any, res) => {
    try {
      const userId = req.user.id;
      
        const reports = db.prepare(`
          SELECT r.* FROM reports r 
          WHERE (r.agente_id = ? OR EXISTS (SELECT 1 FROM report_participants rp WHERE rp.report_id = r.id AND rp.user_id = ?))
            AND DATE(r.timestamp, '${LUANDA_SQL_OFFSET}') = DATE('now', '${LUANDA_SQL_OFFSET}')
        `).all(userId, userId) as any[];

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

      console.log(`[API daily-personal] user=${userId} total=${summary.totalReports}`);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Daily Report Team - Team's consolidated daily report (for supervisors/managers)
  app.get("/api/reports/daily-team", authenticate, (req: any, res) => {
    try {
      const userRole = req.user.nivel_hierarquico;
      const userWeight = (db.prepare("SELECT peso FROM role_weights WHERE nivel_hierarquico = ?").get(userRole) as any)?.peso || 0;

      // Get reports from team members (lower weight = lower hierarchy)
      const reports = db.prepare(`
        SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel
        FROM reports r
        JOIN users u ON r.agente_id = u.id
        JOIN role_weights rw ON u.nivel_hierarquico = rw.nivel_hierarquico
        WHERE rw.peso < ? AND DATE(r.timestamp, '${LUANDA_SQL_OFFSET}') = DATE('now', '${LUANDA_SQL_OFFSET}')
      `).all(userWeight) as any[];

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

      console.log(`[API daily-team] role=${userRole} weight=${userWeight} total=${summary.totalReports}`);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/reports", authenticate, checkPermission('create_reports'), upload.array("fotos", 20), async (req: any, res) => {
    try {
        const { titulo, categoria, gravidade, descricao, coords_lat, coords_lng, metadata, captions, setor, pessoas_envolvidas, equipamento, acao_imediata, requer_investigacao, testemunhas, potencial_risco, participant_ids } = req.body;
        const agente_id = req.user.id;
        const fotos_path = req.files && req.files.length > 0 ? `/uploads/${req.files[0].filename}` : null;
        const participantIds = parseParticipantIds(participant_ids).filter((id) => id !== agente_id);
      
      if (!categoria || !gravidade || !descricao) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
      }

      if (categoria === 'Safety') {
        let metadataObj: any = {};
        try {
          metadataObj = metadata ? JSON.parse(metadata) : {};
        } catch(e) {}
        if (!metadataObj.incidentType || !metadataObj.ppeUsage) {
          return res.status(400).json({ status: "error", message: "Safety reports require Incident Type and PPE Usage" });
        }
      }

      const stmt = db.prepare(`
        INSERT INTO reports (agente_id, titulo, categoria, gravidade, descricao, metadata, fotos_path, coords_lat, coords_lng, setor, pessoas_envolvidas, equipamento, acao_imediata, requer_investigacao, testemunhas, potencial_risco, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const result = stmt.run(agente_id, titulo || null, categoria, gravidade, descricao, metadata || null, fotos_path, coords_lat || null, coords_lng || null, setor || null, pessoas_envolvidas || null, equipamento || null, acao_imediata || null, requer_investigacao ? 1 : 0, testemunhas || null, potencial_risco || null);
      
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

        if (participantIds.length > 0) {
          const existingUsers = db.prepare(
            `SELECT id FROM users WHERE id IN (${participantIds.map(() => '?').join(',')})`
          ).all(...participantIds) as Array<{ id: number }>;
          const insertParticipant = db.prepare(
            "INSERT OR IGNORE INTO report_participants (report_id, user_id, added_by) VALUES (?, ?, ?)"
          );
          existingUsers.forEach((user) => {
            insertParticipant.run(result.lastInsertRowid, user.id, agente_id);
          });
        }
      
        const newReport = db.prepare(`
          SELECT r.*, u.nome as agente_nome, u.nivel_hierarquico as agente_nivel
          FROM reports r
          LEFT JOIN users u ON r.agente_id = u.id
          WHERE r.id = ?
        `).get(result.lastInsertRowid) as any;
        hydrateReportRelations(newReport, agente_id);

      // Notify via Socket.io
      io.emit("new_report", newReport);

      // Telegram Alert Queueing for G3/G4
      if (gravidade === 'G3' || gravidade === 'G4') {
        try {
          db.prepare(`
            INSERT INTO telegram_queue (report_id, gravidade, titulo, categoria, agente_nome, descricao, coords_lat, coords_lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(result.lastInsertRowid, gravidade, titulo || null, categoria, req.user.nome, descricao, coords_lat || null, coords_lng || null);
        } catch (queueErr) {
          console.error("Erro ao inserir na fila do Telegram:", queueErr);
        }
      }

      // Keep the current daily archive in sync with newly created reports.
      try {
        const today = db.prepare(`SELECT DATE('now', '${LUANDA_SQL_OFFSET}') AS date`).get() as { date: string };
        generateDailyReport({ date: today.date, generatedBy: req.user?.id ?? null });
      } catch (dailyErr) {
        console.error("Erro ao atualizar relatorio diario apos nova ocorrencia:", dailyErr);
      }

      res.json({ status: "success", id: result.lastInsertRowid, report: newReport });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Alerts endpoints
  app.get("/api/alerts", authenticate, (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase();
      const alerts = db.prepare(`
        SELECT a.*, u.nome as creator_name, 
          COALESCE(ar.read, 0) as read
        FROM alerts a
        LEFT JOIN alert_reads ar ON a.id = ar.alert_id AND ar.user_id = ?
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.expires_at IS NULL OR datetime(a.expires_at) > datetime('now')
        ORDER BY COALESCE(a.pinned, 0) DESC, a.timestamp DESC
        LIMIT 100
      `).all(userId) as any[];

      res.json({ status: "success", alerts: alerts.map((alert: any) => decorateAlertRow(alert, userId, userRole)).filter((alert: any) => alert.visible_for_user) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/alerts", authenticate, checkPermission('create_alerts'), (req: any, res) => {
    try {
      const userId = req.user.id;

      const { titulo, mensagem, tipo, expiresInHours, isTemporary, targetAudience, pinned } = req.body;
      if (!titulo || !mensagem) {
        return res.status(400).json({ status: "error", message: "Título e mensagem são obrigatórios" });
      }

      const stmt = db.prepare(`
        INSERT INTO alerts (created_by, titulo, mensagem, tipo, is_temporary, expires_at, target_audience, pinned, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const expiresAt = parseAlertExpiry(expiresInHours, isTemporary, tipo, pinned);
      const effectivePinned = pinned ? 1 : (String(tipo) === 'critico' ? 1 : 0);
      const effectiveAudience = String(targetAudience || 'all');
      const result = stmt.run(userId, titulo, mensagem, tipo || 'aviso', expiresAt ? 1 : 0, expiresAt, effectiveAudience, effectivePinned);
      const alertId = result.lastInsertRowid as number;

      // Insert into alert_reads for all users except creator
      const allUsers = db.prepare("SELECT id FROM users WHERE id != ?").all(userId) as any[];
      const insertRead = db.prepare("INSERT OR IGNORE INTO alert_reads (alert_id, user_id, read) VALUES (?, ?, 0)");
      allUsers.forEach(u => insertRead.run(alertId, u.id));

      const alert = db.prepare(`
        SELECT a.*, u.nome as creator_name, 0 as read
        FROM alerts a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.id = ?
      `).get(alertId) as any;

      // Broadcast via Socket.io
      io.emit("new_alert", decorateAlertRow(alert, userId, String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase()));

      res.json({ status: "success", alert: decorateAlertRow(alert, userId, String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase()) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.patch("/api/alerts/:id/read", authenticate, (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      db.prepare("INSERT OR REPLACE INTO alert_reads (alert_id, user_id, read) VALUES (?, ?, 1)").run(id, userId);

      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.patch("/api/alerts/:id", authenticate, checkPermission('edit_own_alerts'), (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { titulo, mensagem, tipo, expiresInHours, isTemporary, targetAudience, pinned } = req.body;

      const alert = db.prepare("SELECT created_by FROM alerts WHERE id = ?").get(id) as any;
      if (!alert) {
        return res.status(404).json({ status: "error", message: "Alerta não encontrado" });
      }

      if (alert.created_by !== userId) {
        return res.status(403).json({ status: "error", message: "Apenas o criador pode editar este alerta" });
      }

      const expiresAt = parseAlertExpiry(expiresInHours, isTemporary, tipo, pinned);
      const effectivePinned = pinned ? 1 : (String(tipo) === 'critico' ? 1 : 0);
      const effectiveAudience = String(targetAudience || 'all');
      db.prepare("UPDATE alerts SET titulo = ?, mensagem = ?, tipo = ?, is_temporary = ?, expires_at = ?, target_audience = ?, pinned = ? WHERE id = ?").run(titulo, mensagem, tipo, expiresAt ? 1 : 0, expiresAt, effectiveAudience, effectivePinned, id);

      const updated = db.prepare("SELECT a.*, u.nome as creator_name, COALESCE(ar.read, 0) as read FROM alerts a LEFT JOIN users u ON a.created_by = u.id LEFT JOIN alert_reads ar ON a.id = ar.alert_id AND ar.user_id = ? WHERE a.id = ?").get(userId, id) as any;

      io.emit("alert_updated", decorateAlertRow(updated, userId, String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase()));

      res.json({ status: "success", alert: decorateAlertRow(updated, userId, String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase()) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.delete("/api/alerts/:id", authenticate, checkPermission('edit_own_alerts'), (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const alert = db.prepare("SELECT created_by FROM alerts WHERE id = ?").get(id) as any;
      if (!alert) {
        return res.status(404).json({ status: "error", message: "Alerta não encontrado" });
      }

      if (alert.created_by !== userId) {
        return res.status(403).json({ status: "error", message: "Apenas o criador pode deletar este alerta" });
      }

      db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
      db.prepare("DELETE FROM alert_reads WHERE alert_id = ?").run(id);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  const parseAlertExpiry = (expiresInHours: unknown, isTemporary: unknown, tipo: unknown, pinned: unknown) => {
    if (String(isTemporary) === 'false' || String(isTemporary) === '0') return null;
    const hours = Number(expiresInHours ?? 24);
    if (!Number.isFinite(hours) || hours <= 0) return null;
    const safeHours = String(tipo) === 'critico' && hours < 72 ? 72 : hours;
    return new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();
  };

  const decorateAlertRow = (row: any, userId: number, userRole = '') => ({
    ...row,
    expires_in_hours: row.expires_at ? Math.max(1, Math.round((new Date(row.expires_at).getTime() - Date.now()) / (60 * 60 * 1000))) : null,
    expired: row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false,
    read: row.read ?? 0,
    creator_name: row.creator_name || 'Sistema',
    target_audience: row.target_audience || 'all',
    target_audience_label: getAlertAudienceLabel(row.target_audience),
    pinned: row.pinned ? 1 : 0,
    visible_for_user: matchesAlertAudience(row.target_audience, userRole),
  });

  const pruneExpiredAlerts = () => {
    try {
      const expiredAlerts = db.prepare(`
        SELECT id FROM alerts
        WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')
      `).all() as Array<{ id: number }>;

      if (expiredAlerts.length === 0) return;

      db.prepare(`
        DELETE FROM alert_reads
        WHERE alert_id IN (
          SELECT id FROM alerts
          WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')
        )
      `).run();
      db.prepare(`
        DELETE FROM alerts
        WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')
      `).run();

      expiredAlerts.forEach((alert) => io.emit('alert_deleted', { id: alert.id }));
    } catch (error) {
      console.error('Erro ao limpar alertas expirados:', error);
    }
  };

  pruneExpiredAlerts();
  setInterval(pruneExpiredAlerts, 10 * 60 * 1000);

  // Alerts endpoints
  app.get("/api/alerts", authenticate, (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase();
      const alerts = db.prepare(`
        SELECT a.*, u.nome as creator_name, 
          COALESCE(ar.read, 0) as read
        FROM alerts a
        LEFT JOIN alert_reads ar ON a.id = ar.alert_id AND ar.user_id = ?
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.expires_at IS NULL OR datetime(a.expires_at) > datetime('now')
        ORDER BY COALESCE(a.pinned, 0) DESC, a.timestamp DESC
        LIMIT 100
      `).all(userId) as any[];

      res.json({ status: "success", alerts: alerts.map((alert: any) => decorateAlertRow(alert, userId, userRole)).filter((alert: any) => alert.visible_for_user) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/alerts", authenticate, checkPermission('create_alerts'), (req: any, res) => {
    try {
      const userId = req.user.id;
      const creatorRole = String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase();

      const { titulo, mensagem, tipo, expiresInHours, isTemporary, targetAudience, pinned } = req.body;
      if (!titulo || !mensagem) {
        return res.status(400).json({ status: "error", message: "Título e mensagem são obrigatórios" });
      }

      const stmt = db.prepare(`
        INSERT INTO alerts (created_by, titulo, mensagem, tipo, is_temporary, expires_at, target_audience, pinned, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const expiresAt = parseAlertExpiry(expiresInHours, isTemporary, tipo, pinned);
      const effectivePinned = pinned ? 1 : (String(tipo) === 'critico' ? 1 : 0);
      const effectiveAudience = String(targetAudience || 'all');
      const result = stmt.run(userId, titulo, mensagem, tipo || 'aviso', expiresAt ? 1 : 0, expiresAt, effectiveAudience, effectivePinned);
      const alertId = result.lastInsertRowid as number;

      // Insert unread rows only for users that can actually receive this alert
      const allUsers = db.prepare("SELECT id, nivel_hierarquico FROM users WHERE id != ?").all(userId) as any[];
      const insertRead = db.prepare("INSERT OR IGNORE INTO alert_reads (alert_id, user_id, read) VALUES (?, ?, 0)");
      allUsers
        .filter((u) => matchesAlertAudience(effectiveAudience, u.nivel_hierarquico))
        .forEach((u) => insertRead.run(alertId, u.id));

      const alert = db.prepare(`
        SELECT a.*, u.nome as creator_name, 0 as read
        FROM alerts a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.id = ?
      `).get(alertId) as any;

      // Broadcast via Socket.io
      io.emit("new_alert", decorateAlertRow(alert, userId, creatorRole));

      res.json({ status: "success", alert: decorateAlertRow(alert, userId, creatorRole) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.patch("/api/alerts/:id/read", authenticate, (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      db.prepare("INSERT OR REPLACE INTO alert_reads (alert_id, user_id, read) VALUES (?, ?, 1)").run(id, userId);

      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.patch("/api/alerts/:id", authenticate, checkPermission('edit_own_alerts'), (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const editorRole = String(req.user.nivel_hierarquico || req.user.funcao || '').toLowerCase();
      const { titulo, mensagem, tipo, expiresInHours, isTemporary, targetAudience, pinned } = req.body;

      const alert = db.prepare("SELECT created_by FROM alerts WHERE id = ?").get(id) as any;
      if (!alert) {
        return res.status(404).json({ status: "error", message: "Alerta não encontrado" });
      }

      if (alert.created_by !== userId) {
        return res.status(403).json({ status: "error", message: "Apenas o criador pode editar este alerta" });
      }

      const expiresAt = parseAlertExpiry(expiresInHours, isTemporary, tipo, pinned);
      const effectivePinned = pinned ? 1 : (String(tipo) === 'critico' ? 1 : 0);
      const effectiveAudience = String(targetAudience || 'all');
      db.prepare("UPDATE alerts SET titulo = ?, mensagem = ?, tipo = ?, is_temporary = ?, expires_at = ?, target_audience = ?, pinned = ? WHERE id = ?").run(titulo, mensagem, tipo, expiresAt ? 1 : 0, expiresAt, effectiveAudience, effectivePinned, id);

      const matchingUsers = db.prepare("SELECT id, nivel_hierarquico FROM users WHERE id != ?").all(userId) as any[];
      const insertRead = db.prepare("INSERT OR IGNORE INTO alert_reads (alert_id, user_id, read) VALUES (?, ?, 0)");
      matchingUsers
        .filter((candidate) => matchesAlertAudience(effectiveAudience, candidate.nivel_hierarquico))
        .forEach((candidate) => insertRead.run(id, candidate.id));

      const updated = db.prepare("SELECT a.*, u.nome as creator_name, COALESCE(ar.read, 0) as read FROM alerts a LEFT JOIN users u ON a.created_by = u.id LEFT JOIN alert_reads ar ON a.id = ar.alert_id AND ar.user_id = ? WHERE a.id = ?").get(userId, id) as any;

      io.emit("alert_updated", decorateAlertRow(updated, userId, editorRole));

      res.json({ status: "success", alert: decorateAlertRow(updated, userId, editorRole) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.delete("/api/alerts/:id", authenticate, checkPermission('edit_own_alerts'), (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const alert = db.prepare("SELECT created_by FROM alerts WHERE id = ?").get(id) as any;
      if (!alert) {
        return res.status(404).json({ status: "error", message: "Alerta não encontrado" });
      }

      if (alert.created_by !== userId) {
        return res.status(403).json({ status: "error", message: "Apenas o criador pode deletar este alerta" });
      }

      db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
      db.prepare("DELETE FROM alert_reads WHERE alert_id = ?").run(id);

      io.emit("alert_deleted", { id });

      res.json({ status: "success" });
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
    try {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: {
            protocol: 'wss',
            server: server
          }
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[VITE] Middleware de desenvolvimento carregado (HMR em WSS).");
    } catch (err) {
      console.error("Vite initialization error:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- Asynchronous Telegram Queue Processor ---
  setInterval(async () => {
    try {
      const pendingAlerts = db.prepare("SELECT * FROM telegram_queue WHERE status = 'pending' OR (status = 'failed' AND retry_count < 5) LIMIT 5").all() as any[];
      if (pendingAlerts.length === 0) return;

      const settings = db.prepare("SELECT key, value FROM system_settings").all() as any[];
      const botToken = settings.find((s: any) => s.key === 'telegram_bot_token')?.value;
      const chatId = settings.find((s: any) => s.key === 'telegram_chat_id')?.value;

      if (!botToken || !chatId) return;

      const decryptedToken = decrypt(botToken);
      const decryptedChatId = decrypt(chatId);

      for (const alert of pendingAlerts) {
        try {
          const alertText = `
🚨 <b>ALERTA DE SEGURANÇA - ${alert.gravidade}</b> 🚨
<b>Título:</b> ${alert.titulo || 'Sem título'}
<b>Categoria:</b> ${alert.categoria}
<b>Agente:</b> ${alert.agente_nome}
<b>Descrição:</b> ${alert.descricao}
${alert.coords_lat ? `<b>Local:</b> <a href="https://www.google.com/maps?q=${alert.coords_lat},${alert.coords_lng}">Ver no Mapa</a>` : ''}
          `;

          await axios.post(`https://api.telegram.org/bot${decryptedToken}/sendMessage`, {
            chat_id: decryptedChatId,
            text: alertText,
            parse_mode: "HTML"
          }, { timeout: 10000 });

          db.prepare("UPDATE telegram_queue SET status = 'sent' WHERE id = ?").run(alert.id);
        } catch (reqErr: any) {
          db.prepare("UPDATE telegram_queue SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?").run(alert.id);
          console.error(`Falha ao processar alerta Telegram ID ${alert.id}. Retry: ${alert.retry_count + 1}`);
        }
      }
    } catch (dbErr) {
      console.error("Worker Erro na fila do Telegram:", dbErr);
    }
  }, 15000);

  const redirectServer = http.createServer((req, res) => {
    const hostHeader = req.headers.host || `localhost:${HTTP_REDIRECT_PORT}`;
    const host = hostHeader.replace(/:\d+$/, `:${PORT}`);
    const location = `https://${host}${req.url || "/"}`;
    res.writeHead(301, {
      Location: location,
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Redirecting to HTTPS");
  });

  redirectServer.listen(HTTP_REDIRECT_PORT, () => {
    console.log(`[SSL] Redirect HTTP ativo em http://localhost:${HTTP_REDIRECT_PORT} -> https://localhost:${PORT}`);
  });

  server.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`MINEGUARD RODANDO EM: https://localhost:${PORT}`);
    console.log(`MODO SEGURO ATIVADO`);
    console.log(`NOTA: Como o certificado e autoassinado, aceite o aviso de seguranca no navegador.`);
    console.log("-----------------------------------------");
  });
}

startServer();


