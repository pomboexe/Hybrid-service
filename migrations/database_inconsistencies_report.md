# Relatório de Análise de Inconsistências do Banco de Dados

**Data da Análise**: 19 de Janeiro de 2026  
**Banco de Dados**: PostgreSQL  
**Schema**: Hybrid-Service

---

## 📊 Resumo Executivo

Esta análise foi realizada para identificar inconsistências entre o schema TypeScript definido em `shared/schema.ts` e o estado atual do banco de dados PostgreSQL.

### Estatísticas Gerais

- **Total de Tabelas Analisadas**: 6
- **Total de Registros**:
  - `users`: 7
  - `tickets`: 6
  - `conversations`: 6
  - `messages`: 13
  - `knowledge_base`: 1
  - `sessions`: 3

---

## 🔴 Inconsistências Críticas Encontradas

### 1. Tickets sem `glpi_id` (CRÍTICO)

**Severidade**: 🔴 Crítica  
**Tipo**: `missing_glpi_id`

#### Problema
6 tickets têm `glpi_id` NULL, violando a definição do schema TypeScript em `shared/schema.ts` que define:
```typescript
glpiId: integer("glpi_id").notNull().unique()
```

#### Estado Atual
- O banco de dados permite NULL na coluna `glpi_id`
- Não há constraint NOT NULL aplicada
- Não há constraint UNIQUE aplicada

#### Tickets Afetados

| ID | Título | Status | User ID | Conversation ID | Criado em |
|---|---|---|---|---|---|
| 1 | "Não consigo responder as mensagens pois n tem interface" | resolved | NULL | 1 | 2026-01-14 03:58:39 |
| 2 | "teste" | open | NULL | 2 | 2026-01-14 04:11:21 |
| 3 | "aaa" | open | NULL | 3 | 2026-01-14 04:11:41 |
| 4 | "Testeee" | open | NULL | 4 | 2026-01-14 04:14:09 |
| 5 | "1231" | open | 65dc8d46-1f94-4779-9e56-6511c617e77a | 5 | 2026-01-14 04:18:21 |
| 6 | "teste" | open | 2e4a2dcc-1965-43db-a6c7-81995833f3b5 | 6 | 2026-01-14 04:44:16 |

#### Impacto
- **Violação do Schema**: O código TypeScript assume que `glpi_id` sempre existe
- **Possíveis Falhas**: Consultas que usam `glpi_id` sem verificação de NULL podem falhar
- **Integridade Referencial**: Sem `glpi_id`, não é possível fazer referência correta ao ticket no GLPI
- **Constraint UNIQUE**: Impossível aplicar constraint UNIQUE com valores NULL

#### Recomendação

**Opção A - Migrar para GLPI (RECOMENDADO)**:
```bash
npm run migrate:tickets-to-glpi
```
Este script irá:
1. Buscar todos os tickets sem `glpi_id`
2. Criar cada ticket no GLPI via API
3. Atualizar o ticket local com o `glpi_id` retornado

**Opção B - Atribuir IDs Temporários**:
Se os tickets não devem ser migrados para GLPI (ex: dados de teste), atribuir valores temporários únicos:
```sql
-- Gerar IDs temporários únicos (começando de -1, -2, etc.)
UPDATE tickets 
SET glpi_id = -id 
WHERE glpi_id IS NULL;
```

**Opção C - Deletar Dados de Teste**:
Se os tickets são apenas dados de teste:
```sql
DELETE FROM tickets WHERE glpi_id IS NULL;
```

---

### 2. Falta de Constraint NOT NULL em `glpi_id`

**Severidade**: 🔴 Crítica  
**Tipo**: `missing_not_null_constraint`

#### Problema
O schema TypeScript define `glpi_id` como `.notNull()`, mas o banco de dados permite NULL.

#### Estado Atual
```sql
-- Verificação atual
SELECT is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'glpi_id';
-- Resultado: YES (permite NULL)
```

#### Impacto
- Inconsistência entre schema TypeScript e banco de dados
- Permite inserção de novos tickets sem `glpi_id`
- Risco de regressão: novos dados podem violar o schema esperado

#### Recomendação
Após resolver os tickets sem `glpi_id`, aplicar a migration:
```sql
ALTER TABLE tickets ALTER COLUMN glpi_id SET NOT NULL;
```

**Arquivo**: `migrations/fix_glpi_id_constraints.sql`

---

### 3. Falta de Constraint UNIQUE em `glpi_id`

**Severidade**: 🔴 Crítica  
**Tipo**: `missing_unique_constraint`

#### Problema
O schema TypeScript define `glpi_id` como `.unique()`, mas o banco tem apenas um índice não-único.

#### Estado Atual
- Existe índice: `idx_tickets_glpi_id` (não-único)
- Não existe constraint UNIQUE
- Não existe índice único

#### Impacto
- Permite duplicatas de `glpi_id`, violando integridade referencial com GLPI
- Um mesmo ticket GLPI pode estar associado a múltiplos registros locais
- Problemas de sincronização e inconsistência de dados

#### Recomendação
Após garantir que não há duplicatas, aplicar:
```sql
ALTER TABLE tickets ADD CONSTRAINT tickets_glpi_id_unique UNIQUE (glpi_id);
```

**Arquivo**: `migrations/fix_glpi_id_constraints.sql`

---

## ✅ Pontos Positivos Validados

Durante a análise, foram verificados e **validados** os seguintes aspectos:

