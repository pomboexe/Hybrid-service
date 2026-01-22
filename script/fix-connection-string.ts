#!/usr/bin/env tsx
/**
 * Script para ajudar a corrigir a connection string do Supabase
 * 
 * O formato db.PROJECT.supabase.co geralmente não funciona.
 * O Supabase usa formatos diferentes dependendo da região.
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

console.log("🔧 Ajuda para corrigir a Connection String do Supabase\n");

console.log("❌ Formato atual (não funciona):");
console.log("   db.mgfrfhwxbrbrqfcmbgoa.supabase.co\n");

console.log("✅ Formatos corretos do Supabase:\n");

console.log("1️⃣  Connection Pooling (Recomendado para produção):");
console.log("   postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres\n");

console.log("2️⃣  Session Mode:");
console.log("   postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres\n");

console.log("3️⃣  Direct Connection (se disponível):");
console.log("   postgresql://postgres:[PASSWORD]@[HOST_ESPECÍFICO]:5432/postgres\n");

console.log("📋 Como obter a connection string correta:\n");
console.log("   1. Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database");
console.log("   2. Role até 'Connection string'");
console.log("   3. Selecione 'Connection pooling' (recomendado)");
console.log("   4. Copie a string completa");
console.log("   5. Cole no arquivo .env\n");

console.log("💡 Dica: A connection string do dashboard já vem no formato correto!");
console.log("   Não tente construir manualmente - sempre copie do dashboard.\n");

// Tentar ler o .env atual
try {
  const envPath = join(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  
  if (envContent.includes("db.mgfrfhwxbrbrqfcmbgoa.supabase.co")) {
    console.log("⚠️  ATENÇÃO: O formato atual no .env está incorreto!");
    console.log("   Substitua pela connection string do dashboard.\n");
  }
} catch (error) {
  // Ignorar se não conseguir ler
}

console.log("🔗 Links úteis:");
console.log("   Dashboard: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database");
console.log("   Docs: https://supabase.com/docs/guides/database/connecting-to-postgres\n");
