import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

async function getJournalistForType(publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT * FROM public.journalists WHERE publication_id=$1 AND active=true ORDER BY RANDOM() LIMIT 1`, [publicationId]);
  return result.rows[0] || null;
}

async function getRecentContext(publicationId) {
  const db = getDb();
  const articles = await db.query(`SELECT title, category, published_at FROM public.articles WHERE publication=$1 AND status='published' AND published_at>NOW()-INTERVAL '7 days' ORDER BY published_at DESC LIMIT 10`, [publicationId]);
  return articles.rows;
}

async function generateOpinionColumn({ journalist, publication, territory, recentNews }) {
  const newsList = recentNews.map(n => "- " + n.title + " (" + n.category + ")").join("\n");
  const prompt = "Sos " + journalist.name + ", " + journalist.role + " de " + publication.name + ".\n\nPerfil: " + (journalist.bio || "Periodista experimentado con vision critica.") + "\nEstilo: " + (journalist.tone || "analitico, directo, con opinion propia") + "\n\nNoticias recientes de " + territory + ":\n" + newsList + "\n\nEscribi una COLUMNA DE OPINION editorial de calidad periodistica real. Toma una posicion clara, voz propia y autentica, entre 600-900 palabras, 5-7 parrafos.\n\nRespunde SOLO en JSON valido sin markdown:\n{\"title\":\"titulo\",\"excerpt\":\"bajada max 180 chars\",\"content\":[\"p1\",\"p2\",\"p3\",\"p4\",\"p5\"],\"topic\":\"tema\",\"seoTitle\":\"max 60 chars\",\"seoDescription\":\"max 160 chars\"}";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2500, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function generateInvestigation({ journalist, publication, territory, recentNews }) {
  const newsList = recentNews.map(n => "- " + n.title + " (" + n.category + ")").join("\n");
  const prompt = "Sos " + journalist.name + ", " + journalist.role + " de " + publication.name + ", especializado en periodismo de investigacion.\n\nNoticias recientes de " + territory + ":\n" + newsList + "\n\nEscribi un ARTICULO DE INVESTIGACION profundo sobre UN tema relevante. Analiza causas, consecuencias, contexto historico. Cita fuentes genericas creibles. Entre 800-1200 palabras, 6-8 parrafos.\n\nRespunde SOLO en JSON valido sin markdown:\n{\"title\":\"titulo\",\"excerpt\":\"bajada max 200 chars\",\"content\":[\"p1\",\"p2\",\"p3\",\"p4\",\"p5\",\"p6\"],\"topic\":\"tema\",\"seoTitle\":\"max 60 chars\",\"seoDescription\":\"max 160 chars\"}";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function saveArticle({ content, journalist, publication, contentType }) {
  const db = getDb();
  const slug = content.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) + "-" + Date.now().toString(36);
  const category = contentType === "opinion" ? "Opinion" : "Investigacion";
  const section = contentType === "opinion" ? "Columnas" : "Investigacion";
  await db.query(
    `INSERT INTO public.articles (id,slug,title,excerpt,content,category,section,tone,author,author_role,publication,publication_name,status,ai_generated,journalist_id,seo_title,seo_description,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',true,$13,$14,$15,NOW(),NOW())`,
    ["art-" + Date.now() + "-" + Math.random().toString(36).slice(2,5), slug, content.title, content.excerpt, JSON.stringify(content.content), category, section, contentType === "opinion" ? "opinionated" : "analytical", journalist.name, journalist.role, publication.id, publication.name, journalist.id, content.seoTitle || content.title, content.seoDescription || content.excerpt]
  );
  return slug;
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { publicationId, contentType } = body;
    if (!publicationId) return NextResponse.json({ ok: false, error: "MISSING_PUBLICATION" }, { status: 400 });

    const db = getDb();
    const pubResult = await db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]);
    const pub = pubResult.rows[0];
    if (!pub) return NextResponse.json({ ok: false, error: "PUBLICATION_NOT_FOUND" }, { status: 404 });

    const recentNews = await getRecentContext(publicationId);
    if (recentNews.length < 3) return NextResponse.json({ ok: false, error: "NOT_ENOUGH_CONTEXT", message: "Se necesitan al menos 3 articulos recientes." });

    const types = contentType === "both" ? ["opinion", "investigation"] : [contentType || "opinion"];
    const results = [];

    for (const type of types) {
      try {
        const journalist = await getJournalistForType(publicationId);
        if (!journalist) { results.push({ type, ok: false, error: "NO_JOURNALIST" }); continue; }
        const generated = type === "opinion"
          ? await generateOpinionColumn({ journalist, publication: pub, territory: pub.territory_name, recentNews })
          : await generateInvestigation({ journalist, publication: pub, territory: pub.territory_name, recentNews });
        const slug = await saveArticle({ content: generated, journalist, publication: pub, contentType: type });
        results.push({ type, ok: true, title: generated.title, slug, journalist: journalist.name });
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        results.push({ type, ok: false, error: err.message });
      }
    }

    const successful = results.filter(r => r.ok);
    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'pipeline',$2,$3,'medium',NOW(),'global')`, ["mem-content-" + Date.now(), "Contenido especial: " + pub.name, successful.map(r => r.type + ": " + r.title).join(" | ")]).catch(() => {});

    return NextResponse.json({ ok: true, publication: pub.name, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
