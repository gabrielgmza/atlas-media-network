import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";
const MIN_VIEWS = 100;

async function ensureAbTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.ab_experiments (id TEXT PRIMARY KEY, article_id TEXT NOT NULL, article_slug TEXT NOT NULL, publication_id TEXT, title_a TEXT NOT NULL, title_b TEXT NOT NULL, views_a INTEGER DEFAULT 0, views_b INTEGER DEFAULT 0, clicks_a INTEGER DEFAULT 0, clicks_b INTEGER DEFAULT 0, status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','cancelled')), winner TEXT CHECK (winner IN ('a','b','tie') OR winner IS NULL), started_at TIMESTAMPTZ DEFAULT NOW(), decided_at TIMESTAMPTZ)`);
}

async function generateVariantB(titleA, excerpt, category) {
  const prompt = "Sos un experto en titulares periodisticos. Genera una variante B para A/B testing.\n\nTITULAR A: "+titleA+"\nCATEGORIA: "+(category||"")+"\nEXCERPT: "+(excerpt||"").slice(0,200)+"\n\nLa variante B debe ser diferente en enfoque, misma longitud aprox (max 80 chars), espanol argentino, sin clickbait exagerado.\n\nResponde SOLO en JSON valido sin markdown:\n{\"titleB\":\"el titular alternativo\"}";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim()).titleB;
}

async function decideWinner(experiment) {
  const db = getDb();
  const ctrA = (experiment.clicks_a||0) / Math.max(experiment.views_a||1, 1);
  const ctrB = (experiment.clicks_b||0) / Math.max(experiment.views_b||1, 1);
  const diff = Math.abs(ctrA - ctrB);
  const winner = diff < 0.01 ? "tie" : ctrA > ctrB ? "a" : "b";
  await db.query(`UPDATE public.ab_experiments SET status='completed', winner=$1, decided_at=NOW() WHERE id=$2`, [winner, experiment.id]);
  if (winner === "b") await db.query(`UPDATE public.articles SET title=$1 WHERE id=$2`, [experiment.title_b, experiment.article_id]);
  return { winner, ctrA, ctrB };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleSlug = searchParams.get("article");
    const publicationId = searchParams.get("publication");
    const status = searchParams.get("status") || "running";
    const db = getDb(); await ensureAbTable();

    if (articleSlug) {
      const result = await db.query(`SELECT * FROM public.ab_experiments WHERE article_slug=$1 AND status='running' LIMIT 1`, [articleSlug]);
      return NextResponse.json({ ok: true, experiment: result.rows[0]||null });
    }

    const adminToken = request.headers.get("x-atlas-admin-token");
    if (adminToken !== process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const query = publicationId
      ? `SELECT e.*, a.category FROM public.ab_experiments e LEFT JOIN public.articles a ON e.article_id=a.id WHERE e.publication_id=$1 AND e.status=$2 ORDER BY e.started_at DESC LIMIT 50`
      : `SELECT e.*, a.category, a.publication_name FROM public.ab_experiments e LEFT JOIN public.articles a ON e.article_id=a.id WHERE e.status=$1 ORDER BY e.started_at DESC LIMIT 50`;
    const result = publicationId ? await db.query(query, [publicationId, status]) : await db.query(query, [status]);
    const summary = await db.query(`SELECT status, COUNT(*) as count, SUM(CASE WHEN winner='b' THEN 1 ELSE 0 END) as b_wins FROM public.ab_experiments GROUP BY status`);
    return NextResponse.json({ ok: true, experiments: result.rows, summary: summary.rows });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const db = getDb(); await ensureAbTable();

    if (body.action === "view" || body.action === "click") {
      const { experimentId, variant } = body;
      if (!experimentId || !variant) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
      const field = body.action === "view" ? "views_"+variant : "clicks_"+variant;
      await db.query("UPDATE public.ab_experiments SET "+field+"="+field+"+1 WHERE id=$1", [experimentId]);
      if (body.action === "view") {
        const exp = await db.query("SELECT * FROM public.ab_experiments WHERE id=$1", [experimentId]);
        if (exp.rows.length) { const e = exp.rows[0]; if (((e.views_a||0)+(e.views_b||0)) >= MIN_VIEWS && e.status === "running") await decideWinner(e); }
      }
      return NextResponse.json({ ok: true });
    }

    const adminToken = request.headers.get("x-atlas-admin-token");
    if (adminToken !== process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { articleId, articleSlug, publicationId, titleA, excerpt, category } = body;
    if (!articleId || !articleSlug || !titleA) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const existing = await db.query("SELECT id FROM public.ab_experiments WHERE article_slug=$1 AND status='running'", [articleSlug]);
    if (existing.rows.length) return NextResponse.json({ ok: false, error: "EXPERIMENT_ALREADY_RUNNING" });
    const titleB = body.titleB || await generateVariantB(titleA, excerpt, category);
    const id = "ab-"+Date.now()+"-"+Math.random().toString(36).slice(2,5);
    await db.query("INSERT INTO public.ab_experiments (id,article_id,article_slug,publication_id,title_a,title_b) VALUES ($1,$2,$3,$4,$5,$6)", [id, articleId, articleSlug, publicationId||null, titleA, titleB]);
    return NextResponse.json({ ok: true, experiment: { id, titleA, titleB } }, { status: 201 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const db = getDb();
    if (body.action === "cancel") { await db.query("UPDATE public.ab_experiments SET status='cancelled' WHERE id=$1", [body.id]); return NextResponse.json({ ok: true }); }
    if (body.action === "decide") {
      const exp = await db.query("SELECT * FROM public.ab_experiments WHERE id=$1", [body.id]);
      if (!exp.rows.length) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      const result = await decideWinner(exp.rows[0]);
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json({ ok: false, error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
