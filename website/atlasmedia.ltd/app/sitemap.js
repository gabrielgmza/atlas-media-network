import { getDb } from "../lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";

function slugify(name) {
  return (name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

export default async function sitemap() {
  const db = getDb();

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: BASE_URL + "/argentina-post", lastModified: new Date(), changeFrequency: "hourly", priority: 0.95 },
    { url: BASE_URL + "/argentina-post-mendoza", lastModified: new Date(), changeFrequency: "hourly", priority: 0.95 },
    { url: BASE_URL + "/periodistas", lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: BASE_URL + "/catalogo", lastModified: new Date(), changeFrequency: "hourly", priority: 0.7 },
    { url: BASE_URL + "/buscar", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: BASE_URL + "/mediakit", lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 }
  ];

  try {
    const pubs = await db.query(`SELECT id, slug FROM public.publications WHERE status='active'`);
    for (const pub of pubs.rows) {
      if (!staticPages.find(p => p.url.endsWith("/" + pub.slug))) {
        staticPages.push({ url: BASE_URL + "/" + pub.slug, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 });
      }
    }
  } catch {}

  let articlePages = [];
  try {
    const articles = await db.query(`SELECT slug, updated_at, published_at FROM public.articles WHERE status='published' AND slug IS NOT NULL ORDER BY published_at DESC LIMIT 5000`);
    articlePages = articles.rows.map(a => ({ url: BASE_URL + "/noticias/" + a.slug, lastModified: a.updated_at||a.published_at||new Date(), changeFrequency: "weekly", priority: 0.7 }));
  } catch {}

  let journalistPages = [];
  try {
    const journalists = await db.query(`SELECT name FROM public.journalists WHERE active=true`);
    journalistPages = journalists.rows.map(j => ({ url: BASE_URL + "/periodistas/" + slugify(j.name), lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 }));
  } catch {}

  let categoryPages = [];
  try {
    const cats = await db.query(`SELECT DISTINCT a.publication, a.category FROM public.articles a WHERE a.status='published' AND a.category IS NOT NULL`);
    categoryPages = cats.rows.map(c => ({ url: BASE_URL + "/" + c.publication + "/categoria/" + encodeURIComponent(c.category), lastModified: new Date(), changeFrequency: "daily", priority: 0.65 }));
  } catch {}

  return [...staticPages, ...articlePages, ...journalistPages, ...categoryPages];
}
