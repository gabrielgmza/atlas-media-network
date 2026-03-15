import { revalidatePath } from "next/cache";

async function publishArticle(formData) {
  "use server";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const content = String(formData.get("content") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = {
    publication: String(formData.get("publication") || ""),
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    category: String(formData.get("category") || ""),
    author: String(formData.get("author") || ""),
    content
  };

  const response = await fetch(`${baseUrl}/api/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-admin-token": process.env.ATLAS_ADMIN_TOKEN || ""
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("FAILED_TO_PUBLISH_ARTICLE");
  }

  revalidatePath("/");
  revalidatePath("/argentina-post");
  revalidatePath("/argentina-post-mendoza");
}

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", color: "#e5e7eb" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Atlas Admin</h1>
      <p style={{ opacity: 0.8, marginBottom: 32 }}>
        Publish a new article into the editorial pilot.
      </p>

      <form action={publishArticle} style={{ display: "grid", gap: 16 }}>
        <select name="publication" required style={fieldStyle}>
          <option value="">Select publication</option>
          <option value="argentina-post">Argentina Post</option>
          <option value="argentina-post-mendoza">Argentina Post Mendoza</option>
        </select>

        <input name="title" placeholder="Title" required style={fieldStyle} />
        <input name="slug" placeholder="Slug (optional)" style={fieldStyle} />
        <input name="excerpt" placeholder="Excerpt" required style={fieldStyle} />
        <input name="category" placeholder="Category" required style={fieldStyle} />
        <input name="author" placeholder="Author" required style={fieldStyle} />
        <textarea
          name="content"
          placeholder="One paragraph per line"
          required
          rows={10}
          style={{ ...fieldStyle, resize: "vertical" }}
        />

        <button
          type="submit"
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Publish article
        </button>
      </form>
    </main>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  font: "inherit"
};
