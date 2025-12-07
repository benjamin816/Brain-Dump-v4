// app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const REDIRECT_URI = 'https://brain-dump-v4-5zp37848s-benjamin-carvers-projects.vercel.app/api/auth/callback';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Authorization code not found.' }, { status: 400 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Missing Google OAuth secrets" }, { status: 500 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    // 1. Exchange the temporary code for permanent tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // 2. THIS IS THE KEY! The refresh token never expires.
    const REFRESH_TOKEN = tokens.refresh_token; 

    // 3. Return the token to the user so they can save it in Vercel
    if (REFRESH_TOKEN) {
      return NextResponse.json({
        message: "✅ Success! Calendar is connected.",
        action: "Please copy the REFRESH_TOKEN below and save it as GOOGLE_REFRESH_TOKEN in your Vercel Environment Variables.",
        refresh_token: REFRESH_TOKEN,
      });
    } else {
      // This happens if the user has connected before and we didn't ask for 'prompt: consent'
      return NextResponse.json({
        message: "⚠️ Token exchange succeeded, but no new Refresh Token was returned. If this is your first time, try clearing your browser cookies and reconnecting.",
      });
    }

  } catch (error: any) {
    console.error("Error exchanging code for token:", error);
    return NextResponse.json({ error: "Failed to exchange code for token.", details: error.message }, { status: 500 });
  }
}
