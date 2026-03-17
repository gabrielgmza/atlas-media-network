const STRIPE_API = "https://api.stripe.com/v1";

function stripeHeaders() { return { "Authorization":"Bearer "+process.env.STRIPE_SECRET_KEY, "Content-Type":"application/x-www-form-urlencoded" }; }

function encodeParams(obj, prefix="") {
  const parts=[];
  for (const [key,val] of Object.entries(obj)) {
    if (val===null||val===undefined) continue;
    const k=prefix?`${prefix}[${key}]`:key;
    if (typeof val==="object"&&!Array.isArray(val)) parts.push(encodeParams(val,k));
    else parts.push(encodeURIComponent(k)+"="+encodeURIComponent(val));
  }
  return parts.join("&");
}

export async function createCheckoutSession({advertiser,slot,months=1,successUrl,cancelUrl}) {
  const BASE_URL=process.env.NEXT_PUBLIC_SITE_URL||"https://atlas-media-network.vercel.app";
  const amount=Math.round(slot.base_price*100);
  const res=await fetch(STRIPE_API+"/checkout/sessions",{method:"POST",headers:stripeHeaders(),body:encodeParams({"mode":"subscription","line_items[0][price_data][currency]":"usd","line_items[0][price_data][product_data][name]":slot.name+" - "+slot.publication_name,"line_items[0][price_data][unit_amount]":amount,"line_items[0][price_data][recurring][interval]":"month","line_items[0][quantity]":1,"customer_email":advertiser.contact_email,"success_url":successUrl||BASE_URL+"/mediakit/success?session_id={CHECKOUT_SESSION_ID}","cancel_url":cancelUrl||BASE_URL+"/mediakit","metadata[advertiser_id]":advertiser.id,"metadata[slot_id]":slot.id,"metadata[publication_id]":slot.publication_id,"subscription_data[metadata][slot_id]":slot.id})});
  const data=await res.json();
  if (!res.ok) throw new Error(data.error?.message||"Checkout failed");
  return data;
}

export async function createPaymentLink({slot,advertiser}) {
  const amount=Math.round(slot.base_price*100);
  const priceRes=await fetch(STRIPE_API+"/prices",{method:"POST",headers:stripeHeaders(),body:encodeParams({"currency":"usd","unit_amount":amount,"recurring[interval]":"month","product_data[name]":slot.name+" - "+slot.publication_name,"product_data[metadata][slot_id]":slot.id})});
  const priceData=await priceRes.json();
  if (!priceRes.ok) throw new Error(priceData.error?.message||"Price creation failed");
  const linkRes=await fetch(STRIPE_API+"/payment_links",{method:"POST",headers:stripeHeaders(),body:encodeParams({"line_items[0][price]":priceData.id,"line_items[0][quantity]":1,"metadata[slot_id]":slot.id,"metadata[publication_id]":slot.publication_id,"after_completion[type]":"redirect","after_completion[redirect][url]":(process.env.NEXT_PUBLIC_SITE_URL||"https://atlas-media-network.vercel.app")+"/mediakit/success"})});
  const linkData=await linkRes.json();
  if (!linkRes.ok) throw new Error(linkData.error?.message||"Payment link failed");
  return linkData;
}

export async function cancelSubscription(subscriptionId) {
  const res=await fetch(STRIPE_API+"/subscriptions/"+subscriptionId,{method:"DELETE",headers:stripeHeaders()});
  const data=await res.json();
  if (!res.ok) throw new Error(data.error?.message||"Cancel failed");
  return data;
}

export async function getRevenueStats() {
  const monthStart=Math.floor(new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime()/1000);
  const [subs,charges]=await Promise.all([
    fetch(STRIPE_API+"/subscriptions?status=active&limit=100",{headers:stripeHeaders()}).then(r=>r.json()),
    fetch(STRIPE_API+"/charges?created[gte]="+monthStart+"&limit=100",{headers:stripeHeaders()}).then(r=>r.json())
  ]);
  const mrr=(subs.data||[]).reduce((sum,sub)=>sum+(sub.items?.data?.[0]?.price?.unit_amount||0)/100,0);
  const monthlyRevenue=(charges.data||[]).filter(c=>c.paid&&!c.refunded).reduce((sum,c)=>sum+c.amount/100,0);
  return {activeSubscriptions:subs.data?.length||0,mrr:mrr.toFixed(2),monthlyRevenue:monthlyRevenue.toFixed(2),currency:"USD"};
}
