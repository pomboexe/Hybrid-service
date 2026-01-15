import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Send message in ticket conversation
export function useSendTicketMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      content, 
      role = "user",
      conversationId
    }: { 
      ticketId: number; 
      content: string; 
      role?: "user" | "agent";
      conversationId?: number | null;
    }) => {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, role }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to send message" }));
        throw new Error(error.message || "Failed to send message");
      }

      return res.json();
    },
    onSuccess: (_, { ticketId, conversationId }) => {
      // Invalidate ticket query
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      // Invalidate conversation query to immediately show the new message
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message.",
        variant: "destructive",
      });
    },
  });
}
