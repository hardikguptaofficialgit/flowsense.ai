import type { AnalyzeResponse, CompareResponse, ConfigResponse } from "./types";

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return parseResponse<AnalyzeResponse>(response);
}

export async function requestComparison(leftUrl: string, rightUrl: string): Promise<CompareResponse> {
  const response = await fetch(`${API_BASE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leftUrl, rightUrl }),
  });

  return parseResponse<CompareResponse>(response);
}

export async function requestConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/config`);
  return parseResponse<ConfigResponse>(response);
}
