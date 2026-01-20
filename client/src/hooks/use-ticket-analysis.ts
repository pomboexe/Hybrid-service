import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface TicketAnalysis {
  categoria: string;
  causaProvavel: string;
  instrucoes: string[];
}

// Hook para analisar ticket com IA
export function useAnalyzeTicket() {
  const { toast } = useToast();

  return useMutation<TicketAnalysis, Error, number>({
    mutationFn: async (glpiId: number) => {
      const res = await fetch(`/api/tickets/${glpiId}/analyze`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Falha ao analisar ticket" }));
        throw new Error(error.message || "Falha ao analisar ticket com IA");
      }

      return await res.json() as TicketAnalysis;
    },
    onSuccess: () => {
      toast({
        title: "Análise Concluída",
        description: "O ticket foi analisado com sucesso pela IA.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na Análise",
        description: error.message || "Falha ao analisar ticket com IA.",
        variant: "destructive",
      });
    },
  });
}
