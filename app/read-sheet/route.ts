import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

async function readSheetData() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!email || !privateKey || !spreadsheetId) {
    throw new Error("Missing Google Sheets environment variables.");
  }

const auth = new google.auth.JWT(
    email,
    undefined,
    privateKey.split(String.raw`\n`).join('\n'), // <--- Try this new line
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  // Read all data from Sheet1!A:F
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:F",
  });

  // The rows will be an array of arrays, where each inner array is a row:
  // [ 'Text', 'Created At', 'System Time', 'Item Type', 'Time Bucket', 'Category' ]
  const rows = response.data.values;
  
  // Remove the header row
  if (rows && rows.length > 0) {
    return rows.slice(1).map(row => ({
      text: row[0] ?? '',
      itemType: row[3] ?? '',
      timeBucket: row[4] ?? '',
      category: row[5] ?? '',
    }));
  }
  return [];
}

export async function GET() {
  try {
    const data = await readSheetData();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch sheet data." },
      { status: 500 }
    );
  }
}
