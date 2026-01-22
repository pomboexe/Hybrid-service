import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // No Vercel, os arquivos estáticos estão em dist/public
  // Em desenvolvimento local, também está em dist/public
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  // Fallback para caminho relativo ao arquivo (desenvolvimento)
  const altPath = path.resolve(__dirname, "..", "dist", "public");
  
  const staticPath = fs.existsSync(distPath) ? distPath : altPath;
  
  if (!fs.existsSync(staticPath)) {
    console.warn(
      `Could not find the build directory: ${staticPath}, make sure to build the client first`,
    );
    // No Vercel, os arquivos estáticos são servidos automaticamente
    // então apenas configuramos o fallback para index.html
    app.use("*", (_req, res) => {
      res.status(404).json({ message: "Not found" });
    });
    return;
  }

  app.use(express.static(staticPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(staticPath, "index.html"));
  });
}
