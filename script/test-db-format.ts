#!/usr/bin/env tsx
/**
 * Script para testar diferentes formatos de connection string do Supabase
 */

import "dotenv/config";
import { Pool } from "pg";

// Formatos possíveis de connection string do Supabase
const formats = [
  // Formato direto (o que está no .env)
  process.env.DATABASE_URL,
  
  // Formato com pooler (se disponível)
  process.env.DATABASE_URL?.replace('db.', 'aws-0-us-east-1.pooler.'),
  
  // Formato alternativo
  process.env.DATABASE_URL?.replace(':5432/', ':6543/'),
];

async function testFormat(url: string | undefined, name: string) {
  if (!url) return false;
  
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    const result = await client.query("SELECT 1 as test");
    client.release();
    await pool.end();
    return true;
  } catch (error: any) {
    await pool.end();
    return false;
  }
}

async function main() {
  console.log("🔍 Testando diferentes formatos de connection string...\n");
  
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    console.error("❌ DATABASE_URL não configurada");
    process.exit(1);
  }

  const maskedUrl = originalUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`📡 Connection String atual: ${maskedUrl}\n`);

  // Verificar se o problema é DNS ou formato
  console.log("💡 Dica: O Supabase pode usar diferentes formatos de connection string.\n");
  console.log("📋 Formatos comuns do Supabase:\n");
  console.log("   1. Direto: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres");
  console.log("   2. Pooler: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres");
  console.log("   3. Session: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres\n");
  
  console.log("🔗 Para obter a connection string correta:");
  console.log("   1. Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database");
  console.log("   2. Vá em 'Connection string'");
  console.log("   3. Selecione 'URI' ou 'Connection pooling'");
  console.log("   4. Copie a string completa\n");
  
  console.log("⚠️  O erro ENOTFOUND geralmente indica:");
  console.log("   - Formato de hostname incorreto");
  console.log("   - Problema de DNS/conectividade");
  console.log("   - Projeto pausado (verifique no dashboard)\n");
}

main();
