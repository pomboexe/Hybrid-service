/**
 * Resolvedor de DNS para connection string do Supabase
 * Resolve o problema quando o hostname resolve apenas para IPv6
 */

import dns from "dns";
import { promisify } from "util";

const lookup = promisify(dns.lookup);

export async function resolveDatabaseUrl(originalUrl: string): Promise<string> {
  try {
    const url = new URL(originalUrl);
    const hostname = url.hostname;
    
    // Tentar resolver o hostname
    try {
      const result = await lookup(hostname, { all: true });
      
      if (Array.isArray(result) && result.length > 0) {
        // Preferir IPv4, mas usar IPv6 se necessário
        const ipv4 = result.find((addr: any) => addr.family === 4);
        const ipv6 = result.find((addr: any) => addr.family === 6);
        
        const selected = ipv4 || ipv6;
        if (selected) {
          const ip = selected.address;
          if (selected.family === 6) {
            // IPv6 precisa estar entre colchetes na URL
            return originalUrl.replace(hostname, `[${ip}]`);
          } else {
            // IPv4 pode ser usado diretamente
            return originalUrl.replace(hostname, ip);
          }
        }
      }
    } catch (lookupError: any) {
      // Se lookup falhar, tentar resolve6 e resolve4
      const resolve6 = promisify(dns.resolve6);
      const resolve4 = promisify(dns.resolve4);
      
      try {
        const addresses = await resolve6(hostname);
        if (addresses && addresses.length > 0) {
          return originalUrl.replace(hostname, `[${addresses[0]}]`);
        }
      } catch {
        try {
          const addresses = await resolve4(hostname);
          if (addresses && addresses.length > 0) {
            return originalUrl.replace(hostname, addresses[0]);
          }
        } catch {
          // Se tudo falhar, retornar original
        }
      }
    }
  } catch (error) {
    // Em caso de erro, retornar URL original
  }
  
  return originalUrl;
}
