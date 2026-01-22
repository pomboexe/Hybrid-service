#!/usr/bin/env tsx
/**
 * Script para migrar o banco de dados para o Supabase
 * 
 * Este script aplica todas as migrações no Supabase usando o MCP.
 * 
 * Uso:
 *   tsx script/migrate-to-supabase.ts <project_id>
 * 
 * Ou configure SUPABASE_PROJECT_ID no .env
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

const projectId = process.argv[2] || process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error(`
❌ Erro: Project ID do Supabase é obrigatório.

Uso:
  tsx script/migrate-to-supabase.ts <project_id>

Ou configure SUPABASE_PROJECT_ID no arquivo .env

Para obter o Project ID:
1. Acesse: https://app.supabase.com
2. Selecione sua organização
3. Selecione o projeto
4. Vá em Settings > General
5. Copie o "Reference ID"
`);
  process.exit(1);
}

console.log(`🚀 Iniciando migração para o Supabase...`);
console.log(`📦 Project ID: ${projectId}\n`);

// Lista de migrações em ordem
const migrations = [
  { 
    name: "001_initial_schema", 
    file: "001_initial_schema.sql",
    description: "Criação do schema inicial (users, sessions, conversations, messages, tickets, knowledge_base)"
  },
  { 
    name: "add_glpi_id_column", 
    file: "add_glpi_id_column.sql",
    description: "Adiciona coluna glpi_id na tabela tickets"
  },
  { 
    name: "add_assignment_columns", 
    file: "add_assignment_columns.sql",
    description: "Adiciona colunas assigned_to e transfer_request_to"
  },
  { 
    name: "fix_glpi_id_constraints", 
    file: "fix_glpi_id_constraints.sql",
    description: "Aplica constraints NOT NULL e UNIQUE em glpi_id"
  },
];

async function applyMigrations() {
  console.log(`📋 Total de migrações: ${migrations.length}\n`);
  
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    try {
      const sqlPath = join(process.cwd(), "migrations", migration.file);
      const sql = readFileSync(sqlPath, "utf-8");
      
      console.log(`[${i + 1}/${migrations.length}] Aplicando: ${migration.name}`);
      console.log(`   Descrição: ${migration.description}`);
      console.log(`   Arquivo: ${migration.file}`);
      
      // Nota: Este script prepara as migrações
      // As migrações serão aplicadas usando mcp_Supabase_apply_migration
      // através do MCP do Supabase
      console.log(`   ✅ Migração preparada (${sql.length} caracteres)`);
      console.log();
    } catch (error) {
      console.error(`   ❌ Erro ao preparar migração ${migration.name}:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Todas as migrações foram preparadas!`);
  console.log(`\n📝 Próximos passos:`);
  console.log(`   1. Execute as migrações usando o MCP do Supabase:`);
  console.log(`      mcp_Supabase_apply_migration(project_id="${projectId}", name="...", query="...")`);
  console.log(`   2. Configure a DATABASE_URL no arquivo .env`);
  console.log(`   3. Verifique as tabelas criadas no dashboard do Supabase`);
}

applyMigrations().catch((error) => {
  console.error("\n❌ Erro durante a migração:", error);
  process.exit(1);
});
