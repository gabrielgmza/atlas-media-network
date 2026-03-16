"use client";

import { useState, useEffect } from "react";

const scopeColors = {
  national:   { bg: "#1e1b4b", border: "#6366f1", text: "#a5b4fc", label: "Nacional" },
  provincial: { bg: "#14532d", border: "#22c55e", text: "#86efac", label: "Provincial" },
  city:       { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd", label: "Ciudad" },
  municipal:  { bg: "#4a1942", border: "#a855f7", text: "#d8b4fe", label: "Municipal" },
  niche:      { bg: "#451a03", border: "#f97316", text: "#fdba74", label: "Nicho" }
};

const statusDot = {
  active: "#22c55e", planned: "#f59e0b", paused: "#6b7280", archived: "#ef4444"
};

function timeAgo(date) {
  if (!date) return "nunca";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

export default function NetworkPage() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("tree");

  useEffect(() => {
    fetch("/api/expansion/launch")
      .then(r => r.json())
      .then(d => { if (d.ok) setPublications(d.publications); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roots = publications.filter(p => !p.parent_id);
  const getChildren = (parentId) => publications.filter(p => p.parent_id === parentId);
  const totalArticles = publications.reduce((s, p) => s + parseInt(p.article_count || 0), 0);
  const totalJournalists = publications.reduce((s, p) => s + parseInt(p.journalist_count || 0), 0);
  const activeCount = publications.filter(p => p.status === "active").length;

  function PublicationCard({ pub, depth }) {
    const d = depth || 0;
    const colors = scopeColors[pub.scope] || scopeColors.city;
    const kids = getChildren(pub.id);
    const isSelected = selected && selected.id === pub.id;

    return (
      <div style={{ marginLeft: d * 32 }}>
        <div onClick={() => setSelected(isSelected ? null : pub)} style={{ border: "1px solid " + (isSelected ? colors.border : "rgba(255,255,255,0.1)"), borderLeft: "3px solid " + colors.border, borderRadius: 12, padding: "14px 18px", background: isSelected ? colors.bg : "rgba(255,255,255,0.03)", cursor: "pointer", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot[pub.status] || "#6b7280", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: isSelected ? colors.text : "#e5e7eb" }}>{pub.name}</div>
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{pub.territory_name} - {colors.label}{pub.parent_name ? " - hijo de " + pub.parent_name : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.6 }}>
              <span>P {pub.journalist_count || 0}</span>
              <span>Art {pub.article_count || 0}</span>
              <span>R {pub.run_count || 0}</span>
            </div>
            <span style={{ background: colors.bg, color: colors.text, border: "1px solid " + colors.border, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{colors.label}</span>
            <span style={{ background: (statusDot[pub.status] || "#6b7280") + "22", color: statusDot[pub.status] || "#6b7280", border: "1px solid " + (statusDot[pub.status] || "#6b7280") + "44", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{pub.status}</span>
          </div>
          {isSelected && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 12 }}>
                {[{ label: "Articulos", value: pub.article_count || 0, color: "#22c55e" }, { label: "Periodistas IA", value: pub.journalist_count || 0, color: "#3b82f6" }, { label: "Categorias", value: pub.category_count || 0, color: "#f59e0b" }, { label: "Runs", value: pub.run_count || 0, color: "#8b5cf6" }].map((stat, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              {pub.description && <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 8px", fontStyle: "italic" }}>{pub.description}</p>}
              {pub.last_run && <p style={{ fontSize: 12, opacity: 0.4, margin: "0 0 12px" }}>Ultimo pipeline: {timeAgo(pub.last_run)}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <a href={"/" + pub.slug} target="_blank" rel="noopener noreferrer" style={{ background: colors.border + "33", color: colors.text, border: "1px solid " + colors.border + "55", borderRadius: 8, padding: "6px 14px", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>Ver diario</a>
                <a href="/president" style={{ background: "rgba(255,255,255,0.05)", color: "#93c5fd", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", fontSize: 12, textDecoration: "none" }}>Gestionar con President</a>
              </div>
            </div>
          )}
        </div>
        {kids.length > 0 && (
          <div style={{ borderLeft: "1px dashed rgba(255,255,255,0.1)", marginLeft: 16, paddingLeft: 16, marginBottom: 8 }}>
            {kids.map(kid => <PublicationCard key={kid.id} pub={kid} depth={d + 1} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", paddingBottom: 60 }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Atlas</a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Red de medios</span>
          <span style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{activeCount} activos</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["tree", "grid"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? "rgba(255,255,255,0.1)" : "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 14px", color: view === v ? "#fff" : "#9ca3af", cursor: "pointer", fontSize: 13 }}>
              {v === "tree" ? "Jerarquia" : "Grilla"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 32 }}>
          {[{ label: "Total de medios", value: publications.length, color: "#8b5cf6" }, { label: "Medios activos", value: activeCount, color: "#22c55e" }, { label: "Total articulos", value: totalArticles.toLocaleString(), color: "#3b82f6" }, { label: "Periodistas IA", value: totalJournalists, color: "#f59e0b" }].map((kpi, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {Object.entries(scopeColors).map(([scope, colors]) => (
            <div key={scope} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.7 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: colors.border }} />
              <span>{colors.label}</span>
            </div>
          ))}
        </div>

        {loading && <p style={{ opacity: 0.5, textAlign: "center", padding: 40 }}>Cargando red de medios...</p>}

        {!loading && publications.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>
            <p style={{ fontSize: 20 }}>No hay publicaciones todavia</p>
            <p style={{ fontSize: 14 }}>El AI Expansion Director lanzara medios automaticamente cada lunes</p>
          </div>
        )}

        {!loading && view === "tree" && publications.length > 0 && (
          <div>
            <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "16px 20px", background: "rgba(255,255,255,0.05)", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>A</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Atlas Media Network</div>
                <div style={{ fontSize: 12, opacity: 0.5 }}>Holding invisible - {publications.length} publicaciones - {totalJournalists} periodistas IA</div>
              </div>
            </div>
            <div style={{ borderLeft: "2px dashed rgba(255,255,255,0.1)", marginLeft: 22, paddingLeft: 22, paddingBottom: 8 }}>
              {roots.map(pub => <PublicationCard key={pub.id} pub={pub} depth={0} />)}
            </div>
          </div>
        )}

        {!loading && view === "grid" && publications.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {publications.map(pub => {
              const colors = scopeColors[pub.scope] || scopeColors.city;
              return (
                <a key={pub.id} href={"/" + pub.slug} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <div style={{ border: "1px solid " + colors.border + "55", borderTop: "3px solid " + colors.border, borderRadius: 12, padding: 18, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#e5e7eb", marginBottom: 3 }}>{pub.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{pub.territory_name}</div>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot[pub.status] || "#6b7280", marginTop: 4 }} />
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.6 }}>
                      <span>P {pub.journalist_count || 0}</span>
                      <span>Art {pub.article_count || 0}</span>
                      <span style={{ color: colors.text }}>{colors.label}</span>
                    </div>
                    {pub.description && <p style={{ fontSize: 12, opacity: 0.5, margin: "8px 0 0", lineHeight: 1.4, fontStyle: "italic" }}>{pub.description?.slice(0, 80)}</p>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
