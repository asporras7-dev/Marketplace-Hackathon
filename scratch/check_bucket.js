const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const serviceRoleKey = match ? match[1].trim() : '';

if (!serviceRoleKey) {
  console.error('Service role key not found in .env.local');
  process.exit(1);
}

const options = {
  hostname: 'snafpqamzshrlxepglri.supabase.co',
  path: '/rest/v1/estudiantes?select=id_estudiante,id_usuario,estado_verificacion&limit=1',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
};

// First, query students just to make sure connectivity works, then check if we can query storage.buckets
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      console.log('Query students response:', data.slice(0, 300));
      
      // Now, query storage buckets
      const bucketOptions = {
        hostname: 'snafpqamzshrlxepglri.supabase.co',
        path: '/storage/v1/bucket',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      };
      
      https.get(bucketOptions, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => data2 += chunk);
        res2.on('end', () => {
          console.log('Buckets list response:', data2);
        });
      }).on('error', (err) => {
        console.error('Error fetching buckets:', err);
      });
      
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Network error:', err);
});
