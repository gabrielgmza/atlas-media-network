import { promises as fs } from "fs";
import path from "path";
import { getSupabaseAdmin } from "./supabase";

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
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    author: row.author,
    publishedAt: row.published_at || row.publishedAt,
    content: Array.isArray(row.content) ? row.content : []
  };
}

async function readFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("SUPABASE_READ_ERROR", error.message);
    return null;
  }

  return (data || []).map(normalizeArticle);
}

export async function getAllArticles() {
  const supabaseArticles = await readFromSupabase();
  if (supabaseArticles) return supabaseArticles;

  const articles = await readArticlesFile();
  return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export async function getArticleById(id) {
  const articles = await getAllArticles();
  return articles.find((article) => article.id === id) || null;
}

export async function getArticleBySlug(slug) {
  const articles = await getAllArticles();
  return articles.find((article) => article.slug === slug) || null;
}

export async function getArticlesByPublication(publication) {
  const articles = await getAllArticles();
  return articles.filter((article) => article.publication === publication);
}

export async function createArticle(input) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const payload = {
    id: input.id,
    slug: input.slug,
    publication: input.publication,
    title: input.title,
    excerpt: input.excerpt,
    category: input.category,
    author: input.author,
    published_at: input.publishedAt,
    content: input.content
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeArticle(data);
}
