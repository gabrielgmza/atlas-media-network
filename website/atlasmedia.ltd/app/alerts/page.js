"use client";
import { useState, useEffect } from "react";

const typeLabels = { pipeline_failure: "Pipeline", breaking_news: "Breaking", no_content: "Sin contenido", system_error: "Error sistema", expansion: "Expansion", custom: "Custom" };
const severityColors = { low: { bg: "#6b728022", color: "#9ca3af", border: "#6b728044" }, medium: { bg: "#f59e0b22", color: "#fbbf24", border: "#f59e0b44" }, high: { bg: "#f9731622", color: "#fb923c", border: "#f9731644" }, critical: { bg: "#ef444422", color: "#f87171", border: "#ef444444" } };

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function loadAlerts() {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.ok) { setAlerts(data.alerts); setSummary(data.summary); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAlerts(); const i = setInterval(loadAlerts, 30000); return () => clearInterval(i); }, []);

  async function markRead(id) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id, status: "read" }) });
    loadAlerts();
  }

  async function markResolved(id) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id, status: "resolved" }) });
    loadAlerts();
  }

  async function markAllRead() {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ markAllRead: true }) });
    loadAlerts();
  }

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.status === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", paddingBottom: 60 }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/control" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Panel de control</a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Alertas</span>
          {(summary.new || 0) > 0 && <span style={{ background: "#ef444422", color: "#f87171", border: "1px solid #ef444444", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{summary.new} nuevas</span>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {(summary.new || 0) > 0 && <button onClick={markAllRead} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: "#9ca3af", cursor: "pointer", fontSize: 13 }}>Marcar todas como leidas</button>}
          <button onClick={loadAlerts} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: "#93c5fd", cursor: "pointer", fontSize: 13 }}>Refrescar</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginBottom: 24 }}>
          {[{ label: "Nuevas", value: summary.new || 0, color: "#ef4444" }, { label: "Leidas", value: summary.read || 0, color: "#f59e0b" }, { label: "Resueltas", value: summary.resolved || 0, color: "#22c55e" }].map((s, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {["all","new","read","resolved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "rgba(255,255,255,0.1)" : "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 16px", color: filter === f ? "#fff" : "#9ca3af", cursor: "pointer", fontSize: 13 }}>
              {f === "all" ? "Todas" : f === "new" ? "Nuevas" : f === "read" ? "Leidas" : "Resueltas"}
            </button>
          ))}
        </div>

        {loading && <p style={{ opacity: 0.5, textAlign: "center", padding: 40 }}>Cargando alertas...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>
            <p style={{ fontSize: 20 }}>{filter === "new" ? "Sin alertas nuevas" : "Sin alertas"}</p>
            <p style={{ fontSize: 14 }}>El sistema monitorea automaticamente el pipeline y detecta breaking news</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(alert => {
            const sc = severityColors[alert.severity] || severityColors.medium;
            return (
              <div key={alert.id} style={{ border: "1px solid " + (alert.status === "new" ? sc.border : "rgba(255,255,255,0.08)"), borderLeft: "3px solid " + sc.color, borderRadius: 12, padding: "16px 18px", background: alert.status === "new" ? sc.bg : "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ background: sc.bg, color: sc.color, border: "1px solid " + sc.border, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{alert.severity}</span>
                      <span style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{typeLabels[alert.type] || alert.type}</span>
                      {alert.publication_name && <span style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{alert.publication_name}</span>}
                      {alert.email_sent && <span style={{ background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>Email enviado</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{alert.title}</div>
                    {alert.detail && <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.5 }}>{alert.detail}</div>}
                    <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6 }}>{timeAgo(alert.created_at)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {alert.status === "new" && <button onClick={() => markRead(alert.id)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 10px", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}>Leida</button>}
                    {alert.status !== "resolved" && <button onClick={() => markResolved(alert.id)} style={{ background: "#22c55e18", border: "1px solid #22c55e44", borderRadius: 8, padding: "5px 10px", color: "#86efac", cursor: "pointer", fontSize: 12 }}>Resolver</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
