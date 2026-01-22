/**
 * Módulo de conexão com tratamento especial para Supabase IPv6
 * Resolve o problema de DNS quando apenas IPv6 está disponível
 */

import { Pool, PoolConfig } from "pg";
import dns from "dns";
import { promisify } from "util";

const lookup = promisify(dns.lookup);

/**
 * Resolve o hostname e retorna uma connection string com IP se necessário
 */
async function resolveConnectionString(originalUrl: string): Promise<string> {
  try {
    // Extrair informações da URL
    const url = new URL(originalUrl);
    const hostname = url.hostname;
    
    // Tentar resolver para IPv4 primeiro
    try {
      const ipv4 = await lookup(hostname, { family: 4 });
      if (ipv4) {
        // Usar IPv4 diretamente
        url.hostname = ipv4.address;
        return url.toString();
      }
    } catch (e) {
      // IPv4 não disponível, continuar
    }
    
    // Tentar IPv6
    try {
      const ipv6 = await lookup(hostname, { family: 6 });
      if (ipv6) {
        // Usar IPv6 com notação correta
        url.hostname = `[${ipv6.address}]`;
        return url.toString();
      }
    } catch (e) {
      // IPv6 também falhou
    }
    
    // Se não conseguiu resolver, retornar original
    return originalUrl;
  } catch (error) {
    // Se houver erro, retornar original
    return originalUrl;
  }
}

/**
 * Cria um Pool com configurações otimizadas para Supabase
 */
export async function createSupabasePool(connectionString: string): Promise<Pool> {
  // Tentar resolver o hostname
  const resolvedUrl = await resolveConnectionString(connectionString);
  
  const config: PoolConfig = {
    connectionString: resolvedUrl,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 20,
    // Configurações adicionais para melhor compatibilidade
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
  
  return new Pool(config);
}
