import { getArticleBySlug } from "../../../lib/articles";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Article not found" };
  return { title: article.title, description: article.excerpt };
}

export default async function ArticlePage({ params }) {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Back</a>
      <div style={{ marginTop: 24, fontSize: 12, opacity: 0.65 }}>
        {article.publication} · {article.category} · {article.author}
      </div>
      <h1 style={{ fontSize: 52, lineHeight: 1.05, marginBottom: 12 }}>{article.title}</h1>
      <p style={{ fontSize: 20, opacity: 0.8 }}>{article.excerpt}</p>
      <div style={{ opacity: 0.65, marginBottom: 32 }}>
        {new Date(article.publishedAt).toLocaleString()}
      </div>

      <article style={{ fontSize: 18, lineHeight: 1.8 }}>
        {article.content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </article>
    </main>
  );
}
