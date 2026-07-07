const https = require('https');

const supabaseUrl = 'https://snafpqamzshrlxepglri.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYWZwcWFtenNocmx4ZXBnbHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzA0MjMyMiwiZXhwIjoyMDk4NjE4MzIyfQ.g7smEb6qHqxKHXuQILx-9pdqePojWIoUy6VvDgwnjO4';

const options = {
  hostname: 'snafpqamzshrlxepglri.supabase.co',
  path: '/rest/v1/estudiantes?select=id_estudiante,id_usuario,estado_verificacion',
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
      const students = JSON.parse(data);
      console.log('Students in database:');
      students.forEach(s => {
        console.log(`- ID: ${s.id_estudiante}, User: ${s.id_usuario}, Verification: ${s.estado_verificacion}`);
      });
    } catch (e) {
      console.error('Error parsing response:', e.message, 'Response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Network error:', err);
});
