-- Adiciona coluna glpi_id na tabela de tickets para integração com GLPI
-- Esta coluna armazena o ID do ticket criado no GLPI

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS glpi_id INTEGER;

-- Índice para melhorar performance nas buscas por GLPI ID
CREATE INDEX IF NOT EXISTS idx_tickets_glpi_id ON tickets(glpi_id);
