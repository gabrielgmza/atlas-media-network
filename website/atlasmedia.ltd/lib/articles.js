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
    reviewStatus: row.review_status || row.reviewStatus || "approved",
    assignedEditor: row.assigned_editor || row.assignedEditor || null,
    seoTitle: row.seo_title || row.seoTitle || row.title,
    seoDescription: row.seo_description || row.seoDescription || row.excerpt,
    publishedAt: row.published_at || row.publishedAt || null,
    publishAt: row.publish_at || row.publishAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
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
        review_status,
        assigned_editor,
        seo_title,
        seo_description,
        published_at,
        publish_at,
        updated_at,
        content
      from public.articles
      order by coalesce(publish_at, published_at, updated_at) desc nulls last
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
  return [...articles].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
}

export async function getPublishedArticles() {
  const articles = await getAllArticles();
  return articles.filter((article) => article.status === "published");
}

export async function getDraftArticles() {
  const articles = await getAllArticles();
  return articles.filter((article) => article.status === "draft");
}

export async function getReviewArticles() {
  const articles = await getAllArticles();
  return articles.filter((article) => article.reviewStatus === "in-review");
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
        review_status,
        assigned_editor,
        seo_title,
        seo_description,
        published_at,
        publish_at,
        updated_at,
        content
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
        review_status,
        assigned_editor,
        seo_title,
        seo_description,
        published_at,
        publish_at,
        updated_at,
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
      input.reviewStatus,
      input.assignedEditor,
      input.seoTitle,
      input.seoDescription,
      input.publishedAt,
      input.publishAt,
      input.updatedAt,
      JSON.stringify(input.content || [])
    ]
  );

  return normalizeArticle(result.rows[0]);
}

export async function updateArticleWorkflow(input) {
  const db = getDb();

  const result = await db.query(
    `
      update public.articles
      set
        status = coalesce($2, status),
        review_status = coalesce($3, review_status),
        assigned_editor = coalesce($4, assigned_editor),
        publish_at = coalesce($5, publish_at),
        updated_at = $6
      where id = $1
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
        review_status,
        assigned_editor,
        seo_title,
        seo_description,
        published_at,
        publish_at,
        updated_at,
        content
    `,
    [
      input.id,
      input.status ?? null,
      input.reviewStatus ?? null,
      input.assignedEditor ?? null,
      input.publishAt ?? null,
      input.updatedAt
    ]
  );

  return result.rows[0] ? normalizeArticle(result.rows[0]) : null;
}
