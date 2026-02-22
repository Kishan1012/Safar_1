const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rczxllmmagabagfkcwbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjenhsbG1tYWdhYmFnZmtjd2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTk0NDQsImV4cCI6MjA4NzIzNTQ0NH0.PSMiEUmCIPKDNWeQN6O6LTPFsEFbOHAo6_Yx5pfeS0k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('day_schedule').select('*').order('created_at', { ascending: false }).limit(2);
  if (error) { console.error(error); }
  else { console.log(JSON.stringify(data, null, 2)); }
}
check();
