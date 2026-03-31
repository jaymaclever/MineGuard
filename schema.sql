-- Esquema SQL para Sistema de Segurança de Mina (PostgreSQL/SQLite)

-- Tabela de Usuários
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    funcao TEXT NOT NULL,
    numero_mecanografico TEXT UNIQUE NOT NULL,
    nivel_hierarquico TEXT CHECK(nivel_hierarquico IN ('Superadmin', 'Admin', 'Sierra 1', 'Sierra 2', 'Oficial', 'Supervisor', 'Agente')) NOT NULL
);

-- Tabela de Pesos Hierárquicos
CREATE TABLE role_weights (
    nivel_hierarquico TEXT PRIMARY KEY,
    peso INTEGER NOT NULL
);

INSERT INTO role_weights (nivel_hierarquico, peso) VALUES 
('Superadmin', 100),
('Admin', 90),
('Sierra 1', 80),
('Sierra 2', 70),
('Oficial', 60),
('Supervisor', 50),
('Agente', 40);

-- Tabela de Relatórios
CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id INTEGER NOT NULL,
    categoria TEXT CHECK(categoria IN ('Valores', 'Perímetro', 'Logística', 'Safety', 'Manutenção', 'Informativo', 'Operativo')) NOT NULL,
    gravidade TEXT CHECK(gravidade IN ('G1', 'G2', 'G3', 'G4')) NOT NULL,
    descricao TEXT NOT NULL,
    fotos_path TEXT, -- Caminho do arquivo
    latitude REAL,
    longitude REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agente_id) REFERENCES users(id)
);

-- Tabela de Permissões
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nivel_hierarquico TEXT CHECK(nivel_hierarquico IN ('Superadmin', 'Sierra 1', 'Sierra 2', 'Oficial', 'Supervisor', 'Agente')) NOT NULL,
    permissao_nome TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(nivel_hierarquico, permissao_nome)
);

-- Tabela de Configurações do Sistema
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL, -- Valor encriptado
    description TEXT
);

-- Inserção de níveis iniciais para permissões
INSERT INTO permissions (nivel_hierarquico, permissao_nome, is_enabled) VALUES 
('Superadmin', 'create_report', 1),
('Superadmin', 'view_all_reports', 1),
('Superadmin', 'manage_users', 1),
('Agente', 'create_report', 1),
('Agente', 'view_all_reports', 0);
