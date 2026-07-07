const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const srkMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const serviceRoleKey = srkMatch ? srkMatch[1].trim() : '';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYWZwcWFtenNocmx4ZXBnbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDIzMjIsImV4cCI6MjA5ODYxODMyMn0.FzQxSBrOXdwRvXdlBsvt9mTS_ypoQ_0_ih-uyRyeigg';

const projectId = '8c4b4bbc-2289-4e32-86d8-d662c2b26347';
const DOC_TECNICA_BUCKET = 'documentacion_tecnica';

async function run() {
  // Login as student
  console.log('Logging in as student...');
  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }});
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: 'ronnygravity@gmail.com',
    password: '12345678'
  });
  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  console.log('✅ Logged in as:', authData.user.id);

  // Use service role (admin client) for storage — same as the fixed server action
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const userId = authData.user.id;
  const uniqueSuffix = `${Date.now()}-test`;
  const archivoPath = `${projectId}/${userId}/${uniqueSuffix}.pdf`;
  const fileBuffer = Buffer.from('%PDF-1.4 dummy content for test');
  
  console.log('Uploading with admin client to:', archivoPath);
  
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(DOC_TECNICA_BUCKET)
    .upload(archivoPath, fileBuffer, { contentType: 'application/pdf' });
    
  if (uploadError) {
    console.error('❌ Upload failed:', uploadError.message);
    return;
  }
  console.log('✅ Upload succeeded!');
  
  // Now test the participaciones insert with user client
  // (to test the DB RLS insert policy)
  await userClient.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token
  });
  
  // First get the estudiante id
  const { data: estudianteRow } = await userClient.from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userId)
    .single();
    
  console.log('Estudiante:', estudianteRow);
  
  const { data: insertData, error: insertError } = await userClient.from('participaciones').insert({
    id_proyecto: projectId,
    id_estudiante: estudianteRow.id_estudiante,
    estado: 'enviada',
    carta_postulacion: 'Esta es una carta de presentación de prueba con más de 30 caracteres.',
    planteamiento_solucion: 'Este es un planteamiento de solución de más de 30 caracteres de longitud.',
    prototipo_enlaces: ['https://framer.com/mock-prototype'],
    documentacion_tecnica: archivoPath
  }).select();
  
  if (insertError) {
    console.error('❌ DB Insert failed:', insertError.message, insertError.code);
    // Cleanup file
    await adminClient.storage.from(DOC_TECNICA_BUCKET).remove([archivoPath]);
    return;
  }
  
  console.log('✅ DB Insert succeeded!', insertData[0].id_participacion);
  
  // Cleanup
  await userClient.from('participaciones').delete().eq('id_participacion', insertData[0].id_participacion);
  await adminClient.storage.from(DOC_TECNICA_BUCKET).remove([archivoPath]);
  console.log('✅ Cleanup done. Full postulation flow works!');
}

run();
