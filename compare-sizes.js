const fs = require('fs');
const getStat = p => {
  try { return fs.statSync(p).size; } catch(e) { return 'N/A'; }
};
console.log('Current public/index.html (restored from zip):', getStat('public/index.html'));
console.log('Mineradio-1.1.12/Mineradio-1.1.1/public/index.html:', getStat('c:/Users/Admin/Downloads/Mineradio-1.1.12/Mineradio-1.1.1/public/index.html'));
console.log('Zip backup public/index.html:', getStat('scratch/restore/Mineradio-1.1.1/public/index.html'));
