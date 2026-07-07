import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mgowuyflhiavquztxpqh.supabase.co'
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb3d1eWZsaGlhdnF1enR4cHFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc5MDAxOCwiZXhwIjoyMDk2MzY2MDE4fQ.hSDPo4864pcZKrWxo_v_eNYVHvSrsc_YFsoOQUHf6kU'

const admin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('Querying first estudiante record with select *...')
  const { data, error } = await admin
    .from('estudiantes')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching estudiantes:', error)
    return
  }
  
  console.log('Columns in estudiantes table:', Object.keys(data[0] || {}))
}

run()
