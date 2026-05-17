const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://nptjohebjxizdmntvzhn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGpvaGVianhpemRtbnR2emhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDY2ODAsImV4cCI6MjA5NDA4MjY4MH0.6oi-GJfOIaqr3vKuatU4zQbCw9ev5DPLivdqwazo40c";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from('info_aldeas').select('*');
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Aldeas:", JSON.stringify(data, null, 2));
}

main();
