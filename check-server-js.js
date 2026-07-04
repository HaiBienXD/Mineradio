const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

// Tìm các route app.get hoặc app.post
const routes = content.match(/app\.(get|post)\(['"][^'"]+['"]/g);
console.log('Routes in server.js:');
console.log(routes);
