import { notFound } from "next/navigation";
import Analytics from "../../components/Analytics";
import NewsletterForm from "../../components/NewsletterForm";
import { getDb } from "../../lib/db";
import { getArticlesByPublication } from "../../lib/articles";

export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  "admin","api","editorial","editorial-director","executive-board",
  "expansion","governance","newsroom","noticias","president",
  "dashboard","argentina-post","argentina-post-mendoza","sitemap.xml","robots.txt"
];

async function getPublication(slug) {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT p.*, t.name as territory_name, t.type as territory_type,
              pp.name as parent_name, pp.slug as parent_slug
       FROM public.publications p
       LEFT JOIN public.territories t ON p.territory_id=t.id
       LEFT JOIN public.publications pp ON p.parent_id=pp.id
       WHERE p.slug=$1 AND p.status='active'`,
      [slug]
    );
    return result.rows[0] || null;
  } catch { return null; }
}

async function getCategories(publicationId) {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT name, slug FROM public.pub_categories WHERE publication_id=$1 AND active=true ORDER BY display_order`,
      [publicationId]
    );
    return result.rows;
  } catch { return []; }
}

export async function generateMetadata({ params }) {
  const pub = await getPublication(params.publication);
  if (!pub) return { title: "Publicación no encontrada" };
  return {
    title: pub.name + " — " + (pub.description || "Noticias locales"),
    description: pub.editorial_line || pub.description || "Noticias de " + pub.territory_name
  };
}

