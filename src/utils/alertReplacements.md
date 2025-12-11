# Alert Replacement Guide

This document tracks the replacement of all `alert()` and `confirm()` calls with toast notifications and confirmation modals.

## Completed Files
- ✅ src/components/Yard/DepotManagement/DepotManagement.tsx
- ✅ src/components/Yard/StackManagement/StackManagement.tsx

## Remaining Files
- src/components/Containers/ContainerList.tsx
- src/components/ReleaseOrders/BookingDetailsModal.tsx
- src/components/ModuleAccess/ModuleAccessManagement.tsx
- src/components/Layout/YardSelector.tsx
- src/components/Layout/ProtectedApp.tsx
- src/components/EDI/EDIManagement.tsx
- src/components/Gates/GateIn.tsx
- src/components/ClientPools/ClientPoolManagement.tsx

## Usage Pattern

### For Success/Info Messages:
```typescript
// Old
alert('Operation successful!');

// New
toast.success('Operation successful!');
```

### For Error Messages:
```typescript
// Old
alert('Error: Something went wrong');

// New
toast.error('Error: Something went wrong');
```

### For Warnings:
```typescript
// Old
alert('Warning: Please check this');

// New
toast.warning('Warning: Please check this');
```

### For Confirmations:
```typescript
// Old
if (confirm('Are you sure?')) {
  // do something
}

// New
confirm({
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  confirmText: 'Yes',
  cancelText: 'No',
  variant: 'danger', // or 'warning' or 'info'
  onConfirm: async () => {
    // do something
  }
});
```

## Required Imports
```typescript
import { useToast } from '../../../hooks/useToast';
import { useConfirm } from '../../../hooks/useConfirm';

// In component:
const toast = useToast();
const { confirm } = useConfirm();
```
