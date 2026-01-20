/**
 * GLPI API Client
 * 
 * Integração com a API REST do GLPI para gerenciamento de tickets.
 * Requer as seguintes variáveis de ambiente:
 * - GLPI_API_URL: URL base da API do GLPI (ex: https://glpi.example.com/apirest.php)
 * - GLPI_APP_TOKEN: Token da aplicação
 * - GLPI_AUTH_TOKEN: Token de autenticação do usuário
 */

interface GLPISession {
  session_token: string;
}

export interface GLPITicket {
  id: number;
  entities_id?: number;
  name: string;
  date?: string;
  closedate?: string | null;
  solvedate?: string | null;
  takeintoaccountdate?: string | null;
  date_mod?: string;
  users_id_lastupdater?: number;
  status: number;
  users_id_recipient?: number;
  requesttypes_id?: number;
  content?: string;
  urgency?: number;
  impact?: number;
  priority: number;
  itilcategories_id?: number;
  type?: number;
  global_validation?: number;
  slas_id_ttr?: number;
  slas_id_tto?: number;
  slalevels_id_ttr?: number;
  time_to_resolve?: string | null;
  time_to_own?: string | null;
  begin_waiting_date?: string | null;
  sla_waiting_duration?: number;
  ola_waiting_duration?: number;
  olas_id_tto?: number;
  olas_id_ttr?: number;
  olalevels_id_ttr?: number;
  ola_ttr_begin_date?: string | null;
  internal_time_to_resolve?: string | null;
  internal_time_to_own?: string | null;
  waiting_duration?: number;
  close_delay_stat?: number;
  solve_delay_stat?: number;
  takeintoaccount_delay_stat?: number;
  actiontime?: number;
  is_deleted?: number;
  locations_id?: number;
  validation_percent?: number;
  date_creation?: string;
  ola_tto_begin_date?: string | null;
  links?: Array<{
    rel: string;
    href: string;
  }>;
}

interface GLPICreateTicketInput {
  name: string;
  content?: string;
  status?: number; // 1 = Novo
  priority?: number; // 1 = Muito baixa, 2 = Baixa, 3 = Média, 4 = Alta, 5 = Muito alta
  impact?: number;
  urgency?: number;
  type?: number; // 1 = Incidente, 2 = Requisição
  itilcategories_id?: number;
  entities_id?: number;
}

interface GLPIResponse<T> {
  id?: number;
  message?: string;
  [key: string]: any;
}

export class GLPIClient {
  private apiUrl: string;
  private appToken: string;
  private authToken: string;
  private sessionToken: string | null = null;
  private readonly REQUEST_TIMEOUT = 30000; // 30 segundos

  /**
   * Helper para adicionar timeout a requisições fetch
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = this.REQUEST_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
        throw new Error(`Timeout ao conectar com GLPI (${timeoutMs}ms). O servidor pode estar lento ou indisponível.`);
      }
      throw error;
    }
  }

  constructor() {
    const rawUrl = process.env.GLPI_API_URL || "";
    // Normalizar URL: remover barra final e espaços
    this.apiUrl = rawUrl.trim().replace(/\/+$/, "");
    
    // Normalizar App Token
    this.appToken = (process.env.GLPI_APP_TOKEN || "").trim();
    
    // Normalizar Auth Token - remover prefixo "user_token " se presente
    let rawAuthToken = (process.env.GLPI_AUTH_TOKEN || "").trim();
    
    // Se começar com "user_token ", remover o prefixo
    if (rawAuthToken.toLowerCase().startsWith("user_token ")) {
      this.authToken = rawAuthToken.substring("user_token ".length).trim();
    } else if (rawAuthToken.toLowerCase().startsWith("user_token")) {
      // Caso não tenha espaço (improvável mas possível)
      this.authToken = rawAuthToken.substring("user_token".length).trim();
    } else {
      this.authToken = rawAuthToken;
    }

    // Validações e warnings
    if (!this.apiUrl) {
      console.warn("GLPI_API_URL não configurado");
    }
    if (!this.appToken) {
      console.warn("GLPI_APP_TOKEN não configurado");
    }
    if (!this.authToken) {
      console.warn("GLPI_AUTH_TOKEN não configurado ou vazio após normalização");
    }
  }

  /**
   * Normaliza uma URL de endpoint, evitando barras duplicadas
   */
  private normalizeEndpoint(endpoint: string): string {
    if (endpoint.startsWith("http")) {
      return endpoint;
    }
    
    // Remover barra inicial do endpoint se a API URL já termina com barra
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    return `${this.apiUrl}/${cleanEndpoint}`;
  }

  /**
   * Verifica se o GLPI está configurado
   */
  isConfigured(): boolean {
    return !!this.apiUrl && !!this.appToken && !!this.authToken;
  }

