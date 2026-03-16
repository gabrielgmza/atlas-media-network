const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "Atlas Media Network", template: "%s | Atlas Media Network" },
  description: "Red de medios digitales automatizados. Argentina Post y mas publicaciones nacionales, provinciales y locales.",
  keywords: ["noticias", "argentina", "mendoza", "politica", "economia", "sociedad"],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: { type: "website", locale: "es_AR", url: BASE_URL, siteName: "Atlas Media Network" },
  twitter: { card: "summary_large_image", title: "Atlas Media Network" },
  alternates: { canonical: BASE_URL }
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Atlas Media Network",
  url: BASE_URL,
  inLanguage: "es-AR",
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: BASE_URL + "/buscar?q={search_term_string}" }, "query-input": "required name=search_term_string" }
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Atlas Media Network",
  url: BASE_URL,
  description: "Holding de medios digitales automatizados con IA editorial en Argentina."
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      </head>
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#0b1020", color: "#e5e7eb" }}>
        {children}
      </body>
    </html>
  );
}
