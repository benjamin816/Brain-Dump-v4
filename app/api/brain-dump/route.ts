import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const text =
      typeof body.text === "string" ? body.text.trim() : "";
    const createdAt =
      typeof body.created_at === "string" ? body.created_at : null;

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Missing 'text' in request body." },
        { status: 400 }
      );
    }

    console.log("New brain dump received:", {
      text,
      createdAt,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in /api/brain-dump:", error);
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }
}

// Simple health check for your own testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Brain dump endpoint is live.",
  });
}
