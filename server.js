// ====================================================================
//  Mineradio Server v3 — Spotify + YouTube
//  - Spotify Web API (search, metadata, playlists, artists)
//  - YouTube Data API v3 (video search for playback)
//  - lrclib.net (lyrics, free, no key needed)
//  - Tat ca UI se hien thi bang tieng Viet
// ====================================================================
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const crypto = require('crypto');
const tls   = require('tls');
const { once } = require('events');
const { fileURLToPath } = require('url');

// ---- Load .env file if exists ----
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let val = trimmed.slice(index + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('[Env] Failed to load .env file:', e.message);
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';


// ---- Spotify Config ----
const SPOTIFY_CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID     || '0b0dd397bce54d04af1df5bcada7904e';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '1d9bf0292c544e01a0b3d68097ca031d';
const SPOTIFY_REDIRECT_URI  = process.env.SPOTIFY_REDIRECT_URI  || '';
const SPOTIFY_TOKEN_URL     = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE      = 'https://api.spotify.com/v1';

// ---- YouTube Config ----
const YOUTUBE_API_KEY  = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ---- File paths ----
const SPOTIFY_TOKEN_FILE     = process.env.SPOTIFY_TOKEN_FILE     || path.join(__dirname, '.spotify-token');
const SPOTIFY_USER_TOKEN_FILE = process.env.SPOTIFY_USER_TOKEN_FILE || path.join(__dirname, '.spotify-user-token');
const UPDATE_WORK_DIR         = process.env.MINERADIO_UPDATE_DIR  || path.join(__dirname, 'updates');
const UPDATE_DOWNLOAD_DIR     = process.env.MINERADIO_UPDATE_DOWNLOAD_DIR || path.join(UPDATE_WORK_DIR, 'downloads');
const UPDATE_PATCH_BACKUP_DIR = process.env.MINERADIO_PATCH_BACKUP_DIR    || path.join(UPDATE_WORK_DIR, 'backups', 'patches');
const BEATMAP_CACHE_DIR       = process.env.MINERADIO_BEAT_CACHE_DIR      || 'D:\\MineradioCache\\beatmaps';
const YOUTUBE_COOKIE_FILE     = process.env.YOUTUBE_COOKIE_FILE || path.join(require('os').homedir(), 'AppData', 'Roaming', 'Mineradio', '.youtube-cookies');
const APP_PACKAGE  = readPackageInfo();
const APP_VERSION  = process.env.MINERADIO_VERSION || APP_PACKAGE.version || '1.2.0';
const UPDATE_CONFIG = readUpdateConfig(APP_PACKAGE);
const PATCH_MAX_BYTES    = 12 * 1024 * 1024;
const PATCH_ALLOWED_ROOTS = new Set(['public', 'desktop', 'build']);
const PATCH_ALLOWED_FILES = new Set(['server.js', 'dj-analyzer.js', 'package.json', 'package-lock.json']);
const UPDATE_FALLBACK_NOTES = ['Ho tro Spotify', 'Tim kiem YouTube', 'Giao dien tieng Viet'];
const OPEN_METEO_FORECAST_URL  = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODE_URL   = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_IP_LOCATION_URL  = 'http://ip-api.com/json/';
const WEATHER_DEFAULT_LOCATION = {
  name: 'Ho Chi Minh City',
  country: 'Vietnam',
  latitude: 10.8231,
  longitude: 106.6297,
  timezone: 'Asia/Ho_Chi_Minh',
};

const updateDownloadJobs = new Map();

// ---- Spotify token cache ----
let spotifyToken = null; // { access_token, expires_at }
let spotifyUserToken = null; // { access_token, refresh_token, expires_at }

// Load persisted tokens
try {
  if (fs.existsSync(SPOTIFY_TOKEN_FILE)) {
    spotifyToken = JSON.parse(fs.readFileSync(SPOTIFY_TOKEN_FILE, 'utf8'));
  }
} catch (e) { spotifyToken = null; }
try {
  if (fs.existsSync(SPOTIFY_USER_TOKEN_FILE)) {
    spotifyUserToken = JSON.parse(fs.readFileSync(SPOTIFY_USER_TOKEN_FILE, 'utf8'));
  }
} catch (e) { spotifyUserToken = null; }

function saveSpotifyToken(tok) {
  spotifyToken = tok;
  try { fs.writeFileSync(SPOTIFY_TOKEN_FILE, JSON.stringify(tok)); } catch (e) {}
}
function saveSpotifyUserToken(tok) {
  spotifyUserToken = tok;
  try { fs.writeFileSync(SPOTIFY_USER_TOKEN_FILE, JSON.stringify(tok)); } catch (e) {}
}

// ---- TLS ----
function applySystemCertificateAuthorities() {
  try {
    if (typeof tls.getCACertificates !== 'function' || typeof tls.setDefaultCACertificates !== 'function') return;
    const bundled = tls.getCACertificates('default') || [];
    const system  = tls.getCACertificates('system')  || [];
    if (!system.length) return;
    const seen = new Set();
    const merged = [];
    bundled.concat(system).forEach(cert => {
      if (!cert || seen.has(cert)) return;
      seen.add(cert);
      merged.push(cert);
    });
    if (merged.length > bundled.length) tls.setDefaultCACertificates(merged);
  } catch (e) { console.warn('[TLS] system CA merge skipped:', e.message); }
}
applySystemCertificateAuthorities();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

// ====================================================================
//  Utility
// ====================================================================
function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}
function sendJSON(res, data, status) {
  res.writeHead(status || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(JSON.stringify(data));
}
function readPackageInfo() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')); }
  catch (e) { return {}; }
}
function readRequestBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 8 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); }
      catch (e) {
        const params = new URLSearchParams(raw);
        const out = {};
        params.forEach((v, k) => { out[k] = v; });
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function clampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ====================================================================
//  Spotify Client Credentials (for search, no user login)
// ====================================================================
async function getSpotifyAccessToken() {
  const now = Date.now();
  if (spotifyToken && spotifyToken.expires_at > now + 30000) {
    return spotifyToken.access_token;
  }
  const creds = Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64');
  const resp = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + creds,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('Spotify token error ' + resp.status + ': ' + txt);
  }
  const data = await resp.json();
  const tok = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in || 3600) * 1000,
  };
  saveSpotifyToken(tok);
  return tok.access_token;
}

// ---- Spotify Podcast Helpers ----
function mapSpotifyShow(show) {
  if (!show) return null;
  return {
    id: show.id,
    rid: show.id,
    name: show.name || '',
    cover: (show.images && show.images[0] && show.images[0].url) || '',
    desc: show.description || '',
    djName: show.publisher || '',
    category: 'Podcast',
    programCount: show.total_episodes || 0,
    subCount: 0,
  };
}

function mapSpotifyEpisode(episode, show) {
  if (!episode) return null;
  const showName = show ? show.name : '';
  const publisher = show ? show.publisher : '';
  return {
    type: 'podcast',
    source: 'podcast',
    id: episode.id,
    programId: episode.id,
    radioId: show ? show.id : '',
    name: episode.name || '',
    artist: showName || publisher || 'Podcast',
    artists: [{ id: show ? show.id : 'podcast', name: showName || publisher || 'Podcast' }],
    artistId: show ? show.id : 'podcast',
    album: showName || 'Podcast',
    cover: (episode.images && episode.images[0] && episode.images[0].url) || (show && show.cover) || '',
    duration: episode.duration_ms || 0,
    fee: 0,
    djName: publisher || '',
    radioName: showName || '',
    desc: episode.description || '',
    createTime: Date.parse(episode.release_date) || 0,
    serialNum: episode.track_number || 0,
  };
}

async function spotifyFetch(endpoint, params) {
  const token = await getSpotifyAccessToken();
  const u = new URL(SPOTIFY_API_BASE + endpoint);
  if (params) Object.keys(params).forEach(k => { if (params[k] != null) u.searchParams.set(k, String(params[k])); });
  const resp = await fetch(u.toString(), {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
    },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('Spotify API ' + resp.status + ': ' + txt.slice(0, 200));
  }
  return resp.json();
}

// ====================================================================
//  Spotify User Auth (PKCE flow for user playlists)
// ====================================================================
async function getUserAccessToken() {
  if (!spotifyUserToken) return null;
  const now = Date.now();
  if (spotifyUserToken.expires_at > now + 30000) {
    return spotifyUserToken.access_token;
  }
  // Refresh
  if (!spotifyUserToken.refresh_token) return null;
  try {
    const creds = Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64');
    const resp = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + creds,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(spotifyUserToken.refresh_token),
    });
    if (!resp.ok) { saveSpotifyUserToken(null); return null; }
    const data = await resp.json();
    const tok = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || spotifyUserToken.refresh_token,
      expires_at: now + (data.expires_in || 3600) * 1000,
    };
    saveSpotifyUserToken(tok);
    return tok.access_token;
  } catch (e) {
    console.warn('[SpotifyUserToken] refresh failed:', e.message);
    return null;
  }
}

async function spotifyUserFetch(endpoint, params) {
  const token = await getUserAccessToken();
  if (!token) throw new Error('SPOTIFY_NOT_LOGGED_IN');
  const u = new URL(SPOTIFY_API_BASE + endpoint);
  if (params) Object.keys(params).forEach(k => { if (params[k] != null) u.searchParams.set(k, String(params[k])); });
  const resp = await fetch(u.toString(), {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
    },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('Spotify user API ' + resp.status + ': ' + txt.slice(0, 200));
  }
  return resp.json();
}

// ====================================================================
//  Spotify Data Mappers
// ====================================================================
function bestSpotifyImage(images, preferSize) {
  if (!Array.isArray(images) || !images.length) return '';
  const sorted = images.slice().sort((a, b) => (b.width || 0) - (a.width || 0));
  if (!preferSize) return sorted[0].url || '';
  // pick closest to preferSize
  const target = preferSize;
  let best = sorted[0];
  let bestDiff = Math.abs((best.width || 999) - target);
  for (const img of sorted) {
    const diff = Math.abs((img.width || 0) - target);
    if (diff < bestDiff) { best = img; bestDiff = diff; }
  }
  return best.url || '';
}

function mapSpotifyTrack(track) {
  if (!track) return null;
  const artists = (track.artists || []).map(a => ({ id: a.id, name: a.name || '' }));
  const album = track.album || {};
  return {
    provider: 'spotify',
    source: 'spotify',
    type: 'song',
    id: track.id,
    spotifyId: track.id,
    uri: track.uri || '',
    name: track.name || '',
    artist: artists.map(a => a.name).join(' / '),
    artists,
    artistId: artists[0] && artists[0].id,
    album: album.name || '',
    albumId: album.id || '',
    cover: bestSpotifyImage(album.images, 300),
    duration: track.duration_ms || 0,
    previewUrl: track.preview_url || '',
    explicit: !!track.explicit,
    popularity: track.popularity || 0,
    fee: 0,
  };
}

function mapSpotifyPlaylist(pl) {
  if (!pl) return null;
  return {
    provider: 'spotify',
    source: 'spotify',
    id: pl.id,
    name: pl.name || '',
    cover: bestSpotifyImage(pl.images, 300),
    trackCount: pl.tracks ? (pl.tracks.total || 0) : 0,
    description: pl.description || '',
    owner: pl.owner ? (pl.owner.display_name || pl.owner.id || '') : '',
    public: !!pl.public,
    uri: pl.uri || '',
  };
}

function mapSpotifyArtist(artist) {
  if (!artist) return null;
  return {
    provider: 'spotify',
    id: artist.id,
    name: artist.name || '',
    avatar: bestSpotifyImage(artist.images, 300),
    followers: artist.followers ? artist.followers.total : 0,
    genres: artist.genres || [],
    popularity: artist.popularity || 0,
  };
}

// ====================================================================
//  Search: Spotify
// ====================================================================
async function handleSpotifySearch(keywords, limit) {
  limit = Math.max(1, Math.min(50, parseInt(limit || '20', 10) || 20));
  console.log('[SpotifySearch]', keywords, 'limit:', limit);
  const data = await spotifyFetch('/search', {
    q: keywords,
    type: 'track',
    limit,
    market: 'VN',
  });
  const tracks = (data.tracks && data.tracks.items) ? data.tracks.items : [];
  return tracks.map(mapSpotifyTrack).filter(Boolean);
}

// ====================================================================
//  Recommendations: Spotify
// ====================================================================
async function handleSpotifyRecommendations(seedTrackId, limit) {
  limit = Math.max(1, Math.min(50, parseInt(limit || '20', 10) || 20));
  console.log('[SpotifyRecommendations] seed:', seedTrackId, 'limit:', limit);
  const data = await spotifyFetch('/recommendations', {
    seed_tracks: seedTrackId,
    limit,
    market: 'VN',
  });
  const tracks = (data && data.tracks) ? data.tracks : [];
  return tracks.map(mapSpotifyTrack).filter(Boolean);
}

// ====================================================================
//  YouTube Search (for audio playback URLs)
// ====================================================================
async function scrapeYoutubeSearch(query, maxResults) {
  maxResults = Math.max(1, Math.min(20, maxResults || 5));
  try {
    const u = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
    const resp = await fetch(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi,en;q=0.9',
      }
    });
    if (!resp.ok) throw new Error('HTTP status ' + resp.status);
    const html = await resp.text();
    
    const regex = /var\s+ytInitialData\s*=\s*({.+?});/s;
    const match = html.match(regex);
    let jsonData = null;
    if (match) {
      jsonData = JSON.parse(match[1]);
    } else {
      const regexAlt = /window\["ytInitialData"\]\s*=\s*({.+?});/s;
      const matchAlt = html.match(regexAlt);
      if (matchAlt) {
        jsonData = JSON.parse(matchAlt[1]);
      }
    }
    
    if (!jsonData) {
      throw new Error('ytInitialData not found');
    }
    
    return parseYtInitialData(jsonData, maxResults);
  } catch (e) {
    console.warn('[ScrapeYoutubeSearch] failed:', e.message);
    return [];
  }
}

