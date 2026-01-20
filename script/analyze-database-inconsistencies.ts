import "dotenv/config";
import { db, pool } from "../server/db";
import { tickets, users, conversations, messages, knowledgeBase } from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";
import { writeFile } from "fs/promises";
import { join } from "path";

interface Inconsistency {
  type: string;
  severity: "critical" | "warning" | "info";
  description: string;
  affectedRecords: any[];
  recommendation: string;
}

interface AnalysisReport {
  timestamp: string;
  summary: {
    totalInconsistencies: number;
    critical: number;
    warnings: number;
    info: number;
  };
  inconsistencies: Inconsistency[];
  statistics: {
    tables: Record<string, number>;
    constraints: any[];
  };
}

async function analyzeDatabase(): Promise<AnalysisReport> {
  const inconsistencies: Inconsistency[] = [];
  const statistics: AnalysisReport["statistics"] = {
    tables: {},
    constraints: [],
  };

  console.log("🔍 Iniciando análise de inconsistências do banco de dados...\n");

  // 1. Estatísticas gerais
  console.log("📊 Coletando estatísticas gerais...");
  const tableCounts = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(tickets),
    db.select({ count: sql<number>`count(*)` }).from(conversations),
    db.select({ count: sql<number>`count(*)` }).from(messages),
    db.select({ count: sql<number>`count(*)` }).from(knowledgeBase),
  ]);

  statistics.tables = {
    users: Number(tableCounts[0][0].count),
    tickets: Number(tableCounts[1][0].count),
    conversations: Number(tableCounts[2][0].count),
    messages: Number(tableCounts[3][0].count),
    knowledge_base: Number(tableCounts[4][0].count),
  };

  // 2. Verificar tickets sem glpi_id (CRÍTICO)
  console.log("🔍 Verificando tickets sem glpi_id...");
  const ticketsWithoutGlpiId = await db
    .select()
    .from(tickets)
    .where(isNull(tickets.glpiId));

  if (ticketsWithoutGlpiId.length > 0) {
    inconsistencies.push({
      type: "missing_glpi_id",
      severity: "critical",
      description: `${ticketsWithoutGlpiId.length} tickets têm glpi_id NULL, violando a definição do schema que exige glpi_id obrigatório e único`,
      affectedRecords: ticketsWithoutGlpiId.map((t) => ({
        id: t.id,
        glpi_id: t.glpiId,
        title: t.title,
        status: t.status,
        created_at: t.createdAt,
      })),
      recommendation:
        "Migrar tickets para GLPI usando script/migrate-tickets-to-glpi.ts OU atribuir valores temporários únicos antes de aplicar constraints",
    });
  }

  // 3. Verificar duplicatas de glpi_id
  console.log("🔍 Verificando duplicatas de glpi_id...");
  const duplicateGlpiIds = await pool.query(`
    SELECT glpi_id, COUNT(*) as quantidade
    FROM tickets
    WHERE glpi_id IS NOT NULL
    GROUP BY glpi_id
    HAVING COUNT(*) > 1
  `);

  if (duplicateGlpiIds.rows.length > 0) {
    inconsistencies.push({
      type: "duplicate_glpi_id",
      severity: "critical",
      description: `Encontrados glpi_id duplicados (deveria ser único)`,
      affectedRecords: duplicateGlpiIds.rows,
      recommendation:
        "Remover duplicatas ou corrigir dados antes de aplicar constraint UNIQUE",
    });
  }

  // 4. Verificar constraints do banco vs schema
  console.log("🔍 Verificando constraints do banco...");
  const glpiIdColumnInfo = await pool.query(`
    SELECT 
      column_name,
      is_nullable,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'glpi_id'
  `);

  if (glpiIdColumnInfo.rows.length > 0) {
    const colInfo = glpiIdColumnInfo.rows[0];
    if (colInfo.is_nullable === "YES") {
      inconsistencies.push({
        type: "missing_not_null_constraint",
        severity: "critical",
        description: `Coluna glpi_id permite NULL, mas schema define como notNull()`,
        affectedRecords: [{ column: "glpi_id", is_nullable: colInfo.is_nullable }],
        recommendation: "Adicionar constraint NOT NULL após corrigir tickets sem glpi_id",
      });
    }

    // Verificar se há índice único
    const uniqueIndex = await pool.query(`
      SELECT 
        i.relname AS index_name,
        ix.indisunique AS is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = 'tickets'
        AND a.attname = 'glpi_id'
        AND ix.indisunique = true
    `);

    if (uniqueIndex.rows.length === 0) {
      inconsistencies.push({
        type: "missing_unique_constraint",
        severity: "critical",
        description: `Coluna glpi_id não possui constraint UNIQUE, mas schema define como unique()`,
        affectedRecords: [],
        recommendation: "Adicionar constraint UNIQUE em glpi_id",
      });
    }
  }

  // 5. Verificar foreign keys quebradas
  console.log("🔍 Verificando foreign keys quebradas...");
  const brokenForeignKeys = await pool.query(`
    SELECT 
      'tickets -> conversations' as relacao,
      t.id,
      t.conversation_id,
      CASE WHEN c.id IS NULL THEN 'conversation_id inválido' END as problema
    FROM tickets t
    LEFT JOIN conversations c ON t.conversation_id = c.id
    WHERE t.conversation_id IS NOT NULL AND c.id IS NULL
    UNION ALL
    SELECT 
      'tickets -> users (user_id)',
      t.id,
      t.user_id::text,
      CASE WHEN u.id IS NULL THEN 'user_id inválido' END
    FROM tickets t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.user_id IS NOT NULL AND u.id IS NULL
    UNION ALL
    SELECT 
      'tickets -> users (assigned_to)',
      t.id,
      t.assigned_to,
      CASE WHEN u.id IS NULL THEN 'assigned_to inválido' END
    FROM tickets t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.assigned_to IS NOT NULL AND u.id IS NULL
    UNION ALL
    SELECT 
      'messages -> conversations',
      m.id,
      m.conversation_id::text,
      CASE WHEN c.id IS NULL THEN 'conversation_id inválido' END
    FROM messages m
    LEFT JOIN conversations c ON m.conversation_id = c.id
    WHERE c.id IS NULL
  `);

  if (brokenForeignKeys.rows.length > 0) {
    inconsistencies.push({
      type: "broken_foreign_keys",
      severity: "critical",
      description: `${brokenForeignKeys.rows.length} registros com foreign keys quebradas`,
      affectedRecords: brokenForeignKeys.rows,
      recommendation: "Corrigir ou remover registros órfãos",
    });
  }

  // 6. Verificar emails duplicados
  console.log("🔍 Verificando emails duplicados...");
  const duplicateEmails = await pool.query(`
    SELECT email, COUNT(*) as quantidade
    FROM users
    GROUP BY email
    HAVING COUNT(*) > 1
  `);

  if (duplicateEmails.rows.length > 0) {
    inconsistencies.push({
      type: "duplicate_emails",
      severity: "critical",
      description: `Encontrados emails duplicados (deveria ser único)`,
      affectedRecords: duplicateEmails.rows,
      recommendation: "Remover duplicatas de emails",
    });
  }

  // 7. Verificar campos obrigatórios NULL
  console.log("🔍 Verificando campos obrigatórios NULL...");
  const requiredFieldsNull = await pool.query(`
    SELECT 
      'users' as tabela,
      id,
      CASE 
        WHEN email IS NULL THEN 'email'
        WHEN password IS NULL THEN 'password'
      END as campo_null
    FROM users
    WHERE email IS NULL OR password IS NULL
    UNION ALL
    SELECT 
      'conversations',
      id::text,
      CASE WHEN title IS NULL OR title = '' THEN 'title' END
    FROM conversations
    WHERE title IS NULL OR title = ''
    UNION ALL
    SELECT 
      'messages',
      id::text,
      CASE 
        WHEN conversation_id IS NULL THEN 'conversation_id'
        WHEN role IS NULL THEN 'role'
        WHEN content IS NULL THEN 'content'
      END
    FROM messages
    WHERE conversation_id IS NULL OR role IS NULL OR content IS NULL
  `);

  if (requiredFieldsNull.rows.length > 0) {
    inconsistencies.push({
      type: "required_fields_null",
      severity: "warning",
      description: `${requiredFieldsNull.rows.length} registros com campos obrigatórios NULL`,
      affectedRecords: requiredFieldsNull.rows,
      recommendation: "Preencher campos obrigatórios ou corrigir dados",
    });
  }

  // 8. Verificar timestamps inválidos
  console.log("🔍 Verificando timestamps inválidos...");
  const invalidTimestamps = await pool.query(`
    SELECT 
      'users' as tabela,
      COUNT(*) as registros_invalidos
    FROM users
    WHERE created_at > NOW() OR created_at < '2000-01-01'
    UNION ALL
    SELECT 'tickets', COUNT(*)
    FROM tickets
    WHERE created_at > NOW() OR created_at < '2000-01-01'
    UNION ALL
    SELECT 'conversations', COUNT(*)
    FROM conversations
    WHERE created_at > NOW() OR created_at < '2000-01-01'
    UNION ALL
    SELECT 'messages', COUNT(*)
    FROM messages
    WHERE created_at > NOW() OR created_at < '2000-01-01'
  `);

  const totalInvalidTimestamps = invalidTimestamps.rows.reduce(
    (sum, row) => sum + Number(row.registros_invalidos),
    0
  );

  if (totalInvalidTimestamps > 0) {
    inconsistencies.push({
      type: "invalid_timestamps",
      severity: "warning",
      description: `${totalInvalidTimestamps} registros com timestamps inválidos (no futuro ou muito antigos)`,
      affectedRecords: invalidTimestamps.rows.filter(
        (r) => Number(r.registros_invalidos) > 0
      ),
      recommendation: "Corrigir timestamps inválidos",
    });
  }

  // 9. Verificar tickets órfãos (sem user_id e sem conversation_id)
  console.log("🔍 Verificando tickets órfãos...");
  const orphanTickets = await db
    .select()
    .from(tickets)
    .where(sql`user_id IS NULL AND conversation_id IS NULL`);

  if (orphanTickets.length > 0) {
    inconsistencies.push({
      type: "orphan_tickets",
      severity: "warning",
      description: `${orphanTickets.length} tickets sem user_id e sem conversation_id`,
      affectedRecords: orphanTickets.map((t) => ({
        id: t.id,
        glpi_id: t.glpiId,
        title: t.title,
      })),
      recommendation:
        "Verificar se esses tickets devem ter user_id ou conversation_id atribuídos",
    });
  }

  // 10. Verificar conversations sem messages
  console.log("🔍 Verificando conversations sem messages...");
  const conversationsWithoutMessages = await pool.query(`
    SELECT c.id, c.title, c.created_at
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE m.id IS NULL
  `);

  if (conversationsWithoutMessages.rows.length > 0) {
    inconsistencies.push({
      type: "conversations_without_messages",
      severity: "info",
      description: `${conversationsWithoutMessages.rows.length} conversations sem messages associadas`,
      affectedRecords: conversationsWithoutMessages.rows,
      recommendation:
        "Pode ser normal para conversations recém-criadas, verificar se é esperado",
    });
  }

  // 11. Verificar múltiplos tickets apontando para mesma conversation
  console.log("🔍 Verificando múltiplos tickets por conversation...");
  const multipleTicketsPerConversation = await pool.query(`
    SELECT conversation_id, COUNT(*) as quantidade_tickets
    FROM tickets
    WHERE conversation_id IS NOT NULL
    GROUP BY conversation_id
    HAVING COUNT(*) > 1
  `);

  if (multipleTicketsPerConversation.rows.length > 0) {
    inconsistencies.push({
      type: "multiple_tickets_per_conversation",
      severity: "info",
      description: `${multipleTicketsPerConversation.rows.length} conversations com múltiplos tickets associados`,
      affectedRecords: multipleTicketsPerConversation.rows,
      recommendation:
        "Verificar se isso é comportamento esperado do sistema",
    });
  }

  // Resumo
  const summary = {
    totalInconsistencies: inconsistencies.length,
    critical: inconsistencies.filter((i) => i.severity === "critical").length,
    warnings: inconsistencies.filter((i) => i.severity === "warning").length,
    info: inconsistencies.filter((i) => i.severity === "info").length,
  };

  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    summary,
    inconsistencies,
    statistics,
  };

  return report;
}

