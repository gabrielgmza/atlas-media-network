import { getDb } from "./db.js";

export async function generateCampaignReport(campaign, metrics, publication) {
  const month = new Date().toLocaleDateString("es-AR",{month:"long",year:"numeric"});
  const ctr = metrics.impressions>0?((metrics.clicks/metrics.impressions)*100).toFixed(2):"0.00";
  const costPerClick = metrics.clicks>0?(campaign.monthly_price/metrics.clicks).toFixed(2):"N/A";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:700px;margin:0 auto;background:#fff}.header{background:#0b1020;color:#fff;padding:32px 40px}.header h1{margin:0 0 4px;font-size:24px}.header p{margin:0;opacity:.6;font-size:14px}.section{padding:28px 40px;border-bottom:1px solid #f0f0f0}.section h2{font-size:14px;color:#333;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px}.metrics{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}.metric{flex:1;min-width:120px;background:#f8f8f8;border-radius:10px;padding:16px;text-align:center}.metric .value{font-size:28px;font-weight:800;color:#0b1020}.metric .label{font-size:12px;color:#888;margin-top:4px}.metric.green .value{color:#1a6b3c}.metric.blue .value{color:#1a4a8a}table{width:100%;border-collapse:collapse;font-size:14px}th{background:#f0f0f0;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#666}td{padding:10px 12px;border-bottom:1px solid #f5f5f5}.footer{padding:20px 40px;font-size:12px;color:#999;text-align:center}.badge{display:inline-block;background:#22c55e18;color:#1a6b3c;border:1px solid #22c55e44;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:600}</style></head><body><div class="container"><div class="header"><h1>Reporte de campana</h1><p>${month} &middot; ${publication.name} &middot; ${campaign.slot_name||"Publicidad"}</p></div><div class="section"><h2>Resumen ejecutivo</h2><div class="metrics"><div class="metric"><div class="value">${Number(metrics.impressions||0).toLocaleString("es-AR")}</div><div class="label">Impresiones</div></div><div class="metric blue"><div class="value">${Number(metrics.clicks||0).toLocaleString("es-AR")}</div><div class="label">Clics</div></div><div class="metric green"><div class="value">${ctr}%</div><div class="label">CTR</div></div><div class="metric"><div class="value">USD ${campaign.monthly_price||0}</div><div class="label">Inversion mensual</div></div></div><p style="font-size:14px;color:#555;line-height:1.6">Su anuncio <strong>${campaign.ad_title||"en "+publication.name}</strong> genero <strong>${Number(metrics.impressions||0).toLocaleString("es-AR")} impresiones</strong> durante ${month}, con una tasa de clics del <strong>${ctr}%</strong>. ${parseFloat(ctr)>1?"Esto supera el promedio de la industria (0.5-1%).":"Recomendamos revisar el contenido del anuncio para mejorar el CTR."}</p></div><div class="section"><h2>Detalle de rendimiento</h2><table><thead><tr><th>Metrica</th><th>Valor</th><th>Referencia</th></tr></thead><tbody><tr><td>Impresiones totales</td><td>${Number(metrics.impressions||0).toLocaleString("es-AR")}</td><td>-</td></tr><tr><td>Clics unicos</td><td>${Number(metrics.clicks||0).toLocaleString("es-AR")}</td><td>-</td></tr><tr><td>CTR</td><td>${ctr}%</td><td>Promedio: 0.5-1%</td></tr><tr><td>Costo por clic</td><td>${costPerClick!=="N/A"?"USD "+costPerClick:"N/A"}</td><td>-</td></tr><tr><td>Inversion mensual</td><td>USD ${campaign.monthly_price||0}</td><td>-</td></tr><tr><td>Publicacion</td><td>${publication.name}</td><td>-</td></tr><tr><td>Estado</td><td><span class="badge">Activa</span></td><td>-</td></tr></tbody></table></div><div class="section"><h2>Proximos pasos</h2><ul style="font-size:14px;color:#555;line-height:1.8;padding-left:20px"><li>Su campana se renueva automaticamente el proximo mes.</li><li>Para actualizar su anuncio contacte a <a href="mailto:ventas@atlasmedia.ltd">ventas@atlasmedia.ltd</a>.</li></ul></div><div class="footer"><p>${publication.name} &middot; Atlas Media Network</p><p>© ${new Date().getFullYear()} Atlas Media Network &middot; <a href="mailto:ventas@atlasmedia.ltd">ventas@atlasmedia.ltd</a></p></div></div></body></html>`;
}

export async function getCampaignMetrics(campaignId, monthStart, monthEnd) {
  const db = getDb();
  const [imp,clicks] = await Promise.all([
    db.query(`SELECT COUNT(*) as total FROM public.ad_impressions WHERE campaign_id=$1 AND created_at BETWEEN $2 AND $3`,[campaignId,monthStart,monthEnd]).catch(()=>({rows:[{total:0}]})),
    db.query(`SELECT COUNT(*) as total FROM public.ad_clicks WHERE campaign_id=$1 AND created_at BETWEEN $2 AND $3`,[campaignId,monthStart,monthEnd]).catch(()=>({rows:[{total:0}]}))
  ]);
  return { impressions:parseInt(imp.rows[0]?.total||0), clicks:parseInt(clicks.rows[0]?.total||0), dailyData:[] };
}

export async function sendReportEmail(advertiser, htmlReport, month, publicationName) {
  if (!process.env.RESEND_API_KEY) return { ok:false, error:"RESEND_NOT_CONFIGURED" };
  const res = await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.RESEND_API_KEY},body:JSON.stringify({from:"Atlas Media <reportes@atlasmedia.ltd>",to:[advertiser.contact_email],bcc:[process.env.FOUNDER_EMAIL||""].filter(Boolean),subject:"Reporte de campana "+month+" - "+publicationName,html:htmlReport})});
  const data = await res.json();
  return { ok:res.ok, id:data.id, error:data.message };
}

export async function sendMonthlyReports() {
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(),now.getMonth()-1,1);
  const monthEnd = new Date(now.getFullYear(),now.getMonth(),0,23,59,59);
  const month = monthStart.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
  const campaigns = await db.query(`SELECT c.*,a.business_name,a.contact_email,s.name as slot_name,s.position as slot_position,p.name as publication_name,p.slug as publication_slug FROM public.ad_campaigns c LEFT JOIN public.advertisers a ON c.advertiser_id=a.id LEFT JOIN public.ad_slots s ON c.slot_id=s.id LEFT JOIN public.publications p ON c.publication_id=p.id WHERE c.status='active' AND a.contact_email IS NOT NULL`).catch(()=>({rows:[]}));
  const results = [];
  for (const c of campaigns.rows) {
    try {
      const metrics = await getCampaignMetrics(c.id,monthStart.toISOString(),monthEnd.toISOString());
      const html = await generateCampaignReport(c,metrics,{name:c.publication_name,slug:c.publication_slug});
      const email = await sendReportEmail({contact_email:c.contact_email},html,month,c.publication_name);
      results.push({campaignId:c.id,advertiser:c.business_name,emailSent:email.ok,error:email.error});
    } catch(err) { results.push({campaignId:c.id,error:err.message}); }
    await new Promise(r=>setTimeout(r,500));
  }
  return { ok:true, month, reportsGenerated:results.length, results };
}
