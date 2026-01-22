#!/usr/bin/env tsx
/**
 * Script para atualizar a DATABASE_URL no .env
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env");
const connectionString = "postgresql://postgres:Nx0N4viDad3!@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres";

try {
  let content = readFileSync(envPath, "utf-8");
  
  // Remover aspas se existirem e atualizar
  const oldPattern = /DATABASE_URL=["']?[^"\n]*["']?/g;
  content = content.replace(oldPattern, `DATABASE_URL=${connectionString}`);
  
  writeFileSync(envPath, content, "utf-8");
  
  console.log("✅ DATABASE_URL atualizada no .env");
  console.log(`📡 Connection String: postgresql://postgres:****@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres\n`);
  
} catch (error: any) {
  console.error("❌ Erro ao atualizar .env:", error.message);
  process.exit(1);
}
