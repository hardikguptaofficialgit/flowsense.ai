import { aboutPoints } from "../data/dashboard";

export function AboutPage() {
  return (
    <div className="page-stack">
      <section className="panel">
        <p className="eyebrow">About</p>
        <h3>What changed in this refactor</h3>
        <p className="panel-copy">
          The app has been reorganized from a single-file implementation into a dashboard-oriented React structure with clearer ownership across layout, pages, utilities, and workspace logic.
        </p>
      </section>

      {aboutPoints.map((point) => (
        <section key={point} className="panel">
          <p className="panel-copy">{point}</p>
        </section>
      ))}
    </div>
  );
}
