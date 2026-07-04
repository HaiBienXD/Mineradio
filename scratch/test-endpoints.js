const http = require('http');

const PORT = 3000;

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(rawData) });
        } catch (e) {
          resolve({ status: res.statusCode, text: rawData });
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

async function runTests() {
  console.log('--- Starting API Route Verification ---');
  
  try {
    // 1. Check YouTube search
    console.log('\n[1/3] Testing YouTube Search via /api/search?provider=youtube...');
    const searchYtRes = await fetchJson('/api/search?provider=youtube&keywords=phong+nha&limit=2');
    console.log('Status:', searchYtRes.status);
    if (searchYtRes.data && Array.isArray(searchYtRes.data.songs)) {
      console.log('Found songs:', searchYtRes.data.songs.length);
      searchYtRes.data.songs.forEach((song, i) => {
        console.log(`  Song ${i + 1}: "${song.name}" by "${song.artist}" (ID: ${song.id}, Source: ${song.source})`);
      });
      
      // Keep first song ID for audio URL test
      const testVideoId = searchYtRes.data.songs[0]?.id;
      if (testVideoId) {
        // 2. Check YouTube stream URL retrieval for a direct video ID
        console.log(`\n[2/3] Testing YouTube Stream retrieval via /api/song/url?source=youtube&id=${testVideoId}...`);
        const urlRes = await fetchJson(`/api/song/url?source=youtube&id=${testVideoId}&name=Test`);
        console.log('Status:', urlRes.status);
        console.log('Response Details:', {
          provider: urlRes.data?.provider,
          playable: urlRes.data?.playable,
          via: urlRes.data?.via,
          urlType: urlRes.data?.url ? (urlRes.data.url.startsWith('http') ? 'Direct HTTP stream' : 'Other') : 'None'
        });
      }
    } else {
      console.error('Failed to parse search response:', searchYtRes);
    }
    
    // 3. Check Spotify search
    console.log('\n[3/3] Testing Spotify Search via /api/search?provider=spotify...');
    const searchSpRes = await fetchJson('/api/search?provider=spotify&keywords=lofi&limit=2');
    console.log('Status:', searchSpRes.status);
    if (searchSpRes.data && Array.isArray(searchSpRes.data.songs)) {
      console.log('Found songs:', searchSpRes.data.songs.length);
      searchSpRes.data.songs.forEach((song, i) => {
        console.log(`  Song ${i + 1}: "${song.name}" by "${song.artist}" (ID: ${song.id}, Source: ${song.source})`);
      });
    } else {
      console.error('Failed to parse Spotify search response:', searchSpRes);
    }
    
  } catch (e) {
    console.error('Test run failed:', e.message);
  }
}

// Start local server to run tests, then exit
const server = require('../server.js');
// Give server a bit of time to bind, then run tests
setTimeout(async () => {
  await runTests();
  console.log('\nTesting finished. Exiting...');
  process.exit(0);
}, 2000);
