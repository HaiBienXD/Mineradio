const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

// Tìm tất cả các thẻ script
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

console.log("=== Chinese characters inside script tags ===");
while ((match = scriptRegex.exec(content)) !== null) {
  const scriptContent = match[1];
  const lines = scriptContent.split('\n');
  lines.forEach((line, lineIdx) => {
    // Regex tìm ký tự Trung Quốc (Han)
    if (/[\u4e00-\u9fa5]/.test(line)) {
      count++;
      if (count <= 100) {
        // In ra để điều tra
        console.log(`Match ${count} (Line in script approx ${lineIdx + 1}): ${line.trim()}`);
      }
    }
  });
}

console.log(`\nTotal lines with Chinese inside script tags: ${count}`);
