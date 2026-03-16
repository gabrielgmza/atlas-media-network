import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const slug = searchParams.get("slug");
    const db = getDb();

    if (slug) {
      const result = await db.query(`SELECT j.*, p.name as publication_name, p.slug as publication_slug, p.scope, t.name as territory_name, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published') as article_count, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published' AND a.published_at>NOW()-INTERVAL '30 days') as articles_last30 FROM public.journalists j LEFT JOIN public.publications p ON j.publication_id=p.id LEFT JOIN public.territories t ON p.territory_id=t.id WHERE j.slug=$1 OR lower(replace(replace(j.name,' ','-'),'.',''))=$1`, [slug]);
      if (!result.rows.length) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      const journalist = result.rows[0];
      const articles = await db.query(`SELECT id,slug,title,excerpt,category,published_at,image_thumb FROM public.articles WHERE journalist_id=$1 AND status='published' ORDER BY published_at DESC LIMIT 20`, [journalist.id]);
      return NextResponse.json({ ok: true, journalist, articles: articles.rows });
    }

    const query = publicationId
      ? `SELECT j.*, p.name as publication_name, p.slug as publication_slug, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published') as article_count FROM public.journalists j LEFT JOIN public.publications p ON j.publication_id=p.id WHERE j.publication_id=$1 AND j.active=true ORDER BY article_count DESC`
      : `SELECT j.*, p.name as publication_name, p.slug as publication_slug, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published') as article_count FROM public.journalists j LEFT JOIN public.publications p ON j.publication_id=p.id WHERE j.active=true ORDER BY p.name, article_count DESC`;
    const result = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
    return NextResponse.json({ ok: true, journalists: result.rows });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { id, name, role, bio, tone, style, beat, personality, active } = body;
    const db = getDb();
    const updates = []; const values = []; let idx = 1;
    if (name !== undefined) { updates.push("name=$"+idx); values.push(name); idx++; }
    if (role !== undefined) { updates.push("role=$"+idx); values.push(role); idx++; }
    if (bio !== undefined) { updates.push("bio=$"+idx); values.push(bio); idx++; }
    if (tone !== undefined) { updates.push("tone=$"+idx); values.push(tone); idx++; }
    if (style !== undefined) { updates.push("style=$"+idx); values.push(style); idx++; }
    if (beat !== undefined) { updates.push("beat=$"+idx); values.push(beat); idx++; }
    if (personality !== undefined) { updates.push("personality=$"+idx); values.push(personality); idx++; }
    if (active !== undefined) { updates.push("active=$"+idx); values.push(active); idx++; }
    if (!updates.length) return NextResponse.json({ ok: false, error: "NOTHING_TO_UPDATE" }, { status: 400 });
    values.push(id);
    const result = await db.query("UPDATE public.journalists SET "+updates.join(",")+" WHERE id=$"+idx+" RETURNING *", values);
    if (!result.rows.length) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, journalist: result.rows[0] });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
