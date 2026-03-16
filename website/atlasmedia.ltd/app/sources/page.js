"use client";
import { useState, useEffect } from "react";

const SUGGESTED_SOURCES = [
  { name: "Infobae", url: "https://www.infobae.com/feeds/rss/", category: "Nacional" },
  { name: "La Nacion", url: "https://feeds.lanacion.com.ar/rss/", category: "Nacional" },
  { name: "Clarin", url: "https://www.clarin.com/rss/lo-ultimo/", category: "Nacional" },
  { name: "Pagina 12", url: "https://www.pagina12.com.ar/rss/portada", category: "Nacional" },
  { name: "MDZ Online", url: "https://www.mdzol.com/rss.xml", category: "Mendoza" },
  { name: "Diario Los Andes", url: "https://www.losandes.com.ar/arc/outboundfeeds/rss/", category: "Mendoza" },
  { name: "Unidiversidad", url: "https://www.unidiversidad.com.ar/feed", category: "Mendoza" },
  { name: "El Destape", url: "https://www.eldestapeweb.com/rss.xml", category: "Nacional" },
  { name: "Ambito", url: "https://www.ambito.com/rss.xml", category: "Economia" },
  { name: "IProfesional", url: "https://www.iprofesional.com/rss.xml", category: "Economia" },
  { name: "TN", url: "https://tn.com.ar/rss/", category: "Nacional" },
  { name: "Telam", url: "https://www.telam.com.ar/rss/portada.xml", category: "Nacional" }
];

