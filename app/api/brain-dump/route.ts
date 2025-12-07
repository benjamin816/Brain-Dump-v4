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
    return {
      item_type: "idea",
      time_bucket: "none",
      categories: [],
    };
  }

  const prompt = `
You classify short notes into structured JSON fields.

### RULES ###
1. ALWAYS return valid JSON — no commentary.
2. ALWAYS choose an item_type.
3. ALWAYS choose a time_bucket IF there is any time cue.
4. ALWAYS assign at least one category.
5. If the text includes a date, time, "tomorrow", "next week", or similar → item_type=task or event.

### DEFINITIONS ###
task = something the person should do  
event = something at a specific date/time/location  
idea = brainstorming, optional action  
education = learning notes  
important_info = facts to remember

### TIME BUCKET RULES ###
If note says:
- "today", "this afternoon", "tonight" → time_bucket="today"
- "tomorrow", "next few days" → "this_week"
- Any specific time/date in future → "upcoming"
- No timing → "none"

### CATEGORIES ###
Pick 1–3 single-word tags:
["personal", "work", "health", "money", "food", "home", "travel", "family", "clients", "learning"]

### EXAMPLES ###
Example input: "Dentist appointment tomorrow at 3pm"
JSON output:
{
  "item_type": "event",
  "time_bucket": "this_week",
  "categories": ["health"]
}

Example input: "Finish editing Raleigh NC YouTube video tonight"
JSON output:
{
  "item_type": "task",
  "time_bucket": "today",
  "categories": ["work"]
}

Example input: "Eat a taco tomorrow at 4p"
JSON output:
{
  "item_type": "event",
  "time_bucket": "this_week",
  "categories": ["personal", "food"]
}

### NOW CLASSIFY THIS NOTE ###
${text}
`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
      apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
    return {
      item_type: parsed.item_type ?? "idea",
      time_bucket: parsed.time_bucket ?? "none",
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
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
    range: "Sheet1!A:F",
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const createdAt =
      typeof body.created_at === "string" ? body.created_at : null;

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Missing 'text'." },
        { status: 400 }
      );
    }

    const analysis = await analyzeWithGemini(text);

    await appendToSheet(text, createdAt, analysis);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in /api/brain-dump:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Brain dump endpoint is live.",
  });
}
