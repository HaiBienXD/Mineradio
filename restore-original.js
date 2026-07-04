const fs = require('fs');
fs.copyFileSync('scratch/restore/Mineradio-1.1.1/public/index.html', 'public/index.html');
console.log('Original public/index.html restored successfully.');
