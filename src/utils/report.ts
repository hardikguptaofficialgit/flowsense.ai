import { jsPDF } from "jspdf";
import type { AnalysisReport, ExecutionStage } from "../types";

export const DEFAULT_LOGS: ExecutionStage[] = [
  { label: "Workspace ready", detail: "Paste a URL to begin a UX analysis run." },
];

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function summaryText(report: AnalysisReport) {
  return [
    "FlowSense.ai UX Audit",
    `URL: ${report.url}`,
    `Analyzed: ${new Date(report.analyzedAt).toLocaleString()}`,
    `UX Score: ${report.uxScore}`,
    `Screens Explored: ${report.screensVisited}`,
    `Friction Points: ${report.frictionPoints}`,
    `Confidence: ${report.confidenceScore}%`,
    `Model Confidence: ${report.modelConfidence ?? report.confidenceScore}%`,
    `Provider: ${report.providerUsed || "heuristic"}`,
    "",
    "Top Issues:",
    ...report.issues.map((issue) => `- [${issue.severity}] ${issue.title}: ${issue.explanation}`),
    "",
    "Top Suggestions:",
    ...report.suggestions.map((suggestion) => `- P${suggestion.priority}: ${suggestion.action}`),
  ].join("\n");
}

export function exportPdf(report: AnalysisReport) {
  const pdf = new jsPDF();
  const lines = summaryText(report).split("\n");
  let positionY = 14;

  pdf.setFontSize(14);
  pdf.text("FlowSense.ai UX Audit", 14, positionY);
  positionY += 8;
  pdf.setFontSize(10);

  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line || " ", 180);
    for (const fragment of wrapped) {
      if (positionY > 280) {
        pdf.addPage();
        positionY = 14;
      }
      pdf.text(fragment, 14, positionY);
      positionY += 5;
    }
  }

  pdf.save(`flowsense-${Date.now()}.pdf`);
}

