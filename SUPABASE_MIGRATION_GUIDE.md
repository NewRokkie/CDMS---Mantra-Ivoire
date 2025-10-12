# 🚀 SUPABASE MIGRATION GUIDE

## ✅ PHASE 1: COMPLETED

### Database Schema Created

All tables have been created with proper:
- ✅ Primary keys (UUID)
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Proper data types and defaults

**Tables:**
1. `clients` - Client/shipping line master data
2. `containers` - Container inventory
3. `release_orders` - Release orders for pickup
4. `gate_in_operations` - Gate in logs
5. `gate_out_operations` - Gate out logs
6. `users` - System users
7. `audit_logs` - Audit trail

### API Service Layer Created

**Services:**
- ✅ `containerService` - CRUD for containers
- ✅ `gateService` - Gate in/out processing
- ✅ `releaseService` - Release order management
- ✅ `clientService` - Client management
- ✅ `userService` - User management
- ✅ `auditService` - Audit logging

**Location:** `src/services/api/`

---

## 📋 PHASE 2: SEED INITIAL DATA

### Step 1: Create Initial Clients

```sql
-- Run in Supabase SQL Editor
INSERT INTO clients (code, name, contact_person, email, phone, free_days_allowed, daily_storage_rate, currency, active)
VALUES
  ('MAEU', 'Maersk Line', 'John Smith', 'contact@maersk.com', '+1-555-0101', 5, 50.00, 'USD', true),
  ('MSCU', 'MSC Mediterranean Shipping', 'Jane Doe', 'info@msc.com', '+1-555-0102', 3, 45.00, 'USD', true),
  ('CMDU', 'CMA CGM', 'Robert Johnson', 'contact@cmacgm.com', '+1-555-0103', 4, 48.00, 'USD', true),
  ('HLCU', 'Hapag-Lloyd', 'Maria Garcia', 'info@hapag-lloyd.com', '+1-555-0104', 3, 45.00, 'EUR', true),
  ('SHIP001', 'Shipping Solutions Inc', 'David Wilson', 'contact@shipsol.com', '+1-555-0105', 3, 42.00, 'USD', true);
```

### Step 2: Create Initial Users

```sql
-- Run in Supabase SQL Editor
INSERT INTO users (name, email, role, yard_ids, module_access, active)
VALUES
  ('Admin User', 'admin@depot.com', 'admin', '["depot-tantarelli", "depot-vridi"]', '{}', true),
  ('Supervisor User', 'supervisor@depot.com', 'supervisor', '["depot-tantarelli"]', '{}', true),
  ('Operator User', 'operator@depot.com', 'operator', '["depot-tantarelli"]', '{}', true),
  ('Viewer User', 'viewer@depot.com', 'viewer', '["depot-tantarelli"]', '{}', true);
```

### Step 3: Seed Sample Containers (Optional)

```sql
-- Get client IDs first
WITH client_ids AS (
  SELECT id, code FROM clients WHERE code IN ('MAEU', 'MSCU', 'CMDU')
)
INSERT INTO containers (number, type, size, status, location, yard_id, client_id, client_code, gate_in_date, created_by)
SELECT
  'MSKU-' || LPAD((ROW_NUMBER() OVER())::text, 7, '0') || '-' || (FLOOR(RANDOM() * 10))::text,
  (ARRAY['standard', 'reefer', 'tank'])[FLOOR(RANDOM() * 3 + 1)],
  (ARRAY['20ft', '40ft'])[FLOOR(RANDOM() * 2 + 1)],
  'in_depot',
  'S' || LPAD((FLOOR(RANDOM() * 50 + 1))::text, 2, '0') || '-R0' || (FLOOR(RANDOM() * 4 + 1))::text || '-H0' || (FLOOR(RANDOM() * 3 + 1))::text,
  'depot-tantarelli',
  c.id,
  c.code,
  NOW() - (FLOOR(RANDOM() * 30) || ' days')::interval,
  'System'
FROM generate_series(1, 20) AS s
CROSS JOIN client_ids c
WHERE RANDOM() < 0.3
LIMIT 20;
```

---

## 🔄 PHASE 3: MIGRATE COMPONENTS TO USE SUPABASE

### Current State

Components currently use **localStorage via `useGlobalStore`**:
- ✅ Works offline
- ✅ Fast
- ❌ Not persistent across devices
- ❌ No multi-user sync
- ❌ Limited storage

### Target State

Components will use **Supabase via API services**:
- ✅ Server-side persistence
- ✅ Real-time sync across users
- ✅ Unlimited storage
- ✅ Proper security with RLS
- ✅ Audit trail

### Migration Strategy

**Option A: Gradual Migration (Recommended)**
1. Keep `useGlobalStore` as-is
2. Add Supabase calls alongside localStorage
3. Sync on mount: Load from Supabase → Update localStorage
4. Sync on change: Update both Supabase + localStorage
5. Eventually remove localStorage layer

**Option B: Complete Rewrite**
1. Update `useGlobalStore` to call API services
2. Remove all localStorage persistence
3. Add proper error handling
4. Add loading states

---

## 📝 PHASE 4: UPDATE COMPONENTS

### Components to Update

