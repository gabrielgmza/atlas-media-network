import { promises as fs } from "fs";
import path from "path";
import { getDb } from "./db";

const articlesFilePath = path.join(process.cwd(), "data", "articles.json");

async function readArticlesFile() {
  const raw = await fs.readFile(articlesFilePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    publication: row.publication,
    publicationName: row.publication_name || row.publicationName || row.publication,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    section: row.section || row.category,
    author: row.author,
    authorId: row.author_id || row.authorId || null,
    authorRole: row.author_role || row.authorRole || null,
    tone: row.tone || null,
    status: row.status || "published",
    seoTitle: row.seo_title || row.seoTitle || row.title,
    seoDescription: row.seo_description || row.seoDescription || row.excerpt,
    publishedAt: row.published_at || row.publishedAt,
    content: Array.isArray(row.content) ? row.content : []
  };
}

async function readFromPostgres() {
  const hasDbConfig =
    process.env.POSTGRES_HOST &&
    process.env.POSTGRES_DATABASE &&
    process.env.POSTGRES_USER &&
    process.env.POSTGRES_PASSWORD;

  if (!hasDbConfig) return null;

  try {
    const db = getDb();
    const result = await db.query(`
      select
        id,
        slug,
        publication,
        publication_name,
        title,
        excerpt,
        category,
        section,
        author,
        author_id,
        author_role,
        tone,
        status,
        seo_title,
        seo_description,
        published_at,
        content
      from public.articles
      order by published_at desc
    `);

    return result.rows.map(normalizeArticle);
  } catch (error) {
    console.error("POSTGRES_READ_ERROR", error.message);
    return null;
  }
}

export async function getAllArticles() {
  const dbArticles = await readFromPostgres();
  if (dbArticles) return dbArticles;

  const articles = await readArticlesFile();
  return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export async function getPublishedArticles() {
  const articles = await getAllArticles();
  return articles.filter((article) => article.status === "published");
}

export async function getDraftArticles() {
  const articles = await getAllArticles();
  return articles.filter((article) => article.status === "draft");
}

export async function getArticleById(id) {
  const articles = await getAllArticles();
  return articles.find((article) => article.id === id) || null;
}

export async function getArticleBySlug(slug) {
  const articles = await getPublishedArticles();
  return articles.find((article) => article.slug === slug) || null;
}

export async function getArticlesByPublication(publication) {
  const articles = await getPublishedArticles();
  return articles.filter((article) => article.publication === publication);
}

export async function createArticle(input) {
  const db = getDb();

  const result = await db.query(
    `
      insert into public.articles (
        id,
        slug,
        publication,
        publication_name,
        title,
        excerpt,
        category,
        section,
        author,
        author_id,
        author_role,
        tone,
        status,
        seo_title,
        seo_description,
        published_at,
        content
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      returning
        id,
        slug,
        publication,
        publication_name,
        title,
        excerpt,
        category,
        section,
        author,
        author_id,
        author_role,
        tone,
        status,
        seo_title,
        seo_description,
        published_at,
        content
    `,
    [
      input.id,
      input.slug,
      input.publication,
      input.publicationName,
      input.title,
      input.excerpt,
      input.category,
      input.section,
      input.author,
      input.authorId,
      input.authorRole,
      input.tone,
      input.status,
      input.seoTitle,
      input.seoDescription,
      input.publishedAt,
      JSON.stringify(input.content || [])
    ]
  );

  return normalizeArticle(result.rows[0]);
}
