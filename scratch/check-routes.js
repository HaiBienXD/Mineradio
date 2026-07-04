const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

const routes = {};
lines.forEach((line, idx) => {
  const match = line.match(/if\s*\(pn\s*===\s*['"]([^'"]+)['"]\)/);
  if (match) {
    const route = match[1];
    const lineNum = idx + 1;
    if (!routes[route]) {
      routes[route] = [];
    }
    routes[route].push(lineNum);
  }
});

console.log('Detected route definitions:');
for (const [route, lineNums] of Object.entries(routes)) {
  if (lineNums.length > 1) {
    console.log(`⚠️ DUPLICATE ROUTE: "${route}" at lines: ${lineNums.join(', ')}`);
  } else {
    console.log(`  Route: "${route}" at line ${lineNums[0]}`);
  }
}
