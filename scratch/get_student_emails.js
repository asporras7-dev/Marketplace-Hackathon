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
  path: '/rest/v1/usuarios?select=id_usuario,correo&limit=20',
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
      const users = JSON.parse(data);
      console.log('All users:');
      if (Array.isArray(users)) {
        users.forEach(u => {
          console.log(`- Email: ${u.correo}, ID: ${u.id_usuario}`);
        });
      } else {
        console.log('Response is not array:', users);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message, 'Response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Network error:', err);
});
