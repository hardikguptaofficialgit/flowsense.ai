import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Interfaces, Misc } from "doodle-icons";
import {
  requestAnalysis,
  requestComparison,
  requestConfig,
  requestGoogleAuth,
  requestHistory,
  requestProfile,
  requestSession,
  requestSignIn,
  requestSignOut,
  requestSignUp,
  saveHistoryEntry,
  saveProfile,
} from "./api";
import logoSrc from "./assets/flowsense.png";
import { WorkspacePage } from "./components/Panels";
import { AuthModal, OnboardingModal } from "./components/AuthModal";
import type {
  AnalysisReport,
  BrowserDiagnostics,
  CompareResponse,
  ExecutionStage,
  FrontendUser,
  ProviderStatus,
  WorkspaceProfile,
} from "./types";
import { getDiceBearAvatarUrl } from "./utils/avatar";
import { configureFirebase, hasFirebaseConfig, signInWithGooglePopup } from "./lib/firebase";

const DEFAULT_LOGS: ExecutionStage[] = [{ label: "Launching agent...", detail: "Awaiting analysis start." }];
const DEFAULT_PROVIDER_STATUS: ProviderStatus = { nvidia: false, groq: false };
const DEFAULT_PROFILE: WorkspaceProfile = {
  displayName: "",
  companyName: "",
  companyStage: "",
  organization: "",
  role: "",
  website: "",
  productUrl: "",
  relevantUrls: "",
  agentName: "",
  agentMode: "",
  agentNotes: "",
  bio: "",
};

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

