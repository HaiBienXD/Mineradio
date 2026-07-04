const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

const target = `  {
    selector: '#fx-panel',
    kicker: '04 / Visual Lab',
    title: '右侧是视觉控制台',
    body: '靠近右下角或点击视觉按钮，可以调节粒子、歌词、镜头、3D 歌单架和更多视觉参数。'
  },`;

const replacement = `  {
    selector: '#fx-panel',
    kicker: '04 / Visual Lab',
    title: 'Bên phải là bảng điều khiển trực quan',
    body: 'Rê chuột sát cạnh phải hoặc click nút trực quan để điều chỉnh hạt, lời bài hát, camera, kệ 3D và nhiều thông số trực quan khác.'
  },`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log('Success');
} else {
  const cleanTarget = target.replace(/\r\n/g, '\n');
  const cleanContent = content.replace(/\r\n/g, '\n');
  if (cleanContent.includes(cleanTarget)) {
    content = cleanContent.replace(cleanTarget, replacement.replace(/\r\n/g, '\n'));
    console.log('Success (clean)');
  } else {
    console.log('Not found');
  }
}

fs.writeFileSync('public/index.html', content, 'utf8');
