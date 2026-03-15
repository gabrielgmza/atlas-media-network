import { getArticleBySlug } from "../../../lib/articles";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Article not found" };

  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt
  };
}

export default async function ArticlePage({ params }) {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Back</a>

      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <span style={tagStyle}>{article.publicationName}</span>
        <span style={tagStyle}>{article.section}</span>
        <span style={tagStyle}>{article.category}</span>
        {article.tone ? <span style={tagStyle}>Tone: {article.tone}</span> : null}
      </div>

      <h1 style={{ fontSize: 52, lineHeight: 1.05, marginBottom: 12, marginTop: 20 }}>{article.title}</h1>
      <p style={{ fontSize: 20, opacity: 0.8 }}>{article.excerpt}</p>

      <div style={{ opacity: 0.65, marginBottom: 32 }}>
        {article.author}
        {article.authorRole ? ` — ${article.authorRole}` : ""}
        {article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleString()}` : ""}
      </div>

      <article style={{ fontSize: 18, lineHeight: 1.8 }}>
        {article.content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </article>
    </main>
  );
}

const tagStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)"
};
