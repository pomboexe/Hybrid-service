import { db } from "./db";
import { 
  tickets, knowledgeBase, 
  type Ticket, type InsertTicket, 
  type KnowledgeDoc, type InsertKnowledgeDoc,
  type Conversation, type Message
} from "@shared/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { chatStorage } from "./integrations/chat/storage";
import { glpiClient, type GLPITicket } from "./utils/glpi";

/**
 * Decodifica HTML entities (ex: &#60; -> <, &#62; -> >, &#38; -> &)
 */
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export interface PaginatedTicketsResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IStorage {
  // Tickets (agora exclusivamente via GLPI)
  getTickets(page?: number, limit?: number): Promise<PaginatedTicketsResponse>;
  getTicketByGlpiId(glpiId: number): Promise<Ticket | undefined>;
  getTicketByConversationId(conversationId: number): Promise<Ticket | undefined>;
  getTicketsByUserId(userId: string): Promise<Ticket[]>;
  createTicket(
    ticket: InsertTicket,
    conversationId: number | null,
    userId: string | null
  ): Promise<Ticket>;
  updateTicket(glpiId: number, updates: Partial<InsertTicket>): Promise<Ticket>;
  // Método auxiliar para criar/atualizar mapeamento local
  upsertTicketMapping(glpiId: number, conversationId?: number | null, userId?: string | null): Promise<void>;
  // Método auxiliar para buscar total de tickets
  getTotalTicketsCount(): Promise<number>;

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
  /**
   * Busca tickets do GLPI com paginação e mapeia para o formato local
   * @param page - Número da página (1-indexed, padrão: 1)
   * @param limit - Quantidade de tickets por página (padrão: 20)
   */
  async getTickets(page: number = 1, limit: number = 20): Promise<PaginatedTicketsResponse> {
    if (!glpiClient.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    // Validar parâmetros
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;

    try {
      // Calcular range para paginação
      const start = (page - 1) * limit + 1;
      const end = page * limit;

      // Buscar tickets paginados do GLPI
      const glpiTickets = await glpiClient.getTicketsFromGLPI(
        { start, end },
        'DESC'
      );
      
      // Buscar mapeamentos locais para enriquecer dados
      const glpiIds = glpiTickets.map(t => t.id);
      let mappingMap = new Map();
      
      if (glpiIds.length > 0) {
        // Buscar mapeamentos usando IN clause
        const mappings = await db
          .select()
          .from(tickets)
          .where(inArray(tickets.glpiId, glpiIds));
        mappingMap = new Map(mappings.map(m => [m.glpiId, m]));
      }

      // Mapear tickets do GLPI para formato local
      const mappedTickets = glpiTickets.map((glpiTicket: GLPITicket): Ticket => {
        const mapping = mappingMap.get(glpiTicket.id);
        
        // Decodificar HTML entities no conteúdo
        const description = glpiTicket.content 
          ? decodeHtmlEntities(glpiTicket.content)
          : null;

        // Usar date_creation ou date como createdAt
        const createdAt = glpiTicket.date_creation 
          ? new Date(glpiTicket.date_creation)
          : glpiTicket.date 
          ? new Date(glpiTicket.date)
          : new Date();

        // Mapear campos do GLPI para formato local
        return {
          id: mapping?.id || 0,
          glpiId: glpiTicket.id,
          title: glpiTicket.name || "Sem título",
          description: description || undefined,
          status: glpiClient.mapStatusFromGLPI(glpiTicket.status),
          priority: glpiClient.mapPriorityFromGLPI(glpiTicket.priority),
          sentiment: "neutral" as const,
          customerName: null,
          userId: mapping?.userId || null,
          conversationId: mapping?.conversationId || null,
          assignedTo: null,
          transferRequestTo: null,
          createdAt,
        } as Ticket;
      });

      // Buscar total de tickets (último ID)
      const total = await this.getTotalTicketsCount();
      const totalPages = Math.ceil(total / limit);

      return {
        tickets: mappedTickets,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar tickets do GLPI:", error);
      throw error;
    }
  }

  /**
   * Busca o total de tickets (baseado no último ID do GLPI)
   */
  async getTotalTicketsCount(): Promise<number> {
    if (!glpiClient.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    try {
      const lastId = await glpiClient.getLastTicketId();
      return lastId;
    } catch (error) {
      console.error("Erro ao buscar total de tickets:", error);
      // Retornar 0 em caso de erro (pode melhorar depois)
      return 0;
    }
  }

  /**
   * Busca um ticket específico do GLPI pelo glpiId
   */
  async getTicketByGlpiId(glpiId: number): Promise<Ticket | undefined> {
    if (!glpiClient.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    try {
      // Buscar ticket do GLPI
      const glpiTicket = await glpiClient.getTicket(glpiId);
      
      // Buscar mapeamento local
      const [mapping] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.glpiId, glpiId));

      // Decodificar HTML entities
      const description = glpiTicket.content 
        ? decodeHtmlEntities(glpiTicket.content)
        : null;

      // Mapear para formato local
      const createdAt = glpiTicket.date_creation 
        ? new Date(glpiTicket.date_creation)
        : glpiTicket.date 
        ? new Date(glpiTicket.date)
        : new Date();

      return {
        id: mapping?.id || 0,
        glpiId: glpiTicket.id,
        title: glpiTicket.name || "Sem título",
        description: description || undefined,
        status: glpiClient.mapStatusFromGLPI(glpiTicket.status),
        priority: glpiClient.mapPriorityFromGLPI(glpiTicket.priority),
        sentiment: "neutral" as const,
        customerName: null,
        userId: mapping?.userId || null,
        conversationId: mapping?.conversationId || null,
        assignedTo: null,
        transferRequestTo: null,
        createdAt,
      } as Ticket;
    } catch (error) {
      console.error(`Erro ao buscar ticket GLPI ${glpiId}:`, error);
      return undefined;
    }
  }

  /**
   * Busca ticket por conversationId (para chat)
   */
  async getTicketByConversationId(conversationId: number): Promise<Ticket | undefined> {
    // Buscar mapeamento local primeiro
    const [mapping] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.conversationId, conversationId));

    if (!mapping || !mapping.glpiId) {
      return undefined;
    }

    // Buscar ticket do GLPI usando o glpiId
    return this.getTicketByGlpiId(mapping.glpiId);
  }

  /**
   * Busca tickets do GLPI filtrados por userId (usando mapeamento local)
   * Nota: Paginação não suportada para filtro por usuário ainda
   */
  async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    if (!glpiClient.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    try {
      // Buscar todos os tickets do GLPI (sem paginação para filtro por usuário)
      const result = await this.getTickets(1, 1000); // Buscar muitos tickets
      
      // Filtrar pelos que têm mapeamento com este userId
      return result.tickets.filter(ticket => ticket.userId === userId);
    } catch (error) {
      console.error("Erro ao buscar tickets do usuário:", error);
      throw error;
    }
  }

  /**
   * Cria um ticket no GLPI e mapeamento local (para conversas/userId)
   */
  async createTicket(
    ticket: InsertTicket,
    conversationId: number | null,
    userId: string | null
  ): Promise<Ticket> {
    if (!glpiClient.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    // Criar ticket no GLPI
    const glpiTicket = await glpiClient.createTicket({
      name: ticket.title ?? "Sem título",
      content: ticket.description ?? undefined,
      priority: glpiClient.mapPriorityToGLPI(ticket.priority ?? "medium"),
      status: glpiClient.mapStatusToGLPI(ticket.status ?? "open"),
    });

    if (!glpiTicket.id) {
      throw new Error("GLPI não retornou ID do ticket criado");
    }

    const glpiId = glpiTicket.id;

    // Criar/atualizar mapeamento local
    await this.upsertTicketMapping(glpiId, conversationId, userId);

    // Buscar ticket criado do GLPI para retornar
    const createdTicket = await this.getTicketByGlpiId(glpiId);
    if (!createdTicket) {
      throw new Error("Erro ao buscar ticket criado");
    }

    return createdTicket;
  }

  /**
   * Atualiza um ticket no GLPI (por glpiId)
   */
  async updateTicket(
    glpiId: number,
    updates: Partial<InsertTicket>
  ): Promise<Ticket> {
    if (!glpiClient.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    // Preparar atualizações para o GLPI
    const glpiUpdates: any = {};

    if (updates.title) {
      glpiUpdates.name = updates.title;
    }
    if (updates.description !== undefined) {
      glpiUpdates.content = updates.description;
    }
    if (updates.priority) {
      glpiUpdates.priority = glpiClient.mapPriorityToGLPI(updates.priority);
    }
    if (updates.status) {
      glpiUpdates.status = glpiClient.mapStatusToGLPI(updates.status);
    }

    // Atualizar no GLPI
    await glpiClient.updateTicket(glpiId, glpiUpdates);

    // Buscar ticket atualizado
    const updatedTicket = await this.getTicketByGlpiId(glpiId);
    if (!updatedTicket) {
      throw new Error("Erro ao buscar ticket atualizado");
    }

    return updatedTicket;
  }

  /**
   * Cria ou atualiza mapeamento local (glpiId -> conversationId/userId)
   */
  async upsertTicketMapping(
    glpiId: number,
    conversationId?: number | null,
    userId?: string | null
  ): Promise<void> {
    // Verificar se já existe mapeamento
    const [existing] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.glpiId, glpiId));

    const mappingData: {
      glpiId: number;
      conversationId?: number | null;
      userId?: string | null;
    } = { glpiId };
    
    if (conversationId !== undefined) {
      mappingData.conversationId = conversationId;
    }
    if (userId !== undefined) {
      mappingData.userId = userId;
    }

    if (existing) {
      // Atualizar mapeamento existente
      await db
        .update(tickets)
        .set(mappingData)
        .where(eq(tickets.glpiId, glpiId));
    } else {
      // Criar novo mapeamento
      await db.insert(tickets).values(mappingData);
    }
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
