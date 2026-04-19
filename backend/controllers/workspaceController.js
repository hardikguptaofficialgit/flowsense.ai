import {
  getProfileForUser,
  listAnalysesForUser,
  saveAnalysisForUser,
  saveProfileForUser,
} from "../services/authStore.js";
import { sendJsonError } from "../utils/http.js";

export async function getProfile(req, res) {
  try {
    const profile = await getProfileForUser(req.user.id);
    res.json(profile);
  } catch (error) {
    sendJsonError(res, 500, "Unable to load profile.", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function upsertProfile(req, res) {
  try {
    const profile = await saveProfileForUser(req.user.id, req.body || {});
    res.json(profile);
  } catch (error) {
    sendJsonError(res, 400, "Unable to save profile.", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function listAnalyses(req, res) {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 12, 24));
    const entries = await listAnalysesForUser(req.user.id, limit);
    res.json({ entries });
  } catch (error) {
    sendJsonError(res, 500, "Unable to fetch analysis history.", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function saveAnalysis(req, res) {
  const report = req.body?.report;
  if (!report?.id) {
    sendJsonError(res, 400, "Report payload is required.");
    return;
  }

  try {
    const saved = await saveAnalysisForUser(req.user.id, report, req.body?.execution || null);
    res.status(201).json({ entry: saved });
  } catch (error) {
    sendJsonError(res, 500, "Unable to save analysis.", error instanceof Error ? error.message : "Unknown error");
  }
}
