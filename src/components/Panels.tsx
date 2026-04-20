import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { AnalysisReport, BrowserDiagnostics, CompareResponse, ExecutionStage, ProviderStatus, WorkspaceProfile } from "../types";
import { FloatingChatbot } from "./workspace/FloatingChatbot";

const PANEL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=DM+Sans:wght@400;500;700&display=swap');

  :root {
    --fs-pastel-mint: #B8DDC2;
    --fs-pastel-sky: #BAD8EC;
    --fs-pastel-gold: #F2D48A;
    --fs-surface: #fffdfa;
    --fs-surface-soft: #eef5f1;
    --fs-border: rgba(36, 75, 80, 0.10);
    --fs-border-strong: rgba(36, 75, 80, 0.18);
    --fs-ink: #1e2f34;
    --fs-muted: #4d6166;
    --fs-brand: #305e64;
    --fs-brand-soft: rgba(184, 221, 194, 0.42);
    --fs-shell: #f5faf8;
    --fs-sidebar: rgba(186, 216, 236, 0.34);
    --fs-danger: #c96d6d;
    --fs-radius: 18px;
    --sidebar-w: 260px;
  }

  * { box-sizing: border-box; }

  .fs-layout {
    display: flex;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(184, 221, 194, 0.32), transparent 24%),
      linear-gradient(180deg, #fbfdfc 0%, var(--fs-shell) 100%);
    font-family: 'DM Sans', sans-serif;
    color: var(--fs-ink);
    position: relative;
  }

  /* ── Sidebar ── */
  .fs-sidebar {
    width: var(--sidebar-w);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    background: var(--fs-sidebar);
    border-right: 1px solid var(--fs-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 14px;
    transition: transform 0.25s ease, width 0.25s ease;
    z-index: 100;
  }

  /* Mobile: sidebar slides in as overlay */
  .fs-sidebar.is-mobile-open {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(0) !important;
    box-shadow: 8px 0 32px rgba(36, 75, 80, 0.16);
  }

  .fs-sidebar.is-mobile-closed {
    transform: translateX(-100%);
  }

  /* ── Main content ── */
  .fs-main {
    flex: 1;
    min-width: 0;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Overlay backdrop ── */
  .fs-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(36, 75, 80, 0.20);
    z-index: 99;
  }

  .fs-overlay.visible { display: block; }

  /* ── Mobile topbar ── */
  .fs-topbar {
    display: none;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--fs-sidebar);
    border-bottom: 1px solid var(--fs-border);
    position: sticky;
    top: 0;
    z-index: 90;
  }

  .fs-hamburger {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--fs-border-strong);
    background: var(--fs-surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .fs-hamburger span {
    display: block;
    width: 16px;
    height: 1.5px;
    background: var(--fs-ink);
    border-radius: 2px;
    transition: all 0.2s;
  }

  .fs-topbar-brand {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.02em;
  }

  /* ── Sidebar internals ── */
  .sidebar-top-strip {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sidebar-search {
    flex: 1;
    min-width: 0;
    height: 34px;
    border-radius: 9999px;
    border: 1px solid var(--fs-border);
    background: var(--fs-surface);
    padding: 0 12px;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    color: var(--fs-ink);
    outline: none;
  }

  .sidebar-profile {
    width: 34px;
    height: 34px;
    border-radius: 9999px;
    border: 1px solid var(--fs-border);
    background: var(--fs-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--fs-brand);
    flex-shrink: 0;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
  }

  .sidebar-brand-logo {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--fs-border);
    background: var(--fs-surface);
    padding: 5px;
    flex-shrink: 0;
  }

  .sidebar-brand-name {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-size: 15px;
    line-height: 1.15;
  }

  .sidebar-brand-sub {
    font-size: 11px;
    color: var(--fs-muted);
    margin-top: 1px;
    line-height: 1.3;
  }

  .sidebar-divider {
    border: none;
    border-top: 1px solid var(--fs-border);
    margin: 2px 0;
  }

  .sidebar-group-label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
    color: var(--fs-muted);
    padding: 0 4px;
    margin-bottom: 2px;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-nav-item {
    text-decoration: none;
    color: var(--fs-ink);
    font-size: 13px;
    font-weight: 600;
    border: 1px solid transparent;
    background: transparent;
    border-radius: 10px;
    padding: 9px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s;
  }

  .sidebar-nav-item:hover { background: rgba(255,253,250,0.72); }

  .sidebar-nav-item.is-active {
    background: var(--fs-surface);
    border-color: rgba(36, 75, 80, 0.18);
    box-shadow: inset 3px 0 0 var(--fs-brand);
  }

  .sidebar-nav-item--primary {
    background: var(--fs-brand-soft);
    border-color: rgba(36, 75, 80, 0.20);
    color: #244b50;
  }

  .nav-icon {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: rgba(186, 216, 236, 0.40);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 10px;
  }

  .sidebar-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sidebar-btn {
    border: 1px solid var(--fs-border-strong);
    border-radius: 9999px;
    background: transparent;
    color: var(--fs-ink);
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }

  .sidebar-btn:hover { background: var(--fs-surface); }

  .sidebar-btn--solid {
    background: var(--fs-brand);
    border-color: var(--fs-brand);
    color: #fff;
  }

  .sidebar-btn--solid:hover { background: #244b50; }

  .sidebar-btn--active {
    background: rgba(186, 216, 236, 0.34);
    border-color: rgba(48, 94, 100, 0.28);
  }

  .sidebar-btn--danger {
    background: #f8e1dd;
    border-color: rgba(201,109,109,0.24);
    color: var(--fs-danger);
  }

  .sidebar-saved {
    font-size: 12px;
    color: var(--fs-muted);
    text-align: center;
    padding: 6px 0;
  }

  .sidebar-saved strong { color: var(--fs-ink); }

  .sidebar-account-link {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: var(--fs-ink);
    border-radius: 14px;
    border: 1px solid var(--fs-border);
    background: var(--fs-surface);
    padding: 10px 12px;
  }

  .sidebar-avatar {
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    border: 1px solid var(--fs-border);
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 12px;
    font-weight: 700;
    color: var(--fs-brand);
    flex-shrink: 0;
  }

  .sidebar-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sidebar-account-meta {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .sidebar-account-name {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
  }

  .sidebar-account-email {
    font-size: 11px;
    color: var(--fs-muted);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-account-actions {
    display: grid;
    gap: 6px;
    margin-top: auto;
  }

  .sidebar-account-actions a,
  .sidebar-account-actions button {
    border: 1px solid var(--fs-border-strong);
    border-radius: 9999px;
    background: var(--fs-surface);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    text-decoration: none;
    color: var(--fs-ink);
    text-align: center;
  }

  .sidebar-account-actions a.active {
    background: var(--fs-brand-soft);
    border-color: rgba(36, 75, 80, 0.18);
  }

  .sidebar-account-actions .sidebar-btn--danger {
    background: #f8e1dd;
    border-color: rgba(201,109,109,0.24);
    color: var(--fs-danger);
  }

  .sidebar-account-actions .sidebar-btn--solid {
    background: var(--fs-brand);
    border-color: var(--fs-brand);
    color: #fff;
  }

  .workspace-overview-card,
  .profile-card,
  .settings-card {
    border: 1px solid var(--fs-border);
    border-radius: 16px;
    background: var(--fs-surface);
    padding: 18px;
  }

  .workspace-overview-grid,
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .profile-form {
    display: grid;
    gap: 12px;
  }

  .profile-field {
    display: grid;
    gap: 6px;
  }

  .profile-field label {
    font-size: 12px;
    font-weight: 700;
    color: var(--fs-ink);
  }

  .profile-field input,
  .profile-field textarea {
    border: 1px solid var(--fs-border-strong);
    border-radius: 12px;
    background: #ffffff;
    padding: 10px 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--fs-ink);
  }

  .profile-field textarea {
    min-height: 100px;
    resize: vertical;
  }

  .profile-head,
  .settings-head,
  .overview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .profile-head h2,
  .settings-head h2,
  .overview-head h2 {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }

  .profile-meta,
  .settings-meta,
  .overview-meta {
    font-size: 12px;
    color: var(--fs-muted);
    line-height: 1.45;
  }

  .provider-status-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .provider-status-card {
    border: 1px solid var(--fs-border);
    border-radius: 14px;
    background: #ffffff;
    padding: 12px;
  }

  .provider-status-card strong {
    display: block;
    margin-bottom: 4px;
  }

  .provider-status-card span {
    color: var(--fs-muted);
    font-size: 12px;
  }

  /* ── Panels ── */
  .panel {
    background: var(--fs-surface);
    border: 1px solid var(--fs-border);
    border-radius: 16px;
    padding: 20px;
    font-family: 'DM Sans', sans-serif;
    color: var(--fs-ink);
    box-shadow: 0 1px 0 rgba(0,0,0,0.02);
    scroll-margin-top: 24px;
  }

  .label-xs {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11px;
    color: var(--fs-muted);
    margin-bottom: 6px;
  }

  .panel-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-size: 20px;
    margin-bottom: 4px;
  }

  .panel-subtitle {
    font-size: 13px;
    color: var(--fs-muted);
    line-height: 1.6;
  }

  .btn {
    border: 1px solid var(--fs-border-strong);
    border-radius: 9999px;
    background: transparent;
    color: var(--fs-ink);
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }

  .btn:hover { background: var(--fs-surface-soft); }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-solid { background: var(--fs-brand); border-color: var(--fs-brand); color: #fff; }
  .btn-solid:hover { background: #14563d; }
  .btn-danger { background: #f9ecea; border-color: rgba(192,57,43,0.2); color: var(--fs-danger); }
  .btn-active { background: #e8f2f4; border-color: rgba(36,91,102,0.35); }

  /* Override global app button styles so workspace neutral buttons never render white text on white backgrounds. */
  .panel button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active),
  .settings-card button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active),
  .workspace-overview-card button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active),
  .profile-card button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active) {
    background: var(--fs-surface);
    color: var(--fs-ink);
    border-color: var(--fs-border-strong);
  }

  .panel button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active):hover,
  .settings-card button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active):hover,
  .workspace-overview-card button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active):hover,
  .profile-card button.btn:not(.btn-solid):not(.btn-danger):not(.btn-active):hover {
    background: var(--fs-surface-soft);
  }

  .history-pill-btn {
    border: 1px solid var(--fs-border);
    background: var(--fs-surface-soft);
    border-radius: 9999px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    color: var(--fs-ink);
    font-family: 'DM Sans', sans-serif;
  }

  .history-entry-btn {
    text-align: left;
    border-radius: 12px;
    background: var(--fs-surface);
    color: var(--fs-ink);
  }

  /* ── Dashboard toolbar ── */
  .dashboard-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .dashboard-toolbar-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .workspace-title-row h2 {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0 0 4px;
  }

  .workspace-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 9999px;
    background: var(--fs-brand-soft);
    color: #134e37;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Overview grid ── */
  .dashboard-overview-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .overview-card {
    border: 1px solid var(--fs-border);
    border-radius: 14px;
    background: var(--fs-surface-soft);
    padding: 14px;
  }

  .overview-label { font-size: 11px; color: var(--fs-muted); margin-bottom: 4px; }

  .overview-value {
    font-family: 'Syne', sans-serif;
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }

  .overview-sub { margin-top: 4px; font-size: 11px; color: #5f8a75; }

  .overview-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 28px;
    margin-top: 10px;
  }

  .overview-chart span {
    flex: 1;
    border-radius: 999px 999px 3px 3px;
    background: linear-gradient(180deg, rgba(186, 216, 236, 0.55), rgba(48, 94, 100, 0.90));
  }

  /* ── URL input ── */
  .input-row {
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    gap: 10px;
    margin-top: 14px;
  }

  .url-input, .compare-url-input {
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--fs-border-strong);
    padding: 0 14px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: var(--fs-ink);
    background: var(--fs-surface);
    outline: none;
    min-width: 0;
  }

  .url-input:focus, .compare-url-input:focus { border-color: var(--fs-brand); }

  .analyze-btn {
    height: 44px;
    border: none;
    border-radius: 9999px;
    background: linear-gradient(135deg, #3d7076 0%, #305e64 100%);
    color: #fff;
    padding: 0 22px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
    transition: opacity 0.15s;
  }

  .analyze-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .analyze-btn.secondary {
    background: var(--fs-surface);
    color: var(--fs-ink);
    border: 1px solid var(--fs-border-strong);
  }

  /* ── Compare ── */
  .compare-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 10px;
    margin-top: 14px;
  }

  .compare-results {
    display: grid;
    grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .compare-score-card {
    border: 1px solid var(--fs-border);
    border-radius: 14px;
    padding: 16px;
    text-align: center;
    background: var(--fs-surface);
  }

  .compare-score-card.winner { background: rgba(186, 216, 236, 0.34); border-color: rgba(48, 94, 100, 0.22); }
  .compare-domain { color: var(--fs-muted); font-size: 12px; margin-bottom: 6px; }
  .compare-value { font-family: 'Syne', sans-serif; font-size: 38px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
  .compare-sub { color: var(--fs-muted); font-size: 12px; margin-top: 6px; }

  /* ── Live panel ── */
  .live-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 14px;
  }

  .stage-badge {
    border: 1px solid var(--fs-border);
    background: var(--fs-surface-soft);
    border-radius: 9999px;
    padding: 5px 10px;
    font-size: 11px;
    color: var(--fs-muted);
    white-space: nowrap;
  }

  .counter-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .counter-card {
    border: 1px solid var(--fs-border);
    border-radius: 12px;
    padding: 12px;
    background: var(--fs-surface);
  }

  .counter-card:nth-child(1) { background: rgba(184, 221, 194, 0.22); }
  .counter-card:nth-child(2) { background: rgba(186, 216, 236, 0.24); }
  .counter-card:nth-child(3) { background: rgba(242, 212, 138, 0.24); }

  .counter-value { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -0.03em; }
  .counter-label { color: var(--fs-muted); font-size: 12px; margin-top: 4px; }

  .terminal {
    border: 1px solid var(--fs-border);
    border-radius: 12px;
    background: var(--fs-surface);
    padding: 14px;
    max-height: 240px;
    overflow-y: auto;
  }

  .terminal-entry { border-bottom: 1px solid var(--fs-border); padding-bottom: 10px; margin-bottom: 10px; }
  .terminal-entry:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .log-label { font-family: 'Consolas','Courier New',monospace; font-size: 12px; font-weight: 700; }
  .log-detail { font-family: 'Consolas','Courier New',monospace; color: #3f5358; font-size: 12px; margin-top: 2px; line-height: 1.45; }

  .replay-shell {
    border: 1px solid var(--fs-border);
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(238,245,241,0.96));
    box-shadow: 0 18px 42px rgba(36, 75, 80, 0.08), inset 0 1px 0 rgba(255,255,255,0.9);
    overflow: hidden;
    margin-bottom: 14px;
  }

  .replay-shell.compact {
    margin-bottom: 12px;
  }

  .replay-chrome {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--fs-border);
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(14px);
  }

  .replay-dots {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .replay-dots span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(36, 75, 80, 0.18);
  }

  .replay-urlbar {
    flex: 1;
    min-width: 0;
    border-radius: 9999px;
    border: 1px solid var(--fs-border);
    background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(238,245,241,0.92));
    padding: 8px 14px;
    font-size: 12px;
    color: var(--fs-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .replay-chip {
    border-radius: 9999px;
    border: 1px solid var(--fs-border);
    background: rgba(184, 221, 194, 0.28);
    color: var(--fs-brand);
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .replay-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
    gap: 12px;
    padding: 14px;
  }

  .replay-viewport {
    border-radius: 20px;
    border: 1px solid rgba(36, 75, 80, 0.10);
    background:
      radial-gradient(circle at top right, rgba(186, 216, 236, 0.20), transparent 30%),
      linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,251,249,0.96));
    padding: 14px;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
  }

  .replay-viewport-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .replay-kicker {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--fs-muted);
    margin-bottom: 4px;
  }

  .replay-title {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .replay-copy {
    color: #3d4f54;
    font-size: 13px;
    line-height: 1.55;
    margin-top: 6px;
    max-width: 46ch;
  }

  .replay-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .replay-metric {
    border: 1px solid var(--fs-border);
    border-radius: 16px;
    background: rgba(255,255,255,0.84);
    padding: 10px;
  }

  .replay-metric-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fs-muted);
  }

  .replay-metric-value {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 800;
    margin-top: 4px;
  }

  .replay-rail {
    display: grid;
    gap: 8px;
    align-content: start;
  }

  .replay-step {
    border: 1px solid var(--fs-border);
    border-radius: 16px;
    background: rgba(255,255,255,0.84);
    padding: 10px 12px;
    box-shadow: 0 6px 18px rgba(36, 75, 80, 0.04);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .replay-step.active {
    border-color: rgba(48, 94, 100, 0.26);
    box-shadow: 0 10px 24px rgba(36, 75, 80, 0.10);
    transform: translateY(-1px);
  }

  .replay-step-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .replay-step-num {
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 800;
    color: var(--fs-brand);
    background: rgba(184, 221, 194, 0.34);
    border-radius: 9999px;
    padding: 4px 8px;
  }

  .replay-step-phase {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fs-muted);
  }

  .replay-step-title {
    font-weight: 700;
    font-size: 13px;
    line-height: 1.35;
  }

  .replay-step-meta {
    color: #3f5358;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
  }

  .replay-footer {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .replay-footer-card {
    border: 1px solid var(--fs-border);
    border-radius: 16px;
    background: rgba(255,255,255,0.82);
    padding: 10px 12px;
  }

  .replay-footer-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fs-muted);
  }

  .replay-footer-value {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 800;
    margin-top: 4px;
  }

  .diagnostics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
  }

  .diagnostic-card {
    border: 1px solid var(--fs-border);
    border-radius: 16px;
    background: rgba(255,255,255,0.84);
    padding: 10px 12px;
  }

  .diagnostic-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fs-muted);
  }

  .diagnostic-value {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 800;
    margin-top: 4px;
  }

  .diagnostic-detail {
    color: #3f5358;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
  }

  .probe-ok { color: #3f6954; }
  .probe-warn { color: #a15f15; }
  .probe-fail { color: #b95b5b; }

  /* ── Results ── */
  .results-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
  .score-domain { color: #4d6166; font-size: 12px; }
  .hero-score { font-family: 'Syne', sans-serif; font-size: 68px; font-weight: 800; line-height: 1; letter-spacing: -0.05em; }
  .score-label { color: #4d6166; font-size: 12px; }

  .export-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }

  .divider { border-top: 1px solid var(--fs-border); margin: 16px 0; }

  .metrics-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-bottom: 10px; }
  .metric-cell { border: 1px solid var(--fs-border); border-radius: 12px; background: var(--fs-surface); padding: 10px; }
  .metric-label { color: #4d6166; font-size: 11px; }
  .metric-value { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; margin-top: 2px; }

  .results-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }

  .section-heading { display: flex; align-items: center; gap: 8px; font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 10px; }
  .section-count { border: 1px solid var(--fs-border); border-radius: 9999px; padding: 2px 8px; font-size: 11px; color: #4d6166; background: var(--fs-surface-soft); }

  .issue-card, .suggestion-card, .ai-action-card { border: 1px solid var(--fs-border); border-radius: 12px; padding: 12px; background: var(--fs-surface); margin-bottom: 8px; }
  .issue-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .issue-title, .suggestion-title, .ai-action-title { font-weight: 700; font-size: 14px; }
  .issue-explanation, .issue-impact, .suggestion-action, .ai-action-why, .journey-intent, .journey-signal, .ai-providers, .ai-summary-text { color: #3f5358; font-size: 13px; line-height: 1.55; }

  .severity-badge, .priority-badge, .ai-action-number { border-radius: 9999px; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 7px; border: 1px solid var(--fs-border); background: var(--fs-surface-soft); }
  .severity-badge.high, .severity-badge.critical { background: #f8e1dd; color: #b95b5b; }
  .severity-badge.medium { background: rgba(242, 212, 138, 0.42); color: #8f6a16; }
  .severity-badge.low { background: rgba(184, 221, 194, 0.42); color: #3f6954; }

  .copy-prompt-btn { border: 1px solid var(--fs-border-strong); border-radius: 9999px; background: transparent; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-top: 8px; }

  .timeline { border: 1px solid var(--fs-border); border-radius: 12px; overflow: hidden; }
  .journey-step { display: grid; grid-template-columns: 44px 1fr 1fr; gap: 10px; padding: 11px; border-bottom: 1px solid var(--fs-border); background: var(--fs-surface); }
  .journey-step:last-child { border-bottom: none; }
  .journey-step-num { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: rgba(48, 94, 100, 0.22); line-height: 1; }
  .journey-action { font-weight: 700; font-size: 13px; }
  .journey-signal { text-align: right; }

  .ai-summary-card { border: 1px solid var(--fs-border); border-radius: 12px; background: rgba(186, 216, 236, 0.18); padding: 12px; margin-bottom: 8px; }

  .warning-copy { background: rgba(242, 212, 138, 0.30); border: 1px solid rgba(143,106,22,0.18); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #8f6a16; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .fs-layout {
      flex-direction: column;
    }

    .fs-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      transform: translateX(-100%);
      z-index: 100;
    }
    .fs-topbar { display: flex; }
    .fs-main { padding: 18px 14px 34px; }
    .dashboard-overview-grid,
    .workspace-overview-grid,
    .provider-status-grid,
    .settings-grid,
    .compare-results,
    .counter-row,
    .metrics-grid,
    .results-cols {
      grid-template-columns: 1fr;
    }
    .dashboard-toolbar,
    .results-top,
    .live-panel-head,
    .profile-head,
    .settings-head,
    .overview-head {
      flex-direction: column;
      align-items: stretch;
    }
    .dashboard-toolbar-actions {
      width: 100%;
      justify-content: stretch;
    }
    .dashboard-toolbar-actions .btn,
    .dashboard-toolbar-actions .analyze-btn {
      width: 100%;
    }
    .input-row,
    .compare-inputs {
      grid-template-columns: 1fr;
    }
    .input-row .analyze-btn,
    .compare-inputs .btn {
      width: 100%;
    }
    .sidebar-account-link,
    .sidebar-actions {
      width: 100%;
    }
    .provider-status-grid {
      grid-template-columns: 1fr;
    }
    .workspace-overview-grid {
      gap: 10px;
    }
    .export-actions { align-items: stretch; width: 100%; }
    .export-actions .btn { text-align: center; }
    .hero-score { font-size: 54px; }
    .journey-step { grid-template-columns: 36px 1fr; }
    .journey-signal { text-align: left; grid-column: 2; }
  }
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

/* ─────────────────────────────────────────
   Sidebar
───────────────────────────────────────── */
interface SidebarProps {
  onToggleCompare: () => void;
  compareEnabled: boolean;
  reportCount: number;
  userEmail?: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  onSignOut?: () => void;
  onOpenAuth?: () => void;
  logoSrc: string;
  activeSection: string;
  isOpen: boolean;
  onClose: () => void;
  forceDesktop?: boolean;
}

export function Sidebar({
  onToggleCompare,
  compareEnabled,
  reportCount,
  userEmail,
  userDisplayName,
  userPhotoURL,
  onSignOut,
  onOpenAuth,
  logoSrc,
  activeSection,
  isOpen,
  onClose,
  forceDesktop,
}: SidebarProps) {
  injectCss();

  const menuItems = [
    { label: "Dashboard", to: "/workspace/dashboard", sectionId: "workspace-dashboard", icon: "⬡" },
    { label: "Analyze", to: "/workspace/analyze", sectionId: "workspace-analyze", icon: "◎" },
    { label: "Live", to: "/workspace/live", sectionId: "workspace-live", icon: "▶" },
    { label: "Reports", to: "/workspace/reports", sectionId: "workspace-reports", icon: "≡" },
    { label: "Profile", to: "/workspace/profile", sectionId: "workspace-profile", icon: "☺" },
    { label: "Settings", to: "/workspace/settings", sectionId: "workspace-settings", icon: "⚙" },
  ];

  const isMobileOpen = forceDesktop ? "" : isOpen ? "is-mobile-open" : "is-mobile-closed";

  return (
    <>
      {!forceDesktop && <div className={`fs-overlay ${isOpen ? "visible" : ""}`} onClick={onClose} aria-hidden="true" />}
      <aside className={`fs-sidebar ${isMobileOpen}`.trim()} aria-label="Workspace navigation">
        <div className="sidebar-top-strip">
          <input className="sidebar-search" type="search" placeholder="Search workspace" aria-label="Search workspace" />
          {userEmail ? (
            <NavLink className="sidebar-avatar" to="/workspace/profile" aria-label="Open profile">
              {userPhotoURL ? <img src={userPhotoURL} alt="User avatar" /> : <span>{(userDisplayName || userEmail || "FS").slice(0, 2).toUpperCase()}</span>}
            </NavLink>
          ) : (
            <button className="sidebar-avatar" type="button" onClick={onOpenAuth} aria-label="Sign in">
              FS
            </button>
          )}
        </div>

        <NavLink className="sidebar-account-link" to={userEmail ? "/workspace/profile" : "/workspace/settings"} onClick={onClose}>
          <img src={logoSrc} alt="FlowSense logo" className="sidebar-brand-logo" />
          <div className="sidebar-account-meta">
            <div className="sidebar-brand-name">{userDisplayName || "FlowSense"}</div>
            <div className="sidebar-account-email">{userEmail || "Authenticated user"}</div>
          </div>
        </NavLink>

        <hr className="sidebar-divider" />

        <div className="sidebar-group-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Sections">
          {menuItems.map((item, i) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-nav-item ${i === 0 ? "sidebar-nav-item--primary" : ""} ${isActive || activeSection === item.sectionId ? "is-active" : ""}`}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <hr className="sidebar-divider" />

        <div className="sidebar-group-label">Actions</div>
        <div className="sidebar-actions">
          <button
            className={`sidebar-btn ${compareEnabled ? "sidebar-btn--active" : ""}`}
            onClick={onToggleCompare}
          >
            {compareEnabled ? "Comparison on" : "Compare two URLs"}
          </button>
          <div className="sidebar-saved">
            <strong>{reportCount}</strong> saved reports
          </div>
          {userEmail ? (
            <button className="sidebar-btn sidebar-btn--danger" onClick={onSignOut}>Sign out</button>
          ) : (
            <button className="sidebar-btn sidebar-btn--solid" onClick={onOpenAuth}>Sign in</button>
          )}
          <NavLink className="sidebar-btn" to="/workspace/settings" onClick={onClose}>
            Open settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────
   Mobile topbar
───────────────────────────────────────── */
interface TopbarProps {
  onOpenSidebar: () => void;
}

export function MobileTopbar({ onOpenSidebar }: TopbarProps) {
  injectCss();
  return (
    <div className="fs-topbar" role="banner">
      <button className="fs-hamburger" onClick={onOpenSidebar} aria-label="Open navigation">
        <span />
        <span />
        <span />
      </button>
      <span className="fs-topbar-brand">FlowSense</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   Input Panel
───────────────────────────────────────── */
interface InputPanelProps {
  url: string;
  onUrlChange: (v: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  history: AnalysisReport[];
  onLoadHistory: (r: AnalysisReport) => void;
}

export function InputPanel({ url, onUrlChange, onAnalyze, loading, history, onLoadHistory }: InputPanelProps) {
  injectCss();

  return (
    <div id="workspace-analyze" className="panel">
      <div className="label-xs">Autonomous UX audit</div>
      <div className="panel-title">Analyze a URL</div>
      <div className="panel-subtitle">Paste any product URL to launch a staged agent simulation and friction report.</div>

      <div className="input-row">
        <input
          className="url-input"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Paste a product URL"
          aria-label="Website URL"
          onKeyDown={(e) => e.key === "Enter" && !loading && onAnalyze()}
        />
        <button className="analyze-btn" onClick={onAnalyze} disabled={loading}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--fs-muted)" }}>Recent:</span>
          {history.slice(0, 6).map((r) => (
            <button
              key={r.id}
              className="history-pill-btn"
              onClick={() => onLoadHistory(r)}
            >
              {new URL(r.url).hostname}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Compare Panel
───────────────────────────────────────── */
interface ComparePanelProps {
  leftUrl: string;
  rightUrl: string;
  onLeftChange: (v: string) => void;
  onRightChange: (v: string) => void;
  onCompare: () => void;
  loading: boolean;
  result: CompareResponse | null;
}

export function ComparePanel({ leftUrl, rightUrl, onLeftChange, onRightChange, onCompare, loading, result }: ComparePanelProps) {
  injectCss();
  return (
    <div id="workspace-compare" className="panel">
      <div className="label-xs">Side-by-side mode</div>
      <div className="panel-title">Compare two URLs</div>
      <div className="panel-subtitle">Benchmark experiences and identify which reduces friction more effectively.</div>

      <div className="compare-inputs">
        <input className="compare-url-input" value={leftUrl} onChange={(e) => onLeftChange(e.target.value)} placeholder="https://product-a.com" />
        <input className="compare-url-input" value={rightUrl} onChange={(e) => onRightChange(e.target.value)} placeholder="https://product-b.com" />
        <button className="btn btn-solid" onClick={onCompare} disabled={loading}>
          {loading ? "Comparing…" : "Compare"}
        </button>
      </div>

      {result && (
        <div className="compare-results">
          <div className="compare-score-card">
            <div className="compare-domain">{new URL(result.left.url).hostname}</div>
            <div className="compare-value">{result.left.uxScore}</div>
            <div className="compare-sub">{result.left.frictionPoints} friction points</div>
          </div>
          <div className="compare-score-card">
            <div className="compare-domain">{new URL(result.right.url).hostname}</div>
            <div className="compare-value">{result.right.uxScore}</div>
            <div className="compare-sub">{result.right.frictionPoints} friction points</div>
          </div>
          <div className="compare-score-card winner">
            <div className="compare-domain">Winner</div>
            <div className="compare-value" style={{ fontSize: 22 }}>
              {result.winner === "tie" ? "Tie" : result.winner === "left" ? new URL(result.left.url).hostname : new URL(result.right.url).hostname}
            </div>
            <div className="compare-sub">Delta: {result.delta}</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface JourneyReplayProps {
  report: AnalysisReport;
  stageIndex: number;
  compact?: boolean;
}

function JourneyReplay({ report, stageIndex, compact = false }: JourneyReplayProps) {
  const journey = report.journey || [];
  const activeIndex = journey.length ? Math.max(0, Math.min(stageIndex - 1, journey.length - 1)) : 0;
  const activeStep = journey[activeIndex] || journey[0] || null;
  const progress = journey.length ? Math.round((Math.min(Math.max(stageIndex, 1), journey.length) / journey.length) * 100) : 0;
  const hostname = new URL(report.url).hostname;

  return (
    <div className={`replay-shell ${compact ? "compact" : ""}`}>
      <div className="replay-chrome">
        <div className="replay-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="replay-urlbar">{report.url}</div>
        <div className="replay-chip">{report.engineMode || "browser replay"}</div>
      </div>

      <div className="replay-grid">
        <div className="replay-viewport">
          <div className="replay-viewport-head">
            <div>
              <div className="replay-kicker">{hostname}</div>
              <div className="replay-title">{report.pageTitle}</div>
              <div className="replay-copy">
                {activeStep
                  ? `${activeStep.action} while checking ${activeStep.focus || "the current surface"}. ${activeStep.intent}`
                  : "The autonomous agent is preparing the first browser interaction."}
              </div>
            </div>
            <div className="replay-chip">{progress}% complete</div>
          </div>

          <div className="replay-metrics">
            <div className="replay-metric">
              <div className="replay-metric-label">Screens</div>
              <div className="replay-metric-value">{report.screensVisited}</div>
            </div>
            <div className="replay-metric">
              <div className="replay-metric-label">Friction</div>
              <div className="replay-metric-value">{report.frictionPoints}</div>
            </div>
            <div className="replay-metric">
              <div className="replay-metric-label">Confidence</div>
              <div className="replay-metric-value">{report.confidenceScore}%</div>
            </div>
          </div>

          <div className="replay-footer">
            <div className="replay-footer-card">
              <div className="replay-footer-label">Current phase</div>
              <div className="replay-footer-value">{activeStep?.phase || "boot"}</div>
            </div>
            <div className="replay-footer-card">
              <div className="replay-footer-label">Focus</div>
              <div className="replay-footer-value">{activeStep?.focus || "navigation"}</div>
            </div>
            <div className="replay-footer-card">
              <div className="replay-footer-label">Engine</div>
              <div className="replay-footer-value">{report.engineMode || "simulated"}</div>
            </div>
            <div className="replay-footer-card">
              <div className="replay-footer-label">Model</div>
              <div className="replay-footer-value">{report.providerUsed || "heuristic"}</div>
            </div>
          </div>
        </div>

        <div className="replay-rail">
          {journey.map((step, index) => {
            const isActive = index === activeIndex;
            return (
              <div key={`${step.step}-${step.screen}`} className={`replay-step ${isActive ? "active" : ""}`}>
                <div className="replay-step-top">
                  <div className="replay-step-num">{String(step.step).padStart(2, "0")}</div>
                  <div className="replay-step-phase">{step.phase || `step ${step.step}`}</div>
                </div>
                <div className="replay-step-title">{step.action}</div>
                <div className="replay-step-meta">{step.screen}</div>
                <div className="replay-step-meta">{step.intent}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BackendDiagnosticsCard({ automation }: { automation?: BrowserDiagnostics | null }) {
  if (!automation) return null;

  const probeState = (status: BrowserDiagnostics["playwright"] | BrowserDiagnostics["puppeteer"]) => {
    if (!status.available) return status.installed ? "probe-warn" : "probe-fail";
    return "probe-ok";
  };

  return (
    <div className="diagnostics-grid">
      <div className="diagnostic-card">
        <div className="diagnostic-label">Playwright</div>
        <div className={`diagnostic-value ${probeState(automation.playwright)}`}>{automation.playwright.available ? "Ready" : "Unavailable"}</div>
        <div className="diagnostic-detail">{automation.playwright.error || "Browser probe completed successfully."}</div>
      </div>
      <div className="diagnostic-card">
        <div className="diagnostic-label">Puppeteer</div>
        <div className={`diagnostic-value ${probeState(automation.puppeteer)}`}>{automation.puppeteer.available ? "Ready" : "Unavailable"}</div>
        <div className="diagnostic-detail">{automation.puppeteer.error || "Fallback probe completed successfully."}</div>
      </div>
      <div className="diagnostic-card">
        <div className="diagnostic-label">Checked at</div>
        <div className="diagnostic-value">{automation.checkedAt ? new Date(automation.checkedAt).toLocaleTimeString() : "Pending"}</div>
        <div className="diagnostic-detail">Backend browser diagnostics are cached on startup and exposed through the runtime config.</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Live Panel
───────────────────────────────────────── */
interface LivePanelProps {
  logs: ExecutionStage[];
  stageIndex: number;
  counters: { screens: number; frictions: number; confidence: number };
  report: AnalysisReport | null;
  automation?: BrowserDiagnostics | null;
}

export function LivePanel({ logs, stageIndex, counters, report, automation }: LivePanelProps) {
  injectCss();
  const stageTotal = Math.max(logs.length, report?.journey.length || 0, 1);
  return (
    <div id="workspace-live" className="panel">
      <div className="live-panel-head">
        <div>
          <div className="label-xs">Agent runtime</div>
          <div className="panel-title">Live execution log</div>
        </div>
        <span className="stage-badge">Stage {Math.min(Math.max(stageIndex, 0), stageTotal)} / {stageTotal}</span>
      </div>

      {report && <JourneyReplay report={report} stageIndex={stageIndex} />}

      <div className="counter-row">
        <div className="counter-card">
          <div className="counter-value">{counters.screens}</div>
          <div className="counter-label">Screens explored</div>
        </div>
        <div className="counter-card">
          <div className="counter-value">{counters.frictions}</div>
          <div className="counter-label">Friction points</div>
        </div>
        <div className="counter-card">
          <div className="counter-value">{counters.confidence}%</div>
          <div className="counter-label">Confidence</div>
        </div>
      </div>

      <div className="terminal">
        {logs.map((entry, i) => (
          <div key={`${entry.label}-${i}`} className="terminal-entry">
            <div className="log-label">
              {entry.label}
              {entry.kind ? <span className="stage-badge" style={{ marginLeft: 8 }}>{entry.kind}</span> : null}
            </div>
            <div className="log-detail">{entry.detail}</div>
            {entry.screen ? <div className="log-detail">Screen: {entry.screen}</div> : null}
            {entry.state ? <div className="log-detail">State: {entry.state}</div> : null}
          </div>
        ))}
      </div>

      <BackendDiagnosticsCard automation={automation} />
    </div>
  );
}

/* ─────────────────────────────────────────
   Results Panel
───────────────────────────────────────── */
interface ResultsProps {
  report: AnalysisReport;
  onCopy: () => void;
  onExportText: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onCopyFixPrompt: (prompt: string) => void;
}

export function ResultsPanel({ report, onCopy, onExportText, onExportJson, onExportPdf, onCopyFixPrompt }: ResultsProps) {
  injectCss();
  const domain = new URL(report.url).hostname;
  const scoreColor = report.uxScore >= 80 ? "#1f7c43" : report.uxScore >= 60 ? "#9c5c08" : "#b83324";

  return (
    <div id="workspace-reports" className="panel">
      <div className="results-top">
        <div>
          <div className="score-domain">{domain}</div>
          <div className="hero-score" style={{ color: scoreColor }}>{report.uxScore}</div>
          <div className="score-label">UX score — {report.engineMode || "agent simulation"}</div>
        </div>
        <div className="export-actions">
          <button className="btn btn-solid" onClick={onCopy}>Copy summary</button>
          <button className="btn" onClick={onExportText}>Download text</button>
          <button className="btn" onClick={onExportPdf}>Download PDF</button>
          <button className="btn" onClick={onExportJson}>Export JSON</button>
        </div>
      </div>

      <div className="metrics-grid">
        {[
          { label: "Screens explored", value: String(report.screensVisited) },
          { label: "Friction points", value: String(report.frictionPoints) },
          { label: "Confidence", value: `${report.confidenceScore}%` },
          { label: "Task difficulty", value: `${report.taskDifficulty}%` },
          { label: "Perceived load", value: String(report.perceivedLoadScore) },
          { label: "Time-to-interaction", value: `${report.timeToInteractionMs}ms` },
          { label: "Model confidence", value: `${report.modelConfidence ?? report.confidenceScore}%` },
          { label: "Provider", value: report.providerUsed || "heuristic" },
          { label: "Learning trend", value: report.learning?.trend || "new" },
        ].map(({ label, value }) => (
          <div className="metric-cell" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="divider" />

      <div className="results-cols">
        <div>
          <div className="section-heading">Issues detected <span className="section-count">{report.issues.length}</span></div>
          {report.issues.map((issue) => (
            <div key={issue.id} className="issue-card">
              <div className="issue-top">
                <div className="issue-title">{issue.title}</div>
                <span className={`severity-badge ${issue.severity.toLowerCase()}`}>{issue.severity}</span>
              </div>
              <div className="issue-explanation">{issue.explanation}</div>
              <div className="issue-impact">{issue.impact}</div>
              <button className="copy-prompt-btn" onClick={() => onCopyFixPrompt(issue.fixPrompt)}>Copy fix prompt</button>
            </div>
          ))}
        </div>

        <div>
          <div className="section-heading">Suggestions <span className="section-count">{report.suggestions.length}</span></div>
          {report.suggestions.map((s) => (
            <div key={s.id} className="suggestion-card">
              <span className="priority-badge">Priority {s.priority}</span>
              <div className="suggestion-title">{s.title}</div>
              <div className="suggestion-action">{s.action}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div>
        <div className="section-heading">Session replay <span className="section-count">{report.journey.length} steps</span></div>
        <JourneyReplay report={report} stageIndex={report.journey.length} compact />
      </div>

      {report.aiSummary && (
        <>
          <div className="divider" />
          <div className="section-heading">AI intelligence layer</div>
          <div className="ai-summary-card">
            <div className="ai-summary-text">{report.aiSummary}</div>
            <div className="ai-providers" style={{ marginTop: 6, fontSize: 11, color: "var(--fs-muted)" }}>
              Providers attempted: {report.providerTrace?.attempted?.join(", ") || "none"} | Used: {report.providerTrace?.used || "heuristic"}
            </div>
          </div>
          {(report.aiActions || []).map((action, i) => (
            <div key={`${action.title}-${i}`} className="ai-action-card">
              <div className="ai-action-number">Action {i + 1}</div>
              <div className="ai-action-title">{action.title}</div>
              <div className="ai-action-why">{action.whyItMatters}</div>
              <button className="copy-prompt-btn" onClick={() => onCopyFixPrompt(action.implementationPrompt)}>Copy builder prompt</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

interface OverviewPanelProps {
  history: AnalysisReport[];
  loading: boolean;
  report: AnalysisReport | null;
  reportCount: number;
  providerStatus: ProviderStatus;
  userEmail?: string;
  userDisplayName?: string;
  userPhotoURL?: string;
}

function OverviewPanel({ history, loading, report, reportCount, providerStatus, userEmail, userDisplayName, userPhotoURL }: OverviewPanelProps) {
  injectCss();

  const providerSummary = Object.entries(providerStatus).filter(([, enabled]) => enabled).map(([name]) => name.toUpperCase());
  const projects = Math.max(history.length, 1);
  const running = loading ? 1 : 0;
  const pending = Math.max(projects - reportCount - running, 0);

  return (
    <section id="workspace-dashboard" className="workspace-overview-card">
      <div className="overview-head">
        <div>
          <div className="label-xs">Dashboard</div>
          <h2>{userDisplayName || "Your dashboard"}</h2>
          <div className="overview-meta">Signed in as {userEmail || "workspace-user@flowsense.ai"}</div>
        </div>

        <div className="sidebar-account-link" style={{ maxWidth: 320 }}>
          <div className="sidebar-avatar">
            {userPhotoURL ? <img src={userPhotoURL} alt="User avatar" /> : <span>{(userDisplayName || userEmail || "FS").slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className="sidebar-account-meta">
            <div className="sidebar-account-name">{userDisplayName || "Workspace user"}</div>
            <div className="sidebar-account-email">{userEmail || "Account connected"}</div>
          </div>
        </div>
      </div>

      <div className="workspace-overview-grid">
        <div className="profile-card">
          <div className="label-xs">Projects</div>
          <div className="overview-head" style={{ marginBottom: 0 }}>
            <h2>{projects}</h2>
            <span className="workspace-section-tag">Tracked</span>
          </div>
          <div className="overview-meta">Workspace projects monitored by the audit engine.</div>
        </div>
        <div className="profile-card">
          <div className="label-xs">Analyzed</div>
          <div className="overview-head" style={{ marginBottom: 0 }}>
            <h2>{reportCount}</h2>
            <span className="workspace-section-tag">Reports</span>
          </div>
          <div className="overview-meta">Saved report history from backend session storage.</div>
        </div>
        <div className="profile-card">
          <div className="label-xs">Running</div>
          <div className="overview-head" style={{ marginBottom: 0 }}>
            <h2>{running}</h2>
            <span className="workspace-section-tag">Active</span>
          </div>
          <div className="overview-meta">Live audits currently executing in the agent runtime.</div>
        </div>
        <div className="profile-card">
          <div className="label-xs">Pending</div>
          <div className="overview-head" style={{ marginBottom: 0 }}>
            <h2>{pending}</h2>
            <span className="workspace-section-tag">Queue</span>
          </div>
          <div className="overview-meta">Queued work waiting for analysis execution.</div>
        </div>
      </div>

      <div className="profile-card" style={{ marginTop: 14 }}>
        <div className="label-xs">Quick actions</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <NavLink className="btn" to="/workspace/analyze">Open analyze</NavLink>
          <NavLink className="btn" to="/workspace/live">Open live monitor</NavLink>
          <NavLink className="btn" to="/workspace/reports">Open reports</NavLink>
          <NavLink className="btn" to="/workspace/settings">Workspace settings</NavLink>
        </div>
      </div>

      <div className="profile-card" style={{ marginTop: 14 }}>
        <div className="label-xs">Recent activity</div>
        {history.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} style={{ border: "1px solid var(--fs-border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                <strong style={{ display: "block", fontSize: 13 }}>{new URL(entry.url).hostname}</strong>
                <span style={{ fontSize: 12, color: "var(--fs-muted)" }}>{new Date(entry.analyzedAt).toLocaleString()} · UX {entry.uxScore}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overview-meta">No activity yet. Open Analyze to run your first audit.</div>
        )}
      </div>

      <div className="profile-card" style={{ marginTop: 14 }}>
          <div className="label-xs">Provider status</div>
          <div className="overview-meta" style={{ marginBottom: 8 }}>
            {providerSummary.length ? `Online: ${providerSummary.join(", ")}` : "No provider keys are configured in the backend yet."}
          </div>
          <div className="overview-meta">The backend decides which AI providers are available for analysis.</div>
        </div>

      {report && (
        <div className="profile-card" style={{ marginTop: 14 }}>
          <div className="label-xs">Last analysis</div>
          <div className="overview-head" style={{ marginBottom: 8 }}>
            <h2>{report.pageTitle}</h2>
            <span className="workspace-section-tag">UX {report.uxScore}</span>
          </div>
          <div className="overview-meta">{report.url}</div>
        </div>
      )}
    </section>
  );
}

interface ProfilePanelProps {
  profile: WorkspaceProfile;
  userEmail?: string;
  userPhotoURL?: string;
  onProfileChange: (profile: WorkspaceProfile) => void;
  onSaveProfile: () => void;
  saving: boolean;
}

function ProfilePanel({ profile, userEmail, userPhotoURL, onProfileChange, onSaveProfile, saving }: ProfilePanelProps) {
  injectCss();

  return (
    <section id="workspace-profile" className="profile-card">
      <div className="profile-head">
        <div>
          <div className="label-xs">Profile</div>
          <h2>Account details</h2>
          <div className="profile-meta">Update the details your workspace uses for reports and onboarding.</div>
        </div>
        <div className="sidebar-account-link" style={{ maxWidth: 280 }}>
          <div className="sidebar-avatar">
            {userPhotoURL ? <img src={userPhotoURL} alt="User avatar" /> : <span>{(profile.displayName || userEmail || "FS").slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className="sidebar-account-meta">
            <div className="sidebar-account-name">{profile.displayName || "Add your name"}</div>
            <div className="sidebar-account-email">{userEmail || "Account connected"}</div>
          </div>
        </div>
      </div>

      <div className="profile-form">
        <div className="profile-field">
          <label htmlFor="profile-name">Display name</label>
          <input
            id="profile-name"
            value={profile.displayName}
            onChange={(event) => onProfileChange({ ...profile, displayName: event.target.value })}
            placeholder="Your name"
          />
        </div>
        <div className="profile-field">
          <label htmlFor="profile-org">Organization</label>
          <input
            id="profile-org"
            value={profile.organization}
            onChange={(event) => onProfileChange({ ...profile, organization: event.target.value })}
            placeholder="Company or team"
          />
        </div>
        <div className="profile-field">
          <label htmlFor="profile-role">Role</label>
          <input
            id="profile-role"
            value={profile.role}
            onChange={(event) => onProfileChange({ ...profile, role: event.target.value })}
            placeholder="Product, design, engineering, ..."
          />
        </div>
        <div className="profile-field">
          <label htmlFor="profile-bio">Bio</label>
          <textarea
            id="profile-bio"
            value={profile.bio}
            onChange={(event) => onProfileChange({ ...profile, bio: event.target.value })}
            placeholder="What does your team focus on?"
          />
        </div>
        <button className="btn btn-solid" onClick={onSaveProfile} disabled={saving} type="button">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </section>
  );
}

interface SettingsPanelProps {
  providerStatus: ProviderStatus;
  compareEnabled: boolean;
  onToggleCompare: () => void;
  userEmail?: string;
}

function SettingsPanel({ providerStatus, compareEnabled, onToggleCompare, userEmail }: SettingsPanelProps) {
  injectCss();

  const providerItems = [
    { name: "Groq", enabled: providerStatus.groq },
    { name: "NVIDIA", enabled: providerStatus.nvidia },
  ];

  return (
    <section id="workspace-settings" className="settings-card">
      <div className="settings-head">
        <div>
          <div className="label-xs">Settings</div>
          <h2>Workspace controls</h2>
          <div className="settings-meta">Backend provider availability and workspace behavior.</div>
        </div>
        <button className={`btn ${compareEnabled ? "btn-active" : ""}`} onClick={onToggleCompare} type="button">
          {compareEnabled ? "Comparison on" : "Comparison off"}
        </button>
      </div>

      <div className="provider-status-grid">
        {providerItems.map((provider) => (
          <div key={provider.name} className="provider-status-card">
            <strong>{provider.name}</strong>
            <span>{provider.enabled ? "Configured in backend" : "Not configured"}</span>
          </div>
        ))}
      </div>

      <div className="profile-card" style={{ marginTop: 14 }}>
        <div className="label-xs">Account</div>
        <div className="overview-meta">{userEmail ? `Signed in as ${userEmail}` : "Sign in to sync profile and history."}</div>
      </div>
    </section>
  );
}

interface WorkspacePageProps {
  url: string;
  onUrlChange: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  history: AnalysisReport[];
  onLoadHistory: (report: AnalysisReport) => void;
  compareEnabled: boolean;
  onToggleCompare: () => void;
  leftUrl: string;
  rightUrl: string;
  onLeftChange: (value: string) => void;
  onRightChange: (value: string) => void;
  onCompare: () => void;
  compareResult: CompareResponse | null;
  logs: ExecutionStage[];
  stageIndex: number;
  counters: { screens: number; frictions: number; confidence: number };
  report: AnalysisReport | null;
  currentSummary: string;
  reportCount: number;
  userEmail?: string;
  onSignOut?: () => void;
  onOpenAuth?: () => void;
  logoSrc: string;
  onCopySummary: () => void;
  onExportText: () => void;
  onExportPdf: () => void;
  onExportJson: () => void;
  onCopyFixPrompt: (prompt: string) => void;
  providerStatus: ProviderStatus;
  automation?: BrowserDiagnostics | null;
  profile: WorkspaceProfile;
  onProfileChange: (profile: WorkspaceProfile) => void;
  onSaveProfile: () => void;
  profileSaving: boolean;
  userDisplayName?: string;
  userPhotoURL?: string;
}

export function WorkspacePage(props: WorkspacePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const sectionMap: Record<string, string> = {
    dashboard: "workspace-dashboard",
    analyze: "workspace-analyze",
    live: "workspace-live",
    reports: "workspace-reports",
    profile: "workspace-profile",
    settings: "workspace-settings",
  };

  const routeSection = location.pathname.split("/workspace/")[1]?.split("/")[0] || "dashboard";
  const activeSection = sectionMap[routeSection] || "workspace-dashboard";

  useEffect(() => {
    if (location.pathname === "/workspace" || location.pathname === "/workspace/") {
      navigate("/workspace/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");

    const updateLayout = () => {
      setIsDesktop(media.matches);
      if (media.matches) setIsMobileSidebarOpen(false);
    };

    updateLayout();
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);

  return (
    <section className="fs-layout">
      <MobileTopbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
      <Sidebar
        onToggleCompare={props.onToggleCompare}
        compareEnabled={props.compareEnabled}
        reportCount={props.reportCount}
        userEmail={props.userEmail}
        userDisplayName={props.userDisplayName}
        userPhotoURL={props.userPhotoURL}
        onSignOut={props.onSignOut}
        onOpenAuth={props.onOpenAuth}
        logoSrc={props.logoSrc}
        activeSection={activeSection}
        isOpen={isDesktop ? true : isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        forceDesktop={isDesktop}
      />

      <main className="fs-main">
        {routeSection === "dashboard" && (
          <OverviewPanel
            history={props.history}
            loading={props.loading}
            report={props.report}
            reportCount={props.reportCount}
            providerStatus={props.providerStatus}
            userEmail={props.userEmail}
            userDisplayName={props.userDisplayName}
            userPhotoURL={props.userPhotoURL}
          />
        )}

        {routeSection === "analyze" && (
          <>
            <InputPanel
              url={props.url}
              onUrlChange={props.onUrlChange}
              onAnalyze={props.onAnalyze}
              loading={props.loading}
              history={props.history}
              onLoadHistory={props.onLoadHistory}
            />
            {props.compareEnabled && (
              <ComparePanel
                leftUrl={props.leftUrl}
                rightUrl={props.rightUrl}
                onLeftChange={props.onLeftChange}
                onRightChange={props.onRightChange}
                onCompare={props.onCompare}
                loading={props.loading}
                result={props.compareResult}
              />
            )}
            <LivePanel logs={props.logs} stageIndex={props.stageIndex} counters={props.counters} report={props.report} automation={props.automation} />
          </>
        )}

        {routeSection === "reports" && (
          <>
            <section id="workspace-history" className="panel">
              <div className="label-xs">Reports / history</div>
              <div className="panel-title">Saved analyses</div>
              <div className="panel-subtitle">Select any saved report from your backend history to inspect details.</div>
              {props.history.length ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {props.history.map((entry) => (
                    <button
                      key={entry.id}
                      className="btn history-entry-btn"
                      onClick={() => props.onLoadHistory(entry)}
                    >
                      {new URL(entry.url).hostname} · UX {entry.uxScore} · {new Date(entry.analyzedAt).toLocaleString()}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overview-meta" style={{ marginTop: 10 }}>No saved reports yet. Run an audit from Analyze.</div>
              )}
            </section>
            {props.report && (
              <ResultsPanel
                report={props.report}
                onCopy={props.onCopySummary}
                onExportText={props.onExportText}
                onExportPdf={props.onExportPdf}
                onExportJson={props.onExportJson}
                onCopyFixPrompt={props.onCopyFixPrompt}
              />
            )}
          </>
        )}

        {routeSection === "live" && (
          <>
            <section className="panel">
              <div className="label-xs">Live audits</div>
              <div className="panel-title">Execution monitor</div>
              <div className="panel-subtitle">Track active audit progress and execution status in real time.</div>
            </section>
            <LivePanel logs={props.logs} stageIndex={props.stageIndex} counters={props.counters} report={props.report} automation={props.automation} />
          </>
        )}

        {routeSection === "profile" && (
          <ProfilePanel
            profile={props.profile}
            userEmail={props.userEmail}
            userPhotoURL={props.userPhotoURL}
            onProfileChange={props.onProfileChange}
            onSaveProfile={props.onSaveProfile}
            saving={props.profileSaving}
          />
        )}

        {routeSection === "settings" && (
          <SettingsPanel
            providerStatus={props.providerStatus}
            compareEnabled={props.compareEnabled}
            onToggleCompare={props.onToggleCompare}
            userEmail={props.userEmail}
          />
        )}
      </main>
      <FloatingChatbot enabled={Boolean(props.userEmail)} />
    </section>
  );
}
