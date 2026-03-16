"use client";

import { useState, useEffect } from "react";

function timeAgo(date) {
  if (!date) return "nunca";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

export default function ControlPage() {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [pipelineStatus, setPipelineStatus] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  async function loadAll() {
    const token = localStorage.getItem("atlas-admin-token") || "";
    try {
      const [dashRes, analyticsRes, pipelineRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/analytics/stats?days=7"),
        fetch("/api/pipeline/run", { headers: { "x-atlas-admin-token": token } })
      ]);
      const [dashData, analyticsData, pipelineData] = await Promise.all([dashRes.json(), analyticsRes.json(), pipelineRes.json()]);
      if (dashData.ok) setDashboard(dashData);
      if (analyticsData.ok) setAnalytics(analyticsData);
      if (pipelineData.ok) setPipelineStatus(pipelineData);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAll(); const i = setInterval(loadAll, 60000); return () => clearInterval(i); }, []);

  async function runPipeline(publicationId) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    const res = await fetch("/api/pipeline/run", { method: "POST", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ publication: publicationId, triggeredBy: "manual" }) });
    const data = await res.json();
    alert(data.ok ? publicationId + ": " + (data.stats?.published || 0) + " articulos publicados" : "Error: " + data.error);
    loadAll();
  }

  async function seedSlots(publicationId) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    const res = await fetch("/api/monetization/slots", { method: "POST", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ action: "seed", publicationId }) });
    const data = await res.json();
    alert(data.ok ? "Slots creados para " + publicationId : "Error: " + data.error);
  }

  const h = dashboard?.holding;
  const statusColor = { completed: "#22c55e", running: "#3b82f6", failed: "#ef4444", partial: "#f59e0b" };
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "publications", label: "Publicaciones" },
    { id: "pipeline", label: "Pipeline" },
    { id: "articles", label: "Articulos" },
    { id: "analytics", label: "Analytics" },
    { id: "memory", label: "Memoria" },
    { id: "links", label: "Enlaces" }
  ];
  const card = (extra) => ({ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, background: "rgba(255,255,255,0.03)", ...extra });

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "#060c18", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>A</div>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Atlas Control</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ background: activeSection === s.id ? "rgba(255,255,255,0.1)" : "none", border: "none", borderRadius: 8, padding: "6px 14px", color: activeSection === s.id ? "#fff" : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400 }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, opacity: 0.5 }}>
          <span>{lastRefresh ? "Actualizado " + lastRefresh.toLocaleTimeString("es-AR") : ""}</span>
          <button onClick={loadAll} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", color: "#93c5fd", cursor: "pointer", fontSize: 12 }}>Refrescar</button>
          <a href="/president" style={{ background: "rgba(79,70,229,0.3)", border: "1px solid rgba(79,70,229,0.5)", borderRadius: 6, padding: "4px 10px", color: "#a5b4fc", textDecoration: "none", fontSize: 12 }}>AI President</a>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px" }}>
        {loading && <p style={{ opacity: 0.5, textAlign: "center", padding: 60 }}>Cargando panel...</p>}

        {!loading && (
          <>
            {activeSection === "overview" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
                  {[
                    { label: "Publicaciones", value: h?.publications || 0, color: "#8b5cf6", link: "/network" },
                    { label: "Periodistas IA", value: h?.journalists || 0, color: "#3b82f6", link: "/newsroom" },
                    { label: "Articulos", value: h?.publishedArticles || 0, color: "#22c55e", link: "/editorial" },
                    { label: "Pipeline runs", value: h?.completedRuns || 0, color: "#f59e0b", link: null },
                    { label: "Fuentes RSS", value: h?.sources || 0, color: "#06b6d4", link: null },
                    { label: "Vistas 7d", value: parseInt(analytics?.totals?.week || 0).toLocaleString(), color: "#e879f9", link: "/analytics" }
                  ].map((kpi, i) => (
                    <div key={i} onClick={() => kpi.link && window.open(kpi.link, "_self")} style={{ ...card(), textAlign: "center", padding: "16px 12px", cursor: kpi.link ? "pointer" : "default" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div style={card()}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>Acciones rapidas</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Ejecutar pipeline Argentina Post", action: () => runPipeline("argentina-post"), color: "#22c55e" },
                        { label: "Ejecutar pipeline Mendoza", action: () => runPipeline("argentina-post-mendoza"), color: "#22c55e" },
                        { label: "Inicializar slots publicitarios AP", action: () => seedSlots("argentina-post"), color: "#f59e0b" },
                        { label: "Ver red de medios", action: () => window.open("/network", "_self"), color: "#8b5cf6" },
                        { label: "Chatear con el President", action: () => window.open("/president", "_self"), color: "#4f46e5" }
                      ].map((action, i) => (
                        <button key={i} onClick={action.action} style={{ background: action.color + "18", border: "1px solid " + action.color + "44", borderRadius: 8, padding: "9px 14px", color: action.color, cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: 500 }}>{action.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={card()}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>Ultimos pipeline runs</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(dashboard?.pipelineRuns || []).slice(0, 6).map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                          <span style={{ background: (statusColor[r.status] || "#6b7280") + "22", color: statusColor[r.status] || "#6b7280", border: "1px solid " + (statusColor[r.status] || "#6b7280") + "44", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{r.status}</span>
                          <span style={{ flex: 1, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.pub_name}</span>
                          <span style={{ opacity: 0.4, fontSize: 11, whiteSpace: "nowrap" }}>{r.articles_published || 0} art.</span>
                        </div>
                      ))}
                      {!dashboard?.pipelineRuns?.length && <p style={{ opacity: 0.4, fontSize: 13 }}>Sin runs todavia</p>}
                    </div>
                  </div>
                  <div style={card()}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>Memoria del President</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(dashboard?.recentMemory || []).slice(0, 6).map((m, i) => (
                        <div key={i} style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 500, opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                          <div style={{ opacity: 0.4, fontSize: 11 }}>{timeAgo(m.created_at)}</div>
                        </div>
                      ))}
                      {!dashboard?.recentMemory?.length && <p style={{ opacity: 0.4, fontSize: 13 }}>Sin memoria registrada</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "publications" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Publicaciones activas</h2>
                  <a href="/network" style={{ color: "#93c5fd", fontSize: 13, textDecoration: "none" }}>Ver mapa completo</a>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {(dashboard?.publications || []).map(pub => (
                    <div key={pub.id} style={{ ...card(), display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{pub.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.5 }}>{pub.territory_name} · {pub.scope} · ultimo run {timeAgo(pub.last_run)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 20, fontSize: 13, opacity: 0.6 }}>
                        <span>P {pub.journalist_count}</span>
                        <span>Art {pub.article_count}</span>
                        <span>R {pub.run_count}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => runPipeline(pub.id)} style={{ background: "#22c55e18", border: "1px solid #22c55e44", borderRadius: 8, padding: "6px 12px", color: "#22c55e", cursor: "pointer", fontSize: 12 }}>Ejecutar pipeline</button>
                        <a href={"/" + pub.id} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#93c5fd", textDecoration: "none", fontSize: 12 }}>Ver diario</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "pipeline" && (
              <div>
                <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>Historial de pipeline runs</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {(pipelineStatus.runs || dashboard?.pipelineRuns || []).map((r, i) => (
                    <div key={i} style={{ ...card(), display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <span style={{ background: (statusColor[r.status] || "#6b7280") + "22", color: statusColor[r.status] || "#6b7280", border: "1px solid " + (statusColor[r.status] || "#6b7280") + "44", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{r.status}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.pub_name || r.publication_name || r.publication_id}</div>
                        <div style={{ fontSize: 12, opacity: 0.5 }}>{r.triggered_by} · {timeAgo(r.started_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                        <span style={{ color: "#22c55e" }}>+{r.articles_published || 0}</span>
                        <span style={{ color: "#ef4444" }}>-{r.articles_failed || 0}</span>
                      </div>
                    </div>
                  ))}
                  {!dashboard?.pipelineRuns?.length && <p style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 40 }}>Sin runs todavia.</p>}
                </div>
              </div>
            )}

            {activeSection === "articles" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Ultimos articulos publicados</h2>
                  <a href="/editorial" style={{ color: "#93c5fd", fontSize: 13, textDecoration: "none" }}>Editorial desk</a>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(dashboard?.recentArticles || []).map((a, i) => (
                    <div key={i} style={{ ...card(), display: "flex", gap: 14, alignItems: "center" }}>
                      {a.image_thumb && <img src={a.image_thumb} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.5 }}>{a.publication_name || a.publication} · {a.author} · {a.category} · {timeAgo(a.published_at)}</div>
                      </div>
                      {a.ai_generated && <span style={{ background: "#8b5cf622", color: "#a78bfa", border: "1px solid #8b5cf644", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>IA</span>}
                      <a href={"/noticias/" + a.slug} target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", fontSize: 12, textDecoration: "none", opacity: 0.6 }}>Ver</a>
                    </div>
                  ))}
                  {!dashboard?.recentArticles?.length && <p style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 40 }}>Sin articulos todavia.</p>}
                </div>
              </div>
            )}

            {activeSection === "analytics" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Analytics (7 dias)</h2>
                  <a href="/analytics" style={{ color: "#93c5fd", fontSize: 13, textDecoration: "none" }}>Dashboard completo</a>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
                  {[{ label: "Vistas totales", value: parseInt(analytics?.totals?.total || 0).toLocaleString(), color: "#3b82f6" }, { label: "Hoy", value: parseInt(analytics?.totals?.today || 0).toLocaleString(), color: "#22c55e" }, { label: "Esta semana", value: parseInt(analytics?.totals?.week || 0).toLocaleString(), color: "#f59e0b" }].map((kpi, i) => (
                    <div key={i} style={{ ...card(), textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>
                <div style={card()}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>Articulos mas leidos</h3>
                  {(analytics?.topArticles || []).map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6", opacity: 0.5, minWidth: 24 }}>#{i+1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title || a.article_slug}</div>
                        <div style={{ fontSize: 11, opacity: 0.4 }}>{a.publication_name}</div>
                      </div>
                      <span style={{ background: "#3b82f622", color: "#93c5fd", border: "1px solid #3b82f644", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{parseInt(a.views).toLocaleString()} vistas</span>
                    </div>
                  ))}
                  {!analytics?.topArticles?.length && <p style={{ opacity: 0.4, fontSize: 13 }}>Sin datos todavia.</p>}
                </div>
              </div>
            )}

            {activeSection === "memory" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Memoria del AI President</h2>
                  <a href="/president" style={{ color: "#93c5fd", fontSize: 13, textDecoration: "none" }}>Ir al chat</a>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(dashboard?.recentMemory || []).map((m, i) => {
                    const tc = { pipeline: "#3b82f6", expansion: "#22c55e", chat: "#8b5cf6", note: "#f59e0b", newsletter: "#ec4899", monetization: "#f97316" };
                    return (
                      <div key={i} style={card()}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <span style={{ background: (tc[m.type]||"#6b7280")+"22", color: tc[m.type]||"#6b7280", border: "1px solid "+(tc[m.type]||"#6b7280")+"44", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{m.type}</span>
                          <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.4 }}>{timeAgo(m.created_at)}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
                        {m.detail && <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.5 }}>{m.detail}</div>}
                      </div>
                    );
                  })}
                  {!dashboard?.recentMemory?.length && <p style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 40 }}>Sin memoria registrada.</p>}
                </div>
              </div>
            )}

            {activeSection === "links" && (
              <div>
                <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>Todos los modulos del sistema</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                  {[
                    { label: "AI President", desc: "Chat ejecutivo con ejecucion real", href: "/president", color: "#4f46e5" },
                    { label: "Dashboard", desc: "Estado del holding en tiempo real", href: "/dashboard", color: "#3b82f6" },
                    { label: "Analytics", desc: "Metricas de trafico y engagement", href: "/analytics", color: "#8b5cf6" },
                    { label: "Red de medios", desc: "Mapa visual de todas las publicaciones", href: "/network", color: "#22c55e" },
                    { label: "AI Editorial Director", desc: "Sugerencias de temas y briefs", href: "/editorial-director", color: "#f59e0b" },
                    { label: "Editorial Desk", desc: "Gestion de articulos y workflow", href: "/editorial", color: "#f97316" },
                    { label: "Admin", desc: "Publicar articulos manualmente", href: "/admin", color: "#ec4899" },
                    { label: "Newsroom", desc: "Periodistas IA del holding", href: "/newsroom", color: "#06b6d4" },
                    { label: "Executive Board", desc: "Directorio ejecutivo de IA", href: "/executive-board", color: "#a855f7" },
                    { label: "Governance", desc: "Estructura y politicas del holding", href: "/governance", color: "#6b7280" },
                    { label: "AI Expansion Director", desc: "Lanzar nuevos medios", href: "/expansion", color: "#10b981" },
                    { label: "Buscar", desc: "Busqueda full-text de articulos", href: "/buscar", color: "#f43f5e" },
                    { label: "Argentina Post", desc: "Diario nacional", href: "/argentina-post", color: "#cc0000" },
                    { label: "Arg. Post Mendoza", desc: "Diario provincial", href: "/argentina-post-mendoza", color: "#1a6b3c" }
                  ].map((link, i) => (
                    <a key={i} href={link.href} style={{ textDecoration: "none" }}>
                      <div style={{ border: "1px solid " + link.color + "33", borderLeft: "3px solid " + link.color, borderRadius: 10, padding: "14px 16px", background: link.color + "0a" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: link.color, marginBottom: 4 }}>{link.label}</div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>{link.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
