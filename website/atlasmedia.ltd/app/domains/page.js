"use client";
import { useState, useEffect } from "react";

const statusColors = {
  active:   { bg: "#22c55e22", color: "#22c55e", border: "#22c55e44" },
  pending:  { bg: "#f59e0b22", color: "#f59e0b", border: "#f59e0b44" },
  failed:   { bg: "#ef444422", color: "#ef4444", border: "#ef444444" },
  inactive: { bg: "#6b728022", color: "#6b7280", border: "#6b728044" }
};

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ publicationId: "", hostname: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [instructions, setInstructions] = useState(null);

  async function loadData() {
    try {
      const [d, p] = await Promise.all([fetch("/api/domains"), fetch("/api/expansion/launch")]);
      const [dd, pd] = await Promise.all([d.json(), p.json()]);
      if (dd.ok) setDomains(dd.domains);
      if (pd.ok) setPublications(pd.publications);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true); setMsg(null); setInstructions(null);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/domains", { method: "POST", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.ok) { setMsg({ type: "success", text: "Dominio registrado: " + form.hostname }); setInstructions(data.instructions); setForm({ publicationId: "", hostname: "" }); loadData(); }
      else setMsg({ type: "error", text: data.error });
    } catch (err) { setMsg({ type: "error", text: err.message }); }
    setSubmitting(false);
  }

  async function handleActivate(id) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    const res = await fetch("/api/domains", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id, status: "active" }) });
    const data = await res.json();
    if (data.ok) { loadData(); setMsg({ type: "success", text: "Dominio activado." }); }
  }

  async function handleDeactivate(id) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/domains", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id, status: "inactive" }) });
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar este dominio?")) return;
    const token = localStorage.getItem("atlas-admin-token") || "";
    await fetch("/api/domains?id=" + id, { method: "DELETE", headers: { "x-atlas-admin-token": token } });
    loadData();
  }

  const field = { width: "100%", background: "#1e2a3a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "#e5e7eb", fontSize: 14, boxSizing: "border-box" };
  const card = { border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, background: "rgba(255,255,255,0.03)", marginBottom: 14 };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px", color: "#e5e7eb" }}>
      <a href="/control" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 14 }}>- Panel de control</a>
      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "18px 0 8px" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#0891b2,#0f766e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 800 }}>D</div>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Gestion de dominios</h1>
          <p style={{ margin: 0, opacity: 0.5, fontSize: 14 }}>Cada medio con su propio dominio independiente</p>
        </div>
      </div>

      <div style={{ ...card, borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)", marginTop: 24 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#93c5fd" }}>Como funciona</h3>
        <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, opacity: 0.7, lineHeight: 2 }}>
          <li>Registras el dominio aqui (ej: mendozapost.com.ar)</li>
          <li>En Vercel Settings Domains agrega el dominio al proyecto</li>
          <li>DNS: CNAME apuntando a cname.vercel-dns.com</li>
          <li>Una vez verificado por Vercel, presionas Activar aqui</li>
          <li>El lector que entra a mendozapost.com.ar ve el diario directamente</li>
        </ol>
      </div>

      <div style={{ ...card, marginTop: 24 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 16px" }}>Registrar nuevo dominio</h2>
        {msg && <div style={{ background: msg.type === "success" ? "#22c55e22" : "#ef444422", border: "1px solid " + (msg.type === "success" ? "#22c55e" : "#ef4444"), borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 14, color: msg.type === "success" ? "#86efac" : "#fca5a5" }}>{msg.text}</div>}
        {instructions && (
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", margin: "0 0 10px" }}>Pasos para activar:</p>
            <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: "#fcd34d", lineHeight: 2 }}>
              <li>{instructions.step1}</li>
              <li>{instructions.step2}</li>
              <li>{instructions.step3}</li>
            </ol>
          </div>
        )}
        <form onSubmit={handleAdd} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>PUBLICACION</label>
            <select value={form.publicationId} onChange={e => setForm(f => ({ ...f, publicationId: e.target.value }))} required style={field}>
              <option value="">Seleccionar publicacion</option>
              {publications.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>DOMINIO</label>
            <input value={form.hostname} onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))} placeholder="mendozapost.com.ar" required style={field} />
            <p style={{ fontSize: 11, opacity: 0.4, margin: "6px 0 0" }}>Sin http:// ni /</p>
          </div>
          <button type="submit" disabled={submitting} style={{ background: submitting ? "rgba(255,255,255,0.05)" : "#0891b2", border: "none", borderRadius: 8, padding: "10px 22px", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Registrando..." : "Registrar dominio"}
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: 20, margin: "32px 0 16px" }}>Dominios registrados ({domains.length})</h2>
      {loading && <p style={{ opacity: 0.5 }}>Cargando...</p>}
      {!loading && domains.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}><p>No hay dominios registrados todavia.</p></div>}
      {domains.map(d => {
        const sc = statusColors[d.status] || statusColors.pending;
        return (
          <div key={d.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}><a href={"https://" + d.hostname} target="_blank" rel="noopener noreferrer" style={{ color: "#e5e7eb", textDecoration: "none" }}>{d.hostname}</a></div>
                <div style={{ fontSize: 13, opacity: 0.5 }}>{d.publication_name} ({d.slug})</div>
              </div>
              <span style={{ background: sc.bg, color: sc.color, border: "1px solid " + sc.border, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{d.status}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {d.status === "pending" && <button onClick={() => handleActivate(d.id)} style={{ background: "#22c55e18", border: "1px solid #22c55e44", borderRadius: 8, padding: "6px 12px", color: "#22c55e", cursor: "pointer", fontSize: 12 }}>Activar</button>}
                {d.status === "active" && <button onClick={() => handleDeactivate(d.id)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}>Pausar</button>}
                {d.status === "inactive" && <button onClick={() => handleActivate(d.id)} style={{ background: "#3b82f618", border: "1px solid #3b82f644", borderRadius: 8, padding: "6px 12px", color: "#93c5fd", cursor: "pointer", fontSize: 12 }}>Reactivar</button>}
                <button onClick={() => handleDelete(d.id)} style={{ background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, padding: "6px 12px", color: "#fca5a5", cursor: "pointer", fontSize: 12 }}>Eliminar</button>
              </div>
            </div>
            {d.status === "pending" && <div style={{ marginTop: 12, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, opacity: 0.8 }}>Pendiente de DNS. Agrega el dominio en Vercel, apunta el CNAME a cname.vercel-dns.com, luego presiona Activar.</div>}
          </div>
        );
      })}
    </main>
  );
}
