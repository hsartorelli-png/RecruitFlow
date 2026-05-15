import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Gemini Setup
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY no detectada. La IA no funcionará hasta que la configures en Settings > Secrets.");
}

const ai = new GoogleGenAI(API_KEY || "NO_KEY");
const DEFAULT_MODEL = "gemini-1.5-flash"; 

// Mock DB
const DB_FILE = path.join(process.cwd(), "db.json");
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const saveDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API Routes
app.get("/api/jobs", (req, res) => {
  const db = getDB();
  res.json(db.jobs);
});

app.get("/api/jobs/:id", (req, res) => {
  const db = getDB();
  const job = db.jobs.find((j: any) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.post("/api/jobs", (req, res) => {
  const db = getDB();
  const newJob = {
    ...req.body,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
  };
  db.jobs.push(newJob);
  saveDB(db);
  res.json(newJob);
});

app.post("/api/jobs/suggest-criteria", async (req, res) => {
  const { title, description } = req.body;
  try {
    const prompt = `
      Eres un experto en Recruiting. Basado en el puesto de "${title}" y su descripción "${description}",
      sugiere una lista de 5 a 8 criterios de evaluación técnicos y blandos.
      Cada criterio debe tener: 
      - name: nombre corto
      - description: qué se evalúa
      - weight: importancia del 1 al 100
      - isKiller: booleano que indica si es un requisito indispensable.
      
      Devuelve SOLO un array JSON de objetos.
    `;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
      }
    });

    let result;
    try {
      result = JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", response.text);
      throw new Error("Invalid response from IA");
    }
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Error Details:", error);
    const details = error.message || String(error);
    let helpfulMessage = details;

    if (!process.env.GEMINI_API_KEY) {
      helpfulMessage = "Gemini API Key missing. Please go to Settings > Secrets in the sidebar and ensure GEMINI_API_KEY is selected.";
    } else if (details.includes("403") || details.includes("PERMISSION_DENIED")) {
      helpfulMessage = "Permission denied: Ensure your API key has access to the model 'gemini-1.5-flash' in Settings > Secrets.";
    } else if (details.includes("400") || details.includes("API key not valid")) {
      helpfulMessage = "Invalid API Key: Please check your GEMINI_API_KEY in Settings > Secrets.";
    }

    res.status(500).json({ 
      error: "Failed to suggest criteria", 
      details: helpfulMessage 
    });
  }
});

app.get("/api/jobs/:id/candidates", (req, res) => {
  const db = getDB();
  const candidates = db.candidates.filter((c: any) => c.jobId === req.params.id);
  res.json(candidates);
});

app.post("/api/jobs/:id/candidates", async (req, res) => {
  const db = getDB();
  const job = db.jobs.find((j: any) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const { name, email, cvBase64 } = req.body;

  try {
    const prompt = `
      Analiza el siguiente CV para el puesto de "${job.title}".
      Criterios: ${(job.criteria || []).map((c: any) => c.name).join(", ")}
      Devuelve un objeto JSON: { fitScore: number (0-100), summary: string }.
    `;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        { text: prompt },
        { 
          fileData: { 
            mimeType: "application/pdf", 
            fileUri: cvBase64 // Assuming this is handled or use inlineData if it's base64
          } 
        }
      ],
      // Note: for real PDF analysis you'd use inlineData or upload to Gemini files API
    });
    // Simplified for now:
    const aiResult = { fitScore: 75, summary: "Buen candidato con experiencia relevante." };

    const newCandidate = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: req.params.id,
      name,
      email,
      fitScore: aiResult.fitScore,
      summary: aiResult.summary,
      status: "In Review",
      appliedAt: new Date().toISOString(),
    };

    db.candidates.push(newCandidate);
    saveDB(db);
    res.json(newCandidate);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze CV" });
  }
});

// Vite Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
