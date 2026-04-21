const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? 'present' : 'missing');
console.log('Key:', supabaseAnonKey ? 'present' : 'missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('\n1. Querying clinics table...');
    const { data: clinics, error } = await supabase
        .from('clinics')
        .select('*')
        .limit(5);
    if (error) {
        console.error('Clinics error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
        console.log('Clinics found:', clinics.length);
        console.log(clinics);
    }

    console.log('\n2. Querying information_schema.tables for public.clinics...');
    const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'clinics');
    if (tablesError) {
        console.error('Information schema error:', tablesError);
    } else {
        console.log('Tables result:', tables);
    }

    console.log('\n3. Querying profiles table (should exist)...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(2);
    if (profilesError) {
        console.error('Profiles error:', profilesError);
    } else {
        console.log('Profiles found:', profiles.length);
    }

    console.log('\n4. Testing raw REST API...');
    const response = await fetch(`${supabaseUrl}/rest/v1/clinics?select=*`, {
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
        },
    });
    const text = await response.text();
    console.log('REST status:', response.status);
    console.log('REST body:', text);
}

test().catch(console.error);