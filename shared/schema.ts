import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models (REQUIRED by integrations)
export * from "./models/auth";
export * from "./models/chat";

// Import conversations to link tickets
import { conversations } from "./models/chat";

// Import users table for reference
import { users } from "./models/auth";

// === TICKETS ===
// Tabela agora serve principalmente como mapeamento entre GLPI e funcionalidades locais
// Todos os tickets são gerenciados no GLPI, esta tabela apenas mapeia:
// - glpiId -> conversationId (para chat local)
// - glpiId -> userId (para filtro "meus tickets")
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  glpiId: integer("glpi_id").notNull().unique(), // ID do ticket no GLPI (obrigatório, único)
  conversationId: integer("conversation_id").references(() => conversations.id), // Para chat local vinculado ao ticket GLPI
  userId: text("user_id").references(() => users.id), // User que criou o ticket (para filtro "meus tickets")
  createdAt: timestamp("created_at").defaultNow(),
  
  // Campos mantidos temporariamente para compatibilidade (podem ser removidos depois)
  // Esses dados agora vêm exclusivamente do GLPI via API
  title: text("title"), // Não mais obrigatório, vem do GLPI
  description: text("description"),
  status: text("status"),
  priority: text("priority"),
  sentiment: text("sentiment"),
  customerName: text("customer_name"),
  assignedTo: text("assigned_to").references(() => users.id),
  transferRequestTo: text("transfer_request_to").references(() => users.id),
});

// === KNOWLEDGE BASE ===
export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertTicketSchema = createInsertSchema(tickets).omit({ 
  id: true, 
  createdAt: true,
  conversationId: true, // set by backend
  userId: true // set by backend
});

export const insertKnowledgeSchema = createInsertSchema(knowledgeBase).omit({ 
  id: true, 
  createdAt: true 
});

// === TYPES ===
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type KnowledgeDoc = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeDoc = z.infer<typeof insertKnowledgeSchema>;
