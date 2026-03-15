import { NextResponse } from "next/server";
import { newsroomRoster, getJournalistsByPublication } from "../../../../lib/atlas-config";

export async function GET(request) {
  const publication = request.nextUrl.searchParams.get("publication");

  const roster = publication
    ? getJournalistsByPublication(publication)
    : newsroomRoster;

  return NextResponse.json({
    ok: true,
    total: roster.length,
    roster
  });
}
