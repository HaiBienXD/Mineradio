const fs = require('fs');
const c = fs.readFileSync('public/index.html', 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('var loginStatus') || l.includes('var qqLoginStatus') || l.includes('loginStatus =')) {
    console.log('L' + (i+1) + ':', l.trim().slice(0, 120));
  }
}
