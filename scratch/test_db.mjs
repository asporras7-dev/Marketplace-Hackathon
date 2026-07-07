import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mgowuyflhiavquztxpqh.supabase.co'
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb3d1eWZsaGlhdnF1enR4cHFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc5MDAxOCwiZXhwIjoyMDk2MzY2MDE4fQ.hSDPo4864pcZKrWxo_v_eNYVHvSrsc_YFsoOQUHf6kU'

const admin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('Querying auth users...')
  const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
  if (authError) {
    console.error('Error listing auth users:', authError)
    return
  }
  
  console.log(`Found ${users.length} auth users. Checking matches in public.usuarios...`)
  for (const user of users) {
    const { data: pubUser, error: pubError } = await admin
      .from('usuarios')
      .select('id_usuario, correo')
      .eq('id_usuario', user.id)
      .maybeSingle()
    
    if (pubError) {
      console.error(`Error querying user ${user.email}:`, pubError)
    } else if (!pubUser) {
      console.log(`❌ Auth user missing in public.usuarios: ${user.email} (ID: ${user.id})`)
    } else {
      console.log(`✅ User match: ${user.email} (ID: ${user.id})`)
    }
  }
}

run()
