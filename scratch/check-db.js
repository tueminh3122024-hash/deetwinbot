const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('--- Clinics ---');
    const { data: clinics, error: cError } = await supabase.from('clinics').select('*');
    if (cError) console.error(cError);
    else console.table(clinics);

    console.log('--- Messages Table Check ---');
    const { data: mData, error: mError } = await supabase.from('messages').select('*').limit(1);
    if (mError) {
        if (mError.code === '42P01') {
            console.log('Messages table does NOT exist.');
        } else {
            console.error(mError);
        }
    } else {
        console.log('Messages table ALREADY exists.');
    }
}

check();
