import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function POST(request) {
  try {
    const db = getDb();
    await db.query(`CREATE TABLE IF NOT EXISTS public.pageviews (id TEXT PRIMARY KEY, publication_id TEXT, article_slug TEXT, article_id TEXT, referrer TEXT, user_agent TEXT, country TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    const body = await request.json();
    const { publicationId, articleSlug, articleId, referrer } = body;
    const userAgent = request.headers.get("user-agent") || "";
    const botPatterns = /bot|crawler|spider|scraper|curl|wget|python|java/i;
    if (botPatterns.test(userAgent)) return NextResponse.json({ ok: true, tracked: false });
    const id = `pv-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    await db.query(`INSERT INTO public.pageviews (id,publication_id,article_slug,article_id,referrer,user_agent) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, publicationId||null, articleSlug||null, articleId||null, referrer||null, userAgent.slice(0,200)]);
    return NextResponse.json({ ok: true, tracked: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