  /**
   * Inicializa a sessão com o GLPI
   */
  async initSession(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado. Verifique as variáveis de ambiente: GLPI_API_URL, GLPI_APP_TOKEN, GLPI_AUTH_TOKEN");
    }

    // Validar que authToken não está vazio
    if (!this.authToken || this.authToken.trim().length === 0) {
      throw new Error("GLPI_AUTH_TOKEN está vazio. Verifique se o token foi configurado corretamente no .env (apenas o valor do token, sem o prefixo 'user_token')");
    }

    try {
      const url = this.normalizeEndpoint("initSession/");
      
      const headers = {
        "App-Token": this.appToken,
        "Authorization": `user_token ${this.authToken}`,
        "Content-Type": "application/json",
      };

      const response = await this.fetchWithTimeout(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Tratamento específico para erro 401
        if (response.status === 401) {
          const errorMessage = `Erro ao autenticar no GLPI (401). O token de autenticação pode estar inválido ou expirado.\n` +
            `Verifique:\n` +
            `1. Se GLPI_AUTH_TOKEN está correto no arquivo .env\n` +
            `2. Se o token não está expirado no GLPI\n` +
            `3. Se o usuário tem permissões para usar a API\n` +
            `Resposta do GLPI: ${errorText}`;
          throw new Error(errorMessage);
        }
        
        throw new Error(`Erro ao inicializar sessão GLPI: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as GLPISession;
      
      if (!data.session_token) {
        throw new Error("GLPI não retornou session_token na resposta");
      }
      
      this.sessionToken = data.session_token;
      return this.sessionToken;
    } catch (error) {
      console.error("Erro ao inicializar sessão GLPI:", error);
      throw error;
    }
  }

  /**
   * Garante que temos uma sessão ativa
   */
  async ensureSession(): Promise<void> {
    if (!this.sessionToken) {
      await this.initSession();
    }
  }

  /**
   * Encerra a sessão com o GLPI
   */
  async killSession(): Promise<void> {
    if (!this.sessionToken || !this.isConfigured()) {
      return;
    }

    try {
      await this.fetchWithTimeout(`${this.apiUrl}/killSession`, {
        method: "GET",
        headers: {
          "App-Token": this.appToken,
          "Session-Token": this.sessionToken,
          "Content-Type": "application/json",
        },
      }, 5000); // Timeout menor para killSession
      this.sessionToken = null;
    } catch (error) {
      console.error("Erro ao encerrar sessão GLPI:", error);
      // Não relançar erro, apenas limpar token
      this.sessionToken = null;
    }
  }

  /**
   * Faz uma requisição autenticada para a API do GLPI
   */
  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureSession();

    if (!this.sessionToken) {
      throw new Error("Sessão GLPI não disponível");
    }

    const url = this.normalizeEndpoint(endpoint);

    const response = await this.fetchWithTimeout(url, {
      ...options,
      headers: {
        "App-Token": this.appToken,
        "Session-Token": this.sessionToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Se for 401, pode ser que a sessão expirou, tentar renovar
      if (response.status === 401) {
        this.sessionToken = null;
        await this.ensureSession();
        // Tentar novamente uma vez
        const retryResponse = await this.fetchWithTimeout(url, {
          ...options,
          headers: {
            "App-Token": this.appToken,
            "Session-Token": this.sessionToken!,
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          throw new Error(`Erro na API GLPI: ${retryResponse.status} - ${retryErrorText}`);
        }

        return retryResponse.json() as T;
      }

      throw new Error(`Erro na API GLPI: ${response.status} - ${errorText}`);
    }

    return response.json() as T;
  }

  /**
   * Cria um ticket no GLPI
   */
  async createTicket(input: GLPICreateTicketInput): Promise<GLPIResponse<GLPITicket>> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    const ticketData: GLPICreateTicketInput = {
      status: 1, // Novo
      priority: this.mapPriorityToGLPI(input.priority || 3), // Mapear prioridade
      type: 1, // Incidente por padrão
      ...input,
    };

    const response = await this.authenticatedRequest<GLPIResponse<GLPITicket>>(
      "/Ticket",
      {
        method: "POST",
        body: JSON.stringify({
          input: ticketData,
        }),
      }
    );

    return response;
  }

  /**
   * Busca um ticket específico no GLPI
   */
  async getTicket(id: number): Promise<GLPITicket> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    return this.authenticatedRequest<GLPITicket>(`/Ticket/${id}`);
  }

  /**
   * Atualiza um ticket no GLPI
   */
  async updateTicket(
    id: number,
    updates: Partial<GLPICreateTicketInput>
  ): Promise<GLPIResponse<GLPITicket>> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    // Se houver prioridade, mapear para o formato do GLPI
    const mappedUpdates = { ...updates };
    if (updates.priority !== undefined) {
      mappedUpdates.priority = this.mapPriorityToGLPI(updates.priority);
    }

    return this.authenticatedRequest<GLPIResponse<GLPITicket>>(
      `/Ticket/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          input: mappedUpdates,
        }),
      }
    );
  }

  /**
   * Busca múltiplos tickets do GLPI
   */
  async searchTickets(filters?: Record<string, any>): Promise<GLPITicket[]> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    const queryParams = filters
      ? `?${new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)])).toString()}`
      : "";

    const response = await this.authenticatedRequest<GLPITicket[]>(
      `/Ticket/${queryParams}`
    );

    return Array.isArray(response) ? response : [];
  }

  /**
   * Busca tickets do GLPI com paginação
   * @param range - Range de tickets a buscar (ex: { start: 1, end: 20 })
   * @param order - Ordem de ordenação ('ASC' ou 'DESC', padrão: 'DESC')
   */
  async getTicketsFromGLPI(
    range?: { start: number; end: number },
    order: 'ASC' | 'DESC' = 'DESC'
  ): Promise<GLPITicket[]> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    try {
      let endpoint = "Ticket/";
      
      // Construir query string com range e order
      const params: string[] = [];
      if (range) {
        params.push(`range=${range.start}-${range.end}`);
      }
      params.push(`order=${order}`);
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const response = await this.authenticatedRequest<GLPITicket[]>(endpoint);

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("Erro ao buscar tickets do GLPI:", error);
      throw error;
    }
  }

  /**
   * Busca o ID do último ticket (maior ID) para calcular total de tickets
   * Usa range=0-0&order=DESC que retorna apenas o último ticket
   */
  async getLastTicketId(): Promise<number> {
    if (!this.isConfigured()) {
      throw new Error("GLPI não está configurado");
    }

    try {
      const tickets = await this.authenticatedRequest<GLPITicket[]>(
        "Ticket/?range=0-0&order=DESC"
      );

      if (!Array.isArray(tickets) || tickets.length === 0) {
        return 0;
      }

      // Retornar o ID do primeiro ticket (que é o último/maior ID devido ao order=DESC)
      return tickets[0].id;
    } catch (error) {
      console.error("Erro ao buscar último ticket ID do GLPI:", error);
      throw error;
    }
  }

  /**
   * Mapeia prioridade do sistema local para formato GLPI
   * Sistema local: "low" = 1, "medium" = 3, "high" = 5
   * GLPI: 1 = Muito baixa, 2 = Baixa, 3 = Média, 4 = Alta, 5 = Muito alta
   */
  mapPriorityToGLPI(priority: string | number): number {
    if (typeof priority === "number") {
      return priority;
    }

    const priorityMap: Record<string, number> = {
      low: 2,      // Baixa
      medium: 3,   // Média
      high: 4,     // Alta
      "very-low": 1, // Muito baixa
      "very-high": 5, // Muito alta
    };

    return priorityMap[priority.toLowerCase()] || 3; // Padrão: Média
  }

  /**
   * Mapeia status do sistema local para formato GLPI
   * Sistema local: "open", "resolved", "escalated"
   * GLPI: 1 = Novo, 2 = Em processamento, 3 = Aguardando, 4 = Resolvido, 5 = Fechado
   */
  mapStatusToGLPI(status: string): number {
    const statusMap: Record<string, number> = {
      open: 2,        // Em processamento
      resolved: 4,    // Resolvido
      escalated: 2,   // Em processamento (escalado)
      closed: 5,      // Fechado
    };

    return statusMap[status.toLowerCase()] || 1; // Padrão: Novo
  }

  /**
   * Mapeia status do GLPI para formato do sistema local
   */
  mapStatusFromGLPI(status: number): string {
    const statusMap: Record<number, string> = {
      1: "open",      // Novo -> aberto
      2: "open",      // Em processamento -> aberto
      3: "open",      // Aguardando -> aberto
      4: "resolved",  // Resolvido
      5: "resolved",  // Fechado -> resolvido
      6: "resolved",  // Fechado (caso especial) -> resolvido
    };

    return statusMap[status] || "open";
  }

  /**
   * Mapeia prioridade do GLPI (numérico) para formato do sistema local (string)
   * GLPI: 1 = Muito baixa, 2 = Baixa, 3 = Média, 4 = Alta, 5 = Muito alta
   * Local: "low", "medium", "high"
   */
  mapPriorityFromGLPI(priority: number): string {
    const priorityMap: Record<number, string> = {
      1: "low",      // Muito baixa -> low
      2: "low",      // Baixa -> low
      3: "medium",   // Média -> medium
      4: "high",     // Alta -> high
      5: "high",     // Muito alta -> high
    };

    return priorityMap[priority] || "medium";
  }
}

// Instância singleton
export const glpiClient = new GLPIClient();
