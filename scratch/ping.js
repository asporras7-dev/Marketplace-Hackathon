const https = require('https');

https.get('https://snafpqamzshrlxepglri.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYWZwcWFtenNocmx4ZXBnbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDIzMjIsImV4cCI6MjA5ODYxODMyMn0.FzQxSBrOXdwRvXdlBsvt9mTS_ypoQ_0_ih-uyRyeigg'
  }
}, (res) => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response body:', data);
  });
}).on('error', (err) => {
  console.error('Error pinging url:', err);
});