#### High Priority (Core Functionality)
1. **Gate In (`src/components/Gates/GateIn.tsx`)**
   ```typescript
   // OLD:
   const result = processGateIn({...});

   // NEW:
   import { gateService } from '../../services/api';
   const result = await gateService.processGateIn({...});
   ```

2. **Gate Out (`src/components/Gates/GateOut.tsx`)**
   ```typescript
   // OLD:
   const result = processGateOut({...});

   // NEW:
   import { gateService } from '../../services/api';
   const result = await gateService.processGateOut({...});
   ```

3. **Container List (`src/components/Containers/ContainerList.tsx`)**
   ```typescript
   // OLD:
   const containers = useGlobalStore(state => state.containers);

   // NEW:
   import { containerService } from '../../services/api';
   const [containers, setContainers] = useState<Container[]>([]);

   useEffect(() => {
     containerService.getAll().then(setContainers);
   }, []);
   ```

4. **Release Orders (`src/components/ReleaseOrders/ReleaseOrderList.tsx`)**
   ```typescript
   // OLD:
   const orders = useGlobalStore(state => state.releaseOrders);

   // NEW:
   import { releaseService } from '../../services/api';
   const [orders, setOrders] = useState<ReleaseOrder[]>([]);

   useEffect(() => {
     releaseService.getAll().then(setOrders);
   }, []);
   ```

#### Medium Priority
5. **Dashboard** - Update stats to pull from Supabase
6. **Reports** - Already partially updated, needs Supabase
7. **Yard Map** - Already uses global store, easy to migrate

#### Low Priority
8. **User Management** - Needs Supabase Auth integration
9. **Client Master Data** - Admin function
10. **EDI Management** - Manual process

---

## 🔒 PHASE 5: AUTHENTICATION INTEGRATION

### Current: Mock Auth

```typescript
// src/hooks/useAuth.ts
const MOCK_USERS = [...]; // Hardcoded users
```

### Target: Supabase Auth

```typescript
import { supabase } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserProfile(authUserId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (data) {
      setUser(mapToUser(data));
    }
  }

  return { user, login, logout };
}
```

---

## 📊 MIGRATION CHECKLIST

### ✅ Completed
- [x] Database schema created
- [x] RLS policies configured
- [x] API service layer created
- [x] TypeScript types defined
- [x] Supabase client configured
- [x] Build verification passed

### 🔄 In Progress
- [ ] Seed initial data
- [ ] Test API services
- [ ] Update Gate In component
- [ ] Update Gate Out component

### ⏳ Pending
- [ ] Update all container CRUD operations
- [ ] Update release order management
- [ ] Update dashboard statistics
- [ ] Update reports module
- [ ] Integrate Supabase Auth
- [ ] Real-time subscriptions
- [ ] Error handling & retry logic
- [ ] Loading states in UI
- [ ] Offline mode handling

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate (Today)
1. **Seed initial data** - Run SQL scripts above
2. **Test API services** - Create test file to verify all services work
3. **Update Gate In** - First component to migrate (highest impact)

### Short Term (This Week)
4. **Update Gate Out** - Second most critical
5. **Update Container List** - High visibility
6. **Update Dashboard** - Stats from real data

### Medium Term (Next Week)
7. **Update Reports** - Already partially done
8. **Integrate Auth** - Production requirement
9. **Add real-time sync** - Use Supabase subscriptions
10. **Add error handling** - Retry logic, offline mode

---

## 🔧 TESTING GUIDE

### Test API Services

Create `src/services/api/__tests__/services.test.ts`:

```typescript
import { containerService, clientService, gateService } from '../index';

async function testServices() {
  console.log('Testing API services...\n');

  try {
    // Test 1: Get all clients
    console.log('1. Fetching clients...');
    const clients = await clientService.getAll();
    console.log(`✓ Found ${clients.length} clients`);

    // Test 2: Get all containers
    console.log('\n2. Fetching containers...');
    const containers = await containerService.getAll();
    console.log(`✓ Found ${containers.length} containers`);

    // Test 3: Process gate in
    if (clients.length > 0) {
      console.log('\n3. Testing gate in...');
      const result = await gateService.processGateIn({
        containerNumber: 'TEST-1234567-0',
        clientCode: clients[0].code,
        containerType: 'standard',
        containerSize: '20ft',
        transportCompany: 'Test Transport',
        driverName: 'Test Driver',
        vehicleNumber: 'TEST-001',
        location: 'S01-R01-H01',
        operatorId: 'test-op',
        operatorName: 'Test Operator',
        yardId: 'depot-tantarelli'
      });
      console.log(`✓ Gate in ${result.success ? 'succeeded' : 'failed'}`);
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testServices();
```

Run with: `npx ts-node src/services/api/__tests__/services.test.ts`

---

## 📚 RESOURCES

### Supabase Docs
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
- [TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)

### Project Files
- Database Schema: `supabase/migrations/create_core_tables.sql`
- API Services: `src/services/api/`
- Type Definitions: `src/types/`
- Environment: `.env`

---

**Status:** Ready for Phase 2 (Data Seeding)
**Next Action:** Run SQL scripts to seed initial data
**Estimated Time:** Phase 2-3: 2-4 hours, Phase 4-5: 1-2 days
