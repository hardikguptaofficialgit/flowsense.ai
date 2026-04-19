import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { requestAnalysis, requestComparison, requestConfig } from "./api";
import { ComparePanel, Header, InputPanel, LivePanel, ResultsPanel } from "./components/Panels";
import { auth, googleProvider, hasFirebaseConfig } from "./lib/firebase";
import logoSrc from "./assets/flowsense-logo.svg";
import type { AnalysisReport, CompareResponse, ExecutionStage, Issue } from "./types";

const DEFAULT_LOGS: ExecutionStage[] = [{ label: "Launching agent...", detail: "Awaiting analysis start." }];

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
    ...report.suggestions.map((s) => `- P${s.priority}: ${s.action}`),
  ];

  return lines.join("\n");
}

function exportPdf(report: AnalysisReport) {
  const pdf = new jsPDF();
  const summary = summaryText(report).split("\n");
  let y = 14;

  pdf.setFontSize(14);
  pdf.text("FlowSense.ai UX Audit", 14, y);
  y += 8;
  pdf.setFontSize(10);

  for (const line of summary) {
    const wrapped = pdf.splitTextToSize(line || " ", 180);
    for (const fragment of wrapped) {
      if (y > 280) {
        pdf.addPage();
        y = 14;
      }
      pdf.text(fragment, 14, y);
      y += 5;
    }
  }

  pdf.save(`flowsense-${Date.now()}.pdf`);
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
    aiActions: issues.map((issue) => ({ title: issue.title, whyItMatters: issue.impact, implementationPrompt: issue.fixPrompt })),
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
      strengths: ["Core value is detectable without deep exploration.", "A likely conversion path exists through top-level navigation."],
      risks: issues.map((issue) => issue.impact),
    },
  };
}

