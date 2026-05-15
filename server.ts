import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();
export default app;

const PORT = 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Create a router for API
const apiRouter = express.Router();

// Gemini Setup
const API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: API_KEY || "NO_KEY",
});

const DEFAULT_MODEL = "gemini-3-flash-preview"; 

// Mock DB logic
const DB_FILE = path.join(process.cwd(), "db.json");
let memoryDB: any = { jobs: [], candidates: [] };

const initDB = () => {
  if (process.env.VERCEL) {
    try {
      if (fs.existsSync(DB_FILE)) {
        memoryDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      }
    } catch (e) {
      console.warn("Vercel environment: using memory DB.");
    }
  } else {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ jobs: [], candidates: [] }, null, 2));
    }
    try {
      memoryDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      memoryDB = { jobs: [], candidates: [] };
    }
  }
};
initDB();

const getDB = () => {
  if (process.env.VERCEL) return memoryDB;
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    return memoryDB;
  }
};

const saveDB = (data: any) => {
  memoryDB = data;
  if (!process.env.VERCEL) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Failed to save to db.json", e);
    }
  }
};

// API ROUTES
apiRouter.get("/jobs", (req, res) => {
  const db = getDB();
  const { status } = req.query;
  let jobs = db.jobs || [];
  if (status) {
    jobs = jobs.filter((j: any) => j.status === status);
  } else {
    jobs = jobs.filter((j: any) => j.status !== "archived");
  }
  res.json(jobs);
});

apiRouter.get("/metrics", (req, res) => {
  const db = getDB();
  const activeJobs = (db.jobs || []).filter((j: any) => j.status !== "archived");
  const archivedJobs = (db.jobs || []).filter((j: any) => j.status === "archived");
  const totalCandidates = (db.candidates || []).length;
  const avgFit = totalCandidates > 0 
    ? Math.round((db.candidates || []).reduce((acc: number, c: any) => acc + (c.fitScore || 0), 0) / totalCandidates) 
    : 0;

  res.json({
    activeJobsCount: activeJobs.length,
    archivedJobsCount: archivedJobs.length,
    totalCandidates,
    avgFit,
    recentCandidates: (db.candidates || []).slice(-5).reverse()
  });
});

apiRouter.get("/jobs/:id", (req, res) => {
  const db = getDB();
  const job = (db.jobs || []).find((j: any) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

apiRouter.post("/jobs", (req, res) => {
  const db = getDB();
  const newJob = {
    ...req.body,
    id: Math.random().toString(36).substr(2, 9),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  if (!db.jobs) db.jobs = [];
  db.jobs.push(newJob);
  saveDB(db);
  res.json(newJob);
});

apiRouter.put("/jobs/:id", (req, res) => {
  const db = getDB();
  const index = (db.jobs || []).findIndex((j: any) => j.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Job not found" });
  
  db.jobs[index] = { ...db.jobs[index], ...req.body, updatedAt: new Date().toISOString() };
  saveDB(db);
  res.json(db.jobs[index]);
});

apiRouter.delete("/jobs/:id", (req, res) => {
  const db = getDB();
  const index = (db.jobs || []).findIndex((j: any) => j.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Job not found" });
  
  db.jobs[index].status = "archived";
  db.jobs[index].archivedAt = new Date().toISOString();
  saveDB(db);
  res.json({ message: "Job archived" });
});

apiRouter.post("/jobs/suggest-criteria", async (req, res) => {
  const { title, description } = req.body;
  if (!API_KEY || API_KEY === "NO_KEY") {
    return res.status(500).json({ error: "IA no configurada. Por favor, añade GEMINI_API_KEY en Vercel." });
  }

  try {
    const prompt = `Sugiere 5-8 criterios para el puesto "${title}": ${description}. Devuelve JSON: [{name, description, weight, isKiller}]`;
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ text: prompt }],
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    res.status(500).json({ error: "Error de IA", details: error.message });
  }
});

apiRouter.get("/jobs/:id/candidates", (req, res) => {
  const db = getDB();
  const candidates = (db.candidates || []).filter((c: any) => c.jobId === req.params.id);
  res.json(candidates);
});

apiRouter.post("/jobs/:id/candidates", async (req, res) => {
  const db = getDB();
  const job = (db.jobs || []).find((j: any) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const { name, email, cvBase64 } = req.body;
  try {
    const prompt = `Analiza este CV para ${job.title}. Criterios: ${JSON.stringify(job.criteria)}. Devuelve JSON: {fitScore, summary}`;
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: cvBase64 } }] }],
      config: { responseMimeType: "application/json" }
    });
    const aiResult = JSON.parse(response.text || "{}");
    const newCandidate = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: req.params.id,
      name, email,
      fitScore: aiResult.fitScore || 50,
      summary: aiResult.summary || "Analizado.",
      status: "In Review",
      appliedAt: new Date().toISOString(),
    };
    if (!db.candidates) db.candidates = [];
    db.candidates.push(newCandidate);
    saveDB(db);
    res.json(newCandidate);
  } catch (err: any) {
    res.status(500).json({ error: "Error analizando CV" });
  }
});

// Mount API
app.use("/api", apiRouter);

// Serve static files and handle internal Vercel routing
const distPath = path.join(process.cwd(), "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
}

// Fallback for SPA
app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) {
    // If we're here, it means the router didn't catch the /api route
    // On Vercel, paths might be prefix-stripped or preserved. Try fallback matching.
    return res.status(404).json({ error: "API not found" });
  }
  if (fs.existsSync(path.join(distPath, "index.html"))) {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    res.status(404).send("Not found");
  }
});

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
