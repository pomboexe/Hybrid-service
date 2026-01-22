-- Migração inicial: Criação do schema completo do banco de dados
-- Esta migração cria todas as tabelas base do sistema

-- ============================================
-- TABELA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR DEFAULT 'user',
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Índice para otimizar buscas por data de expiração
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- ============================================
-- TABELA: conversations
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- TABELA: messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- TABELA: tickets
-- ============================================
-- Nota: glpi_id será adicionado em migração posterior
-- assigned_to e transfer_request_to também serão adicionados depois
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  user_id VARCHAR REFERENCES users(id),
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  sentiment TEXT,
  customer_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: knowledge_base
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW()
);