function parseYtInitialData(data, maxResults) {
  const results = [];
  try {
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!sections || !Array.isArray(sections)) return [];
    
    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents;
      if (!items || !Array.isArray(items)) continue;
      
      for (const item of items) {
        if (results.length >= maxResults) break;
        
        const video = item.videoRenderer;
        if (!video) continue;
        
        const videoId = video.videoId;
        if (!videoId) continue;
        
        const title = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
        const channelTitle = video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || '';
        
        const thumbnails = video.thumbnail?.thumbnails;
        const thumbnail = thumbnails?.[thumbnails.length - 1]?.url || '';
        
        results.push({
          videoId,
          title,
          channelTitle,
          thumbnail,
        });
      }
    }
  } catch (e) {
    console.warn('[parseYtInitialData] parsing error:', e);
  }
  return results;
}

async function youtubeSearch(query, maxResults) {
  maxResults = Math.max(1, Math.min(20, maxResults || 5));
  
  try {
    const ytdlpResults = await ytdlpSearch(query, maxResults);
    if (ytdlpResults && ytdlpResults.length > 0) {
      return ytdlpResults;
    }
  } catch (e) {
    console.warn('[youtubeSearch] yt-dlp search failed:', e.message);
  }
  
  const scraped = await scrapeYoutubeSearch(query, maxResults);
  if (scraped && scraped.length > 0) {
    return scraped;
  }
  
  if (!YOUTUBE_API_KEY) {
    return await invidiousSearch(query, maxResults);
  }
  const u = new URL(YOUTUBE_API_BASE + '/search');
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('q', query);
  u.searchParams.set('type', 'video');
  u.searchParams.set('maxResults', String(maxResults));
  u.searchParams.set('videoCategoryId', '10');
  u.searchParams.set('key', YOUTUBE_API_KEY);
  const resp = await fetch(u.toString(), { headers: { 'User-Agent': UA } });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('YouTube API ' + resp.status + ': ' + txt.slice(0, 200));
  }
  const data = await resp.json();
  return (data.items || []).map(item => ({
    videoId: item.id && item.id.videoId,
    title: item.snippet && item.snippet.title || '',
    channelTitle: item.snippet && item.snippet.channelTitle || '',
    thumbnail: item.snippet && item.snippet.thumbnails && (
      item.snippet.thumbnails.high || item.snippet.thumbnails.medium || item.snippet.thumbnails.default
    ) && (
      (item.snippet.thumbnails.high || item.snippet.thumbnails.medium || item.snippet.thumbnails.default).url
    ) || '',
  })).filter(v => v.videoId);
}

