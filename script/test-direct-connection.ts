#!/usr/bin/env tsx
/**
 * Teste da connection string direta do Supabase para Node.js
 */

import "dotenv/config";
import { Pool } from "pg";

const connectionString = "postgresql://postgres:Nx0N4viDad3!@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres";

console.log("🔍 Testando connection string direta do Supabase (Node.js)\n");
console.log(`📡 Connection String: postgresql://postgres:****@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres\n`);

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 30000,
  // Tentar forçar IPv6 se disponível
  keepAlive: true,
});

async function test() {
  try {
    console.log("⏳ Tentando conectar (timeout: 30s)...");
    const client = await pool.connect();
    console.log("✅ Conexão estabelecida com sucesso!\n");
    
    const result = await client.query("SELECT version(), current_database(), current_user");
    console.log("📊 Informações do banco:");
    console.log(`   - PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log(`   - Database: ${result.rows[0].current_database}`);
    console.log(`   - User: ${result.rows[0].current_user}\n`);
    
    // Verificar tabelas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✅ Tabelas encontradas: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    client.release();
    await pool.end();
    
    console.log("\n🎉 Teste concluído com sucesso!");
    console.log("✅ A connection string está funcionando corretamente!\n");
    
  } catch (error: any) {
    console.error("\n❌ Erro ao conectar:\n");
    console.error(`   Código: ${error.code}`);
    console.error(`   Mensagem: ${error.message}\n`);
    
    if (error.code === 'ENOTFOUND') {
      console.error("💡 Possíveis soluções:");
      console.error("   1. Verifique sua conexão com a internet");
      console.error("   2. Verifique se há firewall/proxy bloqueando");
      console.error("   3. Tente usar uma VPN ou outra rede");
      console.error("   4. O hostname pode não estar acessível da sua rede atual\n");
    }
    
    await pool.end();
    process.exit(1);
  }
}

test();
