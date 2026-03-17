import { getDb } from "./db.js";

const PLATFORM_STRATEGY = {
  national:   ["twitter","facebook","instagram","linkedin","youtube"],
  provincial: ["twitter","facebook","instagram"],
  city:       ["twitter","facebook","instagram"],
  municipal:  ["twitter","facebook"]
};

const PLATFORM_INFO = {
  twitter:   { name:"X (Twitter)",  handle:"@", maxChars:280,   setupUrl:"https://twitter.com/signup" },
  facebook:  { name:"Facebook",     handle:"",  maxChars:63206, setupUrl:"https://www.facebook.com/pages/create" },
  instagram: { name:"Instagram",    handle:"@", maxChars:2200,  setupUrl:"https://www.instagram.com/accounts/emailsignup" },
  linkedin:  { name:"LinkedIn",     handle:"",  maxChars:3000,  setupUrl:"https://www.linkedin.com/company/setup/new" },
  youtube:   { name:"YouTube",      handle:"@", maxChars:5000,  setupUrl:"https://www.youtube.com/account" }
};

async function ensureSocialTables() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.social_accounts (
      id TEXT PRIMARY KEY,
      publication_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_name TEXT,
      handle TEXT,
      status TEXT DEFAULT 'pending_setup' CHECK (status IN ('pending_setup','active','paused','error')),
      credentials JSONB,
      setup_instructions TEXT,
      followers INTEGER DEFAULT 0,
      posts_count INTEGER DEFAULT 0,
      last_posted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(publication_id, platform)
    );
    CREATE TABLE IF NOT EXISTS public.social_posts (
      id TEXT PRIMARY KEY,
      article_id TEXT,
      publication_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_id TEXT,
      content TEXT NOT NULL,
      hashtags TEXT[],
      image_url TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','published','failed','skipped')),
      scheduled_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      external_post_id TEXT,
      error_log TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function analyzeSocialNeeds(publication) {
  const platforms = PLATFORM_STRATEGY[publication.scope] || PLATFORM_STRATEGY.city;
  const db = getDb();
  await ensureSocialTables();
  const existing = await db.query(`SELECT platform FROM public.social_accounts WHERE publication_id=$1`, [publication.id]);
  const existingPlatforms = existing.rows.map(r => r.platform);
  const missingPlatforms = platforms.filter(p => !existingPlatforms.includes(p));
  return { recommended: platforms, existing: existingPlatforms, missing: missingPlatforms, info: platforms.map(p => PLATFORM_INFO[p]) };
}

export async function createSocialSetupPlan(publication, territory) {
  const analysis = await analyzeSocialNeeds(publication);
  if (!analysis.missing.length) return { ok: true, message: "Todas las redes ya configuradas" };
  const db = getDb();
  await ensureSocialTables();
  const pubSlug = publication.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"").slice(0,15);
  const instructions = [];

  for (const platform of analysis.missing) {
    const info = PLATFORM_INFO[platform];
    const instruction = `${info.name}: Crear cuenta en ${info.setupUrl} - Nombre: ${publication.name} - Handle: ${info.handle}${pubSlug} - Bio: Medio digital de ${territory}.`;
    instructions.push({ platform, info, handle: pubSlug, instruction });
    const id = "soc-" + platform + "-" + publication.id;
    await db.query(`INSERT INTO public.social_accounts (id,publication_id,platform,account_name,handle,status,setup_instructions) VALUES ($1,$2,$3,$4,$5,'pending_setup',$6) ON CONFLICT (publication_id,platform) DO NOTHING`, [id, publication.id, platform, publication.name, pubSlug, instruction]);
  }

  if (process.env.RESEND_API_KEY && process.env.FOUNDER_EMAIL) {
    const htmlInstructions = instructions.map(i =>
      `<div style="margin-bottom:20px;padding:16px;background:#f8f8f8;border-radius:8px;">
        <h3 style="margin:0 0 8px;">${i.info.name}</h3>
        <p><a href="${i.info.setupUrl}">${i.info.setupUrl}</a></p>
        <ul><li>Nombre: <strong>${publication.name}</strong></li><li>Handle: <strong>${i.info.handle}${i.handle}</strong></li><li>Bio: Medio digital de ${territory}</li></ul>
        <p style="font-size:13px;color:#666;">Carga las credenciales en: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/social">/social</a></p>
      </div>`
    ).join("");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: "Atlas Social Director <social@atlasmedia.ltd>", to: [process.env.FOUNDER_EMAIL], subject: `[Atlas] Crear ${instructions.length} cuentas sociales para ${publication.name}`, html: `<div style="font-family:Arial;max-width:600px;"><h2>Nueva publicacion: ${publication.name}</h2><p>Crear las siguientes cuentas:</p>${htmlInstructions}</div>` })
    }).catch(() => {});
  }

  return { ok: true, missing: analysis.missing, instructions, message: `Plan creado para ${instructions.length} redes. Email enviado a ${process.env.FOUNDER_EMAIL}` };
}

