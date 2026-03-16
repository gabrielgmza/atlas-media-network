import { getArticlesByPublication } from "../../lib/articles";
import Analytics from "../../components/Analytics";
import NewsletterForm from "../../components/NewsletterForm";
import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Argentina Post — Noticias nacionales",
  description: "El diario digital de Argentina. Política, economía, sociedad e internacionales."
};

async function getCategories() {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT name, slug FROM public.pub_categories WHERE publication_id='argentina-post' AND active=true ORDER BY display_order`
    );
    return result.rows;
  } catch { return []; }
}

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return `hace ${Math.floor(diff/60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  return `hace ${Math.floor(diff/86400)}d`;
}

export default async function ArgentinaPostPage() {
  const [articles, categories] = await Promise.all([
    getArticlesByPublication("argentina-post"),
    getCategories()
  ]);

  const featured = articles[0];
  const secondary = articles.slice(1, 4);
  const rest = articles.slice(4, 16);
  const sidebar = articles.slice(0, 6);

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#111", color: "#fff", padding: "6px 24px", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ opacity: 0.6 }}>{new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 11 }}>Atlas Media Network</a>
      </div>

      <header style={{ borderBottom: "3px solid #111", padding: "20px 24px 16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: 64, fontWeight: 900, margin: "0 0 4px", letterSpacing: -2, fontFamily: "Georgia, serif" }}>Argentina Post</h1>
          <p style={{ fontSize: 13, opacity: 0.5, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>El diario digital de Argentina</p>
        </div>
      </header>

      <nav style={{ borderBottom: "1px solid #ddd", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
          <a href="/argentina-post" style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "#111", textDecoration: "none", borderBottom: "2px solid #111", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>Inicio</a>
          <a href="/periodistas" style={{ padding: "10px 16px", fontSize: 13, color: "#444", textDecoration: "none", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>Redaccion</a>
          <a href="/buscar?publication=argentina-post" style={{ padding: "10px 16px", fontSize: 13, color: "#444", textDecoration: "none", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap", marginLeft: "auto" }}>Buscar</a>
          {categories.map(cat => (
            <a key={cat.slug} href={`/argentina-post?cat=${cat.slug}`} style={{ padding: "10px 16px", fontSize: 13, color: "#444", textDecoration: "none", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>{cat.name}</a>
          ))}
          {!categories.length && ["Política", "Economía", "Sociedad", "Internacionales", "Tecnología", "Deportes"].map(cat => (
            <a key={cat} href="#" style={{ padding: "10px 16px", fontSize: 13, color: "#444", textDecoration: "none", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>{cat}</a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
        {articles.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
            <p style={{ fontSize: 20 }}>El pipeline editorial está generando las primeras noticias...</p>
            <p style={{ fontSize: 14 }}>Volvé en unos minutos.</p>
          </div>
        )}

        {featured && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, marginBottom: 32 }}>
            <div>
              <a href={`/noticias/${featured.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                {featured.image_url
                  ? <img src={featured.image_url} alt={featured.image_alt || featured.title} style={{ width: "100%", height: 400, objectFit: "cover", display: "block", marginBottom: 16 }} />
                  : <div style={{ width: "100%", height: 400, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#999", fontSize: 14 }}>{featured.category}</div>
                }
                <span style={{ fontSize: 11, fontWeight: 700, color: "#cc0000", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{featured.category}</span>
                <h2 style={{ fontSize: 36, lineHeight: 1.15, margin: "8px 0 12px", fontWeight: 900 }}>{featured.title}</h2>
                <p style={{ fontSize: 18, color: "#444", lineHeight: 1.5, margin: "0 0 12px" }}>{featured.excerpt}</p>
                <span style={{ fontSize: 13, color: "#888", fontFamily: "Arial, sans-serif" }}>{featured.author} · {timeAgo(featured.publishedAt)}</span>
              </a>
            </div>
            <div style={{ borderLeft: "1px solid #ddd", paddingLeft: 32 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, borderBottom: "2px solid #111", paddingBottom: 8, marginBottom: 16, fontFamily: "Arial, sans-serif" }}>Últimas noticias</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {sidebar.slice(1).map(article => (
                  <a key={article.id} href={`/noticias/${article.slug}`} style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 12, paddingBottom: 16, borderBottom: "1px solid #eee" }}>
                    {article.image_thumb && <img src={article.image_thumb} alt="" style={{ width: 72, height: 72, objectFit: "cover", flexShrink: 0 }} />}
                    <div>
                      <span style={{ fontSize: 10, color: "#cc0000", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{article.category}</span>
                      <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, margin: "4px 0 4px" }}>{article.title}</p>
                      <span style={{ fontSize: 12, color: "#888", fontFamily: "Arial, sans-serif" }}>{timeAgo(article.publishedAt)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {secondary.length > 0 && (
          <div>
            <div style={{ borderTop: "3px solid #111", borderBottom: "1px solid #ddd", display: "flex", gap: 0, marginBottom: 28 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, padding: "8px 0", fontFamily: "Arial, sans-serif" }}>Destacados</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
              {secondary.map(article => (
                <a key={article.id} href={`/noticias/${article.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {article.image_url
                    ? <img src={article.image_url} alt={article.image_alt || ""} style={{ width: "100%", height: 180, objectFit: "cover", display: "block", marginBottom: 10 }} />
                    : <div style={{ width: "100%", height: 180, background: "#f5f5f5", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>{article.category}</div>
                  }
                  <span style={{ fontSize: 10, color: "#cc0000", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{article.category}</span>
                  <h3 style={{ fontSize: 18, lineHeight: 1.3, margin: "6px 0 8px", fontWeight: 800 }}>{article.title}</h3>
                  <p style={{ fontSize: 14, color: "#555", lineHeight: 1.5, margin: "0 0 8px" }}>{article.excerpt?.slice(0, 100)}...</p>
                  <span style={{ fontSize: 12, color: "#888", fontFamily: "Arial, sans-serif" }}>{article.author} · {timeAgo(article.publishedAt)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div>
            <div style={{ borderTop: "3px solid #111", borderBottom: "1px solid #ddd", marginBottom: 24 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, padding: "8px 0", display: "block", fontFamily: "Arial, sans-serif" }}>Más noticias</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {rest.map(article => (
                <a key={article.id} href={`/noticias/${article.slug}`} style={{ textDecoration: "none", color: "inherit", paddingBottom: 20, borderBottom: "1px solid #eee" }}>
                  {article.image_url && <img src={article.image_url} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block", marginBottom: 10 }} />}
                  <span style={{ fontSize: 10, color: "#cc0000", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{article.category}</span>
                  <h3 style={{ fontSize: 16, lineHeight: 1.3, margin: "6px 0 6px", fontWeight: 700 }}>{article.title}</h3>
                  <span style={{ fontSize: 12, color: "#888", fontFamily: "Arial, sans-serif" }}>{article.author} · {timeAgo(article.publishedAt)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <NewsletterForm publicationId="argentina-post" accentColor="#cc0000" />
      </div>
      <Analytics publicationId="argentina-post" />
      <footer style={{ background: "#111", color: "#fff", padding: "32px 24px", marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Argentina Post</div>
            <div style={{ fontSize: 12, opacity: 0.4 }}>Una publicación de Atlas Media Network</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.4 }}>© {new Date().getFullYear()} Argentina Post. Todos los derechos reservados.</div>
        </div>
      </footer>
    </div>
  );
}
