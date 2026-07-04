const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Chèn helpers
const helperTarget = `async function spotifyFetch(endpoint, params) {`;
const helpersCode = `// ---- Spotify Podcast Helpers ----
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

`;

if (content.includes(helperTarget) && !content.includes('mapSpotifyShow')) {
  content = content.replace(helperTarget, helpersCode + helperTarget);
  console.log('Helpers inserted successfully.');
} else {
  console.log('Helpers insertion skipped or already present.');
}

// 2. Chèn routes
const routeTarget = `  // ---- Podcast DJ beatmap (kept for compatibility) ----`;
const routesCode = `  // ---- Podcast Search (Spotify) ----
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
      const epsData = await spotifyFetch(\`/shows/\${rid}/episodes\`, { market: 'VN', limit, offset });
      
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

`;

if (content.includes(routeTarget) && !content.includes('/api/podcast/search')) {
  content = content.replace(routeTarget, routesCode + routeTarget);
  console.log('Routes inserted successfully.');
} else {
  console.log('Routes insertion skipped or already present.');
}

fs.writeFileSync('server.js', content, 'utf8');
