import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

import apiRouter from "./src/api-router";

const app = express();
export default app;

const PORT = 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Mount API
app.use("/api", apiRouter);

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ 
    error: "Server Error", 
    details: err.message,
    path: req.path
  });
});

// Serve static files and handle routing
const distPath = path.join(process.cwd(), "dist");

async function startServer() {
  // Static files FIRST (but after API)
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Fallback for SPA (MUST be last)
  app.get("*", (req, res) => {
    // Prevent catching API routes that don't exist
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: "API route not found" });
    }
    
    // Serve index.html for all other routes (SPA)
    const indexHtml = path.join(distPath, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else if (process.env.NODE_ENV === "production") {
      res.status(404).send("Frontend build not found");
    } else {
      // In dev mode, Vite middleware should have caught this.
      // If we are here, something is wrong.
      res.status(404).send("Resource not found");
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
