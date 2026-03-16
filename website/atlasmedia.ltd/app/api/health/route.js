import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function checkDatabase() {
  try {
    const db = getDb();
    const start = Date.now();
    await db.query("SELECT 1");
    const latency = Date.now() - start;
    const counts = await db.query(`SELECT (SELECT COUNT(*) FROM public.publications WHERE status='active') as publications, (SELECT COUNT(*) FROM public.articles WHERE status='published') as articles, (SELECT COUNT(*) FROM public.journalists WHERE active=true) as journalists, (SELECT COUNT(*) FROM public.pipeline_runs WHERE started_at>NOW()-INTERVAL '24h') as runs_24h`);
    return { ok: true, latency, metrics: counts.rows[0] };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function checkPipeline() {
  try {
    const db = getDb();
    const last = await db.query(`SELECT pr.*, p.name as pub_name FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id=p.id ORDER BY pr.started_at DESC LIMIT 5`);
    const lastRun = last.rows[0];
    const hoursSinceLastRun = lastRun ? Math.floor((Date.now() - new Date(lastRun.started_at)) / 3600000) : null;
    const recentFailures = last.rows.filter(r => r.status === "failed").length;
    return { ok: true, lastRun: lastRun ? { status: lastRun.status, publication: lastRun.pub_name, hoursAgo: hoursSinceLastRun, articlesPublished: lastRun.articles_published } : null, recentFailures, warning: hoursSinceLastRun > 8 ? "Sin pipeline en mas de 8 horas" : null };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function checkSources() {
  try {
    const db = getDb();
    const result = await db.query(`SELECT COUNT(*) as total, SUM(CASE WHEN active THEN 1 ELSE 0 END) as active, SUM(CASE WHEN error_count>3 THEN 1 ELSE 0 END) as failing FROM public.news_sources`);
    const row = result.rows[0];
    return { ok: true, total: parseInt(row.total||0), active: parseInt(row.active||0), failing: parseInt(row.failing||0), warning: parseInt(row.active||0) === 0 ? "Sin fuentes activas" : null };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function checkExternalService(url) {
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, latency: Date.now() - start, error: res.ok ? null : "HTTP " + res.status };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function checkAlerts() {
  try {
    const db = getDb();
    const result = await db.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) as new_count, SUM(CASE WHEN severity='critical' AND status='new' THEN 1 ELSE 0 END) as critical FROM public.alerts`).catch(() => ({ rows: [{ total: 0, new_count: 0, critical: 0 }] }));
    const row = result.rows[0];
    return { ok: true, total: parseInt(row.total||0), new: parseInt(row.new_count||0), critical: parseInt(row.critical||0) };
  } catch { return { ok: true, total: 0, new: 0, critical: 0 }; }
}

async function checkNewsletter() {
  try {
    const db = getDb();
    const result = await db.query(`SELECT COUNT(*) as total FROM public.newsletter_subscribers WHERE status='active'`).catch(() => ({ rows: [{ total: 0 }] }));
    return { ok: true, total: parseInt(result.rows[0]?.total||0) };
  } catch { return { ok: true, total: 0 }; }
}

export async function GET() {
  const start = Date.now();
  const [db, pipeline, sources, anthropic, unsplash, alerts, newsletter] = await Promise.all([
    checkDatabase(), checkPipeline(), checkSources(),
    checkExternalService("https://api.anthropic.com"),
    process.env.UNSPLASH_ACCESS_KEY ? checkExternalService("https://api.unsplash.com/photos?per_page=1&client_id=" + process.env.UNSPLASH_ACCESS_KEY) : Promise.resolve({ ok: !!process.env.UNSPLASH_ACCESS_KEY, error: "No configurado" }),
    checkAlerts(), checkNewsletter()
  ]);
  const allOk = db.ok && pipeline.ok && sources.ok;
  const hasWarnings = pipeline.warning || sources.warning || alerts.critical > 0;
  return NextResponse.json({ ok: allOk, status: allOk && !hasWarnings ? "operational" : hasWarnings ? "degraded" : "outage", responseTime: Date.now() - start, timestamp: new Date().toISOString(), checks: { database: db, pipeline, sources, anthropic, unsplash, alerts, newsletter }, env: { anthropicKey: !!process.env.ANTHROPIC_API_KEY, unsplashKey: !!process.env.UNSPLASH_ACCESS_KEY, resendKey: !!process.env.RESEND_API_KEY, founderEmail: !!process.env.FOUNDER_EMAIL, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "not set" } });
}
