const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
if (match) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: match[1].trim() });
  client.connect().then(() => {
    return client.query("NOTIFY pgrst, 'reload schema'");
  }).then(() => {
    console.log('Schema reloaded');
    process.exit(0);
  }).catch(e => {
    console.log('Error:', e.message);
    process.exit(1);
  });
} else {
  console.log('NO_DB_URL');
}
