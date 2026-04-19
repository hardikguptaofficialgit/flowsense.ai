import { NavLink } from "react-router-dom";
import { featureCards, landingHighlights } from "../data/dashboard";
import type { ConfigResponse } from "../types";

interface HomePageProps {
  providers: ConfigResponse["providers"];
  reportCount: number;
  onOpenAuth: () => void;
}

export function HomePage({ providers, reportCount, onOpenAuth }: HomePageProps) {
  const liveProviders = Object.entries(providers).filter(([, enabled]) => enabled);

  return (
    <div className="home-grid">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Autonomous UX intelligence</p>
          <h1>See your product through real user eyes without the empty-space landing page.</h1>
          <p>
            FlowSense now opens into a tighter pastel dashboard experience with faster access to workspace tools,
            recent runs, provider health, and export-ready results.
          </p>
          <div className="hero-actions">
            <NavLink to="/workspace" className="button-link">
              Open workspace
            </NavLink>
            <button className="button-link button-link--secondary" onClick={onOpenAuth}>
              Sign in
            </button>
          </div>
        </div>

        <div className="hero-preview">
          <div className="preview-card preview-card--primary">
            <span>Balanced landing layout</span>
            <strong>New two-column hero</strong>
            <p>Content, status, and preview cards now share the first viewport instead of leaving a large empty right side.</p>
          </div>
          <div className="preview-card">
            <span>Live AI health</span>
            <strong>{liveProviders.length} providers configured</strong>
            <p>{liveProviders.length ? liveProviders.map(([name]) => name).join(", ") : "No providers configured"}</p>
          </div>
          <div className="preview-card">
            <span>Saved analysis history</span>
            <strong>{reportCount} recent reports</strong>
            <p>History can be revisited instantly from the workspace without re-running the full scan.</p>
          </div>
        </div>
      </section>

      <section className="highlight-row">
        {landingHighlights.map((item) => (
          <article key={item.label} className="highlight-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </section>

      <section className="feature-grid">
        {featureCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="feature-card">
              <div className="feature-icon">
                <Icon />
              </div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
