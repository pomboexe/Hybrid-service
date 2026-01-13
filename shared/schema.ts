import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models (REQUIRED by integrations)
export * from "./models/auth";
export * from "./models/chat";

// Import conversations to link tickets
import { conversations } from "./models/chat";

// === TICKETS ===
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"), // Initial query
  status: text("status").notNull().default("open"), // open, resolved, escalated
  priority: text("priority").notNull().default("medium"), // low, medium, high
  sentiment: text("sentiment").default("neutral"), // positive, neutral, negative
  isAiActive: boolean("is_ai_active").default(true),
  customerName: text("customer_name"),
  conversationId: integer("conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  conversationId: true // set by backend
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
