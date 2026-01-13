import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // 2. Ticket Routes
  app.get(api.tickets.list.path, async (req, res) => {
    const tickets = await storage.getTickets();
    res.json(tickets);
  });

  app.get(api.tickets.get.path, async (req, res) => {
    const ticket = await storage.getTicket(Number(req.params.id));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  });

  app.post(api.tickets.create.path, async (req, res) => {
    try {
      const input = api.tickets.create.input.parse(req.body);
      
      // 1. Create a conversation for this ticket
      const conversation = await storage.createConversation(input.title);
      
      // 2. Create the ticket linked to conversation
      const ticket = await storage.createTicket(input, conversation.id);
      
      // 3. Add initial message if description exists
      if (input.description) {
        await storage.addMessage(conversation.id, "user", input.description);
        
        // Trigger initial AI response if active
        if (ticket.isAiActive) {
             // Retrieve knowledge base context (Simple all-docs fetch for now)
             const docs = await storage.getKnowledgeDocs();
             const context = docs.map(d => `${d.title}:\n${d.content}`).join("\n\n");
             
             const systemPrompt = `You are a helpful support assistant. Use the following knowledge base to answer the user:
             
             ${context}
             
             If you don't know, say so and offer to escalate.`;

             const completion = await openai.chat.completions.create({
                 model: "gpt-5.1",
                 messages: [
                     { role: "system", content: systemPrompt },
                     { role: "user", content: input.description }
                 ]
             });
             
             const aiResponse = completion.choices[0]?.message?.content || "I received your request.";
             await storage.addMessage(conversation.id, "assistant", aiResponse);
        }
      }

      res.status(201).json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.tickets.update.path, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const updates = api.tickets.update.input.parse(req.body);
        const ticket = await storage.updateTicket(id, updates);
        res.json(ticket);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
        res.status(404).json({ message: "Ticket not found" });
    }
  });

  // 3. Knowledge Base Routes
  app.get(api.knowledge.list.path, async (req, res) => {
    const docs = await storage.getKnowledgeDocs();
    res.json(docs);
  });

  app.post(api.knowledge.create.path, async (req, res) => {
    const input = api.knowledge.create.input.parse(req.body);
    const doc = await storage.createKnowledgeDoc(input);
    res.status(201).json(doc);
  });
  
  app.delete(api.knowledge.delete.path, async (req, res) => {
      await storage.deleteKnowledgeDoc(Number(req.params.id));
      res.status(204).send();
  });

  // 4. Custom Message Endpoint (for Ticket Chat)
  // We reuse the chat integration for storage, but wrap it here to add AI logic
  app.post("/api/tickets/:id/messages", async (req, res) => {
      const ticketId = Number(req.params.id);
      const { content, role } = req.body; // role: 'user' (customer) or 'agent'
      
      const ticket = await storage.getTicket(ticketId);
      if (!ticket || !ticket.conversationId) return res.status(404).json({ message: "Ticket/Conversation not found" });

      // Add User/Agent Message
      const message = await storage.addMessage(ticket.conversationId, role, content);
      
      // If AI is active and message is from user, trigger AI response
      if (ticket.isAiActive && role === 'user') {
           // Retrieve KB context
           const docs = await storage.getKnowledgeDocs();
           const context = docs.map(d => `${d.title}:\n${d.content}`).join("\n\n");
           
           const systemPrompt = `You are a helpful support assistant. Use the following knowledge base to answer.
           KB: ${context}`;

           // Get history (simplified - just last few messages)
           const history = await storage.getMessages(ticket.conversationId);
           const chatMessages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

           const completion = await openai.chat.completions.create({
               model: "gpt-5.1",
               messages: [
                   { role: "system", content: systemPrompt },
                   ...chatMessages
               ]
           });
           
           const aiResponse = completion.choices[0]?.message?.content || "Processing...";
           const aiMsg = await storage.addMessage(ticket.conversationId, "assistant", aiResponse);
           
           // Return both messages
           res.json({ userMessage: message, aiMessage: aiMsg });
      } else {
          res.json({ message });
      }
  });

  return httpServer;
}
