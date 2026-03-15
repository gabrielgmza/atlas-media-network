import { NextResponse } from "next/server";
import {
  atlasPresidentState,
  presidentMemory,
  presidentDepartments,
  presidentTasks
} from "../../../../lib/atlas-president";
import { getAllArticles, getPublishedArticles, getDraftArticles } from "../../../../lib/articles";

export async function GET() {
  const allArticles = await getAllArticles();
  const publishedArticles = await getPublishedArticles();
  const draftArticles = await getDraftArticles();

  return NextResponse.json({
    ok: true,
    system: atlasPresidentState,
    metrics: {
      totalArticles: allArticles.length,
      publishedArticles: publishedArticles.length,
      draftArticles: draftArticles.length
    },
    memory: presidentMemory,
    departments: presidentDepartments,
    tasks: presidentTasks
  });
}
