const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const serviceRoleKey = match ? match[1].trim() : '';

if (!serviceRoleKey) {
  console.error('Service role key not found');
  process.exit(1);
}

const options = {
  hostname: 'snafpqamzshrlxepglri.supabase.co',
  path: '/rest/v1/rpc/get_my_role', // test if get_my_role exists
  method: 'POST',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('get_my_role response:', res.statusCode, data);
  });
});
req.on('error', (err) => {
  console.error(err);
});
req.end();
