import { NextResponse } from "next/server";
import { getImageForArticle, saveArticleImage } from "../../../lib/images";
import { getDb } from "../../../lib/db";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const body = await request.json();
    const { articleId, title, category, excerpt, publication } = body;
    if (!title || !category) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const image = await getImageForArticle({ title, category, excerpt, publication });
    if (!image) return NextResponse.json({ ok: false, error: "NO_IMAGE_FOUND" });
    if (articleId) await saveArticleImage(articleId, image);
    return NextResponse.json({ ok: true, image });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const limit = parseInt(searchParams.get("limit") || "10");
    const db = getDb();
    await db.query(`ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS image_url TEXT, ADD COLUMN IF NOT EXISTS image_thumb TEXT, ADD COLUMN IF NOT EXISTS image_alt TEXT, ADD COLUMN IF NOT EXISTS image_credit TEXT, ADD COLUMN IF NOT EXISTS image_credit_url TEXT, ADD COLUMN IF NOT EXISTS image_query TEXT`);
    const articles = publicationId
      ? await db.query(`SELECT id,title,category,excerpt,publication_name FROM public.articles WHERE image_url IS NULL AND status='published' AND publication=$1 ORDER BY published_at DESC LIMIT $2`, [publicationId, limit])
      : await db.query(`SELECT id,title,category,excerpt,publication_name FROM public.articles WHERE image_url IS NULL AND status='published' ORDER BY published_at DESC LIMIT $1`, [limit]);
    const results = { processed: 0, success: 0, failed: 0 };
    for (const article of articles.rows) {
      results.processed++;
      try {
        const image = await getImageForArticle({ title: article.title, category: article.category, excerpt: article.excerpt, publication: article.publication_name });
        if (image) { await saveArticleImage(article.id, image); results.success++; }
        else results.failed++;
        await new Promise(r => setTimeout(r, 500));
      } catch { results.failed++; }
    }
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
