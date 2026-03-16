import { getDb } from "../lib/db";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Atlas Media Network — Red de medios digitales de Argentina",
  description: "El holding de medios digitales automatizados de mayor crecimiento en Argentina. Cobertura nacional, provincial y local con tecnologia de IA editorial."
};

async function getStats() {
  try {
    const db = getDb();
    const result = await db.query(`SELECT (SELECT COUNT(*) FROM public.publications WHERE status='active') as publications, (SELECT COUNT(*) FROM public.articles WHERE status='published') as articles, (SELECT COUNT(*) FROM public.journalists WHERE active=true) as journalists, (SELECT COUNT(*) FROM public.pipeline_runs WHERE status='completed') as runs, (SELECT COUNT(*) FROM public.newsletter_subscribers WHERE status='active') as subscribers`);
    return result.rows[0];
  } catch { return {}; }
}

async function getPublications() {
  try {
    const db = getDb();
    const result = await db.query(`SELECT p.id,p.name,p.slug,p.scope,p.description,t.name as territory_name,(SELECT COUNT(*) FROM public.articles a WHERE a.publication=p.id AND a.status='published') as article_count FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.status='active' ORDER BY p.scope,p.name LIMIT 8`);
    return result.rows;
  } catch { return []; }
}

async function getRecentArticles() {
  try {
    const db = getDb();
    const result = await db.query(`SELECT slug,title,excerpt,category,publication_name,author,published_at,image_thumb FROM public.articles WHERE status='published' ORDER BY published_at DESC LIMIT 6`);
    return result.rows;
  } catch { return []; }
}

const scopeColors = { national:"#cc0000",provincial:"#1a6b3c",city:"#1a4a8a",municipal:"#7c3a8a" };
const scopeLabels = { national:"Nacional",provincial:"Provincial",city:"Local",municipal:"Municipal" };

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

