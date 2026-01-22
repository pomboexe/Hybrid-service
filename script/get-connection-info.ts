#!/usr/bin/env tsx
/**
 * Script para ajudar a obter informações sobre a connection string
 */

console.log(`
🔍 GUIA PARA ENCONTRAR A CONNECTION STRING NO SUPABASE
═══════════════════════════════════════════════════════

📍 PASSO A PASSO:

1. Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa

2. No menu lateral ESQUERDO, clique em:
   ⚙️  Settings (ou Configurações)

3. No submenu, clique em:
   📊 Database

4. Role a página para BAIXO até encontrar:
   📋 "Connection string" ou "Connection pooling"

5. Você verá algo como:
   ┌─────────────────────────────────────────────────┐
   │ Connection string                               │
   │                                                 │
   │ [URI] [Connection pooling] [Session mode]      │
   │                                                 │
   │ postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:... │
   │ [📋 Copiar]                                     │
   └─────────────────────────────────────────────────┘

6. Clique no botão de COPIAR (📋) ou selecione o texto

7. Cole no arquivo .env substituindo a linha DATABASE_URL

═══════════════════════════════════════════════════════

🔗 URL DIRETA (tente acessar):
https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database

💡 DICA: A connection string geralmente está no FINAL da página.
   Role bastante para baixo!

⚠️  Se não encontrar, verifique:
   - Você está logado?
   - Você tem acesso ao projeto?
   - O projeto não está pausado?

`);
