import { NextResponse } from "next/server";
import {
  atlasPresidentState,
  presidentDepartments,
  presidentTasks,
  getPresidentMemory,
  getPresidentDecisions
} from "../../../../lib/atlas-president";
import { getAllArticles, getPublishedArticles, getDraftArticles } from "../../../../lib/articles";

export async function GET() {
  const allArticles = await getAllArticles();
  const publishedArticles = await getPublishedArticles();
  const draftArticles = await getDraftArticles();
  const memory = await getPresidentMemory();
  const decisions = await getPresidentDecisions();

  return NextResponse.json({
    ok: true,
    system: atlasPresidentState,
    metrics: {
      totalArticles: allArticles.length,
      publishedArticles: publishedArticles.length,
      draftArticles: draftArticles.length
    },
    memory,
    decisions,
    departments: presidentDepartments,
    tasks: presidentTasks
  });
}
