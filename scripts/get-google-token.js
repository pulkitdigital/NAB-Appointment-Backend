// Backend/scripts/get-google-token.js
// Run this to get GOOGLE_REFRESH_TOKEN for your .env file

import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔑 Google OAuth Token Generator
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create/Select project
 * 3. Enable Google Calendar API
 * 4. Create OAuth 2.0 credentials
 * 5. Add redirect URI: http://localhost:5173/oauth2callback
 * 6. Copy CLIENT_ID and CLIENT_SECRET to .env
 * 7. Run: node scripts/get-google-token.js
 */

// Get from .env or set manually here
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/oauth2callback';

// Check if credentials are set
if (!CLIENT_ID || CLIENT_ID.includes('YOUR_CLIENT_ID')) {
  console.error('\n❌ ERROR: Google OAuth credentials not found!');
  console.log('\n📋 SETUP STEPS:');
  console.log('1. Go to: https://console.cloud.google.com/');
  console.log('2. Enable Google Calendar API');
  console.log('3. Create OAuth 2.0 Client ID');
  console.log('4. Add this to .env:');
  console.log('   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com');
  console.log('   GOOGLE_CLIENT_SECRET=your-client-secret');
  console.log('   GOOGLE_REDIRECT_URI=http://localhost:5173/oauth2callback\n');
  process.exit(1);
}

// Scopes needed for Google Meet
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
];

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Important: gets refresh token
  scope: SCOPES,
  prompt: 'consent', // Forces refresh token even if already authorized
});

console.log('\n' + '='.repeat(70));
console.log('🔐 Google OAuth Setup - NAB Consultancy');
console.log('='.repeat(70) + '\n');

console.log('✅ Credentials loaded:');
console.log('   Client ID:', CLIENT_ID.substring(0, 20) + '...');
console.log('   Redirect URI:', REDIRECT_URI);
console.log('\n');

console.log('📋 STEP 1: Visit this URL in your browser:\n');
console.log('🔗 ' + authUrl);
console.log('\n');

console.log('📋 STEP 2: Sign in with your Google account (the one with calendar access)');
console.log('📋 STEP 3: Grant permissions to access Calendar');
console.log('📋 STEP 4: You will be redirected to a URL like:');
console.log('           http://localhost:5173/oauth2callback?code=4/xxxxx&scope=...');
console.log('📋 STEP 5: Copy ONLY the code parameter value');
console.log('           (everything between "code=" and "&scope")');
console.log('\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('📝 Paste the authorization code here: ', async (code) => {
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code.trim());
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS! Tokens received');
    console.log('='.repeat(70) + '\n');
    
    if (!tokens.refresh_token) {
      console.log('⚠️  WARNING: No refresh_token received!');
      console.log('   This happens if you already authorized this app before.');
      console.log('\n   TO FIX:');
      console.log('   1. Go to: https://myaccount.google.com/permissions');
      console.log('   2. Find "NAB Consultancy" or your app name');
      console.log('   3. Remove access');
      console.log('   4. Run this script again');
      console.log('   5. Make sure to grant all permissions\n');
    } else {
      console.log('📋 Add these lines to your Backend/.env file:\n');
      console.log('GOOGLE_CLIENT_ID=' + CLIENT_ID);
      console.log('GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET);
      console.log('GOOGLE_REDIRECT_URI=' + REDIRECT_URI);
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('\n✅ All set! Copy the lines above to .env and restart your server.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error getting tokens:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 The authorization code expired or is invalid.');
      console.log('   Please run the script again and use a fresh code.\n');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify CLIENT_ID and CLIENT_SECRET are correct');
      console.log('   - Make sure you copied the FULL authorization code');
      console.log('   - Check that redirect URI matches Google Console: ' + REDIRECT_URI);
      console.log('   - Try removing the app from: https://myaccount.google.com/permissions\n');
    }
  } finally {
    rl.close();
  }
});