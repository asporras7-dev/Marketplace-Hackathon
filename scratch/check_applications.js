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
  path: '/rest/v1/participaciones?select=id_participacion,id_proyecto,id_estudiante,estado&limit=10',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const participaciones = JSON.parse(data);
      console.log('Recent participaciones (applications):');
      if (Array.isArray(participaciones)) {
        participaciones.forEach(p => {
          console.log(`- ID: ${p.id_participacion}, Project: ${p.id_proyecto}, Student: ${p.id_estudiante}, Status: ${p.estado}`);
        });
      } else {
        console.log('Response is not array:', participaciones);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message, 'Response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Network error:', err);
});
