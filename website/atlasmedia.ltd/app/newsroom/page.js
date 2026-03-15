import { newsroomRoster, atlasPublications } from "../../lib/atlas-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Newsroom",
  description: "Internal newsroom roster and editorial identity."
};

export default function NewsroomPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 52, margin: "18px 0 10px" }}>AI Newsroom</h1>
      <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 820 }}>
        Human-like editorial roster with differentiated signatures, tone, and publication assignment.
      </p>

      <section style={{ marginTop: 36 }}>
        <h2>Publication Map</h2>
        <div style={gridStyle}>
          {atlasPublications.map((publication) => (
            <article key={publication.id} style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>{publication.name}</h3>
              <p><strong>Scope:</strong> {publication.scope}</p>
              <p style={{ opacity: 0.82 }}>{publication.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 42 }}>
        <h2>Journalist Roster</h2>
        <div style={gridStyle}>
          {newsroomRoster.map((journalist) => (
            <article key={journalist.id} style={panelStyle}>
              <div style={{ fontSize: 12, opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
                {journalist.publication}
              </div>
              <h3 style={{ marginBottom: 8 }}>{journalist.name}</h3>
              <p style={{ marginTop: 0 }}><strong>{journalist.role}</strong></p>
              <p><strong>Style:</strong> {journalist.style}</p>
              <p><strong>Tone:</strong> {journalist.tone}</p>
              <p><strong>Signature:</strong> {journalist.signature}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 };
const panelStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 20,
  background: "rgba(255,255,255,0.03)"
};