- ✅ **Foreign Keys Íntegras**: Todas as referências estão corretas
  - `tickets.conversation_id` → `conversations.id`: OK
  - `tickets.user_id` → `users.id`: OK
  - `tickets.assigned_to` → `users.id`: OK
  - `tickets.transfer_request_to` → `users.id`: OK
  - `messages.conversation_id` → `conversations.id`: OK

- ✅ **Emails Únicos**: Nenhum email duplicado encontrado

- ✅ **Campos Obrigatórios**: Todos os campos obrigatórios estão preenchidos
  - `users.email`: OK
  - `users.password`: OK
  - `conversations.title`: OK
  - `messages.content`: OK
  - `messages.role`: OK

- ✅ **Timestamps Válidos**: Todos os timestamps estão dentro de limites razoáveis

- ✅ **Valores de Enum Válidos**:
  - `users.role`: `user`, `admin` (válidos)
  - `tickets.status`: `open`, `resolved` (válidos)
  - `messages.role`: `user`, `agent` (válidos)

---

## 🔧 Plano de Correção

### Passo 1: Executar Script de Análise
```bash
npm run analyze:database
# ou
tsx script/analyze-database-inconsistencies.ts
```

Este script irá:
- Verificar todas as inconsistências
- Gerar relatório JSON em `migrations/database_inconsistencies_report.json`
- Exibir resumo no console

### Passo 2: Corrigir Tickets sem `glpi_id`

**Escolha uma das opções abaixo:**

#### Opção A: Migrar para GLPI (Produção)
```bash
npm run migrate:tickets-to-glpi
```

**Pré-requisitos**:
- Variáveis de ambiente GLPI configuradas:
  - `GLPI_API_URL`
  - `GLPI_APP_TOKEN`
  - `GLPI_AUTH_TOKEN`

#### Opção B: IDs Temporários (Desenvolvimento/Teste)
```sql
-- Conectar ao banco e executar:
BEGIN;
UPDATE tickets 
SET glpi_id = -id 
WHERE glpi_id IS NULL;
COMMIT;
```

#### Opção C: Deletar Dados de Teste
```sql
-- ATENÇÃO: Esta ação é irreversível!
BEGIN;
DELETE FROM tickets WHERE glpi_id IS NULL;
COMMIT;
```

### Passo 3: Validar Correções
```bash
# Executar análise novamente
npm run analyze:database

# Verificar que não há mais tickets sem glpi_id
```

### Passo 4: Aplicar Constraints

**IMPORTANTE**: Apenas execute após garantir que todos os tickets têm `glpi_id`!

```bash
# Via psql
psql $DATABASE_URL -f migrations/fix_glpi_id_constraints.sql

# Ou via script Node.js (se existir)
```

A migration `fix_glpi_id_constraints.sql` irá:
1. ✅ Verificar que não há tickets sem `glpi_id` (falha se houver)
2. ✅ Verificar que não há duplicatas (falha se houver)
3. ✅ Remover índice não-único existente
4. ✅ Adicionar constraint NOT NULL
5. ✅ Adicionar constraint UNIQUE

### Passo 5: Validação Final
```bash
# Executar análise final
npm run analyze:database

# Verificar constraints no banco
psql $DATABASE_URL -c "
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tickets'
  AND kcu.column_name = 'glpi_id';
"
```

---

## 📝 Scripts SQL para Correção Manual

### Verificar Tickets sem `glpi_id`
```sql
SELECT 
  id,
  glpi_id,
  title,
  status,
  user_id,
  conversation_id,
  created_at
FROM tickets
WHERE glpi_id IS NULL
ORDER BY id;
```

### Verificar Duplicatas de `glpi_id`
```sql
SELECT 
  glpi_id,
  COUNT(*) as quantidade,
  array_agg(id) as ticket_ids
FROM tickets
WHERE glpi_id IS NOT NULL
GROUP BY glpi_id
HAVING COUNT(*) > 1;
```

### Verificar Constraints Atuais
```sql
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tickets'
  AND column_name = 'glpi_id';
```

### Verificar Índices em `glpi_id`
```sql
SELECT 
  i.relname AS index_name,
  ix.indisunique AS is_unique,
  array_agg(a.attname) AS column_names
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'tickets'
  AND 'glpi_id' = ANY(array_agg(a.attname))
GROUP BY i.relname, ix.indisunique;
```

---

## 📚 Referências

### Arquivos Relacionados

- **Schema TypeScript**: `shared/schema.ts` (linha 22)
- **Migration Original**: `migrations/add_glpi_id_column.sql`
- **Script de Migração**: `script/migrate-tickets-to-glpi.ts`
- **Script de Análise**: `script/analyze-database-inconsistencies.ts`
- **Migration de Correção**: `migrations/fix_glpi_id_constraints.sql`

### Comandos NPM

Adicionar ao `package.json` (recomendado):
```json
{
  "scripts": {
    "analyze:database": "tsx script/analyze-database-inconsistencies.ts"
  }
}
```

---

## ⚠️ Avisos Importantes

1. **Backup**: Sempre faça backup do banco antes de aplicar migrations
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Ambiente**: Teste em ambiente de desenvolvimento antes de produção

3. **Dependências**: A migration `fix_glpi_id_constraints.sql` requer que TODOS os tickets tenham `glpi_id` preenchido

4. **Rollback**: Mantenha um plano de rollback caso algo dê errado

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Execute o script de análise para diagnóstico
2. Verifique os logs de erro
3. Consulte a documentação do projeto
4. Revise o código em `shared/schema.ts` para entender a intenção do schema

---

**Última Atualização**: 19 de Janeiro de 2026
