async function testNetease() {
  const query = 'The Weeknd Starboy';
  const url = `https://music.xianqiao.wang/neteaseapiv2/search?keywords=${encodeURIComponent(query)}&limit=3`;
  console.log('Searching netease:', url);
  try {
    const resp = await fetch(url);
    console.log('Search Status:', resp.status);
    const data = await resp.json();
    console.log('Search Result:', JSON.stringify(data, null, 2).slice(0, 1000));
    
    const songs = data?.result?.songs || [];
    if (songs.length > 0) {
      songs.forEach((s, i) => {
        console.log(`Song ${i+1}: ${s.name} by ${s.artists?.map(a => a.name).join(', ')} (ID: ${s.id})`);
      });
      const id = songs[0].id;
      const lyricUrl = `https://music.xianqiao.wang/neteaseapiv2/lyric?id=${id}`;
      console.log('Fetching lyrics:', lyricUrl);
      const lResp = await fetch(lyricUrl);
      console.log('Lyric Status:', lResp.status);
      const lData = await lResp.json();
      console.log('Lyric keys:', Object.keys(lData));
      if (lData.yrc) console.log('YRC preview:', lData.yrc.lyric?.slice(0, 200));
      if (lData.lrc) console.log('LRC preview:', lData.lrc.lyric?.slice(0, 200));
      if (lData.tlyric) console.log('TLYRIC preview:', lData.tlyric.lyric?.slice(0, 200));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testNetease();
