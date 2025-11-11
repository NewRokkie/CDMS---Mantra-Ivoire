# Container Status Flow Documentation

## Overview
This document describes the container status lifecycle through the depot management system.

## Status Codes

### 01 - Gate In (`gate_in`)
**Description:** Container is in the Gate In process, pending location assignment.

**When Applied:**
- When a container is first registered through the Gate In operation
- Container has been received but not yet assigned to a stack location

**Next Status:** `in_depot` (when location is assigned)

**Business Rules:**
- Container cannot be gated out while in this status
- Container must be assigned a location to proceed
- Gate In operation is not considered complete until location assignment

---

### 02 - In Depot (`in_depot`)
**Description:** Container is assigned to a location and stored in the depot.

**When Applied:**
- When a container is assigned to a stack location after Gate In
- This is the primary "stored" status for containers

**Next Status:** 
- `gate_out` (when added to a pending Gate Out operation)
- `maintenance` (if moved to maintenance)
- `cleaning` (if moved to cleaning)

**Business Rules:**
- Container is available for Gate Out operations
- Container occupies a physical location in the yard
- Container counts toward depot capacity

---

### 03 - Gate Out (`gate_out`)
**Description:** Container is in the Gate Out process, pending operation completion.

**When Applied:**
- When a container is added to a pending Gate Out operation
- Container is marked for exit but operation is not yet complete

**Next Status:** 
- `out_depot` (when Gate Out operation is completed)
- `in_depot` (if operation is cancelled - future feature)

**Business Rules:**
- Container is reserved for a specific Gate Out operation
- Container cannot be added to another Gate Out operation
- Location is still occupied until operation completes

---

### 04 - Out Depot (`out_depot`)
**Description:** Container has left the depot.

**When Applied:**
- When a Gate Out operation is completed
- When a direct Gate Out is processed (immediate completion)

**Next Status:** N/A (terminal status in current flow)

**Business Rules:**
- Container no longer occupies depot space
- Location is released and becomes available
- Container is no longer available for operations

---

### Additional Statuses

#### Maintenance (`maintenance`)
**Description:** Container is under maintenance or repair.

**When Applied:** Manually set by authorized users

**Business Rules:**
- Container is not available for Gate Out
- May or may not occupy a location

---

#### Cleaning (`cleaning`)
**Description:** Container is being cleaned.

**When Applied:** Manually set by authorized users

**Business Rules:**
- Container is not available for Gate Out
- May or may not occupy a location

---

## Status Flow Diagram

```
┌─────────────┐
│  Gate In    │ ◄── Container arrives at depot
│  (gate_in)  │
└──────┬──────┘
       │
       │ Location assigned
       ▼
┌─────────────┐
│  In Depot   │ ◄── Container stored in yard
│  (in_depot) │
└──────┬──────┘
       │
       │ Added to Gate Out operation
       ▼
┌─────────────┐
│  Gate Out   │ ◄── Container pending exit
│  (gate_out) │
└──────┬──────┘
       │
       │ Operation completed
       ▼
┌─────────────┐
│  Out Depot  │ ◄── Container has left
│ (out_depot) │
└─────────────┘
```

## Implementation Details

### Gate In Process
1. Container is created with status `gate_in`
2. Gate In operation is created with status `pending`
3. Operator assigns container to a stack location
4. Container status changes to `in_depot`
5. Gate In operation status changes to `completed`

### Gate Out Process

#### Pending Gate Out Flow
1. Operator creates a pending Gate Out operation
2. Operator scans/adds containers to the operation
3. Each container status changes to `gate_out`
4. When all containers are processed, operation status changes to `completed`
5. All containers in the operation change to `out_depot`
6. Locations are released

#### Direct Gate Out Flow
1. Operator processes Gate Out immediately
2. Containers change directly from `in_depot` to `out_depot`
3. Operation is created with status `completed`
4. Locations are released immediately

## Database Schema

The `containers` table uses a text field for status:
```sql
status text NOT NULL DEFAULT 'gate_in'
```

Valid values: `gate_in`, `in_depot`, `gate_out`, `out_depot`, `maintenance`, `cleaning`

## UI Display

### Status Colors
- **Gate In:** Blue (`bg-blue-100 text-blue-800`)
- **In Depot:** Green (`bg-green-100 text-green-800`)
- **Gate Out:** Orange (`bg-orange-100 text-orange-800`)
- **Out Depot:** Gray (`bg-gray-100 text-gray-800`)
- **Maintenance:** Yellow (`bg-yellow-100 text-yellow-800`)
- **Cleaning:** Purple (`bg-purple-100 text-purple-800`)

### Status Icons
- **Gate In:** Clock icon
- **In Depot:** CheckCircle icon
- **Gate Out:** Truck icon (orange)
- **Out Depot:** Truck icon (gray)
- **Maintenance:** AlertTriangle icon
- **Cleaning:** Package icon

## Reporting and Statistics

### Container Counts
- **In Depot Count:** Only `in_depot` status (containers with assigned locations)
- **Out Depot Count:** Only `out_depot` status (containers that have left)
- **In Standby/Processing:** `gate_in` and `gate_out` statuses (containers in transition)

This ensures accurate reporting:
- `in_depot` = Containers physically stored in assigned locations
- `gate_in` = Containers being processed for entry (standby)
- `gate_out` = Containers being processed for exit (standby)
- `out_depot` = Containers that have departed

## Migration Notes

### From Previous System
- Old `in_service` status is migrated to `in_depot`
- Existing containers with `in_depot` status remain unchanged
- New containers follow the new flow starting with `gate_in`

### Backward Compatibility
- Old `in_service` status is migrated to `in_depot`
- Reports now distinguish between stored containers (`in_depot`) and processing containers (`gate_in`, `gate_out`)
- This provides more accurate inventory tracking

## API Changes

### Container Service
- `create()` now sets status to `gate_in` by default
- `assignLocation()` changes status from `gate_in` to `in_depot`

### Gate Service
- `processGateIn()` creates containers with `gate_in` status
- `updateGateOutOperation()` sets containers to `gate_out` when added
- `updateGateOutOperation()` sets all containers to `out_depot` when completed
- `processGateOut()` (direct) sets containers to `out_depot` immediately

## Testing Considerations

When testing the system:
1. Verify Gate In creates containers with `gate_in` status
2. Verify location assignment changes status to `in_depot`
3. Verify adding to pending Gate Out changes status to `gate_out`
4. Verify completing Gate Out changes all containers to `out_depot`
5. Verify direct Gate Out sets status to `out_depot` immediately
6. Verify status filters work correctly in all UI components
7. Verify reports aggregate statuses correctly
