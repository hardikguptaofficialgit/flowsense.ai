import express from "express";
import cors from "cors";
import { getBackendPort } from "./env.js";
import { analyzeUrl, compareUrls, configStatus, deploymentHook, prMergeHook } from "./routes/analyze.js";
import { configuredProviders } from "./services/aiProviders.js";

const app = express();
const PORT = getBackendPort();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "flowsense-agent", timestamp: new Date().toISOString() });
});

app.get("/api/config", configStatus);
app.post("/api/analyze", analyzeUrl);
app.post("/api/compare", compareUrls);
app.post("/api/hooks/deployment", deploymentHook);
app.post("/api/hooks/pr-merge", prMergeHook);

app.use((_req, res) => {
  res.status(404).json({
    error: "Not found.",
    message: "This backend serves API routes only. Use /api/* endpoints.",
  });
});

app.listen(PORT, () => {
  console.log(`FlowSense backend listening on http://localhost:${PORT}`);
  console.log(`Enabled providers: ${JSON.stringify(configuredProviders())}`);
});
