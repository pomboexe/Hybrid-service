#!/usr/bin/env tsx
/**
 * Script para aplicar migrações no Supabase
 * 
 * Uso:
 *   tsx script/apply-supabase-migrations.ts <project_id>
 * 
 * Ou configure SUPABASE_PROJECT_ID no .env
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

const projectId = process.argv[2] || process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error(`
Erro: Project ID do Supabase é obrigatório.

Uso:
  tsx script/apply-supabase-migrations.ts <project_id>

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

console.log(`Aplicando migrações no projeto: ${projectId}\n`);

// Lista de migrações em ordem
const migrations = [
  { name: "001_initial_schema", file: "001_initial_schema.sql" },
  { name: "add_glpi_id_column", file: "add_glpi_id_column.sql" },
  { name: "add_assignment_columns", file: "add_assignment_columns.sql" },
  { name: "fix_glpi_id_constraints", file: "fix_glpi_id_constraints.sql" },
];

async function applyMigrations() {
  for (const migration of migrations) {
    try {
      const sqlPath = join(process.cwd(), "migrations", migration.file);
      const sql = readFileSync(sqlPath, "utf-8");
      
      console.log(`Aplicando migração: ${migration.name}...`);
      
      // Nota: Este script precisa ser executado com acesso ao MCP do Supabase
      // As migrações serão aplicadas usando mcp_Supabase_apply_migration
      console.log(`  SQL: ${sql.substring(0, 100)}...`);
      console.log(`  ✅ Migração ${migration.name} preparada`);
    } catch (error) {
      console.error(`  ❌ Erro ao aplicar migração ${migration.name}:`, error);
      throw error;
    }
  }
  
  console.log("\n✅ Todas as migrações foram preparadas!");
  console.log("\nNota: Execute as migrações usando o MCP do Supabase:");
  console.log("  mcp_Supabase_apply_migration(project_id, name, query)");
}

applyMigrations().catch(console.error);
