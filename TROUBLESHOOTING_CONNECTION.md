# Troubleshooting: Problema de Conexão com Supabase

## Problema Identificado

O hostname `db.mgfrfhwxbrbrqfcmbgoa.supabase.co` não está sendo resolvido (erro ENOTFOUND).

## Possíveis Causas

1. **Formato do hostname pode estar incorreto**
   - O formato `db.PROJECT.supabase.co` pode não ser o correto para conexões externas
   - O Supabase pode usar um formato diferente para conexões via Node.js

2. **Problema de DNS**
   - Seu provedor de internet pode não estar resolvendo esse domínio
   - Firewall ou proxy pode estar bloqueando

3. **Formato correto pode ser diferente**
   - O Supabase geralmente usa `aws-0-[REGION].pooler.supabase.com` para connection pooling
   - Ou um formato específico da região

## Soluções

### Solução 1: Verificar no Dashboard do Supabase

1. Acesse: https://app.supabase.com/project/mgfrfhwxbrbrqfcmbgoa/settings/database
2. Procure por **"Connection string"** ou **"Connection pooling"**
3. Verifique se há **múltiplas opções** de connection string
4. Tente a opção **"Connection pooling"** ao invés de "URI"

### Solução 2: Usar Connection Pooling

O formato de connection pooling geralmente é:
```
postgresql://postgres.mgfrfhwxbrbrqfcmbgoa:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Solução 3: Verificar Região do Projeto

1. No dashboard do Supabase, vá em **Settings > General**
2. Verifique qual é a **região** do projeto (ex: `us-east-1`, `eu-west-1`)
3. Use essa região na connection string

### Solução 4: Testar DNS

Execute no terminal:
```bash
nslookup db.mgfrfhwxbrbrqfcmbgoa.supabase.co
```

Se não resolver, o problema é DNS.

### Solução 5: Usar IP Direto (temporário)

Se conseguir o IP do servidor, pode usar temporariamente:
```
postgresql://postgres:[PASSWORD]@[IP]:5432/postgres
```

## Status Atual

- ✅ `.env` atualizado com a connection string fornecida
- ❌ Hostname não está sendo resolvido
- ✅ MCP do Supabase consegue conectar (projeto está ativo)
- ⏳ Testando se o servidor consegue conectar

## Próximos Passos

1. Verificar se o servidor conseguiu conectar (ver logs)
2. Se não funcionar, tentar o formato de connection pooling
3. Verificar a região do projeto no dashboard
4. Contatar suporte do Supabase se o problema persistir
