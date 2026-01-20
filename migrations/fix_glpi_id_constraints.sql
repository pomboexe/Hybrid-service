-- Migration para corrigir constraints de glpi_id na tabela tickets
-- Esta migration adiciona constraints NOT NULL e UNIQUE conforme definido no schema TypeScript
--
-- ATENÇÃO: Esta migration requer que TODOS os tickets tenham glpi_id preenchido.
-- Se houver tickets com glpi_id NULL, esta migration irá FALHAR.
--
-- ANTES DE EXECUTAR:
-- 1. Execute o script de análise: npm run analyze:database (ou tsx script/analyze-database-inconsistencies.ts)
-- 2. Migre tickets sem glpi_id para GLPI usando: npm run migrate:tickets-to-glpi
--    OU atribua valores temporários únicos manualmente
-- 3. Verifique novamente com o script de análise que não há mais tickets sem glpi_id

BEGIN;

-- 1. Verificar se há tickets sem glpi_id (isso irá falhar a migration se houver)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM tickets
  WHERE glpi_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration abortada: Existem % tickets com glpi_id NULL. Por favor, migre-os para GLPI ou atribua valores temporários antes de executar esta migration.', null_count;
  END IF;
END $$;

-- 2. Verificar se há duplicatas de glpi_id
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT glpi_id, COUNT(*) as cnt
    FROM tickets
    WHERE glpi_id IS NOT NULL
    GROUP BY glpi_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Migration abortada: Existem glpi_id duplicados. Por favor, corrija as duplicatas antes de executar esta migration.';
  END IF;
END $$;

-- 3. Remover índice não-único existente (se existir)
DROP INDEX IF EXISTS idx_tickets_glpi_id;

-- 4. Adicionar constraint NOT NULL
ALTER TABLE tickets
  ALTER COLUMN glpi_id SET NOT NULL;

-- 5. Adicionar constraint UNIQUE
ALTER TABLE tickets
  ADD CONSTRAINT tickets_glpi_id_unique UNIQUE (glpi_id);

-- 6. Criar índice único (o constraint UNIQUE já cria um índice, mas podemos criar um adicional se necessário)
-- O índice já é criado automaticamente pelo constraint UNIQUE, então este passo é opcional
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_glpi_id_unique ON tickets(glpi_id);

COMMIT;

-- Verificação final
DO $$
BEGIN
  RAISE NOTICE 'Migration concluída com sucesso!';
  RAISE NOTICE 'Constraints aplicadas:';
  RAISE NOTICE '  - glpi_id NOT NULL: ✅';
  RAISE NOTICE '  - glpi_id UNIQUE: ✅';
END $$;
