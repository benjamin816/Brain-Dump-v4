// app/api/auth/google/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// The URL where Google will send the user back after sign-in:
const REDIRECT_URI = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/auth/callback` 
  : 'http://localhost:3000/api/auth/callback';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Missing Google OAuth secrets" }, { status: 500 });
  }

  // 1. Create the OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  // 2. Define the permissions (scopes) we need
  const scopes = [
    'https://www.googleapis.com/auth/calendar', // Manage calendar events
    'https://www.googleapis.com/auth/calendar.events', // Another specific event scope
    // We don't need user's email, so we skip 'profile' and 'email' for privacy
  ];

  // 3. Generate the authorization URL
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // IMPORTANT: We need this for a permanent Refresh Token
    scope: scopes,
    include_granted_scopes: true,
  });

  // 4. Redirect the user to the Google sign-in page
  return NextResponse.redirect(authorizationUrl);
}
