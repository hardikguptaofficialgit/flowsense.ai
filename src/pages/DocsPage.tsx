import { docsSections } from "../data/dashboard";
import type { ConfigResponse } from "../types";

export function DocsPage({ config }: { config: ConfigResponse }) {
  return (
    <div className="page-stack">
      <section className="panel">
        <p className="eyebrow">Documentation</p>
        <h3>How the refactored workspace works</h3>
        <p className="panel-copy">
          FlowSense is now organized into focused pages and components, so docs can map directly to the product surface.
        </p>
      </section>

      <section className="docs-grid">
        {docsSections.map((item) => (
          <article key={item.title} className="panel">
            <p className="eyebrow">Guide</p>
            <h3>{item.title}</h3>
            <p className="panel-copy">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">API hooks</p>
        <h3>Continuous monitoring endpoints</h3>
        <p className="panel-copy">Deployment hook: <code>{config.continuousHooks.deployment}</code></p>
        <p className="panel-copy">Pull request hook: <code>{config.continuousHooks.pullRequest}</code></p>
      </section>
    </div>
  );
}
