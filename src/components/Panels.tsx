import type { AnalysisReport, CompareResponse, ExecutionStage } from "../types";

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onToggleCompare: () => void;
  compareEnabled: boolean;
  reportCount: number;
}

export function Header({ darkMode, onToggleTheme, onToggleCompare, compareEnabled, reportCount }: HeaderProps) {
  return (
    <header className="shell-card header">
      <div>
        <p className="eyebrow">FrictionLog</p>
        <h1>FlowSense.ai</h1>
        <p className="subtitle">Autonomous UX analysis that feels deliberate and production-ready.</p>
      </div>
      <div className="header-actions">
        <button className={`toggle ${compareEnabled ? "active" : ""}`} onClick={onToggleCompare}>
          {compareEnabled ? "Comparison Mode" : "Single URL Mode"}
        </button>
        <button className="toggle" onClick={onToggleTheme}>{darkMode ? "Dark" : "Light"} Theme</button>
        <span className="history-pill">History: {reportCount}</span>
      </div>
    </header>
  );
}

interface InputPanelProps {
  url: string;
  onUrlChange: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  history: AnalysisReport[];
  onLoadHistory: (report: AnalysisReport) => void;
}

export function InputPanel({ url, onUrlChange, onAnalyze, loading, history, onLoadHistory }: InputPanelProps) {
  return (
    <section className="shell-card input-panel">
      <div className="input-row">
        <input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://example.com"
          aria-label="Website URL"
        />
        <button onClick={onAnalyze} disabled={loading}>{loading ? "Analyzing..." : "Analyze Experience"}</button>
      </div>
      {history.length > 0 && (
        <div className="history-strip">
          {history.slice(0, 5).map((report) => (
            <button key={report.id} className="history-chip" onClick={() => onLoadHistory(report)}>
              {new URL(report.url).hostname}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

interface ComparePanelProps {
  leftUrl: string;
  rightUrl: string;
  onLeftChange: (value: string) => void;
  onRightChange: (value: string) => void;
  onCompare: () => void;
  loading: boolean;
  result: CompareResponse | null;
}

export function ComparePanel({ leftUrl, rightUrl, onLeftChange, onRightChange, onCompare, loading, result }: ComparePanelProps) {
  return (
    <section className="shell-card compare-panel">
      <h2>Side-by-side UX comparison</h2>
      <div className="compare-inputs">
        <input value={leftUrl} onChange={(event) => onLeftChange(event.target.value)} placeholder="https://product-a.com" />
        <input value={rightUrl} onChange={(event) => onRightChange(event.target.value)} placeholder="https://product-b.com" />
        <button onClick={onCompare} disabled={loading}>{loading ? "Comparing..." : "Compare URLs"}</button>
      </div>
      {result && (
        <div className="compare-results">
          <article className="mini-score">
            <h3>{new URL(result.left.url).hostname}</h3>
            <strong>{result.left.uxScore}</strong>
            <p>{result.left.frictionPoints} frictions</p>
          </article>
          <article className="mini-score">
            <h3>{new URL(result.right.url).hostname}</h3>
            <strong>{result.right.uxScore}</strong>
            <p>{result.right.frictionPoints} frictions</p>
          </article>
          <article className="mini-score winner">
            <h3>Winner</h3>
            <strong>{result.winner === "tie" ? "Tie" : result.winner === "left" ? "Left URL" : "Right URL"}</strong>
            <p>Score delta: {result.delta}</p>
          </article>
        </div>
      )}
    </section>
  );
}

interface LivePanelProps {
  logs: ExecutionStage[];
  stageIndex: number;
  counters: {
    screens: number;
    frictions: number;
    confidence: number;
  };
}

export function LivePanel({ logs, stageIndex, counters }: LivePanelProps) {
  return (
    <section className="shell-card live-panel">
      <div className="panel-head">
        <h2>Live Agent Execution</h2>
        <p>Stage {Math.max(stageIndex, 0)} / 7</p>
      </div>
      <div className="counter-row">
        <span>Agent explored {counters.screens} screens</span>
        <span>Detected {counters.frictions} friction points</span>
        <span>Confidence {counters.confidence}%</span>
      </div>
      <div className="terminal">
        {logs.map((entry, index) => (
          <div key={`${entry.label}-${index}`}>
            <p className="log-label">{entry.label}</p>
            <p className="log-detail">{entry.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface ResultsProps {
  report: AnalysisReport;
  onCopy: () => void;
  onExportText: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onCopyFixPrompt: (prompt: string) => void;
}

export function ResultsPanel({ report, onCopy, onExportText, onExportJson, onExportPdf, onCopyFixPrompt }: ResultsProps) {
  return (
    <section className="shell-card results-panel">
      <div className="results-top">
        <div>
          <p className="eyebrow">UX Score</p>
          <div className="hero-score">{report.uxScore}</div>
          <p>{new URL(report.url).hostname}</p>
        </div>
        <div className="export-actions">
          <button onClick={onCopy}>Copy Summary</button>
          <button onClick={onExportText}>Download Text</button>
          <button onClick={onExportPdf}>Download PDF</button>
          <button onClick={onExportJson}>Export JSON</button>
        </div>
      </div>

      <div className="metrics-grid">
        <article><p>Screens explored</p><strong>{report.screensVisited}</strong></article>
        <article><p>Friction points</p><strong>{report.frictionPoints}</strong></article>
        <article><p>Confidence score</p><strong>{report.confidenceScore}%</strong></article>
        <article><p>Task difficulty</p><strong>{report.taskDifficulty}%</strong></article>
        <article><p>Perceived load score</p><strong>{report.perceivedLoadScore}</strong></article>
        <article><p>Time-to-interaction</p><strong>{report.timeToInteractionMs}ms</strong></article>
        <article><p>Model confidence</p><strong>{report.modelConfidence ?? report.confidenceScore}%</strong></article>
        <article><p>Provider used</p><strong>{report.providerUsed || "heuristic"}</strong></article>
        <article><p>Learning trend</p><strong>{report.learning?.trend || "new"}</strong></article>
      </div>

      <div className="grid-two">
        <section>
          <h3>Issues Detected</h3>
          {report.issues.map((issue) => (
            <article key={issue.id} className="issue-card">
              <div className="issue-top">
                <h4>{issue.title}</h4>
                <span className={`severity ${issue.severity.toLowerCase()}`}>{issue.severity}</span>
              </div>
              <p>{issue.explanation}</p>
              <p><strong>Impact:</strong> {issue.impact}</p>
              <button onClick={() => onCopyFixPrompt(issue.fixPrompt)}>Copy Fix Prompt</button>
            </article>
          ))}
        </section>

        <section>
          <h3>Prioritized Suggestions</h3>
          {report.suggestions.map((suggestion) => (
            <article key={suggestion.id} className="suggestion-card">
              <p className="priority">Priority {suggestion.priority}</p>
              <h4>{suggestion.title}</h4>
              <p>{suggestion.action}</p>
            </article>
          ))}
        </section>
      </div>

      <section>
        <h3>Session Replay Timeline</h3>
        <div className="timeline">
          {report.journey.map((step) => (
            <article key={`${step.step}-${step.screen}`}>
              <p>Step {step.step}: {step.action}</p>
              <p>{step.screen}</p>
              <p>{step.signal}</p>
            </article>
          ))}
        </div>
      </section>

      {report.aiSummary && (
        <section>
          <h3>AI Intelligence Layer</h3>
          <article className="suggestion-card">
            <p>{report.aiSummary}</p>
            <p className="priority">Providers attempted: {report.providerTrace?.attempted?.join(", ") || "none"}</p>
          </article>
          <div className="timeline">
            {(report.aiActions || []).map((action, index) => (
              <article key={`${action.title}-${index}`}>
                <p>Action {index + 1}: {action.title}</p>
                <p>{action.whyItMatters}</p>
                <button onClick={() => onCopyFixPrompt(action.implementationPrompt)}>Copy Builder Prompt</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
