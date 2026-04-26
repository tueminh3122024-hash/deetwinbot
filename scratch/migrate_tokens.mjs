import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  console.log('🚀 Starting Token Trigger Migration...')
  
  // Note: We use a simple query first to see if we have access
  // Most Supabase setups don't allow arbitrary SQL via RPC unless you created a helper function
  console.log('Please copy-paste this SQL into your Supabase SQL Editor if this script fails:')
  console.log(`
    -- 1. Function to deduct tokens
    CREATE OR REPLACE FUNCTION handle_chat_token_deduction()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE clinics 
      SET token_balance = token_balance - NEW.tokens_used
      WHERE id = NEW.clinic_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- 2. Trigger
    DROP TRIGGER IF EXISTS trg_chat_token_deduction ON chat_history;
    CREATE TRIGGER trg_chat_token_deduction
    AFTER INSERT ON chat_history
    FOR EACH ROW
    EXECUTE FUNCTION handle_chat_token_deduction();

    -- 3. Enable Realtime
    ALTER TABLE clinics REPLICA IDENTITY FULL;
  `)

  // This will likely fail unless the RPC is set up, but it serves as a good instruction
  const { error } = await supabase.rpc('admin_run_sql', { sql_query: 'SELECT 1' })
  if (error) {
     console.log('\n--- Status ---')
     console.log('Script cannot run SQL directly. PLEASE MANUALLY PASTE THE SQL ABOVE into Supabase Dashboard.')
  }
}

migrate()
