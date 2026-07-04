const fs = require('fs');
try {
  const content = fs.readFileSync('C:\\Users\\Admin\\Desktop\\Mineradio.lnk');
  const matches = content.toString('utf8').match(/[A-Z]:\\[^\x00-\x1f\x7f"<>|]+/g);
  if (matches) {
    console.log('Matches:', matches);
  } else {
    console.log('No matches');
  }
} catch (e) {
  console.error('Error:', e.message);
}
