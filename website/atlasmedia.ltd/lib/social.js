import { getDb } from "./db";

export async function ensureSocialPostsTable() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.social_posts (
      id TEXT PRIMARY KEY,
      article_id TEXT,
      publication_id TEXT,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      hashtags TEXT[],
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','published','failed','skipped')),
      scheduled_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      error_log TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function generateSocialContent({ title, excerpt, content, author, category, publication, articleUrl, journalist }) {
  const contentText = Array.isArray(content) ? content.slice(0,2).join(" ") : content;

  const prompt = `Sos el AI Social Media Department de Atlas Media Network.

El periodista ${journalist || author} acaba de publicar este artículo en ${publication}:

Título: ${title}
Bajada: ${excerpt}
Categoría: ${category}
Fragmento: ${contentText?.slice(0,300)}
URL: ${articleUrl || "[URL]"}

Creá el copy para cada red. Soná natural y humano.

Reglas:
- X/Twitter: máximo 240 caracteres, directo, 1-2 hashtags al final
- Instagram: más narrativo, 3-5 hashtags temáticos, puede tener emojis
- Facebook: tono informativo y accesible, sin hashtags, invitá a leer
- LinkedIn: profesional, enfocado en valor informativo, 1-2 hashtags

Respondé SOLO en JSON válido sin markdown:
{
  "twitter": {"content": "texto con hashtags", "hashtags": ["h1","h2"]},
  "instagram": {"content": "texto con hashtags al final", "hashtags": ["h1","h2","h3"]},
  "facebook": {"content": "texto del post", "hashtags": []},
  "linkedin": {"content": "texto profesional", "hashtags": ["h1"]}
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
  });

  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function saveSocialPosts({ articleId, publicationId, posts }) {
  const db = getDb();
  await ensureSocialPostsTable();
  const saved = [];
  for (const platform of ["twitter","instagram","facebook","linkedin"]) {
    const post = posts[platform];
    if (!post?.content) continue;
    const id = `social-${platform}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
    await db.query(
      `INSERT INTO public.social_posts (id,article_id,publication_id,platform,content,hashtags,status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [id, articleId, publicationId, platform, post.content, post.hashtags || []]
    );
    saved.push({ id, platform, content: post.content });
  }
  return saved;
}

export async function getPendingSocialPosts(publicationId) {
  const db = getDb();
  await ensureSocialPostsTable();
  const result = await db.query(
    `SELECT sp.*, a.title as article_title, a.slug as article_slug FROM public.social_posts sp LEFT JOIN public.articles a ON sp.article_id=a.id WHERE sp.publication_id=$1 ORDER BY sp.created_at DESC LIMIT 50`,
    [publicationId]
  );
  return result.rows;
}

export async function getSocialStats(publicationId) {
  const db = getDb();
  await ensureSocialPostsTable();
  const result = await db.query(
    `SELECT platform, status, COUNT(*) as total FROM public.social_posts WHERE publication_id=$1 GROUP BY platform, status`,
    [publicationId]
  );
  return result.rows;
}

export async function markPostPublished(postId) {
  const db = getDb();
  await db.query(`UPDATE public.social_posts SET status='published', published_at=NOW() WHERE id=$1`, [postId]);
}
