import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  setupAuth,
  registerAuthRoutes,
  isAuthenticated,
  isAdmin,
} from "./auth";
import { glpiClient } from "./utils/glpi";
import { analyzeTicketWithGemini, isGeminiConfigured } from "./utils/gemini";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Ticket Routes
  // List tickets - Admin only (apenas do GLPI) com paginação
  app.get(api.tickets.list.path, isAdmin, async (req, res) => {
    // Obter parâmetros de paginação da query string (fora do try para estar no escopo do catch)
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = parseInt(req.query.limit as string || "20", 10);

    try {
      if (!glpiClient.isConfigured()) {
        return res.status(503).json({ message: "GLPI não está configurado" });
      }

      // Validar parâmetros
      if (page < 1) {
        return res.status(400).json({ message: "page deve ser >= 1" });
      }
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "limit deve estar entre 1 e 100" });
      }

      const result = await storage.getTickets(page, limit);
      res.json(result);
    } catch (error: any) {
      console.error("Erro ao buscar tickets:", error);
      
      // Capturar erro no Sentry
      const Sentry = await import("@sentry/node");
      Sentry.captureException(error, {
        tags: {
          route: "GET /api/tickets",
          operation: "getTickets",
        },
        extra: {
          page,
          limit,
          glpiConfigured: glpiClient.isConfigured(),
        },
      });
      
      // Mensagem de erro mais específica
      let errorMessage = "Erro ao buscar tickets do GLPI";
      let statusCode = 500;
      
      if (error?.message) {
        errorMessage = error.message;
        // Timeout ou problemas de conexão
        if (errorMessage.includes("Timeout") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
          statusCode = 503;
        }
      }
      
      res.status(statusCode).json({ message: errorMessage });
    }
  });

  // List my tickets - User only
  app.get("/api/tickets/my-tickets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (!glpiClient.isConfigured()) {
        return res.status(503).json({ message: "GLPI não está configurado" });
      }

      const tickets = await storage.getTicketsByUserId(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Erro ao buscar tickets do usuário:", error);
      res.status(500).json({ message: "Erro ao buscar tickets" });
    }
  });

  // GET /api/tickets/:id - id agora é glpiId
  app.get(api.tickets.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (!glpiClient.isConfigured()) {
        return res.status(503).json({ message: "GLPI não está configurado" });
      }

      const glpiId = Number(req.params.id);
      const ticket = await storage.getTicketByGlpiId(glpiId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Users can only see their own tickets, admins can see all
      const { authStorage } = await import("./auth/storage");
      const user = await authStorage.getUserById(userId);
      if (user?.role !== "admin" && ticket.userId !== userId) {
        return res
          .status(403)
          .json({ message: "Forbidden: You can only view your own tickets" });
      }

      // GLPI não retorna assignedTo diretamente, mas podemos mapear users_id_recipient se necessário
      res.json(ticket);
    } catch (error) {
      console.error("Erro ao buscar ticket:", error);
      res.status(500).json({ message: "Erro ao buscar ticket" });
    }
  });

  app.post(api.tickets.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (!glpiClient.isConfigured()) {
        return res.status(503).json({ message: "GLPI não está configurado" });
      }

      const input = api.tickets.create.input.parse(req.body);

      // 1. Create a conversation for this ticket (para chat local)
      const conversation = await storage.createConversation(input.title ?? "Novo Ticket");

      // 2. Create the ticket in GLPI and link conversation/user in local mapping
      const ticket = await storage.createTicket(input, conversation.id, userId);

      // 3. Add initial message if description exists
      if (input.description) {
        await storage.addMessage(conversation.id, "user", input.description);
      }

      res.status(201).json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Erro ao criar ticket:", err);
      res.status(500).json({ message: "Erro ao criar ticket no GLPI" });
    }
  });

  // PATCH /api/tickets/:id - id agora é glpiId
  app.patch(api.tickets.update.path, isAdmin, async (req, res) => {
    try {
      if (!glpiClient.isConfigured()) {
        return res.status(503).json({ message: "GLPI não está configurado" });
      }

      const glpiId = Number(req.params.id);
      const updates = api.tickets.update.input.parse(req.body);
      const ticket = await storage.updateTicket(glpiId, updates);
      res.json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Erro ao atualizar ticket:", err);
      res.status(404).json({ message: "Ticket not found" });
    }
  });

  // 3. Knowledge Base Routes - Admin only
  app.get(api.knowledge.list.path, isAdmin, async (req, res) => {
    const docs = await storage.getKnowledgeDocs();
    res.json(docs);
  });

  app.post(api.knowledge.create.path, isAdmin, async (req, res) => {
    const input = api.knowledge.create.input.parse(req.body);
    const doc = await storage.createKnowledgeDoc(input);
    res.status(201).json(doc);
  });

  app.delete(api.knowledge.delete.path, isAdmin, async (req, res) => {
    await storage.deleteKnowledgeDoc(Number(req.params.id));
    res.status(204).send();
  });

  // 4. Conversation Endpoint (for Ticket Chat)
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const conversationId = Number(req.params.id);
    
    // Get conversation
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify user has access to this conversation (through ticket ownership)
    const { authStorage } = await import("./auth/storage");
    const user = await authStorage.getUserById(userId);
    const isAdmin = user?.role === "admin";
    
    // Find ticket with this conversationId (via mapping)
    const ticket = await storage.getTicketByConversationId(conversationId);
    
    if (!ticket) {
      return res.status(403).json({ message: "Forbidden: You don't have access to this conversation" });
    }

    // Verify user has access
    if (!isAdmin && ticket.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: You don't have access to this conversation" });
    }

    // Get messages
    const messages = await storage.getMessages(conversationId);

    // Return conversation with messages
    res.json({
      id: conversation.id,
      title: conversation.title,
      messages: messages,
    });
  });

  // 5. Custom Message Endpoint (for Ticket Chat)
  // /api/tickets/:id/messages - id agora é glpiId
  app.post("/api/tickets/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const glpiId = Number(req.params.id);
      const { content, role } = req.body; // role: 'user' (customer) or 'agent'

      const ticket = await storage.getTicketByGlpiId(glpiId);
      if (!ticket || !ticket.conversationId) {
        return res.status(404).json({ message: "Ticket/Conversation not found" });
      }

      // Add User/Agent Message
      const message = await storage.addMessage(
        ticket.conversationId,
        role,
        content
      );

      res.json({ message });
    } catch (error) {
      console.error("Erro ao adicionar mensagem:", error);
      res.status(500).json({ message: "Erro ao adicionar mensagem" });
    }
  });

  // 6. Assignment Endpoints
  // Assign ticket to current admin (via GLPI users_id_recipient)
  // Note: Esta funcionalidade requer mapeamento de userId local para users_id do GLPI
  // Por enquanto, vamos apenas atualizar o status ou deixar como está
  // O GLPI gerencia atribuições através de users_id_recipient
  app.post("/api/tickets/:id/assign", isAdmin, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (!glpiClient.isConfigured()) {
        return res.status(503).json({ message: "GLPI não está configurado" });
      }

      const glpiId = Number(req.params.id);
      const ticket = await storage.getTicketByGlpiId(glpiId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Atribuição no GLPI requer users_id_recipient (ID do usuário no GLPI)
      // Como não temos mapeamento de usuários locais -> GLPI users, vamos apenas
      // atualizar o ticket para status "em processamento" se ainda estiver "novo"
      // Em produção, seria necessário mapear userId local para users_id do GLPI
      
      // Por enquanto, apenas retornar o ticket (atribuição deve ser feita direto no GLPI)
      // Ou implementar mapeamento de usuários se necessário
      res.json({
        ...ticket,
        message: "Para atribuir tickets, use o GLPI diretamente ou implemente mapeamento de usuários",
      });
    } catch (error) {
      console.error("Erro ao atribuir ticket:", error);
      res.status(500).json({ message: "Erro ao atribuir ticket" });
    }
  });

  // Request transfer - Desabilitado pois requer mapeamento de usuários GLPI
  // Transferências devem ser feitas diretamente no GLPI
  app.post("/api/tickets/:id/request-transfer", isAdmin, async (req: any, res) => {
    res.status(501).json({ 
      message: "Transfer requests devem ser feitas diretamente no GLPI. Mapeamento de usuários não implementado." 
    });
  });

  // Accept transfer - Desabilitado
  app.post("/api/tickets/:id/accept-transfer", isAdmin, async (req: any, res) => {
    res.status(501).json({ 
      message: "Transfer requests devem ser feitas diretamente no GLPI. Mapeamento de usuários não implementado." 
    });
  });

  // Unassign ticket - Desabilitado (atribuição gerenciada pelo GLPI)
  app.post("/api/tickets/:id/unassign", isAdmin, async (req: any, res) => {
    res.status(501).json({ 
      message: "Desatribuição deve ser feita diretamente no GLPI. Mapeamento de usuários não implementado." 
    });
  });

  // Reject/Cancel transfer request - Desabilitado
  app.post("/api/tickets/:id/reject-transfer", isAdmin, async (req: any, res) => {
    res.status(501).json({ 
      message: "Transfer requests devem ser feitas diretamente no GLPI. Mapeamento de usuários não implementado." 
    });
  });

  // 7. Ticket Analysis with Gemini AI - Admin only
  app.post("/api/tickets/:id/analyze", isAdmin, async (req: any, res) => {
    try {
      if (!isGeminiConfigured()) {
        return res.status(503).json({ message: "Gemini AI não está configurado. Configure GEMINI_API_KEY no arquivo .env" });
      }

      const glpiId = Number(req.params.id);
      
      // Buscar ticket completo
      const ticket = await storage.getTicketByGlpiId(glpiId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Buscar mensagens da conversa se existir
      let messages: Array<{ role: "user" | "agent"; content: string; createdAt: string }> = [];
      if (ticket.conversationId) {
        const conversationMessages = await storage.getMessages(ticket.conversationId);
        messages = conversationMessages.map((msg) => ({
          role: msg.role as "user" | "agent",
          content: msg.content,
          createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
        }));
      }

      // Montar dados para análise
      const ticketData = {
        title: ticket.title || "Sem título",
        description: ticket.description || undefined,
        status: ticket.status || "open",
        priority: ticket.priority || "medium",
        sentiment: ticket.sentiment || undefined,
        customerName: ticket.customerName || undefined,
        messages: messages,
      };

      // Analisar com Gemini
      const analysis = await analyzeTicketWithGemini(ticketData);

      if (!analysis) {
        return res.status(500).json({ message: "Falha ao analisar ticket com IA" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Erro ao analisar ticket:", error);
      res.status(500).json({ message: "Erro ao analisar ticket com IA" });
    }
  });

  return httpServer;
}
