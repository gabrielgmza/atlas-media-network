"use client";
import { useState, useEffect } from "react";

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + " min";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + " horas";
  return new Date(date).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export default function Comments({ articleId, articleSlug, publicationId, accentColor = "#cc0000" }) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function loadComments() {
    try {
      const res = await fetch("/api/comments?article=" + articleSlug);
      const data = await res.json();
      if (data.ok) { setComments(data.comments); setTotal(data.total); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadComments(); }, [articleSlug]);

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setResult(null);
    try {
      const res = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId, articleSlug, publicationId, ...form }) });
      const data = await res.json();
      if (data.ok) { setResult({ type: data.status === "approved" ? "success" : "warning", text: data.message }); if (data.status === "approved") { setForm({ authorName: "", authorEmail: "", content: "" }); loadComments(); } }
      else setResult({ type: "error", text: data.error });
    } catch { setResult({ type: "error", text: "Error al enviar." }); }
    setSubmitting(false);
  }

  const inputStyle = { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #eee" }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 24px", fontFamily: "Georgia, serif" }}>
        Comentarios {total > 0 && <span style={{ fontSize: 14, opacity: 0.5, fontWeight: 400 }}>({total})</span>}
      </h3>

      {loading && <p style={{ opacity: 0.4, fontSize: 14, fontFamily: "Arial, sans-serif" }}>Cargando comentarios...</p>}
      {!loading && comments.length === 0 && <p style={{ opacity: 0.5, fontSize: 14, fontFamily: "Arial, sans-serif", marginBottom: 32 }}>Se el primero en comentar.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
        {comments.map(comment => (
          <div key={comment.id} style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: accentColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0, fontFamily: "Arial" }}>{comment.author_name?.charAt(0)?.toUpperCase()||"A"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "Arial, sans-serif" }}>{comment.author_name}</span>
                <span style={{ fontSize: 12, opacity: 0.4, fontFamily: "Arial, sans-serif" }}>{timeAgo(comment.created_at)}</span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0, color: "#333" }}>{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#f8f8f8", borderRadius: 12, padding: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", fontFamily: "Georgia, serif" }}>Dejar un comentario</h4>
        {result && <div style={{ background: result.type==="success"?"#22c55e18":result.type==="warning"?"#f59e0b18":"#ef444418", border:"1px solid "+(result.type==="success"?"#22c55e44":result.type==="warning"?"#f59e0b44":"#ef444444"), borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:14, color:result.type==="success"?"#166534":result.type==="warning"?"#92400e":"#dc2626", fontFamily:"Arial, sans-serif" }}>{result.text}</div>}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6,fontFamily:"Arial, sans-serif" }}>NOMBRE *</label><input value={form.authorName} onChange={e=>setForm(f=>({...f,authorName:e.target.value}))} placeholder="Tu nombre" required style={inputStyle}/></div>
            <div><label style={{ display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6,fontFamily:"Arial, sans-serif" }}>EMAIL *</label><input type="email" value={form.authorEmail} onChange={e=>setForm(f=>({...f,authorEmail:e.target.value}))} placeholder="tu@email.com (no se publica)" required style={inputStyle}/></div>
          </div>
          <div>
            <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6,fontFamily:"Arial, sans-serif" }}>COMENTARIO *</label>
            <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Tu opinion sobre este articulo..." required rows={4} minLength={5} maxLength={2000} style={{...inputStyle,resize:"vertical"}}/>
            <div style={{ fontSize:11,opacity:0.4,marginTop:4,fontFamily:"Arial, sans-serif",textAlign:"right" }}>{form.content.length}/2000</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <p style={{ fontSize:11,opacity:0.4,margin:0,fontFamily:"Arial, sans-serif" }}>Los comentarios son moderados automaticamente.</p>
            <button type="submit" disabled={submitting} style={{ background:submitting?"#ccc":accentColor,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:submitting?"not-allowed":"pointer",fontFamily:"Arial, sans-serif" }}>{submitting?"Publicando...":"Publicar comentario"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