function getAccentColor(scope) {
  const colors = { national:"#cc0000", provincial:"#1a6b3c", city:"#1a4a8a", municipal:"#7c3a8a", niche:"#8a5a1a" };
  return colors[scope] || "#1a4a8a";
}

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return `hace ${Math.floor(diff/60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  return `hace ${Math.floor(diff/86400)}d`;
}

export default async function PublicationPage({ params }) {
  const slug = params.publication;
  if (STATIC_ROUTES.includes(slug)) notFound();

  const [pub, articles] = await Promise.all([
    getPublication(slug),
    getArticlesByPublication(slug).catch(() => [])
  ]);
  if (!pub) notFound();

  const categories = await getCategories(pub.id);
  const accentColor = getAccentColor(pub.scope);
  const featured = articles[0];
  const secondary = articles.slice(1,4);
  const rest = articles.slice(4,16);
  const sidebar = articles.slice(0,6);
  const scopeLabel = { national:"Diario Nacional", provincial:"Diario Provincial", city:"Diario Local", municipal:"Diario Municipal", niche:"Publicación Especializada" }[pub.scope] || "Diario Digital";

  return (
    <div style={{ background:"#fff", color:"#111", minHeight:"100vh", fontFamily:"Georgia, serif" }}>
      <div style={{ background:accentColor, color:"#fff", padding:"6px 24px", fontSize:12, display:"flex", justifyContent:"space-between" }}>
        <span style={{ opacity:0.8 }}>{new Date().toLocaleDateString("es-AR", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</span>
        <div style={{ display:"flex", gap:16 }}>
          {pub.parent_slug && <a href={"/"+pub.parent_slug} style={{ color:"#fff", textDecoration:"none", fontSize:11, opacity:0.7 }}>← {pub.parent_name}</a>}
          <a href="/" style={{ color:"#fff", textDecoration:"none", fontSize:11, opacity:0.7 }}>Atlas Media Network</a>
        </div>
      </div>

      <header style={{ borderBottom:"3px solid "+accentColor, padding:"20px 24px 16px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", textAlign:"center" }}>
          <h1 style={{ fontSize:pub.name.length>25?42:56, fontWeight:900, margin:"0 0 4px", letterSpacing:-2, color:accentColor }}>{pub.name}</h1>
          <p style={{ fontSize:12, opacity:0.5, margin:0, letterSpacing:2, textTransform:"uppercase" }}>{scopeLabel} · {pub.territory_name}</p>
          {pub.description && <p style={{ fontSize:14, opacity:0.6, margin:"6px 0 0", fontStyle:"italic" }}>{pub.description}</p>}
        </div>
      </header>

      <nav style={{ borderBottom:"1px solid #ddd" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", display:"flex", overflowX:"auto" }}>
          <a href={"/"+slug} style={{ padding:"10px 16px", fontSize:13, fontWeight:700, color:accentColor, textDecoration:"none", borderBottom:"2px solid "+accentColor, fontFamily:"Arial, sans-serif", whiteSpace:"nowrap" }}>Inicio</a>
          {categories.map(cat => (
            <a key={cat.slug} href="#" style={{ padding:"10px 16px", fontSize:13, color:"#444", textDecoration:"none", fontFamily:"Arial, sans-serif", whiteSpace:"nowrap" }}>{cat.name}</a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px 80px" }}>
        {articles.length === 0 && (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#888" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📰</div>
            <p style={{ fontSize:20, fontWeight:700 }}>Redacción en preparación</p>
            <p style={{ fontSize:14 }}>{pub.name} está siendo configurado. Las primeras noticias aparecerán pronto.</p>
            {pub.editorial_line && <p style={{ fontSize:14, fontStyle:"italic", opacity:0.6, maxWidth:500, margin:"16px auto 0" }}>{pub.editorial_line}</p>}
          </div>
        )}

        {featured && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:32, marginBottom:32 }}>
            <div>
              <a href={"/noticias/"+featured.slug} style={{ textDecoration:"none", color:"inherit" }}>
                {featured.image_url
                  ? <img src={featured.image_url} alt="" style={{ width:"100%", height:380, objectFit:"cover", display:"block", marginBottom:16 }} />
                  : <div style={{ width:"100%", height:380, background:"#f5f5f5", marginBottom:16 }} />
                }
                <span style={{ fontSize:11, fontWeight:700, color:accentColor, textTransform:"uppercase", letterSpacing:1, fontFamily:"Arial, sans-serif" }}>{featured.category}</span>
                <h2 style={{ fontSize:32, lineHeight:1.15, margin:"8px 0 12px", fontWeight:900 }}>{featured.title}</h2>
                <p style={{ fontSize:17, color:"#444", lineHeight:1.5, margin:"0 0 12px" }}>{featured.excerpt}</p>
                <span style={{ fontSize:13, color:"#888", fontFamily:"Arial, sans-serif" }}>{featured.author} · {timeAgo(featured.publishedAt)}</span>
              </a>
            </div>
            <div style={{ borderLeft:"1px solid #ddd", paddingLeft:28 }}>
              <h3 style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:2, borderBottom:"2px solid "+accentColor, paddingBottom:8, marginBottom:16, fontFamily:"Arial, sans-serif", color:accentColor }}>Últimas</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {sidebar.slice(1).map(a => (
                  <a key={a.id} href={"/noticias/"+a.slug} style={{ textDecoration:"none", color:"inherit", display:"flex", gap:10, paddingBottom:14, borderBottom:"1px solid #eee" }}>
                    {a.image_thumb && <img src={a.image_thumb} alt="" style={{ width:64, height:64, objectFit:"cover", flexShrink:0 }} />}
                    <div>
                      <span style={{ fontSize:10, color:accentColor, fontWeight:700, textTransform:"uppercase", letterSpacing:1, fontFamily:"Arial, sans-serif" }}>{a.category}</span>
                      <p style={{ fontSize:13, fontWeight:700, lineHeight:1.3, margin:"3px 0" }}>{a.title}</p>
                      <span style={{ fontSize:11, color:"#888", fontFamily:"Arial, sans-serif" }}>{timeAgo(a.publishedAt)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {secondary.length > 0 && (
          <div style={{ marginBottom:36 }}>
            <div style={{ borderTop:"3px solid "+accentColor, borderBottom:"1px solid #ddd", marginBottom:24 }}>
              <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, padding:"8px 0", display:"block", fontFamily:"Arial, sans-serif", color:accentColor }}>Destacados</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
              {secondary.map(a => (
                <a key={a.id} href={"/noticias/"+a.slug} style={{ textDecoration:"none", color:"inherit" }}>
                  {a.image_url ? <img src={a.image_url} alt="" style={{ width:"100%", height:160, objectFit:"cover", display:"block", marginBottom:10 }} /> : <div style={{ width:"100%", height:160, background:"#f5f5f5", marginBottom:10 }} />}
                  <span style={{ fontSize:10, color:accentColor, fontWeight:700, textTransform:"uppercase", letterSpacing:1, fontFamily:"Arial, sans-serif" }}>{a.category}</span>
                  <h3 style={{ fontSize:17, lineHeight:1.3, margin:"6px 0 8px", fontWeight:800 }}>{a.title}</h3>
                  <span style={{ fontSize:12, color:"#888", fontFamily:"Arial, sans-serif" }}>{a.author} · {timeAgo(a.publishedAt)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div>
            <div style={{ borderTop:"3px solid "+accentColor, borderBottom:"1px solid #ddd", marginBottom:24 }}>
              <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, padding:"8px 0", display:"block", fontFamily:"Arial, sans-serif" }}>Más noticias</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:24 }}>
              {rest.map(a => (
                <a key={a.id} href={"/noticias/"+a.slug} style={{ textDecoration:"none", color:"inherit", paddingBottom:20, borderBottom:"1px solid #eee" }}>
                  {a.image_url && <img src={a.image_url} alt="" style={{ width:"100%", height:140, objectFit:"cover", display:"block", marginBottom:10 }} />}
                  <span style={{ fontSize:10, color:accentColor, fontWeight:700, textTransform:"uppercase", letterSpacing:1, fontFamily:"Arial, sans-serif" }}>{a.category}</span>
                  <h3 style={{ fontSize:15, lineHeight:1.3, margin:"6px 0 6px", fontWeight:700 }}>{a.title}</h3>
                  <span style={{ fontSize:12, color:"#888", fontFamily:"Arial, sans-serif" }}>{a.author} · {timeAgo(a.publishedAt)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{ background:accentColor, color:"#fff", padding:"32px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:900 }}>{pub.name}</div>
            <div style={{ fontSize:12, opacity:0.6 }}>Una publicación de Atlas Media Network · {pub.territory_name}</div>
          </div>
          <div style={{ fontSize:12, opacity:0.6 }}>© {new Date().getFullYear()} {pub.name}</div>
        </div>
      </footer>
    </div>
  );
}
