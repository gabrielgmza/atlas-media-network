import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function ensureCommentsTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.comments (id TEXT PRIMARY KEY, article_id TEXT, article_slug TEXT NOT NULL, publication_id TEXT, author_name TEXT NOT NULL, author_email TEXT NOT NULL, content TEXT NOT NULL, status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','spam')), moderation_score INTEGER, moderation_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
}

async function moderateComment(content, authorName) {
  const prompt = "Sos el AI Moderador de Atlas Media Network. Evalua este comentario:\n\nAutor: " + authorName + "\nComentario: " + content + "\n\nRechaza si: spam, insultos, odio, desinformacion evidente. Aprueba si: opinion genuina, pregunta relevante, aporte informativo, critica constructiva.\n\nResponde SOLO en JSON valido sin markdown:\n{\"decision\":\"approve o reject\",\"score\":1-10,\"reason\":\"razon breve\"}";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, messages: [{ role: "user", content: prompt }] }) });
    const data = await res.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch { return { decision: "approve", score: 5, reason: "Moderacion no disponible" }; }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleSlug = searchParams.get("article");
    const status = searchParams.get("status") || "approved";
    const adminToken = request.headers.get("x-atlas-admin-token");
    const isAdmin = adminToken === process.env.ATLAS_ADMIN_TOKEN;
    const db = getDb();
    await ensureCommentsTable();

    if (articleSlug) {
      const result = await db.query(`SELECT id,author_name,content,created_at,moderation_score FROM public.comments WHERE article_slug=$1 AND status='approved' ORDER BY created_at ASC`, [articleSlug]);
      const count = await db.query(`SELECT COUNT(*) as total FROM public.comments WHERE article_slug=$1 AND status='approved'`, [articleSlug]);
      return NextResponse.json({ ok: true, comments: result.rows, total: parseInt(count.rows[0].total) });
    }

    if (isAdmin) {
      const result = await db.query(`SELECT c.*, a.title as article_title FROM public.comments c LEFT JOIN public.articles a ON c.article_slug=a.slug WHERE c.status=$1 ORDER BY c.created_at DESC LIMIT 100`, [status]);
      const stats = await db.query(`SELECT status, COUNT(*) as count FROM public.comments GROUP BY status`);
      const summary = {};
      stats.rows.forEach(r => { summary[r.status] = parseInt(r.count); });
      return NextResponse.json({ ok: true, comments: result.rows, summary });
    }

    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { articleId, articleSlug, publicationId, authorName, authorEmail, content } = body;
    if (!articleSlug || !authorName || !authorEmail || !content) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    if (content.length < 5) return NextResponse.json({ ok: false, error: "Comentario demasiado corto" }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ ok: false, error: "Maximo 2000 caracteres" }, { status: 400 });
    const db = getDb();
    await ensureCommentsTable();
    const existing = await db.query(`SELECT COUNT(*) as count FROM public.comments WHERE article_slug=$1 AND author_email=$2 AND created_at>NOW()-INTERVAL '24 hours'`, [articleSlug, authorEmail.toLowerCase()]);
    if (parseInt(existing.rows[0].count) >= 3) return NextResponse.json({ ok: false, error: "Limite alcanzado. Intenta mas tarde." }, { status: 429 });
    const moderation = await moderateComment(content, authorName);
    const status = moderation.decision === "reject" ? "rejected" : "approved";
    const id = "cmt-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
    await db.query(`INSERT INTO public.comments (id,article_id,article_slug,publication_id,author_name,author_email,content,status,moderation_score,moderation_reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, articleId||null, articleSlug, publicationId||null, authorName, authorEmail.toLowerCase(), content, status, moderation.score, moderation.reason]);
    return NextResponse.json({ ok: true, status, message: status === "approved" ? "Comentario publicado." : "Tu comentario no pudo ser publicado." }, { status: 201 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const db = getDb();
    await db.query(`UPDATE public.comments SET status=$2 WHERE id=$1`, [body.id, body.status]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const db = getDb();
    await db.query(`DELETE FROM public.comments WHERE id=$1`, [searchParams.get("id")]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
