import "dotenv/config";
import { db } from "../server/db";
import { tickets } from "@shared/schema";
import { glpiClient } from "../server/utils/glpi";
import { eq, isNull } from "drizzle-orm";

/**
 * Script para migrar tickets locais existentes para o GLPI
 * 
 * Este script:
 * 1. Busca todos os tickets locais que não têm glpiId
 * 2. Cria cada ticket no GLPI
 * 3. Atualiza o ticket local com o glpiId retornado
 */

async function migrateTicketsToGLPI() {
  if (!glpiClient.isConfigured()) {
    console.error("❌ GLPI não está configurado. Configure as variáveis de ambiente:");
    console.error("   - GLPI_API_URL");
    console.error("   - GLPI_APP_TOKEN");
    console.error("   - GLPI_AUTH_TOKEN");
    process.exit(1);
  }

  try {
    console.log("🔄 Iniciando migração de tickets locais para GLPI...\n");

    // Buscar todos os tickets locais que não têm glpiId
    const localTickets = await db
      .select()
      .from(tickets)
      .where(isNull(tickets.glpiId));

    console.log(`📋 Encontrados ${localTickets.length} tickets locais para migrar.\n`);

    if (localTickets.length === 0) {
      console.log("✅ Nenhum ticket para migrar. Todos os tickets já têm glpiId.");
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ ticketId: number; error: string }> = [];

    // Migrar cada ticket
    for (const ticket of localTickets) {
      try {
        console.log(`📤 Migrando ticket #${ticket.id}: "${ticket.title}"...`);

        // Mapear campos locais para formato GLPI
        const glpiTicketData = {
          name: ticket.title,
          content: ticket.description || undefined,
          priority: glpiClient.mapPriorityToGLPI(ticket.priority),
          status: glpiClient.mapStatusToGLPI(ticket.status),
        };

        // Criar ticket no GLPI
        const glpiResponse = await glpiClient.createTicket(glpiTicketData);

        if (glpiResponse.id) {
          // Atualizar ticket local com o glpiId
          await db
            .update(tickets)
            .set({ glpiId: glpiResponse.id })
            .where(eq(tickets.id, ticket.id));

          console.log(`   ✅ Migrado com sucesso! GLPI ID: ${glpiResponse.id}`);
          successCount++;
        } else {
          throw new Error("GLPI não retornou ID do ticket criado");
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error(`   ❌ Erro ao migrar ticket #${ticket.id}: ${errorMessage}`);
        errorCount++;
        errors.push({ ticketId: ticket.id, error: errorMessage });
      }

      // Pequeno delay para não sobrecarregar a API do GLPI
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Resumo
    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO DA MIGRAÇÃO");
    console.log("=".repeat(50));
    console.log(`✅ Tickets migrados com sucesso: ${successCount}`);
    console.log(`❌ Tickets com erro: ${errorCount}`);
    console.log(`📋 Total processado: ${localTickets.length}`);

    if (errors.length > 0) {
      console.log("\n⚠️  ERROS ENCONTRADOS:");
      errors.forEach(({ ticketId, error }) => {
        console.log(`   Ticket #${ticketId}: ${error}`);
      });
    }

    if (errorCount === 0) {
      console.log("\n🎉 Migração concluída com sucesso!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Migração concluída com erros. Revise os erros acima.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Erro fatal durante a migração:", error);
    process.exit(1);
  }
}

migrateTicketsToGLPI();
