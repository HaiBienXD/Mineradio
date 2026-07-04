const fs = require('fs');
const c1 = fs.readFileSync('public/index.html', 'utf8');
const c2 = fs.readFileSync('c:/Users/Admin/Downloads/Mineradio-1.1.12/Mineradio-1.1.1/public/index.html', 'utf8');
console.log('Is identical:', c1 === c2);
