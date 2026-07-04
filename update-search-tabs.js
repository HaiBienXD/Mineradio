const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// replacements
const replacements = [
  // 1. Dịch visual guide steps
  {
    from: `  {
    target: 'stage',
    kicker: '01 / Welcome',
    title: 'Mineradio 是用来听歌的视觉播放器',
    body: '它不是单纯歌单页：搜索或导入一首歌后，封面、歌词、粒子和镜头会跟着音乐一起动。'
  },`,
    to: `  {
    target: 'stage',
    kicker: '01 / Welcome',
    title: 'Mineradio là trình phát nhạc trực quan',
    body: 'Đây không chỉ là trang danh sách phát thông thường: Sau khi tìm kiếm hoặc nhập một bài hát, ảnh bìa, lời bài hát, hạt và camera sẽ chuyển động theo nhạc.'
  },`
  },
  {
    from: `  {
    selector: '#search-box',
    kicker: '02 / Play',
    title: '从搜索或导入开始',
    body: '输入歌名、歌手或关键词即可播放；如果有本地音乐，也可以用导入入口直接放进舞台。'
  },`,
    to: `  {
    selector: '#search-box',
    kicker: '02 / Play',
    title: 'Bắt đầu bằng cách tìm kiếm hoặc nhập nhạc',
    body: 'Nhập tên bài hát, ca sĩ hoặc từ khóa để phát; nếu có nhạc trên máy, bạn cũng có thể kéo trực tiếp vào sân khấu.'
  },`
  },
  {
    from: `  {
    selector: '#bottom-bar',
    kicker: '03 / Control',
    title: '播放以后看底部控制台',
    body: '播放、切歌、进度、队列和歌词都集中在底部，先把它当作一个正常播放器使用就可以。'
  },`,
    to: `  {
    selector: '#bottom-bar',
    kicker: '03 / Control',
    title: 'Sau khi phát, hãy xem bảng điều khiển phía dưới',
    body: 'Phát, chuyển bài, tiến trình, hàng đợi và lời bài hát đều tập trung ở phía dưới, trước tiên bạn cứ sử dụng như một trình phát nhạc bình thường.'
  },`
  },
  {
    from: `  {
    selector: '#user-btn',
    kicker: '04 / Account',
    title: '登录只是为了同步你的音乐库',
    body: '登录后会同步歌单、红心和播客；不登录也可以搜索和播放，不会强制卡住你。'
  },`,
    to: `  {
    selector: '#user-btn',
    kicker: '04 / Account',
    title: 'Đăng nhập chỉ để đồng bộ hóa thư viện nhạc của bạn',
    body: 'Sau khi đăng nhập sẽ đồng bộ danh sách phát, bài hát yêu thích và podcast; không đăng nhập vẫn có thể tìm kiếm và phát bình thường.'
  },`
  },
  {
    from: `  {
    target: 'shelf',
    kicker: '05 / Visual',
    title: '进阶视觉都放在舞台周围',
    body: '右侧 3D 歌单架和 DIY 玩家模式是进阶入口；先播放一首歌，再慢慢调视觉效果。'
  },`,
    to: `  {
    target: 'shelf',
    kicker: '05 / Visual',
    title: 'Các hiệu ứng nâng cao được bố trí quanh sân khấu',
    body: 'Kệ 3D bên phải và chế độ DIY là các lối vào nâng cao; hãy phát một bài hát trước rồi từ từ điều chỉnh hiệu ứng.'
  },`
  },
  {
    from: `  {
    selector: '#diy-mode-btn',
    kicker: '06 / DIY',
    title: '高级功能在 DIY 玩家模式',
    body: '视觉控制台、上传/封面、自定义歌词、音质和更多面板都会在这里展开。'
  }`,
    to: `  {
    selector: '#diy-mode-btn',
    kicker: '06 / DIY',
    title: 'Các tính năng nâng cao nằm trong chế độ DIY',
    body: 'Bảng điều khiển trực quan, tải lên/ảnh bìa, tùy chỉnh lời bài hát, chất lượng âm thanh và nhiều bảng điều khiển khác sẽ được hiển thị tại đây.'
  }`
  },
  // visualGuideStepsDiy
  {
    from: `  {
    selector: '#diy-mode-btn',
    kicker: '01 / DIY',
    title: 'DIY 玩家模式已展开',
    body: '这里可以随时切回默认模式。DIY 模式会显示完整控制台、上传、视觉面板和高级调参。'
  },`,
    to: `  {
    selector: '#diy-mode-btn',
    kicker: '01 / DIY',
    title: 'Chế độ DIY đã được mở rộng',
    body: 'Tại đây bạn có thể quay lại chế độ mặc định bất kỳ lúc nào. Chế độ DIY sẽ hiển thị đầy đủ bảng điều khiển, nút tải lên, bảng điều khiển hình ảnh và cấu hình nâng cao.'
  },`
  },
  {
    from: `  {
    selector: '#search-box',
    kicker: '02 / Search',
    title: '搜索源和导入入口会展开',
    body: '顶部搜索支持更多来源切换，上传歌曲、封面等入口也会在 DIY 模式中显示。'
  },`,
    to: `  {
    selector: '#search-box',
    kicker: '02 / Search',
    title: 'Nguồn tìm kiếm và cổng nhập nhạc sẽ mở rộng',
    body: 'Thanh tìm kiếm phía trên hỗ trợ chuyển đổi nhiều nguồn hơn, các cổng tải lên bài hát, ảnh bìa cũng sẽ hiển thị ở chế độ DIY.'
  },`
  },
  {
    from: `  {
    selector: '#playlist-panel',
    kicker: '03 / Library',
    title: '左侧是完整歌单和队列',
    body: '靠近左侧边缘可以打开歌单/队列面板，在这里管理队列、个人歌单和播客。'
  },`,
    to: `  {
    selector: '#playlist-panel',
    kicker: '03 / Library',
    title: 'Bên trái là danh sách phát và hàng đợi đầy đủ',
    body: 'Rê chuột sát cạnh trái để mở bảng điều khiển danh sách/hàng đợi, tại đây bạn có thể quản lý hàng đợi, danh sách phát cá nhân và podcast.'
  },`
  },
  {
    from: `  {
    selector: '#fx-panel',
    kicker: '04 / Visual Lab',
    title: '右侧是视觉控制台',
    body: '靠近右下角或点击视觉按钮，可以调节粒子、歌词、镜头、3D 歌单架 and 更多视觉参数。'
  },`,
    to: `  {
    selector: '#fx-panel',
    kicker: '04 / Visual Lab',
    title: 'Bên phải là bảng điều khiển trực quan',
    body: 'Rê chuột sát cạnh phải hoặc click nút trực quan để điều chỉnh hạt, lời bài hát, camera, kệ 3D và nhiều thông số trực quan khác.'
  },`
  },
  {
    from: `  {
    selector: '#quality-control',
    kicker: '05 / Controls',
    title: '高级播放控制会补全',
    body: '音质、播放顺序、收藏、歌词源和更多按钮会在 DIY 模式中完整显示。'
  },`,
    to: `  {
    selector: '#quality-control',
    kicker: '05 / Controls',
    title: 'Bộ kiểm soát phát nhạc nâng cao sẽ được bổ sung',
    body: 'Chất lượng âm thanh, thứ tự phát, yêu thích, nguồn lời bài hát và nhiều nút bấm khác sẽ hiển thị đầy đủ trong chế độ DIY.'
  },`
  },
  {
    from: `  {
    target: 'shelf',
    kicker: '06 / Shelf',
    title: '3D 歌单架支持直接打开',
    body: '右侧的 3D 歌单架会在靠近时半透明浮现，点击卡片可打开歌单，点卡片里的播放按钮可直接播放整张歌单。'
  }`,
    to: `  {
    target: 'shelf',
    kicker: '06 / Shelf',
    title: 'Kệ 3D hỗ trợ mở trực tiếp',
    body: 'Kệ 3D bên phải sẽ hiện lên bán trong suốt khi đến gần, click vào thẻ để mở danh sách phát, click nút phát trong thẻ để phát trực tiếp cả danh sách.'
  }`
  },
  // Nút Next/Finish và Hint
  {
    from: "if (hint) hint.textContent = visualGuideStep === steps.length - 1 ? '点击空白处完成引导' : '点击空白处也可以继续';",
    to: "if (hint) hint.textContent = visualGuideStep === steps.length - 1 ? 'Click vào khoảng trống để hoàn tất hướng dẫn' : 'Click vào khoảng trống cũng có thể tiếp tục';"
  },
  {
    from: "if (next) next.textContent = visualGuideStep === steps.length - 1 ? '完成' : '下一步';",
    to: "if (next) next.textContent = visualGuideStep === steps.length - 1 ? 'Hoàn tất' : 'Tiếp theo';"
  },

  // 2. Thay đổi HTML của search tabs (xóa QQ, thay All thành Spotify, NE thành YouTube)
  {
    from: `<div id="search-mode-tabs" class="search-mode-tabs" role="tablist" aria-label="Search mode">
      <button id="search-mode-song" class="active" type="button" onclick="setSearchMode('song')" aria-selected="true">All</button>
      <button id="search-mode-netease" type="button" onclick="setSearchMode('netease')" aria-selected="false">NE</button>
      <button id="search-mode-qq" type="button" onclick="setSearchMode('qq')" aria-selected="false">QQ</button>
      <button id="search-mode-podcast" type="button" onclick="setSearchMode('podcast')" aria-selected="false">Podcast</button>
    </div>`,
    to: `<div id="search-mode-tabs" class="search-mode-tabs" role="tablist" aria-label="Search mode">
      <button id="search-mode-song" class="active" type="button" onclick="setSearchMode('song')" aria-selected="true">Spotify</button>
      <button id="search-mode-netease" type="button" onclick="setSearchMode('netease')" aria-selected="false">YouTube</button>
      <button id="search-mode-podcast" type="button" onclick="setSearchMode('podcast')" aria-selected="false">Podcast</button>
    </div>`
  },

  // 3. Hàm updateSearchModeTabs (bỏ qqBtn, dịch placeholder)
  {
    from: `function updateSearchModeTabs() {
  var songBtn = document.getElementById('search-mode-song');
  var neteaseBtn = document.getElementById('search-mode-netease');
  var qqBtn = document.getElementById('search-mode-qq');
  var podcastBtn = document.getElementById('search-mode-podcast');
  if (songBtn) {
    songBtn.classList.toggle('active', searchMode === 'song');
    songBtn.setAttribute('aria-selected', searchMode === 'song' ? 'true' : 'false');
  }
  if (neteaseBtn) {
    neteaseBtn.classList.toggle('active', searchMode === 'netease');
    neteaseBtn.setAttribute('aria-selected', searchMode === 'netease' ? 'true' : 'false');
  }
  if (qqBtn) {
    qqBtn.classList.toggle('active', searchMode === 'qq');
    qqBtn.setAttribute('aria-selected', searchMode === 'qq' ? 'true' : 'false');
  }
  if (podcastBtn) {
    podcastBtn.classList.toggle('active', searchMode === 'podcast');
    podcastBtn.setAttribute('aria-selected', searchMode === 'podcast' ? 'true' : 'false');
  }
  if ($input) {
    $input.placeholder = searchMode === 'podcast'
      ? '搜索播客、电台...'
      : (searchMode === 'qq' ? '搜索 QQ 音乐...' : (searchMode === 'netease' ? '搜索网易云音乐...' : '搜索歌曲、歌手...'));
  }
  requestAnimationFrame(updateSearchPillGlassDisplacementMap);
}`,
    to: `function updateSearchModeTabs() {
  var songBtn = document.getElementById('search-mode-song');
  var neteaseBtn = document.getElementById('search-mode-netease');
  var podcastBtn = document.getElementById('search-mode-podcast');
  if (songBtn) {
    songBtn.classList.toggle('active', searchMode === 'song');
    songBtn.setAttribute('aria-selected', searchMode === 'song' ? 'true' : 'false');
  }
  if (neteaseBtn) {
    neteaseBtn.classList.toggle('active', searchMode === 'netease');
    neteaseBtn.setAttribute('aria-selected', searchMode === 'netease' ? 'true' : 'false');
  }
  if (podcastBtn) {
    podcastBtn.classList.toggle('active', searchMode === 'podcast');
    podcastBtn.setAttribute('aria-selected', searchMode === 'podcast' ? 'true' : 'false');
  }
  if ($input) {
    $input.placeholder = searchMode === 'podcast'
      ? 'Tìm kiếm podcast...'
      : (searchMode === 'netease' ? 'Tìm kiếm trên YouTube...' : 'Tìm kiếm bài hát, ca sĩ...');
  }
  requestAnimationFrame(updateSearchPillGlassDisplacementMap);
}`
  },

  // 4. Hàm setSearchMode (bỏ qq)
  {
    from: "mode = (mode === 'podcast' || mode === 'netease' || mode === 'qq') ? mode : 'song';",
    to: "mode = (mode === 'podcast' || mode === 'netease') ? mode : 'song';"
  },

  // 5. Hàm fetchMusicSearchResults
  {
    from: `async function fetchMusicSearchResults(q, mode) {
  if (mode === 'qq') {
    var qqOnly = await apiJson('/api/qq/search?keywords=' + encodeURIComponent(q) + '&limit=12');
    return mergeSongSearchResults([], qqOnly.songs || [], 18, q);
  }
  if (mode === 'netease') {
    var neOnly = await apiJson('/api/search?keywords=' + encodeURIComponent(q) + '&limit=18');
    return mergeSongSearchResults(neOnly.songs || [], [], 18, q);
  }
  var result = await Promise.allSettled([
    apiJson('/api/search?keywords=' + encodeURIComponent(q) + '&limit=14'),
    apiJson('/api/qq/search?keywords=' + encodeURIComponent(q) + '&limit=12')
  ]);
  var neteaseSongs = result[0].status === 'fulfilled' ? ((result[0].value && result[0].value.songs) || []) : [];
  var qqSongs = result[1].status === 'fulfilled' ? ((result[1].value && result[1].value.songs) || []) : [];
  if (result[1].status === 'rejected') console.warn('QQ search failed:', result[1].reason);
  return mergeSongSearchResults(neteaseSongs, qqSongs, 18, q);
}`,
    to: `async function fetchMusicSearchResults(q, mode) {
  if (mode === 'netease') {
    var ytOnly = await apiJson('/api/search?keywords=' + encodeURIComponent(q) + '&provider=youtube&limit=18');
    return ytOnly.songs || [];
  }
  var spOnly = await apiJson('/api/search?keywords=' + encodeURIComponent(q) + '&provider=spotify&limit=18');
  return spOnly.songs || [];
}`
  }
];

let appliedCount = 0;
for (const r of replacements) {
  if (content.includes(r.from)) {
    content = content.replace(r.from, r.to);
    appliedCount++;
  } else {
    // try removing potential carriage returns
    const cleanFrom = r.from.replace(/\r\n/g, '\n');
    const cleanContent = content.replace(/\r\n/g, '\n');
    if (cleanContent.includes(cleanFrom)) {
      content = cleanContent.replace(cleanFrom, r.to.replace(/\r\n/g, '\n'));
      appliedCount++;
    } else {
      console.log('Not found:', r.from);
    }
  }
}

fs.writeFileSync('public/index.html', content, 'utf8');
console.log(`Search tabs and visual guide update applied: ${appliedCount}/${replacements.length}`);
