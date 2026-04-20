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
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --pastel-mint: #d2e8d9;
    --pastel-sky: #d5e6f3;
    --pastel-gold: #f6e8c4;
    --bg: #f8fbfb;
    --surface: #ffffff;
    --surface-2: #f4f8f6;
    --surface-3: #fcf9ee;
    --border: rgba(48, 94, 100, 0.06);
    --border-strong: rgba(48, 94, 100, 0.12);
    --text-primary: #24353a;
    --text-secondary: #55686d;
    --text-muted: #7d9195;
    --accent: #3a6d74;
    --accent-strong: #2a5257;
    --accent-green: #90b89d;
    --accent-green-bg: var(--pastel-mint);
    --accent-amber: #c49d47;
    --accent-amber-bg: var(--pastel-gold);
    --accent-red: #e08b8b;
    --accent-red-bg: #fcebeb;
    --accent-blue: #84a9c4;
    --accent-blue-bg: var(--pastel-sky);
    
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 18px;
    --radius-xl: 24px;
    
    --nav-height: 64px;
    --nav-height-compact: 52px;
    
    --shadow-card: 0 8px 24px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.01);
    --shadow-nav: 0 4px 24px rgba(0,0,0,0.03);
    --shadow-nav-compact: 0 10px 32px rgba(0,0,0,0.04);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    background:
      radial-gradient(circle at top left, rgba(210, 232, 217, 0.4), transparent 28%),
      radial-gradient(circle at top right, rgba(213, 230, 243, 0.35), transparent 30%),
      linear-gradient(180deg, #fdfefe 0%, var(--bg) 100%);
    color: var(--text-primary);
    font-size: 14px;
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
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(213, 230, 243, 0.6);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-nav);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px 0 24px;
    z-index: 1000;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Compact state triggered by scroll */
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
   background: linear-gradient(135deg, #111111 0%, #1e5c47 50%, #25784c 100%);
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
    gap: 2px;
    list-style: none;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .nav-links a {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
    letter-spacing: -0.1px;
  }

  .nav-links a:hover {
    color: var(--text-primary);
    background: rgba(213, 230, 243, 0.4);
  }

  .nav-links a.active {
    color: var(--text-primary);
    background: rgba(210, 232, 217, 0.4);
  }

  .nav-icon {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .nav-actions button {
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    padding: 7px 18px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: -0.1px;
    box-shadow: 0 8px 16px rgba(58, 109, 116, 0.12);
  }

  .nav-actions button:hover {
    background: rgba(255, 255, 255, 0.8);
    color: var(--accent-strong);
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
    padding-top: calc(var(--nav-height) + 72px);
  }

  .hero-section {
    max-width: 1060px;
    margin: 0 auto;
    padding: 0 24px 56px;
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(213, 230, 243, 0.4), rgba(255, 255, 255, 0.9));
    border: 1px solid rgba(246, 232, 196, 0.9);
    border-radius: var(--radius-md);
    padding: 5px 12px 5px 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
    margin-bottom: 20px;
  }

  .hero-eyebrow .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-green);
    animation: pulse-dot 2s infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .hero-headline {
    font-family: var(--font-display);
    font-size: clamp(28px, 4vw, 48px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -1.2px;
    color: var(--text-primary);
    max-width: 720px;
    margin-bottom: 16px;
  }

  .hero-headline em {
    font-style: normal;
    color: var(--text-muted);
  }

  .hero-subtext {
    font-size: 15px;
    font-weight: 400;
    color: var(--text-secondary);
    max-width: 520px;
    line-height: 1.6;
    margin-bottom: 32px;
  }

  .hero-cta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 56px;
  }

  .btn-primary {
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 500;
    padding: 12px 24px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    background: rgba(255, 255, 255, 0.8);
    color: var(--accent-strong);
  }

  .btn-ghost {
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 500;
    padding: 12px 22px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-ghost:hover {
    background: rgba(210, 232, 217, 0.25);
    color: var(--text-primary);
  }

  /* Stats Row */
  .stats-row {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, rgba(210, 232, 217, 0.3), rgba(255, 255, 255, 0.96));
    overflow: hidden;
    margin-bottom: 56px;
  }

  .stat-item {
    flex: 1;
    padding: 20px;
    border-right: 1px solid var(--border);
  }

  .stat-item:last-child {
    border-right: none;
  }
    color: var(--accent-green);
  .stat-item:nth-child(1) { background: rgba(210, 232, 217, 0.35); }
  .stat-item:nth-child(2) { background: rgba(213, 230, 243, 0.35); }
  .stat-item:nth-child(3) { background: rgba(246, 232, 196, 0.3); }
  .stat-item:nth-child(4) { background: rgba(210, 232, 217, 0.2); }

    text-decoration: underline;
    text-underline-offset: 2px;
  .stat-value {
    font-family: var(--font-display);
    font-size: 28px;
    color: var(--accent-strong);
    letter-spacing: -1.2px;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 12px;

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    margin-top: 10px;
  }

  .footer-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 600;
    padding: 2px 0;
  }

  .footer-links a:hover {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
    color: var(--text-muted);
    font-weight: 400;
  }

  /* Feature Cards */
  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 56px;
  }

  .feature-card {
    background: rgba(255, 255, 255, 0.98);
    padding: 24px 20px;
    transition: background 0.2s ease;
  }

  .feature-card:hover {
    background: rgba(213, 230, 243, 0.25);
  }

  .feature-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: rgba(213, 230, 243, 0.3);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .feature-icon-wrap svg {
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
  }

  .feature-title {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
    letter-spacing: -0.2px;
  }

  .feature-desc {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  /* How it works - Proper Flowchart Edition */
  .how-section {
    margin-bottom: 64px;
  }

  .how-flowchart {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    background: rgba(213, 230, 243, 0.2);
    border: 1px solid var(--border-strong);
    border-radius: 32px;
  }

  .flow-node {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 24px;
    padding: 32px 24px;
    text-align: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.02);
    transition: box-shadow 0.2s ease;
  }
  
  .flow-node:hover {
    box-shadow: 0 8px 24px rgba(58, 109, 116, 0.08);
  }

  .flow-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 20px;
    border-radius: 14px;
    background: var(--accent-green-bg);
    color: var(--accent-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 800;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 12px rgba(144, 184, 157, 0.25);
  }

  .flow-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.2px;
  }

  .flow-desc {
    font-size: 13px;
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    z-index: 2;
  }

  .flow-connector svg {
    width: 18px;
    height: 18px;
  }

  /* Terminal preview */
  .terminal-section {
    background: linear-gradient(180deg, #33595e 0%, #28474c 100%);
    border-radius: var(--radius-xl);
    padding: 28px 32px;
    margin-bottom: 56px;
    overflow: hidden;
    position: relative;
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .terminal-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .terminal-dot.red { background: var(--accent-red); }
  .terminal-dot.yellow { background: var(--accent-amber); }
  .terminal-dot.green { background: var(--accent-green); }

  .terminal-label {
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    margin-left: 8px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    letter-spacing: 0.05em;
  }

  .terminal-line {
    font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.8;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .terminal-line .prompt { color: rgba(255,255,255,0.25); }
  .terminal-line .cmd { color: rgba(255,255,255,0.9); }
  .terminal-line .out { color: var(--accent-green); }
  .terminal-line .info { color: var(--accent-blue); }
  .terminal-line .warn { color: var(--accent-amber); }
  .terminal-line .muted { color: rgba(255,255,255,0.3); }

  .provider-status-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .provider-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255,255,255,0.6);
  }

  .provider-chip .led {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
  }

  .provider-chip .led.on { background: var(--accent-green); }

  /* Use cases */
  .usecases-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 56px;
  }

  .usecase-card {
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px 20px;
    overflow: hidden;
    transition: box-shadow 0.2s ease;
  }

  .usecase-card:hover {
    box-shadow: var(--shadow-card);
  }

  .usecase-badge {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 8px;
    background: rgba(246, 232, 196, 0.35);
    color: var(--text-muted);
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .usecase-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.4px;
    margin-bottom: 6px;
  }

  .usecase-desc {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  .cta-banner {
    background: linear-gradient(135deg, rgba(213, 230, 243, 0.3), rgba(255, 255, 255, 0.95));
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 40px;
    text-align: center;
    margin-bottom: 56px;
  }

  .cta-banner h2 {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.8px;
    margin-bottom: 12px;
  }

  .cta-banner p {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 24px;
    max-width: 440px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .btn-primary-light {
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 500;
    padding: 12px 24px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-primary-light:hover {
    background: rgba(255, 255, 255, 0.8);
    color: var(--accent-strong);
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
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.8px;
    margin-bottom: 24px;
    color: var(--text-primary);
  }

  .about-page p {
    font-size: 15px;
    color: var(--text-secondary);
    font-weight: 400;
    line-height: 1.7;
    margin-bottom: 18px;
  }

  .about-copy {
    display: grid;
    gap: 0;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 28px;
    box-shadow: var(--shadow-card);
  }

  .built-by {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    margin-top: 40px;
  }

  /* Footer */
  .site-footer {
    background: linear-gradient(180deg, rgba(213, 230, 243, 0.15), rgba(248, 251, 251, 0.94));
    border-top: 1px solid var(--border-strong);
    padding: 40px 40px 32px;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 40px;
    max-width: 1140px;
    margin: 0 auto;
    width: 100%;
  }

  .site-footer strong {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    display: block;
    margin-bottom: 6px;
  }

  .site-footer p {
    font-size: 12.5px;
    color: var(--text-muted);
    line-height: 1.6;
    font-weight: 400;
  }

  /* Auth Modal */
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
  }

  .auth-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 36px 32px;
    width: 100%;
    max-width: 380px;
    position: relative;
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .auth-card h3 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.4px;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .auth-card > p {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 400;
    margin-bottom: 6px;
  }

  .auth-logo {
    width: 32px;
    height: 32px;
  }

  .auth-card input {
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: rgba(213, 230, 243, 0.15);
    font-family: var(--font-body);
    font-size: 13.5px;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s ease;
  }

  .auth-card input:focus {
    border-color: var(--accent);
  }

  .auth-card button {
    width: 100%;
    padding: 10px 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .auth-card button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-card button:hover:not(:disabled) { 
    background: rgba(255, 255, 255, 0.8);
    color: var(--accent-strong);
  }

  .auth-card button.ghost {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
  }

  .auth-card button.text-btn {
    background: transparent;
    color: var(--text-muted);
    border: none;
    font-size: 12.5px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
    padding: 16px;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 32px;
    width: 100%;
    max-width: 420px;
    position: relative;
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .modal-card--auth {
    max-width: 460px;
    gap: 16px;
    padding: 28px;
  }

  .modal-card--wide {
    max-width: 680px;
  }

  .modal-auth-head {
    display: grid;
    gap: 8px;
    padding-right: 40px;
  }

  .modal-auth-badge {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(213, 230, 243, 0.3);
    border: 1px solid var(--border);
  }

  .modal-auth-badge svg {
    width: 20px;
    height: 20px;
  }

  .modal-copy {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    background: rgba(213, 230, 243, 0.3) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border) !important;
    width: auto !important;
    padding: 5px 12px !important;
    font-size: 11px !important;
    border-radius: var(--radius-sm) !important;
  }

  .google-auth-button,
  .modal-primary-button {
    width: 100%;
    min-height: 44px;
    border-radius: 12px;
    padding: 10px 14px;
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .google-auth-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #ffffff;
    color: #24353a;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }

  .google-auth-button:hover:not(:disabled) {
    background: #f8fafd;
  }

  .google-auth-button:disabled,
  .modal-primary-button:disabled,
  .modal-actions .secondary:disabled,
  .text-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .google-auth-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .google-auth-icon svg {
    width: 18px;
    height: 18px;
  }

  .modal-divider {
    position: relative;
    text-align: center;
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .modal-divider::before {
    content: "";
    position: absolute;
    inset: 50% 0 auto;
    height: 1px;
    background: var(--border);
  }

  .modal-divider span {
    position: relative;
    padding: 0 10px;
    background: var(--surface);
  }

  .field-stack {
    display: grid;
    gap: 10px;
  }

  .field-stack label {
    display: grid;
    gap: 4px;
    font-size: 12.5px;
    color: var(--text-primary);
    font-weight: 600;
  }

  .field-stack input,
  .field-stack textarea {
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: rgba(213, 230, 243, 0.15);
    font-family: var(--font-body);
    font-size: 13.5px;
    color: var(--text-primary);
    outline: none;
    resize: vertical;
  }

  .field-stack input:focus,
  .field-stack textarea:focus {
    border-color: var(--accent);
  }

  .onboarding-steps {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .onboarding-steps span {
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 5px 8px;
    font-size: 10.5px;
    color: var(--text-muted);
  }

  .onboarding-steps span.active {
    background: var(--accent-green-bg);
    color: var(--text-primary);
    border-color: rgba(48, 94, 100, 0.1);
    font-weight: 700;
  }

  .inline-warning {
    font-size: 11.5px;
    color: var(--accent-red);
    background: var(--accent-red-bg);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
  }

  .modal-actions {
    display: grid;
    gap: 8px;
  }

  .modal-primary-button {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    box-shadow: 0 8px 20px rgba(58, 109, 116, 0.12);
  }

  .modal-primary-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.8);
    color: var(--accent-strong);
  }

  .modal-actions .secondary {
    border: 1px solid var(--border-strong);
    background: rgba(213, 230, 243, 0.2);
    color: var(--text-primary);
  }

  .modal-actions .secondary:hover:not(:disabled) {
    background: rgba(210, 232, 217, 0.25);
  }

  .text-button {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 12.5px;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
    align-self: center;
  }

  .text-button:hover {
    color: var(--accent);
  }

  .close-auth {
    position: absolute;
    top: 14px;
    right: 14px;
    background: rgba(213, 230, 243, 0.3) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border) !important;
    width: auto !important;
    padding: 5px 12px !important;
    font-size: 11px !important;
    border-radius: var(--radius-sm) !important;
  }

  .warning-copy {
    font-size: 11.5px;
    color: var(--accent-red);
    background: var(--accent-red-bg);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
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

  // Scroll listener for compact navbar
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    requestConfig()
      .then((config) => {
        setProviders(config.providers);
        setFirebaseReady(configureFirebase(config.firebaseWebConfig));
        setConfigLoaded(true);
      })
      .catch(() => {
        setProviders(DEFAULT_PROVIDER_STATUS);
        setFirebaseReady(false);
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
                        FlowSense traverses real user paths - navigating, clicking, and scoring friction across the full journey in under 60 seconds.
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
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="out">[ok] Session initialized - device context loaded</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="info">Scanning homepage hierarchy...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="cmd">Identifying primary CTA candidates...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="warn">[warn] Navigation priority dilution detected</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="info">Traversing discovery -&gt; conversion journey...</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="out">[ok] 5 screens explored | 8 frictions captured | 87% confidence</span></div>
                  <div className="terminal-line"><span className="prompt">&gt;</span><span className="out">[ok] Report ready - 3 high-priority fixes | PDF / JSON / TXT</span></div>

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
                      Cursor, v0, or a PR description. Zero-translation from insight to fix.
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
                AI reasoning, and structured report automation - so teams can continuously audit
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
            <strong style={{ fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500 }}>Navigate</strong>
            <div className="footer-links">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/workspace">Workspace</NavLink>
              <NavLink to="/about">About</NavLink>
            </div>
          </div>
          <div>
            <strong style={{ fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500 }}>Built by</strong>
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