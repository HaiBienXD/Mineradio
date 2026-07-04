// Script to find all visible text in index.html that needs translation
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const lines = html.split('\n');

const results = [];
lines.forEach((line, i) => {
  // Find lines with Chinese characters
  if (/[\u4e00-\u9fff]/.test(line)) {
    results.push({ line: i + 1, content: line.trim().slice(0, 200) });
  }
});

// Also find HTML elements with user-visible English labels
const uiLines = [];
lines.forEach((line, i) => {
  if (/>(TOUCH TO START|CLICK TO BEGIN|TAP TO ENTER|ENTER|Play|Pause|Search|Login|Logout|Volume|Settings|Playlist|Lyrics|Queue|Share|Like|Add to|Remove|Delete|Clear|Next|Previous|Shuffle|Repeat|Download|Upload|Save|Cancel|Confirm|Close|Back|Home|Discover|Library|History|Now Playing|Recently Played|Recommended|Top Songs|New Release|Artist|Album|Genre|No results|Loading|Error|Retry|Skip|More|Less|Show all|See all|View all)</.test(line)) {
    uiLines.push({ line: i + 1, content: line.trim().slice(0, 200) });
  }
});

console.log('=== CHINESE TEXT LINES ===');
results.forEach(r => console.log(`L${r.line}: ${r.content}`));
console.log('\n=== UI LABELS ===');
uiLines.forEach(r => console.log(`L${r.line}: ${r.content}`));
