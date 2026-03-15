import { executiveBoard, aiDepartments } from "../../lib/atlas-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Executive AI Board",
  description: "Executive AI structure of Atlas Media Network."
};

export default function ExecutiveBoardPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 52, margin: "18px 0 10px" }}>Executive AI Board</h1>
      <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 820 }}>
        Operational command structure led by the AI President across editorial, growth, compliance, technology, and monetization.
      </p>

      <section style={{ marginTop: 36 }}>
        <div style={gridStyle}>
          {executiveBoard.map((member) => (
            <article key={member.id} style={panelStyle}>
              <div style={{ fontSize: 12, opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
                {member.department}
              </div>
              <h2 style={{ marginBottom: 8 }}>{member.name}</h2>
              <p style={{ marginTop: 0, opacity: 0.82 }}><strong>{member.role}</strong></p>
              <p style={{ opacity: 0.82 }}>{member.mission}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2>AI Departments</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {aiDepartments.map((department) => (
            <span key={department} style={tagStyle}>{department}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 };
const panelStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 20,
  background: "rgba(255,255,255,0.03)"
};
const tagStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)"
};
