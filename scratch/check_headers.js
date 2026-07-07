const https = require('https');

const options = {
  hostname: 'snafpqamzshrlxepglri.supabase.co',
  path: '/rest/v1/',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYWZwcWFtenNocmx4ZXBnbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDIzMjIsImV4cCI6MjA5ODYxODMyMn0.FzQxSBrOXdwRvXdlBsvt9mTS_ypoQ_0_ih-uyRyeigg'
  }
};

https.get(options, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (err) => {
  console.error('Error:', err);
});
