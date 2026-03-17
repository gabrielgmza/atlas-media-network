import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { fetchRssFeed, getSourcesForPublication, createPipelineRun, finishPipelineRun, saveTrendDetection, updateTrendStatus } from "../../../../lib/news-fetcher";
import { createArticle } from "../../../../lib/articles";
import { verifyArticle, saveVerificationResult } from "../../../../lib/verification";
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

async function getRecentTitles(publicationId) {
  const db = getDb();
  const result = await db.query(`SELECT lower(title) as title FROM public.articles WHERE publication=$1 AND published_at>NOW()-INTERVAL '48 hours'`, [publicationId]);
  return new Set(result.rows.map(r => r.title));
}

function isSimilarTitle(newTitle, existingTitles) {
  const newLower = newTitle.toLowerCase();
  const newWords = new Set(newLower.split(/\s+/).filter(w => w.length > 4));
  for (const existing of existingTitles) {
    const existingWords = new Set(existing.split(/\s+/).filter(w => w.length > 4));
    const intersection = [...newWords].filter(w => existingWords.has(w)).length;
    if (intersection / Math.max(newWords.size, existingWords.size, 1) > 0.5) return true;
  }
  return false;
}

async function callClaudeWithRetry(prompt, maxTokens, attempt = 1) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] })
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === "text")?.text;
    if (!text) throw new Error("Empty response from Claude");
    return text;
  } catch (err) {
    if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); return callClaudeWithRetry(prompt, maxTokens, attempt + 1); }
    throw err;
  }
}

