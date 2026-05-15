import express from "express";
import apiRouter from "../src/api-router";

const app = express();
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use("/api", apiRouter);

// Fallback for API routes if /api prefix is stripped or something
app.use("/", apiRouter);

export default app;
