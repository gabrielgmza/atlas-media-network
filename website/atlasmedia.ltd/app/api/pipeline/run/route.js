import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import {
  fetchRssFeed,
  getSourcesForPublication,
  createPipelineRun,
  finishPipelineRun,
  saveTrendDetection,
  updateTrendStatus
} from "../../../../lib/news-fetcher";
import { createArticle } from "../../../../lib/articles";
import { verifyArticle, saveVerificationResult, PUBLISH_THRESHOLD } from "../../../../lib/verification";
import { generateSocialContent, saveSocialPosts } from "../../../../lib/social";
import { getImageForArticle, saveArticleImage } from "../../../../lib/images";
import { createAlert, sendEmailAlert, detectBreakingNews } from "../../../../lib/alerts";

async function getJournalistsForPublication(publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT * FROM public.journalists WHERE publication_id=$1 AND status='active'`, [publicationId]);
  return result.rows;
}

async function getPublication(publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT p.*, t.name as territory_name, t.type as territory_type FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]);
  return result.rows[0] || null;
}

async function isDuplicateArticle(title, publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT id FROM public.articles WHERE publication=$1 AND published_at>NOW()-INTERVAL '24 hours' AND similarity(lower(title),lower($2))>0.5 LIMIT 1`, [publicationId, title]);
  return result.rows.length > 0;
}

