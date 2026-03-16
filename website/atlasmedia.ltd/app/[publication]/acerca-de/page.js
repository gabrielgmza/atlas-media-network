import { notFound } from "next/navigation";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const scopeColors = { national:"#cc0000",provincial:"#1a6b3c",city:"#1a4a8a",municipal:"#7c3a8a" };
const scopeLabels = { national:"Medio Nacional",provincial:"Medio Provincial",city:"Medio Local",municipal:"Medio Municipal" };

async function getPublicationData(slug) {
  const db = getDb();
  try {
    const [pub, journalists, stats] = await Promise.all([
      db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.slug=$1 AND p.status='active'`, [slug]),
      db.query(`SELECT id,name,role,bio,beat,tone FROM public.journalists WHERE publication_id=$1 AND active=true ORDER BY name`, [slug]),
      db.query(`SELECT (SELECT COUNT(*) FROM public.articles WHERE publication=$1 AND status='published') as articles, (SELECT COUNT(*) FROM public.journalists WHERE publication_id=$1 AND active=true) as journalists, (SELECT MIN(published_at) FROM public.articles WHERE publication=$1 AND status='published') as first_article`, [slug])
    ]);
    if (!pub.rows.length) return null;
    return { pub: pub.rows[0], journalists: journalists.rows, stats: stats.rows[0] };
  } catch { return null; }
}

function slugify(name) { return (name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function getInitials(name) { return (name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }

export async function generateMetadata({ params }) {
  const data = await getPublicationData(params.publication);
  if (!data) return { title: "Acerca de" };
  return { title: "Acerca de " + data.pub.name, description: data.pub.description || "Conoce la redaccion de " + data.pub.name };
}

export default async function AcercaDePage({ params }) {
  const data = await getPublicationData(params.publication);
  if (!data) notFound();
  const { pub, journalists, stats } = data;
  const accentColor = scopeColors[pub.scope] || "#1a4a8a";
  const foundingYear = stats.first_article ? new Date(stats.first_article).getFullYear() : new Date().getFullYear();

  return (
    <div style={{ background:"#fff",color:"#111",minHeight:"100vh",fontFamily:"Georgia, serif" }}>
      <div style={{ background:"#111",color:"#fff",padding:"6px 24px",fontSize:12,display:"flex",justifyContent:"space-between",fontFamily:"Arial" }}>
        <span style={{ opacity:0.6 }}>{new Date().toLocaleDateString("es-AR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span>
        <a href="/" style={{ color:"#93c5fd",textDecoration:"none",fontSize:11 }}>Atlas Media Network</a>
      </div>

      <header style={{ borderBottom:"3px solid "+accentColor,padding:"16px 24px" }}>
        <div style={{ maxWidth:900,margin:"0 auto",textAlign:"center" }}>
          <a href={"/"+params.publication} style={{ textDecoration:"none",color:"inherit" }}>
            <h1 style={{ fontSize:42,fontWeight:900,margin:0,letterSpacing:-1,color:accentColor }}>{pub.name}</h1>
          </a>
          <nav style={{ marginTop:12,display:"flex",justifyContent:"center",gap:0,flexWrap:"wrap" }}>
            <a href={"/"+params.publication} style={{ padding:"8px 16px",fontSize:13,color:"#444",textDecoration:"none",fontFamily:"Arial" }}>Inicio</a>
            <a href={"/"+params.publication+"/acerca-de"} style={{ padding:"8px 16px",fontSize:13,color:accentColor,textDecoration:"none",fontFamily:"Arial",borderBottom:"2px solid "+accentColor,fontWeight:700 }}>Acerca de</a>
            <a href="/periodistas" style={{ padding:"8px 16px",fontSize:13,color:"#444",textDecoration:"none",fontFamily:"Arial" }}>Redaccion</a>
            <a href={"/mediakit/"+params.publication} style={{ padding:"8px 16px",fontSize:13,color:"#444",textDecoration:"none",fontFamily:"Arial" }}>Publicitar</a>
            <a href={"/buscar?publication="+params.publication} style={{ padding:"8px 16px",fontSize:13,color:"#444",textDecoration:"none",fontFamily:"Arial" }}>Buscar</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth:900,margin:"0 auto",padding:"48px 24px 80px" }}>
        <div style={{ textAlign:"center",marginBottom:56,paddingBottom:40,borderBottom:"1px solid #eee" }}>
          <div style={{ width:80,height:80,borderRadius:20,background:accentColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,fontWeight:900,margin:"0 auto 20px",fontFamily:"Arial" }}>{pub.name?.charAt(0)}</div>
          <h2 style={{ fontSize:36,fontWeight:900,margin:"0 0 12px" }}>Acerca de {pub.name}</h2>
          <p style={{ fontSize:18,color:"#666",maxWidth:600,margin:"0 auto 20px",lineHeight:1.6,fontFamily:"Arial" }}>{pub.description || scopeLabels[pub.scope] + " de " + pub.territory_name + ". Noticias locales con rigor periodistico."}</p>
          <div style={{ display:"flex",gap:32,justifyContent:"center",flexWrap:"wrap" }}>
            {[{value:parseInt(stats.articles||0).toLocaleString(),label:"Articulos publicados"},{value:parseInt(stats.journalists||0),label:"Periodistas"},{value:foundingYear,label:"Desde"}].map((stat,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontSize:30,fontWeight:800,color:accentColor }}>{stat.value}</div>
                <div style={{ fontSize:13,opacity:0.5,fontFamily:"Arial" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <section style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:26,fontWeight:800,margin:"0 0 16px",borderLeft:"4px solid "+accentColor,paddingLeft:16 }}>Nuestra mision</h2>
          <div style={{ fontSize:17,lineHeight:1.85,color:"#333" }}>
            <p>{pub.editorial_line || pub.name + " es un medio digital independiente que cubre las noticias mas relevantes de " + pub.territory_name + ". Nuestra mision es informar con rigor, velocidad y profundidad."}</p>
            <p>Utilizamos tecnologia editorial de vanguardia para publicar noticias verificadas continuamente, con un equipo de {parseInt(stats.journalists||0)} periodistas especializados.</p>
            <p>Somos parte de <a href="/" style={{ color:accentColor,textDecoration:"none",fontWeight:600 }}>Atlas Media Network</a>, la red de medios digitales de mayor crecimiento en Argentina.</p>
          </div>
        </section>

        <section style={{ marginBottom:48,background:"#f8f8f8",borderRadius:14,padding:32 }}>
          <h2 style={{ fontSize:26,fontWeight:800,margin:"0 0 24px" }}>Principios editoriales</h2>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:20 }}>
            {[{title:"Verificacion",desc:"Toda noticia es verificada antes de publicarse con multiples fuentes.",icon:"V"},{title:"Independencia",desc:"No tenemos linea politica. Informamos los hechos con objetividad.",icon:"I"},{title:"Transparencia",desc:"Identificamos el origen de cada informacion. Cuando erramos, corregimos.",icon:"T"},{title:"Proximidad",desc:"Priorizamos noticias que impactan directamente en " + pub.territory_name + ".",icon:"P"}].map((p,i) => (
              <div key={i}>
                <div style={{ width:36,height:36,borderRadius:8,background:accentColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,marginBottom:10,fontFamily:"Arial" }}>{p.icon}</div>
                <h3 style={{ fontSize:16,fontWeight:700,margin:"0 0 8px" }}>{p.title}</h3>
                <p style={{ fontSize:14,color:"#666",lineHeight:1.5,margin:0,fontFamily:"Arial" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {journalists.length > 0 && (
          <section style={{ marginBottom:48 }}>
            <h2 style={{ fontSize:26,fontWeight:800,margin:"0 0 24px" }}>Nuestro equipo editorial</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16 }}>
              {journalists.map(journalist => (
                <a key={journalist.id} href={"/periodistas/"+slugify(journalist.name)} style={{ textDecoration:"none",color:"inherit" }}>
                  <div style={{ border:"1px solid #e5e7eb",borderRadius:12,padding:"18px",textAlign:"center" }}>
                    <div style={{ width:52,height:52,borderRadius:"50%",background:accentColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,margin:"0 auto 10px",fontFamily:"Arial" }}>{getInitials(journalist.name)}</div>
                    <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>{journalist.name}</div>
                    <div style={{ fontSize:12,color:accentColor,fontWeight:600,marginBottom:4,fontFamily:"Arial" }}>{journalist.role}</div>
                    {journalist.beat && <div style={{ fontSize:11,color:"#888",fontFamily:"Arial" }}>{journalist.beat}</div>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section style={{ borderTop:"1px solid #eee",paddingTop:40 }}>
          <h2 style={{ fontSize:26,fontWeight:800,margin:"0 0 16px" }}>Contacto</h2>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,fontFamily:"Arial" }}>
            <div>
              <h3 style={{ fontSize:16,fontWeight:700,margin:"0 0 8px" }}>Redaccion</h3>
              <p style={{ fontSize:14,color:"#666",lineHeight:1.6,margin:0 }}>Para enviar informacion, tips o denuncias contactate con nuestra redaccion.</p>
              <a href="mailto:redaccion@atlasmedia.ltd" style={{ display:"block",marginTop:10,color:accentColor,fontSize:14,textDecoration:"none",fontWeight:600 }}>redaccion@atlasmedia.ltd</a>
            </div>
            <div>
              <h3 style={{ fontSize:16,fontWeight:700,margin:"0 0 8px" }}>Publicidad</h3>
              <p style={{ fontSize:14,color:"#666",lineHeight:1.6,margin:0 }}>Para consultas sobre publicidad y sponsorships.</p>
              <a href={"/mediakit/"+params.publication} style={{ display:"block",marginTop:10,color:accentColor,fontSize:14,textDecoration:"none",fontWeight:600 }}>Ver media kit →</a>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ background:accentColor,color:"#fff",padding:"24px" }}>
        <div style={{ maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,fontFamily:"Arial" }}>
          <div><div style={{ fontWeight:800,fontSize:18 }}>{pub.name}</div><div style={{ fontSize:12,opacity:0.6 }}>Una publicacion de Atlas Media Network</div></div>
          <div style={{ display:"flex",gap:16,fontSize:13,opacity:0.7 }}>
            <a href={"/"+params.publication} style={{ color:"#fff",textDecoration:"none" }}>Inicio</a>
            <a href="/periodistas" style={{ color:"#fff",textDecoration:"none" }}>Redaccion</a>
            <a href={"/mediakit/"+params.publication} style={{ color:"#fff",textDecoration:"none" }}>Publicitar</a>
          </div>
          <div style={{ fontSize:12,opacity:0.4 }}>© {new Date().getFullYear()} {pub.name}</div>
        </div>
      </footer>
    </div>
  );
}
