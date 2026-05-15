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

const ai = new GoogleGenAI({
  apiKey: API_KEY || "NO_KEY",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const DEFAULT_MODEL = "gemini-3-flash-preview"; 

// Mock DB
const DB_FILE = path.join(process.cwd(), "db.json");
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const saveDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API Routes
app.get("/api/jobs", (req, res) => {
  const db = getDB();
  // Filter by status if needed, default to active
  const { status } = req.query;
  let jobs = db.jobs;
  if (status) {
    jobs = jobs.filter((j: any) => j.status === status);
  } else {
    // By default return only active or those without status (compatibility)
    jobs = jobs.filter((j: any) => j.status !== "archived");
  }
  res.json(jobs);
});

app.get("/api/metrics", (req, res) => {
  const db = getDB();
  const activeJobs = db.jobs.filter((j: any) => j.status !== "archived");
  const archivedJobs = db.jobs.filter((j: any) => j.status === "archived");
  const totalCandidates = db.candidates.length;
  const avgFit = totalCandidates > 0 
    ? Math.round(db.candidates.reduce((acc: number, c: any) => acc + c.fitScore, 0) / totalCandidates) 
    : 0;

  res.json({
    activeJobsCount: activeJobs.length,
    archivedJobsCount: archivedJobs.length,
    totalCandidates,
    avgFit,
    recentCandidates: db.candidates.slice(-5).reverse()
  });
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
    status: "active",
    createdAt: new Date().toISOString(),
  };
  db.jobs.push(newJob);
  saveDB(db);
  res.json(newJob);
});

app.put("/api/jobs/:id", (req, res) => {
  const db = getDB();
  const index = db.jobs.findIndex((j: any) => j.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Job not found" });
  
  db.jobs[index] = { ...db.jobs[index], ...req.body, updatedAt: new Date().toISOString() };
  saveDB(db);
  res.json(db.jobs[index]);
});

app.delete("/api/jobs/:id", (req, res) => {
  const db = getDB();
  const index = db.jobs.findIndex((j: any) => j.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Job not found" });
  
  // Logical delete (Archive)
  db.jobs[index].status = "archived";
  db.jobs[index].archivedAt = new Date().toISOString();
  saveDB(db);
  res.json({ message: "Job archived" });
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
      helpfulMessage = `Permission denied: Ensure your API key has access to the model '${DEFAULT_MODEL}' in Settings > Secrets.`;
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
      Eres un experto en recruiting. Analiza este CV para el puesto de "${job.title}".
      Descripción del puesto: ${job.description}
      
      Criterios de evaluación (importante):
      ${(job.criteria || []).map((c: any) => `- ${c.name}: ${c.description} (Peso: ${c.weight}%)`).join("\n")}
      
      Por favor, evalúa al candidato basándote estrictamente en estos criterios.
      Devuelve un objeto JSON con:
      - fitScore: un número del 0 al 100 indicando el nivel de ajuste.
      - summary: una justificación de 2 o 3 frases sobre por qué obtuvo esa puntuación.
      
      CV Content: (Analizado desde los datos proporcionados)
    `;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: cvBase64 } }] }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    let aiResult;
    try {
      aiResult = JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("AI Parse error:", response.text);
      aiResult = { fitScore: 50, summary: "Error analizando el CV con IA, puntuación por defecto." };
    }

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
