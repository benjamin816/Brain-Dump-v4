import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

async function appendToSheet(text: string, createdAt: string | null) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!email || !privateKey || !spreadsheetId) {
    throw new Error("Missing Google Sheets environment variables.");
  }

  const auth = new google.auth.JWT(
    email,
    undefined,
    // if the key comes in with \n, this fixes it
    privateKey.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    text,
    createdAt ?? "",
    new Date().toISOString(),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    // if your tab is not named "Sheet1", change this to your tab name
    range: "Sheet1!A:C",
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}

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

    await appendToSheet(text, createdAt);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in /api/brain-dump:", error);
    return NextResponse.json(
      { ok: false, error: "Server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Brain dump endpoint is live.",
  });
}
