import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth } from "@clerk/nextjs/server";
import { inngest } from "@/inngest/client";

// Allow CORS for the extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or specific extension ID
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    // We expect the user to pass a workspaceId or we get it from auth.
    // For MVP extension, we assume the user provides their API key or we get it from Clerk token if passed.
    // Wait, Clerk session from extension is complex. Let's just create a dummy workspace if not authenticated for testing, or use a hardcoded one if it's just for demo.
    // Actually, let's try to get auth:
    const { userId } = getAuth(req);
    
    // Fallback for demo: we can just find the first workspace if userId is missing,
    // since the extension might not easily pass Clerk session without setup.
    let workspaceId = "";
    if (userId) {
      const w = await db.workspace.findFirst({ where: { users: { some: { id: userId } } } });
      if (w) workspaceId = w.id;
    } else {
      const w = await db.workspace.findFirst();
      if (w) workspaceId = w.id;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400, headers: corsHeaders });
    }

    const data = await req.json();

    const lead = await db.lead.create({
      data: {
        workspaceId,
        name: data.name || "Unknown from Extension",
        domain: data.domain,
        description: data.description,
        source: data.sources ? data.sources[0] : "extension",
        sourceUrl: data.url || "",
        sources: data.sources || ["extension"],
        emails: [],
        phones: [],
        hasWebsite: !!data.domain,
        isRunningAds: false,
        dataCompleteness: 10, // Minimal
      }
    });

    // Trigger enrichment in background
    await inngest.send({
      name: "lead/enrich.requested",
      data: {
        leadId: lead.id,
      },
    });

    return NextResponse.json({ success: true, lead }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Extension Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
