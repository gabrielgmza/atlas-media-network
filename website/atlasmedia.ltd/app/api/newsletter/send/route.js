import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { getSubscribers, generateNewsletter, sendNewsletter, saveNewsletterSend } from "../../../../lib/newsletter";

async function getRecentArticles(publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT title,excerpt,slug,author,category,published_at FROM public.articles WHERE publication=$1 AND status='published' AND published_at>NOW()-INTERVAL '7 days' ORDER BY published_at DESC LIMIT 10`, [publicationId]);
  return result.rows;
}

async function getPublicationInfo(publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]);
  return result.rows[0];
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const publicationId = body.publicationId || body.publication;
    const [pub, subscribers, articles] = await Promise.all([getPublicationInfo(publicationId), getSubscribers(publicationId), getRecentArticles(publicationId)]);
    if (!pub) return NextResponse.json({ ok: false, error: "PUBLICATION_NOT_FOUND" }, { status: 404 });
    if (!subscribers.length) return NextResponse.json({ ok: false, error: "NO_SUBSCRIBERS" });
    if (!articles.length) return NextResponse.json({ ok: false, error: "NO_ARTICLES" });
    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
    const newsletter = await generateNewsletter({ publication: pub, articles, territory: pub.territory_name || "Argentina" });
    const html = newsletter.html.replace(/\{\{BASE_URL\}\}/g, BASE_URL).replace(/\{\{UNSUBSCRIBE_URL\}\}/g, `${BASE_URL}/api/newsletter/subscribe?unsubscribe=true`);
    let sent = 0; let failed = 0;
    for (let i = 0; i < subscribers.length; i += 50) {
      const batch = subscribers.slice(i, i+50);
      try { await sendNewsletter({ to: batch, subject: newsletter.subject, html, fromName: pub.name }); sent += batch.length; }
      catch { failed += batch.length; }
      await new Promise(r => setTimeout(r, 500));
    }
    await saveNewsletterSend({ publicationId, subject: newsletter.subject, htmlContent: html, recipientsCount: sent, status: sent > 0 ? "sent" : "failed" });
    const db = getDb();
    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'newsletter',$2,$3,'medium',NOW(),'global')`, [`mem-nl-${Date.now()}`, `Newsletter: ${pub.name}`, `${sent} emails enviados. Asunto: ${newsletter.subject}`]).catch(()=>{});
    return NextResponse.json({ ok: true, publication: pub.name, sent, failed, subject: newsletter.subject });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
