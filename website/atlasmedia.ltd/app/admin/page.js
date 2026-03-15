import { revalidatePath } from "next/cache";
import { atlasPublications, getJournalistsByPublication } from "../../lib/atlas-config";

async function publishArticle(formData) {
  "use server";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const publication = String(formData.get("publication") || "");

  const content = String(formData.get("content") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = {
    publication,
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    category: String(formData.get("category") || ""),
    authorId: String(formData.get("authorId") || ""),
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

export default function AdminPage({ searchParams }) {
  const selectedPublication = searchParams?.publication || "";
  const availableJournalists = selectedPublication
    ? getJournalistsByPublication(selectedPublication)
    : [];

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", color: "#e5e7eb" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Atlas Admin</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Publish a new article into the editorial pilot using AI newsroom authors.
      </p>

      <form method="GET" style={{ display: "grid", gap: 12, marginBottom: 28 }}>
        <label style={labelStyle}>1. Select publication</label>
        <select
          name="publication"
          defaultValue={selectedPublication}
          required
          style={fieldStyle}
          onChange="this.form.submit()"
        >
          <option value="">Select publication</option>
          {atlasPublications.map((publication) => (
            <option key={publication.id} value={publication.id}>
              {publication.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            ...buttonStyle,
            width: "fit-content"
          }}
        >
          Load journalists
        </button>
      </form>

      <form action={publishArticle} style={{ display: "grid", gap: 16 }}>
        <input type="hidden" name="publication" value={selectedPublication} />

        <div>
          <label style={labelStyle}>2. Journalist</label>
          <select name="authorId" required style={fieldStyle} disabled={!selectedPublication}>
            <option value="">
              {selectedPublication ? "Select journalist" : "Choose a publication first"}
            </option>
            {availableJournalists.map((journalist) => (
              <option key={journalist.id} value={journalist.id}>
                {journalist.name} — {journalist.role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>3. Title</label>
          <input name="title" placeholder="Title" required style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>4. Slug</label>
          <input name="slug" placeholder="Slug (optional)" style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>5. Excerpt</label>
          <input name="excerpt" placeholder="Excerpt" required style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>6. Category</label>
          <input name="category" placeholder="Category" required style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>7. Content</label>
          <textarea
            name="content"
            placeholder="One paragraph per line"
            required
            rows={10}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </div>

        <button
          type="submit"
          disabled={!selectedPublication}
          style={{
            ...buttonStyle,
            opacity: selectedPublication ? 1 : 0.55,
            cursor: selectedPublication ? "pointer" : "not-allowed"
          }}
        >
          Publish article
        </button>
      </form>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  opacity: 0.8
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  font: "inherit"
};

const buttonStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff"
};
