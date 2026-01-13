import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertKnowledgeDoc, KnowledgeDoc } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeBase() {
  return useQuery({
    queryKey: [api.knowledge.list.path],
    queryFn: async () => {
      const res = await fetch(api.knowledge.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch knowledge base");
      return api.knowledge.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertKnowledgeDoc) => {
      const res = await fetch(api.knowledge.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create article");
      return api.knowledge.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.knowledge.list.path] });
      toast({
        title: "Article Added",
        description: "Knowledge base updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add article.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
        const url = buildUrl(api.knowledge.delete.path, { id });
        const res = await fetch(url, { 
            method: "DELETE",
            credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to delete article");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.knowledge.list.path] });
      toast({
        title: "Article Deleted",
        description: "Removed from knowledge base.",
      });
    },
  });
}
