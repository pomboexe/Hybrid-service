#!/usr/bin/env tsx
/**
 * Script para listar projetos Supabase disponíveis
 * Execute: tsx script/list-supabase-projects.ts
 */

import "dotenv/config";

// Este script precisa ser executado manualmente ou você pode fornecer o project_id
// O project_id pode ser encontrado no dashboard do Supabase:
// https://app.supabase.com/project/_/settings/general

console.log(`
Para obter o Project ID do Supabase:

1. Acesse: https://app.supabase.com
2. Selecione sua organização: pomboexe's Org
3. Selecione o projeto desejado
4. Vá em Settings > General
5. Copie o "Reference ID" (project_id)

Ou use a API do Supabase Management para listar projetos programaticamente.
`);

// Se você tiver o SUPABASE_ACCESS_TOKEN configurado, podemos listar os projetos
if (process.env.SUPABASE_ACCESS_TOKEN) {
  const orgId = "xhhfcdywzibjyaanubjj";
  console.log(`\nTentando listar projetos da organização: ${orgId}`);
  console.log("Execute este script com o SUPABASE_ACCESS_TOKEN configurado para listar projetos automaticamente.");
} else {
  console.log("\nPara listar projetos automaticamente, configure SUPABASE_ACCESS_TOKEN no .env");
}
