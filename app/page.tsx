import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Idea = {
  text: string;
  createdAt: string;
  receivedAt: string;
};

async function getIdeas(): Promise<Idea[]> {
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
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:C", // change Sheet1 if you renamed the tab
  });

  const rows = res.data.values ?? [];

  // Skip header row (first row)
  const dataRows = rows.slice(1);

  const ideas: Idea[] = dataRows
    .map((row) => {
      const [text, createdAt, receivedAt] = row;
      return {
        text: String(text ?? ""),
        createdAt: String(createdAt ?? ""),
        receivedAt: String(receivedAt ?? ""),
      };
    })
    // newest first (by receivedAt if present)
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

  return ideas;
}

export default async function HomePage() {
  let ideas: Idea[] = [];

  try {
    ideas = await getIdeas();
  } catch (e) {
    console.error("Error loading ideas:", e);
  }

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1rem" }}>
        Brain Dump Inbox
      </h1>

      {ideas.length === 0 ? (
        <p style={{ color: "#666" }}>
          No ideas yet. Use your Shortcut to dump your first one.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {ideas.map((idea, index) => (
            <li
              key={index}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                {idea.text}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>
                Created: {idea.createdAt || "n/a"}
                <br />
                Logged: {idea.receivedAt || "n/a"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
