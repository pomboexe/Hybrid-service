#!/usr/bin/env tsx
/**
 * Teste de conexão considerando IPv6
 */

import "dotenv/config";
import { Pool } from "pg";
import dns from "dns";

async function testConnection() {
  console.log("🔍 Verificando resolução DNS...\n");
  
  // Verificar IPv4
  dns.lookup('db.mgfrfhwxbrbrqfcmbgoa.supabase.co', { family: 4 }, (err, address) => {
    if (err) {
      console.log("❌ Não há endereço IPv4 disponível");
      console.log("   Erro:", err.message);
    } else {
      console.log(`✅ IPv4 encontrado: ${address}`);
    }
  });
  
  // Verificar IPv6
  dns.lookup('db.mgfrfhwxbrbrqfcmbgoa.supabase.co', { family: 6 }, (err, address) => {
    if (err) {
      console.log("❌ Não há endereço IPv6 disponível");
    } else {
      console.log(`✅ IPv6 encontrado: ${address}`);
    }
  });
  
  // Tentar conexão com timeout maior
  console.log("\n⏳ Tentando conectar com timeout maior (30s)...");
  
  const connectionString = "postgresql://postgres:Nx0N4viDad3!@db.mgfrfhwxbrbrqfcmbgoa.supabase.co:5432/postgres";
  
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 30000,
  });
  
  try {
    const client = await pool.connect();
    console.log("✅ Conexão estabelecida!");
    const result = await client.query("SELECT version()");
    console.log("✅ Query executada com sucesso!");
    client.release();
    await pool.end();
  } catch (error: any) {
    console.error("\n❌ Erro:", error.code, error.message);
    await pool.end();
  }
}

// Aguardar um pouco para DNS resolver
setTimeout(() => {
  testConnection();
}, 2000);
