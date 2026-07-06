import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '../../.env.local' }) // adjust path to .env.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // use service role to bypass auth, but we want to simulate RLS maybe?

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  // Try to find a user id
  const { data: ests } = await supabase.from('estudiantes').select('id_usuario, descripcion').limit(1)
  if (!ests || ests.length === 0) {
    console.error("No estudiantes found")
    return
  }
  const userId = ests[0].id_usuario

  console.log("Original:", ests[0])

  // Attempt upsert with empty string
  const payload = {
    id_usuario: userId,
    descripcion: ""
  }

  const { data, error } = await supabase.from('estudiantes').upsert(payload, { onConflict: 'id_usuario' })
  console.log("Upsert with empty string:", { data, error })

  // Attempt upsert with null location
  const payload2 = {
    id_usuario: userId,
    pais_iso_residencia: null,
    region_residencia: null
  }
  
  const { data: d2, error: e2 } = await supabase.from('estudiantes').upsert(payload2, { onConflict: 'id_usuario' })
  console.log("Upsert with null location:", { data: d2, error: e2 })
}

test()
