"use client";
import { useState, useEffect } from "react";

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

const statusColors = { pending:{bg:"#f59e0b22",color:"#f59e0b",border:"#f59e0b44"}, approved:{bg:"#22c55e22",color:"#22c55e",border:"#22c55e44"}, rejected:{bg:"#ef444422",color:"#ef4444",border:"#ef444444"}, spam:{bg:"#6b728022",color:"#6b7280",border:"#6b728044"} };

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  async function loadComments(status) {
    setLoading(true);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/comments?status=" + status, { headers: { "x-atlas-admin-token": token } });
      const data = await res.json();
      if (data.ok) { setComments(data.comments); setSummary(data.summary||{}); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadComments(filter); }, [filter]);

  async function updateStatus(id, status) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/comments", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id, status }) });
    loadComments(filter);
  }

  async function deleteComment(id) {
    if (!confirm("Eliminar?")) return;
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/comments?id=" + id, { method: "DELETE", headers: { "x-atlas-admin-token": token } });
    loadComments(filter);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", paddingBottom: 60 }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/control" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Panel de control</a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Comentarios</span>
          {(summary.pending||0) > 0 && <span style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{summary.pending} pendientes</span>}
        </div>
        <button onClick={() => loadComments(filter)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: "#93c5fd", cursor: "pointer", fontSize: 13 }}>Refrescar</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[{label:"Pendientes",key:"pending",color:"#f59e0b"},{label:"Aprobados",key:"approved",color:"#22c55e"},{label:"Rechazados",key:"rejected",color:"#ef4444"},{label:"Spam",key:"spam",color:"#6b7280"}].map((s,i) => (
            <div key={i} onClick={() => setFilter(s.key)} style={{ border: "1px solid "+(filter===s.key?s.color:"rgba(255,255,255,0.08)"), borderRadius: 10, padding: 14, background: filter===s.key?s.color+"18":"rgba(255,255,255,0.03)", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{summary[s.key]||0}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <p style={{ opacity: 0.5, textAlign: "center", padding: 40 }}>Cargando...</p>}
        {!loading && comments.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><p style={{ fontSize: 18 }}>No hay comentarios {filter === "pending" ? "pendientes" : "aqui"}</p></div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map(comment => {
            const sc = statusColors[comment.status]||statusColors.pending;
            return (
              <div key={comment.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{comment.author_name}</span>
                      <span style={{ fontSize: 12, opacity: 0.4 }}>{comment.author_email}</span>
                      <span style={{ fontSize: 11, opacity: 0.35 }}>{timeAgo(comment.created_at)}</span>
                      <span style={{ background: sc.bg, color: sc.color, border: "1px solid "+sc.border, borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>{comment.status}</span>
                      {comment.moderation_score && <span style={{ fontSize: 11, opacity: 0.4 }}>score: {comment.moderation_score}/10</span>}
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 8px", opacity: 0.85 }}>{comment.content}</p>
                    {comment.article_title && <div style={{ fontSize: 12, opacity: 0.4 }}>En: {comment.article_title}</div>}
                    {comment.moderation_reason && <div style={{ fontSize: 12, opacity: 0.4, marginTop: 4, fontStyle: "italic" }}>IA: {comment.moderation_reason}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                    {comment.status !== "approved" && <button onClick={() => updateStatus(comment.id,"approved")} style={{ background:"#22c55e18",border:"1px solid #22c55e44",borderRadius:8,padding:"5px 10px",color:"#86efac",cursor:"pointer",fontSize:12 }}>Aprobar</button>}
                    {comment.status !== "rejected" && <button onClick={() => updateStatus(comment.id,"rejected")} style={{ background:"#ef444418",border:"1px solid #ef444444",borderRadius:8,padding:"5px 10px",color:"#fca5a5",cursor:"pointer",fontSize:12 }}>Rechazar</button>}
                    {comment.status !== "spam" && <button onClick={() => updateStatus(comment.id,"spam")} style={{ background:"rgba(107,114,128,0.15)",border:"1px solid rgba(107,114,128,0.3)",borderRadius:8,padding:"5px 10px",color:"#9ca3af",cursor:"pointer",fontSize:12 }}>Spam</button>}
                    <button onClick={() => deleteComment(comment.id)} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"5px 10px",color:"#6b7280",cursor:"pointer",fontSize:12 }}>Eliminar</button>
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
