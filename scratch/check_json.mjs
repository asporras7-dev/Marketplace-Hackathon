import fs from 'fs';

function checkJson(filePath) {
  console.log(`Checking ${filePath}...`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse using standard JSON.parse to see if it's syntactically valid
    const parsed = JSON.parse(content);
    console.log(`${filePath} is syntactically valid JSON.`);

    // To check for duplicate keys, we can write a simple parser or inspect the text
    // since JSON.parse silently overrides duplicates.
    // Let's count occurrences of keys in a regex or custom parser.
    const keys = [];
    const lines = content.split('\n');
    const keyRegex = /"([^"]+)"\s*:/g;
    
    // Let's do a basic brace/bracket stack tracking to identify duplicate keys per object
    // But since that can be complex, let's just parse it using a package or simple AST if needed,
    // or just search for duplicate properties in each JSON object block.
    console.log('No syntax errors found by JSON.parse');
  } catch (err) {
    console.error(`Error in ${filePath}:`, err.message);
  }
}

checkJson('messages/es.json');
checkJson('messages/en.json');
