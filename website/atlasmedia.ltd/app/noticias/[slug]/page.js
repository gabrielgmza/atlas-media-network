import { getArticleBySlug, getArticlesByPublication } from "../../../lib/articles";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";

export async function generateMetadata({ params }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Artículo no encontrado" };
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author],
      images: article.image_url ? [{ url: article.image_url }] : []
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      images: article.image_url ? [article.image_url] : []
    },
    alternates: { canonical: BASE_URL + "/noticias/" + params.slug }
  };
}

function timeAgo(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ArticlePage({ params }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const pubSlug = article.publication === "argentina-post-mendoza" ? "argentina-post-mendoza" : "argentina-post";
  const accentColor = pubSlug === "argentina-post-mendoza" ? "#1a6b3c" : "#cc0000";
  const allArticles = await getArticlesByPublication(pubSlug);
  const related = allArticles.filter(a => a.slug !== article.slug && a.category === article.category).slice(0, 3);
  const more = allArticles.filter(a => a.slug !== article.slug).slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.image_url ? [article.image_url] : [],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: [{ "@type": "Person", name: article.author }],
    publisher: {
      "@type": "Organization",
      name: article.publicationName,
      logo: { "@type": "ImageObject", url: BASE_URL + "/logo.png" }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": BASE_URL + "/noticias/" + article.slug },
    articleSection: article.category,
    inLanguage: "es-AR"
  };

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: "#111", color: "#fff", padding: "6px 24px", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
        <span style={{ opacity: 0.6 }}>{new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 11 }}>Atlas Media Network</a>
      </div>

      <header style={{ borderBottom: "3px solid " + accentColor, padding: "16px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <a href={"/" + pubSlug} style={{ textDecoration: "none", color: "inherit" }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, margin: 0, letterSpacing: -1, color: accentColor }}>{article.publicationName}</h1>
          </a>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 48 }}>
        <article>
          <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <a href={"/" + pubSlug} style={{ color: "#888", textDecoration: "none" }}>{article.publicationName}</a>
            <span style={{ color: "#bbb" }}>›</span>
            <span style={{ color: accentColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{article.category}</span>
          </div>

          <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: "0 0 16px", fontWeight: 900 }}>{article.title}</h1>

          <p style={{ fontSize: 20, color: "#333", lineHeight: 1.5, margin: "0 0 20px", fontStyle: "italic", borderLeft: "4px solid " + accentColor, paddingLeft: 16 }}>
            {article.excerpt}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 16, borderBottom: "1px solid #eee", marginBottom: 24, fontFamily: "Arial, sans-serif" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: accentColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {article.author?.charAt(0) || "A"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{article.author}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{article.authorRole} · {timeAgo(article.publishedAt)}</div>
            </div>
          </div>

          {article.image_url && (
            <figure style={{ margin: "0 0 28px" }}>
              <img src={article.image_url} alt={article.image_alt || article.title} style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }} />
              {article.image_credit && (
                <figcaption style={{ fontSize: 11, color: "#999", marginTop: 6, fontFamily: "Arial, sans-serif" }}>
                  Foto: <a href={article.image_credit_url} target="_blank" rel="noopener noreferrer" style={{ color: "#999" }}>{article.image_credit}</a> / Unsplash
                </figcaption>
              )}
            </figure>
          )}

          <div style={{ fontSize: 19, lineHeight: 1.85, color: "#222" }}>
            {(article.content || []).map((paragraph, i) => (
              <p key={i} style={{ marginBottom: 24 }}>{paragraph}</p>
            ))}
          </div>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #eee", display: "flex", gap: 8, flexWrap: "wrap", fontFamily: "Arial, sans-serif" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>Temas:</span>
            {[article.category, article.section].filter(Boolean).map((tag, i) => (
              <span key={i} style={{ background: "#f5f5f5", padding: "4px 12px", borderRadius: 20, fontSize: 12, color: "#444" }}>{tag}</span>
            ))}
          </div>

          {related.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, borderBottom: "2px solid " + accentColor, paddingBottom: 8, marginBottom: 20, fontFamily: "Arial, sans-serif" }}>
                Relacionadas en {article.category}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {related.map(a => (
                  <a key={a.id} href={"/noticias/" + a.slug} style={{ textDecoration: "none", color: "inherit" }}>
                    {a.image_thumb && <img src={a.image_thumb} alt="" style={{ width: "100%", height: 110, objectFit: "cover", display: "block", marginBottom: 8 }} />}
                    <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{a.title}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside>
          <div style={{ position: "sticky", top: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, borderBottom: "2px solid " + accentColor, paddingBottom: 8, marginBottom: 16, fontFamily: "Arial, sans-serif" }}>
              Más noticias
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {more.map(a => (
                <a key={a.id} href={"/noticias/" + a.slug} style={{ textDecoration: "none", color: "inherit", paddingBottom: 16, borderBottom: "1px solid #eee" }}>
                  <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{a.category}</span>
                  <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, margin: "4px 0" }}>{a.title}</p>
                  <span style={{ fontSize: 11, color: "#888", fontFamily: "Arial, sans-serif" }}>{a.author}</span>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <footer style={{ background: "#111", color: "#fff", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{article.publicationName}</div>
            <div style={{ fontSize: 12, opacity: 0.4 }}>Una publicación de Atlas Media Network</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.4 }}>© {new Date().getFullYear()} {article.publicationName}</div>
        </div>
      </footer>
    </div>
  );
}
