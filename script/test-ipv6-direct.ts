#!/usr/bin/env tsx
/**
 * Teste usando IPv6 diretamente
 */

import "dotenv/config";
import { Pool } from "pg";

// Usar o IPv6 diretamente
const ipv6Address = "2600:1f16:1cd0:333e:9f80:bf51:bc14:700";
const connectionString = `postgresql://postgres:Nx0N4viDad3!@[${ipv6Address}]:5432/postgres`;

console.log("🔍 Testando conexão usando IPv6 diretamente\n");
console.log(`📡 Connection String: postgresql://postgres:****@[${ipv6Address}]:5432/postgres\n`);

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 30000,
});

async function test() {
  try {
    console.log("⏳ Tentando conectar via IPv6...");
    const client = await pool.connect();
    console.log("✅ Conexão estabelecida com sucesso!\n");
    
    const result = await client.query("SELECT version(), current_database()");
    console.log("📊 Informações do banco:");
    console.log(`   - PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log(`   - Database: ${result.rows[0].current_database}\n`);
    
    client.release();
    await pool.end();
    
    console.log("🎉 Funcionou! Vou atualizar o .env para usar IPv6.\n");
    
    // Atualizar .env
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');
    let content = fs.readFileSync(envPath, 'utf-8');
    content = content.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL=${connectionString}`
    );
    fs.writeFileSync(envPath, content, 'utf-8');
    console.log("✅ .env atualizado com IPv6!\n");
    
  } catch (error: any) {
    console.error("\n❌ Erro:", error.code, error.message);
    await pool.end();
    process.exit(1);
  }
}

test();
