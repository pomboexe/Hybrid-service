import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

Sentry.init({
  dsn: "https://c1cdd197310cfcf4de2c255997b01e2f@o4510739834339328.ingest.us.sentry.io/4510739836436480",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Performance monitoring
  tracesSampleRate: 1.0,
});

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found. Make sure there is a <div id='root'></div> in your HTML.");
}

const root = createRoot(container);

root.render(
  <Sentry.ErrorBoundary
    fallback={({ error, resetError }) => (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Algo deu errado</h1>
        <p>Ocorreu um erro inesperado. Por favor, recarregue a página.</p>
        <button onClick={resetError}>Tentar novamente</button>
        <details style={{ marginTop: "1rem", textAlign: "left" }}>
          <summary>Detalhes do erro</summary>
          <pre style={{ marginTop: "0.5rem", padding: "1rem", background: "#f5f5f5", borderRadius: "4px" }}>
            {error.toString()}
          </pre>
        </details>
      </div>
    )}
    showDialog
  >
    <App />
  </Sentry.ErrorBoundary>
);
