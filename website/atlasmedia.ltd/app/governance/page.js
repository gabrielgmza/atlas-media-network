import { atlasGovernance, atlasPublications } from "../../lib/atlas-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Atlas Governance",
  description: "Internal governance model of Atlas Media Network."
};

export default function GovernancePage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 52, margin: "18px 0 10px" }}>Atlas Governance</h1>
      <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 820 }}>
        Internal governance structure for the holding, publications, and executive AI operations.
      </p>

      <section style={sectionStyle}>
        <h2>Holding</h2>
        <div style={gridStyle}>
          <Card title="Name" value={atlasGovernance.holding.name} />
          <Card title="Domain" value={atlasGovernance.holding.domain} />
          <Card title="Model" value={atlasGovernance.holding.model} />
          <Card title="Public Positioning" value={atlasGovernance.holding.publicPositioning} />
          <Card title="AI Visibility" value={atlasGovernance.holding.publicAIVisibility} />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Governance Rule</h2>
        <article style={panelStyle}>
          <p><strong>Command model:</strong> {atlasGovernance.governance.commandModel}</p>
          <p><strong>AI President rule:</strong> {atlasGovernance.governance.aiPresidentRule}</p>
          <p><strong>Mission:</strong> {atlasGovernance.governance.mission}</p>
        </article>
      </section>

      <section style={sectionStyle}>
        <h2>Divisions</h2>
        <div style={gridStyle}>
          {atlasGovernance.divisions.map((division) => (
            <article key={division.id} style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>{division.name}</h3>
              <p style={{ opacity: 0.82 }}>{division.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Pilot Publications</h2>
        <div style={gridStyle}>
          {atlasPublications.map((publication) => (
            <article key={publication.id} style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>{publication.name}</h3>
              <p><strong>Scope:</strong> {publication.scope}</p>
              <p style={{ opacity: 0.82 }}>{publication.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {publication.categories.map((category) => (
                  <span key={category} style={tagStyle}>{category}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }) {
  return (
    <article style={panelStyle}>
      <div style={{ fontSize: 12, opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </div>
      <div style={{ fontSize: 20, marginTop: 10 }}>{value}</div>
    </article>
  );
}

const sectionStyle = { marginTop: 40 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 };
const panelStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 20,
  background: "rgba(255,255,255,0.03)"
};
const tagStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)"
};
