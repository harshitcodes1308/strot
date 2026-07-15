import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session.userId;
    
    // In a real app we'd get workspaceId from session or body. Let's assume we get it from body.
    const body = await req.json();
    const { query, location, limit, workspaceId } = body;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const searchLimit = Math.min(limit || 25, 25);

    // Create a run record
    const run = await db.scraperRun.create({
      data: {
        workspaceId,
        userId,
        source: "google_places_v2",
        query: location ? `${query} in ${location}` : query,
        status: "pending",
      },
    });

    // Send to Inngest to process in background
    await inngest.send({
      name: "scraper/v2.search",
      data: {
        runId: run.id,
        query,
        location,
        limit: searchLimit,
        workspaceId,
        userId
      },
    });

    return NextResponse.json({ 
      success: true, 
      runId: run.id,
      message: `Started V2 search for ${query} with limit ${searchLimit}`
    });
  } catch (error: any) {
    console.error("[V2 Search API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
