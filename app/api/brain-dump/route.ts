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
    console.error("No GEMINI_API_KEY set.");
    return {
      item_type: "idea",
      time_bucket: "none",
      categories: ["no_api_key"],
    };
  }

  const prompt = `
You classify short personal "brain dump" notes into STRUCTURED JSON.

### YOUR JOB
Given ONE short note, you must decide:

1) "item_type" (what kind of thing it is)
2) "time_bucket" (when it seems to belong)
3) "categories" (1–3 simple tags)

### ITEM TYPE (CHOOSE ONE ONLY)
- "task"           = something the user should do
- "event"          = something happening at a specific time or place
- "idea"           = brainstorm, optional future thing, not clearly scheduled
- "education"      = notes, learning material
- "important_info" = facts or info they want to remember

If the note contains a clear time expression like "tomorrow", a clock time, a specific date, or "next week", it is usually a "task" or "event", NOT an "idea".

### TIME BUCKET (CHOOSE ONE ONLY)
- "today"      = clearly meant for today (e.g. "today", "tonight", "this afternoon")
- "this_week"  = clearly this week (e.g. "tomorrow", "later this week", "in a few days")
- "upcoming"   = clearly in the future but not specifically today/this week (e.g. any explicit future date farther out)
- "none"       = no timing info at all

### CATEGORIES (ALWAYS 1–3 TAGS)
Pick 1–3 single-word, lowercase tags from or similar to:
["personal", "work", "health", "money", "food", "home", "travel", "family", "clients", "learning", "admin"]

Choose at least one category. Never return an empty array.

### OUTPUT FORMAT (IMPORTANT)
Return ONLY valid JSON, no backticks, no markdown, no explanation.

{
  "item_type": "task" | "event" | "idea" | "education" | "important_info",
  "time_bucket": "today" | "this_week" | "upcoming" | "none",
  "categories": ["tag1", "tag2"]
}

Now classify this note:

"""${text}"""
`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

// --- NEW CODE BLOCK ---
  if (!res.ok) {
    const errText = await res.text();
    // 🚨 NEW LINE 1: This logs the secret error number (like 403 or 429)
    console.error("Gemini API FAILED. Status:", res.status, "Body:", errText); 
    
    // 🚨 NEW LINE 2: This makes the app crash, forcing Vercel to log the error.
    throw new Error(`Gemini API call failed with status ${res.status}.`);
  }
// --- END NEW CODE BLOCK ---

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
      categories: ["parse_error"],
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
