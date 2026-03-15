"use client";

import { useState, useEffect } from "react";

const publications = [
  { id: "argentina-post", name: "Argentina Post" },
  { id: "argentina-post-mendoza", name: "Argentina Post Mendoza" }
];

const statusColors = {
  suggested: "#3b82f6",
  approved: "#22c55e",
  rejected: "#ef4444",
  "in-progress": "#f59e0b",
  published: "#8b5cf6"
};

export default function EditorialDirectorPage() {
  const [publication, setPublication] = useState("argentina-post");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [briefsLoading, setBriefsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("generate");

  useEffect(() => {
    if (activeTab === "briefs") loadBriefs();
  }, [activeTab, publication]);

  async function loadBriefs() {
    setBriefsLoading(true);
    try {
      const res = await fetch(`/api/editorial/briefs?publication=${publication}`);
      const data = await res.json();
      if (data.ok) setBriefs(data.briefs);
    } catch {}
    setBriefsLoading(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setErrorMsg(null);
    setSuggestions([]);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/editorial/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-atlas-admin-token": token },
        body: JSON.stringify({ publication, context })
      });
      const data = await res.json();
      if (data.ok) setSuggestions(data.suggestions);
      else setErrorMsg(data.error || "Error al generar sugerencias");
    } catch (e) {
      setErrorMsg(e.message);
    }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/editorial/briefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-atlas-admin-token": token },
      body: JSON.stringify({ id, status })
    });
    loadBriefs();
  }

  const cardStyle = {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 20,
    background: "rgba(255,255,255,0.03)",
    marginBottom: 16
  };

  const btnPrimary = {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14
  };

  const tagStyle = (color) => ({
    background: `${color}22`,
    color,
    border: `1px solid ${color}55`,
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 600
  });

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 14 }}>← Atlas Media Network</a>

      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "18px 0 6px" }}>
        <div style={{
          background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
          borderRadius: 12, width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
        }}>🎯</div>
        <div>
          <h1 style={{ fontSize: 36, margin: 0 }}>AI Editorial Director</h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>Sugerencias de temas • Asignación de periodistas • Briefs editoriales</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "28px 0 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {[{ id: "generate", label: "Generar sugerencias" }, { id: "briefs", label: "Briefs guardados" }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: "none", border: "none",
            color: activeTab === tab.id ? "#3b82f6" : "#9ca3af",
            cursor: "pointer", padding: "10px 18px", fontSize: 14, fontWeight: 600,
            borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
            marginBottom: -1
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "generate" && (
        <div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>Configurar sesión editorial</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>PUBLICACIÓN</label>
              <select value={publication} onChange={(e) => setPublication(e.target.value)} style={{
                background: "#1e2a3a", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8, padding: "10px 14px", color: "#e5e7eb", fontSize: 14
              }}>
                {publications.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>CONTEXTO EDITORIAL (opcional)</label>
              <textarea value={context} onChange={(e) => setContext(e.target.value)}
                placeholder="Ej: Hay elecciones provinciales esta semana. Enfocarse en economía local..."
                rows={3} style={{
                  width: "100%", background: "#1e2a3a",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                  padding: "10px 14px", color: "#e5e7eb", fontSize: 14,
                  resize: "vertical", boxSizing: "border-box"
                }} />
            </div>
            <button onClick={handleGenerate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Generando..." : "Generar 5 sugerencias con Claude"}
            </button>
          </div>

          {errorMsg && (
            <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 16, color: "#fca5a5" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
              El AI Editorial Director está analizando la agenda...
            </div>
          )}

          {suggestions.length > 0 && (
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>
                {suggestions.length} sugerencias para {publications.find(p => p.id === publication)?.name}
              </h2>
              {suggestions.map((s, i) => (
                <div key={s.id || i} style={cardStyle}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <span style={tagStyle("#3b82f6")}>{s.category}</span>
                    <span style={tagStyle("#8b5cf6")}>{s.tone}</span>
                    <span style={tagStyle("#22c55e")}>{s.journalist}</span>
                  </div>
                  <h3 style={{ margin: "0 0 10px", fontSize: 18, lineHeight: 1.4 }}>{s.title}</h3>
                  <p style={{ margin: "0 0 8px", opacity: 0.8, fontSize: 14, lineHeight: 1.6 }}>{s.brief}</p>
                  <p style={{ margin: 0, opacity: 0.5, fontSize: 13, fontStyle: "italic" }}>
                    Asignado a {s.journalist}: {s.journalist_reason || s.journalistReason}
                  </p>
                </div>
              ))}
              <p style={{ opacity: 0.5, fontSize: 13 }}>✓ Briefs guardados en base de datos.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "briefs" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
            <select value={publication} onChange={(e) => setPublication(e.target.value)} style={{
              background: "#1e2a3a", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, padding: "8px 14px", color: "#e5e7eb", fontSize: 14
            }}>
              {publications.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={loadBriefs} style={{ ...btnPrimary, background: "#374151" }}>↺ Actualizar</button>
          </div>

          {briefsLoading && <p style={{ opacity: 0.5 }}>Cargando briefs...</p>}

          {!briefsLoading && briefs.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>
              No hay briefs para esta publicación.<br />
              <span style={{ fontSize: 13 }}>Generá sugerencias desde la pestaña anterior.</span>
            </div>
          )}

          {briefs.map((b) => (
            <div key={b.id} style={cardStyle}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <span style={tagStyle(statusColors[b.status] || "#6b7280")}>{b.status}</span>
                <span style={tagStyle("#3b82f6")}>{b.category}</span>
                <span style={tagStyle("#22c55e")}>{b.journalist}</span>
                {b.tone && <span style={tagStyle("#8b5cf6")}>{b.tone}</span>}
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{b.title}</h3>
              <p style={{ margin: "0 0 10px", opacity: 0.75, fontSize: 14, lineHeight: 1.6 }}>{b.brief}</p>
              {b.journalist_reason && (
                <p style={{ margin: "0 0 14px", opacity: 0.45, fontSize: 13, fontStyle: "italic" }}>{b.journalist_reason}</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {b.status === "suggested" && (
                  <>
                    <button onClick={() => updateStatus(b.id, "approved")} style={{ ...btnPrimary, background: "#15803d", padding: "6px 14px", fontSize: 13 }}>✓ Aprobar</button>
                    <button onClick={() => updateStatus(b.id, "rejected")} style={{ ...btnPrimary, background: "#991b1b", padding: "6px 14px", fontSize: 13 }}>✗ Rechazar</button>
                  </>
                )}
                {b.status === "approved" && (
                  <button onClick={() => updateStatus(b.id, "in-progress")} style={{ ...btnPrimary, background: "#b45309", padding: "6px 14px", fontSize: 13 }}>→ En progreso</button>
                )}
                <a href={`/admin?title=${encodeURIComponent(b.title)}&publication=${b.publication}&author=${b.journalist_id}&category=${b.category}`}
                  style={{ ...btnPrimary, background: "#4c1d95", padding: "6px 14px", fontSize: 13, textDecoration: "none", display: "inline-block" }}>
                  ✍ Redactar en Admin
                </a>
              </div>
              <p style={{ margin: "10px 0 0", opacity: 0.3, fontSize: 12 }}>
                {new Date(b.created_at).toLocaleString("es-AR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
