import { useEffect, useState } from "react";
import type { WorkspaceProfile } from "../types";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.39a4.61 4.61 0 0 1-2 3.03v2.51h3.24c1.9-1.75 2.97-4.34 2.97-7.28Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.51c-.9.6-2.05.95-3.37.95-2.59 0-4.79-1.75-5.58-4.1H3.07v2.59A9.99 9.99 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.42 13.91A5.99 5.99 0 0 1 6.1 12c0-.66.11-1.3.32-1.91V7.5H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.07 4.5l3.35-2.59Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.8.5 3.84 1.48l2.88-2.88C16.95 2.91 14.69 2 12 2A9.99 9.99 0 0 0 3.07 7.5l3.35 2.59c.79-2.35 2.99-4.11 5.58-4.11Z" />
    </svg>
  );
}

interface AuthModalProps {
  isOpen: boolean;
  mode: "signin" | "signup";
  email: string;
  password: string;
  loading: boolean;
  error: string;
  enabled: boolean;
  configLoaded: boolean;
  onClose: () => void;
  onModeChange: (mode: "signin" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
}

export function AuthModal(props: AuthModalProps) {
  if (!props.isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card--auth">
        <button type="button" className="modal-close" onClick={props.onClose}>
          ✕
        </button>
        <div className="modal-auth-head">
          <h3>{props.mode === "signin" ? "Welcome back" : "Join FlowSense"}</h3>
          <p className="modal-copy">Save analysis history, sync reports, and keep your workspace profile in one place.</p>
        </div>

        <button type="button" className="google-auth-button" onClick={props.onGoogle} disabled={props.loading || !props.enabled}>
          <span className="google-auth-icon"><GoogleIcon /></span>
          <span>{props.mode === "signin" ? "Continue with Google" : "Sign up with Google"}</span>
        </button>

        <div className="modal-divider">
          <span>or use email</span>
        </div>

        <div className="field-stack">
          <label>
            <span className="field-label">Email address</span>
            <input
              value={props.email || ""}
              onChange={(event) => props.onEmailChange(event.target.value)}
              type="email"
              placeholder="name@company.com"
              disabled={props.loading}
            />
          </label>

          <label>
            <span className="field-label">Password</span>
            <input
              value={props.password || ""}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              type="password"
              placeholder="Minimum 8 characters"
              disabled={props.loading}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button 
            type="button" 
            className="modal-primary-button" 
            onClick={props.onSubmit} 
            disabled={props.loading || !props.email || !props.password}
          >
            {props.loading ? (
              <>
                <span className="spinner" />
                Processing...
              </>
            ) : (
              props.mode === "signin" ? "Sign in" : "Create account"
            )}
          </button>
        </div>

        <button
          type="button"
          className="text-button text-btn"
          onClick={() => props.onModeChange(props.mode === "signin" ? "signup" : "signin")}
          disabled={props.loading}
        >
          {props.mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>

        {props.configLoaded && !props.enabled && <p className="inline-warning">⚠️ Google sign-in is unavailable. Email auth still works.</p>}
        {props.error && <p className="inline-warning">❌ {props.error}</p>}
      </div>
    </div>
  );
}

interface OnboardingModalProps {
  isOpen: boolean;
  profile: WorkspaceProfile;
  loading: boolean;
  error: string;
  enabled: boolean;
  onClose: () => void;
  onProfileChange: (profile: WorkspaceProfile) => void;
  onSubmit: () => void;
}

export function OnboardingModal(props: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (props.isOpen) setStep(0);
  }, [props.isOpen]);

  if (!props.isOpen) return null;

  const canContinueStep1 = Boolean(
    props.profile?.displayName?.trim() &&
    props.profile?.companyName?.trim()
  );

  const canContinueStep2 = Boolean(
    props.profile?.website?.trim() &&
    props.profile?.productUrl?.trim()
  );

  const canComplete = Boolean(
    canContinueStep1 &&
    canContinueStep2 &&
    props.profile?.agentName?.trim()
  );

  const updateProfile = (patch: Partial<WorkspaceProfile>) => {
    props.onProfileChange({ ...props.profile, ...patch });
  };

