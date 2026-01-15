import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type errorSchemas } from "@shared/routes";
import type { InsertTicket, Ticket } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Fetch all tickets (Admin only)
export function useTickets() {
  return useQuery({
    queryKey: [api.tickets.list.path],
    queryFn: async () => {
      const res = await fetch(api.tickets.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return api.tickets.list.responses[200].parse(await res.json());
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

// Fetch single ticket
export function useTicket(id: number) {
  return useQuery({
    queryKey: [api.tickets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.tickets.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return api.tickets.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 3000, // Poll for updates (transfer requests, assignment changes)
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

// Update ticket (Status, AI Active, etc)
export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertTicket>) => {
      const url = buildUrl(api.tickets.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH", // Using PATCH as defined in routes
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
         throw new Error("Failed to update ticket");
      }
      return api.tickets.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
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

// Assign ticket to current admin
export function useAssignTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
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
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
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

// Request transfer of ticket
export function useRequestTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/request-transfer`, {
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
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
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

// Accept transfer of ticket
export function useAcceptTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/accept-transfer`, {
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
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
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

// Unassign ticket
export function useUnassignTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/unassign`, {
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
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
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

// Reject transfer request
export function useRejectTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/reject-transfer`, {
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
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
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
