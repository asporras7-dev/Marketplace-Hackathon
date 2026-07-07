const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const serviceRoleKey = match ? match[1].trim() : '';

const userId = 'df2a6ace-21b7-4541-bef8-7d78b1dd0b90';
const projectId = '8c4b4bbc-2289-4e32-86d8-d662c2b26347';

if (!serviceRoleKey) {
  console.error('Service role key not found');
  process.exit(1);
}

// Test upload with service role to isolate RLS vs bucket config issues
const body = Buffer.from('dummy pdf content');
const objectPath = encodeURIComponent(`${projectId}/${userId}/test_service_role.pdf`);

const options = {
  hostname: 'snafpqamzshrlxepglri.supabase.co',
  path: `/storage/v1/object/documentacion_tecnica/${projectId}/${userId}/test_service_role.pdf`,
  method: 'POST',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/pdf',
    'Content-Length': body.length,
  }
};

console.log('Uploading with service role to path:', `${projectId}/${userId}/test_service_role.pdf`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Upload status:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Service role upload succeeded!');
      console.log('Problem is RLS policy (not bucket config)');
      
      // Clean up
      const delOptions = {
        hostname: 'snafpqamzshrlxepglri.supabase.co',
        path: `/storage/v1/object/documentacion_tecnica/${projectId}/${userId}/test_service_role.pdf`,
        method: 'DELETE',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      };
      const delReq = https.request(delOptions, (delRes) => {
        let delData = '';
        delRes.on('data', (c) => delData += c);
        delRes.on('end', () => {
          console.log('Cleanup status:', delRes.statusCode, delData);
        });
      });
      delReq.on('error', console.error);
      delReq.end();
    } else {
      console.log('❌ Service role upload failed! Problem is bucket config or bucket policies');
    }
  });
});
req.on('error', (err) => {
  console.error(err);
});
req.write(body);
req.end();
