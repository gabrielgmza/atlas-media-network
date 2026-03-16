import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

async function ensureSourcesTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.news_sources (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, category TEXT, language TEXT DEFAULT 'es', active BOOLEAN DEFAULT true, last_fetched_at TIMESTAMPTZ, fetch_count INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
}

async function testRssFeed(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "AtlasMediaNetwork/1.0 RSS Reader" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, error: "HTTP " + res.status };
    const text = await res.text();
    const hasRss = text.includes("<rss") || text.includes("<feed") || text.includes("<channel");
    if (!hasRss) return { ok: false, error: "No es un feed RSS valido" };
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/);
    const itemCount = (text.match(/<item|<entry/g) || []).length;
    return { ok: true, feedTitle: titleMatch?.[1]?.trim() || url, itemCount };
  } catch (err) { return { ok: false, error: err.message }; }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const db = getDb();
    await ensureSourcesTable();
    const query = publicationId
      ? `SELECT s.*, p.name as publication_name FROM public.news_sources s LEFT JOIN public.publications p ON s.publication_id=p.id WHERE s.publication_id=$1 ORDER BY s.active DESC, s.name ASC`
      : `SELECT s.*, p.name as publication_name FROM public.news_sources s LEFT JOIN public.publications p ON s.publication_id=p.id ORDER BY s.publication_id, s.active DESC, s.name ASC`;
    const result = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
    const stats = await db.query(`SELECT publication_id, COUNT(*) as total, SUM(CASE WHEN active THEN 1 ELSE 0 END) as active_count FROM public.news_sources GROUP BY publication_id`);
    return NextResponse.json({ ok: true, sources: result.rows, stats: stats.rows });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    if (body.action === "test") { const result = await testRssFeed(body.url); return NextResponse.json({ ok: true, test: result }); }
    const { publicationId, name, url, category, language } = body;
    if (!publicationId || !name || !url) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const test = await testRssFeed(url);
    if (!test.ok) return NextResponse.json({ ok: false, error: "Feed RSS invalido: " + test.error, testResult: test }, { status: 400 });
    const db = getDb();
    await ensureSourcesTable();
    const id = "src-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
    const result = await db.query(`INSERT INTO public.news_sources (id,publication_id,name,url,category,language,active) VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING RETURNING *`, [id, publicationId, name, url, category||null, language||"es"]);
    return NextResponse.json({ ok: true, source: result.rows[0], feedInfo: { title: test.feedTitle, itemCount: test.itemCount } }, { status: 201 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { id, active, name, category } = body;
    const db = getDb();
    const result = await db.query(`UPDATE public.news_sources SET active=COALESCE($2,active), name=COALESCE($3,name), category=COALESCE($4,category) WHERE id=$1 RETURNING *`, [id, active !== undefined ? active : null, name||null, category||null]);
    return NextResponse.json({ ok: true, source: result.rows[0] });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const db = getDb();
    await db.query(`DELETE FROM public.news_sources WHERE id=$1`, [searchParams.get("id")]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