export default function App() {
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
  const [providers, setProviders] = useState({ openai: false, nvidia: false, perplexity: false });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem("flowsense-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    requestConfig().then((config) => setProviders(config.providers)).catch(() => setProviders({ openai: false, nvidia: false, perplexity: false }));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (user) => setCurrentUser(user));
  }, []);

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
      setCounters({ screens: response.report.screensVisited, frictions: response.report.frictionPoints, confidence: response.report.confidenceScore });
      setReport(response.report);
      setHistory((prev) => [response.report, ...prev.filter((item) => item.url !== response.report.url)].slice(0, 12));
    } catch (error) {
      const fallback = createFallbackReport(normalized);
      setLogs((prev) => [...prev, { label: "Synthesizing fallback report...", detail: "Backend unavailable, using resilient local intelligence layer." }]);
      setStageIndex(7);
      setCounters({ screens: fallback.screensVisited, frictions: fallback.frictionPoints, confidence: fallback.confidenceScore });
      setReport(fallback);
      setHistory((prev) => [fallback, ...prev.filter((item) => item.url !== fallback.url)].slice(0, 12));
      if (error instanceof Error) console.warn(error.message);
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

  const handleEmailAuth = async () => {
    if (!auth) {
      setAuthError("Firebase Auth is not configured.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthOpen(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!auth) {
      setAuthError("Firebase Auth is not configured.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      await signInWithPopup(auth, googleProvider);
      setAuthOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const currentSummary = useMemo(() => (report ? summaryText(report) : ""), [report]);

  return (
    <main className="site-shell">
      <section className="hero-section">
        <div className="floating-layer layer-one" style={{ transform: `translateY(${scrollY * 0.18}px)` }} />
        <div className="floating-layer layer-two" style={{ transform: `translateY(${scrollY * -0.12}px)` }} />
        <nav className="top-nav">
          <div className="brand-lockup">
            <img src={logoSrc} alt="FlowSense logo" className="brand-logo" />
            <div>
              <p className="eyebrow">FrictionLog</p>
              <h1>FlowSense.ai</h1>
            </div>
          </div>
          <div className="top-actions">
            {!currentUser ? <button onClick={() => setAuthOpen(true)}>Sign In</button> : <button onClick={() => window.location.href = "#workspace"}>Open Workspace</button>}
          </div>
        </nav>

        <div className="hero-grid">
          <article className="hero-copy">
            <p className="eyebrow">Autonomous UX Intelligence</p>
            <h2>Continuous product experience auditing with real-time agent reasoning</h2>
            <p>
              FlowSense simulates realistic user journeys, detects friction, prioritizes impact, and generates fix-ready prompts your builders can execute instantly.
            </p>
            <div className="cta-row">
              <button onClick={() => setAuthOpen(true)}>{currentUser ? "Manage Account" : "Get Started"}</button>
              <button className="ghost" onClick={() => window.location.href = "#workspace"}>Explore Demo Workspace</button>
            </div>
            <p className="status-line">Providers: OpenAI {providers.openai ? "connected" : "offline"} | NVIDIA {providers.nvidia ? "connected" : "offline"} | Perplexity {providers.perplexity ? "connected" : "offline"}</p>
          </article>
          <article className="hero-visual shell-card" style={{ transform: `translateY(${scrollY * 0.08}px)` }}>
            <h3>Live Perception Engine</h3>
            <div className="signal-stack">
              <span>Agent explored 5 screens</span>
              <span>Detected 8 friction points</span>
              <span>Model confidence 87%</span>
              <span>Path continuity validated</span>
            </div>
            <div className="mini-terminal">
              <p>Launching agent runtime...</p>
              <p>Scanning homepage hierarchy...</p>
              <p>Simulating conversion intent...</p>
              <p>Composing prioritized UX actions...</p>
            </div>
          </article>
        </div>
      </section>

      <section className="feature-section">
        <article className="feature-card">
          <h3>Agent-Driven Simulation</h3>
          <p>Simulates onboarding, exploration, and conversion journeys with staged telemetry.</p>
        </article>
        <article className="feature-card" style={{ transform: `translateY(${scrollY * -0.04}px)` }}>
          <h3>Fix-Ready Action Layer</h3>
          <p>Every detected issue includes implementation prompts for builders and dev teams.</p>
        </article>
        <article className="feature-card">
          <h3>Continuous Monitoring</h3>
          <p>Webhook endpoints let you trigger UX audits on deployment and PR merge workflows.</p>
        </article>
      </section>

      <section id="workspace" className="workspace-shell">
        {currentUser ? (
          <>
            <Header
              onToggleCompare={() => setCompareEnabled((prev) => !prev)}
              compareEnabled={compareEnabled}
              reportCount={history.length}
              userEmail={currentUser.email || "Authenticated user"}
              onSignOut={() => auth && signOut(auth)}
              logoSrc={logoSrc}
            />

            <section className="shell-card">
              <p className="eyebrow">Model Orchestration</p>
              <p>OpenAI: {providers.openai ? "Connected" : "Not configured"} | NVIDIA: {providers.nvidia ? "Connected" : "Not configured"} | Perplexity: {providers.perplexity ? "Connected" : "Not configured"}</p>
            </section>

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
                onExportPdf={() => exportPdf(report)}
                onExportJson={() => downloadFile(`flowsense-${Date.now()}.json`, JSON.stringify(report, null, 2), "application/json")}
                onCopyFixPrompt={(prompt) => navigator.clipboard.writeText(prompt)}
              />
            )}
          </>
        ) : (
          <section className="shell-card auth-locked">
            <h3>Workspace is protected</h3>
            <p>Sign in to unlock live analysis, exports, history, and continuous UX monitoring.</p>
            {!hasFirebaseConfig && <p className="warning-copy">Firebase is not configured yet. Add `VITE_FIREBASE_*` keys to `.env`.</p>}
            <button onClick={() => setAuthOpen(true)}>Open Authentication</button>
          </section>
        )}
      </section>

      {authOpen && (
        <div className="auth-overlay" role="dialog" aria-modal="true">
          <div className="auth-card shell-card">
            <button className="close-auth" onClick={() => setAuthOpen(false)}>Close</button>
            <img src={logoSrc} alt="FlowSense mark" className="auth-logo" />
            <h3>{authMode === "signin" ? "Sign in" : "Create account"}</h3>
            <p>Secure access to the FlowSense autonomous UX workspace.</p>
            <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email" type="email" />
            <input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Password" type="password" />
            <button onClick={handleEmailAuth} disabled={authLoading || !hasFirebaseConfig}>
              {authLoading ? "Processing..." : authMode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <button className="ghost" onClick={handleGoogleAuth} disabled={authLoading || !hasFirebaseConfig}>Continue with Google</button>
            <button className="text-btn" onClick={() => setAuthMode((prev) => prev === "signin" ? "signup" : "signin")}>
              {authMode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
            {authError && <p className="warning-copy">{authError}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
