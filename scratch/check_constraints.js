const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const serviceRoleKey = match ? match[1].trim() : '';

if (!serviceRoleKey) {
  console.error('Service role key not found in .env.local');
  process.exit(1);
}

// We can query pg_constraint using PostgREST's RPC or raw query, but since REST doesn't allow raw queries, we can see if there are any database policies or constraints by reading migration files!
// Wait! Let's check the migration file '20260608000001_initial_schema.sql' for constraints on 'participaciones'!
console.log('Reading migration files for participaciones schema...');
const migrationSql = fs.readFileSync('supabase/migrations/20260608000001_initial_schema.sql', 'utf8');

const regex = /create table public\.participaciones \([\s\S]*?\);/g;
const matchSql = migrationSql.match(regex);
if (matchSql) {
  console.log(matchSql[0]);
} else {
  console.log('Table definition not found in migration.');
}
