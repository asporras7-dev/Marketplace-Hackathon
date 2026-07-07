const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const serviceRoleKey = keyMatch ? keyMatch[1].trim() : '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('Finding user by email...');
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  const targetUser = users.find(u => u.email === 'ronnygravity@gmail.com');
  if (!targetUser) {
    console.error('User ronnygravity@gmail.com not found');
    return;
  }
  
  console.log(`Found user: ${targetUser.email} (ID: ${targetUser.id})`);
  
  console.log('Updating user password to 12345678...');
  const { data, error } = await admin.auth.admin.updateUserById(targetUser.id, {
    password: '12345678'
  });
  
  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log('Password updated successfully for', data.user.email);
  }
}

run();
