import {
  atlasPresidentState,
  presidentMemory,
  presidentDepartments,
  presidentTasks
} from "../../lib/atlas-president";
import { getAllArticles, getPublishedArticles, getDraftArticles } from "../../lib/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI President OS",
  description: "Executive operating layer of Atlas Media Network."
};

export default async function PresidentPage() {
  const allArticles = await getAllArticles();
  const publishedArticles = await getPublishedArticles();
  const draftArticles = await getDraftArticles();

  return (
    <main style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 52, margin: "18px 0 10px" }}>AI President OS</h1>
      <p style={{ fontSize: 18, opacity: 0.82, maxWidth: 860 }}>
        Executive command layer for Atlas Media Network, operating under founder-led governance.
      </p>

      <section style={sectionStyle}>
        <div style={gridStyle}>
          <Card title="System" value={atlasPresidentState.system.name} />
          <Card title="Version" value={atlasPresidentState.system.version} />
          <Card title="Mode" value={atlasPresidentState.system.mode} />
          <Card title="Status" value={atlasPresidentState.system.status} />
          <Card title="Total Articles" value={String(allArticles.length)} />
          <Card title="Published" value={String(publishedArticles.length)} />
          <Card title="Drafts" value={String(draftArticles.length)} />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Founder Rule</h2>
        <article style={panelStyle}>
          <p style={{ margin: 0 }}>{atlasPresidentState.founderRule}</p>
        </article>
      </section>

      <section style={sectionStyle}>
        <h2>Strategic Priorities</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {atlasPresidentState.priorities.map((priority) => (
            <article key={priority} style={panelStyle}>{priority}</article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Board Status</h2>
        <div style={gridStyle}>
          {Object.entries(atlasPresidentState.boardStatus).map(([key, value]) => (
            <Card key={key} title={formatKey(key)} value={value} />
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Department Oversight</h2>
        <div style={gridStyle}>
          {presidentDepartments.map((department) => (
            <article key={department.id} style={panelStyle}>
              <div style={{ fontSize: 12, opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
                {department.status}
              </div>
              <h3 style={{ marginBottom: 8 }}>{department.name}</h3>
              <p style={{ opacity: 0.82, margin: 0 }}>{department.focus}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>President Memory</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {presidentMemory.map((memory) => (
            <article key={memory.id} style={panelStyle}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={tagStyle}>{memory.type}</span>
                <span style={tagStyle}>{memory.priority}</span>
              </div>
              <h3 style={{ margin: "0 0 8px" }}>{memory.title}</h3>
              <p style={{ opacity: 0.82, margin: 0 }}>{memory.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Current Tasks</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {presidentTasks.map((task) => (
            <article key={task.id} style={panelStyle}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={tagStyle}>{task.status}</span>
                <span style={tagStyle}>{task.owner}</span>
              </div>
              <h3 style={{ margin: 0 }}>{task.title}</h3>
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
      <div style={{ fontSize: 22, marginTop: 10 }}>{value}</div>
    </article>
  );
}

function formatKey(value) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());
}

const sectionStyle = { marginTop: 40 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 };
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
