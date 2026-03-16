import { getDb } from "./db";

export async function fetchRssFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AtlasMediaNetwork/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml);
  } catch {
    return [];
  }
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title   = extractTag(block, "title");
    const link    = extractTag(block, "link");
    const desc    = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");
    if (title && link) {
      items.push({ title: cleanText(title), link, description: cleanText(desc), pubDate });
    }
  }
  return items.slice(0, 10);
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(regex);
  return m ? (m[1] || m[2] || "").trim() : "";
}

function cleanText(str) {
  return str.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export async function getSourcesForPublication(publicationId) {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT * FROM public.news_sources WHERE publication_id = $1 AND active = true ORDER BY priority DESC`,
      [publicationId]
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function createPipelineRun(publicationId, triggeredBy = "cron") {
  const db = getDb();
  const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const result = await db.query(
    `INSERT INTO public.pipeline_runs (id, publication_id, triggered_by, status, started_at)
     VALUES ($1, $2, $3, 'running', NOW()) RETURNING *`,
    [id, publicationId, triggeredBy]
  );
  return result.rows[0];
}

export async function finishPipelineRun(runId, stats) {
  const db = getDb();
  await db.query(
    `UPDATE public.pipeline_runs SET
       status = $2,
       articles_attempted = $3,
       articles_published = $4,
       articles_failed = $5,
       error_log = $6,
       finished_at = NOW()
     WHERE id = $1`,
    [runId, stats.status, stats.attempted, stats.published, stats.failed, stats.errorLog || null]
  );
}

export async function saveTrendDetection(data) {
  const db = getDb();
  const id = `trend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const result = await db.query(
    `INSERT INTO public.trend_detections
       (id, publication_id, pipeline_run_id, title, summary, source_url, source_name, category, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'detected') RETURNING *`,
    [id, data.publicationId, data.pipelineRunId, data.title, data.summary, data.sourceUrl, data.sourceName, data.category]
  );
  return result.rows[0];
}

export async function updateTrendStatus(trendId, status, journalistId = null) {
  const db = getDb();
  await db.query(
    `UPDATE public.trend_detections SET status = $2, journalist_id = $3 WHERE id = $1`,
    [trendId, status, journalistId]
  );
}
