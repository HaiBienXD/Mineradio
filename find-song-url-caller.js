const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

function search(query) {
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf(query, idx)) !== -1) {
    count++;
    const lineNum = content.substring(0, idx).split('\n').length;
    const line = content.substring(0, idx + 200).split('\n').pop() + content.substring(idx + query.length, idx + 200).split('\n')[0];
    console.log(`L${lineNum}: ${line.slice(0, 150)}`);
    idx += query.length;
  }
  console.log(`Total found for "${query}": ${count}\n`);
}

search('/api/song/url');
