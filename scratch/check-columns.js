const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkColumns() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('--- Messages Columns ---');
    // We'll try to fetch a single row and see the keys
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    if (error) {
        console.error(error);
    } else if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('Table is empty. Checking via RPC or another way...');
        // Fallback: try to insert a dummy row (might fail if columns don't match)
        // Actually, I'll just check if there's a better way.
        // I'll try to trigger an error by selecting a non-existent column
        const { error: e2 } = await supabase.from('messages').select('id, clinic_id, role, content, created_at').limit(1);
        if (e2) {
            console.error('Error selecting requested columns:', e2.message);
        } else {
            console.log('Table HAS the requested columns: id, clinic_id, role, content, created_at');
        }
    }
}

checkColumns();
