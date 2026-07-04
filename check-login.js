const fs = require('fs');
const c = fs.readFileSync('public/index.html', 'utf8');
console.log('Length:', c.length, 'chars');
console.log('spotify idx:', c.indexOf('spotify'));
console.log('Spotify idx:', c.indexOf('Spotify'));
console.log('login idx:', c.indexOf('login'));
console.log('showLogin idx:', c.indexOf('showLogin'));
console.log('openSpotify idx:', c.indexOf('openSpotify'));
console.log('loginModal idx:', c.indexOf('loginModal'));
console.log('modal-login idx:', c.indexOf('modal-login'));
console.log('showAccountModal idx:', c.indexOf('showAccountModal'));
// Find lines with login-related content
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('spotify') || l.includes('Spotify') || l.includes('showLogin') || l.includes('openSpotify')) {
    console.log('L' + (i+1) + ':', l.trim().slice(0, 120));
  }
}
