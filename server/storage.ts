import { db } from "./db";
import { 
  tickets, knowledgeBase, 
  type Ticket, type InsertTicket, 
  type KnowledgeDoc, type InsertKnowledgeDoc,
  type Conversation, type Message
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { chatStorage } from "./integrations/chat/storage";

export interface IStorage {
  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicketsByUserId(userId: string): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(
    ticket: InsertTicket,
    conversationId: number,
    userId: string
  ): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket>;

  // Knowledge Base
  getKnowledgeDocs(): Promise<KnowledgeDoc[]>;
  createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDoc>;
  deleteKnowledgeDoc(id: number): Promise<void>;

  // Chat & Auth delegators
  createConversation(title: string): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getMessages(conversationId: number): Promise<Message[]>;
  addMessage(
    conversationId: number,
    role: string,
    content: string
  ): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  // Tickets
  async getTickets(): Promise<Ticket[]> {
    return db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(
    ticket: InsertTicket,
    conversationId: number,
    userId: string
  ): Promise<Ticket> {
    const [newTicket] = await db
      .insert(tickets)
      .values({ ...ticket, conversationId, userId })
      .returning();
    return newTicket;
  }

  async updateTicket(
    id: number,
    updates: Partial<InsertTicket>
  ): Promise<Ticket> {
    const [updated] = await db
      .update(tickets)
      .set(updates)
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  // Knowledge Base
  async getKnowledgeDocs(): Promise<KnowledgeDoc[]> {
    return db
      .select()
      .from(knowledgeBase)
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDoc> {
    const [newDoc] = await db.insert(knowledgeBase).values(doc).returning();
    return newDoc;
  }

  async deleteKnowledgeDoc(id: number): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  // Chat Delegation
  async createConversation(title: string) {
    return chatStorage.createConversation(title);
  }

  async getConversation(id: number) {
    return chatStorage.getConversation(id);
  }

  async getMessages(conversationId: number) {
    return chatStorage.getMessagesByConversation(conversationId);
  }

  async addMessage(conversationId: number, role: string, content: string) {
    return chatStorage.createMessage(conversationId, role, content);
  }
}

export const storage = new DatabaseStorage();
