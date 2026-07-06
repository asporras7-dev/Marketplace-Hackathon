import pg from 'pg'
const { Client } = pg
const client = new Client('postgres://postgres.snafpqamzshrlxepglri:4WCNNIn5heZsuwp8@aws-0-us-east-1.pooler.supabase.com:6543/postgres')

async function run() {
  await client.connect()
  const res = await client.query(`SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'estudiantes'::regclass;`)
  console.log(res.rows)
  await client.end()
}
run()
