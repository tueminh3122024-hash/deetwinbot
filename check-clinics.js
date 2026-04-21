const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Fetching clinics...');
    const { data: clinics, error } = await supabase
        .from('clinics')
        .select('id, name, token_balance, status')
        .order('id', { ascending: false });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${clinics.length} clinics:`);
        clinics.forEach(c => console.log(`- ${c.id}: ${c.name}, token_balance=${c.token_balance}, status=${c.status}`));
    }

    // Also fetch profiles to see if admin profile exists
    console.log('\nFetching profiles...');
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, role')
        .limit(5);
    if (profError) {
        console.error('Profiles error:', profError);
    } else {
        console.log(`Found ${profiles.length} profiles:`);
        profiles.forEach(p => console.log(`- ${p.id}: role=${p.role}`));
    }
}

check().catch(console.error);