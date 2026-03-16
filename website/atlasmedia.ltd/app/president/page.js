"use client";

import { useState, useEffect, useRef } from "react";

export default function PresidentPage() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "AI President OS activo. Estoy monitoreando todas las operaciones de Atlas Media Network. ¿Qué instrucciones tenés para mí?" }]);
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
      setMessages(prev => [...prev, { role: "assistant", content: data.ok ? data.reply : `Error: ${data.error}` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    }
    setLoading(false);
  }

  const quickActions = [
    { label: "¿Cómo está el sistema?", msg: "Dame un reporte ejecutivo del estado actual de Atlas Media Network." },
    { label: "Estado del pipeline", msg: "¿Cuándo fue el último run del pipeline y cuántos artículos se publicaron?" },
    { label: "Disparar pipeline", msg: "Ejecutá el pipeline editorial para Argentina Post ahora." },
    { label: "Próximos pasos", msg: "¿Cuáles son las prioridades estratégicas más urgentes del holding?" }
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>← Atlas</a>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>AI President OS</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Atlas Media Network · Founder channel</div>
          </div>
        </div>
        {status && <div style={{ fontSize: 12, opacity: 0.5 }}>📰 {status.metrics?.totalArticles || 0} artículos · 🟢 activo</div>}
      </div>

      <div style={{ padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {quickActions.map((a, i) => (
          <button key={i} onClick={() => setInput(a.msg)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 14px", color: "#93c5fd", fontSize: 12, cursor: "pointer" }}>{a.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginRight: 10, flexShrink: 0, marginTop: 2 }}>⚡</div>
            )}
            <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "rgba(79,70,229,0.3)" : "rgba(255,255,255,0.05)", border: `1px solid ${msg.role === "user" ? "rgba(79,70,229,0.4)" : "rgba(255,255,255,0.08)"}`, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⚡</div>
            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, opacity: 0.6 }}>Analizando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 12, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribí tu instrucción al AI President..." disabled={loading}
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "#e5e7eb", fontSize: 14, outline: "none" }} />
        <button type="submit" disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "rgba(79,70,229,0.3)" : "rgba(79,70,229,0.8)", border: "none", borderRadius: 12, padding: "12px 20px", color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14 }}>
          Enviar
        </button>
      </form>
    </div>
  );
}