/* Inline styles */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* Softer Pastel Palette */
    --pastel-mint: #e4f2ea;
    --pastel-sky: #e6f0f7;
    --pastel-gold: #fcf4e3;
    --pastel-lilac: #f0eaf7;
    --bg: #fcfdfd;
    --surface: #ffffff;
    --surface-2: #f6f9f8;
    --border: rgba(91, 140, 133, 0.1);
    --border-strong: rgba(91, 140, 133, 0.18);
    
    /* Typography Colors */
    --text-primary: #2c3e42;
    --text-secondary: #526b70;
    --text-muted: #799399;
    
    /* Accents */
    --accent: #5b8c85;
    --accent-strong: #3f6b65;
    --accent-green: #82b596;
    --accent-green-bg: var(--pastel-mint);
    --accent-amber: #d4a350;
    --accent-amber-bg: var(--pastel-gold);
    --accent-red: #db8a8a;
    --accent-red-bg: #fbeded;
    --accent-blue: #84a9c4;
    --accent-blue-bg: var(--pastel-sky);
    
    /* Sizing & Layout */
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-xl: 28px;
    
    --nav-height: 64px;
    --nav-height-compact: 52px;
    
    --shadow-card: 0 8px 30px rgba(0,0,0,0.03), 0 1px 4px rgba(0,0,0,0.02);
    --shadow-nav: 0 4px 24px rgba(0,0,0,0.02);
    --shadow-nav-compact: 0 12px 36px rgba(0,0,0,0.05);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    background:
      radial-gradient(circle at 10% 0%, rgba(228, 242, 234, 0.6), transparent 30%),
      radial-gradient(circle at 90% 10%, rgba(230, 240, 247, 0.5), transparent 30%),
      linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  
  /* Floating Nav */
  .floating-nav {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 32px);
    max-width: 1060px;
    height: var(--nav-height);
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-nav);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px 0 24px;
    z-index: 1000;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .floating-nav.scrolled {
    height: var(--nav-height-compact);
    max-width: 760px;
    padding: 0 12px 0 20px;
    background: rgba(255,255,255,0.96);
    box-shadow: var(--shadow-nav-compact);
    border-color: var(--border-strong);
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .brand-row .brand-name {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    background: linear-gradient(135deg, #2c3e42 0%, var(--accent) 50%, var(--accent-strong) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
    letter-spacing: -0.4px;
    line-height: 1;
    transition: font-size 0.3s ease;
  }
  
  .floating-nav.scrolled .brand-name {
    font-size: 16px;
  }

  .brand-row .brand-tagline {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    line-height: 1;
    margin-top: 4px;
    transition: opacity 0.3s ease;
  }
  
  .floating-nav.scrolled .brand-tagline {
    opacity: 0;
    display: none;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 4px;
    list-style: none;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .nav-links a {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
    letter-spacing: -0.1px;
  }

  .nav-links a:hover {
    color: var(--text-primary);
    background: var(--pastel-sky);
  }

  .nav-links a.active {
    color: var(--text-primary);
    background: var(--pastel-mint);
  }

  .nav-icon {
    width: 14px;
    height: 14px;
    opacity: 0.8;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .nav-actions button {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: -0.1px;
    box-shadow: 0 4px 12px rgba(91, 140, 133, 0.2);
  }

  .nav-actions button:hover {
    background: var(--accent-strong);
    box-shadow: 0 6px 16px rgba(91, 140, 133, 0.3);
  }

  /* Page shell */
  .site-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .page {
    padding-top: calc(var(--nav-height) + 64px);
    flex: 1;
  }

  /* Landing Hero */
  .landing-page {
    padding-top: calc(var(--nav-height) + 80px);
  }

  .hero-section {
    max-width: 1060px;
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: 6px 14px 6px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  }

  .hero-eyebrow .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-green);
    animation: pulse-dot 2.5s infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  .hero-headline {
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 56px);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -1.5px;
    color: var(--text-primary);
    max-width: 760px;
    margin-bottom: 20px;
  }

  .hero-headline em {
    font-style: normal;
    color: var(--accent);
  }

  .hero-subtext {
    font-size: 16px;
    font-weight: 400;
    color: var(--text-secondary);
    max-width: 560px;
    line-height: 1.6;
    margin-bottom: 40px;
  }

  .hero-cta-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 64px;
  }

  .btn-primary {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 8px 20px rgba(91, 140, 133, 0.25);
  }

  .btn-primary:hover {
    background: var(--accent-strong);
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(91, 140, 133, 0.3);
  }

  .btn-ghost {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text-primary);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-ghost:hover {
    background: var(--surface-2);
    border-color: var(--accent);
  }

  /* Stats Row - FIXED SYNTAX & SIZING */
  .stats-row {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    background: var(--surface);
    overflow: hidden;
    margin-bottom: 64px;
    box-shadow: var(--shadow-card);
  }

  .stat-item {
    flex: 1;
    padding: 24px 20px;
    border-right: 1px solid var(--border);
    text-align: center;
  }

  .stat-item:last-child {
    border-right: none;
  }

  .stat-item:nth-child(1) { background: var(--pastel-mint); }
  .stat-item:nth-child(2) { background: var(--pastel-sky); }
  .stat-item:nth-child(3) { background: var(--pastel-gold); }
  .stat-item:nth-child(4) { background: var(--pastel-lilac); }

  .stat-value {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* Feature Cards */
  .section-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 20px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 64px;
  }

  .feature-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px 24px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.01);
  }

  .feature-card:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-card);
    transform: translateY(-2px);
  }

  .feature-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--pastel-sky);
    color: var(--accent-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .feature-icon-wrap svg {
    width: 20px;
    height: 20px;
  }

  .feature-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.2px;
  }

  .feature-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  /* How it works */
  .how-section {
    margin-bottom: 72px;
  }

  .how-flowchart {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 24px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 32px;
    box-shadow: var(--shadow-card);
  }

  .flow-node {
    flex: 1;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 32px 24px;
    text-align: center;
    transition: all 0.2s ease;
  }
  
  .flow-node:hover {
    background: var(--surface);
    box-shadow: 0 8px 24px rgba(91, 140, 133, 0.08);
  }

  .flow-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 20px;
    border-radius: 16px;
    background: var(--pastel-mint);
    color: var(--accent-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 800;
    border: 2px solid var(--surface);
    box-shadow: 0 4px 12px rgba(91, 140, 133, 0.15);
  }

  .flow-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 10px;
    letter-spacing: -0.2px;
  }

  .flow-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  .flow-connector {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--pastel-sky);
    border: 2px solid var(--surface);
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    z-index: 2;
  }

  .flow-connector svg {
    width: 20px;
    height: 20px;
  }

  /* Terminal preview */
  .terminal-section {
    background: #1a2325;
    border-radius: var(--radius-xl);
    padding: 32px 36px;
    margin-bottom: 72px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 16px 40px rgba(0,0,0,0.1);
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
  }

  .terminal-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .terminal-dot.red { background: #ff5f56; }
  .terminal-dot.yellow { background: #ffbd2e; }
  .terminal-dot.green { background: #27c93f; }

  .terminal-label {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    margin-left: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    letter-spacing: 0.05em;
  }

  .terminal-line {
    font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.8;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .terminal-line .prompt { color: rgba(255,255,255,0.3); }
  .terminal-line .cmd { color: rgba(255,255,255,0.9); }
  .terminal-line .out { color: var(--accent-green); }
  .terminal-line .info { color: var(--accent-blue); }
  .terminal-line .warn { color: var(--accent-amber); }
  .terminal-line .muted { color: rgba(255,255,255,0.4); }

  .provider-status-row {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .provider-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: rgba(255,255,255,0.7);
  }

  .provider-chip .led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
  }

  .provider-chip .led.on { background: var(--accent-green); box-shadow: 0 0 8px rgba(130, 181, 150, 0.5); }

  /* Use cases */
  .usecases-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 72px;
  }

  .usecase-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px 28px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .usecase-card:hover {
    box-shadow: var(--shadow-card);
    border-color: var(--border-strong);
  }

  .usecase-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 6px 10px;
    background: var(--pastel-gold);
    color: var(--accent-strong);
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .usecase-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.4px;
    margin-bottom: 8px;
  }

  .usecase-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  .cta-banner {
    background: linear-gradient(135deg, var(--pastel-sky), var(--pastel-mint));
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 48px;
    text-align: center;
    margin-bottom: 64px;
    box-shadow: var(--shadow-card);
  }

  .cta-banner h2 {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.8px;
    margin-bottom: 16px;
  }

  .cta-banner p {
    font-size: 16px;
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 32px;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .btn-primary-light {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-strong);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .btn-primary-light:hover {
    background: var(--surface-2);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  }

  /* Workspace Page */
  .workspace-shell {
    max-width: 1060px;
    margin: 0 auto;
    padding: 24px 24px 64px;
  }

  /* About Page */
  .about-page {
    max-width: 780px;
    margin: 0 auto;
    padding-left: 24px;
    padding-right: 24px;
    padding-bottom: 64px;
  }

  .about-page h2 {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 32px;
    color: var(--text-primary);
  }

  .about-copy {
    display: grid;
    gap: 0;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 36px;
    box-shadow: var(--shadow-card);
  }

  .about-page p {
    font-size: 16px;
    color: var(--text-secondary);
    font-weight: 400;
    line-height: 1.7;
    margin-bottom: 20px;
  }

  .built-by {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-muted);
    margin-top: 48px;
  }

  /* Footer - FIXED SYNTAX */
  .site-footer {
    background: var(--surface-2);
    border-top: 1px solid var(--border-strong);
    padding: 48px 40px 40px;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 48px;
    max-width: 1140px;
    margin: 0 auto;
    width: 100%;
  }

  .site-footer strong {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    display: block;
    margin-bottom: 12px;
  }

  .site-footer p {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
    font-weight: 400;
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    gap: 12px;
  }

  .footer-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .footer-links a:hover {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  /* Modals */
  .auth-overlay, .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(44, 62, 66, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(8px);
    padding: 16px;
  }

  .auth-card, .modal-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 40px 32px;
    width: 100%;
    max-width: 400px;
    position: relative;
    box-shadow: 0 24px 48px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-card {
    max-width: 460px;
  }

  .modal-card--wide {
    max-width: 680px;
  }

  .auth-card h3, .modal-auth-head h3 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.4px;
    color: var(--text-primary);
  }

  .auth-card > p, .modal-copy {
    font-size: 14px;
    color: var(--text-muted);
    font-weight: 400;
    line-height: 1.6;
  }

  .auth-logo { width: 36px; height: 36px; }

  .auth-card input, .field-stack input, .field-stack textarea {
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--surface-2);
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    transition: all 0.2s ease;
  }

  .auth-card input:focus, .field-stack input:focus, .field-stack textarea:focus {
    border-color: var(--accent);
    background: var(--surface);
    box-shadow: 0 0 0 3px var(--pastel-mint);
  }

  .auth-card button, .modal-primary-button, .google-auth-button {
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--radius-md);
    border: none;
    background: var(--accent);
    color: #fff;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .auth-card button:hover:not(:disabled), .modal-primary-button:hover:not(:disabled) { 
    background: var(--accent-strong);
  }

  .auth-card button:disabled, .modal-primary-button:disabled, .google-auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .google-auth-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #ffffff;
    color: #2c3e42;
    border: 1px solid var(--border-strong);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .google-auth-button:hover:not(:disabled) {
    background: var(--surface-2);
    border-color: var(--border);
  }

  .google-auth-icon svg { width: 20px; height: 20px; }

  .modal-divider {
    position: relative;
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
    margin: 8px 0;
  }

  .modal-divider::before {
    content: "";
    position: absolute;
    inset: 50% 0 auto;
    height: 1px;
    background: var(--border-strong);
  }

  .modal-divider span {
    position: relative;
    padding: 0 12px;
    background: var(--surface);
  }

  .field-stack label {
    display: grid;
    gap: 6px;
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 600;
  }

  .modal-close, .close-auth {
    position: absolute;
    top: 16px;
    right: 16px;
    background: var(--surface-2) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border) !important;
    padding: 6px 14px !important;
    font-size: 12px !important;
    border-radius: var(--radius-sm) !important;
    font-weight: 600 !important;
  }
  
  .modal-close:hover, .close-auth:hover {
    background: var(--pastel-sky) !important;
    color: var(--text-primary) !important;
  }

  .warning-copy, .inline-warning {
    font-size: 13px;
    color: var(--accent-red);
    background: var(--accent-red-bg);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(219, 138, 138, 0.3);
  }

  .text-button {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  
  .text-button:hover {
    color: var(--accent);
  }
`;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isWorkspaceRoute = location.pathname.startsWith("/workspace");

  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState<ExecutionStage[]>(DEFAULT_LOGS);
  const [stageIndex, setStageIndex] = useState(0);
  const [counters, setCounters] = useState({ screens: 0, frictions: 0, confidence: 0 });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [providers, setProviders] = useState<ProviderStatus>(DEFAULT_PROVIDER_STATUS);
  const [automation, setAutomation] = useState<BrowserDiagnostics | null>(null);
  const [currentUser, setCurrentUser] = useState<FrontendUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [authJustSignedUp, setAuthJustSignedUp] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profile, setProfile] = useState<WorkspaceProfile>(DEFAULT_PROFILE);
  const [profileSaving, setProfileSaving] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const userAvatarSeed = currentUser?.id || currentUser?.email || profile.displayName || profile.email || "flowsense";
  const userAvatarUrl = useMemo(() => getDiceBearAvatarUrl(userAvatarSeed), [userAvatarSeed]);

  const timersRef = useRef<number[]>([]);

  const pushHistory = async (nextReport: AnalysisReport, execution?: { stages: ExecutionStage[]; timeline: AnalysisReport["journey"] }) => {
    setHistory((prev) => [nextReport, ...prev.filter((item) => item.id !== nextReport.id)].slice(0, 12));

    if (!currentUser) return;
    await saveHistoryEntry({
      report: {
        ...nextReport,
        providerUsed: nextReport.providerUsed || "heuristic",
      },
      execution,
    }).catch(() => null);
  };

  const loadProfile = async (user: FrontendUser, forceOnboarding = false) => {
    const data = await requestProfile();
    setProfile({
      displayName: String(data.displayName || user.displayName || ""),
      companyName: String(data.companyName || ""),
      companyStage: String(data.companyStage || ""),
      organization: String(data.organization || ""),
      role: String(data.role || ""),
      website: String(data.website || ""),
      productUrl: String(data.productUrl || ""),
      relevantUrls: String(data.relevantUrls || ""),
      agentName: String(data.agentName || ""),
      agentMode: String(data.agentMode || ""),
      agentNotes: String(data.agentNotes || ""),
      bio: String(data.bio || ""),
      email: user.email || undefined,
      photoURL: data.photoURL || getDiceBearAvatarUrl(user.id || user.email || user.displayName || data.displayName || "flowsense"),
    });
    const needsOnboarding = !data?.profileComplete;
    setOnboardingOpen(needsOnboarding || forceOnboarding || authJustSignedUp);
  };

  const loadSessionState = async (forceOnboarding = false) => {
    try {
      const session = await requestSession();
      if (!session.authenticated || !session.user) {
        setCurrentUser(null);
        setAuthResolved(true);
        setAuthModalOpen(false);
        setOnboardingOpen(false);
        setAuthJustSignedUp(false);
        setHistory([]);
        setProfile(DEFAULT_PROFILE);
        return;
      }

      setCurrentUser(session.user);
      await loadProfile(session.user, forceOnboarding);
      const cloudHistory = await requestHistory(12);
      if (cloudHistory.length) {
        setHistory(cloudHistory);
      }
      setAuthJustSignedUp(false);
      setAuthResolved(true);
    } catch {
      setCurrentUser(null);
      setAuthResolved(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    requestConfig(import.meta.env.DEV)
      .then((config) => {
        setProviders(config.providers);
        setFirebaseReady(configureFirebase(config.firebaseWebConfig));
        setAutomation(config.automation || null);
        setConfigLoaded(true);
      })
      .catch(() => {
        setProviders(DEFAULT_PROVIDER_STATUS);
        setFirebaseReady(false);
        setAutomation(null);
        setConfigLoaded(true);
      });
  }, []);

  useEffect(() => {
    void loadSessionState();
  }, []);

  useEffect(() => {
    if (authResolved && isWorkspaceRoute && !currentUser) {
      setAuthModalOpen(true);
      navigate("/", { replace: true });
    }
  }, [authResolved, currentUser, isWorkspaceRoute, navigate]);

  useEffect(() => {
    if (location.pathname === "/auth") {
      if (!currentUser) {
        setAuthModalOpen(true);
      }
      navigate("/", { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

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
      }, 260 + index * 360);
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
    setReport(null);
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
      await pushHistory(response.report, response.execution);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          label: "Analysis failed",
          detail: error instanceof Error ? error.message : "Analysis failed. No report was generated.",
        },
      ]);
      alert(error instanceof Error ? error.message : "Analysis failed. No report was generated.");
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
    setCompareResult(null);
    try {
      const response = await requestComparison(left, right);
      setCompareResult(response);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to compare URLs.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      navigate("/", { replace: true });
      return;
    }

    setProfileSaving(true);
    try {
      const nextProfile = {
        displayName: profile.displayName.trim(),
        companyName: profile.companyName.trim(),
        companyStage: profile.companyStage.trim(),
        organization: profile.organization.trim(),
        role: profile.role.trim(),
        website: profile.website.trim(),
        productUrl: profile.productUrl.trim(),
        relevantUrls: profile.relevantUrls.trim(),
        agentName: profile.agentName.trim(),
        agentMode: profile.agentMode.trim(),
        agentNotes: profile.agentNotes.trim(),
        bio: profile.bio.trim(),
        email: currentUser.email || profile.email || undefined,
        photoURL: getDiceBearAvatarUrl(currentUser.id || currentUser.email || profile.displayName || profile.email || "flowsense"),
        profileComplete: Boolean(
          profile.displayName.trim() &&
          profile.companyName.trim() &&
          profile.website.trim() &&
          profile.productUrl.trim() &&
          profile.agentName.trim()
        ),
      };

      await saveProfile(nextProfile);
      setProfile((prev) => ({
        ...prev,
        email: currentUser.email || prev.email,
        photoURL: getDiceBearAvatarUrl(currentUser.id || currentUser.email || prev.displayName || prev.email || "flowsense"),
      }));
      setOnboardingOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEmailAuth = async () => {
    setAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "signup") {
        await requestSignUp({ email: authEmail, password: authPassword, displayName: authEmail.split("@")[0] });
        setAuthJustSignedUp(true);
      } else {
        await requestSignIn({ email: authEmail, password: authPassword });
      }
      await loadSessionState(authMode === "signup");
      setAuthEmail("");
      setAuthPassword("");
      setAuthModalOpen(false);
      navigate("/workspace/dashboard");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthError("");

      if (!firebaseReady || !hasFirebaseConfig) {
        setAuthError("Firebase Google Sign-In is not configured from the backend.");
        return;
      }

      const googleAuth = await signInWithGooglePopup();
      if (!googleAuth.googleIdToken) {
        throw new Error("Google sign-in token was not returned by Firebase. Check Google provider setup.");
      }

      await requestGoogleAuth({
        email: googleAuth.email,
        displayName: googleAuth.displayName,
        photoURL: googleAuth.photoURL,
        idToken: googleAuth.googleIdToken,
      });

      await loadSessionState(true);
      setAuthModalOpen(false);
      navigate("/workspace/dashboard");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await requestSignOut().catch(() => null);
    setCurrentUser(null);
    setHistory([]);
    setProfile(DEFAULT_PROFILE);
    navigate("/");
  };

  const currentSummary = useMemo(() => (report ? summaryText(report) : ""), [report]);

  return (
    <main className="site-shell">
      <style>{css}</style>

      {!isWorkspaceRoute && (
        <header className={`floating-nav ${isScrolled ? "scrolled" : ""}`}>
          <div className="brand-row">
            <div>
              <div className="brand-name">FlowSense.ai</div>
              <div className="brand-tagline">UX Intelligence</div>
            </div>
          </div>

          <nav className="nav-links">
            <NavLink to="/" end>
              <Interfaces.Home className="nav-icon" />
              Home
            </NavLink>
            <NavLink to="/workspace">
              <Interfaces.Dashboard className="nav-icon" />
              Workspace
            </NavLink>
            <NavLink to="/about">
              <Interfaces.Info className="nav-icon" />
              About
            </NavLink>
          </nav>

          <div className="nav-actions">
            {!currentUser ? (
              <button onClick={() => setAuthModalOpen(true)}>Sign in</button>
            ) : (
              <button onClick={() => void handleSignOut()}>Sign out</button>
            )}
          </div>
        </header>
      )}

      <Routes>
        {/* HOME */}
        <Route
          path="/"
          element={
            <div className="landing-page">
              <section className="hero-section">
                
                {/* Headline */}
                <h1 className="hero-headline">
                  See your product<br />
                  through <em>real user</em><br />
                  eyes. Fix it fast.
                </h1>

                <p className="hero-subtext">
                  FlowSense.ai runs autonomous interaction simulations, maps critical paths,
                  detects friction points, and delivers implementation-ready fixes for your
                  product, design, and engineering teams.
                </p>

                {/* CTA Row */}
                <div className="hero-cta-row">
                  <NavLink to="/workspace" className="btn-primary">
                    Analyze a URL
                  </NavLink>
                  <NavLink to="/about" className="btn-ghost">
                    About FlowSense
                  </NavLink>
                </div>

                {/* Stats */}
                <div className="stats-row">
                  <div className="stat-item">
                    <div className="stat-value">8+</div>
                    <div className="stat-label">Friction categories analyzed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">92%</div>
                    <div className="stat-label">Max confidence score</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">3</div>
                    <div className="stat-label">AI model providers supported</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">&lt;60s</div>
                    <div className="stat-label">Full audit turnaround</div>
                  </div>
                </div>

                {/* Features */}
                <p className="section-label">What we analyze</p>
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="feature-icon-wrap">
                      <Interfaces.Analytics />
                    </div>
                    <div className="feature-title">Navigation clarity</div>
                    <p className="feature-desc">
                      Identifies competing routes, diluted hierarchies, and orientation failures
                      that increase early abandonment risk.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrap">
                      <Interfaces.Target />
                    </div>
                    <div className="feature-title">CTA hierarchy</div>
                    <p className="feature-desc">
                      Scores primary action visibility, contrast quality, and copy specificity
                      against conversion benchmarks.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrap">
                      <Interfaces.Sync />
                    </div>
                    <div className="feature-title">Conversion flow</div>
                    <p className="feature-desc">
                      Simulates the complete discovery-to-conversion journey to surface friction
                      checkpoints before users hit them.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrap">
                      <Interfaces.Zap />
                    </div>
                    <div className="feature-title">Perceived performance</div>
                    <p className="feature-desc">
                      Scores time-to-interactive estimates and perceived load against engagement
                      drop-off thresholds.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrap">
                      <Interfaces.Shield />
                    </div>
                    <div className="feature-title">Accessibility signals</div>
                    <p className="feature-desc">
                      Flags contrast failures, missing semantics, and WCAG-adjacent patterns
                      that exclude users.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrap">
                      <Misc.Bot />
                    </div>
                    <div className="feature-title">Mobile responsiveness</div>
                    <p className="feature-desc">
                      Evaluates layout compression risk across 375, 414, and 768px breakpoints
                      for critical action visibility.
                    </p>
                  </div>
                </div>

                {/* How it works - Flowchart Edition */}
                <div className="how-section">
                  <p className="section-label">How it works</p>
                  
                  <div className="how-flowchart">
                    {/* Node 1 */}
                    <div className="flow-node">
                      <div className="flow-icon">01</div>
                      <h4 className="flow-title">Submit a URL</h4>
                      <p className="flow-desc">
                        Paste any product URL into the Workspace. The agent immediately begins staging its autonomous interaction runtime.
                      </p>
                    </div>

                    {/* Arrow 1 */}
                    <div className="flow-connector">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-7-7 7 7-7 7"/>
                      </svg>
                    </div>

                    {/* Node 2 */}
                    <div className="flow-node">
                      <div className="flow-icon">02</div>
                      <h4 className="flow-title">Agent simulates</h4>
                      <p className="flow-desc">
                        FlowSense traverses real user paths, navigating, clicking, and scoring friction across the full journey in under 60 seconds.
                      </p>
                    </div>

                    {/* Arrow 2 */}
                    <div className="flow-connector">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-7-7 7 7-7 7"/>
                      </svg>
                    </div>

                    {/* Node 3 */}
                    <div className="flow-node">
                      <div className="flow-icon">03</div>
                      <h4 className="flow-title">Ship the fix</h4>
                      <p className="flow-desc">
                        Copy implementation-ready prompts directly into Cursor, Linear, or your PR description. No translation required.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Terminal Preview */}
                <div className="terminal-section">
                  <div className="terminal-header">
                    <span className="terminal-dot red" />
                    <span className="terminal-dot yellow" />
                    <span className="terminal-dot green" />
                    <span className="terminal-label">flowsense agent - live session</span>
                  </div>

                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="cmd">Launching autonomous UX agent...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="out">[ok] Session initialized | device context loaded</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="info">Scanning homepage hierarchy...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="cmd">Identifying primary CTA candidates...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="warn">[warn] Navigation priority dilution detected</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="info">Traversing discovery to conversion journey...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="out">[ok] 5 screens explored | 8 frictions captured | 87% confidence</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="out">[ok] Report ready | 3 high-priority fixes | PDF / JSON / TXT</span></div>

                  <div className="provider-status-row">
                    <div className="provider-chip">
                      <span className={`led ${providers.nvidia ? "on" : ""}`} />
                      NVIDIA {providers.nvidia ? "connected" : "offline"}
                    </div>
                    <div className="provider-chip">
                      <span className={`led ${providers.groq ? "on" : ""}`} />
                      Groq {providers.groq ? "connected" : "offline"}
                    </div>
                    <div className="provider-chip">
                      <span className="led on" />
                      Heuristic fallback active
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <p className="section-label">Built for every team</p>
                <div className="usecases-grid">
                  <div className="usecase-card">
                    <span className="usecase-badge">Product</span>
                    <div className="usecase-title">Pre-launch audits</div>
                    <p className="usecase-desc">
                      Run a full UX audit before every release to catch conversion killers
                      before real users do. Plug into your CI pipeline via webhook.
                    </p>
                  </div>
                  <div className="usecase-card">
                    <span className="usecase-badge">Design</span>
                    <div className="usecase-title">Friction benchmarking</div>
                    <p className="usecase-desc">
                      Compare two designs or URLs side-by-side to objectively measure which
                      experience reduces friction and wins on UX score.
                    </p>
                  </div>
                  <div className="usecase-card">
                    <span className="usecase-badge">Engineering</span>
                    <div className="usecase-title">Implementation prompts</div>
                    <p className="usecase-desc">
                      Every finding ships with a copy-ready implementation prompt sized for
                      Cursor, v0, or a PR description. Zero translation from insight to fix.
                    </p>
                  </div>
                  <div className="usecase-card">
                    <span className="usecase-badge">Growth</span>
                    <div className="usecase-title">Continuous monitoring</div>
                    <p className="usecase-desc">
                      Automate UX health checks after every deployment using the
                      <code style={{ marginLeft: 4 }}>/api/hooks/deployment</code> endpoint.
                    </p>
                  </div>
                </div>

                {/* CTA Banner */}
                <div className="cta-banner">
                  <h2>Ready to reduce friction?</h2>
                  <p>
                    Paste a URL, let the agent run, and walk away with a prioritized fix list
                    in under 60 seconds. No setup required.
                  </p>
                  <NavLink to="/workspace" className="btn-primary-light">
                    Open workspace 
                  </NavLink>
                </div>

              </section>
            </div>
          }
        />

        {/* WORKSPACE */}
        <Route
          path="/workspace/*"
          element={
            authResolved && !currentUser ? (
              <Navigate to="/" replace />
            ) : !authResolved ? (
              <section className="page" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
                <p>Loading workspace...</p>
              </section>
            ) : (
              <WorkspacePage
                url={url}
                onUrlChange={setUrl}
                onAnalyze={handleAnalyze}
                loading={loading}
                history={history}
                onLoadHistory={(entry: AnalysisReport) => {
                  setReport(entry);
                  setUrl(entry.url);
                }}
                compareEnabled={compareEnabled}
                onToggleCompare={() => setCompareEnabled((prev) => !prev)}
                leftUrl={leftUrl}
                rightUrl={rightUrl}
                onLeftChange={setLeftUrl}
                onRightChange={setRightUrl}
                onCompare={handleCompare}
                compareResult={compareResult}
                logs={logs}
                stageIndex={stageIndex}
                counters={counters}
                report={report}
                currentSummary={currentSummary}
                reportCount={history.length}
                userEmail={currentUser?.email || undefined}
                onSignOut={() => void handleSignOut()}
                onOpenAuth={() => setAuthModalOpen(true)}
                logoSrc={logoSrc}
                onCopySummary={() => navigator.clipboard.writeText(currentSummary)}
                onExportText={() => downloadFile(`flowsense-${Date.now()}.txt`, currentSummary, "text/plain")}
                onExportPdf={() => report && exportPdf(report)}
                onExportJson={() =>
                  report && downloadFile(`flowsense-${Date.now()}.json`, JSON.stringify(report, null, 2), "application/json")
                }
                onCopyFixPrompt={(prompt: string) => navigator.clipboard.writeText(prompt)}
                providerStatus={providers}
                automation={automation}
                profile={profile}
                onProfileChange={setProfile}
                onSaveProfile={handleSaveProfile}
                profileSaving={profileSaving}
                userDisplayName={profile.displayName || currentUser?.displayName || currentUser?.email || undefined}
                userPhotoURL={profile.photoURL || userAvatarUrl}
              />
            )
          }
        />

        <Route
          path="/auth"
          element={
            <Navigate to="/" replace />
          }
        />

        {/* DOCS */}
        <Route
          path="/about"
          element={
            <section className="page about-page">
              <h2>About FlowSense.ai</h2>
              <div className="about-copy">
              <p>
                FlowSense.ai is an autonomous UX analysis platform built to help product teams
                evaluate real user journeys, detect interaction friction before launch, and ship
                confident improvements at every release cycle.
              </p>
              <p>
                It combines staged autonomous simulation, heuristic scoring, optional multi-model
                AI reasoning, and structured report automation so teams can continuously audit
                experience quality without manual review.
              </p>
              <p>
                Every finding is paired with an implementation-ready prompt. The gap between
                insight and fix is zero.
              </p>
              <p className="built-by">Built by Hardik Gupta &middot; 2026</p>
              </div>
            </section>
          }
        />
      </Routes>

      {!isWorkspaceRoute && (
        <footer className="site-footer">
          <div>
            <strong>FlowSense.ai</strong>
            <p>Autonomous UX analysis for product teams. Evaluate journeys, surface friction, and ship better fixes.</p>
          </div>
          <div>
            <strong>Navigate</strong>
            <div className="footer-links">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/workspace">Workspace</NavLink>
              <NavLink to="/about">About</NavLink>
            </div>
          </div>
          <div>
            <strong>Built by</strong>
            <p>Hardik Gupta<br />&copy; 2026 FlowSense.ai</p>
          </div>
        </footer>
      )}

      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        email={authEmail}
        password={authPassword}
        loading={authLoading}
        error={authError}
        enabled={firebaseReady && hasFirebaseConfig}
        configLoaded={configLoaded}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthError("");
        }}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleEmailAuth}
        onGoogle={handleGoogleAuth}
      />

      <OnboardingModal
        isOpen={onboardingOpen}
        profile={profile}
        loading={profileSaving}
        error={authError}
        enabled
        onClose={() => setOnboardingOpen(false)}
        onProfileChange={setProfile}
        onSubmit={handleSaveProfile}
      />
    </main>
  );
}