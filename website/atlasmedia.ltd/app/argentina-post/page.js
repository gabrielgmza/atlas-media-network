import { getArticlesByPublication } from "../../lib/articles";

export const metadata = {
  title: "Argentina Post",
  description: "National publication pilot by Atlas Media Network."
};

export default async function ArgentinaPostPage() {
  const articles = await getArticlesByPublication("argentina-post");

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>Argentina Post</h1>
      <p style={{ opacity: 0.8, marginBottom: 32 }}>National editorial pilot.</p>

      <div style={{ display: "grid", gap: 20 }}>
        {articles.map((article) => (
          <article key={article.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{article.category} · {article.author}</div>
            <h2>{article.title}</h2>
            <p style={{ opacity: 0.85 }}>{article.excerpt}</p>
            <a href={`/noticias/${article.slug}`} style={{ color: "#93c5fd", textDecoration: "none" }}>
              Read article →
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
