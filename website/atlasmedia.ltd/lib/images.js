import { getDb } from "./db";

export async function generateImageQuery({ title, category, excerpt, publication }) {
  const prompt = `Sos el AI Image Director de Atlas Media Network. Generá el mejor query de búsqueda en Unsplash para este artículo:

Título: ${title}
Categoría: ${category}
Bajada: ${excerpt || ""}

Reglas: query en INGLÉS, máximo 5 palabras, descriptivo y visual, sin nombres propios de personas.

Respondé SOLO en JSON válido sin markdown:
{"query":"search query in english","orientation":"landscape","color":null}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function fetchUnsplashImage({ query, orientation = "landscape", color = null }) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) throw new Error("UNSPLASH_ACCESS_KEY not configured");
  const params = new URLSearchParams({ query, orientation, per_page: "1", content_filter: "high" });
  if (color) params.append("color", color);
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${apiKey}` }
  });
  if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;
  return {
    url: photo.urls.regular,
    urlSmall: photo.urls.small,
    urlThumb: photo.urls.thumb,
    altText: photo.alt_description || query,
    credit: photo.user.name,
    creditUrl: photo.user.links.html,
    unsplashId: photo.id
  };
}

export async function getImageForArticle({ title, category, excerpt, publication }) {
  try {
    const queryData = await generateImageQuery({ title, category, excerpt, publication });
    const image = await fetchUnsplashImage({ query: queryData.query, orientation: queryData.orientation || "landscape", color: queryData.color || null });
    return image ? { ...image, query: queryData.query } : null;
  } catch (err) {
    console.error("IMAGE_ERROR", err.message);
    return null;
  }
}

export async function saveArticleImage(articleId, imageData) {
  if (!imageData) return;
  const db = getDb();
  await db.query(`ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS image_url TEXT, ADD COLUMN IF NOT EXISTS image_thumb TEXT, ADD COLUMN IF NOT EXISTS image_alt TEXT, ADD COLUMN IF NOT EXISTS image_credit TEXT, ADD COLUMN IF NOT EXISTS image_credit_url TEXT, ADD COLUMN IF NOT EXISTS image_query TEXT`);
  await db.query(
    `UPDATE public.articles SET image_url=$2, image_thumb=$3, image_alt=$4, image_credit=$5, image_credit_url=$6, image_query=$7 WHERE id=$1`,
    [articleId, imageData.url, imageData.urlThumb, imageData.altText, imageData.credit, imageData.creditUrl, imageData.query]
  );
}
