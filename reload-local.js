const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
client.connect().then(() => {
  return client.query("NOTIFY pgrst, 'reload schema'");
}).then(() => {
  console.log('Schema reloaded');
  process.exit(0);
}).catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});