async function selectAndAssignStories(publication, territory, rawItems, journalists) {
  const journalistsList = journalists.map(j => "- " + j.name + " (id: " + j.id + ", rol: " + j.role + ", beat: " + j.beat + ", tono: " + j.tone + ")").join("\n");
  const storiesList = rawItems.map((item, i) => (i+1) + ". " + item.title + " - " + (item.description?.slice(0,120) || "sin descripcion")).join("\n");
  const prompt = "Eres el AI Editorial Director de " + publication.name + ", un medio " + publication.scope + " de " + territory + ".\n\nNoticias detectadas:\n" + storiesList + "\n\nPeriodistas:\n" + journalistsList + "\n\nSelecciona las 3 mejores noticias y asigna el periodista mas adecuado.\n\nRespode SOLO en JSON valido sin markdown:\n{\"selected\":[{\"storyIndex\":1,\"title\":\"titulo\",\"category\":\"categoria\",\"journalistId\":\"id\",\"journalistName\":\"nombre\",\"angle\":\"angulo en 1 oracion\",\"priority\":\"high\"}]}";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function writeArticle(publication, territory, story, journalist, sourceItem) {
  const prompt = "Sos " + journalist.name + ", " + journalist.role + " de " + publication.name + ".\nEstilo: " + journalist.style + "\nTono: " + journalist.tone + "\nPersonalidad: " + (journalist.personality || "profesional y preciso") + "\n\nNoticia base:\nTitulo: " + story.title + "\nFuente: " + (sourceItem.description || "") + "\nAngulo: " + story.angle + "\n\nEscribi un articulo periodistico completo en espanol argentino. 4-6 parrafos, humano, no robotico.\n\nResponde SOLO en JSON valido sin markdown:\n{\"title\":\"titulo\",\"excerpt\":\"bajada\",\"content\":[\"p1\",\"p2\",\"p3\",\"p4\"],\"seoTitle\":\"seo title\",\"seoDescription\":\"seo desc 150 chars\"}";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function slugify(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function makeId(publicationId) {
  const prefix = publicationId.includes("mendoza") ? "apm" : "ap";
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    const cronSecret = process.env.CRON_SECRET;
    const incomingToken = request.headers.get("x-atlas-admin-token") || request.headers.get("x-cron-secret");
    if (incomingToken !== adminToken && incomingToken !== cronSecret) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const publicationId = body.publication || "argentina-post";
    const triggeredBy = body.triggeredBy || "manual";

    const publication = await getPublication(publicationId);
    if (!publication) return NextResponse.json({ ok: false, error: "PUBLICATION_NOT_FOUND" }, { status: 404 });

    const territory = publication.territory_name || "Argentina";
    const run = await createPipelineRun(publicationId, triggeredBy);
    const journalists = await getJournalistsForPublication(publicationId);
    const sources = await getSourcesForPublication(publicationId);

    if (journalists.length === 0) {
      await finishPipelineRun(run.id, { status: "failed", attempted: 0, published: 0, failed: 0, errorLog: "No journalists found" });
      return NextResponse.json({ ok: false, error: "NO_JOURNALISTS" });
    }

    let allItems = [];
    for (const source of sources) {
      const items = await fetchRssFeed(source.url);
      allItems = allItems.concat(items.map(i => ({ ...i, sourceName: source.name, sourceUrl: source.url })));
    }

    if (allItems.length === 0) {
      await finishPipelineRun(run.id, { status: "failed", attempted: 0, published: 0, failed: 0, errorLog: "No news items fetched" });
      return NextResponse.json({ ok: false, error: "NO_NEWS_ITEMS" });
    }

    const selection = await selectAndAssignStories(publication, territory, allItems, journalists);
    const selected = selection.selected || [];
    const stats = { attempted: selected.length, published: 0, failed: 0, errorLog: "" };
    const publishedArticles = [];

    for (const story of selected) {
      try {
        const sourceItem = allItems[story.storyIndex - 1] || allItems[0];
        const journalist = journalists.find(j => j.id === story.journalistId) || journalists[0];

        const trend = await saveTrendDetection({ publicationId, pipelineRunId: run.id, title: story.title, summary: story.angle, sourceUrl: sourceItem?.sourceUrl, sourceName: sourceItem?.sourceName, category: story.category });

        const isDup = await isDuplicateArticle(story.title, publicationId).catch(() => false);
        if (isDup) { await updateTrendStatus(trend.id, "rejected"); stats.failed++; continue; }

        await updateTrendStatus(trend.id, "processing", journalist.id);

        const articleContent = await writeArticle(publication, territory, story, journalist, sourceItem);

        const verification = await verifyArticle({ title: articleContent.title, content: articleContent.content, excerpt: articleContent.excerpt, sourceUrl: sourceItem?.sourceUrl, sourceName: sourceItem?.sourceName, journalist: journalist.name, publication: publication.name });

        if (verification.decision === "reject") {
          await updateTrendStatus(trend.id, "rejected");
          stats.failed++;
          stats.errorLog += "[REJECTED score=" + verification.score + "/10 " + articleContent.title + "] " + verification.summary;
          continue;
        }

        const article = await createArticle({
          id: makeId(publicationId),
          slug: slugify(articleContent.title),
          publication: publicationId,
          publicationName: publication.name,
          title: articleContent.title,
          excerpt: articleContent.excerpt,
          category: story.category,
          section: story.category,
          author: journalist.signature,
          authorId: journalist.id,
          authorRole: journalist.role,
          tone: journalist.tone,
          status: "published",
          reviewStatus: "approved",
          seoTitle: articleContent.seoTitle || articleContent.title,
          seoDescription: articleContent.seoDescription || articleContent.excerpt,
          publishedAt: new Date().toISOString(),
          content: articleContent.content,
          sourceUrl: sourceItem?.sourceUrl,
          sourceType: "rss",
          aiGenerated: true,
          pipelineRunId: run.id
        });

        await saveVerificationResult({ articleId: article.id, publicationId, result: verification, pipelineRunId: run.id }).catch(() => {});

        await getImageForArticle({ title: article.title, category: article.category, excerpt: article.excerpt, publication: publication.name })
          .then(image => saveArticleImage(article.id, image)).catch(() => {});

        await generateSocialContent({ title: article.title, excerpt: article.excerpt, content: article.content, author: article.author, category: article.category, publication: publication.name, slug: article.slug, journalist: journalist.name })
          .then(posts => saveSocialPosts({ articleId: article.id, publicationId, posts })).catch(() => {});

        await updateTrendStatus(trend.id, "published");
        publishedArticles.push(article);
        stats.published++;
        await new Promise(r => setTimeout(r, 1000));

      } catch (err) {
        stats.failed++;
        stats.errorLog += "\n" + story.title + ": " + err.message;
      }
    }

    stats.status = stats.published > 0 ? "completed" : "failed";
    await finishPipelineRun(run.id, stats);

    try {
      const db = getDb();
      await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'pipeline',$2,$3,'medium',NOW(),'global')`,
        ["mem-" + Date.now(), "Pipeline completado: " + publication.name, stats.published + " articulos publicados, " + stats.failed + " fallidos. Run ID: " + run.id]);
    } catch {}

    // BREAKING NEWS DETECTION
    if (publishedArticles.length > 0) {
      try {
        const breaking = await detectBreakingNews(publishedArticles);
        for (const b of breaking) {
          await createAlert({ type: "breaking_news", title: "Breaking: " + b.title, detail: b.reason, publicationId: publication.id, severity: "high" });
          await sendEmailAlert({ type: "breaking_news", title: "Breaking: " + b.title, detail: b.reason + " - " + publication.name, severity: "high" });
        }
      } catch {}
    }

    // ALERT IF PIPELINE FAILED
    if (stats.published === 0 && stats.failed > 0) {
      await createAlert({ type: "pipeline_failure", title: "Pipeline sin publicaciones: " + publication.name, detail: "Errores: " + stats.failed, publicationId: publication.id, severity: "medium" }).catch(() => {});
    }

    return NextResponse.json({ ok: true, runId: run.id, publication: publication.name, stats, articles: publishedArticles.map(a => ({ id: a.id, title: a.title, author: a.author })) });

  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const db = getDb();
  const runs = await db.query(`SELECT pr.*, p.name as publication_name FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id=p.id ORDER BY pr.started_at DESC LIMIT 20`);
  return NextResponse.json({ ok: true, runs: runs.rows });
}
