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
  console.log('🚀 Starting Top-up Schema Migration...')
  const { error } = await supabase.rpc('admin_run_sql', { sql_query: `
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS needs_topup BOOLEAN NOT NULL DEFAULT false;
  `})
  
  if (error) {
     console.log('Error:', error)
     console.log('Could not run RPC. Attempting standard insert if possible, or Please run this in SQL Editor:')
     console.log('ALTER TABLE clinics ADD COLUMN IF NOT EXISTS needs_topup BOOLEAN NOT NULL DEFAULT false;')
  } else {
     console.log('✅ Added needs_topup column successfully.')
  }
}

migrate()
