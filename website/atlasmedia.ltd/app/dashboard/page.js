"use client";

import { useState, useEffect } from "react";

function timeAgo(date) {
  if (!date) return "nunca";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff/60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  return `hace ${Math.floor(diff/86400)}d`;
}

const statusColor = { completed:"#22c55e", running:"#3b82f6", failed:"#ef4444", partial:"#f59e0b", active:"#22c55e", planned:"#f59e0b", paused:"#6b7280" };

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function load() {
    try {
      const res = await fetch("/api/dashboard");
      const d = await res.json();
      if (d.ok) { setData(d); setLastRefresh(new Date()); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  const card = (extra={}) => ({ border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:20, background:"rgba(255,255,255,0.03)", ...extra });
  const tag = (color) => ({ background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 });

  if (loading) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0b1020", color:"#e5e7eb" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚡</div>
        <p style={{ opacity:0.5 }}>Cargando estado del holding...</p>
      </div>
    </div>
  );

  const h = data?.holding;

  return (
    <div style={{ minHeight:"100vh", background:"#0b1020", color:"#e5e7eb", paddingBottom:60 }}>
      <div style={{ padding:"20px 32px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <a href="/" style={{ color:"#93c5fd", textDecoration:"none", fontSize:13 }}>← Atlas</a>
          <div style={{ width:1, height:20, background:"rgba(255,255,255,0.15)" }}/>
          <span style={{ fontWeight:700, fontSize:16 }}>Atlas Media Network</span>
          <span style={tag("#22c55e")}>● OPERATIONAL</span>
        </div>
        <div style={{ fontSize:12, opacity:0.4 }}>
          Auto-refresh 30s · {lastRefresh ? lastRefresh.toLocaleTimeString("es-AR") : "—"}
          <button onClick={load} style={{ marginLeft:12, background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, padding:"3px 10px", color:"#93c5fd", cursor:"pointer", fontSize:12 }}>↺</button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 32px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:14, marginBottom:28 }}>
          {[
            { label:"Publicaciones", value:h?.publications, icon:"🗞️", color:"#8b5cf6" },
            { label:"Periodistas IA", value:h?.journalists, icon:"✍️", color:"#3b82f6" },
            { label:"Artículos publicados", value:h?.publishedArticles, icon:"📰", color:"#22c55e" },
            { label:"Pipeline runs", value:h?.completedRuns, icon:"⚡", color:"#f59e0b" },
            { label:"Fuentes RSS", value:h?.sources, icon:"📡", color:"#06b6d4" },
            { label:"Último pipeline", value:timeAgo(h?.lastRun), icon:"🕐", color:"#94a3b8", small:true }
          ].map((kpi,i) => (
            <div key={i} style={{ ...card(), textAlign:"center", padding:"18px 14px" }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{kpi.icon}</div>
              <div style={{ fontSize:kpi.small?16:28, fontWeight:700, color:kpi.color, marginBottom:4 }}>{kpi.value??'—'}</div>
              <div style={{ fontSize:11, opacity:0.5 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          <div style={card()}>
            <h2 style={{ fontSize:14, fontWeight:600, opacity:0.6, margin:"0 0 14px", textTransform:"uppercase", letterSpacing:1 }}>Red de publicaciones</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(data?.publications||[]).map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize:20 }}>{p.scope==="national"?"🇦🇷":p.scope==="provincial"?"📍":"🏘️"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize:11, opacity:0.4 }}>{p.territory_name} · último run {timeAgo(p.last_run)}</div>
                  </div>
                  <div style={{ display:"flex", gap:10, fontSize:11, opacity:0.5, whiteSpace:"nowrap" }}>
                    <span>👤 {p.journalist_count}</span>
                    <span>📰 {p.article_count}</span>
                  </div>
                  <span style={tag(statusColor[p.status]||"#6b7280")}>{p.status}</span>
                </div>
              ))}
              {!(data?.publications||[]).length && <p style={{ opacity:0.4, fontSize:13 }}>Sin publicaciones</p>}
            </div>
          </div>

          <div style={card()}>
            <h2 style={{ fontSize:14, fontWeight:600, opacity:0.6, margin:"0 0 14px", textTransform:"uppercase", letterSpacing:1 }}>Pipeline runs recientes</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(data?.pipelineRuns||[]).map((r,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={tag(statusColor[r.status]||"#6b7280")}>{r.status}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.pub_name}</div>
                    <div style={{ fontSize:11, opacity:0.4 }}>{r.triggered_by} · {timeAgo(r.started_at)}</div>
                  </div>
                  <div style={{ fontSize:12, opacity:0.6, whiteSpace:"nowrap" }}>✓ {r.articles_published||0} · ✗ {r.articles_failed||0}</div>
                </div>
              ))}
              {!(data?.pipelineRuns||[]).length && <p style={{ opacity:0.4, fontSize:13 }}>Sin runs todavía</p>}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:20 }}>
          <div style={card()}>
            <h2 style={{ fontSize:14, fontWeight:600, opacity:0.6, margin:"0 0 14px", textTransform:"uppercase", letterSpacing:1 }}>Últimos artículos publicados</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(data?.recentArticles||[]).map((a,i) => (
                <div key={i} style={{ padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:4, lineHeight:1.4 }}>{a.title}</div>
                  <div style={{ display:"flex", gap:8, fontSize:11, opacity:0.45, flexWrap:"wrap" }}>
                    <span>{a.publication_name||a.publication}</span>
                    <span>·</span><span>{a.author}</span>
                    <span>·</span><span>{a.category}</span>
                    <span>·</span><span>{timeAgo(a.published_at)}</span>
                    {a.ai_generated && <span style={tag("#8b5cf6")}>IA</span>}
                  </div>
                </div>
              ))}
              {!(data?.recentArticles||[]).length && <p style={{ opacity:0.4, fontSize:13 }}>Sin artículos publicados todavía</p>}
            </div>
          </div>

          <div style={card()}>
            <h2 style={{ fontSize:14, fontWeight:600, opacity:0.6, margin:"0 0 14px", textTransform:"uppercase", letterSpacing:1 }}>Memoria del President</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(data?.recentMemory||[]).map((m,i) => {
                const tc = { pipeline:"#3b82f6", expansion:"#22c55e", chat:"#8b5cf6", note:"#f59e0b" };
                return (
                  <div key={i} style={{ padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                      <span style={tag(tc[m.type]||"#6b7280")}>{m.type}</span>
                      <span style={tag(m.priority==="high"?"#ef4444":m.priority==="medium"?"#f59e0b":"#6b7280")}>{m.priority}</span>
                    </div>
                    <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>{m.title}</div>
                    <div style={{ fontSize:11, opacity:0.4 }}>{timeAgo(m.created_at)}</div>
                  </div>
                );
              })}
              {!(data?.recentMemory||[]).length && <p style={{ opacity:0.4, fontSize:13 }}>Sin memoria registrada</p>}
            </div>
            <a href="/president" style={{ display:"block", marginTop:14, textAlign:"center", color:"#8b5cf6", fontSize:12, textDecoration:"none", opacity:0.7 }}>→ Abrir chat con el President</a>
          </div>
        </div>
      </div>
    </div>
  );
}
