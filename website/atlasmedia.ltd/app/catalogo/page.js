"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  if (diff < 604800) return "hace " + Math.floor(diff/86400) + "d";
  return new Date(date).toLocaleDateString("es-AR", { day:"numeric",month:"short" });
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState([]);
  const [categories, setCategories] = useState([]);

  const q = searchParams.get("q") || "";
  const pub = searchParams.get("pub") || "";
  const cat = searchParams.get("cat") || "";
  const sort = searchParams.get("sort") || "recent";
  const page = parseInt(searchParams.get("page") || "1");

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push("/catalogo?" + params.toString());
  };

  const setPage = (p) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p);
    router.push("/catalogo?" + params.toString());
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/expansion/launch").then(r=>r.json()),
      fetch("/api/categories").then(r=>r.json())
    ]).then(([pubData,catData]) => {
      if (pubData.ok) setPublications(pubData.publications||[]);
      if (catData.ok) setCategories(catData.categories||[]);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 18 });
    if (q) params.set("q", q);
    if (pub) params.set("publication", pub);
    if (cat) params.set("category", cat);
    if (sort) params.set("sort", sort);
    const url = q ? "/api/search?" + params : "/api/articles?" + params;
    fetch(url).then(r=>r.json()).then(data => {
      if (data.ok) { setArticles(data.results||data.articles||[]); setTotal(data.total||0); setPages(data.pages||1); }
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [q, pub, cat, sort, page]);

  const btnStyle = (active) => ({ border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, textAlign: "left", background: active ? "#111" : "#f5f5f5", color: active ? "#fff" : "#111", fontWeight: active ? 600 : 400 });

  return (
    <div style={{ minHeight:"100vh",background:"#fff",color:"#111",fontFamily:"Arial, sans-serif" }}>
      <div style={{ background:"#0b1020",color:"#fff",padding:"28px 24px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
            <a href="/" style={{ color:"#93c5fd",textDecoration:"none",fontSize:13 }}>Atlas Media Network</a>
            <span style={{ opacity:0.3 }}>›</span>
            <span style={{ fontWeight:700,fontSize:15 }}>Catalogo de articulos</span>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <input value={q} onChange={e=>updateParam("q",e.target.value)} placeholder="Buscar en todos los articulos..." style={{ flex:1,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"12px 18px",color:"#fff",fontSize:15,outline:"none" }} />
            {q && <button onClick={()=>updateParam("q","")} style={{ background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"12px 18px",color:"#fff",cursor:"pointer",fontSize:14 }}>x</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200,margin:"0 auto",padding:24 }}>
        <div style={{ display:"grid",gridTemplateColumns:"220px 1fr",gap:28 }}>
          <aside>
            <div style={{ position:"sticky",top:20 }}>
              <div style={{ marginBottom:20 }}>
                <h3 style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 8px" }}>Ordenar</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  <button onClick={()=>updateParam("sort","recent")} style={btnStyle(sort==="recent")}>Mas recientes</button>
                  <button onClick={()=>updateParam("sort","oldest")} style={btnStyle(sort==="oldest")}>Mas antiguos</button>
                </div>
              </div>
              <div style={{ marginBottom:20 }}>
                <h3 style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 8px" }}>Publicacion</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  <button onClick={()=>updateParam("pub","")} style={btnStyle(!pub)}>Todas</button>
                  {publications.map(p=><button key={p.id} onClick={()=>updateParam("pub",p.id)} style={{ ...btnStyle(pub===p.id),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.name}</button>)}
                </div>
              </div>
              {categories.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <h3 style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 8px" }}>Categoria</h3>
                  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    <button onClick={()=>updateParam("cat","")} style={btnStyle(!cat)}>Todas</button>
                    {categories.slice(0,15).map(c=>(
                      <button key={c.category} onClick={()=>updateParam("cat",c.category)} style={{ ...btnStyle(cat===c.category),display:"flex",justifyContent:"space-between" }}>
                        <span>{c.category}</span><span style={{ opacity:0.4,fontSize:11 }}>{c.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <main>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap" }}>
              <span style={{ fontSize:14,opacity:0.6 }}>{loading?"Cargando...":total.toLocaleString()+" articulos"}</span>
              {pub && <span style={{ background:"#111",color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer" }} onClick={()=>updateParam("pub","")}>{publications.find(p=>p.id===pub)?.name||pub} x</span>}
              {cat && <span style={{ background:"#111",color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer" }} onClick={()=>updateParam("cat","")}>{cat} x</span>}
              {q && <span style={{ background:"#111",color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer" }} onClick={()=>updateParam("q","")}>{q} x</span>}
              {(pub||cat||q) && <button onClick={()=>router.push("/catalogo")} style={{ background:"none",border:"1px solid #ddd",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer",color:"#888" }}>Limpiar filtros</button>}
            </div>

            {loading && <p style={{ opacity:0.5,textAlign:"center",padding:60 }}>Cargando articulos...</p>}
            {!loading && articles.length===0 && <div style={{ textAlign:"center",padding:"60px 0",opacity:0.4 }}><p style={{ fontSize:20,fontFamily:"Georgia,serif" }}>Sin resultados</p><p style={{ fontSize:14 }}>Proba con otros filtros</p></div>}

            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20,marginBottom:32 }}>
              {articles.map(article => (
                <a key={article.id||article.slug} href={"/noticias/"+article.slug} style={{ textDecoration:"none",color:"inherit" }}>
                  {article.image_thumb||article.image_url
                    ? <img src={article.image_thumb||article.image_url} alt="" style={{ width:"100%",height:160,objectFit:"cover",display:"block",borderRadius:8,marginBottom:10 }} />
                    : <div style={{ width:"100%",height:160,background:"#f0f0f0",borderRadius:8,marginBottom:10 }} />
                  }
                  <div style={{ fontSize:11,color:"#cc0000",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5 }}>
                    {article.category}
                    {article.publication_name && <span style={{ color:"#888",fontWeight:400,marginLeft:8 }}>{article.publication_name}</span>}
                  </div>
                  <h3 style={{ fontSize:16,fontWeight:700,lineHeight:1.3,margin:"0 0 6px",fontFamily:"Georgia,serif" }}>{article.title}</h3>
                  <p style={{ fontSize:13,color:"#666",lineHeight:1.5,margin:"0 0 8px" }}>{(article.excerpt||"").slice(0,100)}...</p>
                  <div style={{ fontSize:12,color:"#bbb" }}>{article.author} · {timeAgo(article.published_at)}</div>
                </a>
              ))}
            </div>

            {pages > 1 && (
              <div style={{ display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap" }}>
                {page>1 && <button onClick={()=>setPage(page-1)} style={{ background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13 }}>Anterior</button>}
                {Array.from({length:Math.min(pages,10)},(_,i)=>i+1).map(p=>(
                  <button key={p} onClick={()=>setPage(p)} style={{ width:38,height:38,borderRadius:8,border:"2px solid "+(p===page?"#111":"#ddd"),background:p===page?"#111":"#fff",color:p===page?"#fff":"#111",cursor:"pointer",fontWeight:p===page?700:400,fontSize:14 }}>{p}</button>
                ))}
                {page<pages && <button onClick={()=>setPage(page+1)} style={{ background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13 }}>Siguiente</button>}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div style={{ padding:48,textAlign:"center",fontFamily:"Arial" }}>Cargando...</div>}>
      <CatalogContent />
    </Suspense>
  );
}
