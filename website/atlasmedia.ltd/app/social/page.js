"use client";
import { useState, useEffect } from "react";

const PLATFORM_ICONS = { twitter:"X",facebook:"F",instagram:"IG",linkedin:"in",youtube:"YT" };
const PLATFORM_COLORS = { twitter:"#1da1f2",facebook:"#1877f2",instagram:"#e1306c",linkedin:"#0a66c2",youtube:"#ff0000" };
const CREDENTIAL_FIELDS = {
  twitter:  [{key:"accessToken",label:"Access Token",hint:"developer.twitter.com"},{key:"accessTokenSecret",label:"Access Token Secret",hint:"developer.twitter.com"}],
  facebook: [{key:"pageAccessToken",label:"Page Access Token",hint:"Meta Business → Access Tokens"},{key:"pageId",label:"Page ID",hint:"Facebook Page → About"}],
  instagram:[{key:"pageAccessToken",label:"Page Access Token",hint:"Meta Business"},{key:"instagramAccountId",label:"Instagram Account ID",hint:"Meta Business → Instagram"}],
  linkedin: [{key:"accessToken",label:"Access Token",hint:"linkedin.com/developers"},{key:"organizationId",label:"Organization ID",hint:"LinkedIn Company → About"}],
  youtube:  [{key:"accessToken",label:"Access Token",hint:"console.cloud.google.com"},{key:"channelId",label:"Channel ID",hint:"YouTube Studio → Settings"}]
};
const statusColors = {
  pending_setup:{bg:"#f59e0b22",color:"#f59e0b",label:"Pendiente configuracion"},
  active:       {bg:"#22c55e22",color:"#22c55e",label:"Activo"},
  paused:       {bg:"#6b728022",color:"#6b7280",label:"Pausado"},
  error:        {bg:"#ef444422",color:"#ef4444",label:"Error"}
};
function timeAgo(date) {
  if (!date) return "Nunca";
  const diff = Math.floor((Date.now()-new Date(date))/1000);
  if (diff<3600) return "hace "+Math.floor(diff/60)+"m";
  if (diff<86400) return "hace "+Math.floor(diff/3600)+"h";
  return "hace "+Math.floor(diff/86400)+"d";
}

