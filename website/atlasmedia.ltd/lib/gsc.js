const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SEARCH_CONSOLE_API = "https://searchconsole.googleapis.com/v1";

async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g,"\n");
  if (!email || !key) throw new Error("GOOGLE_SERVICE_ACCOUNT_NOT_CONFIGURED");
  const now = Math.floor(Date.now()/1000);
  const payload = { iss:email, scope:"https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/webmasters", aud:"https://oauth2.googleapis.com/token", exp:now+3600, iat:now };
  const b64 = s => btoa(JSON.stringify(s)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const unsigned = b64({alg:"RS256",typ:"JWT"})+"."+b64(payload);
  const pemKey = key.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s/g,"");
  const binaryKey = Uint8Array.from(atob(pemKey),c=>c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8",binaryKey.buffer,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5",cryptoKey,new TextEncoder().encode(unsigned));
  const jwt = unsigned+"."+btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get token: "+JSON.stringify(tokenData));
  return tokenData.access_token;
}

export async function notifyGoogleIndexing(url, type="URL_UPDATED") {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return { ok:false, error:"NOT_CONFIGURED", skipped:true };
  try {
    const token = await getGoogleAccessToken();
    const res = await fetch(INDEXING_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({url,type})});
    const data = await res.json();
    if (!res.ok) return { ok:false, error:data.error?.message||"Indexing API error", url };
    return { ok:true, url, notifiedAt:data.urlNotificationMetadata?.latestUpdate?.notifyTime };
  } catch (err) { return { ok:false, error:err.message, url }; }
}

export async function submitSitemap(siteUrl, sitemapUrl) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return { ok:false, skipped:true };
  try {
    const token = await getGoogleAccessToken();
    const res = await fetch(SEARCH_CONSOLE_API+"/sites/"+encodeURIComponent(siteUrl)+"/sitemaps/"+encodeURIComponent(sitemapUrl),{method:"PUT",headers:{"Authorization":"Bearer "+token}});
    return { ok:res.ok||res.status===204, sitemapUrl };
  } catch (err) { return { ok:false, error:err.message }; }
}

export async function verifySiteInSearchConsole(domain) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return { ok:false, skipped:true };
  try {
    const token = await getGoogleAccessToken();
    const siteUrl = "sc-domain:"+domain;
    const addRes = await fetch(SEARCH_CONSOLE_API+"/sites/"+encodeURIComponent(siteUrl),{method:"PUT",headers:{"Authorization":"Bearer "+token}});
    if (!addRes.ok && addRes.status!==409) { const d=await addRes.json().catch(()=>({})); return { ok:false, error:d.error?.message||"Failed: "+addRes.status }; }
    const tokenRes = await fetch(SEARCH_CONSOLE_API+"/sites/"+encodeURIComponent(siteUrl)+"/getVerificationToken",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({verificationMethod:"DNS_TXT"})});
    const tokenData = await tokenRes.json();
    return { ok:true, domain, siteUrl, verificationToken:tokenData.token, instruction:"Agregar TXT en GoDaddy para "+domain+": "+tokenData.token };
  } catch (err) { return { ok:false, error:err.message }; }
}

export async function addGscVerificationDns(domain, verificationToken) {
  if (!process.env.GODADDY_API_KEY) return { ok:false, skipped:true };
  try {
    const res = await fetch("https://api.godaddy.com/v1/domains/"+domain+"/records/TXT/@",{method:"PATCH",headers:{"Authorization":"sso-key "+process.env.GODADDY_API_KEY+":"+process.env.GODADDY_API_SECRET,"Content-Type":"application/json"},body:JSON.stringify([{data:verificationToken,ttl:600}])});
    return { ok:res.ok, domain, verificationToken };
  } catch (err) { return { ok:false, error:err.message }; }
}

export async function automateGscSetup(domain) {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL||"https://atlas-media-network.vercel.app";
  const log = [];
  try {
    log.push("Agregando sitio a Google Search Console...");
    const verifyResult = await verifySiteInSearchConsole(domain);
    if (!verifyResult.ok && !verifyResult.skipped) { log.push("Error: "+verifyResult.error); return { ok:false, error:verifyResult.error, log }; }
    if (verifyResult.verificationToken && process.env.GODADDY_API_KEY) {
      log.push("Agregando DNS TXT para verificacion...");
      await addGscVerificationDns(domain, verifyResult.verificationToken);
      log.push("DNS TXT agregado OK");
    }
    log.push("Enviando sitemap...");
    const sitemapResult = await submitSitemap("sc-domain:"+domain, BASE_URL+"/sitemap.xml");
    log.push(sitemapResult.ok ? "Sitemap enviado OK" : "Sitemap error: "+(sitemapResult.error||""));
    return { ok:true, domain, log };
  } catch (err) { log.push("Error: "+err.message); return { ok:false, error:err.message, log }; }
}

export async function batchNotifyIndexing(urls) {
  const results = [];
  for (const url of urls) {
    results.push(await notifyGoogleIndexing(url));
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}
