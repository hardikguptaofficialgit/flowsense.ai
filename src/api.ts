import type { AnalyzeResponse, CompareResponse } from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload as T;
}

export async function requestAnalysis(url: string): Promise<AnalyzeResponse> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return parseResponse<AnalyzeResponse>(response);
}

export async function requestComparison(leftUrl: string, rightUrl: string): Promise<CompareResponse> {
  const response = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leftUrl, rightUrl }),
  });

  return parseResponse<CompareResponse>(response);
}

export async function requestConfig(): Promise<{
  providers: { openai: boolean; nvidia: boolean; perplexity: boolean };
  continuousHooks: { deployment: string; pullRequest: string };
}> {
  const response = await fetch("/api/config");
  return parseResponse(response);
}
