import { GoogleGenerativeAI } from "@google/generative-ai";

// Verifica se o Gemini está configurado
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Obtém o cliente Gemini (retorna null se não estiver configurado)
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!isGeminiConfigured()) {
    return null;
  }

  try {
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  } catch (error) {
    console.warn("Falha ao inicializar cliente Gemini:", error);
    return null;
  }
}

// Interface para a análise do ticket
export interface TicketAnalysis {
  categoria: string;
  causaProvavel: string;
  instrucoes: string[];
}

// Interface para dados do ticket a serem analisados
export interface TicketAnalysisInput {
  title: string;
  description?: string;
  status: string;
  priority: string;
  sentiment?: string;
  customerName?: string;
  messages?: Array<{
    role: "user" | "agent";
    content: string;
    createdAt: string;
  }>;
}

// Analisa um ticket com Gemini e retorna análise estruturada
export async function analyzeTicketWithGemini(
  ticketData: TicketAnalysisInput
): Promise<TicketAnalysis | null> {
  const gemini = getGeminiClient();
  if (!gemini) {
    return null;
  }

  try {
    // Montar prompt estruturado em português
    const messagesText = ticketData.messages
      ?.map((msg) => {
        const roleLabel = msg.role === "user" ? "Cliente" : "Atendente";
        const date = msg.createdAt
          ? new Date(msg.createdAt).toLocaleString("pt-BR")
          : "";
        return `[${roleLabel} - ${date}]: ${msg.content}`;
      })
      .join("\n\n") || "Nenhum acompanhamento disponível.";

    const prompt = `Você é um assistente técnico especializado em análise de chamados de suporte. Você irá receber os detalhes de um chamado e todos os seus acompanhamentos.

Tarefa:
1. Categorizar o chamado (ex: Problema técnico, Solicitação de melhoria, Bug, Suporte geral, Configuração, etc.).
2. Analisar a causa provável do problema.
3. Gerar instruções passo a passo detalhadas para resolver o chamado.

Detalhes do chamado:
- Título: ${ticketData.title}
- Descrição: ${ticketData.description || "Não disponível"}
- Status: ${ticketData.status}
- Prioridade: ${ticketData.priority}
- Sentimento: ${ticketData.sentiment || "Não analisado"}
- Cliente: ${ticketData.customerName || "Não informado"}

Acompanhamentos/Mensagens:
${messagesText}

IMPORTANTE: Responda APENAS em formato JSON válido, sem texto adicional antes ou depois. Use o seguinte formato:

{
  "categoria": "categoria do chamado",
  "causaProvavel": "análise detalhada da causa provável",
  "instrucoes": [
    "Passo 1: descrição detalhada",
    "Passo 2: descrição detalhada",
    "Passo 3: descrição detalhada"
  ]
}`;

    // Usar o modelo gemini-2.0-flash-exp (experimental) ou gemini-1.5-flash (estável)
    // O modelo gemini-2.5-flash ainda não está disponível publicamente
    // Tente "gemini-2.0-flash-exp", "gemini-1.5-flash" ou "gemini-1.5-pro"
    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Tentar parsear JSON da resposta
    try {
      // Remover markdown code blocks se existirem
      const jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const analysis = JSON.parse(jsonText) as TicketAnalysis;

      // Validar estrutura básica
      if (
        typeof analysis.categoria === "string" &&
        typeof analysis.causaProvavel === "string" &&
        Array.isArray(analysis.instrucoes)
      ) {
        return analysis;
      }

      // Se a estrutura não estiver correta, retornar análise parcial
      return {
        categoria: analysis.categoria || "Não categorizado",
        causaProvavel: analysis.causaProvavel || text.substring(0, 200),
        instrucoes: Array.isArray(analysis.instrucoes)
          ? analysis.instrucoes
          : [text],
      };
    } catch (parseError) {
      // Se não conseguir parsear JSON, retornar análise com texto raw
      console.warn("Erro ao parsear JSON da resposta Gemini:", parseError);
      return {
        categoria: "Análise não estruturada",
        causaProvavel: text.substring(0, 300),
        instrucoes: [text],
      };
    }
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    return null;
  }
}
