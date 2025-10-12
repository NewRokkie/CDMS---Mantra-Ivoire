/**
 * Script to create Supabase Auth users for demo/testing
 *
 * Usage:
 *   tsx scripts/create-auth-users.ts
 *
 * This script creates the following users:
 * - admin@depot.com (password: demo123)
 * - operator@depot.com (password: demo123)
 * - supervisor@depot.com (password: demo123)
 * - client@shipping.com (password: demo123)
 * - client2@maersk.com (password: demo123)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const demoUsers = [
  {
    email: 'admin@depot.com',
    password: 'demo123',
    metadata: {
      name: 'John Administrator',
      role: 'admin'
    }
  },
  {
    email: 'operator@depot.com',
    password: 'demo123',
    metadata: {
      name: 'Jane Operator',
      role: 'operator'
    }
  },
  {
    email: 'supervisor@depot.com',
    password: 'demo123',
    metadata: {
      name: 'Mike Supervisor',
      role: 'supervisor'
    }
  },
  {
    email: 'client@shipping.com',
    password: 'demo123',
    metadata: {
      name: 'Sarah Client',
      role: 'client'
    }
  },
  {
    email: 'client2@maersk.com',
    password: 'demo123',
    metadata: {
      name: 'John Maersk Client',
      role: 'client'
    }
  }
];

async function createAuthUsers() {
  console.log('🔐 Creating Supabase Auth users...\n');

  for (const user of demoUsers) {
    console.log(`Creating user: ${user.email}...`);

    try {
      // Create auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: user.metadata
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`  ⚠️  User already exists: ${user.email}`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Created: ${user.email} (ID: ${data.user?.id})`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error creating ${user.email}:`, error.message);
    }
  }

  console.log('\n✅ Auth user creation complete!');
  console.log('\nYou can now login with:');
  console.log('  Email: admin@depot.com');
  console.log('  Password: demo123');
  console.log('\nOr any of the other demo accounts.');
}

createAuthUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
