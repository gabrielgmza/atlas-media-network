import { getDb } from "./db";

export async function ensureAlertsTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.alerts (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('pipeline_failure','breaking_news','no_content','system_error','expansion','custom')), title TEXT NOT NULL, detail TEXT, publication_id TEXT, severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')), status TEXT DEFAULT 'new' CHECK (status IN ('new','read','resolved')), email_sent BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`);
}

export async function createAlert({ type, title, detail, publicationId, severity = "medium" }) {
  const db = getDb();
  await ensureAlertsTable();
  const id = "alert-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
  await db.query(`INSERT INTO public.alerts (id,type,title,detail,publication_id,severity) VALUES ($1,$2,$3,$4,$5,$6)`, [id, type, title, detail||null, publicationId||null, severity]);
  return id;
}

export async function getAlerts({ status, limit = 50 } = {}) {
  const db = getDb();
  await ensureAlertsTable();
  const query = status
    ? `SELECT a.*, p.name as publication_name FROM public.alerts a LEFT JOIN public.publications p ON a.publication_id=p.id WHERE a.status=$1 ORDER BY a.created_at DESC LIMIT $2`
    : `SELECT a.*, p.name as publication_name FROM public.alerts a LEFT JOIN public.publications p ON a.publication_id=p.id ORDER BY a.created_at DESC LIMIT $1`;
  const result = status ? await db.query(query, [status, limit]) : await db.query(query, [limit]);
  return result.rows;
}

export async function sendEmailAlert({ type, title, detail, severity, publicationId }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const severityColors = { low: "#6b7280", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
  const color = severityColors[severity] || severityColors.medium;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
  const html = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;'><div style='background:#0b1020;padding:20px 28px;'><span style='color:#fff;font-weight:700;font-size:16px;'>Atlas Media Network</span></div><div style='border-top:4px solid "+color+";padding:28px;'><div style='display:inline-block;background:"+color+"22;color:"+color+";border:1px solid "+color+"44;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:16px;'>"+severity+" - "+type.replace(/_/g," ")+"</div><h2 style='margin:0 0 12px;font-size:22px;color:#111;'>"+title+"</h2>"+(detail?"<p style='color:#555;line-height:1.6;margin:0 0 20px;'>"+detail+"</p>":"")+"<a href='"+BASE_URL+"/alerts' style='background:#0b1020;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;'>Ver alertas</a></div><div style='background:#f8f8f8;padding:16px 28px;font-size:12px;color:#888;'>Atlas Media Network - "+new Date().toLocaleString("es-AR")+"</div></div>";
  try {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey }, body: JSON.stringify({ from: "Atlas Alerts <alerts@atlasmedia.ltd>", to: [process.env.FOUNDER_EMAIL || "gabriel@atlasmedia.ltd"], subject: "[" + severity.toUpperCase() + "] " + title, html }) });
    return res.ok;
  } catch { return false; }
}

export async function detectBreakingNews(articles) {
  if (!articles?.length) return [];
  const articleList = articles.slice(0,5).map((a,i) => (i+1) + ". " + a.title + " [" + a.category + "]").join("\n");
  const prompt = "Sos el AI Breaking News Detector de Atlas Media Network.\n\nAnaliza estas noticias y determina cuales son BREAKING NEWS que merecen alerta inmediata:\n\n" + articleList + "\n\nCriterios: evento de alto impacto, muerte de figura publica, crisis politica grave, hecho economico mayor, urgencia informativa real.\n\nResponde SOLO en JSON valido sin markdown:\n{\"breakingNews\":[{\"index\":1,\"title\":\"titulo\",\"reason\":\"razon en 1 oracion\"}]}\nSi no hay breaking news: {\"breakingNews\":[]}";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: prompt }] }) });
    const data = await res.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return parsed.breakingNews || [];
  } catch { return []; }
}