async function generateReport(report: AnalysisReport) {
  console.log("\n" + "=".repeat(70));
  console.log("📊 RELATÓRIO DE ANÁLISE DE INCONSISTÊNCIAS");
  console.log("=".repeat(70));
  console.log(`📅 Data: ${new Date(report.timestamp).toLocaleString("pt-BR")}`);
  console.log(`\n📈 RESUMO:`);
  console.log(`   Total de inconsistências: ${report.summary.totalInconsistencies}`);
  console.log(`   🔴 Críticas: ${report.summary.critical}`);
  console.log(`   🟡 Avisos: ${report.summary.warnings}`);
  console.log(`   🔵 Informações: ${report.summary.info}`);

  console.log(`\n📊 ESTATÍSTICAS:`);
  Object.entries(report.statistics.tables).forEach(([table, count]) => {
    console.log(`   ${table}: ${count} registros`);
  });

  if (report.inconsistencies.length > 0) {
    console.log(`\n⚠️  INCONSISTÊNCIAS ENCONTRADAS:\n`);
    report.inconsistencies.forEach((inc, index) => {
      const icon =
        inc.severity === "critical"
          ? "🔴"
          : inc.severity === "warning"
          ? "🟡"
          : "🔵";
      console.log(
        `${index + 1}. ${icon} [${inc.severity.toUpperCase()}] ${inc.type}`
      );
      console.log(`   Descrição: ${inc.description}`);
      if (inc.affectedRecords.length > 0) {
        console.log(
          `   Registros afetados: ${inc.affectedRecords.length} (primeiros 3)`
        );
        inc.affectedRecords.slice(0, 3).forEach((record, i) => {
          console.log(`      ${i + 1}. ${JSON.stringify(record)}`);
        });
        if (inc.affectedRecords.length > 3) {
          console.log(
            `      ... e mais ${inc.affectedRecords.length - 3} registros`
          );
        }
      }
      console.log(`   Recomendação: ${inc.recommendation}`);
      console.log("");
    });
  } else {
    console.log(`\n✅ Nenhuma inconsistência encontrada!`);
  }

  // Salvar relatório em JSON
  const reportPath = join(process.cwd(), "migrations", "database_inconsistencies_report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n💾 Relatório JSON salvo em: ${reportPath}`);
}

async function main() {
  try {
    const report = await analyzeDatabase();
    await generateReport(report);

    const exitCode = report.summary.critical > 0 ? 1 : 0;
    if (exitCode === 1) {
      console.log(
        `\n⚠️  Análise concluída com ${report.summary.critical} inconsistência(s) crítica(s).`
      );
    } else {
      console.log(`\n✅ Análise concluída sem inconsistências críticas.`);
    }

    process.exit(exitCode);
  } catch (error) {
    console.error("❌ Erro durante a análise:", error);
    process.exit(1);
  }
}

main();
