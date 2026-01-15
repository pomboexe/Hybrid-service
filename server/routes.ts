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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Ticket Routes
  // List tickets - Admin only
  app.get(api.tickets.list.path, isAdmin, async (req, res) => {
    const tickets = await storage.getTickets();
    res.json(tickets);
  });

  // List my tickets - User only
  app.get("/api/tickets/my-tickets", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const tickets = await storage.getTicketsByUserId(userId);
    res.json(tickets);
  });

  app.get(api.tickets.get.path, isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    const ticket = await storage.getTicket(Number(req.params.id));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Users can only see their own tickets, admins can see all
    const { authStorage } = await import("./auth/storage");
    const user = await authStorage.getUserById(userId);
    if (user?.role !== "admin" && ticket.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only view your own tickets" });
    }

    // Get assigned admin info if assigned
    let assignedToUser = null;
    let transferRequestToUser = null;
    if (ticket.assignedTo) {
      assignedToUser = await authStorage.getUserById(ticket.assignedTo);
      if (assignedToUser) {
        const { password: _, ...userWithoutPassword } = assignedToUser;
        assignedToUser = userWithoutPassword;
      }
    }
    if (ticket.transferRequestTo) {
      transferRequestToUser = await authStorage.getUserById(ticket.transferRequestTo);
      if (transferRequestToUser) {
        const { password: _, ...userWithoutPassword } = transferRequestToUser;
        transferRequestToUser = userWithoutPassword;
      }
    }

    res.json({
      ...ticket,
      assignedToUser,
      transferRequestToUser,
    });
  });

  app.post(api.tickets.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const input = api.tickets.create.input.parse(req.body);

      // 1. Create a conversation for this ticket
      const conversation = await storage.createConversation(input.title);

      // 2. Create the ticket linked to conversation and user
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
      throw err;
    }
  });

  app.patch(api.tickets.update.path, isAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = api.tickets.update.input.parse(req.body);
      const ticket = await storage.updateTicket(id, updates);
      res.json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
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
    
    // Find ticket with this conversationId
    const allTickets = isAdmin 
      ? await storage.getTickets()
      : await storage.getTicketsByUserId(userId);
    
    const ticket = allTickets.find(t => t.conversationId === conversationId);
    
    if (!ticket) {
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
  app.post("/api/tickets/:id/messages", isAuthenticated, async (req, res) => {
    const ticketId = Number(req.params.id);
    const { content, role } = req.body; // role: 'user' (customer) or 'agent'

    const ticket = await storage.getTicket(ticketId);
    if (!ticket || !ticket.conversationId)
      return res.status(404).json({ message: "Ticket/Conversation not found" });

    // Add User/Agent Message
    const message = await storage.addMessage(
      ticket.conversationId,
      role,
      content
    );

    res.json({ message });
  });

  // 6. Assignment Endpoints
  // Assign ticket to current admin
  app.post("/api/tickets/:id/assign", isAdmin, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // If already assigned to someone else, return error
    if (ticket.assignedTo && ticket.assignedTo !== userId) {
      const { authStorage } = await import("./auth/storage");
      const assignedUser = await authStorage.getUserById(ticket.assignedTo);
      return res.status(409).json({ 
        message: "Ticket is already being handled by another admin",
        assignedTo: assignedUser ? {
          id: assignedUser.id,
          firstName: assignedUser.firstName,
          lastName: assignedUser.lastName,
          email: assignedUser.email,
        } : null,
      });
    }

    // Assign to current admin
    const updatedTicket = await storage.updateTicket(ticketId, { assignedTo: userId });
    
    // Get assigned user info
    const { authStorage } = await import("./auth/storage");
    const assignedUser = await authStorage.getUserById(userId);
    const { password: _, ...userWithoutPassword } = assignedUser!;

    res.json({
      ...updatedTicket,
      assignedToUser: userWithoutPassword,
    });
  });

  // Request transfer
  app.post("/api/tickets/:id/request-transfer", isAdmin, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Can only request transfer if ticket is assigned to someone else
    if (!ticket.assignedTo) {
      return res.status(400).json({ message: "Ticket is not assigned. Use assign endpoint instead." });
    }

    if (ticket.assignedTo === userId) {
      return res.status(400).json({ message: "You are already handling this ticket" });
    }

    // Set transfer request
    const updatedTicket = await storage.updateTicket(ticketId, { transferRequestTo: userId });
    
    // Get requesting user info
    const { authStorage } = await import("./auth/storage");
    const requestingUser = await authStorage.getUserById(userId);
    const { password: _, ...userWithoutPassword } = requestingUser!;

    res.json({
      ...updatedTicket,
      transferRequestToUser: userWithoutPassword,
    });
  });

  // Accept transfer
  app.post("/api/tickets/:id/accept-transfer", isAdmin, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Can only accept if currently assigned to this admin
    if (ticket.assignedTo !== userId) {
      return res.status(403).json({ message: "You are not currently assigned to this ticket" });
    }

    // Must have a transfer request
    if (!ticket.transferRequestTo) {
      return res.status(400).json({ message: "No transfer request pending" });
    }

    // Transfer to requesting admin
    const newAssigneeId = ticket.transferRequestTo;
    const updatedTicket = await storage.updateTicket(ticketId, { 
      assignedTo: newAssigneeId,
      transferRequestTo: null,
    });
    
    // Get new assigned user info
    const { authStorage } = await import("./auth/storage");
    const assignedUser = await authStorage.getUserById(newAssigneeId);
    const { password: _, ...userWithoutPassword } = assignedUser!;

    res.json({
      ...updatedTicket,
      assignedToUser: userWithoutPassword,
      transferRequestToUser: null,
    });
  });

  // Unassign ticket
  app.post("/api/tickets/:id/unassign", isAdmin, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Can only unassign if currently assigned to this admin
    if (ticket.assignedTo !== userId) {
      return res.status(403).json({ message: "You are not currently assigned to this ticket" });
    }

    // Unassign
    const updatedTicket = await storage.updateTicket(ticketId, { 
      assignedTo: null,
      transferRequestTo: null, // Also clear any pending transfer requests
    });

    const { authStorage } = await import("./auth/storage");
    res.json({
      ...updatedTicket,
      assignedToUser: null,
      transferRequestToUser: null,
    });
  });

  // Reject/Cancel transfer request
  app.post("/api/tickets/:id/reject-transfer", isAdmin, async (req: any, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Can only reject if currently assigned to this admin
    if (ticket.assignedTo !== userId) {
      return res.status(403).json({ message: "You are not currently assigned to this ticket" });
    }

    // Clear transfer request
    const updatedTicket = await storage.updateTicket(ticketId, { 
      transferRequestTo: null,
    });

    const { authStorage } = await import("./auth/storage");
    res.json({
      ...updatedTicket,
      transferRequestToUser: null,
    });
  });

  return httpServer;
}
