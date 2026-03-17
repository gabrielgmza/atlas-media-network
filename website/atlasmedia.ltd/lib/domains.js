const GODADDY_API_URL = "https://api.godaddy.com/v1";
const VERCEL_API_URL = "https://api.vercel.com";

function godaddyHeaders() {
  return { "Authorization": "sso-key " + process.env.GODADDY_API_KEY + ":" + process.env.GODADDY_API_SECRET, "Content-Type": "application/json" };
}
function vercelHeaders() {
  return { "Authorization": "Bearer " + process.env.VERCEL_TOKEN, "Content-Type": "application/json" };
}

export async function checkDomainAvailability(domain) {
  try {
    const res = await fetch(GODADDY_API_URL + "/domains/available?domain=" + encodeURIComponent(domain), { headers: godaddyHeaders() });
    const data = await res.json();
    return { available: data.available === true, price: data.price ? (data.price/1000000).toFixed(2) : null, currency: data.currency||"USD", domain };
  } catch (err) { return { available: false, error: err.message, domain }; }
}

export async function suggestDomains(publicationName, territory, scope) {
  const base = publicationName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"").slice(0,20);
  const terr = territory.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"").slice(0,15);
  const candidates = scope === "national"
    ? [base+".com.ar", base+".ar", base+"news.com.ar", "diario"+base+".com.ar"]
    : [base+".com.ar", terr+base+".com.ar", base+terr+".com.ar", "diario"+terr+".com.ar"];
  const results = await Promise.allSettled(candidates.map(d => checkDomainAvailability(d)));
  return results.map(r => r.status==="fulfilled"?r.value:null).filter(Boolean).sort((a,b)=>(b.available?1:0)-(a.available?1:0));
}

export async function purchaseDomain(domain) {
  if (!process.env.GODADDY_API_KEY) throw new Error("GODADDY_CREDENTIALS_NOT_CONFIGURED");
  const contact = { firstName:"Atlas", lastName:"Media", email:process.env.FOUNDER_EMAIL||"admin@atlasmedia.ltd", phone:"+54.1100000000", addressMailing:{ address1:"Buenos Aires", city:"Buenos Aires", state:"Buenos Aires", postalCode:"1000", country:"AR" } };
  const body = { domain, period:1, autoRenew:true, privacy:false, consent:{ agreedAt:new Date().toISOString(), agreedBy:"127.0.0.1", agreementKeys:["DNRA"] }, contactAdmin:contact, contactBilling:contact, contactRegistrant:contact, contactTech:contact };
  const res = await fetch(GODADDY_API_URL + "/domains/purchase", { method:"POST", headers:godaddyHeaders(), body:JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Purchase failed: " + res.status);
  return { ok:true, domain, orderId:data.orderId };
}

export async function configureDnsForVercel(domain) {
  if (!process.env.GODADDY_API_KEY) throw new Error("GODADDY_CREDENTIALS_NOT_CONFIGURED");
  const isApex = domain.split(".").length === 3;
  const records = isApex
    ? [{ type:"A", name:"@", data:"76.76.21.21", ttl:600 }, { type:"CNAME", name:"www", data:"cname.vercel-dns.com.", ttl:600 }]
    : [{ type:"CNAME", name:"@", data:"cname.vercel-dns.com.", ttl:600 }];
  const res = await fetch(GODADDY_API_URL + "/domains/" + domain + "/records", { method:"PUT", headers:godaddyHeaders(), body:JSON.stringify(records) });
  if (!res.ok) { const data = await res.json().catch(()=>({})); throw new Error(data.message || "DNS config failed: " + res.status); }
  return { ok:true, domain, records };
}

export async function addDomainToVercel(domain) {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) throw new Error("VERCEL_CREDENTIALS_NOT_CONFIGURED");
  const res = await fetch(VERCEL_API_URL + "/v10/projects/" + process.env.VERCEL_PROJECT_ID + "/domains", { method:"POST", headers:vercelHeaders(), body:JSON.stringify({ name:domain }) });
  const data = await res.json();
  if (!res.ok && data.error?.code !== "domain_already_in_use") throw new Error(data.error?.message || "Vercel domain add failed: " + res.status);
  return { ok:true, domain, vercelDomain:data };
}

export async function checkVercelDomainStatus(domain) {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) return { verified:false, error:"VERCEL_CREDENTIALS_NOT_CONFIGURED" };
  try {
    const res = await fetch(VERCEL_API_URL + "/v10/projects/" + process.env.VERCEL_PROJECT_ID + "/domains/" + domain, { headers:vercelHeaders() });
    const data = await res.json();
    return { verified:data.verified===true, configured:data.misconfigured===false, domain };
  } catch (err) { return { verified:false, error:err.message }; }
}

export async function automateNewDomain(publicationName, territory, scope) {
  const log = [];
  try {
    log.push("Buscando dominios disponibles...");
    const suggestions = await suggestDomains(publicationName, territory, scope);
    const bestDomain = suggestions.find(d => d.available);
    if (!bestDomain) return { ok:false, error:"No hay dominios disponibles para "+publicationName, suggestions, log };
    log.push("Dominio seleccionado: "+bestDomain.domain+" (USD "+bestDomain.price+"/anio)");
    log.push("Comprando dominio en GoDaddy...");
    await purchaseDomain(bestDomain.domain);
    log.push("Dominio comprado OK");
    await new Promise(r => setTimeout(r, 5000));
    log.push("Configurando DNS...");
    await configureDnsForVercel(bestDomain.domain);
    log.push("DNS configurado OK");
    log.push("Agregando dominio a Vercel...");
    await addDomainToVercel(bestDomain.domain);
    log.push("Dominio agregado a Vercel OK");
    log.push("Completado. DNS puede tardar hasta 48hs en propagarse.");
    return { ok:true, domain:bestDomain.domain, price:bestDomain.price, log };
  } catch (err) {
    log.push("Error: "+err.message);
    return { ok:false, error:err.message, log };
  }
}
