import "dotenv/config";
import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

// Inicializar Sentry ANTES de qualquer outra coisa
Sentry.init({
  dsn: "https://c1cdd197310cfcf4de2c255997b01e2f@o4510739834339328.ingest.us.sentry.io/4510739836436480",
  // Traces para performance monitoring
  tracesSampleRate: 1.0, // Capturar 100% das transações para debug (em produção pode reduzir)
  // Capturar erros não tratados
  captureUnhandledRejections: true,
  // Capturar exceções não tratadas
  captureUncaughtException: true,
  // Enviar dados PII padrão
  sendDefaultPii: true,
  environment: process.env.NODE_ENV || "development",
  // Debug mode desabilitado para não poluir o terminal
  debug: false,
});

const app = express();
const httpServer = createServer(app);

// Na versão 10 do Sentry, a integração Express é automática
// Não precisa de handlers manuais - o Sentry já captura automaticamente

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

(async () => {
  await registerRoutes(httpServer, app);

  // Setup Express error handler do Sentry
  Sentry.setupExpressErrorHandler(app);

  // Handler de erro customizado (depois do Sentry)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Capturar erro no Sentry (backup caso o handler do Sentry não capture)
    Sentry.captureException(err);

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Não relançar o erro após enviar ao Sentry
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const isWindows = process.platform === "win32";
  httpServer.listen(
    {
      port,
      host: isWindows ? "localhost" : "0.0.0.0",
      reusePort: !isWindows,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
