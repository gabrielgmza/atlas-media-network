import {
  atlasPresidentState,
  presidentDepartments,
  presidentTasks,
  getPresidentMemory,
  getPresidentDecisions
} from "../../lib/atlas-president";
import { getAllArticles, getPublishedArticles, getDraftArticles } from "../../lib/articles";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI President OS",
  description: "Executive operating layer of Atlas Media Network."
};

async function createMemoryAction(formData) {
  "use server";

  const type = String(formData.get("type") || "note").trim();
  const title = String(formData.get("title") || "").trim();
  const detail = String(formData.get("detail") || "").trim();
  const priority = String(formData.get("priority") || "medium").trim();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch(`${baseUrl}/api/president/console`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-admin-token": process.env.ATLAS_ADMIN_TOKEN || ""
    },
    body: JSON.stringify({
      kind: "memory",
      type,
      title,
      detail,
      priority
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirect("/president?error=memory");
  }

  revalidatePath("/president");
  revalidatePath("/api/president/status");
  redirect("/president?success=memory");
}

async function createDecisionAction(formData) {
  "use server";

  const title = String(formData.get("title") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const rationale = String(formData.get("rationale") || "").trim();
  const status = String(formData.get("status") || "approved").trim();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch(`${baseUrl}/api/president/console`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-admin-token": process.env.ATLAS_ADMIN_TOKEN || ""
    },
    body: JSON.stringify({
      kind: "decision",
      title,
      decision,
      rationale,
      status
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirect("/president?error=decision");
  }

  revalidatePath("/president");
  revalidatePath("/api/president/status");
  redirect("/president?success=decision");
}

export default async function PresidentPage({ searchParams }) {
  const allArticles = await getAllArticles();
  const publishedArticles = await getPublishedArticles();
  const draftArticles = await getDraftArticles();
  const memory = await getPresidentMemory();
  const decisions = await getPresidentDecisions();

  const success = typeof searchParams?.success === "string" ? searchParams.success : "";
  const error = typeof searchParams?.error === "string" ? searchParams.error : "";

  return (
    <main style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 52, margin: "18px 0 10px" }}>AI President OS</h1>
      <p style={{ fontSize: 18, opacity: 0.82, maxWidth: 860 }}>
        Executive command layer for Atlas Media Network, operating under founder-led governance.
      </p>

      {success ? (
        <div style={successStyle}>
          {success === "memory" && "President memory registered successfully."}
          {success === "decision" && "President decision registered successfully."}
        </div>
      ) : null}

      {error ? (
        <div style={errorStyle}>
          {error === "memory" && "Failed to register president memory."}
          {error === "decision" && "Failed to register president decision."}
        </div>
      ) : null}

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
        <h2>President Console</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <form action={createMemoryAction} style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Register Memory</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <select name="type" style={fieldStyle} defaultValue="decision">
                <option value="decision">decision</option>
                <option value="governance">governance</option>
                <option value="infrastructure">infrastructure</option>
                <option value="note">note</option>
              </select>
              <input name="title" placeholder="Memory title" required style={fieldStyle} />
              <textarea name="detail" placeholder="Memory detail" rows={5} required style={{ ...fieldStyle, resize: "vertical" }} />
              <select name="priority" style={fieldStyle} defaultValue="medium">
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
              <button type="submit" style={buttonStyle}>Save memory</button>
            </div>
          </form>

          <form action={createDecisionAction} style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Register Decision</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <input name="title" placeholder="Decision title" required style={fieldStyle} />
              <textarea name="decision" placeholder="Decision" rows={4} required style={{ ...fieldStyle, resize: "vertical" }} />
              <textarea name="rationale" placeholder="Rationale" rows={4} style={{ ...fieldStyle, resize: "vertical" }} />
              <select name="status" style={fieldStyle} defaultValue="approved">
                <option value="approved">approved</option>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
              </select>
              <button type="submit" style={buttonStyle}>Save decision</button>
            </div>
          </form>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>President Memory</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {memory.map((item) => (
            <article key={item.id} style={panelStyle}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={tagStyle}>{item.type}</span>
                <span style={tagStyle}>{item.priority}</span>
              </div>
              <h3 style={{ margin: "0 0 8px" }}>{item.title}</h3>
              <p style={{ opacity: 0.82, margin: 0 }}>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Decision Register</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {decisions.map((item) => (
            <article key={item.id} style={panelStyle}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={tagStyle}>{item.status}</span>
              </div>
              <h3 style={{ margin: "0 0 8px" }}>{item.title}</h3>
              <p style={{ margin: "0 0 8px" }}><strong>Decision:</strong> {item.decision}</p>
              <p style={{ opacity: 0.82, margin: 0 }}><strong>Rationale:</strong> {item.rationale}</p>
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
const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  font: "inherit"
};
const buttonStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  cursor: "pointer"
};
const successStyle = {
  marginTop: 24,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(34,197,94,0.35)",
  background: "rgba(34,197,94,0.12)",
  color: "#dcfce7"
};
const errorStyle = {
  marginTop: 24,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.12)",
  color: "#fecaca"
};
