import { getAllArticles } from "../../lib/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editorial Desk",
  description: "Internal editorial article overview."
};

export default async function EditorialPage({ searchParams }) {
  const articles = await getAllArticles();
  const statusFilter = typeof searchParams?.status === "string" ? searchParams.status : "all";
  const reviewFilter = typeof searchParams?.review === "string" ? searchParams.review : "all";

  const filtered = articles.filter((article) => {
    const statusOk = statusFilter === "all" ? true : article.status === statusFilter;
    const reviewOk = reviewFilter === "all" ? true : article.reviewStatus === reviewFilter;
    return statusOk && reviewOk;
  });

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 80px" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>
      <h1 style={{ fontSize: 48, margin: "18px 0 10px" }}>Editorial Desk</h1>
      <p style={{ opacity: 0.8, marginBottom: 28 }}>
        Internal overview of all articles, including draft, review, and published workflows.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <a href="/editorial?status=all&review=all" style={buttonStyle}>All</a>
        <a href="/editorial?status=draft&review=all" style={buttonStyle}>Drafts</a>
        <a href="/editorial?status=published&review=all" style={buttonStyle}>Published</a>
        <a href="/editorial?status=all&review=in-review" style={buttonStyle}>In Review</a>
        <a href="/editorial?status=all&review=approved" style={buttonStyle}>Approved</a>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {filtered.map((article) => (
          <article
            key={article.id}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 20,
              background: "rgba(255,255,255,0.03)"
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <span style={tagStyle}>{article.status}</span>
              <span style={tagStyle}>{article.reviewStatus}</span>
              <span style={tagStyle}>{article.publicationName}</span>
              <span style={tagStyle}>{article.section}</span>
              <span style={tagStyle}>{article.category}</span>
              {article.assignedEditor ? <span style={tagStyle}>Editor: {article.assignedEditor}</span> : null}
            </div>

            <h2 style={{ margin: "0 0 8px" }}>{article.title}</h2>
            <p style={{ marginTop: 0, opacity: 0.85 }}>{article.excerpt}</p>

            <div style={{ fontSize: 14, opacity: 0.72 }}>
              {article.author}
              {article.authorRole ? ` — ${article.authorRole}` : ""}
              {article.tone ? ` · Tone: ${article.tone}` : ""}
              {article.publishedAt ? ` · Published: ${new Date(article.publishedAt).toLocaleString()}` : ""}
              {article.publishAt ? ` · Scheduled: ${new Date(article.publishAt).toLocaleString()}` : ""}
              {article.updatedAt ? ` · Updated: ${new Date(article.updatedAt).toLocaleString()}` : ""}
            </div>

            <div style={{ marginTop: 12, fontSize: 14, opacity: 0.75 }}>
              <strong>SEO Title:</strong> {article.seoTitle}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.75 }}>
              <strong>SEO Description:</strong> {article.seoDescription}
            </div>

            {article.status === "published" ? (
              <div style={{ marginTop: 14 }}>
                <a href={`/noticias/${article.slug}`} style={{ color: "#93c5fd", textDecoration: "none" }}>
                  Open article →
                </a>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </main>
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

const tagStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)"
};
