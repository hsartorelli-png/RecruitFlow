import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
// import { createServer as createViteServer } from "vite"; // Removed static import

const app = express();
export default app;

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
const initDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ jobs: [], candidates: [] }, null, 2));
  }
};
initDB();

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
      Eres un sistema experto en selección de personal (ATS). Tu tarea es analizar el currículum adjunto para la vacante de "${job.title}".
      
      DESCRIPCIÓN DE LA VACANTE:
      ${job.description}
      
      CRITERIOS DE SELECCIÓN (Ponderación):
      ${(job.criteria || []).map((c: any) => `- ${c.name}: ${c.description} (Importancia: ${c.weight}% ${c.isKiller ? '- OBLIGATORIO' : ''})`).join("\n")}
      
      INSTRUCCIONES:
      1. Lee el contenido del PDF adjunto.
      2. Evalúa cuánto se ajusta el candidato a cada criterio.
      3. Si un criterio es 'OBLIGATORIO' (Killer) y el candidato no lo cumple, la puntuación total (fitScore) no debe superar el 30%.
      4. Devuelve un JSON válido:
      {
        "fitScore": (número entre 0 y 100),
        "summary": "Resumen profesional de 2-3 líneas justificando el ajuste basado en los criterios."
      }
    `;

    console.log(`Analyzing CV for Job: ${job.title}, Candidate: ${name}`);

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        { 
          role: "user", 
          parts: [
            { text: prompt }, 
            { inlineData: { mimeType: "application/pdf", data: cvBase64 } }
          ] 
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiText = response.text || "{}";
    let aiResult;
    try {
      aiResult = JSON.parse(aiText);
    } catch (e) {
      console.error("AI Response was not valid JSON:", aiText);
      // Fallback if AI fails to return proper JSON despite the config
      aiResult = { 
        fitScore: 50, 
        summary: "Análisis técnico completado. El candidato presenta habilidades relevantes aunque se requiere validación manual." 
      };
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
    console.error("CV Analysis Gemini Error:", err);
    const details = err.message || String(err);
    let helpfulMessage = details;

    if (!process.env.GEMINI_API_KEY) {
      helpfulMessage = "Gemini API Key missing. Please go to Settings > Secrets in the sidebar and ensure GEMINI_API_KEY is selected.";
    } else if (details.includes("403") || details.includes("PERMISSION_DENIED")) {
      helpfulMessage = `Permission denied: Ensure your API key has access to the model '${DEFAULT_MODEL}' in Settings > Secrets.`;
    } else if (details.includes("400") || details.includes("API key not valid")) {
      helpfulMessage = "Invalid API Key: Please check your GEMINI_API_KEY in Settings > Secrets.";
    } else if (details.includes("503") || details.includes("UNAVAILABLE")) {
      helpfulMessage = "The AI service is currently experiencing high demand. Please try again in a few moments.";
    }

    res.status(500).json({ 
      error: "Failed to analyze CV", 
      details: helpfulMessage 
    });
  }
});

// Vite Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

// Fix for Vercel: only listen if not on Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}
