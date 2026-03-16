"use client";
import { useState, useEffect } from "react";

const EXPORT_TYPES = [
  { key: "articles", label: "Articulos publicados", desc: "Todos los articulos con titulo, categoria, autor, fecha y SEO", icon: "A", color: "#22c55e" },
  { key: "analytics", label: "Analytics - Pageviews", desc: "Vistas por articulo con fechas y publicacion", icon: "G", color: "#3b82f6" },
  { key: "subscribers", label: "Suscriptores newsletter", desc: "Emails activos por publicacion", icon: "E", color: "#8b5cf6" },
  { key: "advertisers", label: "Anunciantes y prospectos", desc: "Todos los contactos comerciales con estado", icon: "C", color: "#f59e0b" },
  { key: "pipeline", label: "Historial de pipeline", desc: "Todos los runs con resultados y errores", icon: "P", color: "#06b6d4" },
  { key: "comments", label: "Comentarios de lectores", desc: "Todos los comentarios con estado de moderacion", icon: "M", color: "#ec4899" }
];

export default function ExportPage() {
  const [publications, setPublications] = useState([]);
  const [selectedPub, setSelectedPub] = useState("");
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    fetch("/api/expansion/launch").then(r=>r.json()).then(d=>{if(d.ok)setPublications(d.publications);}).catch(()=>{});
  }, []);

  async function handleExport(type) {
    setDownloading(d => ({ ...d, [type]: true }));
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const params = new URLSearchParams({ type });
      if (selectedPub) params.append("publication", selectedPub);
      const res = await fetch("/api/export?" + params, { headers: { "x-atlas-admin-token": token } });
      if (!res.ok) { const err = await res.json(); alert("Error: " + err.error); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || type + ".csv";
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { alert("Error: " + err.message); }
    setDownloading(d => ({ ...d, [type]: false }));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", paddingBottom: 60 }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/control" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Panel de control</a>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Exportar datos</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, background: "rgba(255,255,255,0.03)", marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Filtrar por publicacion</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setSelectedPub("")} style={{ background: !selectedPub?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 16px", color: !selectedPub?"#fff":"#9ca3af", cursor: "pointer", fontSize: 13 }}>Todas</button>
            {publications.map(p => <button key={p.id} onClick={() => setSelectedPub(p.id)} style={{ background: selectedPub===p.id?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 16px", color: selectedPub===p.id?"#fff":"#9ca3af", cursor: "pointer", fontSize: 13 }}>{p.name}</button>)}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {EXPORT_TYPES.map(exp => (
            <div key={exp.key} style={{ border: "1px solid rgba(255,255,255,0.08)", borderLeft: "3px solid "+exp.color, borderRadius: 12, padding: "16px 20px", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: exp.color+"22", border: "1px solid "+exp.color+"44", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: exp.color, flexShrink: 0 }}>{exp.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{exp.label}</div>
                <div style={{ fontSize: 13, opacity: 0.5 }}>{exp.desc}</div>
              </div>
              <button onClick={() => handleExport(exp.key)} disabled={downloading[exp.key]} style={{ background: downloading[exp.key]?"rgba(255,255,255,0.05)":exp.color+"22", border: "1px solid "+exp.color+"44", borderRadius: 8, padding: "8px 18px", color: exp.color, cursor: downloading[exp.key]?"not-allowed":"pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", opacity: downloading[exp.key]?0.5:1 }}>
                {downloading[exp.key]?"Generando...":"Descargar CSV"}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px", background: "rgba(255,255,255,0.02)", fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
          Los archivos CSV son compatibles con Excel, Google Sheets y cualquier herramienta de analisis de datos.
        </div>
      </div>
    </div>
  );
}
