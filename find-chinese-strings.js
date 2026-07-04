const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

const lines = content.split('\n');
console.log("=== User-facing Chinese Strings ===");
let count = 0;
lines.forEach((line, idx) => {
  // Bỏ qua chú thích comment //
  const cleanLine = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/[\u4e00-\u9fa5]/.test(cleanLine)) {
    count++;
    console.log(`L${idx + 1}: ${cleanLine.trim()}`);
  }
});
console.log(`Total user-facing Chinese lines: ${count}`);
