import express from "express";
import cors from "cors";
import { getBackendPort } from "./env.js";
import apiRouter from "./routes/api.js";
import { refreshBrowserDiagnostics } from "./services/browserService.js";
import { configuredProviders } from "./services/aiProviders.js";

const app = express();
const PORT = getBackendPort();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: "Not found.",
    message: "This backend serves API routes only. Use /api/* endpoints.",
  });
});

app.listen(PORT, () => {
  console.log(`FlowSense backend listening on http://localhost:${PORT}`);
  console.log(`Enabled providers: ${JSON.stringify(configuredProviders())}`);
  refreshBrowserDiagnostics()
    .then((diagnostics) => {
      console.log(`Browser automation: ${JSON.stringify(diagnostics)}`);
    })
    .catch((error) => {
      console.error(`Browser diagnostics failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    });
});
