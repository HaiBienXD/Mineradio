const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

function printLines(start, end) {
  console.log(`=== Lines ${start} to ${end} ===`);
  for (let i = start; i <= end; i++) {
    if (lines[i - 1] !== undefined) {
      console.log(`${i}: ${lines[i - 1]}`);
    }
  }
}

printLines(400, 430);
