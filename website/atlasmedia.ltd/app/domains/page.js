"use client";
import { useState, useEffect } from "react";

const statusColors = {
  pending:    {bg:"#f59e0b22",color:"#f59e0b",label:"Pendiente"},
  purchasing: {bg:"#3b82f622",color:"#3b82f6",label:"Comprando..."},
  configuring:{bg:"#8b5cf622",color:"#8b5cf6",label:"Configurando..."},
  active:     {bg:"#22c55e22",color:"#22c55e",label:"Activo"},
  failed:     {bg:"#ef444422",color:"#ef4444",label:"Error"}
};

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkForm, setCheckForm] = useState({domain:""});
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [registerForm, setRegisterForm] = useState({domain:"",publicationId:""});
  const [registering, setRegistering] = useState(false);
  const [msg, setMsg] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const token = () => localStorage.getItem("atlas-admin-token")||"";
  const hdrs = () => ({"Content-Type":"application/json","x-atlas-admin-token":token()});

  async function loadData() {
    setLoading(true);
    try {
      const [domsRes, pubsRes] = await Promise.all([fetch("/api/domains",{headers:hdrs()}), fetch("/api/expansion/launch")]);
      const [domsData, pubsData] = await Promise.all([domsRes.json(), pubsRes.json()]);
      if (domsData.ok) setDomains(domsData.domains||[]);
      if (pubsData.ok) setPublications(pubsData.publications||[]);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function checkAvailability() {
    if (!checkForm.domain) return;
    setChecking(true); setCheckResult(null);
    const res = await fetch("/api/domains?action=check&domain="+encodeURIComponent(checkForm.domain));
    const data = await res.json();
    setCheckResult(data); setChecking(false);
  }

  async function getSuggestions(publicationId) {
    setSuggestions([]);
    const res = await fetch("/api/domains?action=suggest&publication="+publicationId,{headers:hdrs()});
    const data = await res.json();
    if (data.ok) setSuggestions(data.suggestions||[]);
  }

  async function registerDomain() {
    if (!registerForm.domain||!registerForm.publicationId) return;
    setRegistering(true); setMsg(null);
    const res = await fetch("/api/domains",{method:"POST",headers:hdrs(),body:JSON.stringify({action:"register",domain:registerForm.domain,publicationId:registerForm.publicationId})});
    const data = await res.json();
    if (data.ok) { setMsg({type:"success",text:"Dominio "+registerForm.domain+" configurado."}); setRegisterForm({domain:"",publicationId:""}); loadData(); }
    else setMsg({type:"error",text:data.error});
    setRegistering(false);
  }

  async function verifyDomain(domain) {
    const res = await fetch("/api/domains",{method:"POST",headers:hdrs(),body:JSON.stringify({action:"verify",domain})});
    const data = await res.json();
    setMsg({type:data.verified?"success":"error",text:data.verified?domain+" verificado en Vercel.":"Todavia no verificado. DNS puede tardar hasta 48hs."});
    loadData();
  }

  async function deleteDomain(domain) {
    if (!confirm("Eliminar "+domain+"?")) return;
    await fetch("/api/domains?domain="+encodeURIComponent(domain),{method:"DELETE",headers:hdrs()});
    loadData();
  }

  const field = {background:"#1e2a3a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"9px 14px",color:"#e5e7eb",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"Arial"};

  return (
    <div style={{minHeight:"100vh",background:"#0b1020",color:"#e5e7eb",fontFamily:"Arial, sans-serif",paddingBottom:80}}>
      <div style={{padding:"20px 32px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <a href="/control" style={{color:"#93c5fd",textDecoration:"none",fontSize:13}}>← Panel de control</a>
          <div style={{width:1,height:20,background:"rgba(255,255,255,0.15)"}} />
          <span style={{fontWeight:700,fontSize:16}}>Gestion de dominios</span>
          <span style={{background:"rgba(255,255,255,0.08)",borderRadius:20,padding:"2px 10px",fontSize:12}}>{domains.filter(d=>d.status==="active").length} activos</span>
        </div>
        <button onClick={loadData} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#93c5fd",cursor:"pointer",fontSize:13}}>Refrescar</button>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 32px"}}>
        <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"16px 20px",background:"rgba(255,255,255,0.02)",marginBottom:24}}>
          <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 10px"}}>Credenciales necesarias en Vercel</h3>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:13}}>
            {[["GODADDY_API_KEY","developer.godaddy.com"],["GODADDY_API_SECRET","developer.godaddy.com"],["VERCEL_TOKEN","vercel.com/account/tokens"],["VERCEL_PROJECT_ID","Vercel → proyecto → Settings"]].map(([k,h])=>(
              <div key={k}><span style={{opacity:0.5}}>{k}: </span><span style={{color:"#f59e0b",fontSize:12}}>{h}</span></div>
            ))}
          </div>
        </div>

        {msg && <div style={{background:msg.type==="success"?"#22c55e22":"#ef444422",border:"1px solid "+(msg.type==="success"?"#22c55e":"#ef4444"),borderRadius:10,padding:"10px 16px",marginBottom:20,fontSize:14,color:msg.type==="success"?"#86efac":"#fca5a5"}}>{msg.text}</div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
          <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
            <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 14px"}}>Verificar disponibilidad</h3>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input value={checkForm.domain} onChange={e=>setCheckForm({domain:e.target.value})} onKeyDown={e=>e.key==="Enter"&&checkAvailability()} placeholder="argentinapost.com.ar" style={{...field,flex:1}}/>
              <button onClick={checkAvailability} disabled={checking||!checkForm.domain} style={{background:"#4f46e5",border:"none",borderRadius:8,padding:"9px 16px",color:"#fff",cursor:"pointer",fontSize:13,opacity:checking||!checkForm.domain?0.5:1}}>{checking?"...":"Verificar"}</button>
            </div>
            {checkResult && <div style={{fontSize:13,padding:"10px 14px",borderRadius:8,background:checkResult.available?"#22c55e18":"#ef444418",border:"1px solid "+(checkResult.available?"#22c55e44":"#ef444444"),color:checkResult.available?"#86efac":"#fca5a5"}}>{checkResult.available?"Disponible — USD "+checkResult.price+"/anio":"No disponible"}</div>}
          </div>

          <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
            <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 14px"}}>Registrar dominio en Vercel</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <input value={registerForm.domain} onChange={e=>setRegisterForm(f=>({...f,domain:e.target.value}))} placeholder="argentinapost.com.ar" style={{...field,width:"100%"}}/>
              <select value={registerForm.publicationId} onChange={e=>{setRegisterForm(f=>({...f,publicationId:e.target.value}));if(e.target.value)getSuggestions(e.target.value);}} style={{...field,width:"100%"}}>
                <option value="">Seleccionar publicacion...</option>
                {publications.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={registerDomain} disabled={registering||!registerForm.domain||!registerForm.publicationId} style={{background:"#22c55e",border:"none",borderRadius:8,padding:"9px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,opacity:registering||!registerForm.domain||!registerForm.publicationId?0.5:1}}>{registering?"Configurando...":"Configurar DNS + Vercel"}</button>
            </div>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20,marginBottom:24}}>
            <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 14px"}}>Dominios sugeridos</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
              {suggestions.map((s,i)=>(
                <div key={i} style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:14,fontWeight:s.available?600:400,opacity:s.available?1:0.4}}>{s.domain}</div>{s.available?<div style={{fontSize:11,color:"#22c55e",marginTop:2}}>USD {s.price}/anio</div>:<div style={{fontSize:11,color:"#ef4444",marginTop:2}}>No disponible</div>}</div>
                  {s.available && <button onClick={()=>setRegisterForm(f=>({...f,domain:s.domain}))} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,padding:"4px 10px",color:"#e5e7eb",cursor:"pointer",fontSize:12}}>Usar</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 14px"}}>Dominios registrados</h3>
        {loading && <p style={{opacity:0.5}}>Cargando...</p>}
        {!loading && domains.length===0 && <div style={{textAlign:"center",padding:"40px 0",opacity:0.4}}><p>No hay dominios registrados todavia</p><p style={{fontSize:13}}>Se agregan automaticamente cuando se lanza una nueva publicacion</p></div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {domains.map(domain => {
            const sc = statusColors[domain.status]||statusColors.pending;
            return (
              <div key={domain.id} style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,background:"rgba(255,255,255,0.02)"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:15}}>{domain.domain}</span>
                    <span style={{background:sc.bg,color:sc.color,border:"1px solid "+sc.color+"44",borderRadius:6,padding:"1px 8px",fontSize:11,fontWeight:600}}>{sc.label}</span>
                    {domain.vercel_verified && <span style={{fontSize:11,color:"#22c55e"}}>Vercel OK</span>}
                    {domain.dns_configured && <span style={{fontSize:11,color:"#3b82f6"}}>DNS OK</span>}
                  </div>
                  <div style={{fontSize:12,opacity:0.5}}>{domain.publication_name}{domain.price_usd&&" · USD "+domain.price_usd+"/anio"}{domain.error_log&&" · Error: "+domain.error_log.slice(0,60)}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {domain.status==="active"&&!domain.vercel_verified && <button onClick={()=>verifyDomain(domain.domain)} style={{background:"#3b82f622",border:"1px solid #3b82f644",borderRadius:8,padding:"5px 10px",color:"#93c5fd",cursor:"pointer",fontSize:12}}>Verificar</button>}
                  {domain.status==="active" && <a href={"https://"+domain.domain} target="_blank" rel="noopener noreferrer" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"5px 10px",color:"#9ca3af",textDecoration:"none",fontSize:12}}>Abrir</a>}
                  <button onClick={()=>deleteDomain(domain.domain)} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"5px 10px",color:"#6b7280",cursor:"pointer",fontSize:12}}>Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
