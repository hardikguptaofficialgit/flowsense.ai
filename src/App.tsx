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
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Interfaces, Misc } from "doodle-icons";
import { requestAnalysis, requestComparison, requestConfig } from "./api";
import { auth, db, googleProvider, hasFirebaseConfig } from "./lib/firebase";
import logoSrc from "./assets/flowsense.png";
import { WorkspacePage } from "./components/Panels";
import { AuthModal, OnboardingModal } from "./components/AuthModal";
import type { AnalysisReport, CompareResponse, ExecutionStage, ProviderStatus, WorkspaceProfile } from "./types";
import { getDiceBearAvatarUrl } from "./utils/avatar";

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

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Inline styles Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --pastel-mint: #B8DDC2;
    --pastel-sky: #BAD8EC;
    --pastel-gold: #F2D48A;
    --bg: #f5faf8;
    --surface: #fffdfa;
    --surface-2: #eef5f1;
    --surface-3: #fbf3d7;
    --border: rgba(48, 94, 100, 0.10);
    --border-strong: rgba(48, 94, 100, 0.18);
    --text-primary: #24353a;
    --text-secondary: #55686d;
    --text-muted: #7d9195;
    --accent: #305e64;
    --accent-strong: #244b50;
    --accent-green: #84ad90;
    --accent-green-bg: var(--pastel-mint);
    --accent-amber: #b89139;
    --accent-amber-bg: var(--pastel-gold);
    --accent-red: #d97d7d;
    --accent-red-bg: #f8e1dd;
    --accent-blue: #7099b4;
    --accent-blue-bg: var(--pastel-sky);
    
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --radius-sm: 12px;
    --radius-md: 16px;
    --radius-lg: 20px;
    --radius-xl: 28px;
    
    --nav-height: 72px;
    --nav-height-compact: 56px;
    
    --shadow-card: 0 8px 30px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.01);
    --shadow-nav: 0 4px 30px rgba(0,0,0,0.04);
    --shadow-nav-compact: 0 10px 40px rgba(0,0,0,0.06);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    background:
      radial-gradient(circle at top left, rgba(184, 221, 194, 0.34), transparent 28%),
      radial-gradient(circle at top right, rgba(186, 216, 236, 0.30), transparent 30%),
      linear-gradient(180deg, #fbfdfc 0%, var(--bg) 100%);
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Floating Nav Ã¢â€â‚¬Ã¢â€â‚¬ */
  .floating-nav {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 32px);
    max-width: 1100px;
    height: var(--nav-height);
    background: rgba(255,253,250,0.88);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(186, 216, 236, 0.8);
    border-radius: 20px;
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
    max-width: 800px;
    padding: 0 12px 0 20px;
    background: rgba(255,253,250,0.96);
    box-shadow: var(--shadow-nav-compact);
    border-color: var(--border-strong);
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .brand-logo {
    width: 50px;
    height: 52px;
  }
  
  .floating-nav.scrolled .brand-logo {
    width: 26px;
    height: 26px;
  }

  .brand-row .brand-name {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    line-height: 1;
    transition: font-size 0.3s ease;
  }
  
  .floating-nav.scrolled .brand-name {
    font-size: 14.5px;
  }

  .brand-row .brand-tagline {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
    margin-top: 2px;
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
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
    letter-spacing: -0.1px;
  }

  .nav-links a:hover {
    color: var(--text-primary);
    background: rgba(186, 216, 236, 0.34);
  }

  .nav-links a.active {
    color: var(--text-primary);
    background: rgba(184, 221, 194, 0.35);
  }

  .nav-icon {
    width: 15px;
    height: 15px;
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
    font-size: 13.5px;
    font-weight: 500;
    padding: 8px 20px;
    border-radius: var(--radius-md);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: -0.1px;
    box-shadow: 0 10px 24px rgba(48, 94, 100, 0.16);
  }

  .nav-actions button:hover {
    background: rgba(255, 253, 250, 0.72);
    color: var(--accent-strong);
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Page shell Ã¢â€â‚¬Ã¢â€â‚¬ */
  .site-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .page {
    padding-top: calc(var(--nav-height) + 76px);
    flex: 1;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Landing Hero Ã¢â€â‚¬Ã¢â€â‚¬ */
  .landing-page {
    padding-top: calc(var(--nav-height) + 88px);
  }

  .hero-section {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 32px 64px;
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(186, 216, 236, 0.34), rgba(255, 253, 250, 0.9));
    border: 1px solid rgba(242, 212, 138, 0.85);
    border-radius: var(--radius-md);
    padding: 6px 14px 6px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
    margin-bottom: 24px;
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
    font-size: clamp(32px, 4.5vw, 56px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -1.5px;
    color: var(--text-primary);
    max-width: 760px;
    margin-bottom: 20px;
  }

  .hero-headline em {
    font-style: normal;
    color: var(--text-muted);
  }

  .hero-subtext {
    font-size: 16px;
    font-weight: 400;
    color: var(--text-secondary);
    max-width: 560px;
    line-height: 1.6;
    margin-bottom: 36px;
  }

  .hero-cta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 64px;
  }

  .btn-primary {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    padding: 13px 28px;
    border-radius: var(--radius-md);
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
    background: rgba(255, 253, 250, 0.72);
    color: var(--accent-strong);
  }

  .btn-ghost {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    padding: 13px 24px;
    border-radius: var(--radius-md);
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
    background: rgba(184, 221, 194, 0.18);
    color: var(--text-primary);
    border-color: var(--accent);
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Stats Row Ã¢â€â‚¬Ã¢â€â‚¬ */
  .stats-row {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, rgba(184, 221, 194, 0.24), rgba(255, 253, 250, 0.96));
    overflow: hidden;
    margin-bottom: 64px;
  }

  .stat-item {
    flex: 1;
    padding: 24px;
    border-right: 1px solid var(--border);
  }

  .stat-item:last-child {
    border-right: none;
  }

  .stat-item:nth-child(1) { background: rgba(184, 221, 194, 0.28); }
  .stat-item:nth-child(2) { background: rgba(186, 216, 236, 0.30); }
  .stat-item:nth-child(3) { background: rgba(242, 212, 138, 0.26); }
  .stat-item:nth-child(4) { background: rgba(184, 221, 194, 0.14); }

  .stat-value {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1.5px;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 400;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Feature Cards Ã¢â€â‚¬Ã¢â€â‚¬ */
  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 20px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 64px;
  }

  .feature-card {
    background: rgba(255, 253, 250, 0.96);
    padding: 28px 24px;
    transition: background 0.2s ease;
  }

  .feature-card:hover {
    background: rgba(186, 216, 236, 0.20);
  }

  .feature-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    background: rgba(186, 216, 236, 0.22);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .feature-icon-wrap svg {
    width: 18px;
    height: 18px;
    color: var(--text-secondary);
  }

  .feature-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.3px;
  }

  .feature-desc {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ How it works Ã¢â€â‚¬Ã¢â€â‚¬ */
  .how-section {
    margin-bottom: 64px;
  }

  .how-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .how-step {
    background: rgba(255, 253, 250, 0.96);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 28px 24px;
    position: relative;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  
  .how-step:hover {
    box-shadow: var(--shadow-card);
    border-color: var(--text-primary);
  }

  .step-number {
    font-family: var(--font-display);
    font-size: 44px;
    font-weight: 800;
    color: rgba(48, 94, 100, 0.16);
    line-height: 1;
    margin-bottom: 16px;
    letter-spacing: -2px;
    user-select: none;
  }

  .step-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.4px;
  }

  .step-desc {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Terminal preview Ã¢â€â‚¬Ã¢â€â‚¬ */
  .terminal-section {
    background: linear-gradient(180deg, #2d5055 0%, #243f44 100%);
    border-radius: var(--radius-xl);
    padding: 32px 36px;
    margin-bottom: 64px;
    overflow: hidden;
    position: relative;
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
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
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .provider-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255,255,255,0.5);
  }

  .provider-chip .led {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
  }

  .provider-chip .led.on { background: var(--accent-green); }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Use cases Ã¢â€â‚¬Ã¢â€â‚¬ */
  .usecases-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 64px;
  }

  .usecase-card {
    background: rgba(255, 253, 250, 0.96);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 28px 24px;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .usecase-card:hover {
    box-shadow: var(--shadow-card);
    border-color: var(--text-primary);
  }

  .usecase-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: rgba(242, 212, 138, 0.24);
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .usecase-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }

  .usecase-desc {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ CTA Banner Ã¢â€â‚¬Ã¢â€â‚¬ */
  .cta-banner {
    background: linear-gradient(135deg, rgba(186, 216, 236, 0.26), rgba(255, 253, 250, 0.95));
    border-radius: var(--radius-xl);
    padding: 48px;
    text-align: center;
    margin-bottom: 64px;
    border: 1px solid var(--border-strong);
  }

  .cta-banner h2 {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -1px;
    margin-bottom: 12px;
  }

  .cta-banner p {
    font-size: 14.5px;
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 32px;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .btn-primary-light {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    padding: 13px 28px;
    border-radius: var(--radius-md);
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
    background: rgba(255, 253, 250, 0.72);
    color: var(--accent-strong);
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Workspace Page Ã¢â€â‚¬Ã¢â€â‚¬ */
  .workspace-shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 32px 80px;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ About Page Ã¢â€â‚¬Ã¢â€â‚¬ */
  .about-page {
    max-width: 820px;
    margin: 0 auto;
    padding-left: 32px;
    padding-right: 32px;
    padding-bottom: 80px;
  }

  .about-page h2 {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 32px;
    color: var(--text-primary);
  }

  .about-page p {
    font-size: 16px;
    color: var(--text-secondary);
    font-weight: 400;
    line-height: 1.75;
    margin-bottom: 20px;
  }

  .about-copy {
    display: grid;
    gap: 0;
    background: rgba(255, 253, 250, 0.96);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 32px;
    box-shadow: var(--shadow-card);
  }

  .built-by {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-muted);
    margin-top: 48px;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Footer Ã¢â€â‚¬Ã¢â€â‚¬ */
  .site-footer {
    background: linear-gradient(180deg, rgba(186, 216, 236, 0.16), rgba(245, 250, 248, 0.94));
    border-top: 1px solid var(--border-strong);
    padding: 48px 48px 40px;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 48px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .site-footer strong {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    display: block;
    margin-bottom: 8px;
  }

  .site-footer p {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.7;
    font-weight: 400;
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Auth Modal Ã¢â€â‚¬Ã¢â€â‚¬ */
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
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
    padding: 44px 40px;
    width: 100%;
    max-width: 400px;
    position: relative;
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .auth-card h3 {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .auth-card > p {
    font-size: 13.5px;
    color: var(--text-muted);
    font-weight: 400;
    margin-bottom: 8px;
  }

  .auth-logo {
    width: 36px;
    height: 36px;
  }

  .auth-card input {
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: rgba(186, 216, 236, 0.14);
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s ease;
  }

  .auth-card input:focus {
    border-color: var(--accent);
  }

  .auth-card button {
    width: 100%;
    padding: 12px 20px;
    border-radius: var(--radius-md);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .auth-card button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-card button:hover:not(:disabled) { 
    background: rgba(255, 253, 250, 0.72);
    color: var(--accent-strong);
  }

  .auth-card button.ghost {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
  }
  
  .auth-card button.ghost:hover {
    border-color: var(--accent);
  }

  .auth-card button.text-btn {
    background: transparent;
    color: var(--text-muted);
    border: none;
    font-size: 13px;
  }
  
  .auth-card button.text-btn:hover {
    color: var(--text-primary);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
    padding: 20px;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 40px;
    width: 100%;
    max-width: 440px;
    position: relative;
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-card--auth {
    max-width: 480px;
    gap: 18px;
    padding: 32px;
  }

  .modal-card--wide {
    max-width: 720px;
  }

  .modal-auth-head {
    display: grid;
    gap: 10px;
    padding-right: 48px;
  }

  .modal-auth-badge {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: rgba(186, 216, 236, 0.24);
    border: 1px solid var(--border);
  }

  .modal-auth-badge svg {
    width: 22px;
    height: 22px;
  }

  .modal-copy {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.65;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(186, 216, 236, 0.24) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border) !important;
    width: auto !important;
    padding: 6px 14px !important;
    font-size: 12px !important;
    border-radius: var(--radius-md) !important;
  }

  .google-auth-button,
  .modal-primary-button {
    width: 100%;
    min-height: 48px;
    border-radius: 14px;
    padding: 12px 16px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .google-auth-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #ffffff;
    color: #24353a;
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .google-auth-button:hover:not(:disabled) {
    background: #f8fbff;
    border-color: rgba(66, 133, 244, 0.28);
  }

  .google-auth-button:disabled,
  .modal-primary-button:disabled,
  .modal-actions .secondary:disabled,
  .text-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .google-auth-icon {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .google-auth-icon svg {
    width: 20px;
    height: 20px;
  }

  .modal-divider {
    position: relative;
    text-align: center;
    font-size: 12px;
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
    padding: 0 12px;
    background: var(--surface);
  }

  .field-stack {
    display: grid;
    gap: 12px;
  }

  .field-stack label {
    display: grid;
    gap: 6px;
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 600;
  }

  .field-stack input,
  .field-stack textarea {
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: rgba(186, 216, 236, 0.14);
    font-family: var(--font-body);
    font-size: 14px;
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
    gap: 8px;
    flex-wrap: wrap;
  }

  .onboarding-steps span {
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 6px 10px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .onboarding-steps span.active {
    background: var(--accent-green-bg);
    color: var(--text-primary);
    border-color: rgba(48, 94, 100, 0.12);
    font-weight: 700;
  }

  .inline-warning {
    font-size: 12px;
    color: var(--accent-red);
    background: var(--accent-red-bg);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
  }

  .modal-actions {
    display: grid;
    gap: 10px;
  }

  .modal-primary-button {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    box-shadow: 0 10px 24px rgba(48, 94, 100, 0.16);
  }

  .modal-primary-button:hover:not(:disabled) {
    background: rgba(255, 253, 250, 0.72);
    color: var(--accent-strong);
  }

  .modal-actions .secondary {
    border: 1px solid var(--border-strong);
    background: rgba(186, 216, 236, 0.16);
    color: var(--text-primary);
  }

  .modal-actions .secondary:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(184, 221, 194, 0.20);
  }

  .text-button {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
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
    top: 16px;
    right: 16px;
    background: rgba(186, 216, 236, 0.24) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border) !important;
    width: auto !important;
    padding: 6px 14px !important;
    font-size: 12px !important;
    border-radius: var(--radius-md) !important;
  }

  .warning-copy {
    font-size: 12px;
    color: var(--accent-red);
    background: var(--accent-red-bg);
    padding: 10px 14px;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const userAvatarSeed = currentUser?.uid || currentUser?.email || profile.displayName || profile.email || "flowsense";
  const userAvatarUrl = useMemo(() => getDiceBearAvatarUrl(userAvatarSeed), [userAvatarSeed]);

  const timersRef = useRef<number[]>([]);

  const pushHistory = async (nextReport: AnalysisReport, execution?: { stages: ExecutionStage[]; timeline: AnalysisReport["journey"] }) => {
    setHistory((prev) => [nextReport, ...prev.filter((item) => item.id !== nextReport.id)].slice(0, 12));

    if (!db || !currentUser) return;
    const ref = doc(db, "users", currentUser.uid, "analyses", nextReport.id);
    await setDoc(ref, {
      ...nextReport,
      agentName: profile.agentName || "FlowSense",
      agentMode: profile.agentMode || nextReport.engineMode,
      agentNotes: profile.agentNotes || "",
      execution: execution || null,
      createdAt: serverTimestamp(),
    });
  };

  const loadProfile = async (user: User) => {
    if (!db) {
      setProfile({
        ...DEFAULT_PROFILE,
        displayName: user.displayName || "",
        email: user.email || undefined,
        photoURL: getDiceBearAvatarUrl(user.uid || user.email || user.displayName || "flowsense"),
      });
      return;
    }

    const profileRef = doc(db, "users", user.uid, "profile", "main");
    const snap = await getDoc(profileRef);
    const data = snap.exists() ? snap.data() : {};
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
      photoURL: getDiceBearAvatarUrl(user.uid || user.email || user.displayName || data.displayName || "flowsense"),
    });
    const needsOnboarding = !data?.profileComplete;
    setOnboardingOpen(needsOnboarding || authJustSignedUp);
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
      .then((config) => setProviders(config.providers))
      .catch(() => setProviders(DEFAULT_PROVIDER_STATUS));
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (user) => {
      setAuthResolved(true);
      setCurrentUser(user);

      if (!user) {
        setAuthModalOpen(false);
        setOnboardingOpen(false);
        setAuthJustSignedUp(false);
        return;
      }

      await loadProfile(user);
      setAuthJustSignedUp(false);

      if (!db) return;
      const q = query(collection(db, "users", user.uid, "analyses"), orderBy("analyzedAt", "desc"), limit(12));
      const snap = await getDocs(q);
      const cloudHistory = snap.docs.map((docItem) => docItem.data() as AnalysisReport);
      if (cloudHistory.length) setHistory(cloudHistory);
    });
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
    if (!db || !currentUser) {
      setAuthModalOpen(true);
      navigate("/", { replace: true });
      return;
    }

    setProfileSaving(true);
    try {
      const profileRef = doc(db, "users", currentUser.uid, "profile", "main");
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
        photoURL: getDiceBearAvatarUrl(currentUser.uid || currentUser.email || profile.displayName || profile.email || "flowsense"),
        profileComplete: Boolean(
          profile.displayName.trim() &&
          profile.companyName.trim() &&
          profile.website.trim() &&
          profile.productUrl.trim() &&
          profile.agentName.trim()
        ),
        updatedAt: serverTimestamp(),
      };

      await setDoc(profileRef, nextProfile, { merge: true });
      setProfile((prev) => ({
        ...prev,
        email: currentUser.email || prev.email,
        photoURL: getDiceBearAvatarUrl(currentUser.uid || currentUser.email || prev.displayName || prev.email || "flowsense"),
      }));
      setOnboardingOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!auth) {
      setAuthError("Authentication unavailable.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        setAuthJustSignedUp(true);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
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
    if (!auth) {
      setAuthError("Authentication unavailable.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    try {
      await signInWithPopup(auth, googleProvider);
      setAuthJustSignedUp(false);
      setAuthModalOpen(false);
      navigate("/workspace/dashboard");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const currentSummary = useMemo(() => (report ? summaryText(report) : ""), [report]);

  return (
    <main className="site-shell">
      <style>{css}</style>

      {!isWorkspaceRoute && (
        <header className={`floating-nav ${isScrolled ? "scrolled" : ""}`}>
          <div className="brand-row">
            <img src={logoSrc} alt="FlowSense logo" className="brand-logo" />
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
              <button onClick={() => signOut(auth!)}>Sign out</button>
            )}
          </div>
        </header>
      )}

      <Routes>
        {/* Ã¢â€â‚¬Ã¢â€â‚¬ HOME Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

                {/* How it works */}
                <div className="how-section">
                  <p className="section-label">How it works</p>
                  <div className="how-steps">
                    <div className="how-step">
                      <div className="step-number">01</div>
                      <div className="step-title">Submit a URL</div>
                      <p className="step-desc">
                        Paste any product URL into the Workspace. The agent immediately begins
                        staging its autonomous interaction runtime.
                      </p>
                    </div>
                    <div className="how-step">
                      <div className="step-number">02</div>
                      <div className="step-title">Agent simulates</div>
                      <p className="step-desc">
                        FlowSense traverses real user paths - navigating, clicking, and scoring
                        friction across the full journey in under 60 seconds.
                      </p>
                    </div>
                    <div className="how-step">
                      <div className="step-number">03</div>
                      <div className="step-title">Ship the fix</div>
                      <p className="step-desc">
                        Copy implementation-ready prompts directly into Cursor, Linear, or your
                        PR description. No translation required.
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

                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="cmd">Launching autonomous UX agent...</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="out">Ã¢Å“â€œ Session initialized - device context loaded</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="info">Scanning homepage hierarchy...</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="cmd">Identifying primary CTA candidates...</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="warn">Ã¢Å¡Â  Navigation priority dilution detected</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="info">Traversing discovery Ã¢â€ â€™ conversion journey...</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="out">Ã¢Å“â€œ 5 screens explored Ã‚Â· 8 frictions captured Ã‚Â· 87% confidence</span></div>
                  <div className="terminal-line"><span className="prompt">Ã¢â‚¬Âº</span><span className="out">Ã¢Å“â€œ Report ready - 3 high-priority fixes Ã‚Â· PDF / JSON / TXT</span></div>

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
                      Heuristic engine always on
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
                    Open workspace Ã¢â€ â€™
                  </NavLink>
                </div>

              </section>
            </div>
          }
        />

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ WORKSPACE Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                onSignOut={() => auth && signOut(auth).then(() => navigate("/"))}
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

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ DOCS Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
              <p className="built-by">Built by Hardik Gupta · 2026</p>
              </div>
            </section>
          }
        />
      </Routes>

      {!isWorkspaceRoute && (
        <footer className="site-footer">
          <div>
            <strong>FlowSense.ai</strong>
            <p>Autonomous UX intelligence for product teams. Catch friction before your users do.</p>
          </div>
          <div>
            <strong style={{ fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500 }}>Navigate</strong>
            <p>Home · Workspace · About</p>
          </div>
          <div>
            <strong style={{ fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500 }}>Built by</strong>
            <p>Hardik Gupta<br />© 2026 FlowSense.ai</p>
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
        enabled={hasFirebaseConfig}
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
        enabled={hasFirebaseConfig}
        onClose={() => setOnboardingOpen(false)}
        onProfileChange={setProfile}
        onSubmit={handleSaveProfile}
      />
    </main>
  );
}

