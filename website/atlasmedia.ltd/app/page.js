import { getAllArticles } from "../lib/articles";

function Card({ article }) {
  return (
    <article
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 20,
        background: "rgba(255,255,255,0.03)"
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        {article.publication} · {article.category} · {new Date(article.publishedAt).toLocaleString()}
      </div>
      <h3 style={{ marginTop: 0 }}>{article.title}</h3>
      <p style={{ opacity: 0.85 }}>{article.excerpt}</p>
      <a href={`/noticias/${article.slug}`} style={{ color: "#93c5fd", textDecoration: "none" }}>
        Read article →
      </a>
    </article>
  );
}

const buttonStyle = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 12,
  textDecoration: "none",
  color: "#e5e7eb",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)"
};

export default function HomePage() {
  const articles = getAllArticles();

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 12, opacity: 0.65 }}>
          Atlas Media Network
        </div>
        <h1 style={{ fontSize: 56, lineHeight: 1.05, margin: "12px 0 16px" }}>
          Digital media infrastructure for scalable publications
        </h1>
        <p style={{ maxWidth: 780, fontSize: 18, opacity: 0.8 }}>
          Pilot deployment with Argentina Post and Argentina Post Mendoza. This build includes the first public web layer and a serverless editorial API on Vercel.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
        <a href="/argentina-post" style={buttonStyle}>Argentina Post</a>
        <a href="/argentina-post-mendoza" style={buttonStyle}>Argentina Post Mendoza</a>
        <a href="/api/articles" style={buttonStyle}>API /api/articles</a>
      </div>

      <section>
        <h2 style={{ marginBottom: 20 }}>Latest articles</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {articles.map((article) => <Card key={article.id} article={article} />)}
        </div>
      </section>
    </main>
  );
}
