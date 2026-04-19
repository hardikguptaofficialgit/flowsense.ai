import { Router } from "express";
import {
  analyzeUrl,
  compareUrls,
  configStatus,
  deploymentHook,
  prMergeHook,
} from "../controllers/analyzeController.js";
import { authSession, googleAuth, requireAuth, signIn, signOut, signUp } from "../controllers/authController.js";
import { agentCatalog, chatMessage } from "../controllers/chatController.js";
import { getProfile, listAnalyses, saveAnalysis, upsertProfile } from "../controllers/workspaceController.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "flowsense-agent", timestamp: new Date().toISOString() });
});

router.get("/config", configStatus);
router.post("/analyze", analyzeUrl);
router.post("/compare", compareUrls);
router.post("/hooks/deployment", deploymentHook);
router.post("/hooks/pr-merge", prMergeHook);

router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);
router.post("/auth/google", googleAuth);
router.post("/auth/signout", signOut);
router.get("/auth/session", authSession);

router.get("/workspace/profile", requireAuth, getProfile);
router.put("/workspace/profile", requireAuth, upsertProfile);
router.get("/workspace/analyses", requireAuth, listAnalyses);
router.post("/workspace/analyses", requireAuth, saveAnalysis);

router.get("/chat/agents", requireAuth, agentCatalog);
router.post("/chat/message", requireAuth, chatMessage);

export default router;
