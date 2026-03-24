# Alert Replacement Guide

This document tracks the standardized notification system used throughout the application.

## Unified Toast System

The application uses a single, unified toast notification system based on Zustand.

### Location
- **Hook**: `src/hooks/useToast.tsx`
- **Components**: `src/components/UI/Toast.tsx`, `src/components/UI/ToastContainer.tsx`
- **Global Container**: Already mounted in `App.tsx`

### Usage

```typescript
import { useToast } from '../../hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  // Success notification
  toast.success('Operation completed successfully!');

  // Error notification (auto 5s duration)
  toast.error('An error occurred while processing');

  // Info notification
  toast.info('Please review the changes');

  // Warning notification
  toast.warning('This action cannot be undone');

  return <div>...</div>;
};
```

### API Reference

| Method | Parameters | Description |
|--------|------------|-------------|
| `toast.success(message, duration?)` | `message: string`, `duration?: number` (default: 4000ms) | Success notification |
| `toast.error(message, duration?)` | `message: string`, `duration?: number` (default: 5000ms) | Error notification |
| `toast.info(message, duration?)` | `message: string`, `duration?: number` (default: 4000ms) | Info notification |
| `toast.warning(message, duration?)` | `message: string`, `duration?: number` (default: 4500ms) | Warning notification |

### Migration from Old Systems

If you encounter code using the old notification systems, migrate as follows:

**From NotificationSystem (Context-based):**
```typescript
// OLD - Do not use
import { useNotifications } from '../Common/NotificationSystem';
const { showSuccess, showError } = useNotifications();
showSuccess('Title', 'Message');
showError('Title', 'Message');

// NEW - Use this
import { useToast } from '../../hooks/useToast';
const toast = useToast();
toast.success('Title. Message');
toast.error('Title. Message');
```

**From NotificationSystem v2 (Reports folder):**
```typescript
// OLD - Do not use
import { useSuccessNotification, useErrorNotification } from '../Common/Notifications/NotificationSystem';
const showSuccess = useSuccessNotification();
showSuccess('Title', 'Message');

// NEW - Use this
import { useToast } from '../../hooks/useToast';
const toast = useToast();
toast.success('Title. Message');
```

## Removed Systems (No longer available)

The following notification systems have been removed and consolidated into useToast:

- ✅ ~~`src/components/Common/NotificationSystem.tsx`~~ (DELETED)
- ✅ ~~`src/components/Common/Notifications/NotificationSystem.tsx`~~ (DELETED)

## Confirmation Dialogs

For confirmation dialogs, use the `useConfirm` hook:

```typescript
import { useConfirm } from '../../hooks/useConfirm';

const MyComponent = () => {
  const { confirm } = useConfirm();

  const handleDelete = () => {
    confirm({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this item?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger', // 'danger' | 'warning' | 'info'
      onConfirm: async () => {
        await deleteItem();
      }
    });
  };
};
```

## Inline Alerts

For inline alerts within forms or content areas, use the Alert component:

```typescript
import { Alert, AlertDescription } from '../UI/alert';

<Alert variant="destructive">
  <AlertDescription>This is an error message</AlertDescription>
</Alert>
```
