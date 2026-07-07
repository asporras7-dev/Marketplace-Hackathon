const pg = require('pg');
const { Client } = pg;

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'sa-east-1'
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.snafpqamzshrlxepglri:4WCNNIn5heZsuwp8@${host}:6543/postgres`;
  const client = new Client({ connectionString, connectionTimeoutMillis: 3000 });
  
  try {
    await client.connect();
    console.log(`✅ SUCCESS on region: ${region}`);
    await client.end();
    return true;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('not found') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
      // Wrong region or offline
    } else {
      console.log(`👉 INTERESTING response on region: ${region} - Message: ${msg}`);
      return true;
    }
  }
  return false;
}

async function run() {
  console.log('Testing regions to find database host...');
  for (const region of regions) {
    const found = await testRegion(region);
    if (found) {
      console.log(`Found correct region: ${region}`);
      break;
    }
  }
  console.log('Done testing regions.');
}

run();