function timeAgo(date) {
  if (!date) return "nunca";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ publicationId: "", name: "", url: "", category: "", language: "es" });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [msg, setMsg] = useState(null);
  const [filterPub, setFilterPub] = useState("");
  const [showSuggested, setShowSuggested] = useState(false);

  async function loadData() {
    try {
      const [srcRes, pubRes] = await Promise.all([fetch("/api/sources"), fetch("/api/expansion/launch")]);
      const [srcData, pubData] = await Promise.all([srcRes.json(), pubRes.json()]);
      if (srcData.ok) setSources(srcData.sources);
      if (pubData.ok) setPublications(pubData.publications);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleTest() {
    if (!form.url) return;
    setTesting(true); setTestResult(null);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ action: "test", url: form.url }) });
      const data = await res.json();
      setTestResult(data.test);
      if (data.test?.feedTitle) setForm(f => ({ ...f, name: f.name || data.test.feedTitle }));
    } catch (err) { setTestResult({ ok: false, error: err.message }); }
    setTesting(false);
  }

  async function handleAdd(e) {
    e.preventDefault(); setSubmitting(true); setMsg(null);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.ok) { setMsg({ type: "success", text: "Fuente agregada: " + form.name }); setForm(f => ({ ...f, name: "", url: "", category: "" })); setTestResult(null); loadData(); }
      else setMsg({ type: "error", text: data.error });
    } catch (err) { setMsg({ type: "error", text: err.message }); }
    setSubmitting(false);
  }

  async function toggleActive(id, active) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/sources", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id, active: !active }) });
    loadData();
  }

  async function handleDelete(id, name) {
    if (!confirm("Eliminar fuente: " + name + "?")) return;
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/sources?id=" + id, { method: "DELETE", headers: { "x-atlas-admin-token": token } });
    loadData();
  }

  const filtered = filterPub ? sources.filter(s => s.publication_id === filterPub) : sources;
  const field = { width: "100%", background: "#1e2a3a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "#e5e7eb", fontSize: 14, boxSizing: "border-box" };
  const card = { border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, background: "rgba(255,255,255,0.03)", marginBottom: 12 };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", paddingBottom: 80 }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/control" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Panel de control</a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Fuentes RSS</span>
          <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{sources.filter(s => s.active).length} activas</span>
        </div>
        <button onClick={loadData} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: "#93c5fd", cursor: "pointer", fontSize: 13 }}>Refrescar</button>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 28 }}>
          {[{ label: "Total fuentes", value: sources.length, color: "#8b5cf6" }, { label: "Activas", value: sources.filter(s => s.active).length, color: "#22c55e" }, { label: "Pausadas", value: sources.filter(s => !s.active).length, color: "#6b7280" }, { label: "Publicaciones", value: [...new Set(sources.map(s => s.publication_id))].length, color: "#3b82f6" }].map((s, i) => (
            <div key={i} style={{ ...card, marginBottom: 0, textAlign: "center", padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Agregar fuente RSS</h2>
            <button onClick={() => setShowSuggested(!showSuggested)} style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, padding: "6px 14px", color: "#a78bfa", cursor: "pointer", fontSize: 13 }}>{showSuggested ? "Ocultar sugeridas" : "Ver fuentes sugeridas"}</button>
          </div>
          {showSuggested && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 12px" }}>Selecciona una publicacion primero, luego click en una fuente:</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 8 }}>
                {SUGGESTED_SOURCES.map((src, i) => (
                  <button key={i} onClick={() => { if (!form.publicationId) { alert("Selecciona una publicacion primero"); return; } setForm(f => ({ ...f, name: src.name, url: src.url, category: src.category })); setShowSuggested(false); }} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#e5e7eb", cursor: "pointer", textAlign: "left", fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{src.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>{src.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {msg && <div style={{ background: msg.type === "success" ? "#22c55e22" : "#ef444422", border: "1px solid " + (msg.type === "success" ? "#22c55e" : "#ef4444"), borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 14, color: msg.type === "success" ? "#86efac" : "#fca5a5" }}>{msg.text}</div>}
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>PUBLICACION *</label><select value={form.publicationId} onChange={e => setForm(f => ({ ...f, publicationId: e.target.value }))} required style={field}><option value="">Seleccionar...</option>{publications.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>NOMBRE *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Infobae Nacional" required style={field} /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>URL RSS *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={form.url} onChange={e => { setForm(f => ({ ...f, url: e.target.value })); setTestResult(null); }} placeholder="https://..." required style={{ ...field, flex: 1 }} />
                <button type="button" onClick={handleTest} disabled={testing || !form.url} style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 8, padding: "10px 16px", color: "#93c5fd", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", opacity: testing || !form.url ? 0.5 : 1 }}>{testing ? "Probando..." : "Probar URL"}</button>
              </div>
              {testResult && <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: testResult.ok ? "#22c55e18" : "#ef444418", border: "1px solid " + (testResult.ok ? "#22c55e44" : "#ef444444"), fontSize: 13, color: testResult.ok ? "#86efac" : "#fca5a5" }}>{testResult.ok ? "Feed valido: " + testResult.feedTitle + " (" + testResult.itemCount + " items)" : "Error: " + testResult.error}</div>}
            </div>
            <div><label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>CATEGORIA</label><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Politica, Economia..." style={field} /></div>
            <div><label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>IDIOMA</label><select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} style={field}><option value="es">Espanol</option><option value="en">Ingles</option></select></div>
            <div style={{ gridColumn: "1 / -1" }}><button type="submit" disabled={submitting} style={{ background: submitting ? "rgba(255,255,255,0.05)" : "#22c55e", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, opacity: submitting ? 0.6 : 1 }}>{submitting ? "Agregando..." : "Agregar fuente"}</button></div>
          </form>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setFilterPub("")} style={{ background: !filterPub ? "rgba(255,255,255,0.1)" : "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 16px", color: !filterPub ? "#fff" : "#9ca3af", cursor: "pointer", fontSize: 13 }}>Todas</button>
          {publications.map(p => <button key={p.id} onClick={() => setFilterPub(p.id)} style={{ background: filterPub === p.id ? "rgba(255,255,255,0.1)" : "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 16px", color: filterPub === p.id ? "#fff" : "#9ca3af", cursor: "pointer", fontSize: 13 }}>{p.name}</button>)}
        </div>

        <h2 style={{ fontSize: 18, margin: "0 0 14px" }}>Fuentes registradas ({filtered.length})</h2>
        {loading && <p style={{ opacity: 0.5, textAlign: "center", padding: 40 }}>Cargando...</p>}
        {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}><p style={{ fontSize: 18 }}>No hay fuentes registradas</p><p style={{ fontSize: 14 }}>Agrega fuentes RSS para que el pipeline tenga contenido</p></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(src => (
            <div key={src.id} style={{ ...card, marginBottom: 0, opacity: src.active ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: src.active ? "#22c55e" : "#6b7280", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{src.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>{src.publication_name} {src.category && "- " + src.category} - {src.language} - ultimo fetch {timeAgo(src.last_fetched_at)} - {src.fetch_count || 0} fetches</div>
                  <div style={{ fontSize: 11, opacity: 0.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.url}</div>
                </div>
                {src.error_count > 0 && <span style={{ background: "#ef444418", color: "#fca5a5", border: "1px solid #ef444444", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{src.error_count} errores</span>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => toggleActive(src.id, src.active)} style={{ background: src.active ? "rgba(107,114,128,0.15)" : "rgba(34,197,94,0.15)", border: "1px solid " + (src.active ? "rgba(107,114,128,0.3)" : "rgba(34,197,94,0.3)"), borderRadius: 8, padding: "5px 10px", color: src.active ? "#9ca3af" : "#86efac", cursor: "pointer", fontSize: 12 }}>{src.active ? "Pausar" : "Activar"}</button>
                  <button onClick={() => handleDelete(src.id, src.name)} style={{ background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, padding: "5px 10px", color: "#fca5a5", cursor: "pointer", fontSize: 12 }}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
