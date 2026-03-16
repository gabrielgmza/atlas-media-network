"use client";
import { useState, useEffect } from "react";

function StatusDot({ ok, warning }) {
  const color = !ok ? "#ef4444" : warning ? "#f59e0b" : "#22c55e";
  return <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: "0 0 6px " + color }} /><span style={{ fontSize: 12, color, fontWeight: 600 }}>{!ok ? "Error" : warning ? "Degradado" : "Operativo"}</span></div>;
}

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function loadStatus() {
    try { const res = await fetch("/api/health"); const d = await res.json(); setData(d); setLastCheck(new Date()); } catch {}
    setLoading(false);
  }

  useEffect(() => { loadStatus(); if (!autoRefresh) return; const i = setInterval(loadStatus, 30000); return () => clearInterval(i); }, [autoRefresh]);

  const overallColor = !data ? "#6b7280" : data.status === "operational" ? "#22c55e" : data.status === "degraded" ? "#f59e0b" : "#ef4444";
  const overallLabel = !data ? "Cargando..." : data.status === "operational" ? "Todos los sistemas operativos" : data.status === "degraded" ? "Rendimiento degradado" : "Interrupcion del servicio";

  const services = data ? [
    { name: "Base de datos", key: "database", icon: "D", detail: data.checks.database.ok ? "Latencia " + data.checks.database.latency + "ms - " + (data.checks.database.metrics?.articles||0) + " articulos - " + (data.checks.database.metrics?.publications||0) + " publicaciones" : data.checks.database.error },
    { name: "Pipeline editorial", key: "pipeline", icon: "P", detail: data.checks.pipeline.ok ? (data.checks.pipeline.lastRun ? "Ultimo run: " + data.checks.pipeline.lastRun.publication + " hace " + data.checks.pipeline.lastRun.hoursAgo + "h (" + data.checks.pipeline.lastRun.status + ")" : "Sin runs") : data.checks.pipeline.error, warning: data.checks.pipeline.warning },
    { name: "Fuentes RSS", key: "sources", icon: "R", detail: data.checks.sources.ok ? data.checks.sources.active + " activas de " + data.checks.sources.total + " totales" : data.checks.sources.error, warning: data.checks.sources.warning },
    { name: "Anthropic API", key: "anthropic", icon: "A", detail: data.checks.anthropic.ok ? "Conectado - latencia " + data.checks.anthropic.latency + "ms" : data.checks.anthropic.error },
    { name: "Unsplash API", key: "unsplash", icon: "U", detail: data.checks.unsplash.ok ? "Conectado" : (data.checks.unsplash.error || "No configurado") },
    { name: "Alertas", key: "alerts", icon: "!", detail: data.checks.alerts.ok ? data.checks.alerts.new + " nuevas - " + data.checks.alerts.critical + " criticas" : "No disponible", warning: data.checks.alerts.critical > 0 ? data.checks.alerts.critical + " alertas criticas" : null },
    { name: "Newsletter", key: "newsletter", icon: "N", detail: data.checks.newsletter.ok ? data.checks.newsletter.total + " suscriptores activos" : "No disponible" }
  ] : [];

  const envVars = data ? [
    { name: "ANTHROPIC_API_KEY", set: data.env.anthropicKey },
    { name: "UNSPLASH_ACCESS_KEY", set: data.env.unsplashKey },
    { name: "RESEND_API_KEY", set: data.env.resendKey },
    { name: "FOUNDER_EMAIL", set: data.env.founderEmail },
    { name: "NEXT_PUBLIC_SITE_URL", set: data.env.siteUrl !== "not set", value: data.env.siteUrl }
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb", paddingBottom: 60 }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/control" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Panel de control</a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Estado del sistema</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.4 }}>{lastCheck ? "Actualizado " + lastCheck.toLocaleTimeString("es-AR") : ""}</span>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ background: autoRefresh ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid " + (autoRefresh ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"), borderRadius: 8, padding: "5px 12px", color: autoRefresh ? "#86efac" : "#9ca3af", cursor: "pointer", fontSize: 12 }}>{autoRefresh ? "Auto ON" : "Auto OFF"}</button>
          <button onClick={loadStatus} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: "#93c5fd", cursor: "pointer", fontSize: 13 }}>Refrescar</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px" }}>
        {loading && <p style={{ opacity: 0.5, textAlign: "center", padding: 60 }}>Verificando servicios...</p>}
        {!loading && data && (
          <>
            <div style={{ border: "1px solid " + overallColor + "44", borderLeft: "4px solid " + overallColor, borderRadius: 14, padding: "20px 24px", background: overallColor + "0f", marginBottom: 28, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: overallColor + "22", border: "2px solid " + overallColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: overallColor, boxShadow: "0 0 12px " + overallColor }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: overallColor }}>{overallLabel}</div>
                <div style={{ fontSize: 13, opacity: 0.5, marginTop: 2 }}>Tiempo de respuesta: {data.responseTime}ms - {new Date(data.timestamp).toLocaleString("es-AR")}</div>
              </div>
            </div>

            <h2 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Servicios</h2>
            <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
              {services.map((svc, i) => {
                const check = data.checks[svc.key];
                const isOk = check?.ok;
                const color = !isOk ? "#ef4444" : svc.warning ? "#f59e0b" : "#22c55e";
                return (
                  <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderLeft: "3px solid " + color, borderRadius: 10, padding: "14px 18px", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: color + "22", border: "1px solid " + color + "44", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color, flexShrink: 0 }}>{svc.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{svc.detail}</div>
                      {svc.warning && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>Advertencia: {svc.warning}</div>}
                    </div>
                    <StatusDot ok={isOk} warning={svc.warning} />
                  </div>
                );
              })}
            </div>

            {data.checks.database.ok && data.checks.database.metrics && (
              <>
                <h2 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Metricas</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 28 }}>
                  {[{ label: "Publicaciones activas", value: data.checks.database.metrics.publications, color: "#8b5cf6" }, { label: "Articulos publicados", value: data.checks.database.metrics.articles, color: "#22c55e" }, { label: "Periodistas IA", value: data.checks.database.metrics.journalists, color: "#3b82f6" }, { label: "Runs ultimas 24h", value: data.checks.database.metrics.runs_24h, color: "#f59e0b" }].map((m, i) => (
                    <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: m.color }}>{m.value}</div>
                      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Variables de entorno</h2>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
              {envVars.map((env, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < envVars.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: env.set ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                  <span style={{ fontFamily: "monospace", fontSize: 13, flex: 1, opacity: env.set ? 0.9 : 0.4 }}>{env.name}</span>
                  <span style={{ fontSize: 12, color: env.set ? "#86efac" : "#fca5a5" }}>{env.value ? env.value : env.set ? "Configurada" : "No configurada"}</span>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Acciones rapidas</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
              {[{ label: "Ver alertas", href: "/alerts", color: "#ef4444" }, { label: "Ver fuentes RSS", href: "/sources", color: "#22c55e" }, { label: "Dashboard", href: "/dashboard", color: "#3b82f6" }, { label: "Analytics", href: "/analytics", color: "#8b5cf6" }, { label: "AI President", href: "/president", color: "#4f46e5" }, { label: "Panel de control", href: "/control", color: "#f59e0b" }].map((link, i) => (
                <a key={i} href={link.href} style={{ textDecoration: "none", border: "1px solid " + link.color + "33", borderRadius: 10, padding: "12px 16px", background: link.color + "0a", display: "block", color: link.color, fontWeight: 600, fontSize: 14 }}>{link.label}</a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
