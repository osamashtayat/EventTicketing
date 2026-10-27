import { useState, useRef } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { ErrorPanel } from './Feedback';
export function DeleteDialog({
  name,
  description,
  onDelete,
}: {
  name: string;
  description: string;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const lock = useRef(false);
  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Delete {name}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${name}?`}
        description={description}
        busy={busy}
      >
        {error != null && <ErrorPanel error={error} />}
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            try {
              await onDelete();
              setOpen(false);
            } catch (e) {
              setError(e);
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          {busy ? 'Deleting…' : 'Confirm deletion'}
        </Button>
      </Dialog>
    </>
  );
}