export async function generateSocialPost(article, platform) {
  const info = PLATFORM_INFO[platform];
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
  const articleUrl = `${BASE_URL}/noticias/${article.slug}`;
  const prompts = {
    twitter:   `Tweet periodistico para este articulo. Max 240 chars. Directo, impactante. Espanol argentino. Sin comillas.\nTitulo: ${article.title}\nExcerpt: ${(article.excerpt||"").slice(0,200)}`,
    facebook:  `Post de Facebook. 2-3 oraciones + 2-3 hashtags. Espanol argentino.\nTitulo: ${article.title}\nExcerpt: ${(article.excerpt||"").slice(0,300)}`,
    instagram: `Caption de Instagram. 3-5 lineas + 5 hashtags. Espanol argentino.\nTitulo: ${article.title}\nExcerpt: ${(article.excerpt||"").slice(0,200)}`,
    linkedin:  `Post LinkedIn profesional. 2-3 parrafos analiticos + hashtags.\nTitulo: ${article.title}\nExcerpt: ${(article.excerpt||"").slice(0,400)}`,
    youtube:   `Titulo y descripcion para YouTube.\nTITULO: ...\nDESCRIPCION: ...\nArticulo: ${article.title}`
  };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 400, messages: [{ role: "user", content: prompts[platform] || prompts.twitter }] }) });
    const data = await res.json();
    let content = data.content?.find(b => b.type === "text")?.text || article.title;
    if (["twitter","facebook","linkedin"].includes(platform)) content = content + "\n\n" + articleUrl;
    return content.slice(0, info?.maxChars || 280);
  } catch { return article.title + "\n\n" + articleUrl; }
}

export async function queueSocialPost(articleId, publicationId, platform, accountId, content, imageUrl) {
  const db = getDb();
  await ensureSocialTables();
  const id = "post-" + platform + "-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
  await db.query(`INSERT INTO public.social_posts (id,article_id,publication_id,platform,account_id,content,image_url,status,scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())`, [id, articleId, publicationId, platform, accountId||null, content, imageUrl||null]);
  return id;
}

async function publishToTwitter(credentials, content) {
  if (!credentials?.accessToken) throw new Error("Twitter credentials not configured");
  const res = await fetch("https://api.twitter.com/2/tweets", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + credentials.accessToken }, body: JSON.stringify({ text: content }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.title || "Twitter API error");
  return { externalId: data.data?.id };
}

async function publishToLinkedIn(credentials, content) {
  if (!credentials?.accessToken) throw new Error("LinkedIn credentials not configured");
  const body = { author: `urn:li:organization:${credentials.organizationId}`, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: content }, shareMediaCategory: "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } };
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + credentials.accessToken, "X-Restli-Protocol-Version": "2.0.0" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "LinkedIn API error");
  return { externalId: data.id };
}

async function publishToFacebook(credentials, content) {
  if (!credentials?.pageAccessToken || !credentials?.pageId) throw new Error("Facebook credentials not configured");
  const res = await fetch(`https://graph.facebook.com/v19.0/${credentials.pageId}/feed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, access_token: credentials.pageAccessToken }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { externalId: data.id };
}

async function publishToInstagram(credentials, content, imageUrl) {
  if (!credentials?.pageAccessToken || !credentials?.instagramAccountId) throw new Error("Instagram credentials not configured");
  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${credentials.instagramAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: content, image_url: imageUrl || process.env.NEXT_PUBLIC_SITE_URL + "/icon-192.png", access_token: credentials.pageAccessToken }) });
  const mediaData = await mediaRes.json();
  if (mediaData.error) throw new Error(mediaData.error.message);
  const pubRes = await fetch(`https://graph.facebook.com/v19.0/${credentials.instagramAccountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: mediaData.id, access_token: credentials.pageAccessToken }) });
  const pubData = await pubRes.json();
  if (pubData.error) throw new Error(pubData.error.message);
  return { externalId: pubData.id };
}

export async function publishPost(postId) {
  const db = getDb();
  const postResult = await db.query(`SELECT sp.*, sa.credentials, sa.status as account_status FROM public.social_posts sp LEFT JOIN public.social_accounts sa ON sp.account_id=sa.id WHERE sp.id=$1`, [postId]);
  if (!postResult.rows.length) throw new Error("Post not found");
  const post = postResult.rows[0];
  if (post.account_status !== "active") {
    await db.query(`UPDATE public.social_posts SET status='skipped', error_log='Account not active' WHERE id=$1`, [postId]);
    return { ok: false, reason: "account_not_active" };
  }
  try {
    let result;
    switch (post.platform) {
      case "twitter":   result = await publishToTwitter(post.credentials, post.content); break;
      case "linkedin":  result = await publishToLinkedIn(post.credentials, post.content); break;
      case "facebook":  result = await publishToFacebook(post.credentials, post.content); break;
      case "instagram": result = await publishToInstagram(post.credentials, post.content, post.image_url); break;
      default: throw new Error("Platform not supported: " + post.platform);
    }
    await db.query(`UPDATE public.social_posts SET status='published', published_at=NOW(), external_post_id=$1 WHERE id=$2`, [result.externalId, postId]);
    await db.query(`UPDATE public.social_accounts SET last_posted_at=NOW(), posts_count=posts_count+1 WHERE id=$1`, [post.account_id]);
    return { ok: true, externalId: result.externalId };
  } catch (err) {
    await db.query(`UPDATE public.social_posts SET status='failed', error_log=$1 WHERE id=$2`, [err.message, postId]);
    return { ok: false, error: err.message };
  }
}

export async function processPendingPosts(publicationId) {
  const db = getDb();
  await ensureSocialTables();
  const query = publicationId
    ? `SELECT id FROM public.social_posts WHERE status='pending' AND publication_id=$1 ORDER BY scheduled_at ASC LIMIT 20`
    : `SELECT id FROM public.social_posts WHERE status='pending' ORDER BY scheduled_at ASC LIMIT 20`;
  const posts = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
  const results = [];
  for (const post of posts.rows) {
    const result = await publishPost(post.id);
    results.push({ postId: post.id, ...result });
    await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}

export { ensureSocialTables, PLATFORM_INFO, PLATFORM_STRATEGY };
