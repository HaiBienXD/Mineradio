const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');
console.log(`Total lines: ${lines.length}`);
for (let i = 0; i < 100; i++) {
  if (lines[i] !== undefined) console.log(`${i+1}: ${lines[i]}`);
}
