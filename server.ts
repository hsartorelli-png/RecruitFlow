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

// Serve static files and handle internal Vercel routing
const distPath = path.join(process.cwd(), "dist");

async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      app.use(express.static(distPath));
    }
  }

  // Fallback for SPA
  app.get("*", (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: "API not found" });
    }
    const indexHtml = path.join(distPath, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      // In dev mode without build, Vite middleware handles this, but if we fall through:
      res.status(404).send("Not found");
    }
  });

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
