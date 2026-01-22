#!/usr/bin/env tsx
/**
 * Script para recriar o .env com a connection string correta
 */

import { writeFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env");
const connectionString = "postgresql://postgres:Nx0N4viDad3!@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres";

const envContent = `# ============================================
# VARIÁVEIS OBRIGATÓRIAS
# ============================================

# Database Configuration
POSTGRES_USER=hybrid_user
POSTGRES_PASSWORD=hybrid_password
POSTGRES_DB=hybrid_service
# Para usar com Docker Compose (recomendado):
# DATABASE_URL=postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service

DATABASE_URL=${connectionString}

# Para usar com PostgreSQL manual:
# DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco

# Session Secret (obrigatório para autenticação)
# Gere uma string aleatória segura. Exemplo: openssl rand -base64 32
SESSION_SECRET=superseguro

# ============================================
# VARIÁVEIS OPCIONAIS
# ============================================

# Server Configuration
PORT=5000
NODE_ENV=development

# OpenAI Configuration (opcional - apenas se usar funcionalidades de IA)
# Obtenha sua API key em: https://platform.openai.com/api-keys
AI_INTEGRATIONS_OPENAI_API_KEY=sk-sua-chave-openai-aqui
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

GLPI_APP_TOKEN=3XDJ7p4iMfq7GWe4Bkon7oIFEMlAp151kQMTd30S
GLPI_AUTH_TOKEN=user_token mNF7Vz4Uux2KfUDcFkUINVfoUVw8OInQ1GTHAdA8
GLPI_API_URL="http://192.168.0.120/glpi/apirest.php/"
GEMINI_API_KEY=AIzaSyA5sIGFXf_Us4a9iq9UFQE0RLuCtivZy6M
`;

try {
  writeFileSync(envPath, envContent, "utf-8");
  console.log("✅ Arquivo .env recriado com sucesso!");
  console.log(`📡 DATABASE_URL configurada: postgresql://postgres:****@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres\n`);
} catch (error: any) {
  console.error("❌ Erro ao recriar .env:", error.message);
  process.exit(1);
}
