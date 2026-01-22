import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Criar pool apenas se DATABASE_URL estiver disponível
// A validação completa será feita no api/index.ts antes de importar este módulo
let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function createPool(): pg.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  // Verificar se está usando connection pooling (recomendado para Supabase)
  const isUsingPooler = process.env.DATABASE_URL.includes('pooler.supabase.com');
  const isDirectConnection = process.env.DATABASE_URL.includes('db.') && process.env.DATABASE_URL.includes('.supabase.co');

  if (isDirectConnection && !isUsingPooler) {
    console.warn(`
⚠️  AVISO: Você está usando "Direct connection" do Supabase.
   Se encontrar erros de conexão (ENOTFOUND ou ENETUNREACH), 
   use "Connection pooling" ao invés de "Direct connection".
   
   Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database
   E altere o Method para "Connection pooling".
    `);
  }

  // Configurar pool otimizado para Supabase
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 20,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false,
  });

  // Tratamento de erros de conexão
  pool.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOTFOUND' || err.code === 'ENETUNREACH') {
      console.error(`
❌ Erro de conexão: ${err.code}
   
💡 SOLUÇÃO: Use "Connection pooling" do Supabase ao invés de "Direct connection".
   
   1. Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database
   2. Altere Method para "Connection pooling"
   3. Copie a nova connection string
   4. Atualize DATABASE_URL no .env
   5. Reinicie o servidor
      `);
    }
  });

  return pool;
}

// Lazy initialization - criar apenas quando necessário
function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = createPool();
  }
  return poolInstance;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Exportar usando Proxy para manter compatibilidade com código existente
// e inicializar apenas quando realmente usado
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});
