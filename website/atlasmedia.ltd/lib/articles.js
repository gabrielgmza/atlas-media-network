import { promises as fs } from "fs";
import path from "path";

const articlesFilePath = path.join(process.cwd(), "data", "articles.json");

async function readArticlesFile() {
  const raw = await fs.readFile(articlesFilePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function getAllArticles() {
  const articles = await readArticlesFile();
  return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export async function getArticleById(id) {
  const articles = await readArticlesFile();
  return articles.find((article) => article.id === id) || null;
}

export async function getArticleBySlug(slug) {
  const articles = await readArticlesFile();
  return articles.find((article) => article.slug === slug) || null;
}

export async function getArticlesByPublication(publication) {
  const articles = await getAllArticles();
  return articles.filter((article) => article.publication === publication);
}
