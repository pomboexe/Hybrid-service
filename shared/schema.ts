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
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"), // Initial query
  status: text("status").notNull().default("open"), // open, resolved, escalated
  priority: text("priority").notNull().default("medium"), // low, medium, high
  sentiment: text("sentiment").default("neutral"), // positive, neutral, negative
  customerName: text("customer_name"),
  userId: text("user_id").references(() => users.id), // User who created the ticket
  conversationId: integer("conversation_id").references(() => conversations.id),
  assignedTo: text("assigned_to").references(() => users.id), // Admin currently handling the ticket
  transferRequestTo: text("transfer_request_to").references(() => users.id), // Admin requesting transfer
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
