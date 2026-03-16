import { getDb } from "../lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";

export default async function sitemap() {
  const db = getDb();

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: BASE_URL + "/argentina-post", lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: BASE_URL + "/argentina-post-mendoza", lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 }
  ];

  try {
    const pubs = await db.query(`SELECT id, slug FROM public.publications WHERE status='active'`);
    for (const pub of pubs.rows) {
      if (!staticPages.find(p => p.url.includes(pub.slug))) {
        staticPages.push({ url: BASE_URL + "/" + pub.slug, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 });
      }
    }
  } catch {}

  let articlePages = [];
  try {
    const articles = await db.query(
      `SELECT slug, updated_at, published_at FROM public.articles WHERE status='published' AND slug IS NOT NULL ORDER BY published_at DESC LIMIT 5000`
    );
    articlePages = articles.rows.map(a => ({
      url: BASE_URL + "/noticias/" + a.slug,
      lastModified: a.updated_at || a.published_at || new Date(),
      changeFrequency: "weekly",
      priority: 0.7
    }));
  } catch {}

  return [...staticPages, ...articlePages];
}
