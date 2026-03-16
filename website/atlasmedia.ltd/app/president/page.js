"use client";

import { useState, useEffect, useRef } from "react";

export default function PresidentPage() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "AI President OS activo. Estoy monitoreando todas las operaciones de Atlas Media Network. Puedo ejecutar acciones reales: pipeline, expansion, newsletter, analytics y mas. Que instrucciones tenes?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { fetch("/api/president/status").then(r => r.json()).then(d => setStatus(d)).catch(() => {}); }, []);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/president/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-atlas-admin-token": token },
        body: JSON.stringify({ message: userMsg, history })
      });
      const data = await res.json();
      if (data.ok) {
        let reply = data.reply;
        if (data.actionsExecuted && data.actionsExecuted.length > 0) {
          const actionLines = data.actionsExecuted.map(a => ">> " + a.tool + ": " + a.result).join("\n");
          reply = reply + "\n\n" + actionLines;
        }
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Error: " + data.error }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error de conexion: " + err.message }]);
    }
    setLoading(false);
  }

  const quickActions = [
    { label: "Estado del holding", msg: "Dame un reporte ejecutivo del estado actual de Atlas Media Network." },
    { label: "Ejecutar pipeline", msg: "Ejecuta el pipeline editorial para argentina-post ahora." },
    { label: "Ver analytics", msg: "Mostrame las metricas de trafico de los ultimos 30 dias." },
    { label: "Proximos pasos", msg: "Cuales son las prioridades estrategicas mas urgentes del holding?" },
    { label: "Lanzar medio", msg: "Analiza y lanza un nuevo medio para Cordoba." },
    { label: "Estado pipeline", msg: "Cual es el estado de los ultimos pipeline runs?" }
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Atlas</a>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>P</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>AI President OS</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Atlas Media Network - Founder channel - Ejecucion real habilitada</div>
          </div>
        </div>
        {status && <div style={{ fontSize: 12, opacity: 0.5 }}>Articulos: {status.metrics?.totalArticles || 0} - Activo</div>}
      </div>

      <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {quickActions.map((a, i) => (
          <button key={i} onClick={() => setInput(a.msg)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 14px", color: "#93c5fd", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>{a.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", marginRight: 10, flexShrink: 0, marginTop: 2 }}>P</div>
            )}
            <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "rgba(79,70,229,0.3)" : "rgba(255,255,255,0.05)", border: "1px solid " + (msg.role === "user" ? "rgba(79,70,229,0.4)" : "rgba(255,255,255,0.08)"), fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>P</div>
            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, opacity: 0.6 }}>Procesando y ejecutando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 12, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Instruccion al AI President... (ejecuta acciones reales)" disabled={loading}
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "#e5e7eb", fontSize: 14, outline: "none" }} />
        <button type="submit" disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "rgba(79,70,229,0.3)" : "rgba(79,70,229,0.8)", border: "none", borderRadius: 12, padding: "12px 20px", color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14 }}>
          Enviar
        </button>
      </form>
    </div>
  );
}
