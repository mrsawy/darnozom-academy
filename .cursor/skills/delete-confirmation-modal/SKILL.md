---
name: delete-confirmation-modal
description: >-
  Use DeleteConfirmationModal instead of window.confirm / alert for destructive
  actions. USE WHEN adding a delete button, removing a record, or any
  destructive action that currently (or would) use confirm(), alert(), or
  window.confirm(). Also use when reviewing code that calls confirm() for
  delete / remove actions.
---

# Delete Confirmation Modal

## Rule

**Never** use `confirm()`, `window.confirm()`, `globalThis.confirm()`, or
`alert()` for destructive-action confirmation in the client app. Always use the
shared `DeleteConfirmationModal` component.

## Component location

```
apps/client/src/components/molecules/modals/
  delete-confirmation/
    delete-confirmation.tsx   ← the reusable modal
  index.ts                    ← barrel re-export
```

Import path:

```ts
import { DeleteConfirmationModal } from '@/components/molecules/modals';
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | yes | — | Whether the modal is visible |
| `onOpenChange` | `(open: boolean) => void` | yes | — | Called when open state changes (close on cancel / overlay click) |
| `onConfirm` | `() => void \| Promise<void>` | yes | — | Called when the user clicks the destructive confirm button |
| `isPending` | `boolean` | no | `false` | Disables buttons and shows "Deleting..." while the mutation runs |
| `title` | `string` | no | `t('DeleteConfirmation.title')` | Override heading (pass a translated string) |
| `description` | `string` | no | `t('DeleteConfirmation.description')` | Override body text (pass a translated string) |

## Usage pattern

1. Add a `useState` to track the **id** (or object) of the item being deleted.
2. The delete button sets that state instead of calling `confirm()`.
3. Render `<DeleteConfirmationModal>` once (outside the loop) with `open={!!deleteTarget}`.
4. On confirm, call the mutation and reset the state.

```tsx
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
const deleteMutation = useDeleteSomething();

const handleDelete = async () => {
  if (!deleteTarget) return;
  await deleteMutation.mutateAsync(deleteTarget);
  setDeleteTarget(null);
};

// In JSX — delete button:
<Button variant="destructive" onClick={() => setDeleteTarget(item._id)}>
  {t('delete')}
</Button>

// Once, outside the map:
<DeleteConfirmationModal
  open={!!deleteTarget}
  onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
  onConfirm={handleDelete}
  isPending={deleteMutation.isPending}
  title={t('deleteConfirm.title')}
  description={t('deleteConfirm.description')}
/>
```

## i18n

The component reads **shared** fallback keys from `DeleteConfirmation` namespace
(`en.json` / `ar.json`):

```json
"DeleteConfirmation": {
  "title": "Are you sure?",
  "description": "This action cannot be undone.",
  "confirm": "Delete",
  "cancel": "Cancel",
  "deleting": "Deleting..."
}
```

For **context-specific** messages, add keys in the feature's own namespace
(e.g. `PrivateSessions.deleteConfirm.title`) and pass them via the `title` /
`description` props.

## Do not

- Use `confirm()`, `window.confirm()`, or `globalThis.confirm()` for delete actions
- Use `alert()` for destructive action feedback
- Create one-off inline `AlertDialog` wrappers when `DeleteConfirmationModal` already fits
- Forget to pass `isPending` — users must see the loading state