export default async function HomePage() {
  const [stats, publications, recentArticles] = await Promise.all([getStats(), getPublications(), getRecentArticles()]);

  const adminLinks = [
    {label:"AI President",href:"/president",color:"#4f46e5"},{label:"Panel de control",href:"/control",color:"#3b82f6"},
    {label:"Dashboard",href:"/dashboard",color:"#06b6d4"},{label:"Analytics",href:"/analytics",color:"#8b5cf6"},
    {label:"Red de medios",href:"/network",color:"#22c55e"},{label:"Fuentes RSS",href:"/sources",color:"#f59e0b"},
    {label:"Alertas",href:"/alerts",color:"#ef4444"},{label:"Estado",href:"/status",color:"#10b981"},
    {label:"Comentarios",href:"/comments",color:"#ec4899"},{label:"Exportar",href:"/export",color:"#f97316"},
    {label:"Dominios",href:"/domains",color:"#0891b2"},{label:"Media Kit",href:"/mediakit",color:"#84cc16"},
    {label:"Catalogo",href:"/catalogo",color:"#6366f1"},{label:"Redaccion",href:"/periodistas",color:"#a855f7"},
    {label:"Buscar",href:"/buscar",color:"#14b8a6"},{label:"Editorial Director",href:"/editorial-director",color:"#fb923c"},
    {label:"Expansion Director",href:"/expansion",color:"#34d399"},{label:"Newsroom",href:"/newsroom",color:"#60a5fa"},
    {label:"Admin",href:"/admin",color:"#f43f5e"}
  ];

  return (
    <div style={{ background:"#fff",color:"#111",fontFamily:"Georgia, serif",minHeight:"100vh" }}>

      <div style={{ background:"#0b1020",color:"#fff",padding:"80px 24px 96px" }}>
        <div style={{ maxWidth:1100,margin:"0 auto",textAlign:"center" }}>
          <div style={{ fontSize:12,letterSpacing:4,textTransform:"uppercase",opacity:0.4,marginBottom:20,fontFamily:"Arial" }}>Atlas Media Network</div>
          <h1 style={{ fontSize:64,fontWeight:900,margin:"0 0 20px",lineHeight:1.05,letterSpacing:-2 }}>El futuro del<br/>periodismo digital</h1>
          <p style={{ fontSize:20,opacity:0.6,maxWidth:600,margin:"0 auto 40px",lineHeight:1.6,fontFamily:"Arial" }}>Red de medios digitales automatizados con IA editorial. Cobertura nacional, provincial y local en Argentina.</p>

          <div style={{ display:"flex",gap:0,justifyContent:"center",flexWrap:"wrap",marginBottom:48 }}>
            {[{value:parseInt(stats.publications||0),label:"Publicaciones activas"},{value:parseInt(stats.articles||0).toLocaleString()+"+",label:"Articulos publicados"},{value:parseInt(stats.journalists||0),label:"Periodistas IA"},{value:parseInt(stats.subscribers||0),label:"Suscriptores"}].map((stat,i) => (
              <div key={i} style={{ padding:"20px 32px",borderRight:i<3?"1px solid rgba(255,255,255,0.1)":undefined,textAlign:"center" }}>
                <div style={{ fontSize:40,fontWeight:900,color:"#93c5fd",lineHeight:1 }}>{stat.value}</div>
                <div style={{ fontSize:13,opacity:0.4,marginTop:6,fontFamily:"Arial" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
            <a href="/argentina-post" style={{ background:"#cc0000",color:"#fff",padding:"14px 28px",borderRadius:10,textDecoration:"none",fontWeight:700,fontSize:15,fontFamily:"Arial" }}>Argentina Post</a>
            <a href="/argentina-post-mendoza" style={{ background:"#1a6b3c",color:"#fff",padding:"14px 28px",borderRadius:10,textDecoration:"none",fontWeight:700,fontSize:15,fontFamily:"Arial" }}>Arg. Post Mendoza</a>
            <a href="/mediakit" style={{ background:"rgba(255,255,255,0.1)",color:"#fff",padding:"14px 28px",borderRadius:10,textDecoration:"none",fontWeight:600,fontSize:15,fontFamily:"Arial",border:"1px solid rgba(255,255,255,0.2)" }}>Anunciarse</a>
          </div>
        </div>
      </div>

      {publications.length > 0 && (
        <div style={{ padding:"64px 24px",background:"#f8f8f8" }}>
          <div style={{ maxWidth:1100,margin:"0 auto" }}>
            <h2 style={{ fontSize:32,fontWeight:800,margin:"0 0 8px",textAlign:"center" }}>Nuestras publicaciones</h2>
            <p style={{ textAlign:"center",color:"#666",marginBottom:36,fontSize:16,fontFamily:"Arial" }}>Medios independientes con voz propia en cada territorio</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16 }}>
              {publications.map(pub => {
                const color = scopeColors[pub.scope]||"#1a4a8a";
                return (
                  <a key={pub.id} href={"/"+pub.slug} style={{ textDecoration:"none",color:"inherit" }}>
                    <div style={{ border:"1px solid #e5e7eb",borderTop:"4px solid "+color,borderRadius:12,padding:20,background:"#fff" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                        <h3 style={{ margin:0,fontSize:16,fontWeight:800 }}>{pub.name}</h3>
                        <span style={{ background:color+"18",color,border:"1px solid "+color+"33",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,fontFamily:"Arial",whiteSpace:"nowrap" }}>{scopeLabels[pub.scope]||pub.scope}</span>
                      </div>
                      <p style={{ color:"#888",fontSize:13,margin:"0 0 12px",fontFamily:"Arial" }}>{pub.territory_name}</p>
                      <div style={{ fontSize:13,color:"#bbb",fontFamily:"Arial" }}>{parseInt(pub.article_count||0).toLocaleString()} articulos</div>
                    </div>
                  </a>
                );
              })}
              {publications.length >= 8 && (
                <a href="/network" style={{ textDecoration:"none",color:"inherit" }}>
                  <div style={{ border:"1px dashed #ddd",borderRadius:12,padding:20,display:"flex",alignItems:"center",justifyContent:"center",background:"#fff",height:"100%",minHeight:100 }}>
                    <span style={{ color:"#888",fontSize:14,fontFamily:"Arial" }}>Ver todos los medios →</span>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {recentArticles.length > 0 && (
        <div style={{ padding:"64px 24px" }}>
          <div style={{ maxWidth:1100,margin:"0 auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32 }}>
              <h2 style={{ fontSize:32,fontWeight:800,margin:0 }}>Ultimas noticias</h2>
              <a href="/catalogo" style={{ color:"#1a4a8a",textDecoration:"none",fontSize:14,fontFamily:"Arial" }}>Ver todas →</a>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:24 }}>
              {recentArticles.map(article => (
                <a key={article.slug} href={"/noticias/"+article.slug} style={{ textDecoration:"none",color:"inherit" }}>
                  {article.image_thumb && <img src={article.image_thumb} alt="" style={{ width:"100%",height:180,objectFit:"cover",display:"block",borderRadius:8,marginBottom:12 }} />}
                  <span style={{ fontSize:11,color:"#cc0000",fontWeight:700,textTransform:"uppercase",letterSpacing:1,fontFamily:"Arial" }}>{article.category}</span>
                  <h3 style={{ fontSize:18,fontWeight:800,lineHeight:1.3,margin:"6px 0 8px" }}>{article.title}</h3>
                  <p style={{ fontSize:14,color:"#666",lineHeight:1.5,margin:"0 0 8px",fontFamily:"Arial" }}>{article.excerpt?.slice(0,120)}...</p>
                  <span style={{ fontSize:12,color:"#bbb",fontFamily:"Arial" }}>{article.publication_name} · {article.author} · {timeAgo(article.published_at)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background:"#0b1020",color:"#fff",padding:"64px 24px" }}>
        <div style={{ maxWidth:1100,margin:"0 auto" }}>
          <h2 style={{ fontSize:36,fontWeight:800,margin:"0 0 48px",textAlign:"center" }}>Tecnologia editorial sin precedentes</h2>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:28 }}>
            {[{icon:"P",title:"Pipeline autonomo",desc:"4 ciclos editoriales por dia. RSS, seleccion, redaccion, verificacion, publicacion. Sin intervencion humana.",color:"#3b82f6"},{icon:"J",title:"Periodistas IA",desc:"Cada medio tiene su equipo. Cada periodista tiene voz, estilo y especialidad propia.",color:"#22c55e"},{icon:"E",title:"Expansion autonoma",desc:"El AI Expansion Director detecta mercados y lanza nuevos medios automaticamente.",color:"#f59e0b"},{icon:"M",title:"Monetizacion integrada",desc:"Slots publicitarios, media kit publico, AI advertiser discovery. Revenue desde el primer dia.",color:"#ec4899"}].map((item,i) => (
              <div key={i} style={{ border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:24 }}>
                <div style={{ width:44,height:44,borderRadius:10,background:item.color+"22",border:"1px solid "+item.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:18,color:item.color,marginBottom:14,fontFamily:"Arial" }}>{item.icon}</div>
                <h3 style={{ fontSize:17,fontWeight:700,margin:"0 0 10px" }}>{item.title}</h3>
                <p style={{ fontSize:14,opacity:0.6,lineHeight:1.6,margin:0,fontFamily:"Arial" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"48px 24px",background:"#f8f8f8" }}>
        <div style={{ maxWidth:1100,margin:"0 auto" }}>
          <h3 style={{ fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:2,opacity:0.4,margin:"0 0 16px",fontFamily:"Arial" }}>Acceso al sistema</h3>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {adminLinks.map(link => (
              <a key={link.href} href={link.href} style={{ background:link.color+"15",color:link.color,border:"1px solid "+link.color+"33",borderRadius:8,padding:"6px 14px",textDecoration:"none",fontSize:13,fontWeight:500,fontFamily:"Arial" }}>{link.label}</a>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ background:"#060c18",color:"#fff",padding:"28px 24px" }}>
        <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,fontFamily:"Arial" }}>
          <div>
            <div style={{ fontWeight:800,fontSize:18,marginBottom:4 }}>Atlas Media Network</div>
            <div style={{ fontSize:12,opacity:0.4 }}>Red de medios digitales · Argentina</div>
          </div>
          <div style={{ display:"flex",gap:20,fontSize:13,opacity:0.5 }}>
            <a href="/catalogo" style={{ color:"#fff",textDecoration:"none" }}>Catalogo</a>
            <a href="/buscar" style={{ color:"#fff",textDecoration:"none" }}>Buscar</a>
            <a href="/periodistas" style={{ color:"#fff",textDecoration:"none" }}>Redaccion</a>
            <a href="/mediakit" style={{ color:"#fff",textDecoration:"none" }}>Media Kit</a>
            <a href="/network" style={{ color:"#fff",textDecoration:"none" }}>Red de medios</a>
          </div>
          <div style={{ fontSize:12,opacity:0.3 }}>© {new Date().getFullYear()} Atlas Media Network</div>
        </div>
      </footer>
    </div>
  );
}
