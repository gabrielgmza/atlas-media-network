export const articles = [
  {
    id: "ap-001",
    slug: "argentina-post-launches-national-pilot",
    publication: "argentina-post",
    title: "Argentina Post launches national pilot",
    excerpt: "Atlas Media Network activates the first national publication in its editorial pilot.",
    category: "business",
    author: "Sofia Morales",
    publishedAt: "2026-03-15T03:00:00.000Z",
    content: [
      "Argentina Post begins operations as the first national publication in the Atlas Media Network pilot.",
      "The project is designed to test editorial workflows, publication pipelines, and audience response under a scalable digital media infrastructure.",
      "This first release focuses on core sections, controlled publishing, and a technical base prepared for future newsroom automation."
    ]
  },
  {
    id: "apm-001",
    slug: "argentina-post-mendoza-opens-regional-edition",
    publication: "argentina-post-mendoza",
    title: "Argentina Post Mendoza opens regional edition",
    excerpt: "The Mendoza edition starts as the first provincial publication in the pilot phase.",
    category: "local",
    author: "Valentina Quiroga",
    publishedAt: "2026-03-15T03:05:00.000Z",
    content: [
      "Argentina Post Mendoza starts as the first provincial edition within the Atlas Media Network pilot.",
      "The objective is to validate regional coverage, editorial identity, and operational processes before expanding to new provinces.",
      "The edition will prioritize politics, society, business, tourism, and local economy."
    ]
  }
];

export function getAllArticles() {
  return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function getArticleById(id) {
  return articles.find((article) => article.id === id) || null;
}

export function getArticleBySlug(slug) {
  return articles.find((article) => article.slug === slug) || null;
}

export function getArticlesByPublication(publication) {
  return getAllArticles().filter((article) => article.publication === publication);
}