async function invidiousSearch(query, maxResults) {
  const instances = [
    'https://invidious.nikkosphere.com',
    'https://yewtu.be',
    'https://inv.tux.pizza',
  ];
  for (const base of instances) {
    try {
      const u = new URL(base + '/api/v1/search');
      u.searchParams.set('q', query);
      u.searchParams.set('type', 'video');
      u.searchParams.set('fields', 'videoId,title,author,lengthSeconds,videoThumbnails');
      const resp = await fetch(u.toString(), {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      return (Array.isArray(data) ? data : []).slice(0, maxResults).map(item => ({
        videoId: item.videoId,
        title: item.title || '',
        channelTitle: item.author || '',
        thumbnail: (item.videoThumbnails && item.videoThumbnails[0] && item.videoThumbnails[0].url) || '',
      })).filter(v => v.videoId);
    } catch (e) {
      console.warn('[Invidious] instance failed:', base, e.message);
    }
  }
  return [];
}

function findYtdlpPath() {
  const possiblePaths = [
    path.join(__dirname, 'desktop', 'yt-dlp.exe'),
    path.join(__dirname, 'yt-dlp.exe'),
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

async function ytdlpSearch(query, maxResults) {
  maxResults = Math.max(1, Math.min(20, maxResults || 5));
  const { execFile } = require('child_process');
  const ytdlpPath = findYtdlpPath();
  const searchArg = `ytsearch${maxResults}:${query}`;
  const cookieArgs = getYtdlpCookieArgs();
  
  return new Promise((resolve) => {
    const args = [
      ...cookieArgs,
      searchArg,
      '--flat-playlist',
      '--dump-single-json',
      '--no-warnings',
    ];
    execFile(ytdlpPath, args, { timeout: 25000 }, (err, stdout, stderr) => {
      if (err) {
        console.warn('[ytdlpSearch] error:', err.message || err);
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

// Get direct audio stream URL using yt-dlp (if installed)
function getYtdlpCookieArgs() {
  // Try cookie file from env (set by Electron main at startup)
  const cookieFile = process.env.YOUTUBE_COOKIE_FILE || YOUTUBE_COOKIE_FILE;
  if (cookieFile && fs.existsSync(cookieFile)) {
    return ['--cookies', cookieFile];
  }
  return [];
}

function getYoutubeCookieStatus() {
  const cookieFile = process.env.YOUTUBE_COOKIE_FILE || YOUTUBE_COOKIE_FILE;
  if (!cookieFile || !fs.existsSync(cookieFile)) return { loggedIn: false, cookieFile };
  try {
    const content = fs.readFileSync(cookieFile, 'utf8');
    const hasLogin = content.includes('__Secure-3PSID') || content.includes('\tSID\t') || content.includes('LOGIN_INFO');
    return { loggedIn: hasLogin, cookieFile };
  } catch (e) {
    return { loggedIn: false, cookieFile, error: e.message };
  }
}

async function ytdlpGetAudioUrl(videoId) {
  const { execFile } = require('child_process');
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

async function handleYouTubeAudioUrl(trackName, artistName, trackId) {
  const query = `${artistName} ${trackName} official audio`;
  try {
    const videos = await youtubeSearch(query, 3);
    if (!videos.length) return { url: '', playable: false, error: 'NO_YOUTUBE_RESULTS' };
    const best = videos[0];
    // Try yt-dlp first
    const directUrl = await ytdlpGetAudioUrl(best.videoId);
    if (directUrl) {
      return {
        provider: 'youtube',
        url: directUrl,
        videoId: best.videoId,
        title: best.title,
        playable: true,
        via: 'yt-dlp',
      };
    }
    // Fallback: return YouTube watch URL (frontend can open in browser or use embedded player)
    return {
      provider: 'youtube',
      url: `https://www.youtube.com/watch?v=${best.videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${best.videoId}?autoplay=1`,
      videoId: best.videoId,
      title: best.title,
      playable: false,
      via: 'youtube-redirect',
      needsRedirect: true,
    };
  } catch (e) {
    console.warn('[YouTubeAudioUrl]', e.message);
    return { url: '', playable: false, error: e.message };
  }
}

// ====================================================================
//  Lyrics: lrclib.net (free, no key, supports synced LRC)
// ====================================================================
async function fetchLyricsFromLrclib(trackName, artistName, albumName, durationSec) {
  try {
    const u = new URL('https://lrclib.net/api/get');
    u.searchParams.set('track_name', trackName || '');
    u.searchParams.set('artist_name', artistName || '');
    if (albumName) u.searchParams.set('album_name', albumName);
    if (durationSec) u.searchParams.set('duration', String(Math.round(durationSec)));
    let resp = await fetch(u.toString(), {
      headers: { 'User-Agent': `Mineradio/${APP_VERSION}`, 'Lrclib-Client': `Mineradio v${APP_VERSION}` },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        lyric: data.syncedLyrics || data.plainLyrics || '',
        tlyric: '',
        source: data.syncedLyrics ? 'lrclib-synced' : 'lrclib-plain',
        instrumental: !!data.instrumental,
      };
    }
    if (resp.status === 404) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(trackName + ' ' + artistName)}`;
      const sResp = await fetch(searchUrl, {
        headers: { 'User-Agent': `Mineradio/${APP_VERSION}`, 'Lrclib-Client': `Mineradio v${APP_VERSION}` },
        signal: AbortSignal.timeout(8000),
      });
      if (sResp.ok) {
        const results = await sResp.json();
        if (results && results.length > 0) {
          const match = results[0];
          return {
            lyric: match.syncedLyrics || match.plainLyrics || '',
            tlyric: '',
            source: match.syncedLyrics ? 'lrclib-search-synced' : 'lrclib-search-plain',
            instrumental: !!match.instrumental,
          };
        }
      }
      return { lyric: '', tlyric: '', source: 'lrclib-notfound' };
    }
    throw new Error('lrclib ' + resp.status);
  } catch (e) {
    console.warn('[lrclib]', e.message);
    return { lyric: '', tlyric: '', source: 'lrclib-error', error: e.message };
  }
}

// NetEase Cloud Music via proxy music.xianqiao.wang
async function fetchLyricsFromNetease(trackName, artistName) {
  try {
    const query = `${artistName} ${trackName}`;
    const searchUrl = `https://music.xianqiao.wang/neteaseapiv2/search?keywords=${encodeURIComponent(query)}&limit=3`;
    const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
    if (!searchResp.ok) return null;
    const searchData = await searchResp.json();
    const songs = searchData?.result?.songs || [];
    if (!songs.length) return null;
    
    const songId = songs[0].id;
    if (!songId) return null;
    
    const lyricUrl = `https://music.xianqiao.wang/neteaseapiv2/lyric?id=${songId}`;
    const lyricResp = await fetch(lyricUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
    if (!lyricResp.ok) return null;
    const lyricData = await lyricResp.json();
    
    const yrc = lyricData?.yrc?.lyric || '';
    const lrc = lyricData?.lrc?.lyric || '';
    const tlyric = lyricData?.tlyric?.lyric || '';
    
    if (yrc) {
      return {
        lyric: yrc,
        tlyric: tlyric,
        source: 'netease-yrc',
        isWordLevel: true,
      };
    }
    if (lrc) {
      return {
        lyric: lrc,
        tlyric: tlyric,
        source: 'netease-lrc',
        isWordLevel: false,
      };
    }
    return null;
  } catch (e) {
    console.warn('[NeteaseLyrics] failed:', e.message);
    return null;
  }
}

// Fallback: lyrics.ovh
async function fetchLyricsFromOvh(artistName, trackName) {
  try {
    const u = `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName || '')}/${encodeURIComponent(trackName || '')}`;
    const resp = await fetch(u, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return { lyric: '', source: 'ovh-error' };
    const data = await resp.json();
    const raw = (data.lyrics || '').trim();
    if (!raw) return { lyric: '', source: 'ovh-empty' };
    const lines = raw.split('\n');
    let ts = 0;
    const lrc = lines.map(line => {
      const m = Math.floor(ts / 60);
      const s = (ts % 60).toFixed(2).padStart(5, '0');
      const result = `[${String(m).padStart(2,'0')}:${s}]${line}`;
      ts += 3;
      return result;
    }).join('\n');
    return { lyric: lrc, source: 'lyrics-ovh', isWordLevel: false };
  } catch (e) {
    return { lyric: '', source: 'ovh-error', error: e.message };
  }
}

function cleanYoutubeTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*[\(\[][^\]\)]*(official|music|video|audio|lyric|mv|hd|4k|raw|live|sub|vietsub|karaoke|cover|remix|feat\.?|ft\.?)[^\]\)]*[\)\]]/gi, '')
    .replace(/\s*-\s*(official|music|video|audio|lyric|mv|hd|4k|raw|live|sub|vietsub|karaoke|cover|remix)\b.*/gi, '')
    .replace(/\s*\|\s*.*/gi, '')
    .trim();
}

async function handleLyric(spotifyId, trackName, artistName, albumName, durationMs) {
  const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
  // 1. Try lrclib first (best quality, synced lyrics)
  const result = await fetchLyricsFromLrclib(trackName, artistName, albumName, durationSec);
  if (result.lyric) return { ...result, id: spotifyId };
  
  // 2. Fallback to NetEase
  if (trackName && artistName) {
    const netease = await fetchLyricsFromNetease(trackName, artistName);
    if (netease && netease.lyric) return { ...netease, id: spotifyId };
  }

  // 3. Fallback to lyrics.ovh
  if (artistName && trackName) {
    const ovh = await fetchLyricsFromOvh(artistName, trackName);
    if (ovh.lyric) return { ...ovh, id: spotifyId };
  }
  return { lyric: '', tlyric: '', source: 'not-found', id: spotifyId };
}


// ====================================================================
//  Discover Home: Spotify Featured / New Releases
// ====================================================================
async function handleDiscoverHome() {
  const loggedIn = !!(spotifyUserToken && await getUserAccessToken());
  try {
    const [featured, newReleases] = await Promise.allSettled([
      spotifyFetch('/browse/featured-playlists', { limit: 8, market: 'VN', locale: 'vi_VN' }),
      spotifyFetch('/browse/new-releases', { limit: 8, market: 'VN' }),
    ]);

    const playlists = (featured.status === 'fulfilled' && featured.value.playlists && featured.value.playlists.items)
      ? featured.value.playlists.items.map(mapSpotifyPlaylist).filter(Boolean)
      : [];

    const albums = (newReleases.status === 'fulfilled' && newReleases.value.albums && newReleases.value.albums.items)
      ? newReleases.value.albums.items.map(album => ({
          provider: 'spotify',
          source: 'spotify',
          id: album.id,
          name: album.name || '',
          cover: bestSpotifyImage(album.images, 300),
          trackCount: album.total_tracks || 0,
          creator: (album.artists || []).map(a => a.name).join(', '),
          tag: 'album-moi',
        }))
      : [];

    let dailySongs = [];
    if (loggedIn) {
      try {
        const top = await spotifyUserFetch('/me/top/tracks', { limit: 12, time_range: 'short_term' });
        dailySongs = (top.items || []).map(mapSpotifyTrack).filter(Boolean);
      } catch (e) {
        console.warn('[DiscoverHome] top tracks failed:', e.message);
      }
    }

    return {
      loggedIn,
      provider: 'spotify',
      dailySongs,
      playlists: playlists.concat(albums).slice(0, 10),
      podcasts: [],
      mode: loggedIn ? 'personalized' : 'featured',
      updatedAt: Date.now(),
    };
  } catch (err) {
    console.warn('[DiscoverHome] failed:', err.message);
    return {
      loggedIn,
      provider: 'spotify',
      dailySongs: [],
      playlists: [],
      podcasts: [],
      mode: 'fallback',
      updatedAt: Date.now(),
    };
  }
}

// ====================================================================
//  Artist Detail: Spotify
// ====================================================================
async function handleArtistDetail(id, limit) {
  limit = Math.max(10, Math.min(50, parseInt(limit || '20', 10) || 20));
  const [artistData, topTracks] = await Promise.all([
    spotifyFetch('/artists/' + id),
    spotifyFetch('/artists/' + id + '/top-tracks', { market: 'VN' }),
  ]);
  const artist = mapSpotifyArtist(artistData);
  const songs = ((topTracks.tracks || []).slice(0, limit)).map(mapSpotifyTrack).filter(Boolean);
  return { id, artist, songs };
}

// ====================================================================
//  User Playlists: Spotify (requires user login)
// ====================================================================
async function handleUserPlaylists() {
  const token = await getUserAccessToken();
  if (!token) return { loggedIn: false, provider: 'spotify', playlists: [] };
  const data = await spotifyUserFetch('/me/playlists', { limit: 50 });
  const playlists = (data.items || []).map(mapSpotifyPlaylist).filter(Boolean);
  return { loggedIn: true, provider: 'spotify', playlists };
}

// ====================================================================
//  Playlist Tracks: Spotify
// ====================================================================
async function handlePlaylistTracks(id) {
  const data = await spotifyFetch('/playlists/' + id, { market: 'VN' });
  const meta = mapSpotifyPlaylist(data);
  const items = data.tracks && data.tracks.items ? data.tracks.items : [];
  const tracks = items
    .map(item => item && item.track ? mapSpotifyTrack(item.track) : null)
    .filter(Boolean);
  return { playlist: meta, tracks };
}

// ====================================================================
//  Spotify Album Tracks
// ====================================================================
async function handleAlbumTracks(id) {
  const [albumData, tracksData] = await Promise.all([
    spotifyFetch('/albums/' + id, { market: 'VN' }),
    spotifyFetch('/albums/' + id + '/tracks', { market: 'VN', limit: 50 }),
  ]);
  const cover = bestSpotifyImage(albumData.images, 300);
  const albumName = albumData.name || '';
  const tracks = ((tracksData.items || []).map(track => {
    const t = mapSpotifyTrack({ ...track, album: albumData });
    return t;
  })).filter(Boolean);
  return {
    playlist: {
      provider: 'spotify',
      id,
      name: albumName,
      cover,
      trackCount: tracksData.total || tracks.length,
    },
    tracks,
  };
}

// ====================================================================
//  Spotify Login Info
// ====================================================================
async function getSpotifyLoginInfo() {
  const token = await getUserAccessToken();
  if (!token) return { loggedIn: false, provider: 'spotify' };
  try {
    const me = await spotifyUserFetch('/me');
    return {
      loggedIn: true,
      provider: 'spotify',
      userId: me.id,
      nickname: me.display_name || me.id || 'Nguoi dung Spotify',
      avatar: bestSpotifyImage(me.images, 100),
      email: me.email || '',
      product: me.product || 'free',
      isPremium: me.product === 'premium',
    };
  } catch (e) {
    console.warn('[SpotifyLoginInfo]', e.message);
    return { loggedIn: false, provider: 'spotify', error: e.message };
  }
}

// ====================================================================
//  Weather utilities (kept from original, adapted for VN)
// ====================================================================
function openMeteoWeatherLabel(code) {
  code = Number(code);
  if (code === 0) return 'Troi nang';
  if (code === 1 || code === 2) return 'It may';
  if (code === 3) return 'Nhieu may';
  if (code === 45 || code === 48) return 'Suong mu';
  if (code === 51 || code === 53 || code === 55) return 'Mua phun';
  if (code === 56 || code === 57) return 'Mua da';
  if (code === 61 || code === 63 || code === 65) return 'Mua';
  if (code === 66 || code === 67) return 'Mua bang gia';
  if (code === 71 || code === 73 || code === 75 || code === 77) return 'Tuyet';
  if (code === 80 || code === 81 || code === 82) return 'Mua rao';
  if (code === 85 || code === 86) return 'Tuyet rao';
  if (code === 95 || code === 96 || code === 99) return 'Bao to';
  return 'Thoi tiet';
}

function buildWeatherMood(weather) {
  const now = new Date();
  const hour = now.getHours();
  const code = Number(weather && weather.weatherCode);
  const temp = Number(weather && weather.temperature);
  const apparent = Number(weather && weather.apparentTemperature);
  const rain = Number(weather && weather.precipitation) || 0;
  const humidity = Number(weather && weather.humidity) || 0;
  const isNight = weather && weather.isDay === 0 || hour < 6 || hour >= 20;
  const isMorning = hour >= 5 && hour < 11;
  const isDusk = hour >= 17 && hour < 20;
  const isRain = rain > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code);
  const isSnow = [71,73,75,77,85,86].includes(code);
  const isCloud = [2,3,45,48].includes(code);
  const isStorm = [95,96,99].includes(code);
  const feels = Number.isFinite(apparent) ? apparent : temp;

  let mood = {
    key: 'clear',
    title: 'Tram Phat Nang Dep',
    tagline: 'Nhip dieu tuoi sang, nhu anh sang ben cua so',
    energy: 0.62, warmth: 0.58, focus: 0.48, melancholy: 0.24,
    keywords: ['pop viet', 'indie pop', 'chill pop', 'city pop', 'nhac vui'],
  };
  if (isStorm) {
    mood = {
      key: 'storm',
      title: 'Tram Phat Bao To',
      tagline: 'Bass day hon, thu gian khi con bao qua',
      energy: 0.46, warmth: 0.34, focus: 0.66, melancholy: 0.62,
      keywords: ['R&B', 'trip hop', 'dark electronic', 'ambient rock'],
    };
  } else if (isRain) {
    mood = {
      key: 'rain',
      title: 'Tram Phat Ngay Mua',
      tagline: 'Nghe nhac cung mua roi nhe',
      energy: 0.38, warmth: 0.42, focus: 0.64, melancholy: 0.66,
      keywords: ['nhac buon', 'lofi rainy', 'dream pop', 'acoustic'],
    };
  } else if (isSnow || feels <= 3) {
    mood = {
      key: 'snow',
      title: 'Tram Phat Troi Lanh',
      tagline: 'Trong sang, cham rai, cam giac mua dong',
      energy: 0.34, warmth: 0.28, focus: 0.72, melancholy: 0.54,
      keywords: ['acoustic', 'ambient piano', 'indie folk'],
    };
  } else if (feels >= 31 || humidity >= 78) {
    mood = {
      key: 'humid',
      title: 'Tram Phat Nong Buc',
      tagline: 'Nhip dieu nhe han, cho de tho hon',
      energy: 0.48, warmth: 0.76, focus: 0.46, melancholy: 0.30,
      keywords: ['summer chill', 'bossa nova', 'city pop summer', 'tropical'],
    };
  } else if (isCloud) {
    mood = {
      key: 'cloudy',
      title: 'Tram Phat Troi Am',
      tagline: 'Khong voi sang, de am nhac mem hon',
      energy: 0.40, warmth: 0.46, focus: 0.58, melancholy: 0.52,
      keywords: ['indie rock mellow', 'neo soul', 'chillhop', 'folk'],
    };
  }
  if (isNight) {
    mood.key += '-night';
    mood.title = 'Tram Phat Dem Khuya';
    mood.tagline = 'Am luong nho di, de dem tham gia vao ban nhac';
    mood.energy = Math.min(mood.energy, 0.42);
    mood.focus = Math.max(mood.focus, 0.68);
    mood.melancholy = Math.max(mood.melancholy, 0.52);
    mood.keywords = ['late night jazz', 'ambient', 'lofi sleep', 'R&B night'].concat(mood.keywords.slice(0, 3));
  } else if (isMorning) {
    mood.title = 'Tram Phat Buoi Sang';
    mood.energy = Math.max(mood.energy, 0.52);
    mood.keywords = ['morning acoustic', 'indie pop morning', 'upbeat'].concat(mood.keywords.slice(0, 3));
  } else if (isDusk) {
    mood.title = 'Tram Phat Hoan Hon';
    mood.melancholy = Math.max(mood.melancholy, 0.48);
    mood.keywords = ['sunset chill', 'soul pop', 'evening acoustic'].concat(mood.keywords.slice(0, 3));
  }
  mood.keywords = Array.from(new Set(mood.keywords)).slice(0, 7);
  return mood;
}

async function resolveOpenMeteoLocation(query) {
  const raw = String(query || '').trim();
  if (!raw) return WEATHER_DEFAULT_LOCATION;
  const u = new URL(OPEN_METEO_GEOCODE_URL);
  u.searchParams.set('name', raw);
  u.searchParams.set('count', '1');
  u.searchParams.set('language', 'vi');
  u.searchParams.set('format', 'json');
  const body = await requestJson(u.toString(), { headers: { 'User-Agent': UA } });
  const first = body && Array.isArray(body.results) && body.results[0];
  if (!first) return { ...WEATHER_DEFAULT_LOCATION, query: raw, fallback: true };
  return {
    name: first.name || raw,
    country: first.country || '',
    admin1: first.admin1 || '',
    latitude: first.latitude,
    longitude: first.longitude,
    timezone: first.timezone || 'auto',
  };
}

async function fetchOpenMeteoWeather(params) {
  params = params || {};
  let location;
  const lat = clampNumber(params.lat, -90, 90, NaN);
  const lon = clampNumber(params.lon, -180, 180, NaN);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    location = {
      name: String(params.city || params.name || 'Vi tri hien tai').trim() || 'Vi tri hien tai',
      country: '',
      latitude: lat,
      longitude: lon,
      timezone: params.timezone || 'auto',
    };
  } else {
    location = await resolveOpenMeteoLocation(params.city || params.q || params.location);
  }
  const u = new URL(OPEN_METEO_FORECAST_URL);
  u.searchParams.set('latitude', String(location.latitude));
  u.searchParams.set('longitude', String(location.longitude));
  u.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m');
  u.searchParams.set('hourly', 'precipitation_probability,weather_code,temperature_2m');
  u.searchParams.set('forecast_days', '1');
  u.searchParams.set('timezone', location.timezone || 'auto');
  const body = await requestJson(u.toString(), { headers: { 'User-Agent': UA } });
  const cur = body && body.current || {};
  const weather = {
    provider: 'open-meteo',
    location: {
      name: location.name,
      country: location.country || '',
      admin1: location.admin1 || '',
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: body.timezone || location.timezone || '',
      fallback: !!location.fallback,
    },
    label: openMeteoWeatherLabel(cur.weather_code),
    weatherCode: Number(cur.weather_code),
    temperature: Number(cur.temperature_2m),
    apparentTemperature: Number(cur.apparent_temperature),
    humidity: Number(cur.relative_humidity_2m),
    precipitation: Number(cur.precipitation || cur.rain || cur.showers || cur.snowfall || 0),
    cloudCover: Number(cur.cloud_cover),
    windSpeed: Number(cur.wind_speed_10m),
    windGusts: Number(cur.wind_gusts_10m),
    isDay: Number(cur.is_day),
    time: cur.time || '',
    updatedAt: Date.now(),
  };
  weather.mood = buildWeatherMood(weather);
  return weather;
}

async function fetchIpWeatherLocation() {
  const u = new URL(WEATHER_IP_LOCATION_URL);
  u.searchParams.set('fields', 'status,message,country,regionName,city,lat,lon,timezone,query');
  u.searchParams.set('lang', 'vi');
  const body = await requestJson(u.toString(), { headers: { 'User-Agent': UA } });
  if (!body || body.status !== 'success' || !Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lon))) {
    throw new Error((body && body.message) || 'IP_LOCATION_FAILED');
  }
  return {
    provider: 'ip-api',
    city: body.city || WEATHER_DEFAULT_LOCATION.name,
    region: body.regionName || '',
    country: body.country || '',
    latitude: Number(body.lat),
    longitude: Number(body.lon),
    timezone: body.timezone || 'auto',
    ip: body.query || '',
  };
}

function weatherRadioSeedQueries(mood) {
  const key = String(mood && mood.key || '');
  if (key.includes('rain') || key.includes('storm')) return ['rainy day music', 'sad R&B 2024', 'lofi rain chill', 'acoustic sad songs'];
  if (key.includes('snow') || key.includes('cloudy')) return ['cloudy day indie', 'mellow acoustic', 'ambient piano music', 'indie folk chill'];
  if (key.includes('humid') || key.includes('summer')) return ['summer vibes pop', 'tropical house 2024', 'bossa nova chill', 'beach pop'];
  if (key.includes('night')) return ['late night R&B', 'midnight jazz', 'lo-fi hip hop', 'ambient night chill'];
  return ['top pop hits 2024', 'chill indie pop', 'morning acoustic', 'feel good songs'];
}

async function buildWeatherRadio(params) {
  let weather;
  try {
    weather = await fetchOpenMeteoWeather(params);
  } catch (e) {
    console.warn('[WeatherRadio] weather failed, using fallback:', e.message);
    weather = {
      provider: 'open-meteo',
      location: { name: 'Ho Chi Minh City', country: 'Vietnam', fallback: true },
      label: 'Khong co du lieu thoi tiet',
      weatherCode: null,
      temperature: null,
      apparentTemperature: null,
      humidity: null,
      precipitation: null,
      cloudCover: null,
      windSpeed: null,
      windGusts: null,
      isDay: null,
      time: '',
      updatedAt: Date.now(),
      mood: {
        key: 'fallback',
        title: 'Tram Phat Tam Thoi',
        tagline: 'Thoi tiet tam thoi khong co, nghe nhac ngay nao!',
        energy: 0.54, warmth: 0.55, focus: 0.55, melancholy: 0.35,
        keywords: ['pop hits', 'indie pop', 'chill pop'],
      },
    };
  }
  const queries = weatherRadioSeedQueries(weather.mood);
  let songs = [];
  const settled = await Promise.allSettled(queries.slice(0, 3).map(q => handleSpotifySearch(q, 6)));
  settled.forEach(result => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) songs = songs.concat(result.value);
  });
  // Deduplicate
  const seen = new Set();
  songs = songs.filter(s => { if (!s.id || seen.has(s.id)) return false; seen.add(s.id); return true; });
  return {
    ok: true,
    weather,
    radio: {
      title: weather.mood.title,
      subtitle: weather.mood.tagline,
      seedQueries: queries.slice(0, 3),
      songs: songs.slice(0, 18),
      updatedAt: Date.now(),
    },
  };
}

