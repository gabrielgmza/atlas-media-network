import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media Kit — Atlas Media Network", description: "Anunciate en la red de medios digitales de mayor crecimiento en Argentina." };

async function getPublications() {
  const db = getDb();
  const result = await db.query(`SELECT p.id, p.name, p.slug, p.scope, p.description, t.name as territory_name, (SELECT COUNT(*) FROM public.articles a WHERE a.publication=p.id AND a.status='published') as article_count FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.status='active' ORDER BY p.scope, p.name`);
  return result.rows;
}

const scopeLabels = { national: "Nacional", provincial: "Provincial", city: "Local", municipal: "Municipal" };
const scopeColors = { national: "#cc0000", provincial: "#1a6b3c", city: "#1a4a8a", municipal: "#7c3a8a" };

export default async function MediaKitPage() {
  const publications = await getPublications();
  return (
    <div style={{ background: "#fff", color: "#111", fontFamily: "Arial, sans-serif", minHeight: "100vh" }}>
      <div style={{ background: "#0b1020", color: "#fff", padding: "64px 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.5, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Atlas Media Network</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, margin: "0 0 20px", lineHeight: 1.1 }}>Llega a tu audiencia donde mas importa</h1>
          <p style={{ fontSize: 20, opacity: 0.7, maxWidth: 600, margin: "0 auto 32px" }}>La red de medios digitales de mayor crecimiento en Argentina. Presencia nacional, cobertura local.</p>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
            {[{ value: publications.length+"+", label: "Publicaciones activas" }, { value: publications.reduce((s,p)=>s+parseInt(p.article_count||0),0).toLocaleString()+"+", label: "Articulos publicados" }, { value: "4x", label: "Publicaciones diarias" }].map((stat,i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#93c5fd" }}>{stat.value}</div>
                <div style={{ fontSize: 13, opacity: 0.5 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", textAlign: "center" }}>Nuestras publicaciones</h2>
        <p style={{ textAlign: "center", color: "#666", marginBottom: 40, fontSize: 16 }}>Elegi el medio que mejor llega a tu audiencia objetivo</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
          {publications.map(pub => {
            const color = scopeColors[pub.scope] || "#1a4a8a";
            return (
              <a key={pub.id} href={"/mediakit/"+pub.slug} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: "1px solid #e5e7eb", borderTop: "4px solid "+color, borderRadius: 12, padding: 24, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>{pub.name}</h3>
                    <span style={{ background: color+"18", color, border: "1px solid "+color+"33", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{scopeLabels[pub.scope]||pub.scope}</span>
                  </div>
                  <p style={{ color: "#666", fontSize: 14, margin: "0 0 16px" }}>{pub.territory_name}</p>
                  <div style={{ fontSize: 13, color: "#888" }}>{parseInt(pub.article_count||0).toLocaleString()} articulos publicados</div>
                  <div style={{ marginTop: 16, color, fontWeight: 600, fontSize: 14 }}>Ver media kit →</div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#f8f8f8", padding: "64px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 40px", textAlign: "center" }}>Formatos disponibles</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
            {[{ name:"Header Banner",size:"728x90",price:"USD 300/mes",color:"#1a4a8a"},{name:"Breaking News",size:"400x60",price:"USD 400/mes",color:"#cc0000"},{name:"Inline Article",size:"600x120",price:"USD 200/mes",color:"#1a6b3c"},{name:"Sidebar",size:"300x250",price:"USD 150/mes",color:"#7c3a8a"},{name:"Footer",size:"728x90",price:"USD 100/mes",color:"#8a5a1a"}].map((fmt,i) => (
              <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, textAlign: "center", background: "#fff" }}>
                <div style={{ width:"100%",height:60,background:fmt.color+"15",border:"2px dashed "+fmt.color+"44",borderRadius:6,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:fmt.color,fontWeight:600 }}>{fmt.size}</div>
                <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>{fmt.name}</div>
                <div style={{ fontSize:14,color:"#1a6b3c",fontWeight:600 }}>{fmt.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ background: "#060c18", color: "#fff", padding: "20px 24px", textAlign: "center", fontSize: 13, opacity: 0.5 }}>
        Atlas Media Network © {new Date().getFullYear()} · <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>Volver al sitio</a>
      </footer>
    </div>
  );
}
