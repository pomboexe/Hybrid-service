import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/static";

// Validar variáveis de ambiente obrigatórias
function validateEnvironment() {
  const missing: string[] = [];
  
  if (!process.env.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  
  if (!process.env.SESSION_SECRET) {
    missing.push("SESSION_SECRET");
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      `Please configure them in Vercel project settings.`
    );
  }
}

// Inicializar Sentry ANTES de qualquer outra coisa
try {
  Sentry.init({
    dsn: "https://c1cdd197310cfcf4de2c255997b01e2f@o4510739834339328.ingest.us.sentry.io/4510739836436480",
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
    environment: process.env.NODE_ENV || "production",
    debug: false,
  });
} catch (error) {
  console.error("Failed to initialize Sentry:", error);
}

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Variável para armazenar o app inicializado
let appInitialized = false;
let initPromise: Promise<void> | null = null;
let initError: Error | null = null;

async function initializeApp(): Promise<void> {
  if (appInitialized) return;
  
  if (initError) {
    throw initError;
  }
  
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Validar variáveis de ambiente
      validateEnvironment();
      
      // Criar um servidor HTTP mock para compatibilidade
      const { createServer } = await import("http");
      const httpServer = createServer(app);
      
      await registerRoutes(httpServer, app);

      // Setup Express error handler do Sentry
      Sentry.setupExpressErrorHandler(app);

      // Handler de erro customizado (depois do Sentry)
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        Sentry.captureException(err);

        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(status).json({ message });
      });

      // Em produção no Vercel, servir arquivos estáticos
      if (process.env.NODE_ENV === "production") {
        try {
          serveStatic(app);
        } catch (staticError) {
          console.warn("Failed to serve static files:", staticError);
          // Não falhar se arquivos estáticos não existirem
        }
      }

      appInitialized = true;
    } catch (error) {
      initError = error as Error;
      console.error("Failed to initialize app:", error);
      Sentry.captureException(error);
      throw error;
    }
  })();

  return initPromise;
}

// Variável para armazenar o handler serverless
let serverlessHandler: ReturnType<typeof serverless> | null = null;
let handlerInitError: Error | null = null;

// Função para obter ou criar o handler serverless
async function getServerlessHandler(): Promise<ReturnType<typeof serverless>> {
  // Se já temos um handler válido, retornar
  if (serverlessHandler) {
    return serverlessHandler;
  }

  // Se já tentamos inicializar e falhou, retornar handler de erro
  if (handlerInitError) {
    return createErrorHandler(handlerInitError);
  }

  try {
    // Inicializar o app se ainda não foi inicializado
    await initializeApp();
    
    // Criar handler serverless do app Express inicializado
    serverlessHandler = serverless(app, {
      // Configurações para melhor compatibilidade com Vercel
      binary: true, // Suporta respostas binárias
    });
    
    return serverlessHandler;
  } catch (error) {
    const err = error as Error;
    handlerInitError = err;
    console.error("Initialization error:", err);
    Sentry.captureException(err);
    
    // Criar e retornar handler de erro
    return createErrorHandler(err);
  }
}

// Função auxiliar para criar handler de erro
function createErrorHandler(err: Error): ReturnType<typeof serverless> {
  const errorApp = express();
  
  // Middleware para capturar todos os erros
  errorApp.use((req, res, next) => {
    try {
      next();
    } catch (error) {
      console.error("Error in error handler middleware:", error);
      Sentry.captureException(error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal Server Error",
          message: "An error occurred in error handler"
        });
      }
    }
  });
  
  errorApp.use((req, res) => {
    try {
      // Se for erro de variáveis de ambiente, retornar erro informativo
      if (err.message.includes("Missing required environment variables")) {
        res.status(500).json({
          error: "Configuration Error",
          message: err.message,
          details: "Please configure the required environment variables in Vercel project settings."
        });
      } else {
        // Outros erros de inicialização
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to initialize application",
          details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
      }
    } catch (responseError) {
      // Se não conseguir enviar resposta JSON, tentar texto simples
      console.error("Failed to send JSON error response:", responseError);
      if (!res.headersSent) {
        try {
          res.status(500).send("Internal Server Error: Failed to initialize application");
        } catch (finalError) {
          console.error("Failed to send any response:", finalError);
        }
      }
    }
  });
  
  return serverless(errorApp, {
    binary: true,
  });
}

// Handler para Vercel Serverless Functions
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<any> {
  // Timeout de segurança: garante que a função sempre retorna
  // Vercel tem timeout de 10s para Hobby, 60s para Pro
  // Usamos 8s como segurança para Hobby plan
  const TIMEOUT_MS = 8000;
  let timeoutId: NodeJS.Timeout | null = null;
  
  const timeoutPromise = new Promise<any>((resolve) => {
    timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error("Request timeout - response not sent within timeout period");
        try {
          res.status(504).json({
            error: "Gateway Timeout",
            message: "The request took too long to process"
          });
        } catch (timeoutError) {
          console.error("Failed to send timeout response:", timeoutError);
        }
      }
      resolve(res);
    }, TIMEOUT_MS);
  });

  try {
    const handler = await getServerlessHandler();
    
    // Executar handler com timeout de segurança
    const handlerPromise = handler(req, res).catch((handlerError) => {
      // Capturar erros do handler serverless
      console.error("Serverless handler error:", handlerError);
      Sentry.captureException(handlerError);
      
      if (!res.headersSent) {
        try {
          res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while processing the request"
          });
        } catch (responseError) {
          console.error("Failed to send handler error response:", responseError);
        }
      }
      
      return res;
    });
    
    // Race entre handler e timeout - o que completar primeiro vence
    const result = await Promise.race([handlerPromise, timeoutPromise]);
    
    // Limpar timeout se handler completou primeiro
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return result;
  } catch (error) {
    // Capturar qualquer erro não tratado (erros síncronos)
    console.error("Handler error:", error);
    Sentry.captureException(error);
    
    // Limpar timeout em caso de erro
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Garantir que sempre retornamos uma resposta
    if (!res.headersSent) {
      try {
        res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred while processing the request"
        });
      } catch (responseError) {
        // Se não conseguir enviar resposta JSON, tentar texto simples
        console.error("Failed to send error response:", responseError);
        try {
          if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
          }
        } catch (finalError) {
          console.error("Failed to send any response:", finalError);
        }
      }
    }
    
    // Retornar a resposta mesmo em caso de erro
    return res;
  }
}
