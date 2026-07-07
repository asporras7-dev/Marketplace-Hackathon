const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const serviceRoleKey = match ? match[1].trim() : '';

if (!serviceRoleKey) {
  console.error('Service role key not found');
  process.exit(1);
}

// List all buckets using the storage admin API
const options = {
  hostname: 'snafpqamzshrlxepglri.supabase.co',
  path: '/storage/v1/bucket',
  method: 'GET',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Buckets:', JSON.stringify(parsed, null, 2));
    } catch {
      console.log('Raw:', data);
    }
  });
});
req.on('error', (err) => {
  console.error(err);
});
req.end();
