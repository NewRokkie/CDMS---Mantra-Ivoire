# Stack Selection Modal Improvements

## Summary of Changes

I have successfully implemented the requested filtering logic for the StackSelectionModal component to handle:

1. **Container Size Filtering** - 40ft containers now show virtual stack locations
2. **Client Pool Assignments** - Stacks are filtered based on client pool assignments
3. **Virtual Stack Logic** - 40ft containers display virtual stack numbers (like S04 for paired S03+S05)

## Key Changes Made

### 1. StackSelectionModal.tsx
- Added `clientCode` prop to filter stacks based on client pool assignments
- Implemented virtual stack logic for 40ft containers using the same logic as YardLiveMap
- Added client pool service integration to get available stacks for clients
- Added fallback to show unassigned stacks when no client is assigned
- Fixed StandardModal props by removing unsupported `isLoading` prop
- Added proper loading state handling within modal content

### 2. StackSelectionButton.tsx
- Added `clientCode` prop to pass through to StackSelectionModal
- Updated interface and component to support client filtering

### 3. LocationValidationModal.tsx
- Updated StackSelectionButton usage to pass `operation.clientCode`
- This ensures the modal shows only stacks assigned to the container's client

## Virtual Stack Logic for 40ft Containers

The implementation follows the same logic as YardLiveMap:

- **Valid 40ft Stack Pairs**: [3,5], [7,9], [11,13], [15,17], etc.
- **Virtual Stack Number**: Lower stack number + 1 (e.g., S03+S05 = S04 virtual)
- **Special Stacks**: 1, 31, 101, 103 are excluded from 40ft pairing
- **Display Format**: Virtual stacks show as "S04 (Virtual)" in the interface

## Client Pool Integration

The modal now properly integrates with the client pool service as an optional filter:

- **Clients with Active Pool**: Shows only stacks assigned to their pool
- **Clients without Pool Config**: Shows unassigned stacks (same as no client)
- **No Client Provided**: Shows only unassigned stacks that are free for use
- **Availability Check**: Uses real-time container data to check stack occupancy
- **Size Compatibility**: Ensures 40ft containers only see compatible paired stacks

### Client Pool Logic Flow:
1. If `clientCode` is provided:
   - Check if client has an active pool configuration
   - **Has Pool**: Show only their assigned stacks
   - **No Pool**: Show unassigned stacks (client pools work as optional filter)
2. If no `clientCode`: Show unassigned stacks

## Benefits

1. **Flexible Access Control**: Client pools work as optional filters, not mandatory restrictions
2. **40ft Container Support**: Virtual stack display matches yard visualization
3. **Real-time Availability**: Stack occupancy is calculated from actual container data
4. **Clear UX**: Modal subtitle and info messages explain which stacks are shown and why
5. **Consistent Logic**: Uses same virtual stack calculation as YardLiveMap
6. **Backward Compatible**: Clients without pool configs can still access unassigned stacks

## Testing

The implementation has been tested for:
- ✅ TypeScript compilation without errors
- ✅ Proper prop passing through component hierarchy
- ✅ Client pool service integration
- ✅ Virtual stack number calculation
- ✅ Container size compatibility checks

## Updated Logic for Client Pool Flexibility

The implementation now correctly handles client pools as optional filters:

### Scenario 1: Client with Active Pool
- **Input**: `clientCode: "MAEU"` (has active pool)
- **Result**: Shows only stacks assigned to MAEU's pool
- **UI**: "Client: MAEU - Pool assigned stacks"

### Scenario 2: Client without Pool Configuration  
- **Input**: `clientCode: "NEWCLIENT"` (no pool configured)
- **Result**: Shows all unassigned stacks (same as if no client pool system existed)
- **UI**: "Client: NEWCLIENT - No pool config, showing unassigned stacks"

### Scenario 3: No Client Code
- **Input**: `clientCode: undefined`
- **Result**: Shows all unassigned stacks
- **UI**: "Unassigned stacks"

This ensures that client pools work as intended - as an optional filtering system that doesn't prevent clients without pool configurations from accessing available stacks.

The modal is now ready for use with proper client pool filtering and 40ft virtual stack support.