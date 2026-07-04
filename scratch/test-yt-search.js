const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = 3000;
const YOUTUBE_COOKIE_FILE = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Mineradio', '.youtube-cookies');

function findYtdlpPath() {
  const possiblePaths = [
    path.join(__dirname, '..', 'desktop', 'yt-dlp.exe'),
    path.join(__dirname, '..', 'yt-dlp.exe'),
    'c:\\Users\\Admin\\Downloads\\yt-dlp.exe',
    'yt-dlp',
  ];
  for (const p of possiblePaths) {
    if (p === 'yt-dlp') {
      try {
        const { execSync } = require('child_process');
        execSync('yt-dlp --version', { stdio: 'ignore', timeout: 2000 });
        return 'yt-dlp';
      } catch (e) {}
    } else {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }
  return 'yt-dlp';
}

function getYtdlpCookieArgs() {
  const cookieFile = process.env.YOUTUBE_COOKIE_FILE || YOUTUBE_COOKIE_FILE;
  if (cookieFile && fs.existsSync(cookieFile)) {
    return ['--cookies', cookieFile];
  }
  return [];
}

async function ytdlpSearch(query, maxResults) {
  maxResults = Math.max(1, Math.min(20, maxResults || 5));
  const ytdlpPath = findYtdlpPath();
  const searchArg = `ytsearch${maxResults}:${query}`;
  const cookieArgs = getYtdlpCookieArgs();
  
  console.log('ytdlpPath:', ytdlpPath);
  console.log('cookieArgs:', cookieArgs);
  console.log('Search query:', query);

  return new Promise((resolve) => {
    const args = [
      ...cookieArgs,
      searchArg,
      '--flat-playlist',
      '--dump-single-json',
      '--no-warnings',
    ];
    console.log('Running:', ytdlpPath, args.join(' '));
    execFile(ytdlpPath, args, { timeout: 25000 }, (err, stdout, stderr) => {
      if (err) {
        console.warn('[ytdlpSearch] error:', err.message || err);
        console.warn('stderr:', stderr);
        resolve([]);
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const entries = data.entries || [];
        const results = entries.map(item => {
          if (!item || !item.id) return null;
          let thumbnail = '';
          if (item.thumbnails && item.thumbnails.length > 0) {
            thumbnail = item.thumbnails[item.thumbnails.length - 1].url || '';
          } else {
            thumbnail = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
          }
          return {
            videoId: item.id,
            title: item.title || '',
            channelTitle: item.uploader || item.channel || '',
            thumbnail: thumbnail,
          };
        }).filter(Boolean);
        resolve(results);
      } catch (e) {
        console.warn('[ytdlpSearch] parsing JSON error:', e);
        resolve([]);
      }
    });
  });
}

(async () => {
  const query = 'phong da bang';
  const results = await ytdlpSearch(query, 5);
  console.log('Results:', JSON.stringify(results, null, 2));
})();