// ====================================================================
//  HTTP Utilities
// ====================================================================
function requestText(targetUrl, opts, body) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, {
      method: opts.method || 'GET',
      headers: opts.headers || {},
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (response.statusCode >= 400) {
          const err = new Error('HTTP ' + response.statusCode);
          err.statusCode = response.statusCode;
          err.body = text;
          reject(err);
          return;
        }
        resolve(text);
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function requestJson(targetUrl, opts, body) {
  const text = await requestText(targetUrl, opts, body);
  try { return JSON.parse(text); }
  catch (e) {
    const err = new Error('Invalid JSON from ' + targetUrl);
    err.cause = e;
    throw err;
  }
}

function audioContentTypeForUrl(audioUrl, upstreamType) {
  let pathname = '';
  try { pathname = new URL(audioUrl).pathname.toLowerCase(); } catch (e) {}
  if (/\.flac$/.test(pathname)) return 'audio/flac';
  if (/\.mp3$/.test(pathname)) return 'audio/mpeg';
  if (/\.(m4a|mp4)$/.test(pathname)) return 'audio/mp4';
  if (/\.ogg$/.test(pathname)) return 'audio/ogg';
  if (/\.wav$/.test(pathname)) return 'audio/wav';
  if (/\.webm$/.test(pathname)) return 'audio/webm';
  return upstreamType || 'audio/mpeg';
}

// ====================================================================
//  Update System (kept from original)
// ====================================================================
function parseGitHubRepository(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const direct = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (direct) return { owner: direct[1], repo: direct[2].replace(/\.git$/i, '') };
  const github = raw.match(/github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[#/?].*)?$/i);
  if (github) return { owner: github[1], repo: github[2].replace(/\.git$/i, '') };
  return null;
}
function readUpdateConfig(pkg) {
  const local = (pkg && pkg.mineradio && pkg.mineradio.update) || {};
  const repoHint = process.env.MINERADIO_UPDATE_REPOSITORY || process.env.GITHUB_REPOSITORY
    || local.repository || local.github
    || (pkg && pkg.repository && (pkg.repository.url || pkg.repository)) || '';
  const parsed = parseGitHubRepository(repoHint) || {};
  const owner = process.env.MINERADIO_UPDATE_OWNER || local.owner || parsed.owner || '';
  const repo  = process.env.MINERADIO_UPDATE_REPO  || local.repo  || parsed.repo  || '';
  return {
    provider: local.provider || 'github',
    owner, repo,
    configured: !!(owner && repo),
    preview: local.preview !== false,
    preferMirrors: local.preferMirrors !== false,
    mirrors: readUpdateMirrors(local),
    manifest: process.env.MINERADIO_UPDATE_MANIFEST || '',
  };
}
function readUpdateMirrors(local) {
  const envMirrors = process.env.MINERADIO_UPDATE_MIRRORS || '';
  const raw = envMirrors
    ? (Array.isArray(envMirrors) ? envMirrors : String(envMirrors).split(/[\n,;]/))
    : (local.mirrors || []);
  const seen = new Set();
  return (Array.isArray(raw) ? raw : []).map(item => String(item || '').trim())
    .filter(url => /^https?:\/\//i.test(url))
    .filter(url => { const k = url.replace(/\/+$/, '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6);
}
function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '').replace(/[+].*$/, '').replace(/-.+$/, '');
}
function compareVersions(a, b) {
  const aa = normalizeVersion(a).split('.').map(n => parseInt(n, 10) || 0);
  const bb = normalizeVersion(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(aa.length, bb.length, 3);
  for (let i = 0; i < len; i++) {
    const left = aa[i] || 0; const right = bb[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}
function cleanReleaseLine(line) {
  return String(line || '').replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+[.)]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
}
function extractReleaseNotes(body) {
  const notes = [];
  String(body || '').split(/\r?\n/).forEach(line => {
    const text = cleanReleaseLine(line);
    if (!text) return;
    if (/^(what'?s changed|changes|changelog|full changelog)$/i.test(text)) return;
    if (/^https?:\/\//i.test(text)) return;
    if (text.length > 72) return;
    notes.push(text);
  });
  return notes.slice(0, 4);
}
function normalizeDigest(value, algorithm) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const prefix = new RegExp('^' + algorithm + ':', 'i');
  return raw.replace(prefix, '').trim().replace(/^['"]|['"]$/g, '');
}
function assetDigestInfo(asset) {
  const digest = String(asset && asset.digest || '').trim();
  return {
    sha256: normalizeDigest((asset && asset.sha256) || (/^sha256:/i.test(digest) ? digest : ''), 'sha256').toLowerCase(),
    sha512: normalizeDigest((asset && asset.sha512) || (/^sha512:/i.test(digest) ? digest : ''), 'sha512'),
  };
}
function buildMirrorUrl(originalUrl, mirror) {
  const source = String(originalUrl || '').trim();
  const base   = String(mirror || '').trim();
  if (!/^https?:\/\//i.test(source) || !/^https?:\/\//i.test(base)) return '';
  if (base.includes('{encodedUrl}')) return base.replace(/\{encodedUrl\}/g, encodeURIComponent(source));
  if (base.includes('{url}')) return base.replace(/\{url\}/g, source);
  return base.replace(/\/+$/, '/') + source;
}
function uniqueDownloadCandidates(urls, opts) {
  opts = opts || {};
  const directUrls = (Array.isArray(urls) ? urls : [urls]).map(u => String(u || '').trim()).filter(u => /^https?:\/\//i.test(u));
  const directSet = new Set(directUrls.map(u => u.toLowerCase()));
  const mirrors = opts.useMirrors === false ? [] : (UPDATE_CONFIG.mirrors || []);
  const mirrored = [];
  directUrls.forEach(source => {
    mirrors.forEach((mirror, index) => {
      const url = buildMirrorUrl(source, mirror);
      if (url) mirrored.push({ url, label: 'Tuyen tai nhanh ' + (index + 1), mirrored: true });
    });
  });
  const direct = directUrls.map(url => ({ url, label: 'GitHub truc tiep', mirrored: false }));
  const ordered = UPDATE_CONFIG.preferMirrors === false ? direct.concat(mirrored) : mirrored.concat(direct);
  const seen = new Set();
  return ordered.filter(item => { const k = item.url.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
function publicDownloadUrls(candidates) {
  return (Array.isArray(candidates) ? candidates : []).map(item => item && item.url).filter(Boolean);
}
function pickReleaseAsset(assets) {
  const list = Array.isArray(assets) ? assets : [];
  const preferred = list.find(a => /\.(exe|msi)$/i.test(a && a.name || ''))
    || list.find(a => /\.(zip|7z)$/i.test(a && a.name || ''))
    || list[0];
  if (!preferred) return null;
  const digest = assetDigestInfo(preferred);
  const candidates = uniqueDownloadCandidates(preferred.browser_download_url || '');
  return {
    name: preferred.name || '',
    size: preferred.size || 0,
    contentType: preferred.content_type || '',
    downloadUrl: preferred.browser_download_url || '',
    downloadUrls: publicDownloadUrls(candidates),
    sha256: digest.sha256 || '',
    sha512: digest.sha512 || '',
  };
}
function patchAssetVersions(name) {
  const matches = String(name || '').match(/\d+(?:[._-]\d+){1,3}/g) || [];
  return matches.map(item => normalizeVersion(item.replace(/[._-]/g, '.'))).filter(Boolean);
}
function pickPatchAsset(assets, currentVersion, latestVersion) {
  const list = Array.isArray(assets) ? assets : [];
  const current = normalizeVersion(currentVersion || APP_VERSION);
  const latest  = normalizeVersion(latestVersion || '');
  const preferred = list.find(a => {
    const name = String(a && a.name || '');
    if (!/\.(patch\.json|patch|json)$/i.test(name)) return false;
    const versions = patchAssetVersions(name);
    if (latest) return versions[0] === current && versions[versions.length - 1] === latest;
    return versions[0] === current && name.toLowerCase().includes('patch');
  }) || list.find(a => {
    const name = String(a && a.name || '');
    if (!/\.(patch\.json|patch|json)$/i.test(name)) return false;
    const versions = patchAssetVersions(name);
    return versions[0] === current && name.toLowerCase().includes('patch');
  }) || list.find(a => /\.(patch\.json|patch)$/i.test(a && a.name || ''));
  if (!preferred) return null;
  const digest = assetDigestInfo(preferred);
  const candidates = uniqueDownloadCandidates(preferred.browser_download_url || '');
  return {
    name: preferred.name || '',
    size: preferred.size || 0,
    contentType: preferred.content_type || '',
    downloadUrl: preferred.browser_download_url || '',
    downloadUrls: publicDownloadUrls(candidates),
    sha256: digest.sha256 || '',
    sha512: digest.sha512 || '',
  };
}
function updateAssetNameFromUrl(value) {
  try {
    const u = new URL(String(value || ''));
    const base = path.basename(decodeURIComponent(u.pathname || ''));
    if (base) return base;
  } catch (_) {}
  return path.basename(String(value || '').split('?')[0]) || '';
}
function localUpdateFallback(reason, opts) {
  opts = opts || {};
  return {
    configured: !!(opts.configured != null ? opts.configured : false),
    preview: UPDATE_CONFIG.preview,
    updateAvailable: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    release: {
      tagName: 'v' + APP_VERSION,
      name: 'Mineradio v' + APP_VERSION,
      version: APP_VERSION,
      htmlUrl: '',
      downloadUrl: '',
      summary: 'Phien ban hien tai, da san sang kiem tra cap nhat.',
      notes: UPDATE_FALLBACK_NOTES,
    },
    reason: reason || '',
  };
}
function updateError(code, message, cause) {
  const err = new Error(message || code);
  err.code = code;
  if (cause) err.cause = cause;
  return err;
}
function classifyUpdateError(err) {
  const code    = String(err && err.code    || '').trim();
  const message = String(err && err.message || err || '').trim();
  const detail  = message || code || 'Loi khong xac dinh';
  if (/HASH|DIGEST|CHECKSUM/i.test(code + ' ' + message)) return { code: code || 'UPDATE_HASH_MISMATCH', reason: 'Kiem tra file that bai, co the bi loi duong truyen.', detail };
  if (/SIZE_MISMATCH|content length/i.test(code + ' ' + message)) return { code: code || 'UPDATE_SIZE_MISMATCH', reason: 'Kich thuoc file khong khop, mang co the bi gian doan.', detail };
  if (/AbortError|TIMEOUT|ETIMEDOUT|timeout/i.test(code + ' ' + message)) return { code: code || 'UPDATE_TIMEOUT', reason: 'Het thoi gian ket noi, mang khong on dinh.', detail };
  if (/ENOTFOUND|EAI_AGAIN|DNS|fetch failed|getaddrinfo/i.test(code + ' ' + message)) return { code: code || 'UPDATE_DNS_FAILED', reason: 'Khong the ket noi den may chu cap nhat.', detail };
  if (/ECONNRESET|ECONNREFUSED|socket|network/i.test(code + ' ' + message)) return { code: code || 'UPDATE_NETWORK_FAILED', reason: 'Ket noi mang bi ngat, dang thu lai.', detail };
  const httpMatch = message.match(/\bHTTP[_\s-]?(\d{3})\b/i) || message.match(/\b(\d{3})\b/);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    if (status === 403) return { code: code || 'UPDATE_HTTP_403', reason: 'May chu cap nhat tu choi ket noi (403).', detail };
    if (status === 404) return { code: code || 'UPDATE_HTTP_404', reason: 'File cap nhat khong ton tai (404).', detail };
    if (status >= 500) return { code: code || 'UPDATE_HTTP_5XX', reason: 'May chu cap nhat dang loi, thu lai sau.', detail };
    return { code: code || ('UPDATE_HTTP_' + status), reason: 'May chu tra ve HTTP ' + status + '.', detail };
  }
  return { code: code || 'UPDATE_FAILED', reason: 'Cap nhat that bai: ' + detail, detail };
}
async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 12000);
  try {
    return await fetch(url, Object.assign({}, opts || {}, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}
async function fetchTextFromCandidates(candidates, timeoutMs) {
  const list = Array.isArray(candidates) && candidates.length ? candidates : [];
  const failures = [];
  for (let i = 0; i < list.length; i++) {
    const candidate = list[i];
    try {
      const resp = await fetchWithTimeout(candidate.url, { headers: { 'User-Agent': `Mineradio/${APP_VERSION}` } }, timeoutMs || 6500);
      if (!resp.ok) throw updateError('HTTP_' + resp.status, 'HTTP ' + resp.status);
      return { text: await resp.text(), candidate };
    } catch (err) {
      const info = classifyUpdateError(err);
      failures.push(candidate.label + ': ' + info.reason);
    }
  }
  throw updateError('UPDATE_ALL_LINES_FAILED', failures.join('; ') || 'All update lines failed');
}
function yamlScalar(text, key) {
  const pattern = new RegExp('^\\s*' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*(.+?)\\s*$', 'm');
  const match = String(text || '').match(pattern);
  if (!match) return '';
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}
function githubReleaseDownloadUrl(version, fileName) {
  const tag = 'v' + normalizeVersion(version);
  return `https://github.com/${encodeURIComponent(UPDATE_CONFIG.owner)}/${encodeURIComponent(UPDATE_CONFIG.repo)}/releases/download/${tag}/${String(fileName || '').split('/').map(p => encodeURIComponent(p)).join('/')}`;
}
function parseLatestYmlUpdateInfo(text, reason) {
  const latestVersion = normalizeVersion(yamlScalar(text, 'version') || APP_VERSION) || APP_VERSION;
  const assetPath = yamlScalar(text, 'path') || yamlScalar(text, 'url') || `Mineradio-${latestVersion}-Setup.exe`;
  const sha512 = normalizeDigest(yamlScalar(text, 'sha512'), 'sha512');
  const size = Number(yamlScalar(text, 'size') || 0) || 0;
  const releaseDate = yamlScalar(text, 'releaseDate');
  const downloadUrl = githubReleaseDownloadUrl(latestVersion, assetPath);
  const candidates = uniqueDownloadCandidates(downloadUrl);
  const asset = {
    name: updateAssetNameFromUrl(downloadUrl) || assetPath,
    size, contentType: 'application/octet-stream',
    downloadUrl, downloadUrls: publicDownloadUrls(candidates),
    sha256: '', sha512,
  };
  return {
    configured: true, preview: false,
    updateAvailable: compareVersions(latestVersion, APP_VERSION) > 0,
    currentVersion: APP_VERSION, latestVersion,
    release: {
      tagName: 'v' + latestVersion,
      name: 'Mineradio v' + latestVersion,
      version: latestVersion,
      publishedAt: releaseDate,
      htmlUrl: `https://github.com/${UPDATE_CONFIG.owner}/${UPDATE_CONFIG.repo}/releases/tag/v${latestVersion}`,
      downloadUrl, asset, patch: null, patchAvailable: false,
      summary: 'Da tim thay phien ban moi, dang dung tuyen du phong.',
      notes: ['Da ket noi den tuyen cap nhat du phong', 'Tu dong chon duong tai nhanh nhat', 'Hien thi ly do neu tai that bai'],
    },
    source: 'latest-yml', reason: reason || '',
  };
}
async function fetchLatestYmlUpdateInfo(reason) {
  if (!UPDATE_CONFIG.configured || UPDATE_CONFIG.provider !== 'github') throw updateError('UPDATE_REPOSITORY_NOT_CONFIGURED');
  const latestYmlUrl = `https://github.com/${encodeURIComponent(UPDATE_CONFIG.owner)}/${encodeURIComponent(UPDATE_CONFIG.repo)}/releases/latest/download/latest.yml`;
  const candidates = uniqueDownloadCandidates(latestYmlUrl);
  const result = await fetchTextFromCandidates(candidates, 6500);
  return parseLatestYmlUpdateInfo(result.text, reason);
}
async function fetchLatestUpdateInfo() {
  if (UPDATE_CONFIG.manifest) {
    try {
      const resp = await fetch(UPDATE_CONFIG.manifest, { headers: { 'User-Agent': `Mineradio/${APP_VERSION}` } });
      if (!resp.ok) throw new Error('Manifest ' + resp.status);
      const data = await resp.json();
      return { configured: true, ...data };
    } catch (e) { return localUpdateFallback(e.message, { configured: true }); }
  }
  if (!UPDATE_CONFIG.configured || UPDATE_CONFIG.provider !== 'github') return localUpdateFallback();
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(UPDATE_CONFIG.owner)}/${encodeURIComponent(UPDATE_CONFIG.repo)}/releases/latest`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const resp = await fetch(apiUrl, { signal: controller.signal, headers: { 'User-Agent': `Mineradio/${APP_VERSION}`, 'Accept': 'application/vnd.github+json' } });
    if (!resp.ok) {
      try { return await fetchLatestYmlUpdateInfo('GitHub Releases ' + resp.status); }
      catch (_) { return localUpdateFallback('GitHub Releases ' + resp.status, { configured: true }); }
    }
    const data = await resp.json();
    const latestVersion = normalizeVersion(data.tag_name || data.name || APP_VERSION) || APP_VERSION;
    const asset = pickReleaseAsset(data.assets);
    const patch = pickPatchAsset(data.assets, APP_VERSION, latestVersion);
    const notes = extractReleaseNotes(data.body).length ? extractReleaseNotes(data.body) : UPDATE_FALLBACK_NOTES;
    return {
      configured: true, preview: false,
      updateAvailable: compareVersions(latestVersion, APP_VERSION) > 0,
      currentVersion: APP_VERSION, latestVersion,
      release: {
        tagName: data.tag_name || ('v' + latestVersion),
        name: data.name || ('Mineradio v' + latestVersion),
        version: latestVersion,
        publishedAt: data.published_at || '',
        htmlUrl: data.html_url || '',
        downloadUrl: asset ? asset.downloadUrl : '',
        asset, patch,
        patchAvailable: !!(patch && patch.downloadUrl && compareVersions(latestVersion, APP_VERSION) > 0),
        summary: notes[0] || 'Da tim thay phien ban moi, nen cap nhat.',
        notes,
      },
    };
  } catch (err) {
    const reason = err && err.message || 'Update check failed';
    try { return await fetchLatestYmlUpdateInfo(reason); }
    catch (fallbackErr) { return localUpdateFallback((fallbackErr && fallbackErr.message) || reason, { configured: true }); }
  } finally {
    clearTimeout(timer);
  }
}
function safeUpdateFileName(name, version) {
  const raw = String(name || '').trim() || `Mineradio-${version || APP_VERSION}.exe`;
  return raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 160) || `Mineradio-${version || APP_VERSION}.exe`;
}
function publicUpdateJob(job) {
  if (!job) return { ok: false, error: 'UPDATE_JOB_NOT_FOUND' };
  return {
    ok: job.status !== 'error',
    id: job.id, status: job.status, progress: job.progress || 0,
    received: job.received || 0, total: job.total || 0,
    speedBps: job.speedBps || 0, etaSeconds: job.etaSeconds || 0,
    sourceLabel: job.sourceLabel || '', attempt: job.attempt || 0,
    attempts: job.attempts || 0, mode: job.mode || 'installer',
    message: job.message || '', restartRequired: !!job.restartRequired,
    cached: !!job.cached, fileName: job.fileName || '',
    filePath: job.status === 'ready' ? job.filePath : '',
    version: job.version || '', releaseUrl: job.releaseUrl || '',
    error: job.error || '', errorReason: job.errorReason || '',
    errorDetail: job.errorDetail || '',
    failedAttempts: Array.isArray(job.failedAttempts) ? job.failedAttempts.slice(0, 6) : [],
    createdAt: job.createdAt, updatedAt: job.updatedAt,
  };
}
function activeUpdateJobFor(version) {
  const jobs = Array.from(updateDownloadJobs.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return jobs.find(job => job.version === version && (job.status === 'queued' || job.status === 'downloading' || job.status === 'ready'));
}
function trimUpdateJobs() {
  const jobs = Array.from(updateDownloadJobs.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  jobs.slice(8).forEach(job => updateDownloadJobs.delete(job.id));
}
function sha256Hex(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function sha512Base64(buffer) { return crypto.createHash('sha512').update(buffer).digest('base64'); }
function sha512Hex(buffer) { return crypto.createHash('sha512').update(buffer).digest('hex'); }
function verifyUpdateBuffer(buffer, job) {
  const expectedSize = Number(job.expectedSize || job.total || 0) || 0;
  if (expectedSize > 0 && buffer.length !== expectedSize) throw updateError('UPDATE_SIZE_MISMATCH', `Expected ${expectedSize} bytes, got ${buffer.length}`);
  const expectedSha256 = normalizeDigest(job.sha256 || '', 'sha256').toLowerCase();
  if (expectedSha256 && sha256Hex(buffer) !== expectedSha256) throw updateError('UPDATE_SHA256_MISMATCH', 'Downloaded sha256 mismatch');
  const expectedSha512 = normalizeDigest(job.sha512 || '', 'sha512');
  if (expectedSha512) {
    const actualBase64 = sha512Base64(buffer);
    const actualHex = sha512Hex(buffer).toLowerCase();
    if (actualBase64 !== expectedSha512 && actualHex !== expectedSha512.toLowerCase()) throw updateError('UPDATE_SHA512_MISMATCH', 'Downloaded sha512 mismatch');
  }
}
function verifyUpdateFile(filePath, job) { verifyUpdateBuffer(fs.readFileSync(filePath), job); }
function moveInvalidUpdateFile(filePath, reason) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return;
    const dir = path.dirname(filePath); const ext = path.extname(filePath); const base = path.basename(filePath, ext);
    const invalidPath = path.join(dir, `${base}.invalid-${Date.now()}${ext || '.bin'}`);
    fs.renameSync(filePath, invalidPath);
  } catch (e) {}
}
function reuseVerifiedInstallerJob(opts) {
  if (!opts || !opts.filePath || !fs.existsSync(opts.filePath)) return null;
  if (!opts.expectedSize && !opts.sha256 && !opts.sha512) return null;
  const now = Date.now(); const stat = fs.statSync(opts.filePath);
  const job = {
    id: 'cached-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    status: 'ready', progress: 100, received: stat.size || 0, total: opts.expectedSize || stat.size || 0,
    speedBps: 0, etaSeconds: 0, sourceLabel: 'Bo nho dem cuc bo', attempt: 0, attempts: opts.attempts || 0,
    mode: 'installer', message: 'Bo cai dat da tai, co the mo de cai ngay',
    fileName: opts.fileName || path.basename(opts.filePath),
    filePath: opts.filePath, version: opts.version || '', downloadUrl: opts.downloadUrl || '',
    downloadCandidates: opts.downloadCandidates || [], expectedSize: opts.expectedSize || 0,
    sha256: opts.sha256 || '', sha512: opts.sha512 || '', releaseUrl: opts.releaseUrl || '',
    failedAttempts: [], cached: true, createdAt: now, updatedAt: now, error: '',
  };
  try {
    verifyUpdateFile(opts.filePath, job);
    updateDownloadJobs.set(job.id, job);
    trimUpdateJobs();
    return job;
  } catch (err) {
    moveInvalidUpdateFile(opts.filePath, (err && err.message) || 'cache verification failed');
    return null;
  }
}
function setUpdateJobError(job, err, fallbackMessage) {
  const info = classifyUpdateError(err);
  job.status = 'error'; job.error = info.code; job.errorReason = info.reason;
  job.errorDetail = info.detail; job.message = fallbackMessage || info.reason; job.updatedAt = Date.now();
}
function prepareUpdateJobAttempt(job, candidate, index, total) {
  job.status = 'downloading'; job.sourceLabel = candidate.label || 'Tuyen tai';
  job.attempt = index + 1; job.attempts = total; job.received = 0;
  job.speedBps = 0; job.etaSeconds = 0; job.error = ''; job.errorReason = ''; job.errorDetail = ''; job.updatedAt = Date.now();
}
function ensureMirrorCanBeVerified(job, candidate) {
  if (!candidate || !candidate.mirrored) return;
  if (job.sha256 || job.sha512) return;
  throw updateError('MIRROR_HASH_MISSING', 'Mirror download skipped because no digest is available');
}
async function downloadUpdateAssetWithMirrors(job) {
  const tmpPath = job.filePath + '.download';
  const candidates = Array.isArray(job.downloadCandidates) && job.downloadCandidates.length
    ? job.downloadCandidates : uniqueDownloadCandidates(job.downloadUrl || '');
  const failures = [];
  fs.mkdirSync(UPDATE_DOWNLOAD_DIR, { recursive: true });
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      ensureMirrorCanBeVerified(job, candidate);
      prepareUpdateJobAttempt(job, candidate, i, candidates.length);
      job.message = 'Dang tai bo cai dat day du';
      const resp = await fetchWithTimeout(candidate.url, { headers: { 'User-Agent': `Mineradio/${APP_VERSION}` } }, 14000);
      if (!resp.ok) throw updateError('HTTP_' + resp.status, 'HTTP ' + resp.status);
      const totalHeader = parseInt(resp.headers.get('content-length') || '0', 10) || 0;
      job.total = totalHeader || job.expectedSize || job.total || 0;
      job.progress = 0; job.updatedAt = Date.now();
      let speedWindowAt = Date.now(); let speedWindowBytes = 0;
      const writer = fs.createWriteStream(tmpPath);
      const reader = resp.body.getReader();
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          const buf = Buffer.from(chunk.value);
          job.received += buf.length; speedWindowBytes += buf.length;
          const now = Date.now();
          if (now - speedWindowAt >= 900) {
            job.speedBps = Math.round(speedWindowBytes / Math.max(0.001, (now - speedWindowAt) / 1000));
            speedWindowAt = now; speedWindowBytes = 0;
          }
          if (job.total > 0) {
            job.progress = Math.max(1, Math.min(99, Math.round((job.received / job.total) * 100)));
            job.etaSeconds = job.speedBps > 0 ? Math.max(0, Math.round((job.total - job.received) / job.speedBps)) : 0;
          } else {
            job.progress = Math.max(1, Math.min(88, Math.round(Math.log10(job.received / 1024 + 1) * 24)));
          }
          job.message = 'Dang tai bo cai dat day du';
          job.updatedAt = Date.now();
          if (!writer.write(buf)) await once(writer, 'drain');
        }
      } finally { writer.end(); await once(writer, 'finish').catch(() => {}); }
      verifyUpdateFile(tmpPath, job);
      if (fs.existsSync(job.filePath)) fs.unlinkSync(job.filePath);
      fs.renameSync(tmpPath, job.filePath);
      job.status = 'ready'; job.progress = 100; job.etaSeconds = 0;
      job.message = 'Bo cai dat da tai xong'; job.updatedAt = Date.now();
      return;
    } catch (err) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      const info = classifyUpdateError(err);
      failures.push({ source: candidate.label || 'Tuyen tai', reason: info.reason, detail: info.detail });
      job.failedAttempts = failures.slice(-6);
      job.message = i < candidates.length - 1 ? ((candidate.label || 'Tuyen hien tai') + ' that bai, dang chuyen tuyen') : info.reason;
      job.updatedAt = Date.now();
      if (i >= candidates.length - 1) setUpdateJobError(job, err, 'Tai that bai: ' + info.reason);
    }
  }
}
function startUpdateDownloadJob(info) {
  const release = info && info.release ? info.release : {};
  const asset = release.asset || {};
  const downloadUrl = release.downloadUrl || asset.downloadUrl || '';
  if (!info || !info.configured) return { ok: false, error: 'UPDATE_REPOSITORY_NOT_CONFIGURED' };
  if (!info.updateAvailable) return { ok: false, error: 'NO_UPDATE_AVAILABLE' };
  if (!/^https?:\/\//i.test(downloadUrl)) return { ok: false, error: 'UPDATE_ASSET_MISSING' };
  const version = info.latestVersion || release.version || '';
  const existing = activeUpdateJobFor(version);
  if (existing) return publicUpdateJob(existing);
  const fileName = safeUpdateFileName(asset.name || '', version);
  const filePath = path.join(UPDATE_DOWNLOAD_DIR, fileName);
  const downloadCandidates = uniqueDownloadCandidates([downloadUrl].concat(Array.isArray(asset.downloadUrls) ? asset.downloadUrls : []));
  const expectedSize = asset.size || 0;
  const sha256 = normalizeDigest(asset.sha256 || '', 'sha256').toLowerCase();
  const sha512 = normalizeDigest(asset.sha512 || '', 'sha512');
  const cached = reuseVerifiedInstallerJob({ fileName, filePath, version, downloadUrl, downloadCandidates, expectedSize, sha256, sha512, releaseUrl: release.htmlUrl || '', attempts: downloadCandidates.length });
  if (cached) return publicUpdateJob(cached);
  const now = Date.now();
  const job = {
    id: 'dl-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    status: 'queued', progress: 0, received: 0, total: expectedSize, mode: 'installer',
    message: 'Cho tai bo cai dat...', fileName, filePath, version, downloadUrl,
    downloadCandidates, releaseUrl: release.htmlUrl || '', expectedSize, sha256, sha512,
    sourceLabel: '', attempt: 0, attempts: downloadCandidates.length, failedAttempts: [],
    createdAt: now, updatedAt: now, error: '',
  };
  updateDownloadJobs.set(job.id, job);
  trimUpdateJobs();
  downloadUpdateAssetWithMirrors(job);
  return publicUpdateJob(job);
}

// ====================================================================
//  Patch system (kept from original)
// ====================================================================
function normalizePatchPayload(data) {
  if (!data || typeof data !== 'object') throw new Error('INVALID_PATCH_PAYLOAD');
  const files = Array.isArray(data.files) ? data.files : (Array.isArray(data.changes) ? data.changes : []);
  const from = normalizeVersion(data.from || APP_VERSION);
  const to   = normalizeVersion(data.to   || APP_VERSION);
  if (!files.length) throw new Error('PATCH_NO_FILES');
  if (!to) throw new Error('PATCH_MISSING_VERSION');
  return { from, to, restartRequired: data.restartRequired !== false, files };
}
function writePatchFile(job, file) {
  if (!file || !file.path || file.content === undefined) throw new Error('PATCH_FILE_INVALID');
  const rel = path.normalize(file.path).replace(/^\.?[/\\]+/, '');
  const parts = rel.split(path.sep);
  const root = parts[0];
  const isAllowedRoot = PATCH_ALLOWED_ROOTS.has(root);
  const isAllowedFile = PATCH_ALLOWED_FILES.has(rel);
  if (!isAllowedRoot && !isAllowedFile) throw new Error('PATCH_FILE_PATH_NOT_ALLOWED: ' + rel);
  const target = path.join(__dirname, rel);
  if (!target.startsWith(__dirname + path.sep)) throw new Error('PATCH_FILE_PATH_TRAVERSAL: ' + rel);
  const backupDir = path.join(UPDATE_PATCH_BACKUP_DIR, job.id || 'unknown');
  fs.mkdirSync(backupDir, { recursive: true });
  if (fs.existsSync(target)) {
    const backupPath = path.join(backupDir, rel.replace(/[/\\]/g, '--'));
    try { fs.copyFileSync(target, backupPath); } catch (_) {}
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = file.encoding === 'base64' ? Buffer.from(file.content, 'base64') : file.content;
  fs.writeFileSync(target, content);
  return rel;
}
async function downloadPatchBufferFromCandidate(job, candidate, index, total) {
  ensureMirrorCanBeVerified(job, candidate);
  prepareUpdateJobAttempt(job, candidate, index, total);
  job.mode = 'patch'; job.message = 'Dang tai ban va nhanh'; job.progress = 0; job.updatedAt = Date.now();
  const resp = await fetchWithTimeout(candidate.url, { headers: { 'User-Agent': `Mineradio/${APP_VERSION}` } }, 12000);
  if (!resp.ok) throw updateError('HTTP_' + resp.status, 'HTTP ' + resp.status);
  job.total = parseInt(resp.headers.get('content-length') || '0', 10) || job.expectedSize || job.total || 0;
  job.received = 0;
  const chunks = [];
  const reader = resp.body.getReader();
  let speedWindowAt = Date.now(); let speedWindowBytes = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    const buf = Buffer.from(chunk.value);
    job.received += buf.length; speedWindowBytes += buf.length;
    if (job.received > PATCH_MAX_BYTES) throw updateError('PATCH_TOO_LARGE', 'Patch package is too large');
    chunks.push(buf);
    const now = Date.now();
    if (now - speedWindowAt >= 700) {
      job.speedBps = Math.round(speedWindowBytes / Math.max(0.001, (now - speedWindowAt) / 1000));
      speedWindowAt = now; speedWindowBytes = 0;
    }
    job.progress = job.total > 0 ? Math.max(1, Math.min(84, Math.round((job.received / job.total) * 84))) : Math.max(1, Math.min(76, Math.round(Math.log10(job.received / 1024 + 1) * 24)));
    job.etaSeconds = job.total > 0 && job.speedBps > 0 ? Math.max(0, Math.round((job.total - job.received) / job.speedBps)) : 0;
    job.updatedAt = Date.now();
  }
  const raw = Buffer.concat(chunks);
  verifyUpdateBuffer(raw, job);
  return raw;
}
async function downloadAndApplyPatchWithMirrors(job) {
  const candidates = Array.isArray(job.downloadCandidates) && job.downloadCandidates.length
    ? job.downloadCandidates : uniqueDownloadCandidates(job.downloadUrl || '');
  const failures = [];
  fs.mkdirSync(UPDATE_DOWNLOAD_DIR, { recursive: true });
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const raw = await downloadPatchBufferFromCandidate(job, candidate, i, candidates.length);
      const patch = normalizePatchPayload(JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')));
      job.version = patch.to; job.message = 'Dang ap dung ban va nhanh'; job.progress = 88; job.etaSeconds = 0; job.updatedAt = Date.now();
      const changed = [];
      patch.files.forEach(file => changed.push(writePatchFile(job, file)));
      job.changedFiles = changed; job.status = 'ready'; job.progress = 100;
      job.restartRequired = patch.restartRequired;
      job.message = patch.restartRequired ? 'Ban va nhanh da ap dung, khoi dong lai de hieu luc' : 'Ban va nhanh da ap dung';
      job.updatedAt = Date.now(); return;
    } catch (err) {
      const info = classifyUpdateError(err);
      failures.push({ source: candidate.label || 'Tuyen tai', reason: info.reason, detail: info.detail });
      job.failedAttempts = failures.slice(-6);
      job.message = i < candidates.length - 1 ? ((candidate.label || 'Tuyen hien tai') + ' that bai, dang chuyen tuyen') : info.reason;
      job.updatedAt = Date.now();
      if (i >= candidates.length - 1) setUpdateJobError(job, err, 'Ban va nhanh that bai: ' + info.reason);
    }
  }
}
function startUpdatePatchJob(info) {
  const release = info && info.release ? info.release : {};
  const patch = release.patch || {};
  const downloadUrl = patch.downloadUrl || '';
  if (!info || !info.configured) return { ok: false, error: 'UPDATE_REPOSITORY_NOT_CONFIGURED' };
  if (!info.updateAvailable) return { ok: false, error: 'NO_UPDATE_AVAILABLE' };
  if (!release.patchAvailable || !/^https?:\/\//i.test(downloadUrl)) return { ok: false, error: 'PATCH_ASSET_MISSING' };
  const version = info.latestVersion || release.version || patch.to || '';
  const existing = Array.from(updateDownloadJobs.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(job => job.mode === 'patch' && job.version === version && (job.status === 'queued' || job.status === 'downloading' || job.status === 'ready'));
  if (existing) return publicUpdateJob(existing);
  const now = Date.now();
  const downloadCandidates = uniqueDownloadCandidates([downloadUrl].concat(Array.isArray(patch.downloadUrls) ? patch.downloadUrls : []));
  const job = {
    id: 'patch-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    status: 'queued', progress: 0, received: 0, total: patch.size || 0, mode: 'patch',
    fileName: patch.name || safeUpdateFileName('', version).replace(/\.exe$/i, '.patch.json'),
    filePath: '', version, downloadUrl, downloadCandidates, releaseUrl: release.htmlUrl || '',
    expectedSize: patch.size || 0,
    sha256: normalizeDigest(patch.sha256 || '', 'sha256').toLowerCase(),
    sha512: normalizeDigest(patch.sha512 || '', 'sha512'),
    restartRequired: true, sourceLabel: '', attempt: 0, attempts: downloadCandidates.length,
    failedAttempts: [], message: 'Cho tai ban va nhanh', createdAt: now, updatedAt: now, error: '',
  };
  updateDownloadJobs.set(job.id, job);
  trimUpdateJobs();
  downloadAndApplyPatchWithMirrors(job);
  return publicUpdateJob(job);
}

// ====================================================================
//  Beatmap Cache (kept from original)
// ====================================================================
function beatCacheRootInfo() {
  const dir = path.resolve(BEATMAP_CACHE_DIR);
  const root = path.parse(dir).root;
  const drive = root ? root.replace(/[\\\/]+$/, '').toUpperCase() : '';
  const allowed = !!root && !/^C:$/i.test(drive);
  const available = allowed && fs.existsSync(root);
  return { dir, root, drive, allowed, available };
}
function ensureBeatMapCacheDir() {
  const info = beatCacheRootInfo();
  if (!info.allowed) { const err = new Error('BEAT_CACHE_ON_C_DRIVE_DISABLED'); err.code = 'BEAT_CACHE_ON_C_DRIVE_DISABLED'; err.info = info; throw err; }
  if (!info.available) { const err = new Error('BEAT_CACHE_DRIVE_UNAVAILABLE'); err.code = 'BEAT_CACHE_DRIVE_UNAVAILABLE'; err.info = info; throw err; }
  fs.mkdirSync(info.dir, { recursive: true });
  return info.dir;
}
function safeBeatMapCacheFile(key) {
  const raw = String(key || '').trim();
  if (!raw || raw.length > 240) return null;
  const hash = crypto.createHash('sha1').update(raw).digest('hex');
  const label = raw.replace(/[^a-z0-9_.-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'beatmap';
  return path.join(ensureBeatMapCacheDir(), `${label}-${hash}.json`);
}
function compactBeatMapCachePayload(body) {
  const key = String(body && body.key || '').trim();
  const map = body && body.map;
  if (!key || !map || typeof map !== 'object') return null;
  return { v: 1, key, savedAt: Date.now(), meta: { provider: String(body.provider || '').slice(0, 32), title: String(body.title || '').slice(0, 160), artist: String(body.artist || '').slice(0, 160), mode: String(body.mode || 'mr').slice(0, 32) }, map };
}
function readBeatMapCache(key) {
  const file = safeBeatMapCacheFile(key);
  if (!file || !fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw && raw.map ? raw : null;
}
function writeBeatMapCache(body) {
  const payload = compactBeatMapCachePayload(body);
  if (!payload) return { ok: false, error: 'INVALID_BEATMAP_CACHE_PAYLOAD' };
  const file = safeBeatMapCacheFile(payload.key);
  if (!file) return { ok: false, error: 'INVALID_BEATMAP_CACHE_KEY' };
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload));
  fs.renameSync(tmp, file);
  return { ok: true, key: payload.key, savedAt: payload.savedAt, dir: path.dirname(file) };
}

// DJ Analyzer (optional, if available)
let analyzePodcastDjStream, analyzePodcastDjIntro;
try {
  const djAnalyzer = require('./dj-analyzer');
  analyzePodcastDjStream = djAnalyzer.analyzePodcastDjStream;
  analyzePodcastDjIntro  = djAnalyzer.analyzePodcastDjIntro;
} catch (e) {
  analyzePodcastDjStream = async () => ({ visualBeatCount: 0, decode: {} });
  analyzePodcastDjIntro  = async () => ({ visualBeatCount: 0, decode: {} });
}

// ====================================================================
//  HTTP Server
// ====================================================================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const pn  = url.pathname;

  // App version
  if (pn === '/api/app/version') {
    sendJSON(res, {
      name: APP_PACKAGE.name || 'mineradio',
      productName: APP_PACKAGE.productName || 'Mineradio',
      version: APP_VERSION,
      provider: 'spotify',
      update: {
        provider: UPDATE_CONFIG.provider,
        configured: UPDATE_CONFIG.configured,
        owner: UPDATE_CONFIG.owner,
        repo: UPDATE_CONFIG.repo,
        preview: UPDATE_CONFIG.preview,
        manifestOverride: !!UPDATE_CONFIG.manifest,
      },
    });
    return;
  }

  // ---- YouTube Auth status ----
  if (pn === '/api/youtube/auth/status') {
    const status = getYoutubeCookieStatus();
    sendJSON(res, { ...status, provider: 'youtube' });
    return;
  }
  if (pn === '/api/youtube/auth/logout') {
    const cookieFile = process.env.YOUTUBE_COOKIE_FILE || YOUTUBE_COOKIE_FILE;
    try {
      if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
      sendJSON(res, { ok: true, loggedIn: false, provider: 'youtube' });
    } catch (e) {
      sendJSON(res, { ok: false, error: e.message }, 500);
    }
    return;
  }



  // ---- Update routes ----
  if (pn === '/api/update/latest') {
    try { sendJSON(res, await fetchLatestUpdateInfo()); }
    catch (err) { sendJSON(res, { ...localUpdateFallback(err.message || 'Update check failed', { configured: UPDATE_CONFIG.configured }), error: err.message || 'Update check failed' }); }
    return;
  }
  if (pn === '/api/update/download') {
    try { const info = await fetchLatestUpdateInfo(); const job = startUpdateDownloadJob(info); sendJSON(res, job, job.ok ? 200 : 400); }
    catch (err) { sendJSON(res, { ok: false, error: err.message || 'UPDATE_DOWNLOAD_START_FAILED' }, 500); }
    return;
  }
  if (pn === '/api/update/download/status') {
    const id = url.searchParams.get('id') || '';
    const job = id ? updateDownloadJobs.get(id) : Array.from(updateDownloadJobs.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    sendJSON(res, publicUpdateJob(job), job ? 200 : 404);
    return;
  }
  if (pn === '/api/update/patch') {
    try { const info = await fetchLatestUpdateInfo(); const job = startUpdatePatchJob(info); sendJSON(res, job, job.ok ? 200 : 400); }
    catch (err) { sendJSON(res, { ok: false, error: err.message || 'UPDATE_PATCH_START_FAILED' }, 500); }
    return;
  }
  if (pn === '/api/update/patch/status') {
    const id = url.searchParams.get('id') || '';
    const job = id ? updateDownloadJobs.get(id) : Array.from(updateDownloadJobs.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(item => item.mode === 'patch');
    sendJSON(res, publicUpdateJob(job), job ? 200 : 404);
    return;
  }

  // ---- Beatmap cache ----
  if (pn === '/api/beatmap/cache/status') {
    const info = beatCacheRootInfo();
    sendJSON(res, { enabled: info.allowed && info.available, dir: info.dir, drive: info.drive, reason: !info.allowed ? 'C_DRIVE_DISABLED' : (!info.available ? 'TARGET_DRIVE_UNAVAILABLE' : ''), mode: info.allowed && info.available ? 'disk' : 'memory-only' });
    return;
  }
  if (pn === '/api/beatmap/cache') {
    if (req.method === 'GET') {
      const key = url.searchParams.get('key') || '';
      try {
        const entry = readBeatMapCache(key);
        sendJSON(res, entry ? { ok: true, hit: true, key: entry.key || key, map: entry.map, meta: entry.meta || {}, savedAt: entry.savedAt || 0 } : { ok: true, hit: false, key });
      } catch (err) {
        const info = err.info || beatCacheRootInfo();
        sendJSON(res, { ok: false, hit: false, enabled: false, mode: 'memory-only', key, reason: err.code || err.message || 'BEAT_CACHE_READ_FAILED', dir: info.dir });
      }
      return;
    }
    if (req.method === 'POST') {
      try { const body = await readRequestBody(req); sendJSON(res, writeBeatMapCache(body)); }
      catch (err) { const info = err.info || beatCacheRootInfo(); sendJSON(res, { ok: false, enabled: false, mode: 'memory-only', reason: err.code || err.message || 'BEAT_CACHE_WRITE_FAILED', dir: info.dir }); }
      return;
    }
    sendJSON(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    return;
  }

  // ---- Discover Home ----
  if (pn === '/api/discover/home') {
    try { sendJSON(res, await handleDiscoverHome()); }
    catch (err) { console.error('[DiscoverHome]', err); sendJSON(res, { error: err.message, loggedIn: false, dailySongs: [], playlists: [], podcasts: [] }, 500); }
    return;
  }

  // ---- Weather ----
  if (pn === '/api/weather/radio') {
    try {
      const data = await buildWeatherRadio({ city: url.searchParams.get('city') || url.searchParams.get('q') || '', lat: url.searchParams.get('lat'), lon: url.searchParams.get('lon'), timezone: url.searchParams.get('timezone') || '' });
      sendJSON(res, data);
    } catch (err) {
      sendJSON(res, { ok: false, error: err.message, weather: null, radio: { title: 'Tram Phat Thoi Tiet', subtitle: 'Thoi tiet tam thoi khong co, nghe nhac ngay nao!', seedQueries: [], songs: [] } }, 500);
    }
    return;
  }
  if (pn === '/api/weather/ip-location') {
    try { sendJSON(res, { ok: true, location: await fetchIpWeatherLocation() }); }
    catch (err) { sendJSON(res, { ok: false, error: err.message, location: null }, 500); }
    return;
  }

  // ---- Search (Spotify / YouTube) ----
  if (pn === '/api/search') {
    try {
      const kw    = String(url.searchParams.get('keywords') || url.searchParams.get('q') || '').trim();
      const limit = parseInt(url.searchParams.get('limit') || '20', 10) || 20;
      const provider = url.searchParams.get('provider') || 'spotify';
      if (!kw) { sendJSON(res, { songs: [] }); return; }
      
      if (provider === 'youtube') {
        const videos = await youtubeSearch(kw, limit);
        const songs = videos.map(video => ({
          provider: 'youtube',
          source: 'youtube',
          type: 'song',
          id: video.videoId,
          spotifyId: '',
          uri: `youtube:video:${video.videoId}`,
          name: video.title,
          artist: video.channelTitle,
          artists: [{ id: video.channelTitle, name: video.channelTitle }],
          artistId: video.channelTitle,
          album: 'YouTube Video',
          albumId: 'youtube',
          cover: video.thumbnail,
          duration: 0,
          previewUrl: '',
          explicit: false,
          popularity: 50,
          fee: 0
        }));
        sendJSON(res, { songs, provider: 'youtube' });
      } else {
        const songs = await handleSpotifySearch(kw, limit);
        sendJSON(res, { songs, provider: 'spotify' });
      }
    } catch (err) { console.error('[Search]', err); sendJSON(res, { error: err.message, songs: [] }, 500); }
    return;
  }

  // ---- Spotify track detail ----
  if (pn === '/api/spotify/track') {
    try {
      const id = url.searchParams.get('id') || '';
      if (!id) { sendJSON(res, { error: 'Missing track id' }, 400); return; }
      const data = await spotifyFetch('/tracks/' + id, { market: 'VN' });
      sendJSON(res, mapSpotifyTrack(data));
    } catch (err) { sendJSON(res, { error: err.message }, 500); }
    return;
  }

  // ---- Spotify recommendations ----
  if (pn === '/api/spotify/recommendations') {
    try {
      const seedId   = url.searchParams.get('seed_id') || '';
      const name     = url.searchParams.get('name') || '';
      const artist   = url.searchParams.get('artist') || '';
      const limitVal = parseInt(url.searchParams.get('limit') || '20', 10) || 20;

      let spotifyId = '';
      if (seedId && seedId.length === 22) {
        spotifyId = seedId;
      } else if (name) {
        const query = `${artist} ${name}`;
        const searchRes = await handleSpotifySearch(query, 1);
        if (searchRes && searchRes.length > 0) {
          spotifyId = searchRes[0].id;
        }
      }

      if (!spotifyId) {
        sendJSON(res, { tracks: [] });
        return;
      }

      const tracks = await handleSpotifyRecommendations(spotifyId, limitVal);
      sendJSON(res, { tracks });
    } catch (err) {
      sendJSON(res, { error: err.message, tracks: [] }, 500);
    }
    return;
  }

  // ---- Song URL (YouTube audio via yt-dlp) ----
  if (pn === '/api/song/url') {
    try {
      const sid        = url.searchParams.get('id') || url.searchParams.get('spotifyId') || '';
      const trackName  = url.searchParams.get('name')       || '';
      const artistName = url.searchParams.get('artist')     || '';
      const previewUrl = url.searchParams.get('preview_url')|| '';
      const source     = url.searchParams.get('source')     || '';
      
      let finalTrackName = trackName;
      let finalArtistName = artistName;
      let finalSource = source;

      // Dynamic metadata lookup if name/artist is missing for Spotify tracks
      if (!finalTrackName && sid && sid.length === 22) {
        try {
          const trackData = await spotifyFetch('/tracks/' + sid, { market: 'VN' });
          if (trackData) {
            finalTrackName = trackData.name;
            finalArtistName = (trackData.artists || []).map(a => a.name).join(' / ');
            finalSource = 'spotify';
          }
        } catch (e) {
          console.warn('[SongUrl] Failed to fetch Spotify track details:', e.message);
        }
      }

      // If YouTube source or ID looks like a video ID (length 11), get stream directly from videoId (sid)
      if ((finalSource === 'youtube' || (sid && sid.length === 11)) && sid) {
        const directUrl = await ytdlpGetAudioUrl(sid);
        if (directUrl) {
          sendJSON(res, {
            provider: 'youtube',
            url: directUrl,
            videoId: sid,
            title: finalTrackName,
            playable: true,
            via: 'yt-dlp',
          });
          return;
        }
      }
      
      // If Spotify preview URL exists and user just wants preview, return it
      if (previewUrl) {
        sendJSON(res, { provider: 'spotify-preview', url: previewUrl, playable: true, preview: true });
        return;
      }
      // Otherwise search YouTube
      const info = await handleYouTubeAudioUrl(finalTrackName, finalArtistName, sid);
      sendJSON(res, info);
    } catch (err) { console.error('[SongUrl]', err); sendJSON(res, { error: err.message, url: '', playable: false }, 500); }
    return;
  }

  // ---- YouTube search ----
  if (pn === '/api/youtube/search') {
    try {
      const q          = url.searchParams.get('q')           || '';
      const maxResults = parseInt(url.searchParams.get('max') || '5', 10) || 5;
      if (!q) { sendJSON(res, { videos: [] }); return; }
      const videos = await youtubeSearch(q, maxResults);
      sendJSON(res, { videos });
    } catch (err) { sendJSON(res, { error: err.message, videos: [] }, 500); }
    return;
  }

  // ---- Lyrics (lrclib) ----
  if (pn === '/api/lyric') {
    try {
      const id          = url.searchParams.get('id')          || '';
      const trackName   = url.searchParams.get('name')        || '';
      const artistName  = url.searchParams.get('artist')      || '';
      const albumName   = url.searchParams.get('album')       || '';
      const durationMs  = parseInt(url.searchParams.get('duration') || '0', 10) || 0;
      const source      = url.searchParams.get('source')      || '';
      
      if (!trackName && !id) { sendJSON(res, { error: 'Missing track info', lyric: '' }, 400); return; }
      
      let cleanedTrackName = trackName;
      let cleanedArtistName = artistName;
      
      if (source === 'youtube') {
        cleanedTrackName = cleanYoutubeTitle(trackName);
        if (cleanedTrackName.includes('-')) {
          const parts = cleanedTrackName.split('-');
          cleanedArtistName = parts[0].trim();
          cleanedTrackName = parts[1].trim();
        }
      }
      
      const data = await handleLyric(id, cleanedTrackName, cleanedArtistName, albumName, durationMs);
      sendJSON(res, data);
    } catch (err) { console.error('[Lyric]', err); sendJSON(res, { error: err.message, lyric: '' }, 500); }
    return;
  }

  // ---- Artist detail (Spotify) ----
  if (pn === '/api/artist/detail') {
    try {
      const id    = url.searchParams.get('id')    || '';
      const limit = url.searchParams.get('limit') || '20';
      if (!id) { sendJSON(res, { error: 'Missing artist id', songs: [] }, 400); return; }
      const data = await handleArtistDetail(id, limit);
      sendJSON(res, data);
    } catch (err) { console.error('[ArtistDetail]', err); sendJSON(res, { error: err.message, songs: [] }, 500); }
    return;
  }

  // ---- User playlists (Spotify user) ----
  if (pn === '/api/user/playlists') {
    try { sendJSON(res, await handleUserPlaylists()); }
    catch (err) { sendJSON(res, { loggedIn: false, error: err.message, playlists: [] }, 500); }
    return;
  }

  // ---- Playlist tracks ----
  if (pn === '/api/playlist/tracks') {
    try {
      const id = url.searchParams.get('id') || '';
      if (!id) { sendJSON(res, { error: 'Missing playlist id', tracks: [] }, 400); return; }
      const data = await handlePlaylistTracks(id);
      sendJSON(res, data);
    } catch (err) { console.error('[PlaylistTracks]', err); sendJSON(res, { error: err.message, tracks: [] }, 500); }
    return;
  }

  // ---- Album tracks ----
  if (pn === '/api/album/tracks') {
    try {
      const id = url.searchParams.get('id') || '';
      if (!id) { sendJSON(res, { error: 'Missing album id', tracks: [] }, 400); return; }
      const data = await handleAlbumTracks(id);
      sendJSON(res, data);
    } catch (err) { sendJSON(res, { error: err.message, tracks: [] }, 500); }
    return;
  }

  // ---- Login status (Spotify) ----
  if (pn === '/api/login/status') {
    try { sendJSON(res, await getSpotifyLoginInfo()); }
    catch (err) { sendJSON(res, { loggedIn: false, provider: 'spotify', error: err.message }); }
    return;
  }

  // ---- Spotify OAuth callback ----
  if (pn === '/api/spotify/auth/callback') {
    try {
      const body = await readRequestBody(req);
      const code         = body.code         || url.searchParams.get('code')          || '';
      const codeVerifier = body.codeVerifier || url.searchParams.get('code_verifier') || '';
      const redirectUri  = body.redirectUri  || url.searchParams.get('redirect_uri')  || SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${PORT}/api/spotify/auth/callback`;
      if (!code) { sendJSON(res, { error: 'MISSING_CODE' }, 400); return; }
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: SPOTIFY_CLIENT_ID,
      });
      if (codeVerifier) params.set('code_verifier', codeVerifier);
      const creds = Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64');
      const resp = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!resp.ok) { const txt = await resp.text(); sendJSON(res, { error: 'TOKEN_EXCHANGE_FAILED', detail: txt }, 400); return; }
      const data = await resp.json();
      const tok = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        scope: data.scope || '',
      };
      saveSpotifyUserToken(tok);
      const userInfo = await getSpotifyLoginInfo();
      
      const isGet = req.method === 'GET' || !req.headers['content-type'] || !req.headers['content-type'].includes('json');
      if (isGet) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Mineradio - Spotify Login Success</title>
            <style>
              body { background: #0c0f12; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
              h1 { color: #1db954; font-size: 24px; margin-bottom: 16px; }
              p { font-size: 15px; color: #94a3b8; line-height: 1.5; }
              .logo { font-size: 32px; font-weight: bold; margin-bottom: 24px; background: linear-gradient(135deg, #1db954, #19e68c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">Mineradio</div>
              <h1>Đăng nhập thành công!</h1>
              <p>Bạn đã liên kết tài khoản Spotify thành công với Mineradio. Bây giờ bạn có thể đóng trình duyệt này và quay lại ứng dụng để thưởng thức âm nhạc.</p>
            </div>
          </body>
          </html>
        `);
      } else {
        sendJSON(res, { ...userInfo, saved: true });
      }
    } catch (err) { sendJSON(res, { error: err.message, loggedIn: false }, 500); }
    return;
  }

  // ---- Spotify OAuth initiate (returns auth URL) ----
  if (pn === '/api/spotify/auth/init') {
    const redirectUri = url.searchParams.get('redirect_uri') || SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${PORT}/api/spotify/auth/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    const scope = 'user-read-private user-read-email user-top-read playlist-read-private playlist-read-collaborative user-library-read streaming user-modify-playback-state user-read-playback-state';
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    sendJSON(res, { authUrl: authUrl.toString(), state });
    return;
  }

  // ---- Spotify user token (for Web Playback SDK) ----
  if (pn === '/api/spotify/token') {
    try {
      const token = await getUserAccessToken();
      if (!token) { sendJSON(res, { error: 'SPOTIFY_NOT_LOGGED_IN', loggedIn: false }, 401); return; }
      const info = spotifyUserToken || {};
      sendJSON(res, { token, expiresAt: info.expires_at || 0, loggedIn: true });
    } catch (err) { sendJSON(res, { error: err.message, loggedIn: false }, 500); }
    return;
  }

  // ---- Logout ----
  if (pn === '/api/logout') {
    saveSpotifyUserToken(null);
    sendJSON(res, { ok: true, loggedIn: false, provider: 'spotify' });
    return;
  }

  // ---- Podcast Search (Spotify) ----
  if (pn === '/api/podcast/search') {
    try {
      const kw = String(url.searchParams.get('keywords') || '').trim();
      const limit = Math.max(6, Math.min(30, parseInt(url.searchParams.get('limit') || '18', 10) || 18));
      if (!kw) { sendJSON(res, { podcasts: [] }); return; }
      
      const data = await spotifyFetch('/search', { q: kw, type: 'show', limit });
      const raw = (data.shows && data.shows.items) || [];
      const podcasts = raw.map(mapSpotifyShow).filter(p => p && p.id);
      sendJSON(res, { podcasts, total: data.shows ? data.shows.total : podcasts.length });
    } catch (err) {
      console.error('[PodcastSearch]', err);
      sendJSON(res, { error: err.message, podcasts: [] }, 500);
    }
    return;
  }

  // ---- Podcast Hot (Spotify) ----
  if (pn === '/api/podcast/hot') {
    try {
      const limit = Math.max(6, Math.min(30, parseInt(url.searchParams.get('limit') || '18', 10) || 18));
      const data = await spotifyFetch('/search', { q: 'podcast', type: 'show', limit });
      const raw = (data.shows && data.shows.items) || [];
      const podcasts = raw.map(mapSpotifyShow).filter(p => p && p.id);
      sendJSON(res, { podcasts, more: false });
    } catch (err) {
      console.error('[PodcastHot]', err);
      sendJSON(res, { error: err.message, podcasts: [] }, 500);
    }
    return;
  }

  // ---- Podcast Detail (Spotify) ----
  if (pn === '/api/podcast/detail') {
    try {
      const rid = url.searchParams.get('id') || url.searchParams.get('rid');
      if (!rid) { sendJSON(res, { error: 'Missing podcast id' }, 400); return; }
      const data = await spotifyFetch('/shows/' + rid, { market: 'VN' });
      sendJSON(res, { podcast: mapSpotifyShow(data) });
    } catch (err) {
      console.error('[PodcastDetail]', err);
      sendJSON(res, { error: err.message }, 500);
    }
    return;
  }

  // ---- Podcast Programs/Episodes (Spotify) ----
  if (pn === '/api/podcast/programs') {
    try {
      const rid = url.searchParams.get('id') || url.searchParams.get('rid');
      if (!rid) { sendJSON(res, { error: 'Missing podcast id', programs: [] }, 400); return; }
      const limit = Math.max(10, Math.min(60, parseInt(url.searchParams.get('limit') || '30', 10) || 30));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      
      const showData = await spotifyFetch('/shows/' + rid, { market: 'VN' });
      const epsData = await spotifyFetch(`/shows/${rid}/episodes`, { market: 'VN', limit, offset });
      
      const radio = mapSpotifyShow(showData);
      const raw = epsData.items || [];
      const programs = raw.map(ep => mapSpotifyEpisode(ep, radio)).filter(p => p && p.id);
      
      sendJSON(res, { radio, programs, more: !!epsData.next, total: epsData.total || programs.length });
    } catch (err) {
      console.error('[PodcastPrograms]', err);
      sendJSON(res, { error: err.message, programs: [] }, 500);
    }
    return;
  }

  // ---- User Saved Podcasts / Shows (Spotify) ----
  if (pn === '/api/podcast/my') {
    try {
      const token = await getUserAccessToken();
      if (!token) {
        const empty = ['collect', 'created', 'liked'].map(k => ({ key: k, name: k === 'collect' ? 'Đã lưu' : (k === 'created' ? 'Đã tạo' : 'Yêu thích'), items: [] }));
        sendJSON(res, { loggedIn: false, collections: empty });
        return;
      }
      
      const data = await spotifyUserFetch('/me/shows', { limit: 12 });
      const raw = (data.items || []).map(item => mapSpotifyShow(item.show)).filter(p => p && p.id);
      
      const collections = [
        { key: 'collect', name: 'Đã lưu', items: raw },
        { key: 'created', name: 'Đã tạo', items: [] },
        { key: 'liked', name: 'Yêu thích', items: [] }
      ];
      sendJSON(res, { loggedIn: true, collections });
    } catch (err) {
      console.error('[MyPodcast]', err);
      sendJSON(res, { error: err.message, collections: [] }, 500);
    }
    return;
  }

  // ---- User Saved Podcast Items (Spotify) ----
  if (pn === '/api/podcast/my/items') {
    try {
      const token = await getUserAccessToken();
      if (!token) { sendJSON(res, { loggedIn: false, items: [] }); return; }
      
      const key = String(url.searchParams.get('key') || 'collect');
      const limit = parseInt(url.searchParams.get('limit') || '36', 10) || 36;
      const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
      
      if (key === 'collect') {
        const data = await spotifyUserFetch('/me/shows', { limit, offset });
        const items = (data.items || []).map(item => mapSpotifyShow(item.show)).filter(p => p && p.id);
        sendJSON(res, { loggedIn: true, key, name: 'Đã lưu', itemType: 'podcast-radio', items });
      } else {
        sendJSON(res, { loggedIn: true, key, name: 'Khác', itemType: 'podcast-radio', items: [] });
      }
    } catch (err) {
      console.error('[MyPodcastItems]', err);
      sendJSON(res, { error: err.message, items: [] }, 500);
    }
    return;
  }

  // ---- Podcast DJ beatmap (kept for compatibility) ----
  if (pn === '/api/podcast/dj-beatmap') {
    try {
      const audioUrl   = url.searchParams.get('url');
      const durationSec = Math.max(0, Number(url.searchParams.get('duration') || 0) || 0);
      if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) { sendJSON(res, { error: 'Invalid audio url' }, 400); return; }
      const introSec = Math.max(0, Number(url.searchParams.get('intro') || 0) || 0);
      const map = introSec
        ? await analyzePodcastDjIntro(audioUrl, { durationSec, introSec, userAgent: UA })
        : await analyzePodcastDjStream(audioUrl, { durationSec, userAgent: UA });
      sendJSON(res, { ok: true, map });
    } catch (err) { sendJSON(res, { ok: false, error: err.message || String(err) }, 500); }
    return;
  }

  // ---- Cover proxy (CORS bypass for canvas) ----
  if (pn === '/api/cover') {
    try {
      const coverUrl = url.searchParams.get('url');
      if (!coverUrl || !/^https?:\/\//i.test(coverUrl)) { res.writeHead(400, { 'Access-Control-Allow-Origin': '*' }); res.end('Invalid cover url'); return; }
      const resp = await fetch(coverUrl, { headers: { 'User-Agent': UA } });
      const ct = resp.headers.get('content-type') || 'image/jpeg';
      const cl = resp.headers.get('content-length');
      const hdr = { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'public, max-age=86400' };
      if (cl) hdr['Content-Length'] = cl;
      res.writeHead(resp.status, hdr);
      const reader = resp.body.getReader();
      while (true) { const c = await reader.read(); if (c.done) break; res.write(c.value); }
      res.end();
    } catch (err) { console.error('[Cover]', err); res.writeHead(500); res.end(); }
    return;
  }

  // ---- Audio proxy (supports Range) ----
  if (pn === '/api/audio') {
    try {
      const audioUrl = url.searchParams.get('url');
      if (!audioUrl) { res.writeHead(400); res.end('Missing url'); return; }
      const range = req.headers.range || '';
      const hdr = { 'User-Agent': UA };
      if (range) hdr.Range = range;
      const up = await fetch(audioUrl, { headers: hdr });
      const out = {
        'Content-Type': audioContentTypeForUrl(audioUrl, up.headers.get('content-type')),
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
      };
      const cl = up.headers.get('content-length'); if (cl) out['Content-Length'] = cl;
      const cr = up.headers.get('content-range');  if (cr) out['Content-Range']  = cr;
      res.writeHead(up.status, out);
      const reader = up.body.getReader();
      while (true) { const c = await reader.read(); if (c.done) break; res.write(c.value); }
      res.end();
    } catch (err) { console.error('[Audio]', err); res.writeHead(500); res.end(); }
    return;
  }

  // ---- Static files ----
  if (pn === '/favicon.ico') {
    serveStatic(res, path.join(__dirname, 'build', 'icon.ico'));
    return;
  }
  let filePath = pn === '/' ? '/index.html' : pn;
  filePath = path.join(__dirname, 'public', filePath);
  serveStatic(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log('======================================================');
  console.log(' Mineradio v' + APP_VERSION + '  →  http://localhost:' + PORT);
  console.log(' Nguon nhac: Spotify + YouTube');
  console.log(' Loi bai hat: lrclib.net');
  console.log(' Spotify Client ID: ' + SPOTIFY_CLIENT_ID.slice(0, 8) + '...');
  console.log('======================================================');
});

module.exports = server;
