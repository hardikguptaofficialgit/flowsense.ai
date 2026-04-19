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
        <button className="modal-close" onClick={props.onClose}>
          Close
        </button>
        <div className="modal-auth-head">
         
          <h3>{props.mode === "signin" ? "Sign in to FlowSense" : "Create your FlowSense account"}</h3>
          <p className="modal-copy">Save analysis history, sync reports, and keep your workspace profile in one place.</p>
        </div>

        <button className="google-auth-button" onClick={props.onGoogle} disabled={props.loading || !props.enabled}>
          <span className="google-auth-icon"><GoogleIcon /></span>
          <span>{props.mode === "signin" ? "Continue with Google" : "Sign up with Google"}</span>
        </button>

        <div className="modal-divider">
          <span>or use email</span>
        </div>

        <div className="field-stack">
          <label>
            Email
            <input
              value={props.email}
              onChange={(event) => props.onEmailChange(event.target.value)}
              type="email"
              placeholder="name@company.com"
            />
          </label>

          <label>
            Password
            <input
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              type="password"
              placeholder="Minimum secure password"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="modal-primary-button" onClick={props.onSubmit} disabled={props.loading || !props.enabled}>
            {props.loading ? "Processing..." : props.mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>

        <button
          className="text-button"
          onClick={() => props.onModeChange(props.mode === "signin" ? "signup" : "signin")}
        >
          {props.mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>

        {!props.enabled && <p className="inline-warning">Firebase auth is currently unavailable.</p>}
        {props.error && <p className="inline-warning">{props.error}</p>}
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

  const canContinue =
    props.profile.displayName.trim() &&
    props.profile.companyName.trim() &&
    props.profile.website.trim() &&
    props.profile.productUrl.trim() &&
    props.profile.agentName.trim();

  const updateProfile = (patch: Partial<WorkspaceProfile>) => {
    props.onProfileChange({ ...props.profile, ...patch });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card--wide">
        <button className="modal-close" onClick={props.onClose}>
          Close
        </button>
        <p className="eyebrow">Onboarding</p>
        <h3>Set up your workspace</h3>
        <p className="modal-copy">Collect the company, startup, and agent details FlowSense uses for routing, reporting, and analysis.</p>

        <div className="onboarding-steps">
          <span className={step >= 0 ? "active" : ""}>1. Company</span>
          <span className={step >= 1 ? "active" : ""}>2. Startup</span>
          <span className={step >= 2 ? "active" : ""}>3. Agents</span>
        </div>

        {step === 0 && (
          <div className="field-stack">
            <label>
              Your name
              <input
                value={props.profile.displayName}
                onChange={(event) => updateProfile({ displayName: event.target.value })}
                placeholder="Jane Doe"
              />
            </label>

            <label>
              Company name
              <input
                value={props.profile.companyName}
                onChange={(event) => updateProfile({ companyName: event.target.value })}
                placeholder="FlowSense Labs"
              />
            </label>

            <label>
              Company stage
              <input
                value={props.profile.companyStage}
                onChange={(event) => updateProfile({ companyStage: event.target.value })}
                placeholder="Idea, seed, growth, enterprise"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="field-stack">
            <label>
              Company website
              <input
                value={props.profile.website}
                onChange={(event) => updateProfile({ website: event.target.value })}
                placeholder="https://company.com"
              />
            </label>

            <label>
              Product URL
              <input
                value={props.profile.productUrl}
                onChange={(event) => updateProfile({ productUrl: event.target.value })}
                placeholder="https://company.com/app"
              />
            </label>

            <label>
              Relevant URLs
              <textarea
                value={props.profile.relevantUrls}
                onChange={(event) => updateProfile({ relevantUrls: event.target.value })}
                placeholder="Homepage, pricing, docs, signup, help center"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="field-stack">
            <label>
              Agent name
              <input
                value={props.profile.agentName}
                onChange={(event) => updateProfile({ agentName: event.target.value })}
                placeholder="FlowSense Scout"
              />
            </label>

            <label>
              Agent mode
              <input
                value={props.profile.agentMode}
                onChange={(event) => updateProfile({ agentMode: event.target.value })}
                placeholder="UX audit, conversion review, design QA"
              />
            </label>

            <label>
              Agent notes
              <textarea
                value={props.profile.agentNotes}
                onChange={(event) => updateProfile({ agentNotes: event.target.value })}
                placeholder="Anything the agent should prioritize while analyzing your workspace"
              />
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || props.loading}>
            Back
          </button>
          {step < 2 ? (
            <button onClick={() => setStep((current) => current + 1)} disabled={!canContinue || props.loading}>
              Continue
            </button>
          ) : (
            <button onClick={props.onSubmit} disabled={props.loading || !props.enabled || !canContinue}>
              {props.loading ? "Saving..." : "Complete onboarding"}
            </button>
          )}
        </div>

        {props.error && <p className="inline-warning">{props.error}</p>}
      </div>
    </div>
  );
}
