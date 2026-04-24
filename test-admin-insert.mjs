import { createClient } from '@supabase/supabase-js';

const url = 'https://ctxusttvmtibzgoewahx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eHVzdHR2bXRpYnpnb2V3YWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyMTAzMiwiZXhwIjoyMDkyMTk3MDMyfQ.1GKaqodO7P9bUsC3s_e7duhOYij5Vs14TyFbvfSKq6k';

const admin = createClient(url, serviceKey);

async function main() {
    process.stdout.write('Starting test...\n');

    // 1. Check bookings table
    const { data: bookings, error: bErr } = await admin.from('bookings').select('*').limit(5);
    process.stdout.write('bookings: ' + JSON.stringify({ count: bookings?.length, error: bErr?.message }) + '\n');

    // 2. Get first user
    const { data: testUser } = await admin.auth.admin.listUsers();
    const firstUser = testUser?.users?.[0];
    if (!firstUser) {
        process.stdout.write('No users found!\n');
        return;
    }
    process.stdout.write('First user: ' + firstUser.id + ' ' + firstUser.email + '\n');

    // 3. Get clinics
    const { data: clinics } = await admin.from('clinics').select('id,name').limit(5);
    process.stdout.write('clinics: ' + JSON.stringify(clinics) + '\n');

    if (clinics && clinics.length > 0) {
        // 4. Try INSERT via adminClient
        const { data: ins, error: insErr } = await admin.from('bookings').insert({
            user_id: firstUser.id,
            clinic_id: clinics[0].id,
            service_name: 'TEST - Xóa sau',
            status: 'pending',
        }).select('id').single();

        process.stdout.write('INSERT result: ' + JSON.stringify({
            data: ins,
            error: insErr?.message,
            details: insErr?.details,
            hint: insErr?.hint,
            code: insErr?.code
        }) + '\n');
    }

    process.exit(0);
}
main().catch(e => { process.stderr.write('ERROR: ' + e.message + '\n'); process.exit(1); });
