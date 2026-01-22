#!/usr/bin/env tsx
/**
 * Script para testar a conexão com o banco de dados Supabase
 */

import "dotenv/config";
import { Pool } from "pg";

async function testConnection() {
  console.log("🔍 Testando conexão com o banco de dados...\n");

  // Verificar se DATABASE_URL está configurada
  if (!process.env.DATABASE_URL) {
    console.error("❌ Erro: DATABASE_URL não está configurada no .env");
    process.exit(1);
  }

  // Ocultar senha na exibição
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`📡 Connection String: ${maskedUrl}\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000, // 10 segundos
  });

  try {
    console.log("⏳ Tentando conectar...");
    const client = await pool.connect();
    console.log("✅ Conexão estabelecida com sucesso!\n");

    // Testar query simples
    console.log("📊 Testando query...");
    const result = await client.query("SELECT version(), current_database(), current_user");
    
    console.log("✅ Query executada com sucesso!\n");
    console.log("📋 Informações do banco:");
    console.log(`   - PostgreSQL Version: ${result.rows[0].version.split(',')[0]}`);
    console.log(`   - Database: ${result.rows[0].current_database}`);
    console.log(`   - User: ${result.rows[0].current_user}\n`);

    // Verificar se as tabelas existem
    console.log("🔍 Verificando tabelas...");
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✅ Encontradas ${tables.length} tabelas:\n`);
    
    const expectedTables = ['users', 'sessions', 'conversations', 'messages', 'tickets', 'knowledge_base'];
    const missingTables = expectedTables.filter(t => !tables.includes(t));
    
    tables.forEach(table => {
      const isExpected = expectedTables.includes(table);
      console.log(`   ${isExpected ? '✅' : '⚠️ '} ${table}`);
    });

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Tabelas faltando: ${missingTables.join(', ')}`);
    } else {
      console.log("\n✅ Todas as tabelas esperadas estão presentes!");
    }

    client.release();
    await pool.end();

    console.log("\n🎉 Teste de conexão concluído com sucesso!");
    console.log("✅ O banco de dados está configurado corretamente e pronto para uso.\n");

  } catch (error: any) {
    console.error("\n❌ Erro ao conectar com o banco de dados:\n");
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error("   ⚠️  Não foi possível conectar ao servidor.");
      console.error("   Verifique se:");
      console.error("   - A URL do banco está correta");
      console.error("   - O projeto Supabase está ativo (não pausado)");
      console.error("   - Sua conexão com a internet está funcionando");
    } else if (error.code === '28P01') {
      console.error("   ⚠️  Erro de autenticação.");
      console.error("   Verifique se a senha do banco está correta.");
    } else if (error.code === '3D000') {
      console.error("   ⚠️  Banco de dados não encontrado.");
      console.error("   Verifique se o nome do banco está correto na connection string.");
    } else {
      console.error(`   Código: ${error.code || 'N/A'}`);
      console.error(`   Mensagem: ${error.message}`);
    }
    
    console.error(`\n   Erro completo: ${error.message}\n`);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
