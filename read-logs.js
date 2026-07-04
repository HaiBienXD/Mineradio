const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\480ab941-61f8-4588-8eca-bc27247b6a83\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepNum = 0;
  for await (const line of rl) {
    stepNum++;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'replace_file_content' || tc.name === 'write_to_file' || tc.name === 'multi_replace_file_content') {
            const args = tc.args || {};
            const target = args.TargetFile || args.TargetFile;
            if (target && target.includes('index.html')) {
              console.log(`Step ${stepNum} (${tc.name}):`);
              console.log(JSON.stringify(args, null, 2));
              console.log('--------------------------------------------------');
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

processLineByLine();
