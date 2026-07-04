const fs = require('fs');
const c = fs.readFileSync('public/index.html', 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('logoutActive') || l.includes('logoutActiveAccount') || l.includes('logout(') || l.includes('apiJson(\'/api/logout\')') || l.includes('/api/logout')) {
    console.log('L' + (i+1) + ':', l.trim().slice(0, 120));
  }
}
