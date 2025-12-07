import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

type AnalysisResult = {
  item_type: "task" | "event" | "idea" | "education" | "important_info";
  time_bucket: "today" | "this_week" | "upcoming" | "none";
  categories: string[];
};

async function analyzeWithGemini(text: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback if Gemini isn’t configured yet
    return {
      item_type: "idea",
      time_bucket: "none",
      categories: [],
    };
  }

  const prompt = `
You are helping organize personal "brain dump" notes.

Given the following note text, decide:

1) item_type: one of
   - "task" (something to do)
   - "event" (something happening at a specific time or place)
   - "idea" (brainstorm, thought, future possibility)
   - "education" (notes, learning material)
   - "important_info" (facts, reference info to remember)

2) time_bucket: one of
   - "today" (clearly meant for today)
   - "this_week" (within this week)
   - "upcoming" (future, but not clearly today or this week)
   - "none" (no clear timing)

3) categories: a short list of 1-4 topic tags (lowercase, single words) like:
   ["work", "clients", "health", "money", "home", "travel"]

Return ONLY valid JSON in this format and nothing else:

{
  "item_type": "task" | "event" | "idea" | "education" | "important_info",
  "time_bucket": "today" | "this_week" | "upcoming" | "none",
  "categories": ["tag1", "tag2"]
}

Note text:
"""${text}"""
`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
      apiKey,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    console.error("Gemini API error:", await res.text());
    return {
      item_type: "idea",
      time_bucket: "none",
      categories: [],
    };
  }

  const data = await res.json();

  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(rawText);
    const item_type = parsed.item_type ?? "idea";
    const time_bucket = parsed.time_bucket ?? "none";
    const categories: string[] = Array.isArray(parsed.categories)
      ? parsed.categories
      : [];

    return { item_type, time_bucket, categories };
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", rawText);
    return {
      item_type: "idea",
      time_bucket: "none",
      categories: [],
    };
  }
}

async function appendToSheet(
  text: string,
  createdAt: string | null,
  analysis: AnalysisResult
) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!email || !privateKey || !spreadsheetId) {
    throw new Error("Missing Google Sheets environment variables.");
  }

  const auth = new google.auth.JWT(
    email,
    undefined,
    privateKey.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    text,
    createdAt ?? "",
    new Date().toISOString(),
    analysis.item_type,
    analysis.time_bucket,
    analysis.categories.join(", "),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:F", // now writing 6 columns
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

    // Ask Gemini to analyze the note
    const analysis = await analyzeWithGemini(text);

    // Save to Google Sheet with AI columns
    await appendToSheet(text, createdAt, analysis);

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
