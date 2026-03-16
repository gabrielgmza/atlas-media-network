"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

const scopeColors = { national:"#cc0000",provincial:"#1a6b3c",city:"#1a4a8a",municipal:"#7c3a8a" };

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

export default function CategoryPage() {
  const { publication, category } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "1");
  const [data, setData] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/categories?publication=" + publication + "&category=" + encodeURIComponent(decodeURIComponent(category)) + "&page=" + page + "&limit=12"),
      fetch("/api/categories?publication=" + publication)
    ]).then(([a,b]) => Promise.all([a.json(),b.json()]))
      .then(([catData,allData]) => { if(catData.ok)setData(catData); if(allData.ok)setAllCategories(allData.categories); })
      .catch(()=>{}).finally(()=>setLoading(false));
  }, [publication, category, page]);

  const pub = data?.publication;
  const accentColor = pub ? (scopeColors[pub.scope]||"#1a4a8a") : "#1a4a8a";
  const categoryName = decodeURIComponent(category);

  if (loading) return <div style={{ minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontFamily:"Arial" }}>Cargando...</div>;

  return (
    <div style={{ background:"#fff",color:"#111",minHeight:"100vh",fontFamily:"Georgia, serif" }}>
      <div style={{ background:"#111",color:"#fff",padding:"6px 24px",fontSize:12,display:"flex",justifyContent:"space-between",fontFamily:"Arial" }}>
        <span style={{ opacity:0.6 }}>{new Date().toLocaleDateString("es-AR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span>
        <a href="/" style={{ color:"#93c5fd",textDecoration:"none",fontSize:11 }}>Atlas Media Network</a>
      </div>

      <header style={{ borderBottom:"3px solid "+accentColor,padding:"16px 24px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",textAlign:"center" }}>
          <a href={"/"+publication} style={{ textDecoration:"none",color:"inherit" }}>
            <h1 style={{ fontSize:42,fontWeight:900,margin:0,letterSpacing:-1,color:accentColor }}>{pub?.name||publication}</h1>
          </a>
        </div>
      </header>

      <nav style={{ borderBottom:"1px solid #ddd",overflowX:"auto" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",padding:"0 24px",display:"flex",gap:0 }}>
          <a href={"/"+publication} style={{ padding:"10px 16px",fontSize:13,color:"#444",textDecoration:"none",fontFamily:"Arial",whiteSpace:"nowrap" }}>Inicio</a>
          {allCategories.map(cat => (
            <a key={cat.category} href={"/"+publication+"/categoria/"+encodeURIComponent(cat.category)} style={{ padding:"10px 16px",fontSize:13,color:cat.category===categoryName?accentColor:"#444",textDecoration:"none",fontFamily:"Arial",whiteSpace:"nowrap",borderBottom:cat.category===categoryName?"2px solid "+accentColor:"none",fontWeight:cat.category===categoryName?700:400 }}>
              {cat.category} <span style={{ fontSize:10,opacity:0.4 }}>({cat.count})</span>
            </a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:1200,margin:"0 auto",padding:"28px 24px 80px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11,fontFamily:"Arial",opacity:0.5,marginBottom:6 }}>
            <a href={"/"+publication} style={{ color:"#888",textDecoration:"none" }}>{pub?.name||publication}</a>{" › "}
            <span style={{ color:accentColor,fontWeight:700,textTransform:"uppercase",letterSpacing:1 }}>{categoryName}</span>
          </div>
          <h2 style={{ fontSize:32,fontWeight:900,margin:"0 0 4px" }}>{categoryName}</h2>
          <p style={{ fontSize:14,opacity:0.5,margin:0,fontFamily:"Arial" }}>{data?.total||0} articulos publicados</p>
        </div>

        {(!data?.articles?.length) && <div style={{ textAlign:"center",padding:"60px 0",opacity:0.4 }}><p style={{ fontSize:18 }}>No hay articulos en esta categoria todavia.</p></div>}

        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:28,marginBottom:40 }}>
          {(data?.articles||[]).map(article => (
            <a key={article.id} href={"/noticias/"+article.slug} style={{ textDecoration:"none",color:"inherit" }}>
              {article.image_url
                ? <img src={article.image_url} alt="" style={{ width:"100%",height:180,objectFit:"cover",display:"block",marginBottom:12,borderRadius:4 }} />
                : <div style={{ width:"100%",height:180,background:"#f5f5f5",marginBottom:12,borderRadius:4 }} />
              }
              <span style={{ fontSize:10,color:accentColor,fontWeight:700,textTransform:"uppercase",letterSpacing:1,fontFamily:"Arial" }}>{article.category}</span>
              <h3 style={{ fontSize:18,lineHeight:1.3,margin:"6px 0 8px",fontWeight:800 }}>{article.title}</h3>
              <p style={{ fontSize:14,color:"#555",lineHeight:1.5,margin:"0 0 8px",fontFamily:"Arial" }}>{article.excerpt?.slice(0,110)}...</p>
              <span style={{ fontSize:12,color:"#888",fontFamily:"Arial" }}>{article.author} · {timeAgo(article.published_at)}</span>
            </a>
          ))}
        </div>

        {data?.pages > 1 && (
          <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
            {page>1 && <button onClick={()=>router.push("/"+publication+"/categoria/"+category+"?page="+(page-1))} style={{ background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"Arial" }}>Anterior</button>}
            {Array.from({length:Math.min(data.pages,8)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>router.push("/"+publication+"/categoria/"+category+"?page="+p)} style={{ width:38,height:38,borderRadius:8,border:"2px solid "+(p===page?"#111":"#ddd"),background:p===page?"#111":"#fff",color:p===page?"#fff":"#111",cursor:"pointer",fontWeight:p===page?700:400,fontSize:14,fontFamily:"Arial" }}>{p}</button>
            ))}
            {page<data.pages && <button onClick={()=>router.push("/"+publication+"/categoria/"+category+"?page="+(page+1))} style={{ background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"Arial" }}>Siguiente</button>}
          </div>
        )}
      </main>

      <footer style={{ background:accentColor,color:"#fff",padding:"24px",textAlign:"center",fontSize:13,fontFamily:"Arial" }}>
        {pub?.name||publication} · Atlas Media Network © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
