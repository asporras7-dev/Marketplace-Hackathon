const pg = require('pg');
const { Client } = pg;

const config = {
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres',
  password: '4WCNNIn5heZsuwp8',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
    servername: 'db.snafpqamzshrlxepglri.supabase.co'
  }
};

async function run() {
  console.log('Connecting to database via pooler with postgres user and SNI servername...');
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected successfully!');

    // 1. Let's run the add_url_curriculum migration
    console.log('Adding url_curriculum column to public.estudiantes...');
    const res = await client.query('ALTER TABLE public.estudiantes ADD COLUMN IF NOT EXISTS url_curriculum text NULL;');
    console.log('Migration executed successfully:', res);
    
    // 2. Let's check the columns of public.estudiantes table to confirm
    const checkRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'estudiantes' AND table_schema = 'public';
    `);
    console.log('Current columns of public.estudiantes:');
    checkRes.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });

  } catch (err) {
    console.error('Error executing database command:', err);
  } finally {
    await client.end();
  }
}

run();