export default function SocialPage() {
  const [accounts, setAccounts] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [runningCron, setRunningCron] = useState(false);

  const token = () => localStorage.getItem("atlas-admin-token") || "";
  const hdrs = () => ({ "Content-Type":"application/json","x-atlas-admin-token":token() });

  async function loadData() {
    setLoading(true);
    try {
      const [accRes, pubRes] = await Promise.all([fetch("/api/social/accounts",{headers:hdrs()}), fetch("/api/expansion/launch")]);
      const [accData, pubData] = await Promise.all([accRes.json(), pubRes.json()]);
      if (accData.ok) setAccounts(accData.accounts||[]);
      if (pubData.ok) setPublications(pubData.publications||[]);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function createSetupPlan(publicationId) {
    setMsg({ type:"info", text:"Analizando y enviando instrucciones por email..." });
    const res = await fetch("/api/social/accounts",{method:"POST",headers:hdrs(),body:JSON.stringify({action:"setup_plan",publicationId})});
    const data = await res.json();
    setMsg(data.ok ? {type:"success",text:data.message} : {type:"error",text:data.error});
    loadData();
  }

  async function saveCredentials(publicationId, platform) {
    setSaving(true);
    const res = await fetch("/api/social/accounts",{method:"POST",headers:hdrs(),body:JSON.stringify({action:"save_credentials",publicationId,platform,credentials,accountName:credentials.accountName,handle:credentials.handle})});
    const data = await res.json();
    if (data.ok) { setMsg({type:"success",text:platform+" activado correctamente."}); setConfiguring(null); setCredentials({}); loadData(); }
    else setMsg({type:"error",text:data.error});
    setSaving(false);
  }

  async function toggleAccount(publicationId, platform) {
    await fetch("/api/social/accounts",{method:"POST",headers:hdrs(),body:JSON.stringify({action:"toggle",publicationId,platform})});
    loadData();
  }

  async function runSocialCron() {
    setRunningCron(true);
    const res = await fetch("/api/cron/social",{headers:{...hdrs(),"authorization":"Bearer "+process.env.NEXT_PUBLIC_CRON_SECRET}});
    const data = await res.json();
    setMsg(data.ok ? {type:"success",text:"Publicados: "+data.published+" | Fallidos: "+data.failed+" | Omitidos: "+data.skipped} : {type:"error",text:data.error});
    setRunningCron(false); loadData();
  }

  const byPublication = {};
  accounts.forEach(a => { const k=a.publication_id; if(!byPublication[k]) byPublication[k]={name:a.publication_name,accounts:[]}; byPublication[k].accounts.push(a); });

  const field = {width:"100%",background:"#1e2a3a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"9px 14px",color:"#e5e7eb",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"Arial"};

  return (
    <div style={{minHeight:"100vh",background:"#0b1020",color:"#e5e7eb",fontFamily:"Arial, sans-serif",paddingBottom:80}}>
      <div style={{padding:"20px 32px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <a href="/control" style={{color:"#93c5fd",textDecoration:"none",fontSize:13}}>← Panel de control</a>
          <div style={{width:1,height:20,background:"rgba(255,255,255,0.15)"}} />
          <span style={{fontWeight:700,fontSize:16}}>Redes Sociales</span>
          <span style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:20,padding:"2px 10px",fontSize:12}}>{accounts.filter(a=>a.status==="active").length} activas</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={runSocialCron} disabled={runningCron} style={{background:"#4f46e522",border:"1px solid #4f46e544",borderRadius:8,padding:"6px 14px",color:"#a5b4fc",cursor:"pointer",fontSize:13,opacity:runningCron?0.5:1}}>{runningCron?"Publicando...":"Publicar pendientes"}</button>
          <button onClick={loadData} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#93c5fd",cursor:"pointer",fontSize:13}}>Refrescar</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 32px"}}>
        {msg && <div style={{background:msg.type==="success"?"#22c55e22":msg.type==="info"?"#3b82f622":"#ef444422",border:"1px solid "+(msg.type==="success"?"#22c55e":msg.type==="info"?"#3b82f6":"#ef4444"),borderRadius:10,padding:"10px 16px",marginBottom:20,fontSize:14,color:msg.type==="success"?"#86efac":msg.type==="info"?"#93c5fd":"#fca5a5",display:"flex",justifyContent:"space-between"}}><span>{msg.text}</span><button onClick={()=>setMsg(null)} style={{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:16}}>x</button></div>}

        <div style={{marginBottom:28}}>
          <h3 style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 14px"}}>Crear plan de redes por publicacion</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {publications.map(pub => (
              <button key={pub.id} onClick={()=>createSetupPlan(pub.id)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 16px",color:"#e5e7eb",cursor:"pointer",fontSize:13,textAlign:"left"}}>
                <div style={{fontWeight:600}}>{pub.name}</div>
                <div style={{fontSize:11,opacity:0.5,marginTop:2}}>Analizar + enviar instrucciones al email</div>
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{opacity:0.5}}>Cargando...</p>}

        {!loading && Object.entries(byPublication).map(([pubId,{name,accounts:pubAccounts}]) => (
          <div key={pubId} style={{marginBottom:32}}>
            <h2 style={{fontSize:15,fontWeight:700,opacity:0.6,margin:"0 0 14px",borderBottom:"1px solid rgba(255,255,255,0.08)",paddingBottom:10}}>{name}</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
              {pubAccounts.map(account => {
                const sc = statusColors[account.status]||statusColors.pending_setup;
                const color = PLATFORM_COLORS[account.platform]||"#888";
                const icon = PLATFORM_ICONS[account.platform]||account.platform;
                return (
                  <div key={account.id} style={{border:"1px solid rgba(255,255,255,0.08)",borderTop:"3px solid "+color,borderRadius:12,padding:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{width:36,height:36,borderRadius:10,background:color+"22",border:"1px solid "+color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color}}>{icon}</div>
                      <span style={{background:sc.bg,color:sc.color,border:"1px solid "+sc.color+"44",borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:600}}>{sc.label}</span>
                    </div>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{account.account_name||account.platform}</div>
                    {account.handle && <div style={{fontSize:12,opacity:0.5,marginBottom:6}}>@{account.handle}</div>}
                    <div style={{fontSize:11,opacity:0.4}}>Ultimo: {timeAgo(account.last_posted_at)}</div>
                    {account.posts_count>0 && <div style={{fontSize:11,opacity:0.4}}>{account.posts_count} posts</div>}
                    <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
                      {account.status==="pending_setup" && <button onClick={()=>{setConfiguring({platform:account.platform,publicationId:account.publication_id});setCredentials({});}} style={{background:color+"22",border:"1px solid "+color+"44",borderRadius:7,padding:"5px 10px",color,cursor:"pointer",fontSize:12,flex:1}}>Configurar</button>}
                      {account.status!=="pending_setup" && <button onClick={()=>toggleAccount(account.publication_id,account.platform)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"5px 10px",color:"#9ca3af",cursor:"pointer",fontSize:12}}>{account.status==="active"?"Pausar":"Activar"}</button>}
                      {account.status==="active" && <button onClick={()=>setConfiguring({platform:account.platform,publicationId:account.publication_id})} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"5px 10px",color:"#9ca3af",cursor:"pointer",fontSize:12}}>Creds</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!loading && accounts.length===0 && <div style={{textAlign:"center",padding:"60px 0",opacity:0.4}}><p style={{fontSize:18}}>No hay cuentas sociales configuradas</p><p style={{fontSize:14}}>Hace click en una publicacion arriba para crear el plan automatico</p></div>}
      </div>

      {configuring && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:24}}>
          <div style={{background:"#0f1a2e",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:28,width:"100%",maxWidth:480}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Configurar {configuring.platform}</h3>
              <button onClick={()=>setConfiguring(null)} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20}}>x</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><label style={{display:"block",fontSize:11,opacity:0.5,marginBottom:5}}>NOMBRE DE CUENTA</label><input value={credentials.accountName||""} onChange={e=>setCredentials(c=>({...c,accountName:e.target.value}))} placeholder="Argentina Post" style={field}/></div>
              <div><label style={{display:"block",fontSize:11,opacity:0.5,marginBottom:5}}>HANDLE</label><input value={credentials.handle||""} onChange={e=>setCredentials(c=>({...c,handle:e.target.value}))} placeholder="argentinapost" style={field}/></div>
              {(CREDENTIAL_FIELDS[configuring.platform]||[]).map(f => (
                <div key={f.key}><label style={{display:"block",fontSize:11,opacity:0.5,marginBottom:5}}>{f.label.toUpperCase()}</label><input value={credentials[f.key]||""} onChange={e=>setCredentials(c=>({...c,[f.key]:e.target.value}))} placeholder={f.hint} style={field} type="password"/><div style={{fontSize:11,opacity:0.3,marginTop:3}}>{f.hint}</div></div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>saveCredentials(configuring.publicationId,configuring.platform)} disabled={saving} style={{background:"#22c55e",border:"none",borderRadius:8,padding:"10px 20px",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:14,flex:1,opacity:saving?0.5:1}}>{saving?"Guardando...":"Activar cuenta"}</button>
              <button onClick={()=>setConfiguring(null)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 16px",color:"#9ca3af",cursor:"pointer",fontSize:14}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
