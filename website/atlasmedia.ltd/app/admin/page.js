import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { atlasPublications, getJournalistsByPublication, getJournalistById } from "../../lib/atlas-config";
import { createArticle } from "../../lib/articles";

export const dynamic = "force-dynamic";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeId(publication) {
  const prefix = publication === "argentina-post-mendoza" ? "apm" : "ap";
  return `${prefix}-${Date.now()}`;
}

function getPublicationName(publicationId) {
  return atlasPublications.find((p) => p.id === publicationId)?.name || publicationId;
}

async function publishArticle(formData) {
  "use server";

  const publication = String(formData.get("publication") || "").trim();
  const authorId = String(formData.get("authorId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const section = String(formData.get("section") || "").trim();
  const status = String(formData.get("status") || "published").trim();
  const seoTitle = String(formData.get("seoTitle") || "").trim();
  const seoDescription = String(formData.get("seoDescription") || "").trim();

  const content = String(formData.get("content") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!publication || !authorId || !title || !excerpt || !category || !section || content.length === 0) {
    redirect(`/admin?publication=${publication}&error=missing-fields`);
  }

  const journalist = getJournalistById(authorId);

  if (!journalist) {
    redirect(`/admin?publication=${publication}&error=invalid-author`);
  }

  try {
    await createArticle({
      id: makeId(publication),
      slug: slug ? slugify(slug) : slugify(title),
      publication,
      publicationName: getPublicationName(publication),
      title,
      excerpt,
      category,
      section,
      author: journalist.signature,
      authorId: journalist.id,
      authorRole: journalist.role,
      tone: journalist.tone,
      status,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      publishedAt: new Date().toISOString(),
      content
    });
  } catch (error) {
    const message = String(error?.message || "");

    if (
      message.includes("duplicate key") ||
      message.includes("articles_slug_key") ||
      message.includes("unique")
    ) {
      redirect(`/admin?publication=${publication}&error=duplicate-slug`);
    }

    redirect(`/admin?publication=${publication}&error=publish-failed`);
  }

  revalidatePath("/");
  revalidatePath("/argentina-post");
  revalidatePath("/argentina-post-mendoza");
  revalidatePath("/api/articles");

  redirect(`/admin?publication=${publication}&success=1`);
}

export default function AdminPage({ searchParams }) {
  const selectedPublication =
    typeof searchParams?.publication === "string" ? searchParams.publication : "";

  const success = searchParams?.success === "1";
  const error =
    typeof searchParams?.error === "string" ? searchParams.error : "";

  const availableJournalists = selectedPublication
    ? getJournalistsByPublication(selectedPublication)
    : [];

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", color: "#e5e7eb" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Atlas Admin</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Publish a new article into the editorial pilot using the structured editorial model.
      </p>

      {success ? <div style={successStyle}>Article published successfully.</div> : null}

      {error ? (
        <div style={errorStyle}>
          {error === "missing-fields" && "Please complete all required fields."}
          {error === "invalid-author" && "Selected journalist is invalid."}
          {error === "duplicate-slug" && "A note with that slug already exists. Change the title or slug and try again."}
          {error === "publish-failed" && "An error occurred while publishing."}
          {!["missing-fields", "invalid-author", "duplicate-slug", "publish-failed"].includes(error) &&
            "An error occurred while publishing."}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        {atlasPublications.map((publication) => (
          <a
            key={publication.id}
            href={`/admin?publication=${publication.id}`}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 12,
              textDecoration: "none",
              color: "#fff",
              background:
                selectedPublication === publication.id
                  ? "rgba(147,197,253,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)"
            }}
          >
            {publication.name}
          </a>
        ))}
      </div>

      <form action={publishArticle} style={{ display: "grid", gap: 16 }}>
        <input type="hidden" name="publication" value={selectedPublication} />

        <div>
          <label style={labelStyle}>Publication</label>
          <input
            value={
              atlasPublications.find((p) => p.id === selectedPublication)?.name || "Select a publication above"
            }
            readOnly
            style={{ ...fieldStyle, opacity: 0.8 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Journalist</label>
          <select name="authorId" required style={fieldStyle} disabled={!selectedPublication} defaultValue="">
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
          <label style={labelStyle}>Title</label>
          <input name="title" placeholder="Title" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Slug</label>
          <input name="slug" placeholder="Slug (optional)" style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Excerpt</label>
          <input name="excerpt" placeholder="Excerpt" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <input name="category" placeholder="Category" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Section</label>
          <input name="section" placeholder="Section" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select name="status" defaultValue="published" style={fieldStyle} disabled={!selectedPublication}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>SEO title</label>
          <input name="seoTitle" placeholder="SEO title (optional)" style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>SEO description</label>
          <input
            name="seoDescription"
            placeholder="SEO description (optional)"
            style={fieldStyle}
            disabled={!selectedPublication}
          />
        </div>

        <div>
          <label style={labelStyle}>Content</label>
          <textarea
            name="content"
            placeholder="One paragraph per line"
            required
            rows={10}
            style={{ ...fieldStyle, resize: "vertical" }}
            disabled={!selectedPublication}
          />
        </div>

        <button
          type="submit"
          disabled={!selectedPublication}
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
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

const successStyle = {
  marginBottom: 20,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(34,197,94,0.35)",
  background: "rgba(34,197,94,0.12)",
  color: "#dcfce7"
};

const errorStyle = {
  marginBottom: 20,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.12)",
  color: "#fecaca"
};
