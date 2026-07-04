const SPOTIFY_CLIENT_ID = '0b0dd397bce54d04af1df5bcada7904e';
const SPOTIFY_CLIENT_SECRET = '1d9bf0292c544e01a0b3d68097ca031d';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

async function testSpotify() {
  const creds = Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64');
  try {
    const resp = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + creds,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    console.log('Status:', resp.status);
    const text = await resp.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}

testSpotify();
