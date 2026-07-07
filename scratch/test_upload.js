const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';

if (!supabaseUrl) {
  console.error('Missing credentials');
  process.exit(1);
}

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYWZwcWFtenNocmx4ZXBnbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDIzMjIsImV4cCI6MjA5ODYxODMyMn0.FzQxSBrOXdwRvXdlBsvt9mTS_ypoQ_0_ih-uyRyeigg';

async function run() {
  console.log('Creating client...');
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ronnygravity@gmail.com',
    password: '12345678'
  });
  
  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  
  console.log('Logged in successfully! User ID:', authData.user.id);
  
  // Set session on the SAME client to ensure it is authenticated!
  await supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token
  });
  
  const projectId = '8c4b4bbc-2289-4e32-86d8-d662c2b26347';
  const uniqueSuffix = `${Date.now()}-test`;
  const archivoPath = `${projectId}/${authData.user.id}/${uniqueSuffix}.pdf`;
  
  console.log('Uploading mock file to documentacion_tecnica bucket path:', archivoPath);
  const fileBuffer = Buffer.from('dummy pdf content');
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentacion_tecnica')
    .upload(archivoPath, fileBuffer, {
      contentType: 'application/pdf',
      duplex: 'half'
    });
    
  if (uploadError) {
    console.error('❌ Upload failed:', uploadError);
  } else {
    console.log('✅ Upload succeeded:', uploadData);
    
    // Now try database insertion
    console.log('Inserting row into public.participaciones...');
    const { data: insertData, error: insertError } = await supabase
      .from('participaciones')
      .insert({
        id_proyecto: projectId,
        id_estudiante: '26cb9cab-1292-4db4-aa5f-b0803c604f2e', // Student ID for ronnygravity
        estado: 'enviada',
        carta_postulacion: 'Esta es una carta de prueba con más de 30 caracteres.',
        planteamiento_solucion: 'Este es un planteamiento de solución de prueba con más de 30 caracteres.',
        prototipo_enlaces: ['https://framer.com/mock-proto'],
        documentacion_tecnica: archivoPath
      })
      .select();
      
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      // Clean up uploaded file
      await supabase.storage.from('documentacion_tecnica').remove([archivoPath]);
    } else {
      console.log('✅ Insert succeeded:', insertData);
      // Clean up inserted row & file
      await supabase.from('participaciones').delete().eq('id_participacion', insertData[0].id_participacion);
      await supabase.storage.from('documentacion_tecnica').remove([archivoPath]);
      console.log('Cleanup finished');
    }
  }
}

run();
