import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redaccion — Atlas Media Network", description: "El equipo de periodistas de Atlas Media Network." };

async function getJournalists() {
  const db = getDb();
  const result = await db.query(`SELECT j.*, p.name as publication_name, p.slug as publication_slug, p.scope, t.name as territory_name, (SELECT COUNT(*) FROM public.articles a WHERE a.journalist_id=j.id AND a.status='published') as article_count FROM public.journalists j LEFT JOIN public.publications p ON j.publication_id=p.id LEFT JOIN public.territories t ON p.territory_id=t.id WHERE j.active=true ORDER BY p.name, article_count DESC`);
  return result.rows;
}

function slugify(name) { return (name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function getInitials(name) { return (name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
const scopeColors = { national:"#cc0000",provincial:"#1a6b3c",city:"#1a4a8a",municipal:"#7c3a8a" };

export default async function JournalistsPage() {
  const journalists = await getJournalists();
  const byPublication = {};
  journalists.forEach(j => { const key = j.publication_name||"Sin publicacion"; if(!byPublication[key]) byPublication[key]={pub:j,journalists:[]}; byPublication[key].journalists.push(j); });

  return (
    <div style={{ background:"#fff",color:"#111",minHeight:"100vh",fontFamily:"Georgia, serif" }}>
      <div style={{ background:"#0b1020",color:"#fff",padding:"48px 24px 56px" }}>
        <div style={{ maxWidth:1000,margin:"0 auto",textAlign:"center" }}>
          <a href="/" style={{ color:"#93c5fd",textDecoration:"none",fontSize:13,fontFamily:"Arial" }}>Atlas Media Network</a>
          <h1 style={{ fontSize:44,fontWeight:900,margin:"16px 0 12px",lineHeight:1.1 }}>Nuestra redaccion</h1>
          <p style={{ fontSize:18,opacity:0.6,margin:0 }}>{journalists.length} periodistas · {Object.keys(byPublication).length} publicaciones</p>
        </div>
      </div>

      <div style={{ maxWidth:1000,margin:"0 auto",padding:"48px 24px 80px" }}>
        {Object.entries(byPublication).map(([pubName,{pub,journalists:pj}]) => {
          const color = scopeColors[pub.scope]||"#1a4a8a";
          return (
            <div key={pubName} style={{ marginBottom:56 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24,paddingBottom:12,borderBottom:"3px solid "+color }}>
                <h2 style={{ fontSize:24,fontWeight:800,margin:0,color }}>{pubName}</h2>
                <span style={{ fontSize:13,opacity:0.5,fontFamily:"Arial" }}>{pub.territory_name}</span>
                <a href={"/"+pub.publication_slug} style={{ marginLeft:"auto",fontSize:13,color,textDecoration:"none",fontFamily:"Arial" }}>Ver diario →</a>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:20 }}>
                {pj.map(journalist => (
                  <a key={journalist.id} href={"/periodistas/"+slugify(journalist.name)} style={{ textDecoration:"none",color:"inherit" }}>
                    <div style={{ border:"1px solid #e5e7eb",borderRadius:14,padding:"24px 20px",textAlign:"center" }}>
                      <div style={{ width:72,height:72,borderRadius:"50%",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,margin:"0 auto 14px",fontFamily:"Arial" }}>{getInitials(journalist.name)}</div>
                      <div style={{ fontWeight:800,fontSize:16,marginBottom:4 }}>{journalist.name}</div>
                      <div style={{ fontSize:13,color,fontWeight:600,marginBottom:8,fontFamily:"Arial" }}>{journalist.role}</div>
                      <div style={{ fontSize:12,color:"#888",marginBottom:12,fontFamily:"Arial",lineHeight:1.4 }}>{journalist.beat||"Noticias generales"}</div>
                      <div style={{ fontSize:12,color:"#bbb",fontFamily:"Arial" }}>{parseInt(journalist.article_count||0)} articulos</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
        {journalists.length === 0 && <div style={{ textAlign:"center",padding:"80px 0",opacity:0.4 }}><p style={{ fontSize:20 }}>La redaccion se esta configurando...</p></div>}
      </div>

      <footer style={{ background:"#0b1020",color:"#fff",padding:"24px",textAlign:"center",fontSize:13,opacity:0.5,fontFamily:"Arial" }}>Atlas Media Network © {new Date().getFullYear()}</footer>
    </div>
  );
}
