export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface Issue {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  explanation: string;
  impact: string;
  suggestion: string;
  fixPrompt: string;
}

export interface Suggestion {
  id: string;
  priority: number;
  title: string;
  action: string;
  rationale: string;
}

export interface JourneyStep {
  step: number;
  action: string;
  screen: string;
  intent: string;
  signal: string;
}

export interface AnalysisAction {
  title: string;
  whyItMatters: string;
  implementationPrompt: string;
}

export interface LearningProfile {
  runCount: number;
  avgScore: number | null;
  avgFriction: number | null;
  trend: string;
}

export interface ProviderTrace {
  attempted: string[];
  used: string;
}

export interface AnalysisReport {
  id: string;
  analyzedAt: string;
  url: string;
  pageTitle: string;
  uxScore: number;
  confidenceScore: number;
  taskDifficulty: number;
  screensVisited: number;
  frictionPoints: number;
  perceivedLoadScore: number;
  timeToInteractionMs: number;
  engineMode: string;
  modelConfidence?: number;
  aiSummary?: string;
  aiActions?: AnalysisAction[];
  providerUsed?: string;
  providerTrace?: ProviderTrace;
  learning?: LearningProfile;
  issues: Issue[];
  suggestions: Suggestion[];
  journey: JourneyStep[];
  summary: {
    strengths: string[];
    risks: string[];
  };
}

export interface ExecutionStage {
  label: string;
  detail: string;
}

export interface AnalyzeResponse {
  report: AnalysisReport;
  execution: {
    engine: string;
    stages: ExecutionStage[];
    timeline: JourneyStep[];
  };
}

export interface CompareResponse {
  left: AnalysisReport;
  right: AnalysisReport;
  winner: "left" | "right" | "tie";
  delta: number;
}

export interface ProviderStatus {
  nvidia: boolean;
  groq: boolean;
}

export interface ConfigResponse {
  providers: ProviderStatus;
  continuousHooks: {
    deployment: string;
    pullRequest: string;
  };
}

export interface WorkspaceProfile {
  displayName: string;
  companyName: string;
  companyStage: string;
  organization: string;
  role: string;
  website: string;
  productUrl: string;
  relevantUrls: string;
  agentName: string;
  agentMode: string;
  agentNotes: string;
  bio: string;
  email?: string;
  photoURL?: string;
  profileComplete?: boolean;
}

export interface WorkspaceMessage {
  tone: "info" | "success" | "warning";
  title: string;
  detail: string;
}

export interface FrontendUser {
  id: string;
  email: string;
  displayName: string;
}

export interface ChatAgent {
  id: string;
  name: string;
  role: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  agentId: string;
  createdAt: string;
}

export interface ChatMessageResponse {
  provider: string;
  agentId: string;
  answer: string;
}
