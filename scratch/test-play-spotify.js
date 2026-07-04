const fs = require('fs');
const path = require('path');

// Mock require dependencies
const YOUTUBE_COOKIE_FILE = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Mineradio', '.youtube-cookies');

function findYtdlpPath() {
  return 'c:\\Users\\Admin\\Downloads\\yt-dlp.exe'; // Use this absolute path from the previous test
}

function getYtdlpCookieArgs() {
  if (fs.existsSync(YOUTUBE_COOKIE_FILE)) {
    return ['--cookies', YOUTUBE_COOKIE_FILE];
  }
  return [];
}

const { execFile } = require('child_process');

async function ytdlpGetAudioUrl(videoId) {
  const ytUrl = 'https://www.youtube.com/watch?v=' + videoId;
  const cookieArgs = getYtdlpCookieArgs();
  const ytdlpPath = findYtdlpPath();
  return new Promise((resolve) => {
    const args = [
      ...cookieArgs,
      '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
      '--get-url',
      '--no-playlist',
      '--no-warnings',
      '--extractor-retries', '2',
      ytUrl,
    ];
    execFile(ytdlpPath, args, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) {
        console.warn('[yt-dlp] error:', err.message || err);
        resolve(null);
        return;
      }
      const url = (stdout || '').trim().split('\n')[0];
      resolve(url || null);
    });
  });
}

// Load server.js mock or directly require youtubeSearch
const server = require('../server.js');

async function testPlaySpotify() {
  console.log('Testing handleYouTubeAudioUrl...');
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/song/url?id=4TyQKEifYDWTfTSRwpxlYI&name=${encodeURIComponent('Bông Hoa Đẹp Nhất')}&artist=${encodeURIComponent('Quân A.P')}`);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Start server first
const http = require('http');
setTimeout(async () => {
  await testPlaySpotify();
  process.exit(0);
}, 2000);
