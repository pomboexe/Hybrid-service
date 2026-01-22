#!/usr/bin/env tsx
/**
 * Teste usando connection string com IP resolvido
 */

import "dotenv/config";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "../server/db-resolver";

async function test() {
  const originalUrl = process.env.DATABASE_URL!;
  console.log("🔍 Resolvendo DNS...\n");
  
  const resolvedUrl = await resolveDatabaseUrl(originalUrl);
  
  if (resolvedUrl !== originalUrl) {
    console.log("✅ DNS resolvido!");
    console.log(`   Original: ${originalUrl.replace(/:[^:@]+@/, ":****@")}`);
    console.log(`   Resolvido: ${resolvedUrl.replace(/:[^:@]+@/, ":****@")}\n`);
  } else {
    console.log("⚠️  Não foi possível resolver DNS, usando URL original\n");
  }
  
  console.log("⏳ Tentando conectar...");
  const pool = new Pool({
    connectionString: resolvedUrl,
    connectionTimeoutMillis: 30000,
  });
  
  try {
    const client = await pool.connect();
    console.log("✅ Conexão estabelecida!\n");
    
    const result = await client.query("SELECT version(), current_database()");
    console.log("📊 Informações:");
    console.log(`   - PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log(`   - Database: ${result.rows[0].current_database}\n`);
    
    client.release();
    await pool.end();
    
    console.log("🎉 Sucesso! A resolução de DNS funcionou!\n");
    console.log("💡 Atualize o server/db.ts para usar esta abordagem.\n");
    
  } catch (error: any) {
    console.error("\n❌ Erro:", error.code, error.message);
    await pool.end();
    process.exit(1);
  }
}

test();
