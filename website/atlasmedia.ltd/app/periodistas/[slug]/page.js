import { notFound } from "next/navigation";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

function slugify(name) { return (name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function getInitials(name) { return (name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function timeAgo(date) { if(!date) return ""; return new Date(date).toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"}); }
const scopeColors = { national:"#cc0000",provincial:"#1a6b3c",city:"#1a4a8a",municipal:"#7c3a8a" };

async function getJournalist(slug) {
  const db = getDb();
  const result = await db.query(`SELECT j.*, p.name as publication_name, p.slug as publication_slug, p.scope, t.name as territory_name, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published') as article_count, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published' AND a.published_at>NOW()-INTERVAL '30 days') as articles_last30, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published' AND a.category='Opinion') as opinion_count FROM public.journalists j LEFT JOIN public.publications p ON j.publication_id=p.id LEFT JOIN public.territories t ON p.territory_id=t.id WHERE lower(replace(replace(j.name,' ','-'),'.',''))=$1 OR j.slug=$1`, [slug]);
  if (!result.rows.length) return null;
  const journalist = result.rows[0];
  const articles = await db.query(`SELECT id,slug,title,excerpt,category,published_at,image_thumb FROM public.articles WHERE journalist_id=$1 AND status='published' ORDER BY published_at DESC LIMIT 24`, [journalist.id]);
  const categories = await db.query(`SELECT category, COUNT(*) as count FROM public.articles WHERE journalist_id=$1 AND status='published' GROUP BY category ORDER BY count DESC LIMIT 5`, [journalist.id]);
  return { journalist, articles: articles.rows, topCategories: categories.rows };
}

export async function generateMetadata({ params }) {
  const data = await getJournalist(params.slug);
  if (!data) return { title: "Periodista no encontrado" };
  return { title: data.journalist.name + " - " + data.journalist.publication_name, description: data.journalist.bio || data.journalist.name + ", " + data.journalist.role };
}

export default async function JournalistPage({ params }) {
  const data = await getJournalist(params.slug);
  if (!data) notFound();
  const { journalist: j, articles, topCategories } = data;
  const accentColor = scopeColors[j.scope] || "#1a4a8a";

  return (
    <div style={{ background:"#fff",color:"#111",minHeight:"100vh",fontFamily:"Georgia, serif" }}>
      <div style={{ background:"#111",padding:"8px 24px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <a href="/periodistas" style={{ color:"#93c5fd",textDecoration:"none",fontSize:13,fontFamily:"Arial" }}>- Redaccion</a>
        <a href={"/"+j.publication_slug} style={{ color:"#93c5fd",textDecoration:"none",fontSize:13,fontFamily:"Arial" }}>{j.publication_name}</a>
      </div>

      <div style={{ borderBottom:"4px solid "+accentColor,padding:"40px 24px" }}>
        <div style={{ maxWidth:900,margin:"0 auto",display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap" }}>
          <div style={{ width:110,height:110,borderRadius:"50%",background:accentColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:800,flexShrink:0,fontFamily:"Arial" }}>{getInitials(j.name)}</div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:36,fontWeight:900,margin:"0 0 4px",lineHeight:1.1 }}>{j.name}</h1>
            <div style={{ fontSize:16,color:accentColor,fontWeight:600,marginBottom:12,fontFamily:"Arial" }}>{j.role} · <a href={"/"+j.publication_slug} style={{ color:accentColor,textDecoration:"none" }}>{j.publication_name}</a></div>
            {j.bio && <p style={{ fontSize:16,color:"#444",lineHeight:1.7,margin:"0 0 16px",maxWidth:600 }}>{j.bio}</p>}
            <div style={{ display:"flex",gap:24,flexWrap:"wrap",fontFamily:"Arial" }}>
              {j.beat && <div style={{ fontSize:13 }}><span style={{ opacity:0.5 }}>Especialidad: </span><span style={{ fontWeight:600 }}>{j.beat}</span></div>}
              {j.tone && <div style={{ fontSize:13 }}><span style={{ opacity:0.5 }}>Estilo: </span><span style={{ fontWeight:600 }}>{j.tone}</span></div>}
              <div style={{ fontSize:13 }}><span style={{ opacity:0.5 }}>Medio: </span><span style={{ fontWeight:600 }}>{j.territory_name}</span></div>
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12,fontFamily:"Arial" }}>
            {[{label:"Articulos",value:parseInt(j.article_count||0)},{label:"Este mes",value:parseInt(j.articles_last30||0)},{label:"Opinion",value:parseInt(j.opinion_count||0)}].map((stat,i) => (
              <div key={i} style={{ textAlign:"center",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 20px" }}>
                <div style={{ fontSize:26,fontWeight:800,color:accentColor }}>{stat.value}</div>
                <div style={{ fontSize:11,opacity:0.5 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900,margin:"0 auto",padding:"36px 24px 80px",display:"grid",gridTemplateColumns:"1fr 260px",gap:40 }}>
        <div>
          <h2 style={{ fontSize:22,fontWeight:800,margin:"0 0 20px" }}>Articulos de {j.name.split(" ")[0]}</h2>
          <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
            {articles.map(article => (
              <div key={article.id} style={{ display:"flex",gap:16,paddingBottom:24,borderBottom:"1px solid #eee" }}>
                {article.image_thumb && <img src={article.image_thumb} alt="" style={{ width:90,height:68,objectFit:"cover",borderRadius:6,flexShrink:0 }} />}
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:10,color:accentColor,fontWeight:700,textTransform:"uppercase",letterSpacing:1,fontFamily:"Arial" }}>{article.category}</span>
                  <a href={"/noticias/"+article.slug} style={{ textDecoration:"none",color:"inherit" }}>
                    <h3 style={{ fontSize:17,fontWeight:700,lineHeight:1.3,margin:"5px 0 6px" }}>{article.title}</h3>
                  </a>
                  <p style={{ fontSize:13,color:"#666",lineHeight:1.5,margin:"0 0 6px",fontFamily:"Arial" }}>{article.excerpt?.slice(0,120)}...</p>
                  <span style={{ fontSize:12,color:"#bbb",fontFamily:"Arial" }}>{timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
            {articles.length===0 && <p style={{ opacity:0.4,fontSize:15,fontFamily:"Arial" }}>Sin articulos publicados todavia.</p>}
          </div>
        </div>

        <aside>
          <div style={{ position:"sticky",top:24 }}>
            {topCategories.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <h3 style={{ fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:2,borderBottom:"2px solid "+accentColor,paddingBottom:8,marginBottom:14,fontFamily:"Arial",color:accentColor }}>Temas frecuentes</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {topCategories.map((cat,i) => {
                    const max = parseInt(topCategories[0]?.count||1);
                    return (
                      <div key={i}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4,fontFamily:"Arial",fontSize:13 }}><span>{cat.category}</span><span style={{ opacity:0.4 }}>{cat.count}</span></div>
                        <div style={{ height:4,background:"#f0f0f0",borderRadius:2 }}><div style={{ height:"100%",background:accentColor,borderRadius:2,width:(parseInt(cat.count)/max*100)+"%" }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ border:"1px solid #e5e7eb",borderRadius:12,padding:20 }}>
              <h3 style={{ fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontFamily:"Arial" }}>Sobre el medio</h3>
              <a href={"/"+j.publication_slug} style={{ textDecoration:"none",color:"inherit" }}>
                <div style={{ fontWeight:700,fontSize:16,color:accentColor,marginBottom:4 }}>{j.publication_name}</div>
              </a>
              <div style={{ fontSize:13,opacity:0.5,fontFamily:"Arial" }}>{j.territory_name}</div>
              <a href="/periodistas" style={{ display:"block",marginTop:14,fontSize:13,color:accentColor,textDecoration:"none",fontFamily:"Arial" }}>Ver toda la redaccion →</a>
            </div>
          </div>
        </aside>
      </div>

      <footer style={{ background:"#0b1020",color:"#fff",padding:"20px 24px",textAlign:"center",fontSize:13,opacity:0.5,fontFamily:"Arial" }}>
        {j.publication_name} · Atlas Media Network © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
