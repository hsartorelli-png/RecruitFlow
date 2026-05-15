import express from "express";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const apiRouter = express.Router();

let _ai: any = null;
function getAI() {
  if (!_ai) {
    const API_KEY = process.env.GEMINI_API_KEY;
    _ai = new GoogleGenAI({
      apiKey: API_KEY || "NO_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return _ai;
}

const DEFAULT_MODEL = "gemini-3-flash-preview"; 

// Mock DB logic
let memoryDB: any = { jobs: [], candidates: [] };

const getDB = () => {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.log("Using memory DB (Vercel/Production)");
    return memoryDB;
  }
  try {
    const dbPath = path.join(process.cwd(), "db.json");
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("DB Read Error:", e);
  }
  return memoryDB;
};

const saveDB = (data: any) => {
  memoryDB = data;
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    try {
      const dbPath = path.join(process.cwd(), "db.json");
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("DB Save Error:", e);
    }
  }
};

apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// Routes
apiRouter.get("/jobs", (req, res) => {
  try {
    const db = getDB();
    const { status } = req.query;
    let jobs = db.jobs || [];
    if (status) {
      jobs = jobs.filter((j: any) => j.status === status);
    } else {
      jobs = jobs.filter((j: any) => j.status !== "archived");
    }
    res.json(jobs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/metrics", (req, res) => {
  try {
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
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/jobs/:id", (req, res) => {
  try {
    const db = getDB();
    const job = (db.jobs || []).find((j: any) => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/jobs", (req, res) => {
  try {
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
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/jobs/:id", (req, res) => {
  try {
    const db = getDB();
    const index = (db.jobs || []).findIndex((j: any) => j.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Job not found" });
    
    db.jobs[index] = { ...db.jobs[index], ...req.body, updatedAt: new Date().toISOString() };
    saveDB(db);
    res.json(db.jobs[index]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete("/jobs/:id", (req, res) => {
  try {
    const db = getDB();
    const index = (db.jobs || []).findIndex((j: any) => j.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Job not found" });
    
    db.jobs[index].status = "archived";
    db.jobs[index].archivedAt = new Date().toISOString();
    saveDB(db);
    res.json({ message: "Job archived" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/jobs/suggest-criteria", async (req, res) => {
  const { title, description } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "IA no configurada. Por favor, añade GEMINI_API_KEY en Vercel." });
  }

  try {
    const ai = getAI();
    const prompt = `Sugiere 5-8 criterios para el puesto "${title}": ${description}. Devuelve JSON: [{name, description, weight, isKiller}]`;
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    res.status(500).json({ error: "Error de IA", details: error.message });
  }
});

apiRouter.get("/jobs/:id/candidates", (req, res) => {
  try {
    const db = getDB();
    const candidates = (db.candidates || []).filter((c: any) => c.jobId === req.params.id);
    res.json(candidates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/jobs/:id/candidates", async (req, res) => {
  const db = getDB();
  const job = (db.jobs || []).find((j: any) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const { name, email, cvBase64 } = req.body;
  try {
    const ai = getAI();
    const prompt = `Analiza este CV para ${job.title}. Criterios: ${JSON.stringify(job.criteria)}. Devuelve JSON: {fitScore, summary}`;
    
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "application/pdf", data: cvBase64 } }
      ],
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
    res.status(500).json({ error: "Error analizando CV", details: err.message });
  }
});

export default apiRouter;