  const stepTitles = ["Company Info", "Product URLs", "Agent Setup"];
  const stepDescriptions = [
    "Tell us about your organization",
    "Where can we find your product?",
    "Configure your analysis agent"
  ];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card--onboarding">
        <div className="onboarding-header">
          <div>
            <p className="onboarding-eyebrow">Setup Wizard</p>
            <h3 className="onboarding-title">{stepTitles[step]}</h3>
            <p className="onboarding-subtitle">{stepDescriptions[step]}</p>
          </div>
          <button type="button" className="modal-close" onClick={props.onClose}>
            ✕
          </button>
        </div>

        <div className="onboarding-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((step + 1) / 3) * 100}%` }} />
          </div>
          <div className="progress-steps">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`progress-step ${s === step ? "active" : ""} ${s < step ? "completed" : ""}`}>
                <span>{s < step ? "✓" : s + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-content">
          {step === 0 && (
            <div className="field-stack">
              <label>
                <span className="field-label">Your name *</span>
                <input
                  value={props.profile?.displayName || ""}
                  onChange={(event) => updateProfile({ displayName: event.target.value })}
                  placeholder="Jane Doe"
                  disabled={props.loading}
                />
              </label>

              <label>
                <span className="field-label">Company name *</span>
                <input
                  value={props.profile?.companyName || ""}
                  onChange={(event) => updateProfile({ companyName: event.target.value })}
                  placeholder="FlowSense Labs"
                  disabled={props.loading}
                />
              </label>

              <label>
                <span className="field-label">Company stage</span>
                <input
                  value={props.profile?.companyStage || ""}
                  onChange={(event) => updateProfile({ companyStage: event.target.value })}
                  placeholder="e.g., Seed, Growth, Enterprise"
                  disabled={props.loading}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="field-stack">
              <label>
                <span className="field-label">Company website *</span>
                <input
                  value={props.profile?.website || ""}
                  onChange={(event) => updateProfile({ website: event.target.value })}
                  placeholder="https://company.com"
                  disabled={props.loading}
                />
              </label>

              <label>
                <span className="field-label">Product URL *</span>
                <input
                  value={props.profile?.productUrl || ""}
                  onChange={(event) => updateProfile({ productUrl: event.target.value })}
                  placeholder="https://company.com/app"
                  disabled={props.loading}
                />
              </label>

              <label>
                <span className="field-label">Other important URLs</span>
                <textarea
                  value={props.profile?.relevantUrls || ""}
                  onChange={(event) => updateProfile({ relevantUrls: event.target.value })}
                  placeholder="Homepage, pricing, docs, signup, help center (one per line)"
                  disabled={props.loading}
                  rows={4}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="field-stack">
              <label>
                <span className="field-label">Agent name *</span>
                <input
                  value={props.profile?.agentName || ""}
                  onChange={(event) => updateProfile({ agentName: event.target.value })}
                  placeholder="e.g., Scout, Explorer, Analyst"
                  disabled={props.loading}
                />
              </label>

              <label>
                <span className="field-label">Agent mode/focus</span>
                <input
                  value={props.profile?.agentMode || ""}
                  onChange={(event) => updateProfile({ agentMode: event.target.value })}
                  placeholder="e.g., UX audit, Conversion review, Design QA"
                  disabled={props.loading}
                />
              </label>

              <label>
                <span className="field-label">Agent instructions</span>
                <textarea
                  value={props.profile?.agentNotes || ""}
                  onChange={(event) => updateProfile({ agentNotes: event.target.value })}
                  placeholder="What should this agent prioritize? Any specific areas to focus on?"
                  disabled={props.loading}
                  rows={4}
                />
              </label>
            </div>
          )}
        </div>

        <div className="modal-actions modal-actions--onboarding">
          <button 
            type="button" 
            className="secondary" 
            onClick={() => setStep((current) => Math.max(current - 1, 0))} 
            disabled={step === 0 || props.loading}
          >
            ← Back
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current + 1)}
              disabled={!(step === 0 ? canContinueStep1 : canContinueStep2) || props.loading}
            >
              Next →
            </button>
          ) : (
            <button 
              type="button" 
              onClick={props.onSubmit} 
              disabled={props.loading || !canComplete}
              className="modal-primary-button"
            >
              {props.loading ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                "Complete Setup"
              )}
            </button>
          )}
        </div>

        {props.error && <p className="inline-warning">❌ {props.error}</p>}
      </div>
    </div>
  );
}