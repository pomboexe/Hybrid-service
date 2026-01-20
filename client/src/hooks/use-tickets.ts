import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type errorSchemas } from "@shared/routes";
import type { InsertTicket, Ticket } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Interface para resposta paginada
interface PaginatedTicketsResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper para adicionar timeout ao fetch
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 35000 // 35 segundos (mais que o servidor)
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout ao carregar tickets (${timeout}ms). O servidor pode estar lento ou indisponível.`);
    }
    throw error;
  }
}

// Fetch all tickets (Admin only) com paginação
export function useTickets(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [api.tickets.list.path, page, limit],
    queryFn: async (): Promise<PaginatedTicketsResponse> => {
      const url = `${api.tickets.list.path}?page=${page}&limit=${limit}`;
      const res = await fetchWithTimeout(url, { credentials: "include" });
      
      if (!res.ok) {
        // Tentar obter mensagem de erro da API
        let errorMessage = "Falha ao carregar tickets";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Se não conseguir parsear o erro, usar mensagem padrão baseada no status
          if (res.status === 401) {
            errorMessage = "Não autorizado. Por favor, faça login novamente.";
          } else if (res.status === 503) {
            errorMessage = "Serviço temporariamente indisponível. GLPI não está configurado.";
          } else if (res.status >= 500) {
            errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      
      // Validar estrutura da resposta com fallback
      if (!data) {
        throw new Error("Resposta vazia do servidor");
      }
      
      // Se não tiver a estrutura esperada, tentar retornar dados válidos
      const tickets = Array.isArray(data.tickets) ? data.tickets : (Array.isArray(data) ? data : []);
      const pagination = data.pagination || {
        page: page,
        limit: limit,
        total: tickets.length,
        totalPages: Math.ceil(tickets.length / limit),
      };
      
      return {
        tickets,
        pagination,
      };
    },
  });
}

// Fetch user's own tickets
export function useMyTickets() {
  return useQuery({
    queryKey: ["/api/tickets/my-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/tickets/my-tickets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();
      // Use the same schema as tickets list
      return api.tickets.list.responses[200].parse(data);
    },
  });
}

// Fetch single ticket (id agora é glpiId)
export function useTicket(glpiId: number) {
  return useQuery({
    queryKey: [api.tickets.get.path, glpiId],
    queryFn: async () => {
      const url = buildUrl(api.tickets.get.path, { id: glpiId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return api.tickets.get.responses[200].parse(await res.json());
    },
    enabled: !!glpiId,
    refetchInterval: 3000, // Poll for updates
  });
}

// Create ticket (Customer Simulation)
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertTicket) => {
      const res = await fetch(api.tickets.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to create ticket");
      }
      return api.tickets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my-tickets"] });
      toast({
        title: "Ticket Created",
        description: "Support request has been submitted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Update ticket (Status, AI Active, etc) - id agora é glpiId
export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertTicket>) => {
      const url = buildUrl(api.tickets.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
         throw new Error("Failed to update ticket");
      }
      const updatedTicket = api.tickets.update.responses[200].parse(await res.json());
      return updatedTicket;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      // Invalidate usando glpiId
      if (data.glpiId) {
        queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.glpiId] });
      }
      toast({
        title: "Ticket Updated",
        description: "Changes saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update the ticket.",
        variant: "destructive",
      });
    },
  });
}

// Assign ticket to current admin (glpiId)
export function useAssignTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (glpiId: number) => {
      const res = await fetch(`/api/tickets/${glpiId}/assign`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to assign ticket" }));
        throw new Error(error.message || "Failed to assign ticket");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      if (data.glpiId) {
        queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.glpiId] });
      }
      toast({
        title: "Ticket Assigned",
        description: "You are now handling this ticket.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Could not assign the ticket.",
        variant: "destructive",
      });
    },
  });
}

// Request transfer of ticket (glpiId) - Desabilitado, usar GLPI diretamente
export function useRequestTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (glpiId: number) => {
      const res = await fetch(`/api/tickets/${glpiId}/request-transfer`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to request transfer" }));
        throw new Error(error.message || "Failed to request transfer");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      if (data.glpiId) {
        queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.glpiId] });
      }
      toast({
        title: "Transfer Requested",
        description: "Transfer request has been sent to the current admin.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message || "Could not request transfer.",
        variant: "destructive",
      });
    },
  });
}

// Accept transfer of ticket (glpiId) - Desabilitado, usar GLPI diretamente
export function useAcceptTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (glpiId: number) => {
      const res = await fetch(`/api/tickets/${glpiId}/accept-transfer`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to accept transfer" }));
        throw new Error(error.message || "Failed to accept transfer");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      if (data.glpiId) {
        queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.glpiId] });
      }
      toast({
        title: "Transfer Accepted",
        description: "Ticket has been transferred successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Accept Failed",
        description: error.message || "Could not accept transfer.",
        variant: "destructive",
      });
    },
  });
}

// Unassign ticket (glpiId) - Desabilitado, usar GLPI diretamente
export function useUnassignTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (glpiId: number) => {
      const res = await fetch(`/api/tickets/${glpiId}/unassign`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to unassign ticket" }));
        throw new Error(error.message || "Failed to unassign ticket");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      if (data.glpiId) {
        queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.glpiId] });
      }
      toast({
        title: "Ticket Unassigned",
        description: "You are no longer handling this ticket.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unassign Failed",
        description: error.message || "Could not unassign the ticket.",
        variant: "destructive",
      });
    },
  });
}

// Reject transfer request (glpiId) - Desabilitado, usar GLPI diretamente
export function useRejectTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (glpiId: number) => {
      const res = await fetch(`/api/tickets/${glpiId}/reject-transfer`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to reject transfer" }));
        throw new Error(error.message || "Failed to reject transfer");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      if (data.glpiId) {
        queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.glpiId] });
      }
      toast({
        title: "Transfer Rejected",
        description: "Transfer request has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reject Failed",
        description: error.message || "Could not reject transfer.",
        variant: "destructive",
      });
    },
  });
}
