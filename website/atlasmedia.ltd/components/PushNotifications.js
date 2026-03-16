"use client";
import { useState, useEffect } from "react";

export default function PushNotifications({ publicationId, accentColor = "#cc0000" }) {
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "granted") checkSubscription();
    else if (Notification.permission === "denied") setStatus("denied");
  }, []);

  async function checkSubscription() {
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) setStatus("subscribed"); } catch {}
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function subscribe() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }
      const keyRes = await fetch("/api/push?action=vapid-key");
      const keyData = await keyRes.json();
      if (!keyData.ok || !keyData.publicKey || keyData.publicKey.includes("NOT_SET")) throw new Error("VAPID no configurado");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) });
      const saveRes = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub, publicationId }) });
      const saveData = await saveRes.json();
      if (saveData.ok) { setStatus("subscribed"); setMsg("Notificaciones activadas."); }
      else throw new Error(saveData.error);
    } catch (err) { setStatus("idle"); setMsg("Error: " + err.message); }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await sub.unsubscribe(); await fetch("/api/push?endpoint=" + encodeURIComponent(sub.endpoint), { method: "DELETE" }); }
      setStatus("idle"); setMsg("Notificaciones desactivadas.");
    } catch (err) { setMsg("Error: " + err.message); }
  }

  if (status === "unsupported") return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      {status === "subscribed" ? (
        <button onClick={unsubscribe} style={{ display: "flex", alignItems: "center", gap: 8, background: accentColor+"15", border: "1px solid "+accentColor+"44", borderRadius: 8, padding: "7px 14px", color: accentColor, cursor: "pointer", fontSize: 13, fontFamily: "Arial" }}>
          Notificaciones activadas
        </button>
      ) : status === "loading" ? (
        <button disabled style={{ background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, padding: "7px 14px", color: "#888", fontSize: 13, fontFamily: "Arial" }}>Activando...</button>
      ) : status === "denied" ? (
        <span style={{ fontSize: 12, color: "#888", fontFamily: "Arial" }}>Notificaciones bloqueadas</span>
      ) : (
        <button onClick={subscribe} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, padding: "7px 14px", color: "#444", cursor: "pointer", fontSize: 13, fontFamily: "Arial" }}>
          Activar notificaciones
        </button>
      )}
      {msg && <span style={{ fontSize: 12, color: "#888", fontFamily: "Arial" }}>{msg}</span>}
    </div>
  );
}
