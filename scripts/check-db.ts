import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1, foto_perfil')
  console.log('Usuarios:', data)
}
run()
