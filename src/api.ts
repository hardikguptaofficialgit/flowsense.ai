import type {
  AnalyzeResponse,
  AnalysisReport,
  ChatAgent,
  ChatMessageResponse,
  CompareResponse,
  ConfigResponse,
  FrontendUser,
  WorkspaceProfile,
} from "./types";

function normalizeApiBaseUrl(value?: string) {
  if (!value) return "/api";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload as T;
}

export async function requestAnalysis(url: string): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return parseResponse<AnalyzeResponse>(response);
}

export async function requestComparison(leftUrl: string, rightUrl: string): Promise<CompareResponse> {
  const response = await fetch(`${API_BASE_URL}/compare`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leftUrl, rightUrl }),
  });

  return parseResponse<CompareResponse>(response);
}

export async function requestConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/config`, { credentials: "include" });
  return parseResponse<ConfigResponse>(response);
}

export async function requestSession(): Promise<{ authenticated: boolean; user?: FrontendUser }> {
  const response = await fetch(`${API_BASE_URL}/auth/session`, { credentials: "include" });
  if (!response.ok) {
    return { authenticated: false };
  }
  return parseResponse<{ authenticated: boolean; user?: FrontendUser }>(response);
}

export async function requestSignUp(payload: { email: string; password: string; displayName?: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ user: FrontendUser }>(response);
}

export async function requestSignIn(payload: { email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ user: FrontendUser }>(response);
}

export async function requestSignOut() {
  const response = await fetch(`${API_BASE_URL}/auth/signout`, {
    method: "POST",
    credentials: "include",
  });
  return parseResponse<{ ok: boolean }>(response);
}

export async function requestProfile(): Promise<WorkspaceProfile> {
  const response = await fetch(`${API_BASE_URL}/workspace/profile`, { credentials: "include" });
  return parseResponse<WorkspaceProfile>(response);
}

export async function saveProfile(profile: WorkspaceProfile): Promise<WorkspaceProfile> {
  const response = await fetch(`${API_BASE_URL}/workspace/profile`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return parseResponse<WorkspaceProfile>(response);
}

export async function requestHistory(limit = 12): Promise<AnalysisReport[]> {
  const response = await fetch(`${API_BASE_URL}/workspace/analyses?limit=${encodeURIComponent(String(limit))}`, {
    credentials: "include",
  });
  const payload = await parseResponse<{ entries: AnalysisReport[] }>(response);
  return payload.entries || [];
}

export async function saveHistoryEntry(payload: {
  report: AnalysisReport;
  execution?: { stages: AnalyzeResponse["execution"]["stages"]; timeline: AnalysisReport["journey"] };
}) {
  const response = await fetch(`${API_BASE_URL}/workspace/analyses`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ entry: AnalysisReport }>(response);
}

export async function requestChatAgents(): Promise<{ agents: ChatAgent[] }> {
  const response = await fetch(`${API_BASE_URL}/chat/agents`, { credentials: "include" });
  return parseResponse<{ agents: ChatAgent[] }>(response);
}

export async function requestChatMessage(payload: { agentId: string; message: string }): Promise<ChatMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/message`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ChatMessageResponse>(response);
}
