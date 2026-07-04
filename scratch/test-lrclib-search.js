async function testLrclibSearch() {
  const query = 'Quân A.P Bông Hoa Đẹp Nhất';
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  console.log('Searching lrclib:', url);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mineradio/1.2.0' } });
    console.log('Status:', resp.status);
    const data = await resp.json();
    console.log('Results length:', data.length);
    if (data.length > 0) {
      console.log('First result:', JSON.stringify(data[0], null, 2).slice(0, 1000));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testLrclibSearch();