async function selectAndAssignStories(publication, territory, rawItems, journalists) {
  const journalistsList = journalists.map(j => "- " + j.name + " (id: " + j.id + ", rol: " + j.role + ", beat: " + (j.beat||"general") + ", tono: " + (j.tone||"neutral") + ")").join("\n");
  const storiesList = rawItems.slice(0,15).map((item,i) => (i+1) + ". " + item.title + " [" + (item.sourceName||"RSS") + "] - " + (item.description||"").slice(0,100)).join("\n");
  const prompt = "Sos el AI Editorial Director de " + publication.name + ", medio " + publication.scope + " de " + territory + ".\n\nNOTICIAS DISPONIBLES:\n" + storiesList + "\n\nPERIODISTAS:\n" + journalistsList + "\n\nSelecciona exactamente 3 noticias relevantes para " + territory + " y asigna el periodista mas adecuado. Varia las categorias.\n\nResponde SOLO en JSON valido sin markdown:\n{\"selected\":[{\"storyIndex\":1,\"title\":\"titulo\",\"category\":\"categoria\",\"journalistId\":\"id\",\"journalistName\":\"nombre\",\"angle\":\"angulo en 1 oracion\",\"priority\":\"high\"}]}";
  const text = await callClaudeWithRetry(prompt, 1000);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function writeArticle(publication, territory, story, journalist, sourceItem) {
  const prompt = "Sos " + journalist.name + ", " + journalist.role + " de " + publication.name + " (" + territory + ").\n\nPERFIL:\n- Estilo: " + (journalist.style||"claro y directo") + "\n- Tono: " + (journalist.tone||"neutral informativo") + "\n- Especialidad: " + (journalist.beat||"noticias generales") + "\n- Personalidad: " + (journalist.personality||"profesional, preciso, accesible") + "\n\nNOTICIA:\nTitulo: " + story.title + "\nAngulo: " + story.angle + "\nFuente: " + (sourceItem.description||sourceItem.title||"").slice(0,400) + "\n\nEscribi en espanol argentino natural. 4-6 parrafos solidos (300-600 palabras). Primer parrafo que engancha. No repitas informacion. No uses frases genericas.\n\nResponde SOLO en JSON valido sin markdown:\n{\"title\":\"titulo max 80 chars\",\"excerpt\":\"bajada max 160 chars\",\"content\":[\"p1\",\"p2\",\"p3\",\"p4\"],\"seoTitle\":\"max 60 chars\",\"seoDescription\":\"max 155 chars\"}";
  const text = await callClaudeWithRetry(prompt, 1800);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function slugify(value) {
  return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);
}

function makeId(publicationId) {
  const prefix = publicationId.includes("mendoza") ? "apm" : "ap";
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
}

async function processStory({ story, sourceItem, journalist, publication, territory, run, publicationId, recentTitles }) {
  try {
    const trend = await saveTrendDetection({ publicationId, pipelineRunId: run.id, title: story.title, summary: story.angle, sourceUrl: sourceItem?.sourceUrl, sourceName: sourceItem?.sourceName, category: story.category });

    if (isSimilarTitle(story.title, recentTitles)) {
      await updateTrendStatus(trend.id, "rejected");
      return { ok: false, reason: "duplicate" };
    }

    await updateTrendStatus(trend.id, "processing", journalist.id);
    const articleContent = await writeArticle(publication, territory, story, journalist, sourceItem);

    const verification = await verifyArticle({ title: articleContent.title, content: articleContent.content, excerpt: articleContent.excerpt, sourceUrl: sourceItem?.sourceUrl, sourceName: sourceItem?.sourceName, journalist: journalist.name, publication: publication.name });

    if (verification.decision === "reject") {
      await updateTrendStatus(trend.id, "rejected");
      return { ok: false, reason: "rejected_score_" + verification.score };
    }

    const article = await createArticle({
      id: makeId(publicationId), slug: slugify(articleContent.title),
      publication: publicationId, publicationName: publication.name,
      title: articleContent.title, excerpt: articleContent.excerpt,
      category: story.category, section: story.category,
      author: journalist.signature, authorId: journalist.id, authorRole: journalist.role, tone: journalist.tone,
      status: "published", reviewStatus: "approved",
      seoTitle: articleContent.seoTitle||articleContent.title, seoDescription: articleContent.seoDescription||articleContent.excerpt,
      publishedAt: new Date().toISOString(), content: articleContent.content,
      sourceUrl: sourceItem?.sourceUrl, sourceType: "rss", aiGenerated: true, pipelineRunId: run.id
    });

    await saveVerificationResult({ articleId: article.id, publicationId, result: verification, pipelineRunId: run.id }).catch(() => {});

    // Image and social non-blocking
    Promise.all([
      getImageForArticle({ title: article.title, category: article.category, excerpt: article.excerpt, publication: publication.name }).then(img => img && saveArticleImage(article.id, img)).catch(() => {}),
      generateSocialContent({ title: article.title, excerpt: article.excerpt, content: article.content, author: article.author, category: article.category, publication: publication.name, slug: article.slug, journalist: journalist.name }).then(posts => saveSocialPosts({ articleId: article.id, publicationId, posts })).catch(() => {})
    ]);

    await updateTrendStatus(trend.id, "published");
    recentTitles.add(article.title.toLowerCase());
    return { ok: true, article };
  } catch (err) {
    return { ok: false, reason: "error", error: err.message };
  }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    const cronSecret = process.env.CRON_SECRET;
    const incomingToken = request.headers.get("x-atlas-admin-token") || request.headers.get("x-cron-secret");
    if (incomingToken !== adminToken && incomingToken !== cronSecret) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const body = await request.json();
    const publicationId = body.publication || "argentina-post";
    const triggeredBy = body.triggeredBy || "manual";

    const publication = await getPublication(publicationId);
    if (!publication) return NextResponse.json({ ok: false, error: "PUBLICATION_NOT_FOUND" }, { status: 404 });

    const territory = publication.territory_name || "Argentina";
    const run = await createPipelineRun(publicationId, triggeredBy);

    // Load in parallel
    const [journalists, sources, recentTitles] = await Promise.all([
      getJournalistsForPublication(publicationId),
      getSourcesForPublication(publicationId),
      getRecentTitles(publicationId)
    ]);

    if (journalists.length === 0) {
      await finishPipelineRun(run.id, { status: "failed", attempted: 0, published: 0, failed: 0, errorLog: "No journalists" });
      return NextResponse.json({ ok: false, error: "NO_JOURNALISTS" });
    }

    // Fetch all RSS in parallel
    const feedResults = await Promise.allSettled(sources.map(source => fetchRssFeed(source.url).then(items => items.map(i => ({ ...i, sourceName: source.name, sourceUrl: source.url })))));
    const allItems = feedResults.flatMap(r => r.status === "fulfilled" ? r.value : []);

    if (allItems.length === 0) {
      await finishPipelineRun(run.id, { status: "failed", attempted: 0, published: 0, failed: 0, errorLog: "No news fetched" });
      return NextResponse.json({ ok: false, error: "NO_NEWS_ITEMS" });
    }

    const selection = await selectAndAssignStories(publication, territory, allItems, journalists);
    const selected = selection.selected || [];

    // Process all stories IN PARALLEL
    const storyTasks = selected.map(story => {
      const sourceItem = allItems[story.storyIndex - 1] || allItems[0];
      const journalist = journalists.find(j => j.id === story.journalistId) || journalists[0];
      return processStory({ story, sourceItem, journalist, publication, territory, run, publicationId, recentTitles });
    });

    const results = await Promise.allSettled(storyTasks);
    const stats = { attempted: selected.length, published: 0, failed: 0, errorLog: "" };
    const publishedArticles = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value.ok) { publishedArticles.push(result.value.article); stats.published++; }
      else { stats.failed++; const reason = result.status === "fulfilled" ? result.value.reason : result.reason?.message; stats.errorLog += "[" + (selected[i]?.title||"?").slice(0,30) + ": " + reason + "] "; }
    });

    stats.status = stats.published > 0 ? "completed" : "failed";
    await finishPipelineRun(run.id, stats);

    const db = getDb();
    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'pipeline',$2,$3,'medium',NOW(),'global')`, ["mem-" + Date.now(), "Pipeline: " + publication.name, stats.published + " publicados, " + stats.failed + " fallidos."]).catch(() => {});

    if (publishedArticles.length > 0) {
      detectBreakingNews(publishedArticles).then(async breaking => {
        for (const b of breaking) {
          await createAlert({ type: "breaking_news", title: "Breaking: " + b.title, detail: b.reason, publicationId: publication.id, severity: "high" });
          await sendEmailAlert({ type: "breaking_news", title: "Breaking: " + b.title, detail: b.reason, severity: "high" });
          const BASE_URL_PUSH = process.env.NEXT_PUBLIC_SITE_URL||"https://atlas-media-network.vercel.app";
          fetch(BASE_URL_PUSH+"/api/push",{method:"POST",headers:{"Content-Type":"application/json","x-atlas-admin-token":process.env.ATLAS_ADMIN_TOKEN||""},body:JSON.stringify({action:"send",publicationId:publication.id,title:"Breaking: "+b.title,body:b.reason,url:"/noticias/"+(publishedArticles[0]?.slug||""),breaking:true})}).catch(()=>{});
          const BASE_URL_PUSH = process.env.NEXT_PUBLIC_SITE_URL||"https://atlas-media-network.vercel.app";
          fetch(BASE_URL_PUSH+"/api/push",{method:"POST",headers:{"Content-Type":"application/json","x-atlas-admin-token":process.env.ATLAS_ADMIN_TOKEN||""},body:JSON.stringify({action:"send",publicationId:publication.id,title:"Breaking: "+b.title,body:b.reason,url:"/noticias/"+(publishedArticles[0]?.slug||""),breaking:true})}).catch(()=>{});
        }
      }).catch(() => {});
    }

    if (stats.published === 0 && stats.failed > 0) {
      createAlert({ type: "pipeline_failure", title: "Pipeline sin publicaciones: " + publication.name, detail: stats.errorLog, publicationId: publication.id, severity: "medium" }).catch(() => {});
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
