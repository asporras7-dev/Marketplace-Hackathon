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
  path: '/rest/v1/proyectos?select=id_proyecto,titulo,estado,is_active&is_active=eq.true&estado=eq.abierto&limit=5',
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
      const proyectos = JSON.parse(data);
      console.log('Open projects:');
      if (Array.isArray(proyectos)) {
        proyectos.forEach(p => {
          console.log(`- ID: ${p.id_proyecto}, Title: ${p.titulo}, Status: ${p.estado}`);
        });
      } else {
        console.log('Response is not array:', proyectos);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message, 'Response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Network error:', err);
});
