import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Types for ticket chat messages
interface Message {
  id: number;
  role: "user" | "agent";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
}

// Fetch conversation history
export function useConversation(conversationId: number | null) {
  return useQuery({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await fetch(`/api/conversations/${conversationId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return await res.json() as Conversation;
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll for updates (simplified real-time)
  });
}

// Send message with streaming support
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      // We'll use a standard fetch first to trigger the SSE endpoint, 
      // but for simplicity in this React hook we might just wait for completion 
      // or handle the stream manually if we want real-time typing.
      
      // NOTE: The backend routes use SSE for POST /messages.
      // This means we need to handle the stream if we want to see it live.
      
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to send message");
      
      // Consuming the stream to completion for basic implementation
      const reader = res.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // In a full implementation, we'd parse these chunks and update local state
      }
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    },
  });
}
