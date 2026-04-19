import { Files, Interfaces, Misc } from "doodle-icons";

export const navItems = [
  { to: "/", label: "Home", icon: Interfaces.Home, end: true },
  { to: "/workspace", label: "Workspace", icon: Interfaces.Dashboard },
  { to: "/docs", label: "Docs", icon: Files.FileNotes },
  { to: "/about", label: "About", icon: Interfaces.Info },
] as const;

export const landingHighlights = [
  {
    label: "Analyses saved",
    value: "Synced",
    note: "Keeps local and cloud history in one place.",
  },
  {
    label: "Signal categories",
    value: "Real scans",
    note: "Navigation, accessibility, performance, responsiveness, and more.",
  },
  {
    label: "Turnaround",
    value: "Live",
    note: "Designed for fast triage before launch reviews.",
  },
] as const;

export const featureCards = [
  {
    title: "Autonomous path scanning",
    body: "Simulates user movement across discovery, CTA, and conversion checkpoints without leaving the dashboard.",
    icon: Interfaces.Zap,
  },
  {
    title: "Implementation-ready fixes",
    body: "Every issue includes a builder prompt you can move into Cursor, Linear, or your PR immediately.",
    icon: Interfaces.Checklist,
  },
  {
    title: "Side-by-side comparison",
    body: "Measure two URLs against the same heuristics so teams can compare versions instead of debating them.",
    icon: Interfaces.Sync,
  },
  {
    title: "AI visibility",
    body: "The workspace shows when provider-backed reasoning is live and which model responded.",
    icon: Misc.Bot,
  },
] as const;

export const docsSections = [
  {
    title: "Getting started",
    body: "Open Workspace, paste a URL, and run an analysis. FlowSense logs each execution stage and returns a structured UX report with copy-ready prompts.",
  },
  {
    title: "Comparison mode",
    body: "Compare two experiences side by side to see which version reduces friction and how large the score delta is.",
  },
  {
    title: "Exports",
    body: "Copy a plain-text summary or export JSON and PDF reports to share findings across product, design, and engineering workflows.",
  },
  {
    title: "Continuous hooks",
    body: "Use deployment and PR merge webhooks to trigger analysis automatically after releases or merge events.",
  },
] as const;

export const aboutPoints = [
  "FlowSense.ai is built for product teams that want quick UX diagnostics without losing implementation detail.",
  "The app combines simulation, heuristics, optional provider-backed AI reasoning, and exports in a single workspace.",
  "This refactor moves the product into a cleaner dashboard layout so future features can be added without growing App.tsx again.",
] as const;
