import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

type AnalysisResult = {
  item_type: string;
  time_bucket: string;
  category: string; // <--- NOW IT EXPECTS A SINGLE WORD
};

async function analyzeWithGemini(text: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY set.");
    return {
      item_type: "idea",
      time_bucket: "none",
      category: "no_api_key",
    };
  }

const prompt = `
You are a highly-accurate data extraction and classification agent.
The current date and time in the user's timezone (EST) is: ${new Date().toISOString()}. Use this as the reference point for all relative date/time calculations (e.g., "today", "tomorrow", "5p").
**NEVER include any introductory text, commentary, or markdown (like \`\`\`) outside of the final JSON object.**

### YOUR JOB
Given ONE short user note, you must classify it into a single JSON object.

### ITEM TYPE (CHOOSE ONE ONLY)
- "task"           = A discrete action or to-do item that may or may not have a date but never a specific time (e.g., "call the doctor").
- "event"          = A fixed appointment or scheduled happening (e.g., "meeting at 10am").
- "idea"           = Brainstorming, a concept, or optional future project. Ideas do NOT have specific time/day constraints.
- "education"      = Learning material, research, or notes taken in a meeting, class, video, book, or event.
- "important_info" = Facts, account numbers, or information to be stored (e.g., "password hint").

### TIME BUCKET (CHOOSE ONE ONLY)
**The value for "time_bucket" must be EITHER a specific date/time string OR a time range category.**

1.  **SPECIFIC DATE/TIME:** If the note contains a specific time or date (e.g., "5p today", "next Monday at 10am"), you MUST convert it to a full **ISO 8601 date/time string** (example: "2025-12-07T17:00:00-05:00"). Use the current date provided above as the reference, and use context clues to determine AM/PM (e.g., "5p" = 17:00).
2.  **TIME RANGE CATEGORY:** If no specific time is found, use one of the following:
    - "today"       = Clearly meant for today.
    - "this_week"   = Clearly for this week, but not today (e.g., "tomorrow").
    - "upcoming"    = Clearly in the future but not this week.
3. Only choose a time bucket for Tasks and Events.

### CATEGORY (CHOOSE ONE ONLY)
**"category" MUST be one and only one single-word, lowercase tag.**
Choose the single best fit from this final list:
["personal", "work", "creative", "social_marketing", "health", "money", "food", "home", "travel", "learning", "admin", "wishlist"]

### OUTPUT FORMAT (IMPORTANT)
Return ONLY valid JSON.

{
  "item_type": "string",
  "time_bucket": "string", // EITHER ISO 8601 or a time range (e.g., "today")
  "category": "string"    // Only one tag
}

### EXAMPLES
Note: Call Sarah to wish her happy birthday
JSON:
{
  "item_type": "task",
  "time_bucket": "today",
  "category": "personal"
}

Note: Send finalized client proposal to Johnson Corp by 4p tomorrow
JSON:
{
  "item_type": "task",
  "time_bucket": "2025-12-08T16:00:00-05:00",
  "category": "work"
}

Note: Sketch new character design concept
JSON:
{
  "item_type": "task",
  "time_bucket": "upcoming",
  "category": "creative"
}

Note: Schedule three posts for next week's campaign
JSON:
{
  "item_type": "task",
  "time_bucket": "this_week",
  "category": "social_marketing"
}

Note: Gym session at 6am on Wednesday
JSON:
{
  "item_type": "event",
  "time_bucket": "2025-12-10T06:00:00-05:00",
  "category": "health"
}

Note: Check bank account for wire transfer
JSON:
{
  "item_type": "task",
  "time_bucket": "this_week",
  "category": "money"
}

Note: Need to buy chicken, eggs, and milk
JSON:
{
  "item_type": "task",
  "time_bucket": "this_week",
  "category": "food"
}

Note: Research cost of new roofing shingles
JSON:
{
  "item_type": "task",
  "time_bucket": "upcoming",
  "category": "home"
}

Note: Look up flights for the June trip to Denver
JSON:
{
  "item_type": "task",
  "time_bucket": "this_week",
  "category": "travel"
}

Note: Watch the video on async Javascript functions
JSON:
{
  "item_type": "education",
  "time_bucket": "none",
  "category": "learning"
}

Note: My new software license key is SFTW-345-XQ58
JSON:
{
  "item_type": "important_info",
  "time_bucket": "",
  "category": "admin"
}

Note: I want a new electric toothbrush for Christmas
JSON:
{
  "item_type": "idea",
  "time_bucket": "",
  "category": "wishlist"
}

Note: Date Idea go to starbucks with Kathleen
JSON:
{
  "item_type": "idea",
  "time_bucket": "",
  "category": "personal"
}

Note: ${text}
JSON:
`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
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

  // --- NEW CLEANUP CODE ---
  const cleanedText = rawText.replace(/```json|```/g, '').trim();
  // --- END NEW CLEANUP CODE ---

  try {
    const parsed = JSON.parse(cleanedText);
    const item_type = parsed.item_type ?? "idea";
    const time_bucket = parsed.time_bucket ?? "none";
const category = parsed.category ?? "none"; // <<--- Grabs the single word as a string
    return { item_type, time_bucket, category };
    
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", rawText);
    return {
      item_type: "idea",
      time_bucket: "none",
      category: ["parse_error"],
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
    analysis.category, // <--- Just use the string directly
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
