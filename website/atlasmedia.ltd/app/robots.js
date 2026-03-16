const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/argentina-post", "/argentina-post-mendoza", "/noticias/"],
        disallow: ["/admin", "/api/", "/editorial", "/president", "/dashboard", "/expansion"]
      }
    ],
    sitemap: BASE_URL + "/sitemap.xml"
  };
}
