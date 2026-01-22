#!/usr/bin/env tsx
/**
 * Script para testar diferentes formatos de connection string do Supabase
 */

import "dotenv/config";
import { Pool } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env");

// Formatos para testar
const formats = [
  // Formato original (não funciona)
  "postgresql://postgres:Nx0N4viDad3!@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres",
  
  // Formato pooler - us-east-1
  "postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:Nx0N4viDad3!@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  
  // Formato pooler - us-east-2
  "postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:Nx0N4viDad3!@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  
  // Formato pooler - us-west-1
  "postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:Nx0N4viDad3!@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
  
  // Formato session mode
  "postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:Nx0N4viDad3!@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
];

async function testFormat(url: string, name: string): Promise<boolean> {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    const result = await client.query("SELECT 1 as test");
    client.release();
    await pool.end();
    console.log(`✅ ${name}: FUNCIONOU!`);
    return true;
  } catch (error: any) {
    await pool.end();
    if (error.code === 'ENOTFOUND') {
      console.log(`❌ ${name}: Hostname não encontrado`);
    } else {
      console.log(`⚠️  ${name}: ${error.code || error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log("🔍 Testando diferentes formatos de connection string...\n");
  
  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    const name = `Formato ${i + 1}`;
    const worked = await testFormat(format, name);
    
    if (worked) {
      console.log(`\n🎉 Formato que funcionou: ${name}`);
      console.log(`📋 Connection String: ${format.replace(/:[^:@]+@/, ":****@")}\n`);
      
      // Atualizar .env
      let content = readFileSync(envPath, "utf-8");
      content = content.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL=${format}`
      );
      writeFileSync(envPath, content, "utf-8");
      console.log("✅ .env atualizado com a connection string que funcionou!\n");
      return;
    }
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n❌ Nenhum formato funcionou automaticamente.");
  console.log("💡 Você precisa copiar a connection string do dashboard do Supabase.");
  console.log("   Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database\n");
}

main().catch(console.error);
