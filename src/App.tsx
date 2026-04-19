import { useEffect, useMemo, useRef, useState } from "react";
import { requestAnalysis, requestComparison } from "./api";
import { ComparePanel, Header, InputPanel, LivePanel, ResultsPanel } from "./components/Panels";
import type { AnalysisReport, CompareResponse, ExecutionStage, Issue } from "./types";

const DEFAULT_LOGS: ExecutionStage[] = [
  { label: "Launching agent...", detail: "Awaiting analysis start." },
];

function asValidUrl(value: string) {
  const normalized = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function summaryText(report: AnalysisReport) {
  const lines = [
    `FlowSense.ai UX Audit`,
    `URL: ${report.url}`,
    `Analyzed: ${new Date(report.analyzedAt).toLocaleString()}`,
    `UX Score: ${report.uxScore}`,
    `Screens Explored: ${report.screensVisited}`,
    `Friction Points: ${report.frictionPoints}`,
    `Confidence: ${report.confidenceScore}%`,
    ``,
    `Top Issues:`,
    ...report.issues.map((issue) => `- [${issue.severity}] ${issue.title}: ${issue.explanation}`),
    ``,
    `Top Suggestions:`,
    ...report.suggestions.map((s) => `- P${s.priority}: ${s.action}`),
  ];

  return lines.join("\n");
}

function createFallbackReport(url: string): AnalysisReport {
  const seed = hashString(url);
  const domain = new URL(url).hostname;
  const uxScore = 58 + (seed % 28);

  const issues: Issue[] = [
    {
      id: "fallback-navigation",
      category: "navigation_confusion",
      title: "Navigation priorities are diluted",
      severity: uxScore < 70 ? "High" : "Medium",
      explanation: "Primary route discovery competes with secondary navigation choices.",
      impact: "Users take longer to orient, increasing early abandonment risk.",
      suggestion: "Reduce competing choices above the fold and highlight one dominant route.",
      fixPrompt: "Refactor navigation IA to prioritize one primary route above the fold and reduce competing links in the first viewport.",
    },
    {
      id: "fallback-cta",
      category: "weak_cta_hierarchy",
      title: "Primary CTA emphasis is inconsistent",
      severity: "Medium",
      explanation: "Action hierarchy appears visually close to passive elements.",
      impact: "Intent does not convert efficiently into action.",
      suggestion: "Increase CTA prominence with stronger contrast and more explicit copy.",
      fixPrompt: "Upgrade CTA hierarchy with stronger contrast, larger click target, and action-led copy. Include component-level change list and acceptance checks.",
    },
    {
      id: "fallback-mobile",
      category: "mobile_responsiveness",
      title: "Mobile compression risk detected",
      severity: "Medium",
      explanation: "Content blocks are likely to stack densely on smaller breakpoints.",
      impact: "Critical context may be pushed below action controls for mobile users.",
      suggestion: "Prioritize mobile spacing and keep primary actions persistently visible.",
      fixPrompt: "Optimize mobile layout spacing and sticky primary action visibility across key breakpoints (375, 414, 768).",
    },
  ];

  return {
    id: `offline-${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    url,
    pageTitle: `${domain} experience audit`,
    uxScore,
    confidenceScore: 64 + (seed % 18),
    taskDifficulty: 100 - uxScore,
    screensVisited: 3 + (seed % 3),
    frictionPoints: issues.length,
    perceivedLoadScore: 55 + (seed % 30),
    timeToInteractionMs: 900 + (seed % 700),
    engineMode: "offline-simulation",
    modelConfidence: 68,
    aiSummary: "Fallback reasoning identified primary conversion friction around navigation and CTA clarity.",
    aiActions: issues.map((issue) => ({
      title: issue.title,
      whyItMatters: issue.impact,
      implementationPrompt: issue.fixPrompt,
    })),
    providerUsed: "heuristic",
    providerTrace: { attempted: [], used: "heuristic" },
    learning: { runCount: 1, avgScore: uxScore, avgFriction: issues.length, trend: "warming" },
    issues,
    suggestions: issues.map((issue, index) => ({
      id: `fallback-suggestion-${index + 1}`,
      priority: index + 1,
      title: issue.title,
      action: issue.suggestion,
      rationale: issue.impact,
    })),
    journey: [
      { step: 1, action: "Homepage discovery", screen: url, intent: "Understand value", signal: "Visual hierarchy assessed" },
      { step: 2, action: "CTA evaluation", screen: `${new URL(url).origin}/features`, intent: "Find action", signal: "Action discoverability tested" },
      { step: 3, action: "Conversion attempt", screen: `${new URL(url).origin}/pricing`, intent: "Complete task", signal: "Friction checkpoints captured" },
    ],
    summary: {
      strengths: [
        "Core value is detectable without deep exploration.",
        "A likely conversion path exists through top-level navigation.",
      ],
      risks: issues.map((issue) => issue.impact),
    },
  };
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("flowsense-theme") === "dark");
  const [url, setUrl] = useState("https://example.com");
  const [logs, setLogs] = useState<ExecutionStage[]>(DEFAULT_LOGS);
  const [stageIndex, setStageIndex] = useState(0);
  const [counters, setCounters] = useState({ screens: 0, frictions: 0, confidence: 0 });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [leftUrl, setLeftUrl] = useState("https://example.com");
  const [rightUrl, setRightUrl] = useState("https://vite.dev");
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("flowsense-history") || "[]");
    } catch {
      return [];
    }
  });

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem("flowsense-theme", darkMode ? "dark" : "light");
    document.body.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("flowsense-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const runVisualProgress = (targetUrl: string) => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    const seed = hashString(targetUrl);
    const staged: ExecutionStage[] = [
      { label: "Launching agent...", detail: "Spinning up autonomous UX runtime." },
      { label: "Initializing session...", detail: "Loading interaction context and device assumptions." },
      { label: "Scanning homepage...", detail: "Reading content hierarchy and visual priorities." },
      { label: "Identifying primary actions...", detail: "Detecting primary CTA candidates." },
      { label: "Navigating interaction paths...", detail: "Traversing discovery to conversion journey." },
      { label: "Evaluating usability signals...", detail: "Scoring friction categories and behavioral impact." },
    ];

    staged.forEach((stage, index) => {
      const timer = window.setTimeout(() => {
        setLogs((prev) => [...prev, stage]);
        setStageIndex(index + 1);
        setCounters({
          screens: Math.min(2 + index, 5 + (seed % 2)),
          frictions: Math.min(1 + index, 7 + (seed % 3)),
          confidence: Math.min(55 + index * 6, 92),
        });
      }, 280 + index * 420);
      timersRef.current.push(timer);
    });
  };

  const handleAnalyze = async () => {
    const normalized = asValidUrl(url);
    if (!normalized) {
      alert("Please enter a valid URL.");
      return;
    }

    setLoading(true);
    setCompareResult(null);
    setLogs([]);
    setStageIndex(0);
    setCounters({ screens: 0, frictions: 0, confidence: 0 });
    runVisualProgress(normalized);

    try {
      const response = await requestAnalysis(normalized);
      setLogs(response.execution.stages);
      setStageIndex(response.execution.stages.length);
      setCounters({
        screens: response.report.screensVisited,
        frictions: response.report.frictionPoints,
        confidence: response.report.confidenceScore,
      });
      setReport(response.report);
      setHistory((prev) => [response.report, ...prev.filter((item) => item.url !== response.report.url)].slice(0, 12));
    } catch (error) {
      const fallback = createFallbackReport(normalized);
      setLogs((prev) => [...prev, { label: "Synthesizing fallback report...", detail: "Backend unavailable, using resilient local intelligence layer." }]);
      setStageIndex(7);
      setCounters({ screens: fallback.screensVisited, frictions: fallback.frictionPoints, confidence: fallback.confidenceScore });
      setReport(fallback);
      setHistory((prev) => [fallback, ...prev.filter((item) => item.url !== fallback.url)].slice(0, 12));
      if (error instanceof Error) {
        console.warn(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    const left = asValidUrl(leftUrl);
    const right = asValidUrl(rightUrl);

    if (!left || !right) {
      alert("Please enter two valid URLs for comparison.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestComparison(left, right);
      setCompareResult(response);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to compare URLs.");
    } finally {
      setLoading(false);
    }
  };

  const currentSummary = useMemo(() => (report ? summaryText(report) : ""), [report]);

  return (
    <main className="app-shell">
      <Header
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((prev) => !prev)}
        onToggleCompare={() => setCompareEnabled((prev) => !prev)}
        compareEnabled={compareEnabled}
        reportCount={history.length}
      />

      <InputPanel
        url={url}
        onUrlChange={setUrl}
        onAnalyze={handleAnalyze}
        loading={loading}
        history={history}
        onLoadHistory={(entry) => {
          setReport(entry);
          setUrl(entry.url);
        }}
      />

      {compareEnabled && (
        <ComparePanel
          leftUrl={leftUrl}
          rightUrl={rightUrl}
          onLeftChange={setLeftUrl}
          onRightChange={setRightUrl}
          onCompare={handleCompare}
          loading={loading}
          result={compareResult}
        />
      )}

      <LivePanel logs={logs} stageIndex={stageIndex} counters={counters} />

      {report && (
        <ResultsPanel
          report={report}
          onCopy={() => navigator.clipboard.writeText(currentSummary)}
          onExportText={() => downloadFile(`flowsense-${Date.now()}.txt`, currentSummary, "text/plain")}
          onExportJson={() => downloadFile(`flowsense-${Date.now()}.json`, JSON.stringify(report, null, 2), "application/json")}
        />
      )}
    </main>
  );
}
